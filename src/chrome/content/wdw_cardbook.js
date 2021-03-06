if ("undefined" == typeof(wdw_cardbook)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { PluralForm } = ChromeUtils.import("resource://gre/modules/PluralForm.jsm");
	var { MailE10SUtils } = ChromeUtils.import("resource:///modules/MailE10SUtils.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/cardbookActions.js", this);
	loader.loadSubScript("chrome://cardbook/content/scripts/notifyTools.js", this);

	var wdw_cardbook = {
		
		nIntervId : 0,
		currentType : "",	
		currentIndex : "",
		currentValue : "",
		currentFirstVisibleRow : 0,
		currentLastVisibleRow : 0,
		cutAndPaste : "",
		cardbookrefresh : false,
		writeButtonFired : false,
		displayCardDetail: false,
		displayCardEtag: 0,

		setAppMenu: function (remove) {
			if (document.getElementById('cardbookToolbarThMenuButton')) {
				const addOrRemoveListener = remove ? "removeEventListener" : "addEventListener";
				const button = document.getElementById('cardbookToolbarThMenuButton');
				button[addOrRemoveListener]("mousedown", PanelUI);
				button[addOrRemoveListener]("keypress", PanelUI);
			}
		},

		setToolbarCustom: function () {
			var toolbox = document.getElementById("cardbook-toolbox");
			if (toolbox) {
				toolbox.customizeDone = function(aEvent) {
					MailToolboxCustomizeDone(aEvent, "CustomizeCardBookToolbar");
					cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.cardbookToolbar.currentset", document.getElementById("cardbook-toolbar").getAttribute("currentset"));
					cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.cardbookToolbar.mode", document.getElementById("cardbook-toolbox").getAttribute("mode") + 
																			"::" + document.getElementById("cardbook-toolbox").getAttribute("labelalign"));
        			wdw_cardbook.setAccountsTreeMenulist();
   			};
			toolbox.setAttribute('toolbarHighlight','true');
			}
		},

		showCorrectTabs: function () {
			for (let i of [ "listTab", "technicalTab", "vcardTab", "keyTab" ]) {
				let node = document.getElementById(i);
				if (cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook." + i + "View")) {
					node.removeAttribute("hidden");
				} else {
					node.setAttribute("hidden", "true");
				}
			}
			wdw_cardbook.showPane('generalTabPanel');
		},

		showPane: function (paneID) {
			if (!paneID) {
				return;
			}
			
			let pane = document.getElementById(paneID);
			if (!pane) {
				return;
			}
			
			let tabnodes = document.getElementById("rightPaneDownHbox1").querySelectorAll(".cardbookTab");
			for (let node of tabnodes) {
				if (node.id != paneID) {
					node.setAttribute("hidden", "true");
					document.getElementById(node.id.replace("Panel", "")).removeAttribute("visuallyselected");
				} else {
					document.getElementById(node.id.replace("Panel", "")).setAttribute("visuallyselected", "true");
					node.removeAttribute("hidden");
				}
			}
		},

		addTreeColumns: function () {
			if (cardbookRepository.cardbookReorderMode == "NOREORDER") {
				cardbookRepository.cardbookReorderMode = "REORDER";

				var myColumns = cardbookRepository.cardbookUtils.getAllAvailableColumns("cardstree");
				var myTreecols = document.getElementById('cardsTreecols');
				cardbookElementTools.deleteTreecols(myTreecols);

				var orgStructure = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
				if (orgStructure != "") {
					var orgArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
					for (var i = 0; i < orgArray.length; i++) {
						myColumns.push(["org." + i, orgArray[i]]);
					}
				}

				cardbookRepository.cardbookUtils.sortMultipleArrayByString(myColumns,1,1);
				var myOrdinal = 0;
				for (var i = 0; i < myColumns.length; i++) {
					var myCode = myColumns[i][0];
					var myLabel = myColumns[i][1];
					cardbookElementTools.addTreeSplitter(myTreecols, {style: "-moz-box-ordinal-group: " + myOrdinal++ + ";"});
					if (myCode == "cardIcon") {
						cardbookElementTools.addTreecol(myTreecols, myCode, myLabel, {fixed: 'true', width: '20', persist: 'width ordinal hidden', style: 'text-align:left', hidden: 'true',
														class: 'treecol-image cardIconHeader', style: "-moz-box-ordinal-group: " + myOrdinal++ + ";", closemenu: 'none'});
					} else {
						cardbookElementTools.addTreecol(myTreecols, myCode, myLabel, {flex: '1', persist: 'width ordinal hidden', style: 'text-align:left', hidden: 'true',
														sortDirection: 'ascending', style: "-moz-box-ordinal-group: " + myOrdinal++ + ";", closemenu: 'none'});
					}
				}
			}
			cardbookRepository.cardbookReorderMode = "NOREORDER";
		},

		setAccountsTreeMenulist: function () {
			let accountsShown = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.accountsShown");
			cardbookElementTools.loadAccountsOrCatsTreeMenu("accountsOrCatsTreeMenupopup", "accountsOrCatsTreeMenulist", accountsShown);
		},

		loadFirstWindow: async function () {
			window.setCursor("auto");
			cardBookWindowObserver.register();
			cardBookWindowPrefObserver.register();
			cardBookWindowMutationObserver.register();
			cardsTreeMutationObserver.register();
			cardboookModeMutationObserver.register();
			wdw_cardbook.setSyncControl();
			wdw_cardbook.setAppMenu(false);
			wdw_cardbook.setToolbarCustom();
			wdw_cardbook.setNoSearchMode();
			wdw_cardbook.setNoComplexSearchMode();
			wdw_cardbook.setAccountsTreeMenulist();
			wdw_cardbook.showCorrectTabs();
			// in case of opening a new window without having a reload
			wdw_cardbook.loadCssRules();
			wdw_cardbook.addTreeColumns();
			wdw_cardbook.refreshAccountsInDirTree();
			var accountShown = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.accountShown");
			cardbookTreeUtils.setColumnsStateForAccount(accountShown);
			await ovl_cardbookLayout.orientPanes();
			ovl_cardbookLayout.resizePanes();
			cardbookTreeUtils.setSelectedAccount(accountShown, wdw_cardbook.currentFirstVisibleRow, wdw_cardbook.currentLastVisibleRow);
			await wdw_cardbook.selectAccountOrCatInNoSearch(true);
			// init for undo/redo
			cardbookActions.setUndoAndRedoMenuAndButton();
			await wdw_cardbook.refreshWindow();
		},

		syncAccountFromAccountsOrCats: function () {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				cardbookRepository.cardbookSynchronization.syncAccount(myPrefId);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.syncAccountFromAccountsOrCats error : " + e, "Error");
			}
		},

		canDropOnContactBox: function (aEvent) {
			if (cardbookRepository.cardbookSearchMode != "SEARCH" && cardbookRepository.cardbookComplexSearchMode != "SEARCH") {
				var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(cardbookRepository.currentAccountId);
				if (cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId) && !cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId)) {
					aEvent.preventDefault();
				}
			}
		},

		displayAccountOrCat: function (aCardList) {
			var accountsOrCatsTreeView = {
				get rowCount() { return aCardList.length; },
				isContainer: function(row) { return false },
				cycleHeader: function(row) { return false },
				getRowProperties: function(row) {
					var myStyleArray = [];
					if (cardbookRepository.cardbookSearchMode === "SEARCH" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
						myStyleArray.push("SEARCH");
						if (cardbookRepository.useColor != "nothing") {
							if (aCardList[row].categories.length > 0) {
								var myStyle = "color_" + aCardList[row].dirPrefId;
								for (let category in cardbookRepository.cardbookNodeColors) {
									if (aCardList[row].categories.includes(category)) {
										myStyle = "color_category_" + cardbookRepository.cardbookUtils.formatCategoryForCss(category);
										break;
									}
								}
								myStyleArray.push(myStyle);
							} else {
								if (cardbookRepository.cardbookNodeColors[cardbookRepository.cardbookUncategorizedCards]) {
									myStyleArray.push("color_category_" + cardbookRepository.cardbookUtils.formatCategoryForCss(cardbookRepository.cardbookUncategorizedCards));
								} else {
									myStyleArray.push("color_" + aCardList[row].dirPrefId);
								}
							}
						}
					}
					if (aCardList[row].updated || aCardList[row].created) {
						myStyleArray.push("Changed");
					}
					if (aCardList[row].isAList) {
						myStyleArray.push("MailList");
					}
					return myStyleArray.join(" ");
				},
				getCellProperties: function(row, column) {
					return this.getRowProperties(row);
				},
				getCellText: function(row, column){
					if (column.id == "cardIcon") return "";
					else if (column.id == "name") return cardbookRepository.cardbookUtils.getName(aCardList[row]);
					else if (column.id == "gender") return cardbookRepository.cardbookGenderLookup[aCardList[row].gender];
					else if (column.id == "bday") return cardbookRepository.cardbookDates.getFormattedDateForCard(aCardList[row], column.id);
					else if (column.id == "anniversary") return cardbookRepository.cardbookDates.getFormattedDateForCard(aCardList[row], column.id);
					else if (column.id == "deathdate") return cardbookRepository.cardbookDates.getFormattedDateForCard(aCardList[row], column.id);
					else if (column.id == "rev") return cardbookRepository.cardbookDates.getFormattedDateForCard(aCardList[row], column.id);
					else return cardbookRepository.cardbookUtils.getCardValueByField(aCardList[row], column.id, false);
				}
			}
			document.getElementById('cardsTree').view = accountsOrCatsTreeView;
		},

		setSearchRemoteHbox: function (aDirPrefId) {
			var show = false;
			if (aDirPrefId != "") {
				show = cardbookRepository.cardbookUtils.isMyAccountRemote(cardbookRepository.cardbookPreferences.getType(aDirPrefId)) 
							&& !cardbookRepository.cardbookPreferences.getDBCached(aDirPrefId)
							&& cardbookRepository.cardbookPreferences.getEnabled(aDirPrefId);
			}
			if (show) {
				document.getElementById('searchRemoteHbox').hidden = false;
				if (cardbookRepository.cardbookUtils.getAccountId(cardbookRepository.currentAccountId) != aDirPrefId) {
					if (cardbookRepository.cardbookDisplayCards[aDirPrefId].cards.length != 0) {
						document.getElementById('searchRemoteTextbox').value = cardbookRepository.cardbookPreferences.getLastSearch(aDirPrefId);
					} else {
						document.getElementById('searchRemoteTextbox').value = "";
						cardbookRepository.cardbookPreferences.setLastSearch(aDirPrefId, "");
					}
				}
			} else {
				document.getElementById('searchRemoteHbox').hidden = true;
			}
		},
		
		setSearchRemoteHboxOnSyncFinished: function (aDirPrefId) {
			if (document.getElementById('accountsOrCatsTree')) {
				var myTree = document.getElementById('accountsOrCatsTree');
				var mySelectedIndex = myTree.currentIndex;
				if (mySelectedIndex != -1) {
					var mySelectedDirPrefId = myTree.view.getCellText(mySelectedIndex, myTree.columns.getNamedColumn('accountRoot'));
				} else {
					return;
				}
				if (mySelectedDirPrefId == aDirPrefId) {
					if (cardbookRepository.cardbookDisplayCards[aDirPrefId].cards.length != 0) {
						document.getElementById('searchRemoteTextbox').value = cardbookRepository.cardbookPreferences.getLastSearch(aDirPrefId);
					}
				}
			}
		},
		
		clearCard: function () {
			cardbookWindowUtils.clearCard();
			cardbookElementTools.deleteRowsAllTypes();
			cardbookElementTools.deleteRows('categoriesclassicalRow');
			cardbookWindowUtils.adjustFields();
		},
		
		displayCard: async function (aCard) {
			try {
				if (wdw_cardbook.displayCardDetail == true) {
					return;
				}
				wdw_cardbook.displayCardDetail = true;
				wdw_cardbook.clearCard();
				await cardbookWindowUtils.displayCard(aCard, true);
				let panesView = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.panesView");
				let aParent = document.getElementById('categories' + panesView + 'Row');
				cardbookElementTools.addCategoriesRow(aParent, cardbookRepository.cardbookUtils.sortArrayByString(aCard.categories,1));
				document.getElementById('vcardTextBox').value = await cardbookRepository.cardbookUtils.cardToVcardData(aCard);
				document.getElementById('vcardTextBox').setAttribute('readonly', 'true');
				cardbookWindowUtils.adjustFields();
				wdw_cardbook.displayCardDetail = false;
				wdw_cardbook.displayCardEtag = aCard.etag;
			}
			catch (e) {
				wdw_cardbook.displayCardDetail = false;
			}
		},
		
		selectAccountOrCatInNoSearch: async function (aForceRefresh) {
			wdw_cardbook.setNoSearchMode();
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.setSearchRemoteHbox("");
				return;
			}
			var myTree = document.getElementById('accountsOrCatsTree');
			var mySelectedIndex = myTree.currentIndex;
			if (mySelectedIndex != -1) {
				var myAccountId = myTree.view.getCellText(mySelectedIndex, myTree.columns.getNamedColumn('accountId'));
				var myDirPrefId = myTree.view.getCellText(mySelectedIndex, myTree.columns.getNamedColumn('accountRoot'));
			} else {
				var myAccountId = myTree.view.getCellText(0, myTree.columns.getNamedColumn('accountId'));
				var myDirPrefId = myTree.view.getCellText(0, myTree.columns.getNamedColumn('accountRoot'));
			}
			if (!aForceRefresh) {
				if (cardbookRepository.currentAccountId == myAccountId) {
					return;
				}
			}
			wdw_cardbook.setSearchRemoteHbox(myDirPrefId);
			wdw_cardbook.setCurrentAccountId(myAccountId);
			wdw_cardbook.clearAccountOrCat();
			wdw_cardbook.clearCard();
			cardbookTreeUtils.setColumnsStateForAccount(myDirPrefId);
			await wdw_cardbook.refreshWindow(myAccountId);
		},

		setCurrentAccountId: function (aAccountOrCat) {
			cardbookRepository.currentAccountId = aAccountOrCat;
			var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(aAccountOrCat);
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.accountShown", myDirPrefId);
		},

		selectAccountOrCat: async function (aAccountOrCat, aListOfCards) {
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.clearAccountOrCat();
				return;
			}
			if (cardbookRepository.cardbookSearchMode === "SEARCH") {
				return;
			}

			// for the colors
			var myCurrentDirPrefId = cardbookRepository.cardbookUtils.getAccountId(aAccountOrCat);
			wdw_cardbook.setNoComplexSearchMode();
			if (cardbookRepository.cardbookPreferences.getType(myCurrentDirPrefId) == "SEARCH" && cardbookRepository.cardbookPreferences.getEnabled(myCurrentDirPrefId)) {
				wdw_cardbook.setComplexSearchMode(myCurrentDirPrefId);
			}
			
			cardbookTreeUtils.setSelectedAccount(aAccountOrCat, wdw_cardbook.currentFirstVisibleRow, wdw_cardbook.currentLastVisibleRow);

			// for the columns
			if (cardbookRepository.currentAccountId == aAccountOrCat) {
				return;
			}
			wdw_cardbook.setCurrentAccountId(aAccountOrCat);
			cardbookTreeUtils.setColumnsStateForAccount(myCurrentDirPrefId);
		},

		displaySearch: async function (aListOfCards) {
			var myTree = document.getElementById('cardsTree');
			var mySelectedAccount = cardbookRepository.cardbookSearchValue;
			if (cardbookRepository.cardbookDisplayCards[mySelectedAccount]) {
				wdw_cardbook.sortCardsTreeCol();
				if (cardbookRepository.cardbookDisplayCards[mySelectedAccount].cards.length == 1) {
					await wdw_cardbook.displayCard(cardbookRepository.cardbookCards[cardbookRepository.cardbookDisplayCards[mySelectedAccount].cards[0].cbid]);
					if (myTree.currentIndex != 0) {
						myTree.view.selection.select(0);
					}
				} else {
					if (aListOfCards) {
						cardbookWindowUtils.setSelectedCards(aListOfCards, myTree.getFirstVisibleRow(), myTree.getLastVisibleRow());
						if (aListOfCards.length == 1) {
							if (cardbookRepository.cardbookCards[aListOfCards[0].cbid]) {
								await wdw_cardbook.displayCard(cardbookRepository.cardbookCards[aListOfCards[0].cbid]);
							}
						}
					}
				}
			}
		},

		selectCard: async function (aEvent) {
			var myTree = document.getElementById('cardsTree');
			var numRanges = myTree.view.selection.getRangeCount();
			var start = new Object();
			var end = new Object();
			var numberOfSelectedCard = 0;
			var positionOfSelectedCard = 0;
			for (let i = 0; i < numRanges; i++) {
				myTree.view.selection.getRangeAt(i,start,end);
				for (let k = start.value; k <= end.value; k++) {
					numberOfSelectedCard++;
					positionOfSelectedCard = k;
				}
			}
			if ( numberOfSelectedCard != 1 ) {
				wdw_cardbook.clearCard();
			} else {
				var mySelectedCard = myTree.view.getCellText(positionOfSelectedCard, myTree.columns.getNamedColumn("cbid"));
				if (cardbookRepository.cardbookCards[mySelectedCard]) {
					await wdw_cardbook.displayCard(cardbookRepository.cardbookCards[mySelectedCard]);
				} else {
					wdw_cardbook.clearCard();
				}
			}
			if (aEvent) {
				aEvent.stopPropagation();
			}
		},

		changeAddressbookTreeMenu: async function () {
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.accountsShown", document.getElementById('accountsOrCatsTreeMenulist').value);
			wdw_cardbook.refreshAccountsInDirTree();
			var found = false;
			for (account of cardbookDirTree.visibleData) {
				if (account[4] == cardbookRepository.currentAccountId) {
					found = true;
					break;
				}
			}
			if (!found) {
				wdw_cardbook.clearAccountOrCat();
				wdw_cardbook.clearCard();
				wdw_cardbook.setSearchRemoteHbox("");
			} else {
				await wdw_cardbook.selectAccountOrCatInNoSearch(true);
			}
		},

		clearAccountOrCat: function () {
			wdw_cardbook.displayAccountOrCat([]);
			var myTree = document.getElementById('accountsOrCatsTree');
			myTree.view.selection.clearSelection();
			wdw_cardbook.updateStatusInformation();
		},

		refreshAccountsInDirTree: function() {
			try {
				if (document.getElementById('accountsOrCatsTree')) {
					var myTree = document.getElementById('accountsOrCatsTree');
					wdw_cardbook.currentFirstVisibleRow = myTree.getFirstVisibleRow();
					wdw_cardbook.currentLastVisibleRow = myTree.getLastVisibleRow();
					
					cardbookDirTree.visibleData = cardbookDirTreeUtils.filterTree();
					cardbookDirTreeUtils.expandVisible();
					myTree.view = cardbookDirTree;
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.refreshAccountsInDirTree error : " + e, "Error");
			}
		},

		createContact: function () {
			var myNewCard = new cardbookCardParser();
			wdw_cardbook.createCard(myNewCard, "CreateContact");
		},

		createList: function () {
			var myNewCard = new cardbookCardParser();
			myNewCard.isAList = true;
			wdw_cardbook.createCard(myNewCard, "CreateList");
		},

		createTemplate: function () {
			var myNewCard = new cardbookCardParser();
			let dirPrefId = "";
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && account[5] && (account[6] != "SEARCH")) {
					dirPrefId = account[4];
					break;
				}
			}
			if (dirPrefId) {
				myNewCard.dirPrefId = dirPrefId;
				myNewCard.fn = cardbookRepository.cardbookPreferences.getFnFormula(wdw_cardEdition.workingCard.dirPrefId);
				wdw_cardbook.createCard(myNewCard, "EditTemplate");
			}
		},

		createCard: function (aCard, aEditionMode) {
			let myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				let myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
				// to be sure that this accountId is defined : in search mode, it's possible to have weird results
				if (myId != "false") {
					aCard.dirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
					let myType = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountType'));
					let myName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName'));
					if (myName != cardbookRepository.cardbookUncategorizedCards) {
						if (myType == "categories") {
							cardbookRepository.addCategoryToCard(aCard, myName);
						} else if (myType == "org") {
							cardbookRepository.addOrgToCard(aCard, myId);
						}
					}
				} else {
					for (let account of cardbookRepository.cardbookAccounts) {
						if (account[1] && account[5] && account[6] != "SEARCH" && !account[7]) {
							aCard.dirPrefId = account[4];
							break;
						}
					}
				}
			} else {
				return;
			}
			cardbookWindowUtils.openEditionWindow(aCard, aEditionMode);
		},

		editCard: function () {
			let listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			if (listOfSelectedCard.length == 1) {
				cardbookWindowUtils.editCardFromCard(listOfSelectedCard[0]);
			}
		},

		mergeCards: async function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = wdw_cardbook.findMergeableContacts();

				var myArgs = {cardsIn: listOfSelectedCard, cardsOut: [], hideCreate: false, action: ""};
				var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/mergeCards/wdw_mergeCards.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
				var myTopic = "cardsMerged";
				var myActionId = cardbookActions.startAction(myTopic, null, null, listOfSelectedCard.length);
				wdw_cardbook.bulkOperation(myActionId);
				switch (myArgs.action) {
					case "CREATEANDREPLACE":
						cardbookRepository.currentAction[myActionId].totalCards = cardbookRepository.currentAction[myActionId].totalCards + myArgs.cardsIn.length;
						await cardbookRepository.deleteCards(myArgs.cardsIn, myActionId);
					case "CREATE":
						await cardbookRepository.saveCardFromUpdate({}, myArgs.cardsOut[0], myActionId, true);
						break;
				}
				await cardbookActions.endAction(myActionId);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.mergeCards error : " + e, "Error");
			}
		},

		duplicateCards: async function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			var myTopic = "cardsDuplicated";
			var myActionId = cardbookActions.startAction(myTopic, null, null, listOfSelectedCard.length);
			wdw_cardbook.bulkOperation(myActionId);
			for (var i = 0; i < listOfSelectedCard.length; i++) {
				var myCard = listOfSelectedCard[i];
				if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
					continue;
				}
				var myOutCard = new cardbookCardParser();
				cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
				myOutCard.fn = myOutCard.fn + " " + cardbookRepository.extension.localeData.localizeMessage("fnDuplicatedMessage");
				myOutCard.cardurl = "";
				myOutCard.etag = "0";
				cardbookRepository.cardbookUtils.setCardUUID(myOutCard);
				await cardbookRepository.saveCardFromUpdate({}, myOutCard, myActionId, false);
			}
			await cardbookActions.endAction(myActionId);
		},

		findDuplicatesFromAccountsOrCats: function () {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
					wdw_cardbook.findDuplicates(myDirPrefId);
				} else {
					return;
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.findDuplicatesFromAccountsOrCats error : " + e, "Error");
			}
		},

		findDuplicates: function (aDirPrefId) {
			try {
				var windowsList = Services.wm.getEnumerator("CardBook:contactDuplicatesWindow");
				var found = false;
				while (windowsList.hasMoreElements()) {
					var myWindow = windowsList.getNext();
					myWindow.focus();
					found = true;
					break;
				}
				if (!found) {
					var myArgs = {dirPrefId: aDirPrefId};
					Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/findDuplicates/wdw_findDuplicates.xhtml", "", cardbookRepository.windowParams, myArgs);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.findDuplicates error : " + e, "Error");
			}
		},

		formatDataFromAccountsOrCats: function () {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
					wdw_cardbook.formatData(myDirPrefId);
				} else {
					return;
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.formatDataFromAccountsOrCats error : " + e, "Error");
			}
		},

		formatData: function (aDirPrefId) {
			try {
				var windowsList = Services.wm.getEnumerator("CardBook:contactFormatWindow");
				var found = false;
				while (windowsList.hasMoreElements()) {
					var myWindow = windowsList.getNext();
					myWindow.focus();
					found = true;
					break;
				}
				if (!found) {
					var myArgs = {dirPrefId: aDirPrefId};
					Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/formatData/wdw_formatData.xhtml", "", cardbookRepository.windowParams, myArgs);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.formatData error : " + e, "Error");
			}
		},

		generateFnFromAccountsOrCats: function () {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var myAccountId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
					wdw_cardbook.generateFn(myAccountId);
				} else {
					return;
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.findDuplicatesFromAccountsOrCats error : " + e, "Error");
			}
		},

		generateFn: async function (aAccountId) {
			try {
				var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(aAccountId);
				if (cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId)) {
					return;
				}
				var myTargetName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);
				var myCards = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[aAccountId].cards));
				var myTopic = "displayNameGenerated";
				var myActionId = cardbookActions.startAction(myTopic, null, null, myCards.length);
				wdw_cardbook.bulkOperation(myActionId);
				var counter = 0;
				for (var i = 0; i < myCards.length; i++) {
					var myCard = myCards[i];
					var myOutCard = new cardbookCardParser();
					cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
					var myFn = myOutCard.fn;
					cardbookRepository.cardbookUtils.getDisplayedName(myOutCard, myOutCard.dirPrefId,
														[myOutCard.prefixname, myOutCard.firstname, myOutCard.othername, myOutCard.lastname, myOutCard.suffixname, myOutCard.nickname],
														[myOutCard.org, myOutCard.title, myOutCard.role]);
					if (myFn != myOutCard.fn && myOutCard.fn != "") {
						await cardbookRepository.saveCardFromUpdate(myCard, myOutCard, myActionId, false);
						counter++;
					}
				}
				cardbookRepository.cardbookUtils.formatStringForOutput(myTopic, [myTargetName, counter]);
				await cardbookActions.endAction(myActionId);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.generateFn error : " + e, "Error");
			}
		},

		createEvent: function () {
			let listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			let contacts = [];
			for (let card of listOfSelectedCard) {
				for (let email of card.emails) {
					contacts.push(["mailto:" + email, card.fn]);
				}
			}
			let onNewEvent = function(item, calendar, originalItem, listener) {
				doTransaction('add', item, calendar, null, null);
			};
			cardbookLightning.createLightningEvent(contacts, onNewEvent);
		},

		createTodo: function () {
			let listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			let description = "";
			let title = "";
			for (let card of listOfSelectedCard) {
				// todo unify cardbookRepository.preferEmailPref and cardbookRepository.preferIMPPPref
				let phone = cardbookRepository.cardbookUtils.getPrefAddressFromCard(card, "tel", cardbookRepository.preferEmailPref);
				if (phone.length) {
					description = description + card.fn + " (" + phone[0] + ")\r\n";
				} else {
					description = description + card.fn + "\r\n";
				}
			}
			if (listOfSelectedCard.length == 1) {
				title = description;
				description = "";
			}
			let onNewEvent = function(item, calendar, originalItem, listener) {
				doTransaction('add', item, calendar, null, null);
			};
			cardbookLightning.createLightningTodo(title, description, onNewEvent);
		},

		deleteCardsAndValidate: function (aCardList, aMessage) {
			try {
				var confirmTitle = cardbookRepository.extension.localeData.localizeMessage("confirmTitle");
				if (aCardList && aCardList.constructor === Array) {
					var listOfSelectedCard = aCardList;
				} else {
					var listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
				}
				var cardsCount = listOfSelectedCard.length;
				if (aMessage) {
					var confirmMsg = aMessage;
				} else {
					var confirmMsg = PluralForm.get(cardsCount, cardbookRepository.extension.localeData.localizeMessage("selectedCardsDeletionConfirmMessagePF", cardsCount));
				}
				if (Services.prompt.confirm(window, confirmTitle, confirmMsg)) {
					var myTopic = "cardsDeleted";
					var myActionId = cardbookActions.startAction(myTopic, listOfSelectedCard, null, listOfSelectedCard.length);
					wdw_cardbook.bulkOperation(myActionId);
					cardbookRepository.currentAction[myActionId].totalCards = cardbookRepository.currentAction[myActionId].totalCards + listOfSelectedCard.length;
					cardbookRepository.asyncDeleteCards(listOfSelectedCard, myActionId);
					cardbookActions.endAsyncAction(myActionId);
					return true;
				} else {
					return false;
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.deleteCardsAndValidate error : " + e, "Error");
			}
		},

		exportCardsFromAccountsOrCats: function (aMenu) {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromAccountsOrCats();
				if (aMenu.id == "cardbookAccountMenuExportToFile" || aMenu.id == "exportCardsToFileFromAccountsOrCats") {
					if (cardbookRepository.cardbookSearchMode === "SEARCH") {
						var defaultFileName = cardbookRepository.cardbookSearchValue + ".vcf";
					} else {
						var myTree = document.getElementById('accountsOrCatsTree');
						var defaultFileName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName')) + ".vcf";
					}
					wdw_cardbook.exportCardsToFile(listOfSelectedCard, defaultFileName);
				} else if (aMenu.id == "cardbookAccountMenuExportToDir" || aMenu.id == "exportCardsToDirFromAccountsOrCats") {
					wdw_cardbook.exportCardsToDir(listOfSelectedCard);
				} else if (aMenu.id == "cardbookAccountMenuExportImages" || aMenu.id == "exportCardsImagesFromAccountsOrCats") {
					wdw_cardbook.exportCardsImages(listOfSelectedCard);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsFromAccountsOrCats error : " + e, "Error");
			}
		},

		exportCardsFromCards: function (aMenu) {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
				if (aMenu.id == "exportCardsToFileFromCards" || aMenu.id == "cardbookContactsMenuExportCardsToFile") {
					if (listOfSelectedCard.length == 1) {
						var myTree = document.getElementById('cardsTree');
						var defaultFileName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('fn')) + ".vcf";
					} else {
						var defaultFileName = "export.vcf";
					}
					wdw_cardbook.exportCardsToFile(listOfSelectedCard, defaultFileName);
				} else if (aMenu.id == "exportCardsToDirFromCards" || aMenu.id == "cardbookContactsMenuExportCardsToDir") {
					wdw_cardbook.exportCardsToDir(listOfSelectedCard);
				} else if (aMenu.id == "exportCardsImagesFromCards" || aMenu.id == "cardbookContactsMenuExportCardsImages") {
					wdw_cardbook.exportCardsImages(listOfSelectedCard);
				}
					
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsFromCards error : " + e, "Error");
			}
		},

		exportCardsToFile: function (aListOfSelectedCard, aDefaultFileName) {
			try {
				cardbookWindowUtils.callFilePicker("fileSaveTitle", "SAVE", "EXPORTFILE", aDefaultFileName, "", wdw_cardbook.exportCardsToFileNext, aListOfSelectedCard);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsToFile error : " + e, "Error");
			}
		},

		exportCardsToFileNext: async function (aFile, aListOfSelectedCard) {
			try {
				if (!(aFile.exists())) {
					aFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
				}

				if (cardbookRepository.cardbookUtils.isFileAlreadyOpen(aFile.path)) {
					cardbookRepository.cardbookUtils.formatStringForOutput("fileAlreadyOpen", [aFile.leafName]);
					return;
				}

				var myTopic = "cardsExportedToFile";
				var myActionId = cardbookActions.startAction(myTopic, [aFile.leafName]);
				cardbookRepository.currentAction[myActionId].totalCards = aListOfSelectedCard.length;
				if (cardbookRepository.cardbookUtils.getFileNameExtension(aFile.leafName).toLowerCase() == "csv") {
					let myArgs = {template: [], mode: "export", includePref: false, lineHeader: true, columnSeparator: ";",
									file: aFile, selectedCards: aListOfSelectedCard, actionId: myActionId, headers: "",
									action: "", params: {}, actionCallback: wdw_cardbook.writeCardsToCSVFile};
					let myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/csvTranslator/wdw_csvTranslator.xhtml", "", cardbookRepository.windowParams, myArgs);
				} else {
					wdw_cardbook.bulkOperation(myActionId);
					await cardbookRepository.cardbookSynchronization.writeCardsToFile(aFile.path, aListOfSelectedCard, myActionId, aListOfSelectedCard.length);
					cardbookRepository.cardbookSynchronization.finishExportToFile(window, aListOfSelectedCard.length, aFile.leafName);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsToFileNext error : " + e, "Error");
			}
		},

		writeCardsToCSVFile: async function (aFile, aListofCard, aActionId, aColumns, aColumnSeparator, aIncludePref, aAction, aHeaders, aParams) {
			try {
				let output = "";
				if (aAction == "SAVE") {
					wdw_cardbook.bulkOperation(aActionId);
					let k = 0;
					for (let column of aColumns) {
						if (k === 0) {
							output = "\"" + column[1] + "\"";
							k++;
						} else {
							output = output + aColumnSeparator + "\"" + column[1] + "\"";
						}
					}
					k = 0;
					for (let card of aListofCard) {
						for (let column of aColumns) {
							let tmpValue;
							if (column[0] == "categories.0.array") {
								tmpValue = cardbookRepository.cardbookUtils.getCardValueByField(card, column[0], false);
								tmpValue = cardbookRepository.cardbookUtils.unescapeArrayComma(cardbookRepository.cardbookUtils.escapeArrayComma(tmpValue)).join(",");
							} else {
								tmpValue = cardbookRepository.cardbookUtils.getCardValueByField(card, column[0], aIncludePref).join("\r\n");
							}
							let tmpResult = "\"" + tmpValue + "\"";
							if (k === 0) {
								output = output + "\r\n" + tmpResult;
								k++;
							} else {
								output = output + aColumnSeparator + tmpResult;
							}
						}
						k = 0;
					}
	
					// a final blank line
					output = output + "\r\n";
					await cardbookRepository.cardbookUtils.writeContentToFile(aFile.path, output, "UTF8", aActionId, aListofCard.length);
				}
				cardbookActions.endAsyncAction(aActionId, {window: window, length: aListofCard.length, name: aFile.leafName});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.writeCardsToCSVFile error : " + e, "Error");
			}
		},

		exportCardsToDir: function (aListOfSelectedCard) {
			try {
				cardbookWindowUtils.callDirPicker("dirSaveTitle", wdw_cardbook.exportCardsToDirNext, aListOfSelectedCard);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsToDir error : " + e, "Error");
			}
		},

		exportCardsToDirNext: function (aDirectory, aListOfSelectedCard) {
			try {
				if (aDirectory) {
					if (aDirectory.exists() == false){
						aDirectory.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
					}
	
					if (cardbookRepository.cardbookUtils.isDirectoryAlreadyOpen(aDirectory.path)) {
						cardbookRepository.cardbookUtils.formatStringForOutput("directoryAlreadyOpen", [aDirectory.leafName]);
						return;
					}
	
					let myTopic = "cardsExportedToDir";
					let myActionId = cardbookActions.startAction(myTopic, [aDirectory.leafName]);
					let length = aListOfSelectedCard.length;
					cardbookRepository.currentAction[myActionId].totalCards = length;
					wdw_cardbook.bulkOperation(myActionId);
					cardbookRepository.cardbookSynchronization.writeCardsToDir(aDirectory.path, aListOfSelectedCard, myActionId);
					cardbookActions.endAsyncAction(myActionId, {window: window, length: length, name: aDirectory.leafName});
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsToDirNext error : " + e, "Error");
			}
		},

		exportCardsImages: function (aListOfSelectedCard) {
			try {
				cardbookWindowUtils.callDirPicker("dirSaveTitle", wdw_cardbook.exportCardsImagesNext, aListOfSelectedCard);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsImages error : " + e, "Error");
			}
		},

		exportCardsImagesNext: function (aDirectory, aListOfSelectedCard) {
			try {
				if (aDirectory) {
					if (aDirectory.exists() == false){
						aDirectory.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
					}
	
					if (cardbookRepository.cardbookUtils.isDirectoryAlreadyOpen(aDirectory.path)) {
						cardbookRepository.cardbookUtils.formatStringForOutput("directoryAlreadyOpen", [aDirectory.leafName]);
						return;
					}
	
					let myTopic = "cardsImagesExported";
					let myActionId = cardbookActions.startAction(myTopic, [aDirectory.leafName]);
					let length = aListOfSelectedCard.length;
					cardbookRepository.currentAction[myActionId].totalCards = length * cardbookRepository.allColumns.media.length;
					wdw_cardbook.bulkOperation(myActionId);
					cardbookRepository.cardbookSynchronization.writeCardsImages(aDirectory.path, aListOfSelectedCard, myActionId);
					cardbookActions.endAsyncAction(myActionId, {window: window, name: aDirectory.leafName});
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsToDirNext error : " + e, "Error");
			}
		},

		importCardsFromFile: function () {
			try {
				cardbookWindowUtils.callFilePicker("fileImportTitle", "OPEN", "EXPORTFILE", "", "", wdw_cardbook.importCardsFromFileNext);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.importCardsFromFile error : " + e, "Error");
			}
		},

		importCardsFromFileNext: function (aFile) {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myTarget = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
				var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(myTarget);
				var myDirPrefIdUrl = cardbookRepository.cardbookPreferences.getUrl(myDirPrefId);
				var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);

				// search if file is already open
				if (aFile.path == myDirPrefIdUrl) {
					cardbookRepository.cardbookUtils.formatStringForOutput("importNotIntoSameFile");
					return;
				}
				cardbookRepository.cardbookSynchronization.initMultipleOperations(myDirPrefId);
				cardbookRepository.cardbookFileRequest[myDirPrefId]++;
				var myTopic = "cardsImportedFromFile";
				var myActionId = cardbookActions.startAction(myTopic, [aFile.leafName]);
				var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(myTarget);
				if (cardbookRepository.cardbookUtils.getFileNameExtension(aFile.leafName).toLowerCase() == "csv") {
					wdw_cardbook.loadCSVFile(aFile, myDirPrefId, myTarget, "IMPORTFILE", myActionId);
				} else {
					// we presume we've got one contact per file
					cardbookRepository.cardbookServerCardSyncTotal[myDirPrefId]++;
					cardbookRepository.cardbookSynchronization.loadFile(aFile, myDirPrefId, myTarget, "IMPORTFILE", myActionId);
				}
				cardbookRepository.cardbookSynchronization.waitForImportFinished(myDirPrefId, myDirPrefIdName);
				cardbookActions.endAsyncAction(myActionId, {window: window, name: aFile.leafName});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.importCardsFromFileNext error : " + e, "Error");
			}
		},

		loadCSVFile: function (aFile, aDirPrefId, aTarget, aImportMode, aActionId) {
			let params = {};
			params["showError"] = true;
			params["aFile"] = aFile;
			params["aTarget"] = aTarget;
			params["aImportMode"] = aImportMode;
			params["aPrefId"] = aDirPrefId;
			params["aPrefIdType"] = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
			params["aPrefIdName"] = cardbookRepository.cardbookPreferences.getName(aDirPrefId);
			params["aPrefIdUrl"] = cardbookRepository.cardbookPreferences.getUrl(aDirPrefId);
			params["aPrefIdVersion"] = cardbookRepository.cardbookPreferences.getVCardVersion(aDirPrefId);
			params["aPrefIdDateFormat"] = cardbookRepository.getDateFormat(aDirPrefId, cardbookRepository.cardbookPreferences.getVCardVersion(aDirPrefId));
			if (aActionId) {
				params["aActionId"] = aActionId;
				cardbookRepository.currentAction[aActionId].totalCards++;
			}
			cardbookRepository.cardbookUtils.readContentFromFile(aFile.path, wdw_cardbook.loadCSVFileAsync, params);
		},
	
		loadCSVFileAsync: async function (aContent, aParams) {
			try {
				if (aContent) {
					aParams.content = aContent;
					let result = cardbookRepository.cardbookUtils.CSVToArray(aContent);
					aParams.fileContentArray = result.result;
					let delimiter = result.delimiter;
					let headers = aParams.fileContentArray[0];
					if (delimiter) {
						headers = aParams.fileContentArray[0].join(delimiter);
					}
					
					let myArgs = {template: [], mode: "import", includePref: false, lineHeader: true, columnSeparator: delimiter,
									file: aParams.aFile, selectedCards: [], actionId: aParams.aActionId, headers: headers,
									action: "", params: aParams, actionCallback: wdw_cardbook.loadCSVFileAsyncNext};
					let myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/csvTranslator/wdw_csvTranslator.xhtml", "", cardbookRepository.windowParams, myArgs);
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("fileEmpty", [aParams.aFile.path]);
					cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
					if (aParams.aActionId) {
						cardbookRepository.currentAction[aParams.aActionId].doneCards++;
					}
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.loadCSVFileAsync error : " + e, "Error");
				cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
			}
		},
	
		loadCSVFileAsyncNext: async function (aFile, aListofCard, aActionId, aColumns, aColumnSeparator, aIncludePref, aAction, aHeaders, aLineHeader, aParams) {
			try {
				if (aAction == "SAVE") {
					wdw_cardbook.bulkOperation(aActionId);
					let result = cardbookRepository.cardbookUtils.CSVToArray(aParams.content, aColumnSeparator);
					let fileContentArray = result.result;
					let start = 0;
					if (aLineHeader) {
						start = 1;
					}
					let fileContentArrayLength = fileContentArray.length
					cardbookRepository.cardbookServerCardSyncTotal[aParams.aPrefId] = fileContentArrayLength - start;
					for (let i = start; i < fileContentArrayLength; i++) {
						let card = new cardbookCardParser();
						try {
							card.dirPrefId = aParams.aPrefId;
							for (var j = 0; j < fileContentArray[i].length; j++) {
								if (aColumns[j]) {
									cardbookRepository.cardbookUtils.setCardValueByField(card, aColumns[j][0], fileContentArray[i][j]);
								}
							}
							card.version = cardbookRepository.cardbookPreferences.getVCardVersion(aParams.aPrefId);
							if (card.fn == "") {
								cardbookRepository.cardbookUtils.getDisplayedName(card, card.dirPrefId,
																	[card.prefixname, card.firstname, card.othername, card.lastname, card.suffixname, card.nickname],
																	[card.org, card.title, card.role]);
							}
						}
						catch (e) {
							cardbookRepository.cardbookServerCardSyncError[aParams.aPrefId]++;
							cardbookRepository.cardbookServerCardSyncDone[aParams.aPrefId]++;
							if (e.message == "") {
								cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [aParams.aPrefIdName, cardbookRepository.extension.localeData.localizeMessage(e.code), fileContentArray[i]], "Error");
							} else {
								cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [aParams.aPrefIdName, e.message, fileContentArray[i]], "Error");
							}
							continue;
						}
						await cardbookRepository.cardbookSynchronization.importCard(card, aParams.aTarget, aParams.aPrefIdVersion, aParams.aPrefIdDateFormat, aParams.aPrefIdDateFormat,
																aParams.aActionId);
						card = null;
						cardbookRepository.cardbookServerCardSyncDone[aParams.aPrefId]++;
					}
				}
				cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
				if (aParams.aActionId) {
					cardbookRepository.currentAction[aParams.aActionId].doneCards++;
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.loadCSVFileAsyncNext error : " + e, "Error");
				cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
			}
		},
	
		importCardsFromDir: function () {
			try {
				cardbookWindowUtils.callDirPicker("dirImportTitle", wdw_cardbook.importCardsFromDirNext);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.importCardsFromDir error : " + e, "Error");
			}
		},

		importCardsFromDirNext: function (aDirectory) {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myTarget = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
				var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(myTarget);
				var myDirPrefIdUrl = cardbookRepository.cardbookPreferences.getUrl(myDirPrefId);
				var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);

				// search if dir is already open
				if (aDirectory.path == myDirPrefIdUrl) {
					cardbookRepository.cardbookUtils.formatStringForOutput("importNotIntoSameDir");
					return;
				}
				cardbookRepository.cardbookSynchronization.initMultipleOperations(myDirPrefId);
				cardbookRepository.cardbookDirRequest[myDirPrefId]++;
				var myTopic = "cardsImportedFromDir";
				var myActionId = cardbookActions.startAction(myTopic, [aDirectory.leafName]);
				wdw_cardbook.bulkOperation(myActionId);
				var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(myTarget);
				cardbookRepository.cardbookSynchronization.loadDir(aDirectory, myDirPrefId, myTarget, "IMPORTDIR", myActionId);
				cardbookRepository.cardbookSynchronization.waitForImportFinished(myDirPrefId, myDirPrefIdName);
				cardbookActions.endAsyncAction(myActionId, {window: window, name: aDirectory.leafName});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.importCardsFromDirNext error : " + e, "Error");
			}
		},

		cutCardsFromAccountsOrCats: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromAccountsOrCats();
				wdw_cardbook.copyCards(listOfSelectedCard, "CUT");
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.cutCardsFromAccountsOrCats error : " + e, "Error");
			}
		},

		copyCardsFromAccountsOrCats: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromAccountsOrCats();
				wdw_cardbook.copyCards(listOfSelectedCard, "COPY");
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.copyCardsFromAccountsOrCats error : " + e, "Error");
			}
		},

		cutCardsFromCards: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
				wdw_cardbook.copyCards(listOfSelectedCard, "CUT");
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.cutCardsFromCards error : " + e, "Error");
			}
		},

		copyCardsFromCards: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
				wdw_cardbook.copyCards(listOfSelectedCard, "COPY");
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.copyCardsFromCards error : " + e, "Error");
			}
		},

		copyCards: function (aListOfSelectedCard, aMode) {
			try {
				var listOfSelectedUid = [];
				for (var i = 0; i < aListOfSelectedCard.length; i++) {
					listOfSelectedUid.push(aListOfSelectedCard[i].cbid);
				}
				var myText = listOfSelectedUid.join("@@@@@");
				if (myText) {
					if (listOfSelectedUid.length > 1) {
						var myMessage = cardbookRepository.extension.localeData.localizeMessage("contactsCopied");
					} else {
						var myMessage = cardbookRepository.extension.localeData.localizeMessage("contactCopied");
					}
					cardbookClipboard.clipboardSetValueForFlavor('text/x-moz-cardbook-id', myText, myMessage);
					if (aMode == "CUT") {
						wdw_cardbook.cutAndPaste = "CUT";
					} else {
						wdw_cardbook.cutAndPaste = "";
					}
					cardbookRepository.cardbookLog.updateStatusProgressInformation(myMessage);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.copyCards error : " + e, "Error");
			}
		},

		pasteCards: async function () {
			try {
				var myType = "CARDS";
				if (cardbookClipboard.clipboardCanPaste(myType)) {
					var data = cardbookClipboard.clipboardGetData(myType);
					if (data.flavor === "text/x-moz-cardbook-id") {
						var myText = data.data.QueryInterface(Components.interfaces.nsISupportsString).data;
						var myTree = document.getElementById('accountsOrCatsTree');
						var myTarget = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
						var nodeArray = cardbookRepository.cardbookUtils.escapeStringSemiColon(myTarget).split("::");
						var myDirPrefId = nodeArray[0];
						var myNodeType = nodeArray[1];
						var myNodeName = nodeArray[nodeArray.length-1];
						nodeArray.shift();
						nodeArray.shift();
						var orgNode = cardbookRepository.cardbookUtils.unescapeStringSemiColon(nodeArray.join(";"));
						var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(myDirPrefId);
						var myDirPrefIdEnabled = cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId);
						var myDirPrefIdReadOnly = cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId);
						var myDirPrefIdVCardVersion = cardbookRepository.cardbookPreferences.getVCardVersion(myDirPrefId);
						var myDirPrefIdDateFormat = cardbookRepository.getDateFormat(myDirPrefId, myDirPrefIdVCardVersion);

						if (myDirPrefIdType !== "SEARCH") {
							if (myDirPrefIdEnabled) {
								if (!myDirPrefIdReadOnly) {
									var choice = cardbookRepository.importConflictChoiceImportValues.join("::");
									if (!cardbookRepository.importConflictChoice[myDirPrefId]) {
										cardbookRepository.importConflictChoice[myDirPrefId] = {};
										cardbookRepository.importConflictChoicePersist[myDirPrefId] = {};
									}
									cardbookRepository.importConflictChoice[myDirPrefId][choice] = "update";
									cardbookRepository.importConflictChoicePersist[myDirPrefId][choice] = false;
									var dataArray = myText.split("@@@@@");
									if (dataArray.length) {
										let myTopic = "cardsPasted";
										let length = 0;
										for (var i = 0; i < dataLength; i++) {
											if (cardbookRepository.cardbookCards[dataArray[i]]) {
												length++
											}
										}
										var myActionId = cardbookActions.startAction(myTopic, null, null, dataArray.length);
										wdw_cardbook.bulkOperation(myActionId);
										var dataLength = dataArray.length
										for (var i = 0; i < dataLength; i++) {
											if (cardbookRepository.cardbookCards[dataArray[i]]) {
												var myCard = cardbookRepository.cardbookCards[dataArray[i]];
												if (cardbookRepository.cardbookSearchMode === "SEARCH") {
													var myTarget = myCard.dirPrefId;
													var myDirPrefId = myCard.dirPrefId;
												}
												if (myDirPrefId == myCard.dirPrefId) {
													if (myNodeType == "categories" && myCard.categories.includes(myNodeName)) {
														cardbookRepository.importConflictChoice[myDirPrefId][choice] = "duplicate";
														cardbookRepository.importConflictChoicePersist[myDirPrefId][choice] = true;
													} else if (myNodeType == "org" && orgNode == myCard.org) {
														cardbookRepository.importConflictChoice[myDirPrefId][choice] = "duplicate";
														cardbookRepository.importConflictChoicePersist[myDirPrefId][choice] = true;
													} else if (!cardbookRepository.possibleNodes.includes(myNodeType)) {
														cardbookRepository.importConflictChoice[myDirPrefId][choice] = "duplicate";
														cardbookRepository.importConflictChoicePersist[myDirPrefId][choice] = true;
													} else {
														cardbookRepository.importConflictChoice[myDirPrefId][choice] = "update";
														cardbookRepository.importConflictChoicePersist[myDirPrefId][choice] = true;
													}
												}
												var mySourceDateFormat = cardbookRepository.getDateFormat(myCard.dirPrefId, myCard.version);
												// Services.tm.currentThread.dispatch({ run: async function() {
												await cardbookRepository.cardbookSynchronization.importCard(myCard, myTarget, myDirPrefIdVCardVersion, mySourceDateFormat, myDirPrefIdDateFormat,
													myActionId);
												if (myDirPrefId != myCard.dirPrefId && 
													cardbookRepository.importConflictChoice[myDirPrefId] &&
													cardbookRepository.importConflictChoice[myDirPrefId][choice] &&
													cardbookRepository.importConflictChoice[myDirPrefId][choice] != "cancel") {
													if (wdw_cardbook.cutAndPaste != "") {
														cardbookRepository.currentAction[myActionId].totalCards++;
														cardbookRepository.asyncDeleteCards([myCard], myActionId);
													}
												}
												// }}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
											} else {
												cardbookRepository.cardbookUtils.formatStringForOutput("clipboardWrong");
											}
										}
										wdw_cardbook.cutAndPaste = "";
										cardbookActions.endAsyncAction(myActionId);
									} else {
										cardbookRepository.cardbookUtils.formatStringForOutput("clipboardEmpty");
									}
								} else {
									var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);
									cardbookRepository.cardbookUtils.formatStringForOutput("addressbookReadOnly", [myDirPrefIdName]);
								}
							} else {
								var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);
								cardbookRepository.cardbookUtils.formatStringForOutput("addressbookDisabled", [myDirPrefIdName]);
							}
						}
					}
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.pasteCards error : " + e, "Error");
			}
		},

		bulkOperation: function (aActionId) {
			if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
				if (aActionId && cardbookRepository.currentAction[aActionId] && cardbookRepository.currentAction[aActionId].totalEstimatedCards) {
					if (cardbookRepository.currentAction[aActionId].totalEstimatedCards < 10) {
						return;
					}
				}
				var windowsList = Services.wm.getEnumerator("CardBook:bulkWindow");
				var found = false;
				while (windowsList.hasMoreElements()) {
					var myWindow = windowsList.getNext();
					myWindow.focus();
					found = true;
					break;
				}
				if (!found) {
					var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/wdw_bulkOperation.xhtml", "", cardbookRepository.windowParams);
				}
			}
		},

		chooseActionTreeForClick: function (aEvent) {
			wdw_cardbook.setCurrentTypeFromEvent(aEvent);
			// only left click
			if (aEvent.button == 0) {
				if (wdw_cardbook.currentType == "email") {
					wdw_cardbook.emailCardFromTree("to");
				} else if (wdw_cardbook.currentType == "url") {
					wdw_cardbook.openURLFromTree();
				} else if (wdw_cardbook.currentType == "adr") {
					wdw_cardbook.localizeCardFromTree();
				} else if (wdw_cardbook.currentType == "impp") {
					wdw_cardbook.openIMPPFromTree();
				} else if (wdw_cardbook.currentType == "tel") {
					wdw_cardbook.openTelFromTree();
				}
			}
			aEvent.stopPropagation();
		},
		
		chooseActionForKey: function (aEvent) {
			if (aEvent.ctrlKey && !aEvent.shiftKey) {
				switch(aEvent.key) {
					case "k":
					case "K":
						wdw_cardbook.editComplexSearch();
						aEvent.stopPropagation();
						break;
				}
			} else {
				if (aEvent.key == "Enter") {
					wdw_cardbook.returnKey();
					aEvent.stopPropagation();
				}
			}
		},
		
		emailCardFromTree: async function (aAction) {
			let card = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			await wdw_cardbook.emailCards(null, [card.fn.replace(/,/g, " ").replace(/;/g, " "), wdw_cardbook.currentValue], aAction);
		},
		
		findEmailsFromTree: function () {
			ovl_cardbookFindEmails.findEmails(null, [wdw_cardbook.currentValue]);
		},
		
		findEventsFromTree: function () {
			var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			var myEmail = myCard.email[wdw_cardbook.currentIndex][0][0]
			ovl_cardbookFindEvents.findEvents(null, [myEmail], myEmail);
		},

		searchForOnlineKeyFromTree: function () {
			cardbookEnigmail.searchForOnlineKey(null, [wdw_cardbook.currentValue]);
		},

		localizeCardFromTree: function () {
			var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			wdw_cardbook.localizeCards(null, [myCard.adr[wdw_cardbook.currentIndex][0]]);
		},

		openURLFromTree: function () {
			wdw_cardbook.openURLCards(null, [wdw_cardbook.currentValue]);
		},

		openIMPPFromTree: function () {
			if (document.getElementById('impp_' + wdw_cardbook.currentIndex + '_valueBox').getAttribute('link') == "true") {
				var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
				var myResult = myCard[wdw_cardbook.currentType][wdw_cardbook.currentIndex];
				cardbookWindowUtils.openIMPP(myResult);
			}
		},

		openTelFromTree: function () {
			if (document.getElementById('tel_' + wdw_cardbook.currentIndex + '_valueBox').getAttribute('link') == "true") {
				cardbookWindowUtils.openTel(wdw_cardbook.currentValue);
			}
		},

		doubleClickCardsTree: function (aEvent) {
			var myTree = document.getElementById('cardsTree');
			var cell = myTree.getCellAt(aEvent.clientX, aEvent.clientY);
			if (cell.row != -1) {
				wdw_cardbook.chooseActionCardsTree();
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				if (!cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId) && cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId)) {
					if (cardbookRepository.cardbookUtils.getAvailableAccountNumber() !== 0) {
						wdw_cardbook.createContact();
					}
				}
			}
		},

		chooseActionCardsTree: async function () {
			var preferEmailEdition = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.preferEmailEdition");
			if (preferEmailEdition) {
				wdw_cardbook.editCard();
			} else {
				await wdw_cardbook.emailCardsFromAction("to");
			}
		},

		// when choosing a menu entry, the command action is also fired
		// so this function is intended not to have two emails sent
		emailCardsFromAction: async function (aAction) {
			let listOfSelectedCard = [];
			if (document.commandDispatcher.focusedElement) {
				if (document.commandDispatcher.focusedElement.id == "accountsOrCatsTree") {
					if (cardbookRepository.cardbookUtils.getAccountId(cardbookRepository.currentAccountId) != cardbookRepository.currentAccountId) {
						listOfSelectedCard = cardbookWindowUtils.getCardsFromAccountsOrCats();
					}
				} else if (document.commandDispatcher.focusedElement.id == "cardsTree") {
					listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
				}
			}
			await wdw_cardbook.emailCards(listOfSelectedCard, null, aAction);
		},

		searchForOnlineKeyFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			cardbookEnigmail.searchForOnlineKey(listOfSelectedCard, null);
		},
		
		importKeyFromCards: function () {
			let listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			for (let card of listOfSelectedCard) {
				for (let keyType of card.key) {
					if (keyType.value) {
						wdw_cardbook.importKeyFromValue(keyType.value, card);
					} else if (keyType.URI) {
						wdw_cardbook.importKeyFromValue(keyType.URI, card);
					}
				}
			}
		},

		importKeyFromValue: function (aValue, aCard) {
			/*
			* The aCard is not a real aCard (with all attributes) if the user presses the key in the Public Keys tab.
			* In that case, the values come from the following path:
			*  - addKeyButton - cardbookElementTools.js#709
			*  - loadStaticKeysTypes - cardbookWindowUtils.js#2148
			*  - constructStaticKeysRows - cardbookWindowUtils.js#1305
			*  - displayCard - cardbookWindowUtils.js#864
			 */
			if (aValue.startsWith("file")) {
				let fileName = aValue.replace("file://", "");
				let params = {};
				params["showError"] = true;
				cardbookRepository.cardbookUtils.readContentFromFile(fileName, wdw_cardbook.importKeyFromValueNext, params);
			} else if (aValue.startsWith("http")) {
				let listener_getkey = {
					onDAVQueryComplete: function(status, response, askCertificate, etag) {
						if (status > 199 && status < 400) {
							cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetKeyOK", [aKeyConnection.connDescription, aCard.fn]);
							cardbookEnigmail.importKey(response);
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetKeyFailed", [aKeyConnection.connDescription, aCard.fn, aKeyConnection.connUrl, status], "Error");
						}
					}
				};
				let URI = aValue;
				let aDescription = cardbookRepository.cardbookUtils.getPrefNameFromPrefId(aCard.dirPrefId);
				let aKeyConnection = {connPrefId: aCard.dirPrefId, connUrl: URI, connDescription: aDescription};
				let request = new cardbookWebDAV(aKeyConnection, listener_getkey);
				cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGettingKey", [aKeyConnection.connDescription, aCard.fn]);
				request.getkey();
			} else {
				cardbookEnigmail.importKey(aValue.replaceAll("\\n", "\n").replaceAll("\\r", "\r"));
			}
		},

		importKeyFromValueNext: function (aContent, aParam) {
			try {
				if (aContent) {
					cardbookEnigmail.importKey(aContent);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("importKeyFromCardsNext error : " + e, "Error");
			}
		},

		shareCardsByEmailFromAccountsOrCats: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromAccountsOrCats();
			wdw_cardbook.shareCardsByEmail(listOfSelectedCard);
		},

		shareCardsByEmailFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			wdw_cardbook.shareCardsByEmail(listOfSelectedCard);
		},

		openURLFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			wdw_cardbook.openURLCards(listOfSelectedCard, null);
		},

		printCards: async function() {
			let printBrowser = document.getElementById("cardbookPrintContent");
			let listOfSelectedCard = [];
			if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
				let myTree = document.getElementById('cardsTree');
				if (myTree.currentIndex != -1) {
					listOfSelectedCard = cardbookWindowUtils.getSelectedCardsId();
				}
			} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
				let myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					let accountCards = cardbookWindowUtils.getCardsFromAccountsOrCats();
					listOfSelectedCard = Array.from(accountCards, card => card.cbid);
				}
			}
			if (listOfSelectedCard.length == 0) {
				return
			} else {
				printBrowser.setAttribute("cards", listOfSelectedCard.join(","));
			}
			if (printBrowser.currentURI.spec == "about:blank") {
				// The template page hasn't been loaded yet. Do that now.
				await new Promise(resolve => {
					// Store a strong reference to this progress listener.
					printBrowser.progressListener = {
						QueryInterface: ChromeUtils.generateQI([
							"nsIWebProgressListener",
							"nsISupportsWeakReference",
						]),

						/** nsIWebProgressListener */
						onStateChange(webProgress, request, stateFlags, status) {
							if (stateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP && printBrowser.currentURI.spec != "about:blank") {
								printBrowser.webProgress.removeProgressListener(this);
								delete printBrowser.progressListener;
								resolve();
							}
						},
					};

					printBrowser.webProgress.addProgressListener(printBrowser.progressListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_ALL);
					MailE10SUtils.loadURI(printBrowser, "chrome://cardbook/content/print/printing-template.html");
				});
			}
			PrintUtils.startPrintWindow(printBrowser.browsingContext, {});
		},

		findEmailsFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			ovl_cardbookFindEmails.findEmails(listOfSelectedCard, null);
		},

		findEventsFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			var myCard = listOfSelectedCard[0];
			ovl_cardbookFindEvents.findEvents(myCard, null, myCard.fn);
		},

		localizeCardsFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			wdw_cardbook.localizeCards(listOfSelectedCard, null);
		},

		warnEmptyEmailContacts: function(aListOfEmptyFn, aListOfNotEmptyEmails) {
			var result = true;
			if (cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.warnEmptyEmails")) {
				var warningTitle = cardbookRepository.extension.localeData.localizeMessage("warningTitle");
				if (aListOfEmptyFn.length > 1) {
					var warningMsg = cardbookRepository.extension.localeData.localizeMessage("emptyEmailsCardsConfirmMessage", [aListOfEmptyFn.join(', ')]);
				} else {
					var warningMsg = cardbookRepository.extension.localeData.localizeMessage("emptyEmailsCardConfirmMessage", [aListOfEmptyFn.join(', ')]);
				}
				var rememberFlag = {value: false};
				var rememberMsg = cardbookRepository.extension.localeData.localizeMessage("doNotShowAnymore");
				var result = false;
				if (aListOfNotEmptyEmails.length == 0) {
					var flags = Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_CANCEL;
					var returnButton = Services.prompt.confirmEx(window, warningTitle, warningMsg, flags, "", "", "", rememberMsg, rememberFlag);
				} else {
					var flags = Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_IS_STRING + Services.prompt.BUTTON_POS_1 * Services.prompt.BUTTON_TITLE_CANCEL;
					var sendButtonLabel = cardbookRepository.extension.localeData.localizeMessage("sendButtonLabel");
					var returnButton = Services.prompt.confirmEx(window, warningTitle, warningMsg, flags, sendButtonLabel, "", "", rememberMsg, rememberFlag);
					if (returnButton == 0) {
						var result = true;
					}
				}
				if (rememberFlag.value) {
					cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.warnEmptyEmails", false);
				}
			}
			return result;
		},

		emailCards: async function (aListOfSelectedCard, aListOfSelectedMails, aMsgField) {
			let useOnlyEmail = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
			let result = {};
			let compFields = [];
			if (aListOfSelectedCard && aListOfSelectedCard.length != 0) {
				result = cardbookRepository.cardbookUtils.getMimeEmailsFromCardsAndLists(aListOfSelectedCard, useOnlyEmail);
			} else if (aListOfSelectedMails && aListOfSelectedMails.length != 0) {
				result.emptyResults = [];
				result.notEmptyResults = [];
				if (useOnlyEmail) {
					result.notEmptyResults.push(aListOfSelectedMails[1]);
				} else {
					result.notEmptyResults.push(MailServices.headerParser.makeMimeAddress(aListOfSelectedMails[0], aListOfSelectedMails[1]));
				}
			// possibility to send email to nobody for the write button
			} else {
				await notifyTools.notifyBackground({query: "cardbook.emailCards", compFields: compFields});
				return;
			}

			let warnCheck = true;
			if (result.emptyResults.length != 0) {
				warnCheck = wdw_cardbook.warnEmptyEmailContacts(result.emptyResults, result.notEmptyResults);
			}
			
			if (warnCheck) {
				compFields = [{field: aMsgField, value: result.notEmptyResults.join(" , ")}];
				await notifyTools.notifyBackground({query: "cardbook.emailCards", compFields: compFields});
			}
		},

		shareCardsByEmail: async function (aListOfSelectedCard) {
			if (aListOfSelectedCard.length != 0) {
				let vCards = [];
				for (let card of aListOfSelectedCard) {
					let listOfNames = Array.from(vCards, x => x.filename);
					let filename = cardbookRepository.cardbookUtils.getFileNameForCard2(card, listOfNames, ".vcf");
					let vCard = await cardbookRepository.cardbookUtils.getvCardForEmail(card);
					vCards.push({filename: filename, vCard: vCard});
				}
				await notifyTools.notifyBackground({query: "cardbook.sharevCards", vCards: vCards});
				return;
			}
		},

		localizeCards: function (aListOfSelectedCard, aListOfSelectedAddresses) {
			var listOfAddresses = [];
			if (aListOfSelectedCard) {
				listOfAddresses = cardbookRepository.cardbookUtils.getAddressesFromCards(aListOfSelectedCard);
			} else if (aListOfSelectedAddresses) {
				listOfAddresses = JSON.parse(JSON.stringify(aListOfSelectedAddresses));
			}
			
			var localizeEngine = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.localizeEngine");
			var urlEngine = "";
			if (localizeEngine === "GoogleMaps") {
				urlEngine = "https://www.google.com/maps?q=";
			} else if (localizeEngine === "OpenStreetMap") {
				urlEngine = "https://www.openstreetmap.org/search?query=";
			} else if (localizeEngine === "BingMaps") {
				urlEngine = "https://www.bing.com/maps/?q=";
			} else {
				return;
			}

			for (var i = 0; i < listOfAddresses.length; i++) {
				var url = urlEngine + cardbookRepository.cardbookUtils.undefinedToBlank(listOfAddresses[i][2]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+") + "+"
									+ cardbookRepository.cardbookUtils.undefinedToBlank(listOfAddresses[i][3]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+") + "+"
									+ cardbookRepository.cardbookUtils.undefinedToBlank(listOfAddresses[i][4]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+") + "+"
									+ cardbookRepository.cardbookUtils.undefinedToBlank(listOfAddresses[i][5]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+") + "+"
									+ cardbookRepository.cardbookUtils.undefinedToBlank(listOfAddresses[i][6]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+");
				cardbookWindowUtils.openURL(url);
			}
		},

		openURLCards: function (aListOfSelectedCard, aListOfSelectedURLs) {
			var listOfURLs = [];
			if (aListOfSelectedCard) {
				listOfURLs = cardbookRepository.cardbookUtils.getURLsFromCards(aListOfSelectedCard);
			} else if (aListOfSelectedURLs) {
				listOfURLs = JSON.parse(JSON.stringify(aListOfSelectedURLs));
			}
			
			for (var i = 0; i < listOfURLs.length; i++) {
				cardbookWindowUtils.openURL(listOfURLs[i]);
			}
		},

		sortTrees: async function (aEvent) {
			if (aEvent.button != 0) {
				return;
			}
			var target = aEvent.originalTarget;
			if (target.localName == "treecol") {
				wdw_cardbook.sortCardsTreeCol(target);
			} else {
				await wdw_cardbook.selectCard(aEvent);
			}
		},

		sortCardsTreeCol: function (aColumn) {
			var myTree = document.getElementById('cardsTree');
			var myFirstVisibleRow = myTree.getFirstVisibleRow();
			var myLastVisibleRow = myTree.getLastVisibleRow();

			// get selected cards
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();

			var columnName;
			var order = myTree.getAttribute("sortDirection") == "ascending" ? 1 : -1;
			
			// if the column is passed and it's already sorted by that column, reverse sort
			if (aColumn) {
				columnName = aColumn.id;
				if (myTree.getAttribute("sortResource") == columnName) {
					order *= -1;
				}
			} else {
				columnName = myTree.getAttribute("sortResource");
			}
			
			if (cardbookRepository.cardbookSearchMode === "SEARCH") {
				var mySelectedAccount = cardbookRepository.cardbookSearchValue;
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var mySelectedAccount = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn("accountId"));
				} else {
					return;
				}
			}
			if (cardbookRepository.cardbookDisplayCards[mySelectedAccount]) {
				cardbookRepository.cardbookUtils.sortCardsTreeArrayByString(cardbookRepository.cardbookDisplayCards[mySelectedAccount].cards, columnName, order);
			} else {
				return;
			}

			//setting these will make the sort option persist
			var myTree = document.getElementById('cardsTree');
			myTree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
			myTree.setAttribute("sortResource", columnName);
			
			wdw_cardbook.displayAccountOrCat(cardbookRepository.cardbookDisplayCards[mySelectedAccount].cards);
			
			//set the appropriate attributes to show to indicator
			var cols = myTree.getElementsByTagName("treecol");
			for (var i = 0; i < cols.length; i++) {
				cols[i].removeAttribute("sortDirection");
			}
			if (document.getElementById(columnName)) {
				document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
			}

			// select Cards back
			cardbookRepository.cardbookUtils.sortCardsTreeArrayByString(listOfSelectedCard, columnName, order);
			cardbookWindowUtils.setSelectedCards(listOfSelectedCard, myFirstVisibleRow, myLastVisibleRow);
		},

		startDrag: async function (aEvent) {
			function CardBookDataProvider() {}
			CardBookDataProvider.prototype = {
				QueryInterface: ChromeUtils.generateQI([Components.interfaces.nsIFlavorDataProvider]),
			
				getFlavorData: function(aTransferable, aFlavor, aData, aDataLen) {
					//don't know why, this function is never called 
					// if (aFlavor == 'application/x-moz-file-promise') {
					// 	var primitive = {};
					// 	aTransferable.getTransferData("text/vcard", primitive, {});
					// 	var vCard = primitive.value.QueryInterface(Components.interfaces.nsISupportsString);
					// 	aTransferable.getTransferData("application/x-moz-file-promise-dest-filename", primitive, {});
					// 	var leafName = primitive.value.QueryInterface(Components.interfaces.nsISupportsString).data;
					// 	aTransferable.getTransferData("application/x-moz-file-promise-dir", primitive, {});
					// 	var localFile = primitive.value.QueryInterface(Components.interfaces.nsIFile).clone();
					// 	localFile.append(leafName);
					// 	var ofStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
					// 	ofStream.init(localFile, -1, -1, 0);
					// 	var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
					// 	converter.init(ofStream, null);
					// 	converter.writeString(vCard);
					// 	converter.close();
					// 	// cardbookRepository.cardbookUtils.writeContentToFile(localFile.path, vCard, "UTF8");
					// }
				}
			};
			
			var aTreeChildren = aEvent.target;
			var listOfUid = [];
			var myCount = 0;
			var useOnlyEmail = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
			if (aTreeChildren.id == "cardsTreeChildren") {
				var myTree = document.getElementById('cardsTree');
				var numRanges = myTree.view.selection.getRangeCount();
				var start = new Object();
				var end = new Object();
				for (var i = 0; i < numRanges; i++) {
					myTree.view.selection.getRangeAt(i,start,end);
					for (var j = start.value; j <= end.value; j++){
						var myId = myTree.view.getCellText(j, myTree.columns.getNamedColumn('cbid'));
						listOfUid.push(myId);
						var myCard = cardbookRepository.cardbookCards[myId];
						// event can't await
						// cardbookRepository.cardbookUtils.getvCardForEmail(myCard).then( content => {
						// 	let vCard = encodeURIComponent(content);
						// 	aEvent.dataTransfer.mozSetDataAt("text/vcard", vCard, myCount);
						// 	aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-url","data:text/vcard," + vCard, myCount);
						// });
						var emails = cardbookRepository.cardbookUtils.getMimeEmailsFromCardsAndLists([myCard], useOnlyEmail);
						aEvent.dataTransfer.mozSetDataAt("text/unicode", emails.notEmptyResults.join(" , "), myCount);
						aEvent.dataTransfer.mozSetDataAt("text/x-moz-address", emails.notEmptyResults.join(" , "), myCount);
						aEvent.dataTransfer.mozSetDataAt("text/x-moz-cardbook-id", myId, myCount);
						aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-dest-filename", myCard.fn + ".vcf", myCount);
						aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise", new CardBookDataProvider(), myCount);
						myCount++;
					}
				}
			} else if (aTreeChildren.id == "accountsOrCatsTreeChildren") {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (cardbookRepository.cardbookSearchMode === "SEARCH") {
					var myAccountPrefId = cardbookRepository.cardbookSearchValue;
				} else {
					var myAccountPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
				}
				for (let card of cardbookRepository.cardbookDisplayCards[myAccountPrefId].cards) {
					var myId = card.cbid;
					listOfUid.push(myId);
					// event can't await
					// cardbookRepository.cardbookUtils.getvCardForEmail(card).then( content => {
					// 	let vCard = encodeURIComponent(content);
					// 	aEvent.dataTransfer.mozSetDataAt("text/vcard", vCard, myCount);
					// 	aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-url","data:text/vcard," + vCard, myCount);
					// });
					var emails = cardbookRepository.cardbookUtils.getMimeEmailsFromCardsAndLists([card], useOnlyEmail);
					aEvent.dataTransfer.mozSetDataAt("text/unicode", emails.notEmptyResults.join(" , "), myCount);
					aEvent.dataTransfer.mozSetDataAt("text/x-moz-address", emails.notEmptyResults.join(" , "), myCount);
					aEvent.dataTransfer.mozSetDataAt("text/x-moz-cardbook-id", myId, myCount);
					aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-dest-filename", card.fn + ".vcf", myCount);
					aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise", new CardBookDataProvider(), myCount);
					myCount++;
				}
			}
			
			// add a little image
			var myCanvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
			var myContext = myCanvas.getContext('2d');
			var myImage = new Image();
			var myIconMaxSize = 26;
			var myIconMaxNumber = 5;
			myCanvas.id = 'dragCanvas';
			myCanvas.height = myIconMaxSize;
			// need to know the canvas size before
			if (listOfUid.length >= myIconMaxNumber) {
				var myLength = myIconMaxNumber;
			} else {
				var myLength = listOfUid.length;
			}
			myCanvas.width = (myLength + 1) * myIconMaxSize;
			// concatenate images
			for (var i = 0; i < myLength; i++) {
				let cbid = listOfUid[i];
				let dirname = cardbookRepository.getParentOrg(cbid);
				await cardbookIDBImage.getImage("photo", dirname, cbid, "")
					.then( image => {
						if (image && image.content && image.extension) {
							let content = 'data:image/' + image.extension + ';base64,' + image.content;
							myImage.src = content;
						} else {
							myImage.src = cardbookRepository.defaultCardImage;
						}
					}).catch( () => {
						myImage.src = cardbookRepository.defaultCardImage;
					});
				myContext.drawImage(myImage, i*myIconMaxSize, 0, myIconMaxSize, myIconMaxSize);
			}
			if (listOfUid.length > myIconMaxNumber) {
				// Concatenate a triangle
				var path=new Path2D();
				path.moveTo(myIconMaxSize*myIconMaxNumber,0);
				path.lineTo(myIconMaxSize*(myIconMaxNumber+1),myIconMaxSize/2);
				path.lineTo(myIconMaxSize*myIconMaxNumber,myIconMaxSize);
				myContext.fill(path);
			}
			aEvent.dataTransfer.setDragImage(myCanvas, 0, 0);
		},
		
		dragCards: async function (aEvent) {
			var aTargetObject = aEvent.target;
			if (aTargetObject.id == "cardsTreeChildren" || aTargetObject.id == "rightPaneUpHbox1") {
				var myTarget = cardbookRepository.currentAccountId;
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				var cell = myTree.getCellAt(aEvent.clientX, aEvent.clientY);
				var myTarget = myTree.view.getCellText(cell.row, myTree.columns.getNamedColumn('accountId'));
				// outside the address books
				if (myTarget == "false") {
					return;
				}
			}
			var nodeArray = cardbookRepository.cardbookUtils.escapeStringSemiColon(myTarget).split("::");
			var myDirPrefId = nodeArray[0];
			var myNodeType = nodeArray[1];
			var myNodeName = nodeArray[nodeArray.length-1];
			nodeArray.shift();
			nodeArray.shift();
			var orgNode = cardbookRepository.cardbookUtils.unescapeStringSemiColon(nodeArray.join(";"));

			var myDirPrefIdVCardVersion = cardbookRepository.cardbookPreferences.getVCardVersion(myDirPrefId);
			var myDirPrefIdDateFormat = cardbookRepository.getDateFormat(myDirPrefId, myDirPrefIdVCardVersion);
			var choice = cardbookRepository.importConflictChoiceImportValues.join("::");
			if (!cardbookRepository.importConflictChoice[myDirPrefId]) {
				cardbookRepository.importConflictChoice[myDirPrefId] = {};
				cardbookRepository.importConflictChoicePersist[myDirPrefId] = {};
			}
			cardbookRepository.importConflictChoice[myDirPrefId][choice] = "update";
			cardbookRepository.importConflictChoicePersist[myDirPrefId][choice] = false;
			aEvent.preventDefault();
			let myTopic = "cardsDragged";
			let length = 0;
			for (var i = 0; i < aEvent.dataTransfer.mozItemCount; i++) {
				var types = aEvent.dataTransfer.mozTypesAt(i);
				for (var j = 0; j < types.length; j++) {
					if (types[j] == "text/x-moz-cardbook-id") {
						length++
					}
				}
			}
			let myActionId = cardbookActions.startAction(myTopic, null, null, length);
			wdw_cardbook.bulkOperation(myActionId);
			for (var i = 0; i < aEvent.dataTransfer.mozItemCount; i++) {
				var types = aEvent.dataTransfer.mozTypesAt(i);
				for (var j = 0; j < types.length; j++) {
					if (types[j] == "text/x-moz-cardbook-id") {
						var myId = aEvent.dataTransfer.mozGetDataAt("text/x-moz-cardbook-id", i);
						var myCard = cardbookRepository.cardbookCards[myId];
						if (myDirPrefId == myCard.dirPrefId) {
							if (myNodeType == "categories" && myCard.categories.includes(myNodeName)) {
								continue;
							} else if (myNodeType == "org" && orgNode == myCard.org) {
								continue;
							} else if (!cardbookRepository.possibleNodes.includes(myNodeType)) {
								continue;
							} else {
								cardbookRepository.importConflictChoicePersist[myDirPrefId][choice] = true;
							}
						}
						var mySourceDateFormat = cardbookRepository.getDateFormat(myCard.dirPrefId, myCard.version);
						// Services.tm.currentThread.dispatch({ run: async function() {
						await cardbookRepository.cardbookSynchronization.importCard(myCard, myTarget, myDirPrefIdVCardVersion, mySourceDateFormat, myDirPrefIdDateFormat,
															myActionId);
						if (myDirPrefId != myCard.dirPrefId &&
							cardbookRepository.importConflictChoice[myDirPrefId] &&
							cardbookRepository.importConflictChoice[myDirPrefId][choice] &&
							cardbookRepository.importConflictChoice[myDirPrefId][choice] != "cancel") {
							if (!aEvent.ctrlKey) {
								cardbookRepository.currentAction[myActionId].totalCards++;
								cardbookRepository.asyncDeleteCards([myCard], myActionId);
							}
						}
						// }}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
					} else if (types[j] == "application/x-moz-file") {
						var myFile1 = aEvent.dataTransfer.mozGetDataAt("application/x-moz-file", i);
						var myFile = myFile1.QueryInterface(Components.interfaces.nsIFile);
						if (cardbookRepository.cardbookUtils.getFileExtension(myFile.path).toLowerCase() == "vcf" ) {
							var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(myTarget);
							// we presume we've got one contact per file
							cardbookRepository.cardbookServerCardSyncTotal[myDirPrefId]++;
							cardbookRepository.cardbookSynchronization.loadFile(myFile, myDirPrefId, myTarget, "IMPORTFILE", myActionId);
						}
					}
				}
			}
			cardbookActions.endAsyncAction(myActionId);
			aEvent.stopPropagation();
		},

		editComplexSearch: function () {
			wdw_cardbook.addAddressbook("search");
		},

		searchRemote: function () {
			try {
				var myValue = document.getElementById('searchRemoteTextbox').value;
				if (myValue == "") {
					return;
				}
				var myTree = document.getElementById('accountsOrCatsTree');
				var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				if (cardbookRepository.cardbookUtils.isMyAccountSyncing(myPrefId)) {
					return;
				}
				cardbookRepository.cardbookPreferences.setLastSearch(myPrefId, myValue);
				cardbookRepository.cardbookSynchronization.searchRemote(myPrefId, myValue);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.searchRemote error : " + e, "Error");
			}
		},

		onStartSearch: function () {
			wdw_cardbook.setSearchRemoteHbox("");
			wdw_cardbook.setSearchMode();
			wdw_cardbook.clearAccountOrCat();
			wdw_cardbook.clearCard();
			wdw_cardbook.startSearch();
		},

		startSearch: async function (aListOfCards) {
			var listOfSelectedCard = [];
			if (!(aListOfCards)) {
				listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			} else {
				listOfSelectedCard = aListOfCards;
			}

			cardbookRepository.cardbookSearchValue = cardbookRepository.makeSearchString(document.getElementById('cardbookSearchInput').value);

			var myRegexp = new RegExp(cardbookRepository.cardbookSearchValue.replace("*", "(.*)"), "i");
			cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue] = {modified: 0, cards: []};
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && account[5] && account[6] != "SEARCH") {
					var myDirPrefId = account[4];
					for (var j in cardbookRepository.cardbookCardLongSearch[myDirPrefId]) {
						if (cardbookRepository.cardbookSearchValue == "" || j.search(myRegexp) != -1) {
							for (let card of cardbookRepository.cardbookCardLongSearch[myDirPrefId][j]) {
								cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue].cards.push(card);
								cardbookRepository.addCardToDisplayModified(card, cardbookRepository.cardbookSearchValue);
							}
						}
					}
				}
			}
			// need to verify that the selected cards are always found
			var myListOfSelectedCards = [];
			for (var i = 0; i < listOfSelectedCard.length; i++) {
				// selected cards may have been deleted
				if (cardbookRepository.cardbookCards[listOfSelectedCard[i].cbid]) {
					var myCard = listOfSelectedCard[i];
					if (cardbookRepository.getLongSearchString(myCard).indexOf(cardbookRepository.cardbookSearchValue) >= 0) {
						myListOfSelectedCards.push(myCard);
					}
				}
			}
			await wdw_cardbook.displaySearch(myListOfSelectedCards);
		},

		displayBirthdayList: function() {
			if (cardbookRepository.cardbookBirthdayPopup == 0) {
				cardbookRepository.cardbookBirthdayPopup++;
				var MyWindows = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/birthdays/wdw_birthdayList.xhtml", "", cardbookRepository.modalWindowParams);
				cardbookRepository.cardbookBirthdayPopup--;
			}
		},
	
		displaySyncList: function() {
			var MyWindows = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/birthdays/wdw_birthdaySync.xhtml", "", cardbookRepository.modalWindowParams);
		},

		setSyncControl: function () {
			if (wdw_cardbook.nIntervId == 0) {
				wdw_cardbook.nIntervId = setInterval(() => {
                    wdw_cardbook.windowControlShowing();
                }, 1000);
			}
		},

		setComplexSearchMode: function (aDirPrefId) {
			wdw_cardbook.setNoSearchMode();
			cardbookRepository.cardbookComplexSearchMode = "SEARCH";
			cardbookRepository.cardbookComplexSearchPrefId = aDirPrefId;
		},

		setSearchMode: function () {
			// for the navigation
			document.getElementById('cardbookSearchInput').setAttribute('tabindex', '1');
			document.getElementById('cardsTree').setAttribute('tabindex', '2');
			wdw_cardbook.setNoComplexSearchMode();
			cardbookRepository.currentAccountId = "";
			cardbookRepository.cardbookSearchMode = "SEARCH";
		},

		setNoComplexSearchMode: function () {
			cardbookRepository.cardbookComplexSearchMode = "NOSEARCH";
			cardbookRepository.cardbookComplexSearchPrefId = "";
		},

		setNoSearchMode: function () {
			// in search mode the next field after the search textbox is cardsTree
			if (document.getElementById('cardbookSearchInput')) {
				document.getElementById('cardbookSearchInput').removeAttribute('tabindex');
			}
			document.getElementById('cardsTree').removeAttribute('tabindex');
			cardbookRepository.cardbookSearchMode = "NOSEARCH";
			cardbookRepository.cardbookSearchValue = "";
			if (document.getElementById('cardbookSearchInput')) {
				document.getElementById('cardbookSearchInput').value = "";
				document.getElementById('cardbookSearchInput').placeholder = cardbookRepository.extension.localeData.localizeMessage("cardbookSearchInputDefault");
			}
		},

		addAddressbook: function (aAction, aDirPrefId) {
			var myArgs = {action: aAction, dirPrefId: aDirPrefId, rootWindow: window};
			var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/addressbooksconfiguration/wdw_addressbooksAdd.xhtml", "", cardbookRepository.windowParams, myArgs);
		},
		
		editAddressbook: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				var myPrefIdType = cardbookRepository.cardbookPreferences.getType(myPrefId);
				if (myPrefIdType === "SEARCH") {
					wdw_cardbook.addAddressbook("search", myPrefId);
				} else {
					if (cardbookRepository.cardbookUtils.isMyAccountSyncing(myPrefId)) {
						return;
					}
					cardbookRepository.cardbookSynchronization.initMultipleOperations(myPrefId);
					var myArgs = {dirPrefId: myPrefId, serverCallback: wdw_cardbook.modifyAddressbook};
					var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/addressbooksconfiguration/wdw_addressbooksEdit.xhtml", "",
													   cardbookRepository.colorPickableDialogParams, myArgs);
				}
			}
		},

		modifyAddressbook: function (aChoice, aDirPrefId, aName, aReadOnly, aEnabled) {
			cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
			if (aChoice == "SAVE") {
				wdw_cardbook.loadCssRules();
				var changed = false;
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[4] === aDirPrefId) {
						if (aName != account[0]) {
							cardbookRepository.cardbookPreferences.setName(aDirPrefId, aName);
							account[0] = aName;
							changed = true;
						}
						if (aReadOnly != account[7]) {
							cardbookRepository.cardbookPreferences.setReadOnly(aDirPrefId, aReadOnly);
							account[7] = aReadOnly;
							changed = true;
						}
						if (aEnabled != account[5]) {
							account[5] = aEnabled;
							wdw_cardbook.enableOrDisableAddressbook(aDirPrefId, aEnabled);
							changed = true;
						}
						if (changed) {
							cardbookRepository.cardbookUtils.sortMultipleArrayByString(cardbookRepository.cardbookAccounts,0,1);
							cardbookRepository.cardbookUtils.formatStringForOutput("addressbookModified", [aName]);
							cardbookActions.addActivity("addressbookModified", [aName], "editItem");
							cardbookRepository.cardbookUtils.notifyObservers("addressbookModified", aDirPrefId);
						}
						break;
					}
				}
			}
		},

		modifySearchAddressbook: function (aDirPrefId, aName, aColor, aVCard, aReadOnly, aUrnuuid, aSearch) {
			cardbookRepository.cardbookPreferences.setName(aDirPrefId, aName);
			cardbookRepository.cardbookPreferences.setColor(aDirPrefId, aColor);
			cardbookRepository.cardbookPreferences.setVCardVersion(aDirPrefId, aVCard);
			cardbookRepository.cardbookPreferences.setReadOnly(aDirPrefId, aReadOnly);
			cardbookRepository.cardbookPreferences.setUrnuuid(aDirPrefId, aUrnuuid);
			wdw_cardbook.loadCssRules();
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[4] === aDirPrefId) {
					account[0] = aName;
					account[7] = aReadOnly;
					break;
				}
			}
			aSearch.dirPrefId = aDirPrefId;
			cardbookRepository.addSearch(aSearch);
			cardbookRepository.cardbookUtils.formatStringForOutput("addressbookModified", [aName]);
			cardbookActions.addActivity("addressbookModified", [aName], "editItem");
			cardbookRepository.cardbookUtils.notifyObservers("addressbookModified", aDirPrefId);

			cardbookRepository.emptyComplexSearchFromRepository(aDirPrefId);
			cardbookRepository.cardbookSynchronization.loadComplexSearchAccount(aDirPrefId, aSearch);
		},

		removeAddressbook: function () {
			try {
				if (cardbookDirTree.visibleData.length != 0) {
					var myTree = document.getElementById('accountsOrCatsTree');
					if (myTree.currentIndex != -1) {
						var myParentAccountId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
						var myParentAccountName = cardbookRepository.cardbookPreferences.getName(myParentAccountId);
						var myParentAccountType = cardbookRepository.cardbookPreferences.getType(myParentAccountId);
						if (cardbookRepository.cardbookUtils.isMyAccountSyncing(myParentAccountId)) {
							return;
						}
						cardbookRepository.cardbookSynchronization.initMultipleOperations(myParentAccountId);
						var myPrefUrl = cardbookRepository.cardbookPreferences.getUrl(myParentAccountId);
						
						var confirmTitle = cardbookRepository.extension.localeData.localizeMessage("confirmTitle");
						var confirmMsg = cardbookRepository.extension.localeData.localizeMessage("accountDeletionConfirmMessage", [myParentAccountName]);
						var returnFlag = false;
						var deleteContentFlag = {value: false};
						
						if (myParentAccountType === "FILE") {
							var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
							myFile.initWithPath(myPrefUrl);
							var deleteContentMsg = cardbookRepository.extension.localeData.localizeMessage("accountDeletiondeleteContentFileMessage", [myFile.leafName]);
							returnFlag = Services.prompt.confirmCheck(window, confirmTitle, confirmMsg, deleteContentMsg, deleteContentFlag);
						} else if (myParentAccountType === "DIRECTORY") {
							var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
							myFile.initWithPath(myPrefUrl);
							var deleteContentMsg = cardbookRepository.extension.localeData.localizeMessage("accountDeletiondeleteContentDirMessage", [myFile.leafName]);
							returnFlag = Services.prompt.confirmCheck(window, confirmTitle, confirmMsg, deleteContentMsg, deleteContentFlag);
						} else {
							returnFlag = Services.prompt.confirm(window, confirmTitle, confirmMsg);
						}
						if (returnFlag) {
							wdw_cardbook.setNoComplexSearchMode();
							wdw_cardbook.setNoSearchMode();
							if (myParentAccountType !== "SEARCH") {
								cardbookRepository.cardbookSynchronization.removePeriodicSync(myParentAccountId, myParentAccountName);
								cardbookRepository.removeAccountFromComplexSearch(myParentAccountId);
								cardbookRepository.removeAccountFromRepository(myParentAccountId);
							} else {
								cardbookRepository.removeComplexSearchFromRepository(myParentAccountId);
								cardbookRepository.removeSearch(myParentAccountId);
							}
							// cannot be launched from cardbookRepository
							cardbookIndexedDB.removeAccount(myParentAccountId, myParentAccountName);
							cardbookRepository.cardbookPreferences.delAccount(myParentAccountId);
							wdw_cardbook.loadCssRules();
							cardbookRepository.cardbookUtils.formatStringForOutput("addressbookDeleted", [myParentAccountName]);
							cardbookActions.addActivity("addressbookDeleted", [myParentAccountName], "deleteMail");
							cardbookRepository.cardbookUtils.notifyObservers("addressbookDeleted");
							if (myFile && deleteContentFlag.value) {
								cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : deleting : " + myFile.path);
								myFile.remove(true);
							}
						}
					}
					cardbookRepository.cardbookSynchronization.finishMultipleOperations(myParentAccountId);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.removeAddressbook error : " + e, "Error");
			}
		},

		enableOrDisableAddressbook: function (aDirPrefId, aValue) {
			if (!aDirPrefId) {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					aDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
					var aValue = !cardbookRepository.cardbookPreferences.getEnabled(aDirPrefId);
				} else {
					return;
				}
			}
			if (cardbookRepository.cardbookUtils.isMyAccountSyncing(aDirPrefId)) {
				return;
			}
			wdw_cardbook.setNoComplexSearchMode();
			wdw_cardbook.setNoSearchMode();
			cardbookRepository.enableOrDisableAccountFromCollected(aDirPrefId, aValue);
			cardbookRepository.enableOrDisableAccountFromRestrictions(aDirPrefId, aValue);
			cardbookRepository.enableOrDisableAccountFromBirthday(aDirPrefId, aValue);
			cardbookRepository.enableOrDisableAccountFromVCards(aDirPrefId, aValue);
			if (!aValue) {
				cardbookRepository.removeAccountFromDiscovery(aDirPrefId);
			}
			var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aDirPrefId);
			var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
			cardbookRepository.cardbookPreferences.setEnabled(aDirPrefId, aValue);
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[4] === aDirPrefId) {
					account[5] = aValue;
					break;
				}
			}
			wdw_cardbook.clearCard();
			wdw_cardbook.clearAccountOrCat();
			wdw_cardbook.setNoSearchMode();
			wdw_cardbook.loadCssRules();
			cardbookRepository.cardbookSynchronization.setPeriodicSyncs(aDirPrefId);
			if (aValue) {
				if (myDirPrefIdType == "SEARCH") {
					cardbookRepository.cardbookSynchronization.loadComplexSearchAccount(aDirPrefId);
				} else {
					cardbookRepository.cardbookSynchronization.loadAccount(aDirPrefId, true, false);
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("addressbookEnabled", [myDirPrefIdName]);
				cardbookActions.addActivity("addressbookEnabled", [myDirPrefIdName], "editItem");
			} else {
				cardbookRepository.cardbookSynchronization.initMultipleOperations(aDirPrefId);
				if (myDirPrefIdType != "SEARCH") {
					cardbookRepository.removeAccountFromComplexSearch(aDirPrefId);
					cardbookRepository.emptyAccountFromRepository(aDirPrefId);
				} else {
					cardbookRepository.emptyComplexSearchFromRepository(aDirPrefId);
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("addressbookDisabled", [myDirPrefIdName]);
				cardbookActions.addActivity("addressbookDisabled", [myDirPrefIdName], "editItem");
				cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
			}
			cardbookRepository.cardbookUtils.notifyObservers("addressbookModified", aDirPrefId);
		},

		readOnlyOrReadWriteAddressbook: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);
				var myValue = !cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId);
			} else {
				return;
			}
			if (cardbookRepository.cardbookUtils.isMyAccountSyncing(myDirPrefId)) {
				return;
			}
			cardbookRepository.cardbookSynchronization.initMultipleOperations(myDirPrefId);
			if (myValue) {
				cardbookRepository.removeAccountFromCollected(myDirPrefId);
			}
			cardbookRepository.cardbookPreferences.setReadOnly(myDirPrefId, myValue);
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[4] === myDirPrefId) {
					account[7] = myValue;
					break;
				}
			}
			wdw_cardbook.loadCssRules();
			if (myValue) {
				cardbookRepository.cardbookUtils.formatStringForOutput("addressbookReadOnly", [myDirPrefIdName]);
				cardbookActions.addActivity("addressbookReadOnly", [myDirPrefIdName], "editItem");
			} else {
				cardbookRepository.cardbookUtils.formatStringForOutput("addressbookReadWrite", [myDirPrefIdName]);
				cardbookActions.addActivity("addressbookReadWrite", [myDirPrefIdName], "editItem");
			}
			cardbookRepository.cardbookUtils.notifyObservers("addressbookModified", myDirPrefId);
			cardbookRepository.cardbookSynchronization.finishMultipleOperations(myDirPrefId);
		},

		expandOrContractAddressbook: function (aDirPrefId, aValue) {
			cardbookRepository.cardbookPreferences.setExpanded(aDirPrefId, aValue);
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[4] == aDirPrefId) {
					account[2] = aValue;
				}
			}
		},

		returnKey: function () {
			if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
				wdw_cardbook.chooseActionCardsTree();
			} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					if (myTree.view.isContainer(myTree.currentIndex)) {
						wdw_cardbook.editAddressbook();
					} else {
						var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
						var myNodeName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName'));
						var myNodeId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
						var myNodeType = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountType'));
						wdw_cardbook.renameNode(myDirPrefId, myNodeId, myNodeName, myNodeType, true);
					}
				}
			}
		},

		newKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				if (!cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId) && cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId)) {
					wdw_cardbook.createContact();
				}
			}
		},

		deleteKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				var myNodeId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
				var myNodeName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName'));
				var myNodeType = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountType'));
				if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
					if (cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId)) {
						if (!cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId)) {
							wdw_cardbook.deleteCardsAndValidate();
						}
					}
				} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
					if (myTree.view.isContainer(myTree.currentIndex)) {
						wdw_cardbook.removeAddressbook();
					} else {
						wdw_cardbook.removeNode(myDirPrefId, myNodeId, myNodeName, myNodeType, true);
					}
				}
			}
		},

		selectAllKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myCardsTree = document.getElementById('cardsTree');
				myCardsTree.view.selection.selectAll();
			}
		},

		F9Key: function () {
			if (document.getElementById('cardbook-menupopup')) {
				document.getElementById('cardbook-menupopup').openPopup(document.getElementById('cardbook-menupopup'), "after_start", 0, 0, false, false);
			}
		},

		copyKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
					wdw_cardbook.copyCardsFromCards();
				} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
					wdw_cardbook.copyCardsFromAccountsOrCats();
				}
			}
		},

		pasteKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				wdw_cardbook.pasteCards();
			}
		},

		cutKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
					wdw_cardbook.cutCardsFromCards();
				} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
					wdw_cardbook.cutCardsFromAccountsOrCats();
				}
			}
		},

		findKey: async function () {
			if (document.getElementById('cardbookSearchInput')) {
				document.getElementById('cardbookSearchInput').focus();
				await wdw_cardbook.startSearch();
			}
		},

		doubleClickAccountOrCat: function (aEvent) {
			var myTree = document.getElementById('accountsOrCatsTree');
			var cell = myTree.getCellAt(aEvent.clientX, aEvent.clientY);
			var myTarget = myTree.view.getCellText(cell.row, myTree.columns.getNamedColumn('accountId'));
			var myDirPrefId = myTree.view.getCellText(cell.row, myTree.columns.getNamedColumn('accountRoot'));
			if (myTarget == "false") {
				wdw_cardbook.addAddressbook();
			} else if (myTarget == myDirPrefId) {
				wdw_cardbook.editAddressbook();
			} else {
				wdw_cardbook.selectNodeToAction('EDIT');
			}
		},

		loadCssRules: function () {
			var myStyleSheet = "chrome://cardbook/content/skin/cardbookEmpty.css";
			var myStyleSheetRuleName = "cardbookEmpty";
			for (let styleSheet of InspectorUtils.getAllStyleSheets(window.document, false)) {
				for (let rule of styleSheet.cssRules) {
					// difficult to find as the sheet as no href 
					if (rule.cssText.includes(myStyleSheetRuleName)) {
						cardbookRepository.deleteCssAllRules(styleSheet);
						cardbookRepository.createMarkerRule(styleSheet, myStyleSheetRuleName);
						for (let account of cardbookRepository.cardbookAccounts) {
							if (account[1]) {
								var dirPrefId = account[4];
								var color = cardbookRepository.cardbookPreferences.getColor(dirPrefId)
								cardbookRepository.createCssAccountRules(styleSheet, dirPrefId, color);
								if (account[5]) {
									cardbookRepository.createCssCardRules(styleSheet, dirPrefId, color);
								}
							}
						}
						for (let category in cardbookRepository.cardbookNodeColors) {
							var color = cardbookRepository.cardbookNodeColors[category];
							var categoryCleanName = cardbookRepository.cardbookUtils.formatCategoryForCss(category);
							cardbookRepository.createCssAccountRules(styleSheet, 'category_' + categoryCleanName, color);
							cardbookRepository.createCssCategoryRules(styleSheet, 'category_' + categoryCleanName, color);
							cardbookRepository.createCssCardRules(styleSheet, 'category_' + categoryCleanName, color);
						}
						cardbookRepository.reloadCss(myStyleSheet);
						return;
					}
				}
			}
		},

		addCategory: function () {
			var selectedId = cardbookWindowUtils.getSelectedCardsId();
			if (selectedId.length != 0) {
				var myFirstCard = cardbookRepository.cardbookCards[selectedId[0]];
				var myValidationList = JSON.parse(JSON.stringify(cardbookRepository.cardbookAccountsCategories[myFirstCard.dirPrefId]));
				var onSaved = () => {
					if (myArgs.typeAction == "SAVE" && myArgs.type != "") {
						if (myArgs.color) {
							cardbookRepository.cardbookNodeColors[myArgs.type] = myArgs.color;
							cardbookRepository.saveNodeColors();
						}
						let value = parseInt(myArgs.mailpop) || 0;
						cardbookIDBMailPop.updateMailPop(myArgs.type, value);
						wdw_cardbook.addCategoryToSelectedCards(myArgs.type, true);
					}
				};
				var myArgs = {type: "", context: "CreateCat", typeAction: "", validationList: myValidationList, color: "",  mailpop: "", onSaved};
				var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xhtml", "", cardbookRepository.colorPickableModalDialogParams, myArgs);
			}
		},

		addCategoryToSelectedCards: async function (aCategory, aCategorySelect) {
			let selectedId = cardbookWindowUtils.getSelectedCardsId();
			let myTopic = "categorySelected";
			if (aCategorySelect) { 
				myTopic = "categoryCreated";
			}
			let length = 0;
			for (let id of selectedId) {
				if (cardbookRepository.cardbookCards[id]) {
					let myCard = cardbookRepository.cardbookCards[id];
					if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					length++
				}
			}
			let myActionId = cardbookActions.startAction(myTopic, [aCategory], null, length);
			wdw_cardbook.bulkOperation(myActionId);
			for (let id of selectedId) {
				if (cardbookRepository.cardbookCards[id]) {
					let myCard = cardbookRepository.cardbookCards[id];
					if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					let myOutCard = new cardbookCardParser();
					cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
					cardbookRepository.addCategoryToCard(myOutCard, aCategory);
					await cardbookRepository.saveCardFromUpdate(myCard, myOutCard, myActionId, false);
				}
			}
			await cardbookActions.endAction(myActionId);
			wdw_cardbook.loadCssRules();
		},

		removeCategoryFromSelectedCards: async function (aCategoryName) {
			let selectedId = cardbookWindowUtils.getSelectedCardsId();
			let myTopic = "categoryUnselected";
			let length = 0;
			for (let id of selectedId) {
				if (cardbookRepository.cardbookCards[id]) {
					let myCard = cardbookRepository.cardbookCards[id];
					if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					length++
				}
			}
			let myActionId = cardbookActions.startAction(myTopic, [aCategoryName], null, length);
			wdw_cardbook.bulkOperation(myActionId);
			for (let id of selectedId) {
				if (cardbookRepository.cardbookCards[id]) {
					let myCard = cardbookRepository.cardbookCards[id];
					if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					let myOutCard = new cardbookCardParser();
					cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
					cardbookRepository.removeCategoryFromCard(myOutCard, aCategoryName);
					await cardbookRepository.saveCardFromUpdate(myCard, myOutCard, myActionId, true);
				}
			}
			await cardbookActions.endAction(myActionId);
		},

		renameNode: function (aDirPrefId, aNodeId, aNodeName, aNodeType, aNodeSelect) {
			try {
				if (cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId)) {
					return;
				}
				if (aNodeType == "categories") {
					var myValidationList = Array.from(cardbookRepository.cardbookAccountsCategories[aDirPrefId]).filter(child => child != aNodeName);
					var myContext = "EditCat";
				} else {
					var myParentList = cardbookRepository.cardbookAccountsNodes[aDirPrefId].filter(child => cardbookRepository.getParentOrg(child.id) == cardbookRepository.getParentOrg(aNodeId));
					var myValidationList = myParentList.map(child => child.data).filter(child => child != aNodeName);
					var myContext = "EditNode";
				}
				var onSaved = async () => {
					var uncategorized = (aNodeName == cardbookRepository.cardbookUncategorizedCards) ? true : false;
					var nameChanged = myArgs.type != aNodeName;
					var colorChanged = myArgs.color != myArgs.oldColor;
					if (myArgs.typeAction != "SAVE" || myArgs.type == "" || (!nameChanged && !colorChanged)) {
						return;
					}

					var myTopic = aNodeType != "categories" ? "nodeRenamed" : "categoryRenamed";
					var myNewNodeName = myArgs.type;
					var myActionId = cardbookActions.startAction(myTopic, [aNodeName], aDirPrefId + "::" + aNodeType + "::" + myNewNodeName);
					wdw_cardbook.bulkOperation(myActionId);
					if (nameChanged) {
						var myCards = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[aNodeId].cards));
						var allDirPrefIds = Array.from(myCards, item => item.dirPrefId);
						// aDirPrefId might be a complex search
						allDirPrefIds.push(aDirPrefId);
						allDirPrefIds = cardbookRepository.arrayUnique(allDirPrefIds);
						if (aNodeType == "categories" && !uncategorized) {
							function saveCat(aDirPrefId1) {
								var oldCat = cardbookRepository.cardbookCategories[aDirPrefId1+"::"+aNodeName];
								var newCat = new cardbookCategoryParser();
								cardbookRepository.cardbookUtils.cloneCategory(oldCat, newCat);
								newCat.cbid = aDirPrefId+"::"+myNewNodeName;
								newCat.name = myNewNodeName;
								if (newCat.uid == aNodeName) {
									newCat.uid = myNewNodeName;
								}
								cardbookRepository.saveCategory(oldCat, newCat, myActionId);
							}
							if (allDirPrefIds.length) {
								for (let dirPrefId of allDirPrefIds) {
									saveCat(dirPrefId);
								}
							} else {
								saveCat(aDirPrefId);
							}
						}
						if (uncategorized) {
							cardbookRepository.renameUncategorized(aNodeName, myNewNodeName);
							cardbookRepository.cardbookUtils.notifyObservers(myTopic, "forceAccount::" + aDirPrefId + "::" + aNodeType + "::" + myNewNodeName);
						} else {
							var length = myCards.length;
							for (var i = 0; i < length; i++) {
								var myCard = myCards[i];
								// as it is possible to rename a category from a virtual folder
								// should avoid to modify cards belonging to a read-only address book
								if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
									continue;
								}
								var myOutCard = new cardbookCardParser();
								cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
								if (aNodeType == "categories") {
									cardbookRepository.renameCategoryFromCard(myOutCard, aNodeName, myNewNodeName);
								} else if (aNodeType == "org") {
									cardbookRepository.renameOrgFromCard(myOutCard, aNodeId, myNewNodeName);
								}
								await cardbookRepository.saveCardFromUpdate(myCard, myOutCard, myActionId, false);
							}
						}
						if (aNodeName in cardbookRepository.cardbookNodeColors) {
							cardbookRepository.cardbookNodeColors[myNewNodeName] = cardbookRepository.cardbookNodeColors[aNodeName];
							delete cardbookRepository.cardbookNodeColors[aNodeName];
							cardbookRepository.saveNodeColors();
							wdw_cardbook.loadCssRules();
						}
					}
					if (colorChanged) {
						if (nameChanged) {
							delete cardbookRepository.cardbookNodeColors[aNodeName];
						}
						if (myArgs.color) {
							cardbookRepository.cardbookNodeColors[myArgs.type] = myArgs.color;
						} else {
							delete cardbookRepository.cardbookNodeColors[myArgs.type];
						}
						cardbookRepository.saveNodeColors();
						wdw_cardbook.loadCssRules();
					}
					if (nameChanged) {
						cardbookIDBMailPop.updateMailPop(aNodeName, "0");
					}
					let value = parseInt(myArgs.mailpop) || "0";
					cardbookIDBMailPop.updateMailPop(myArgs.type, value);
					if (nameChanged && !uncategorized) {
						await cardbookActions.endAction(myActionId, true);
					}
				};
				var myArgs = {type: aNodeName, id: aNodeId, context: myContext, typeAction: "", validationList: myValidationList, mailpop: "",
								color: cardbookRepository.cardbookNodeColors[aNodeName], oldColor: cardbookRepository.cardbookNodeColors[aNodeName],
								onSaved};
				var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xhtml", "", cardbookRepository.colorPickableModalDialogParams, myArgs);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.renameNode error : " + e, "Error");
			}
		},

		removeNode: async function (aDirPrefId, aNodeId, aNodeName, aNodeType, aNodeSelect) {
			try {
				if ((aNodeName == cardbookRepository.cardbookUncategorizedCards) ||
					cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId)) {
					return;
				}
				var confirmTitle = cardbookRepository.extension.localeData.localizeMessage("confirmTitle");
				var cardsCount = cardbookRepository.cardbookDisplayCards[aNodeId].cards.length;
				let removeValidation = true;
				if (cardsCount != 0) {
					var message = aNodeType != "categories" ? "nodeDeletionsConfirmMessagePF" : "catDeletionsConfirmMessagePF";
					var confirmMsg = PluralForm.get(cardsCount, cardbookRepository.extension.localeData.localizeMessage(message, [cardsCount, aNodeName]));
					removeValidation = Services.prompt.confirm(window, confirmTitle, confirmMsg);
				}
				if (removeValidation) {
					var myTopic = aNodeType != "categories" ? "nodeDeleted" : "categoryDeleted";
					var myActionId = cardbookActions.startAction(myTopic, [aNodeName], aDirPrefId);
					wdw_cardbook.bulkOperation(myActionId);
					
					var myCards = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[aNodeId].cards));
					var allDirPrefIds = cardbookRepository.arrayUnique(Array.from(myCards, item => item.dirPrefId));
					var length = myCards.length;
					for (var i = 0; i < length; i++) {
						var myCard = myCards[i];
						// as it is possible to remove a category from a virtual folder
						// should avoid to modify cards belonging to a read-only address book
						if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
							continue;
						}
						var myOutCard = new cardbookCardParser();
						cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
						if (aNodeType == "categories") {
							cardbookRepository.removeCategoryFromCard(myOutCard, aNodeName);
						} else if (aNodeType == "org") {
							cardbookRepository.removeOrgFromCard(myOutCard, aNodeId);
						}
						await cardbookRepository.saveCardFromUpdate(myCard, myOutCard, myActionId, false);
					}
					if (aNodeType == "categories") {
						function delCat(aDirPrefId1) {
							cardbookRepository.deleteCategories([cardbookRepository.cardbookCategories[aDirPrefId1+"::"+aNodeName]], myActionId);
						}
						if (allDirPrefIds.length) {
							for (let dirPrefId of allDirPrefIds) {
								if (cardbookRepository.cardbookDisplayCards[dirPrefId+"::categories::"+aNodeName].cards.length == 0) {
									delCat(dirPrefId);
								}
							}
						} else {
							delCat(aDirPrefId);
						}
					}
					await cardbookActions.endAction(myActionId, true);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.removeNode error : " + e.toSource(), "Error");
			}
		},

		createNode: function (aDirPrefId, aNodeType) {
			try {
				if (aNodeType != "categories" || cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId) ||
					cardbookRepository.cardbookPreferences.getType(aDirPrefId) == "SEARCH") {
					return;
				}
				var myValidationList = Array.from(cardbookRepository.cardbookAccountsCategories[aDirPrefId]);
				if (!myValidationList.includes(cardbookRepository.cardbookUncategorizedCards)) {
					myValidationList.push(cardbookRepository.cardbookUncategorizedCards);
				}
				var myContext = "CreateCat";
				var onSaved = async () => {
					var colorChanged = myArgs.color != myArgs.oldColor;
					if (myArgs.typeAction != "SAVE" || myArgs.type == "") {
						return;
					}
					var myTopic = "categoryCreated";
					var myNewNodeName = myArgs.type;
					var myActionId = cardbookActions.startAction(myTopic, [myNewNodeName], aDirPrefId + "::" + aNodeType + "::" + myNewNodeName);
					wdw_cardbook.bulkOperation(myActionId);
					var newCat = new cardbookCategoryParser(myNewNodeName, aDirPrefId);
					cardbookRepository.cardbookUtils.addTagCreated(newCat);
					cardbookRepository.saveCategory({}, newCat, myActionId);
					if (colorChanged) {
						cardbookRepository.cardbookNodeColors[myArgs.type] = myArgs.color;
						cardbookRepository.saveNodeColors();
						wdw_cardbook.loadCssRules();
					}
					let value = parseInt(myArgs.mailpop) || 0;
					cardbookIDBMailPop.updateMailPop(myArgs.type, value);
					await cardbookActions.endAction(myActionId, true);
				};
				var myArgs = {type: "", id: "", context: myContext, typeAction: "", validationList: myValidationList, color: "", oldColor: "", mailpop: "", onSaved};
				var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xhtml", "", cardbookRepository.colorPickableModalDialogParams, myArgs);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.createNode error : " + e, "Error");
			}
		},

		selectNodeToAction: function (aAction) {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				var myNodeType = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountType'));

				if (aAction == "CREATE") {
					myNodeType = cardbookRepository.cardbookPreferences.getNode(myDirPrefId);
					if (myNodeType != "categories") {
						return;
					}
					wdw_cardbook.createNode(myDirPrefId, myNodeType);
				} else if (!cardbookRepository.possibleNodes.includes(myNodeType)) {
					return;
				} else {
					var myNodeName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName'));
					var myNodeId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
					if (aAction == "REMOVE") {
						wdw_cardbook.removeNode(myDirPrefId, myNodeId, myNodeName, myNodeType, true);
					} else if (aAction == "CONVERT") {
						if (myNodeType == "org") {
							wdw_cardbook.createListFromNode(myDirPrefId, myNodeId, myNodeName, myNodeType);
						} else {
							wdw_cardbook.convertNodeToList(myDirPrefId, myNodeId, myNodeName, myNodeType);
						}
					} else if (aAction == "EDIT") {
						wdw_cardbook.renameNode(myDirPrefId, myNodeId, myNodeName, myNodeType, true);
					}
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.selectNodeToAction error : " + e, "Error");
			}
		},

		createListFromNode: async function (aDirPrefId, aNodeId, aNodeName, aNodeType, aNodeSelect) {
			try {
				if ((aNodeName == cardbookRepository.cardbookUncategorizedCards) ||
					cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId)) {
					return;
				}
				var myDirPrefIds = {};
				var listOfUids = [];
				var myTopic = "listCreatedFromNode";
				var myActionId = cardbookActions.startAction(myTopic, [aNodeName]);
				wdw_cardbook.bulkOperation(myActionId);
				for (let card of cardbookRepository.cardbookDisplayCards[aNodeId].cards) {
					if (!myDirPrefIds[aDirPrefId]) {
						var myNewList = new cardbookCardParser();
						myNewList.dirPrefId = aDirPrefId;
						cardbookRepository.cardbookUtils.setCardUUID(myNewList);
						myNewList.version = cardbookRepository.cardbookPreferences.getVCardVersion(aDirPrefId);
						myNewList.fn = aNodeName;
						cardbookRepository.addOrgToCard(myNewList, aNodeId);
						myDirPrefIds[aDirPrefId] = {};
						myDirPrefIds[aDirPrefId].list = myNewList;
						myDirPrefIds[aDirPrefId].members = [];
					}
					if (card.isAList) {
						listOfUids = cardbookRepository.cardbookUtils.getUidsFromList(card);
						for (let uid of listOfUids) {
							myDirPrefIds[aDirPrefId].members.push("urn:uuid:" + uid);
						}
					} else {
						myDirPrefIds[aDirPrefId].members.push("urn:uuid:" + card.uid);
					}
				}

				for (var i in myDirPrefIds) {
					cardbookRepository.cardbookUtils.addMemberstoCard(myDirPrefIds[i].list, myDirPrefIds[i].members, "group");
					await cardbookRepository.saveCardFromUpdate({}, myDirPrefIds[i].list, myActionId, true);
				}
				await cardbookActions.endAction(myActionId);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.createListFromNode error : " + e, "Error");
			}
		},

		convertNodeToList: async function (aDirPrefId, aNodeId, aNodeName, aNodeType, aNodeSelect) {
			try {
				if ((aNodeName == cardbookRepository.cardbookUncategorizedCards) ||
					cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId)) {
					return;
				}
				var myCards = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[aNodeId].cards));
				var myDirPrefIds = {};
				var myTopic = aNodeType != "categories" ? "listCreatedFromNode" : "categoryConvertedToList";
				var myActionId = cardbookActions.startAction(myTopic, [aNodeName]);
				wdw_cardbook.bulkOperation(myActionId);
				for (var i = 0; i < myCards.length; i++) {
					var myCard = myCards[i];
					// as it is possible to remove a category from a virtual folder
					// should avoid to modify cards belonging to a read-only address book
					if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					if (!myDirPrefIds[myCard.dirPrefId]) {
						var myNewList = new cardbookCardParser();
						myNewList.dirPrefId = myCard.dirPrefId;
						cardbookRepository.cardbookUtils.setCardUUID(myNewList);
						myNewList.version = cardbookRepository.cardbookPreferences.getVCardVersion(myCard.dirPrefId);
						myNewList.fn = aNodeName;
						myDirPrefIds[myCard.dirPrefId] = {};
						myDirPrefIds[myCard.dirPrefId].list = myNewList;
						myDirPrefIds[myCard.dirPrefId].members = [];
					}
					myDirPrefIds[myCard.dirPrefId].members.push("urn:uuid:" + myCard.uid);

					var myOutCard = new cardbookCardParser();
					cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
					if (aNodeType == "categories") {
						cardbookRepository.removeCategoryFromCard(myOutCard, aNodeName);
					}
					await cardbookRepository.saveCardFromUpdate(myCard, myOutCard, myActionId, true);
				}
				for (var i in myDirPrefIds) {
					cardbookRepository.cardbookUtils.addMemberstoCard(myDirPrefIds[i].list, myDirPrefIds[i].members, "group");
					await cardbookRepository.saveCardFromUpdate({}, myDirPrefIds[i].list, myActionId, true);
				}
				await cardbookActions.endAction(myActionId);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.convertNodeToList error : " + e, "Error");
			}
		},

		convertListToCategory: async function () {
			try {
				var myDirPrefId = document.getElementById('dirPrefIdTextBox').value;
				var myCard = cardbookRepository.cardbookCards[myDirPrefId+"::"+document.getElementById('uidTextBox').value];
				if (!myCard.isAList || cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId)) {
					return;
				} else {
					var myTopic = "listConvertedToCategory";
					var myActionId = cardbookActions.startAction(myTopic, [myCard.fn]);
					wdw_cardbook.bulkOperation(myActionId);
					var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);
					var myCategoryName = myCard.fn;
					if (myCard.version == "4.0") {
						for (var k = 0; k < myCard.member.length; k++) {
							var uid = myCard.member[k].replace("urn:uuid:", "");
							if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+uid]) {
								var myTargetCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+uid];
								var myOutCard = new cardbookCardParser();
								cardbookRepository.cardbookUtils.cloneCard(myTargetCard, myOutCard);
								cardbookRepository.addCategoryToCard(myOutCard, myCategoryName);
								await cardbookRepository.saveCardFromUpdate(myTargetCard, myOutCard, myActionId, true);
								cardbookRepository.cardbookUtils.formatStringForOutput("cardAddedToCategory", [myDirPrefIdName, myOutCard.fn, myCategoryName]);
							}
						}
					} else if (myCard.version == "3.0") {
						var memberCustom = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.memberCustom");
						for (var k = 0; k < myCard.others.length; k++) {
							var localDelim1 = myCard.others[k].indexOf(":",0);
							if (localDelim1 >= 0) {
								var header = myCard.others[k].substr(0,localDelim1);
								var trailer = myCard.others[k].substr(localDelim1+1,myCard.others[k].length);
								if (header == memberCustom) {
									if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+trailer.replace("urn:uuid:", "")]) {
										var myTargetCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+trailer.replace("urn:uuid:", "")];
										var myOutCard = new cardbookCardParser();
										cardbookRepository.cardbookUtils.cloneCard(myTargetCard, myOutCard);
										cardbookRepository.addCategoryToCard(myOutCard, myCategoryName);
										await cardbookRepository.saveCardFromUpdate(myTargetCard, myOutCard, myActionId, true);
										cardbookRepository.cardbookUtils.formatStringForOutput("cardAddedToCategory", [myDirPrefIdName, myOutCard.fn, myCategoryName]);
									}
								}
							}
						}
					}
					cardbookRepository.currentAction[myActionId].totalCards++;
					await cardbookRepository.deleteCards([myCard], myActionId);
					await cardbookActions.endAction(myActionId);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.convertListToCategory error : " + e, "Error");
			}
		},

		copyEntryFromTree: async function () {
			var label = cardbookRepository.extension.localeData.localizeMessage(wdw_cardbook.currentType + "Label");
			await wdw_cardbook.copyFieldValue(wdw_cardbook.currentType, label, wdw_cardbook.currentIndex, wdw_cardbook.currentValue);
		},

		copyPartialEntryFromTree: function (aPartialIndex) {
			var label = cardbookRepository.extension.localeData.localizeMessage(wdw_cardbook.currentType + "Label");
			wdw_cardbook.copyPartialFieldValue(wdw_cardbook.currentType, wdw_cardbook.currentIndex, aPartialIndex);
		},

		copyFieldValue: async function (aFieldName, aFieldLabel, aFieldIndex, aFieldValue, aFieldAllValue) {
			var card = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			var dateFormat = cardbookRepository.getDateFormat(card.dirPrefId, card.version);
			cardbookRepository.currentCopiedEntryName = aFieldName;
			cardbookRepository.currentCopiedEntryLabel = aFieldLabel;
			// events 
			if (aFieldName == "event") {
				cardbookRepository.currentCopiedEntryValue = aFieldValue;
			// multilines fields
			} else if (cardbookRepository.multilineFields.includes(aFieldName)) {
				cardbookRepository.currentCopiedEntryValue = JSON.stringify(card[aFieldName][aFieldIndex]);
			// date fields
			} else if (cardbookRepository.dateFields.includes(aFieldName)) {
				var newDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(card[aFieldName], dateFormat);
				cardbookRepository.currentCopiedEntryValue = cardbookRepository.cardbookDates.convertUTCDateToDateString(newDate, "4.0");
			// structured org
			} else if (aFieldName.startsWith("org.")) {
				cardbookRepository.currentCopiedEntryValue = aFieldAllValue.trim();
			// custom fields and org
			} else if (aFieldValue != "") {
				cardbookRepository.currentCopiedEntryValue = JSON.stringify(aFieldValue.trim());
			// others
			} else {
				cardbookRepository.currentCopiedEntryValue = JSON.stringify(card[aFieldName].trim());
			}

			var result = "";
			// addresses
			if (aFieldName == "adr") {
				result = card.fn + "\n" + await cardbookRepository.cardbookUtils.formatAddress(card[aFieldName][aFieldIndex][0]);
			// date fields
			} else if (cardbookRepository.dateFields.includes(aFieldName)) {
				result = cardbookRepository.cardbookDates.getFormattedDateForDateString(card[aFieldName], dateFormat, cardbookRepository.dateDisplayedFormat);
			// events 
			} else if (aFieldName == "event") {
				var event = aFieldValue.split("::");
				var formattedDate = cardbookRepository.cardbookDates.getFormattedDateForDateString(event[0], dateFormat, cardbookRepository.dateDisplayedFormat);
				result = formattedDate + " " + event[1];
			// others multilines fields
			} else if (cardbookRepository.multilineFields.includes(aFieldName)) {
				result = card[aFieldName][aFieldIndex][0][0];
			// custom fields and org
			} else if (aFieldValue != "") {
				result = aFieldValue.trim();
			// others
			} else {
				result = card[aFieldName].trim();
			}
			var message = cardbookRepository.extension.localeData.localizeMessage("lineCopied");
			cardbookClipboard.clipboardSetText(result, message);
		},

		copyPartialFieldValue: function (aFieldName, aFieldIndex, aPartialIndex) {
			let card = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			cardbookRepository.currentCopiedEntryName = cardbookRepository.adrElements[aPartialIndex];

			let label = cardbookRepository.extension.localeData.localizeMessage(`${cardbookRepository.adrElements[aPartialIndex]}Label`);
			cardbookRepository.currentCopiedEntryLabel = label;

			let result = card[aFieldName][aFieldIndex][0][aPartialIndex];
			cardbookRepository.currentCopiedEntryValue = result;
			let message = cardbookRepository.extension.localeData.localizeMessage("lineCopied");
			cardbookClipboard.clipboardSetText(result, message);
		},

		pasteFieldValue: async function () {
			let listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			let myTopic = "linePasted";
			let length = 0;
			for (let i = 0; i < listOfSelectedCard.length; i++) {
				let myCard = listOfSelectedCard[i];
				if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
					continue;
				}
				length++
			}
			let myActionId = cardbookActions.startAction(myTopic, null, null, length);
			wdw_cardbook.bulkOperation(myActionId);
			if (cardbookRepository.currentCopiedEntryName == "" || cardbookRepository.currentCopiedEntryValue == "") {
				cardbookRepository.cardbookUtils.formatStringForOutput("clipboardEmpty");
				return;
			}

			for (let i = 0; i < listOfSelectedCard.length; i++) {
				let myCard = listOfSelectedCard[i];
				if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
					continue;
				}
				let myOutCard = new cardbookCardParser();
				cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
				if (cardbookRepository.multilineFields.includes(cardbookRepository.currentCopiedEntryName)) {
					myOutCard[cardbookRepository.currentCopiedEntryName].push(JSON.parse(cardbookRepository.currentCopiedEntryValue));
				} else if (cardbookRepository.dateFields.includes(cardbookRepository.currentCopiedEntryName)) {
					var newDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(cardbookRepository.currentCopiedEntryValue, "4.0");
					var dateFormat = cardbookRepository.getDateFormat(myOutCard.dirPrefId, myOutCard.version);
					myOutCard[cardbookRepository.currentCopiedEntryName] = cardbookRepository.cardbookDates.convertUTCDateToDateString(newDate, dateFormat);
				} else if (cardbookRepository.newFields.includes(cardbookRepository.currentCopiedEntryName)) {
					if (myOutCard.version == "4.0") {
						myOutCard[cardbookRepository.currentCopiedEntryName] = JSON.parse(cardbookRepository.currentCopiedEntryValue);
					} else {
						continue;
					}
				} else if (cardbookRepository.currentCopiedEntryName.startsWith("X-")) {
					var migratedItems = Array.from(cardbookRepository.newFields, item => 'X-' + item.toUpperCase());
					if (migratedItems.includes(cardbookRepository.currentCopiedEntryName)) {
						if (myOutCard.version == "3.0") {
							myOutCard.others.push(cardbookRepository.currentCopiedEntryName + ":" + JSON.parse(cardbookRepository.currentCopiedEntryValue));
						} else {
							var field = cardbookRepository.currentCopiedEntryName.replace(/^X\-/, "").toLowerCase();
							myOutCard[field] = JSON.parse(cardbookRepository.currentCopiedEntryValue);
						}
					} else {
						myOutCard.others.push(cardbookRepository.currentCopiedEntryName + ":" + JSON.parse(cardbookRepository.currentCopiedEntryValue));
					}
				} else if (cardbookRepository.currentCopiedEntryName == 'org') {
					myOutCard[cardbookRepository.currentCopiedEntryName] = JSON.parse(cardbookRepository.currentCopiedEntryValue);
				} else if (cardbookRepository.currentCopiedEntryName == 'event') {
					var tmpArray = cardbookRepository.currentCopiedEntryValue.split("::");
					var newDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(tmpArray[0], "4.0");
					var dateFormat = cardbookRepository.getDateFormat(myOutCard.dirPrefId, myOutCard.version);
					var dateString = cardbookRepository.cardbookDates.convertUTCDateToDateString(newDate, dateFormat);
					var dateLabel = tmpArray[1];
					var datePref = (tmpArray[2] == "true");
					var myPGNextNumber = cardbookRepository.cardbookTypes.rebuildAllPGs(myOutCard);
					cardbookRepository.cardbookUtils.addEventstoCard(myOutCard, [ [ dateString, dateLabel, datePref ] ], myPGNextNumber, dateFormat);
				} else if (cardbookRepository.currentCopiedEntryName.startsWith("org.")) {
					let orgStructure = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
					let allOrg = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
					let index = allOrg.indexOf(cardbookRepository.currentCopiedEntryName.split('.')[1]);
					let node = "org::org";
					let orgArray = cardbookRepository.cardbookUtils.escapeString(cardbookRepository.currentCopiedEntryValue).split("::");
					for (let j = 0; j <= index; j++) {
						node = node + "::" + orgArray[j];
					}
					cardbookRepository.addOrgToCard(myOutCard, node);

				} else if (cardbookRepository.adrElements.includes(cardbookRepository.currentCopiedEntryName)) {
					let partialIndex = cardbookRepository.adrElements.indexOf(cardbookRepository.currentCopiedEntryName);
					if (myOutCard.adr.length) {
						for (let i = 0; i < myOutCard.adr.length; i++) {
							myOutCard.adr[i][0][partialIndex] = cardbookRepository.currentCopiedEntryValue;
						}
					} else {
						myOutCard.adr.push([["", "", "", "", "", "", ""], [], "", []]);
						myOutCard.adr[0][0][partialIndex] = cardbookRepository.currentCopiedEntryValue;
					}
				} else {
					myOutCard[cardbookRepository.currentCopiedEntryName] = JSON.parse(cardbookRepository.currentCopiedEntryValue);
				}
				
				cardbookRepository.cardbookTypes.rebuildAllPGs(myOutCard);
				await cardbookRepository.saveCardFromUpdate(myCard, myOutCard, myActionId, false);
				cardbookRepository.cardbookLog.updateStatusProgressInformation(cardbookRepository.extension.localeData.localizeMessage("linePastedToCard", [myOutCard.fn]));
			}
			await cardbookActions.endAction(myActionId);
		},

		setCurrentTypeFromEvent: function (aEvent) {
			var myElement = document.elementFromPoint(aEvent.clientX, aEvent.clientY);
			var myTempArray = myElement.id.split('_');
			wdw_cardbook.currentType = myTempArray[0];
			wdw_cardbook.currentIndex = myTempArray[1];
			if (myElement.getAttribute('fieldValue')) {
				wdw_cardbook.currentValue = myElement.getAttribute('fieldValue');
			} else {
				wdw_cardbook.currentValue = myElement.value;
			}
		},

		findMergeableContacts: function () {
			let listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			let contacts = 0;
			let lists = 0;
			let ABid = [];
			for (let contact of listOfSelectedCard) {
				if (contact.isAList) {
					lists++;
					ABid.push(contact.dirPrefId);
				} else {
					contacts++;
				}
			}
			if (contacts >= 2) {
				return listOfSelectedCard.filter(card => card.isAList == false);
			} else if (contacts == 1) {
				return [];
			} else if (lists >= 2 && cardbookRepository.arrayUnique(ABid).length == 1) {
				return listOfSelectedCard;
			} else {
				return [];
			}
		},

		setElementAttribute: function (aElement, aAttribute, aValue) {
			if (document.getElementById(aElement)) {
				document.getElementById(aElement).setAttribute(aAttribute, aValue);
			}
		},

		removeElementAttribute: function (aElement, aAttribute) {
			if (document.getElementById(aElement)) {
				document.getElementById(aElement).removeAttribute(aAttribute);
			}
		},

		enableOrDisableElement: function (aArray, aValue) {
			for (var i = 0; i < aArray.length; i++) {
				if (document.getElementById(aArray[i])) {
					document.getElementById(aArray[i]).disabled=aValue;
				}
			}
		},

		setElementIdLabelWithBundleArray: function (aElementId, aValue, aArray) {
			wdw_cardbook.setElementIdLabel(aElementId, cardbookRepository.extension.localeData.localizeMessage(aValue, aArray));
		},

		setElementIdLabelWithBundle: function (aElementId, aValue) {
			wdw_cardbook.setElementIdLabel(aElementId, cardbookRepository.extension.localeData.localizeMessage(aValue));
		},

		setElementIdLabel: function (aElementId, aValue) {
			if (document.getElementById(aElementId)) {
				wdw_cardbook.setElementLabel(document.getElementById(aElementId), aValue);
			}
		},

		setElementLabel: function (aElement, aValue) {
			if (aElement) {
				aElement.label=aValue;
			}
		},

		cardbookAccountMenuContextShowing: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
													'cardbookAccountMenuReadOnlyOrReadWriteAddressbook', 'cardbookAccountMenuSync', 'cardbookAccountMenuPrint',
													'cardbookAccountMenuExports', 'cardbookAccountMenuImports'], true);
				wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "disableFromAccountsOrCats");
				wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readWriteFromAccountsOrCats");
			} else if (myTree.currentIndex != -1) {
				var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				var myType = cardbookRepository.cardbookPreferences.getType(myPrefId);
				wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook', 'cardbookAccountMenuReadOnlyOrReadWriteAddressbook'], false);
				if (myType == "GOOGLE3") {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuReadOnlyOrReadWriteAddressbook'], true);
				}
				if (cardbookRepository.cardbookPreferences.getEnabled(myPrefId)) {
					if (cardbookRepository.cardbookUtils.isMyAccountLocal(myType)) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuSync'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuSync'], false);
					}
					wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "disableFromAccountsOrCats");
				} else {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuSync'], true);
					wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "enableFromAccountsOrCats");
				}
				if (cardbookRepository.cardbookPreferences.getReadOnly(myPrefId)) {
					wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readWriteFromAccountsOrCats");
				} else {
					wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readOnlyFromAccountsOrCats");
				}
				if (cardbookRepository.cardbookUtils.isMyAccountSyncing(myPrefId)) {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
															'cardbookAccountMenuReadOnlyOrReadWriteAddressbook', 'cardbookAccountMenuSync'], true);
				}

				if (cardbookRepository.cardbookSearchMode === "SEARCH" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuImports'], true);
					if (document.getElementById('cardsTree').view.rowCount == 0) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExports'], true);
					} else if (document.getElementById('cardsTree').view.rowCount == 1) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExports'], false);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExports'], false);
					}
				} else if (cardbookRepository.cardbookPreferences.getEnabled(myPrefId)) {
					if (cardbookRepository.cardbookPreferences.getReadOnly(myPrefId)) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuImports'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuImports'], false);
					}
					if (document.getElementById('cardsTree').view.rowCount == 0) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExports'], true);
					} else if (document.getElementById('cardsTree').view.rowCount == 1) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExports'], false);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExports'], false);
					}
				} else {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExports', 'cardbookAccountMenuImports'], true);
				}
				if (cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
														'cardbookAccountMenuPrint', 'cardbookAccountMenuExports', ''], false);
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuReadOnlyOrReadWriteAddressbook', 'cardbookAccountMenuSync', 'cardbookAccountMenuImportFromFile', 'cardbookAccountMenuImportFromDir'], true);
				}
			} else {
				wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
													'cardbookAccountMenuSync', 'cardbookAccountMenuPrint', 
													'cardbookAccountMenuExports', 'cardbookAccountMenuImports'], true);
				wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "disableFromAccountsOrCats");
				wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readWriteFromAccountsOrCats");
			}
		},
	
		cardbookContactsMenuContextShowing: function () {
			cardbookWindowUtils.addCardsToCategoryMenuSubMenu('cardbookContactsMenuCategoriesMenuPopup');
			wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuFindEvents'], true);
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuFindEmails', 'cardbookContactsMenuLocalizeCards',
													'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry',
													'cardbookContactsMenuPrint', 'cardbookContactsMenuExports',
													'cardbookContactsMenuMergeCards', 'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], true);
			} else {
				let myTree = document.getElementById('accountsOrCatsTree');
				if (cardbookWindowUtils.getSelectedCardsCount() == 0) {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuFindEmails', 'cardbookContactsMenuLocalizeCards',
														'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry',
														'cardbookContactsMenuPrint', 'cardbookContactsMenuExports',
														'cardbookContactsMenuMergeCards', 'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], true);
				} else if (cardbookWindowUtils.getSelectedCardsCount() == 1) {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuFindEmails', 'cardbookContactsMenuLocalizeCards',
														'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards',
														'cardbookContactsMenuPrint', 'cardbookContactsMenuExports',
														'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], false);
					if (cardbookRepository.currentCopiedEntryLabel) {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteEntry'], false);
						wdw_cardbook.setElementIdLabelWithBundleArray('cardbookContactsMenuPasteEntry', 'pasteFieldValue', [ cardbookRepository.currentCopiedEntryLabel ] );
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteEntry'], true);
					}
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuMergeCards'], true);
					wdw_cardbook.cardbookContactsMenuLightningContextShowing();
				} else {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuLocalizeCards',
														'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards',
														'cardbookContactsMenuPrint', 'cardbookContactsMenuExports',
														'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], false);
					if (cardbookRepository.currentCopiedEntryLabel) {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteEntry'], false);
						wdw_cardbook.setElementIdLabelWithBundleArray('cardbookContactsMenuPasteEntry', 'pasteFieldValue', [ cardbookRepository.currentCopiedEntryLabel ] );
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteEntry'], true);
					}
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuFindEmails'], true);
					if (wdw_cardbook.findMergeableContacts().length == 0) {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuMergeCards'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuMergeCards'], false);
					}
				}
				if (cardbookRepository.cardbookSearchMode === "SEARCH" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards'], true);
				} else {
					if (myTree.currentIndex != -1) {
						var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
						if (cardbookRepository.cardbookPreferences.getEnabled(myPrefId)) {
							if (cardbookRepository.cardbookPreferences.getReadOnly(myPrefId)) {
								wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry'], true);
							} else {
								wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards'], false);
								if (cardbookRepository.currentCopiedEntryLabel) {
									wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteEntry'], false);
									wdw_cardbook.setElementIdLabelWithBundleArray('cardbookContactsMenuPasteEntry', 'pasteFieldValue', [ cardbookRepository.currentCopiedEntryLabel ] );
								} else {
									wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteEntry'], true);
								}
							}
						} else {
							wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry'], false);
						}
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry'], false);
					}
				}
				if (!cardbookRepository.cardbookPreferences.getBoolPref("mailnews.database.global.indexer.enabled")) {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuFindEmails'], true);
				}
			}
		},

		cardbookContactsMenuLightningContextShowing: function () {
			document.getElementById("cardbookContactsMenuFindEvents").disabled = false;
		},

		cardbookToolsMenuSyncLightning: function() {
			wdw_cardbook.enableOrDisableElement(['cardbookToolsSyncLightning'], false);
		},

		cardbookToolsMenuContextShowing: function () {
			wdw_cardbook.cardbookToolsMenuSyncLightning();
		},

		accountsOrCatsTreeContextShowing: function () {
			wdw_cardbook.setElementIdLabelWithBundle('createNodeFromAccountsOrCats', "createCategoryFromAccountsOrCats");
			wdw_cardbook.setElementIdLabelWithBundle('removeNodeFromAccountsOrCats', "removeCategoryFromAccountsOrCats");
			wdw_cardbook.setElementIdLabelWithBundle('editNodeFromAccountsOrCats', "editCategoryFromAccountsOrCats");
			wdw_cardbook.setElementIdLabelWithBundle('convertNodeFromAccountsOrCats', "convertCategoryFromAccountsOrCats");
			wdw_cardbook.setElementIdLabelWithBundle('enableOrDisableFromAccountsOrCats', "disableFromAccountsOrCats");
			wdw_cardbook.setElementIdLabelWithBundle('readOnlyOrReadWriteFromAccountsOrCats', "readOnlyFromAccountsOrCats");
			var myTree = document.getElementById('accountsOrCatsTree');
			if (cardbookDirTree.visibleData.length != 0 && myTree.currentIndex != -1) {
				var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				if (cardbookRepository.cardbookPreferences.getEnabled(myPrefId)) {
					if (cardbookRepository.cardbookPreferences.getReadOnly(myPrefId)) {
						wdw_cardbook.enableOrDisableElement(['createNodeFromAccountsOrCats', 'pasteCardsFromAccountsOrCats', 'importsFromAccountsOrCatsMenu'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['pasteCardsFromAccountsOrCats', 'importsFromAccountsOrCatsMenu'], false);
						if (cardbookRepository.cardbookPreferences.getType(myPrefId) == "SEARCH") {
							wdw_cardbook.enableOrDisableElement(['createNodeFromAccountsOrCats'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['createNodeFromAccountsOrCats'], false);
						}
					}
					wdw_cardbook.setElementIdLabelWithBundle('enableOrDisableFromAccountsOrCats', "disableFromAccountsOrCats");
					var myType = cardbookRepository.cardbookPreferences.getType(myPrefId);
					if (cardbookRepository.cardbookUtils.isMyAccountLocal(myType)) {
						wdw_cardbook.enableOrDisableElement(['syncAccountFromAccountsOrCats'], true);
					} else {
						if (cardbookRepository.cardbookUtils.isMyAccountSyncing(myPrefId)) {
							wdw_cardbook.enableOrDisableElement(['syncAccountFromAccountsOrCats'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['syncAccountFromAccountsOrCats'], false);
						}
					}
				} else {
					wdw_cardbook.setElementIdLabelWithBundle('enableOrDisableFromAccountsOrCats', "enableFromAccountsOrCats");
					wdw_cardbook.enableOrDisableElement(['createNodeFromAccountsOrCats', 'pasteCardsFromAccountsOrCats', 'importsFromAccountsOrCatsMenu', 'syncAccountFromAccountsOrCats'], true);
				}

				var myNode = cardbookRepository.cardbookPreferences.getNode(myPrefId);
				if (myNode != "categories") {
					wdw_cardbook.enableOrDisableElement(['createNodeFromAccountsOrCats'], true);
				}

				var myType = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountType'));
				if (!cardbookRepository.possibleNodes.includes(myType)) {
					wdw_cardbook.enableOrDisableElement(['removeNodeFromAccountsOrCats', 'editNodeFromAccountsOrCats', 'convertNodeFromAccountsOrCats'], true);
				} else {
					if (myType != "categories") {
						wdw_cardbook.setElementIdLabelWithBundle('removeNodeFromAccountsOrCats', "removeNodeFromAccountsOrCats");
						wdw_cardbook.setElementIdLabelWithBundle('editNodeFromAccountsOrCats', "editNodeFromAccountsOrCats");
						wdw_cardbook.setElementIdLabelWithBundle('convertNodeFromAccountsOrCats', "convertNodeFromAccountsOrCats");
					}
					var myNodeName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName'));
					if (myNodeName == cardbookRepository.cardbookUncategorizedCards) {
						wdw_cardbook.enableOrDisableElement(['removeNodeFromAccountsOrCats'], false);
						wdw_cardbook.enableOrDisableElement(['editNodeFromAccountsOrCats'], false);
						wdw_cardbook.enableOrDisableElement(['convertNodeFromAccountsOrCats'], false);
					} else {
						var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
						if (cardbookRepository.cardbookPreferences.getReadOnly(myPrefId)) {
							wdw_cardbook.enableOrDisableElement(['removeNodeFromAccountsOrCats'], true);
							wdw_cardbook.enableOrDisableElement(['editNodeFromAccountsOrCats'], true);
							wdw_cardbook.enableOrDisableElement(['convertNodeFromAccountsOrCats'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['removeNodeFromAccountsOrCats'], false);
							wdw_cardbook.enableOrDisableElement(['editNodeFromAccountsOrCats'], false);
							wdw_cardbook.enableOrDisableElement(['convertNodeFromAccountsOrCats'], false);
						}
					}
				}

				if (cardbookRepository.cardbookPreferences.getReadOnly(myPrefId)) {
					wdw_cardbook.enableOrDisableElement(['generateFnFromAccountsOrCats'], true);
					wdw_cardbook.enableOrDisableElement(['cutCardsFromAccountsOrCats'], true);
					wdw_cardbook.setElementIdLabelWithBundle('readOnlyOrReadWriteFromAccountsOrCats', "readWriteFromAccountsOrCats");
				} else {
					wdw_cardbook.enableOrDisableElement(['generateFnFromAccountsOrCats'], false);
					wdw_cardbook.enableOrDisableElement(['cutCardsFromAccountsOrCats'], false);
					wdw_cardbook.setElementIdLabelWithBundle('readOnlyOrReadWriteFromAccountsOrCats', "readOnlyFromAccountsOrCats");
				}
				if (cardbookRepository.cardbookUtils.isMyAccountSyncing(myPrefId)) {
					wdw_cardbook.enableOrDisableElement(['editAccountFromAccountsOrCats', 'removeAccountFromAccountsOrCats', 'enableOrDisableFromAccountsOrCats',
															'readOnlyOrReadWriteFromAccountsOrCats'], true);
				} else {
					wdw_cardbook.enableOrDisableElement(['editAccountFromAccountsOrCats', 'removeAccountFromAccountsOrCats', 'enableOrDisableFromAccountsOrCats'], false);
					if (myType == "SEARCH" || myType == "GOOGLE3") {
						wdw_cardbook.enableOrDisableElement(['readOnlyOrReadWriteFromAccountsOrCats'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['readOnlyOrReadWriteFromAccountsOrCats'], false);
					}
				}
				wdw_cardbook.enableOrDisableElement(['addAccountFromAccountsOrCats'], false);
				if (document.getElementById('cardsTree').view.rowCount == 0) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats', 'cutCardsFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportsFromAccountsOrCatsMenu', 'generateFnFromAccountsOrCats',
														'findDuplicatesFromAccountsOrCats', 'formatDataFromAccountsOrCats', 'convertNodeFromAccountsOrCats', 'printFromAccountsOrCats'], true);
				} else if (document.getElementById('cardsTree').view.rowCount == 1) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportsFromAccountsOrCatsMenu', 'findDuplicatesFromAccountsOrCats',
														'formatDataFromAccountsOrCats', 'printFromAccountsOrCats'], false);
				} else {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportsFromAccountsOrCatsMenu', 'findDuplicatesFromAccountsOrCats',
														'formatDataFromAccountsOrCats', 'printFromAccountsOrCats'], false);
				}
				if (cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats', 'cutCardsFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportsFromAccountsOrCatsMenu',
														'addAccountFromAccountsOrCats', 'editAccountFromAccountsOrCats', 'removeAccountFromAccountsOrCats', 'enableOrDisableFromAccountsOrCats',
														'printFromAccountsOrCats', 'findDuplicatesFromAccountsOrCats', 'formatDataFromAccountsOrCats'], false);
					wdw_cardbook.enableOrDisableElement(['pasteCardsFromAccountsOrCats', 'importsFromAccountsOrCatsMenu',
														'readOnlyOrReadWriteFromAccountsOrCats', 'syncAccountFromAccountsOrCats', 'generateFnFromAccountsOrCats'], true);
				}
			} else {
				wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats', 'cutCardsFromAccountsOrCats',
													'copyCardsFromAccountsOrCats', 'pasteCardsFromAccountsOrCats', 'exportsFromAccountsOrCatsMenu', 'importsFromAccountsOrCatsMenu',
													'editAccountFromAccountsOrCats', 'removeAccountFromAccountsOrCats',
													'createNodeFromAccountsOrCats', 'editNodeFromAccountsOrCats', 'removeNodeFromAccountsOrCats', 'convertNodeFromAccountsOrCats', 'enableOrDisableFromAccountsOrCats',
													'syncAccountFromAccountsOrCats', 'generateFnFromAccountsOrCats', 'findDuplicatesFromAccountsOrCats', 'formatDataFromAccountsOrCats', 'printFromAccountsOrCats'], true);
			}
		},
	
		cardsTreeContextShowing: async function (aEvent) {
			if (cardbookWindowUtils.displayColumnsPicker(aEvent)) {
				await wdw_cardbook.selectCard(aEvent);
				wdw_cardbook.cardsTreeContextShowingNext();
				return true;
			} else {
				return false;
			}
		},

		cardsTreeContextShowingNext: function () {
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.enableOrDisableElement(['toEmailCardsFromCards', 'ccEmailCardsFromCards', 'bccEmailCardsFromCards', 'searchForOnlineKeyFromCards', 'shareCardsByEmailFromCards', 'findEmailsFromCards', 'findEventsFromCards',
													'localizeCardsFromCards', 'openURLFromCards', 'cutCardsFromCards', 'copyCardsFromCards', 'pasteCardsFromCards', 'pasteEntryFromCards', 'exportsFromCardsMenu',
													'mergeCardsFromCards', 'duplicateCardsFromCards', 'convertListToCategoryFromCards', 'categoriesFromCards', 'printFromCards', 'publicKeysFromCards'], true);
			} else {
				cardbookWindowUtils.addCardsToCategoryMenuSubMenu('categoriesFromCardsMenuPopup');
				wdw_cardbook.enableOrDisableElement(['findEventsFromCards'], true);
				if (cardbookWindowUtils.getSelectedCardsCount() == 0) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromCards', 'ccEmailCardsFromCards', 'bccEmailCardsFromCards', 'searchForOnlineKeyFromCards', 'shareCardsByEmailFromCards', 'findEmailsFromCards', 'findEventsFromCards',
														'localizeCardsFromCards', 'openURLFromCards', 'cutCardsFromCards', 'copyCardsFromCards', 'pasteCardsFromCards', 'pasteEntryFromCards', 'exportsFromCardsMenu',
														'mergeCardsFromCards', 'duplicateCardsFromCards', 'convertListToCategoryFromCards',
														'categoriesFromCards', 'printFromCards', 'publicKeysFromCards'], true);
				} else if (cardbookWindowUtils.getSelectedCardsCount() == 1) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromCards', 'ccEmailCardsFromCards', 'bccEmailCardsFromCards', 'searchForOnlineKeyFromCards', 'shareCardsByEmailFromCards', 'findEmailsFromCards', 'findEventsFromCards',
														'localizeCardsFromCards', 'openURLFromCards', 'cutCardsFromCards', 'copyCardsFromCards', 'pasteCardsFromCards', 'exportsFromCardsMenu',
														'duplicateCardsFromCards', 'categoriesFromCards', 'printFromCards', 'publicKeysFromCards'], false);
					if (cardbookRepository.currentCopiedEntryLabel) {
						wdw_cardbook.enableOrDisableElement(['pasteEntryFromCards'], false);
						wdw_cardbook.setElementIdLabelWithBundleArray('pasteEntryFromCards', 'pasteFieldValue', [ cardbookRepository.currentCopiedEntryLabel ] );
					} else {
						wdw_cardbook.enableOrDisableElement(['pasteEntryFromCards'], true);
					}
					wdw_cardbook.enableOrDisableElement(['mergeCardsFromCards'], true);
					var myDirPrefId = document.getElementById('dirPrefIdTextBox').value;
					var myCard = cardbookRepository.cardbookCards[myDirPrefId+"::"+document.getElementById('uidTextBox').value];
					if (myCard) {
						if (!myCard.isAList || cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId)) {
							wdw_cardbook.enableOrDisableElement(['convertListToCategoryFromCards'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['convertListToCategoryFromCards'], false);
						}
					} else {
						wdw_cardbook.enableOrDisableElement(['convertListToCategoryFromCards'], false);
					}
					wdw_cardbook.cardsTreeLightningContextShowing();
				} else {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromCards', 'ccEmailCardsFromCards', 'bccEmailCardsFromCards', 'searchForOnlineKeyFromCards', 'shareCardsByEmailFromCards', 'localizeCardsFromCards',
														'openURLFromCards', 'cutCardsFromCards', 'copyCardsFromCards', 'pasteCardsFromCards', 'exportsFromCardsMenu',
														'duplicateCardsFromCards', 'categoriesFromCards', 'printFromCards', 'publicKeysFromCards'], false);
					wdw_cardbook.enableOrDisableElement(['convertListToCategoryFromCards', 'findEmailsFromCards', 'findEventsFromCards'], true);
					if (cardbookRepository.currentCopiedEntryLabel) {
						wdw_cardbook.enableOrDisableElement(['pasteEntryFromCards'], false);
						wdw_cardbook.setElementIdLabelWithBundleArray('pasteEntryFromCards', 'pasteFieldValue', [ cardbookRepository.currentCopiedEntryLabel ] );
					} else {
						wdw_cardbook.enableOrDisableElement(['pasteEntryFromCards'], true);
					}
					if (wdw_cardbook.findMergeableContacts().length == 0) {
						wdw_cardbook.enableOrDisableElement(['mergeCardsFromCards'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['mergeCardsFromCards'], false);
					}
				}
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
					if (cardbookRepository.cardbookPreferences.getEnabled(myPrefId)) {
						if (cardbookRepository.cardbookPreferences.getReadOnly(myPrefId)) {
							wdw_cardbook.enableOrDisableElement(['pasteCardsFromCards', 'pasteEntryFromCards'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['pasteCardsFromCards'], false);
							if (cardbookRepository.currentCopiedEntryLabel) {
								wdw_cardbook.enableOrDisableElement(['pasteEntryFromCards'], false);
								wdw_cardbook.setElementIdLabelWithBundleArray('pasteEntryFromCards', 'pasteFieldValue', [ cardbookRepository.currentCopiedEntryLabel ] );
							} else {
								wdw_cardbook.enableOrDisableElement(['pasteEntryFromCards'], true);
							}
						}
					} else {
						wdw_cardbook.enableOrDisableElement(['pasteCardsFromCards', 'pasteEntryFromCards'], true);
					}
				} else {
					wdw_cardbook.enableOrDisableElement(['pasteCardsFromCards', 'pasteEntryFromCards'], true);
				}
				if (!cardbookRepository.cardbookPreferences.getBoolPref("mailnews.database.global.indexer.enabled")) {
					wdw_cardbook.enableOrDisableElement(['findEmailsFromCards', 'findEventsFromCards'], true);
				}
			}
		},
	
		cardsTreeLightningContextShowing: function () {
			document.getElementById("findEventsFromCards").disabled = false;
		},

		setCopyLabel: function (type) {
			var label = cardbookRepository.extension.localeData.localizeMessage(type + 'Label');
			wdw_cardbook.setElementIdLabelWithBundleArray('copy' + type + 'Tree', 'copyFieldValue', [ label ] );
		},

		adrTreeContextShowing: function () {
			wdw_cardbook.setCopyLabel('adr');
			for (let element of cardbookRepository.adrElements) {
				let label = cardbookRepository.extension.localeData.localizeMessage(element + 'Label');
				wdw_cardbook.setElementIdLabelWithBundleArray('copy' + element + 'Tree', 'copyFieldValue', [ label ] );
			}
		},

		telTreeContextShowing: function () {
			wdw_cardbook.setCopyLabel('tel');
			if (document.getElementById('tel_' + wdw_cardbook.currentIndex + '_valueBox').getAttribute('link') == "true") {
				wdw_cardbook.enableOrDisableElement(['connecttelTree'], false);
			} else {
				wdw_cardbook.enableOrDisableElement(['connecttelTree'], true);
			}
		},

		emailTreeContextShowing: function () {
			wdw_cardbook.setCopyLabel('email');
			wdw_cardbook.enableOrDisableElement(['findemailemailTree'], !cardbookRepository.cardbookPreferences.getBoolPref("mailnews.database.global.indexer.enabled"));
		},

		imppTreeContextShowing: function () {
			wdw_cardbook.setCopyLabel('impp');
			if (document.getElementById('impp_' + wdw_cardbook.currentIndex + '_valueBox').getAttribute('link') == "true") {
				wdw_cardbook.enableOrDisableElement(['connectimppTree'], false);
			} else {
				wdw_cardbook.enableOrDisableElement(['connectimppTree'], true);
			}
		},

		urlTreeContextShowing: function () {
			wdw_cardbook.setCopyLabel('url');
		},

		eventTreeContextShowing: function () {
			wdw_cardbook.setCopyLabel('event');
		},

		enableCardIM: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarChatButton', 'cardbookContactsMenuIMPPCards', 'IMPPCardFromCards'], false);
			var selectedId = cardbookWindowUtils.getSelectedCardsId();
			cardbookWindowUtils.addCardToIMPPMenuSubMenu(cardbookRepository.cardbookCards[selectedId], 'IMPPCardFromCardsMenuPopup')
			cardbookWindowUtils.addCardToIMPPMenuSubMenu(cardbookRepository.cardbookCards[selectedId], 'cardbookContactsMenuIMPPCardsMenuPopup')
			wdw_cardbook.setElementAttribute('cardbookToolbarChatButton', 'type', 'menu-button');
			cardbookWindowUtils.addCardToIMPPMenuSubMenu(cardbookRepository.cardbookCards[selectedId], 'cardbookToolbarChatButtonMenuPopup')
		},
	
		enableCardDeletion: function () {
			if (cardbookRepository.cardbookUtils.getAvailableAccountNumber() === 0) {
				wdw_cardbook.disableCardDeletion();
			} else {
				wdw_cardbook.enableOrDisableElement(['cardbookToolbarRemoveButton', 'cardbookContactsMenuRemoveCard', 'removeCardFromCards'], false);
			}
		},
	
		enableCardCreation: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarAddContactButton', 'cardbookToolbarAddListButton', 'cardbookContactsMenuAddContact', 'cardbookContactsMenuAddList',
													'addContactFromCards', 'addListFromCards'], false);
		},
	
		enableListCreation: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarAddListButton', 'cardbookContactsMenuAddList', 'addListFromCards'], false);
		},
	
	
		enableCardModification: function () {
			if (cardbookRepository.cardbookUtils.getAvailableAccountNumber() === 0) {
				wdw_cardbook.disableCardModification();
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				if (cardbookRepository.cardbookPreferences.getReadOnly(myPrefId)) {
					wdw_cardbook.setElementIdLabelWithBundle('cardbookToolbarEditButton', "viewCardButtonLabel");
					wdw_cardbook.setElementIdLabelWithBundle('cardbookContactsMenuEditContact', "viewCardButtonLabel");
					wdw_cardbook.setElementIdLabelWithBundle('editCardFromCards', "viewCardButtonLabel");
				} else {
					wdw_cardbook.setElementIdLabelWithBundle('cardbookToolbarEditButton', "editCardButtonLabel");
					wdw_cardbook.setElementIdLabelWithBundle('cardbookContactsMenuEditContact', "editCardButtonLabel");
					wdw_cardbook.setElementIdLabelWithBundle('editCardFromCards', "editCardButtonLabel");
				}
				wdw_cardbook.enableOrDisableElement(['cardbookToolbarEditButton', 'cardbookContactsMenuEditContact', 'editCardFromCards'], false);
			}
		},
	
		disableCardIM: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarChatButton', 'cardbookContactsMenuIMPPCards', 'IMPPCardFromCards'], true);
			wdw_cardbook.removeElementAttribute('cardbookToolbarChatButton', 'type');
		},
		
		disableCardDeletion: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarRemoveButton', 'cardbookContactsMenuRemoveCard', 'removeCardFromCards'], true);
		},
		
		disableCardCreation: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarAddContactButton', 'cardbookToolbarAddListButton', 'cardbookContactsMenuAddContact', 'cardbookContactsMenuAddList', 'addContactFromCards',
													'addListFromCards'], true);
		},
		
		disableListCreation: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarAddListButton', 'cardbookContactsMenuAddList', 'addListFromCards'], true);
		},
		
		disableCardModification: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarEditButton', 'cardbookContactsMenuEditContact', 'editCardFromCards'], true);
		},

		onViewToolbarsPopupShowing: function (aEvent, aToolboxArray) {
			var result = [];
			for (var i = 0; i < aToolboxArray.length; i++) {
				if (document.getElementById(aToolboxArray[i])) {
					if (aToolboxArray[i] == "cardbook-toolbox") {
						document.getElementById(aToolboxArray[i]).externalToolbars = [document.getElementById("cardbookFolderPaneToolbar")];
					}
					result.push(aToolboxArray[i]);
				}
			}
			onViewToolbarsPopupShowing(aEvent, result);
		},

		updateStatusProgressInformationField: function() {
			if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
				if (cardbookRepository.cardbookUtils.getAvailableAccountNumber() === 0) {
					wdw_cardbook.setElementIdLabel('totalMessageCount', "");
				} else {
					if (cardbookRepository.statusInformation.length == 0) {
						wdw_cardbook.setElementIdLabel('totalMessageCount', '');
					} else if (cardbookRepository.statusInformation[cardbookRepository.statusInformation.length - 1][0] == cardbookRepository.statusInformation[cardbookRepository.statusInformation.length - 1][0].substr(0,50)) {
						wdw_cardbook.setElementIdLabel('totalMessageCount', cardbookRepository.statusInformation[cardbookRepository.statusInformation.length - 1][0]);
					} else {
						wdw_cardbook.setElementIdLabel('totalMessageCount', cardbookRepository.statusInformation[cardbookRepository.statusInformation.length - 1][0].substr(0,47) + "???");
	
					}
				}
				document.getElementById("totalMessageCount").hidden=false;
			}
		},
	
		updateStatusInformation: function() {
			if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (cardbookRepository.cardbookSearchMode === "SEARCH") {
					var myAccountId = cardbookRepository.cardbookSearchValue;
					if (cardbookRepository.cardbookDisplayCards[myAccountId]) {
						if (cardbookRepository.cardbookDisplayCards[myAccountId].modified > 0) {
							var myMessage = cardbookRepository.extension.localeData.localizeMessage("numberContactsFoundModified", [cardbookRepository.cardbookDisplayCards[myAccountId].cards.length, cardbookRepository.cardbookDisplayCards[myAccountId].modified]);
						} else {
							var myMessage = cardbookRepository.extension.localeData.localizeMessage("numberContactsFound", [cardbookRepository.cardbookDisplayCards[myAccountId].cards.length]);
						}
					} else {
						var myMessage = "";
					}
				} else {
					try {
						var myAccountId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
						if (cardbookRepository.cardbookDisplayCards[myAccountId].modified > 0) {
							var myMessage = cardbookRepository.extension.localeData.localizeMessage("numberContactsModified", [cardbookRepository.cardbookDisplayCards[myAccountId].cards.length, cardbookRepository.cardbookDisplayCards[myAccountId].modified]);
						} else {
							var myMessage = cardbookRepository.extension.localeData.localizeMessage("numberContacts", [cardbookRepository.cardbookDisplayCards[myAccountId].cards.length]);
						}
					}
					catch(e) {
						var myMessage = "";
					}
				}

				var length = cardbookWindowUtils.getSelectedCards().length;
				if (length > 1) {
					document.getElementById("unreadMessageCount").removeAttribute("hidden");
					document.getElementById("unreadMessageCount").value = cardbookRepository.extension.localeData.localizeMessage("numberContactsSelected", [length]);
				} else {
					document.getElementById("unreadMessageCount").setAttribute("hidden", "true");
				}
				document.getElementById("totalMessageCount").removeAttribute("hidden");
				document.getElementById("totalMessageCount").value = myMessage;
			}
		},
	
		windowControlShowing: function () {
			if (!document.getElementById('accountsOrCatsTree')) {
				clearInterval(wdw_cardbook.nIntervId);
				wdw_cardbook.nIntervId=0;
			} else if (cardbookRepository.cardbookUtils.getAvailableAccountNumber() === 0) {
				wdw_cardbook.enableOrDisableElement(['cardbookToolbarSyncButton', 'cardbookAccountMenuSyncs'], true);
				wdw_cardbook.disableCardCreation();
				wdw_cardbook.disableCardModification();
				wdw_cardbook.disableCardDeletion();
				wdw_cardbook.disableCardIM();
			} else {
				if (cardbookDirTree.visibleData.length == 0) {
					wdw_cardbook.disableCardCreation();
					wdw_cardbook.disableCardModification();
					wdw_cardbook.disableCardDeletion();
					wdw_cardbook.disableCardIM();
				} else if (cardbookRepository.cardbookSearchMode === "SEARCH" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableCardCreation();
					if (cardbookWindowUtils.getSelectedCardsCount() >= 2 || cardbookWindowUtils.getSelectedCardsCount() == 0) {
						wdw_cardbook.disableCardModification();
						wdw_cardbook.disableCardIM();
					} else {
						wdw_cardbook.enableCardModification();
						wdw_cardbook.enableCardIM();
					}
					if (cardbookWindowUtils.getSelectedCardsCount() == 0) {
						wdw_cardbook.disableCardDeletion();
					} else {
						wdw_cardbook.enableCardDeletion();
					}
					wdw_cardbook.disableListCreation();
					wdw_cardbook.enableOrDisableElement(['cardbookToolbarSyncButton', 'cardbookAccountMenuSyncs'], !cardbookRepository.cardbookUtils.isThereNetworkAccountToSync());
				} else {
					var myTree = document.getElementById('accountsOrCatsTree');
					if (myTree.currentIndex != -1) {
						var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
						if (cardbookRepository.cardbookPreferences.getEnabled(myPrefId)) {
							if (cardbookRepository.cardbookPreferences.getReadOnly(myPrefId)) {
								wdw_cardbook.disableCardCreation();
								wdw_cardbook.disableCardDeletion();
							} else {
								wdw_cardbook.enableCardCreation();
								if (cardbookWindowUtils.getSelectedCardsCount() == 0) {
									wdw_cardbook.disableCardDeletion();
								} else {
									wdw_cardbook.enableCardDeletion();
								}
							}
							if (cardbookWindowUtils.getSelectedCardsCount() >= 2 || cardbookWindowUtils.getSelectedCardsCount() == 0) {
								wdw_cardbook.disableCardModification();
								wdw_cardbook.disableCardIM();
							} else {
								wdw_cardbook.enableCardModification();
								wdw_cardbook.enableCardIM();
							}
							if (cardbookRepository.cardbookPreferences.getType(myPrefId).startsWith("GOOGLE")) {
								wdw_cardbook.disableListCreation();
							} else {
								wdw_cardbook.enableListCreation();
							}
						} else {
							wdw_cardbook.disableCardCreation();
							wdw_cardbook.disableCardModification();
							wdw_cardbook.disableCardDeletion();
							wdw_cardbook.disableCardIM();
						}
					} else {
						wdw_cardbook.disableCardCreation();
						wdw_cardbook.disableCardModification();
						wdw_cardbook.disableCardDeletion();
						wdw_cardbook.disableCardIM();
					}
					wdw_cardbook.enableOrDisableElement(['cardbookToolbarSyncButton', 'cardbookAccountMenuSyncs'], !cardbookRepository.cardbookUtils.isThereNetworkAccountToSync());
				}
			}

			wdw_cardbook.enableOrDisableElement(['cardbookToolbarAddServerButton', 'cardbookToolbarConfigurationButton', 'cardbookToolbarWriteButton', 'accountsOrCatsTreeContextMenu', 'cardsTreeContextMenu',
												'cardbookAccountMenu', 'cardbookContactsMenu', 'cardbookToolsMenu', 'cardbookToolbarComplexSearch', 'cardbookToolbarPrintButton'], false);
			wdw_cardbook.updateStatusInformation();
			wdw_cardbook.updateStatusProgressInformationField();
		},

		refreshWindow: async function (aParams) {
			let forceCard = false;
			if (aParams) {
				forceCard = aParams.endsWith(":::forceCard");
				aParams = aParams.replace(/:::forceCard$/, "");
			}

			if (!document.getElementById('accountsOrCatsTree')) {
				return;
			} else if (cardbookRepository.cardbookSearchMode == "SEARCH") {
				var mySyncCondition = true;
			} else if (cardbookRepository.cardbookComplexSearchMode == "SEARCH") {
				var mySyncCondition = true;
			} else {
				if (aParams) {
					if (aParams.startsWith("forceAccount::")) {
						var mySyncCondition = true;
					} else {
						var myDirPredId = cardbookRepository.cardbookUtils.getAccountId(aParams);
						var myCurrentDirPredId = cardbookRepository.cardbookUtils.getAccountId(cardbookRepository.currentAccountId);
						var mySyncCondition = (myCurrentDirPredId == myDirPredId);
					}
				} else {
					var mySyncCondition = true;
				}
			}

			// get selected account
			var myAccountId = "";
			if (cardbookRepository.cardbookSearchMode == "SEARCH") {
				myAccountId = "";
			} else if (aParams && aParams.startsWith("forceAccount::")) {
				myAccountId = aParams.replace("forceAccount::", "");
			} else {
				myAccountId = cardbookRepository.currentAccountId;

				// if it does not exist anymore, take the previous one
				if (!(cardbookRepository.cardbookDisplayCards[myAccountId])) {
					if (cardbookDirTree.visibleData.length != 0) {
						var myTree = document.getElementById('accountsOrCatsTree');
						if (myTree.currentIndex > 1) {
							myAccountId = myTree.view.getCellText(myTree.currentIndex - 1, myTree.columns.getNamedColumn('accountId'));
						} else if (myTree.currentIndex == 0) {
							myAccountId = myTree.view.getCellText(0, myTree.columns.getNamedColumn('accountId'));
						} else {
							myAccountId = "";
						}
					} else {
						myAccountId = "";
					}
				}
			}

			// get selected cards
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			wdw_cardbook.refreshAccountsInDirTree();
			
			// select account back
			await wdw_cardbook.selectAccountOrCat(myAccountId, listOfSelectedCard);

			// for search mode the reselection is done inside their functions
			if (mySyncCondition) {
				// select cards back
				if (listOfSelectedCard.length == 1) {
					if (cardbookRepository.cardbookCards[listOfSelectedCard[0].cbid]) {
						wdw_cardbook.sortCardsTreeCol();
						let card = cardbookRepository.cardbookCards[listOfSelectedCard[0].cbid];
						if (card.etag != wdw_cardbook.displayCardEtag || forceCard) {
							await wdw_cardbook.displayCard(card);
						}
					} else {
						wdw_cardbook.clearCard();
					}
				} else {
					wdw_cardbook.clearCard();
					wdw_cardbook.sortCardsTreeCol();
				}
			}
		}

	};
};
