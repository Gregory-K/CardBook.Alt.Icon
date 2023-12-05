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
		
		currentType : "",	
		currentIndex : "",
		currentValue : "",
		cutAndPaste : "",
		dragAndDrop : "",
		accountSelected : false,
		writeButtonFired : false,
		displayCardDetail : false,
		displayCardEtag : 0,

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
					cardbookRepository.cardbookPreferences.setStringPref("cardbookToolbar.currentset", document.getElementById("cardbook-toolbar").getAttribute("currentset"));
					cardbookRepository.cardbookPreferences.setStringPref("cardbookToolbar.mode", document.getElementById("cardbook-toolbox").getAttribute("mode") + 
																			"::" + document.getElementById("cardbook-toolbox").getAttribute("labelalign"));
        			wdw_cardbook.setAccountsTreeMenulist();
   			};
			toolbox.setAttribute('toolbarHighlight','true');
			}
		},

		showCorrectTabs: function () {
			for (let i of [ "listTab", "technicalTab", "vcardTab", "keyTab" ]) {
				let node = document.getElementById(i);
				if (cardbookRepository.cardbookPrefs[i + "View"]) {
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
			
			let tabnodes = document.getElementById("rightPaneDownHbox2").querySelectorAll(".cardbookTab");
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

		setAccountsTreeMenulist: function () {
			let accountsShown = cardbookRepository.cardbookPrefs["accountsShown"];
			cardbookElementTools.loadAccountsOrCatsTreeMenu("accountsOrCatsTreeMenupopup", "accountsOrCatsTreeMenulist", accountsShown);
		},

		loadFirstWindow: async function () {
			// window.setCursor("auto");
			cardBookWindowObserver.register();
			cardboookModeMutationObserver.register();
			cardbookAccountsTreeMutationObserver.register();
			cardbookCardsTreeMutationObserver.register();
			wdw_cardbook.setAppMenu(false);
			wdw_cardbook.setToolbarCustom();
			wdw_cardbook.setNoSearchMode();
			wdw_cardbook.setNoComplexSearchMode();
			wdw_cardbook.clearCard();
			wdw_cardbook.setAccountsTreeMenulist();
			wdw_cardbook.showCorrectTabs();
			// in case of opening a new window without having a reload
			wdw_cardbook.loadCssRules();
			wdw_cardbook.refreshAccountsInDirTree();
			cardbookHTMLDirTree.init();
			cardbookHTMLCardsTree.init();
			await ovl_cardbookLayout.orientPanes();
			ovl_cardbookLayout.resizePanes();
			await wdw_cardbook.selectAccountOrCatInNoSearch(true);
			// init for undo/redo
			cardbookActions.setUndoAndRedoMenuAndButton();
			await wdw_cardbook.refreshWindow();
		},

		syncAccountFromAccountsOrCats: function () {
			try {
				var myPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
				cardbookRepository.cardbookSynchronization.syncAccount(myPrefId);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.syncAccountFromAccountsOrCats error : " + e, "Error");
			}
		},

		canDropOnContactBox: function (aEvent) {
			if (cardbookRepository.cardbookComplexSearchMode != "SEARCH") {
				var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(cardbookRepository.currentAccountId);
				if (cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId) && !cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId)) {
					aEvent.preventDefault();
				}
			}
		},

		clearCard: function () {
			document.getElementById("listTab").setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("listsTabLabel"));
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
				cardbookWindowUtils.displayCard(aCard, true);
				let panesView = cardbookRepository.cardbookPrefs["panesView"];
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
			if (!document.getElementById('cardbookAccountsTree').selectedRow) {
				return;
			}
			var myAccountId = document.getElementById('cardbookAccountsTree').selectedRow.id;
			var myDirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
			if (!aForceRefresh) {
				if (cardbookRepository.currentAccountId == myAccountId) {
					return;
				}
			}
			wdw_cardbook.clearAccountOrCat();
			wdw_cardbook.clearCard();
			await wdw_cardbook.refreshWindow(myAccountId);
		},

		setCurrentAccountId: function (aAccountOrCat) {
			cardbookRepository.currentAccountId = aAccountOrCat;
			cardbookRepository.cardbookPreferences.setStringPref("accountShown", aAccountOrCat);
		},

		selectCard: async function (aEvent) {
			if (cardbookWindowUtils.getSelectedCardsCount() != 1) {
				wdw_cardbook.clearCard();
			} else {
				let selectedCard = cardbookWindowUtils.getSelectedCards()[0];
				await wdw_cardbook.displayCard(selectedCard);
			}
			if (aEvent) {
				aEvent.stopPropagation();
			}
		},

		changeAddressbookTreeMenu: async function () {
			cardbookRepository.cardbookPreferences.setStringPref("accountsShown", document.getElementById('accountsOrCatsTreeMenulist').value);
			wdw_cardbook.refreshAccountsInDirTree();
			var found = false;
			for (account of cardbookHTMLDirTree.visibleData) {
				if (account[1] == cardbookRepository.currentAccountId) {
					found = true;
					break;
				}
			}
			if (!found) {
				wdw_cardbook.clearAccountOrCat();
				wdw_cardbook.clearCard();
			} else {
				await wdw_cardbook.selectAccountOrCatInNoSearch(true);
			}
		},

		clearAccountOrCat: function () {
			wdw_cardbook.updateStatusInformation();
		},

		refreshAccountsInDirTree: function() {
			try {
				cardbookHTMLDirTree.getAccountsData();
				cardbookElementTools.deleteRows("cardbookAccountsTreeUL");
				cardbookHTMLDirTree.removeListenersForAccounts();
				for (let node of cardbookHTMLDirTree.visibleData) {
					cardbookHTMLDirTree.createRow(node);
				}
				if (wdw_cardbook.accountSelected == false) {
					let accountSaved = cardbookRepository.cardbookPrefs["accountShown"];
					if (!accountSaved) {
						if (document.getElementById('cardbookAccountsTree').selectedRow) {
							accountSaved = document.getElementById('cardbookAccountsTree').selectedRow.root;
						}
					}
					if (document.getElementById('cardbookAccountsTree').querySelector("li[id=\"" + accountSaved + "\"]")) {
						cardbookHTMLDirTree.setSelectedAccount(accountSaved);
						wdw_cardbook.accountSelected = true;
					}
				} else {
					cardbookHTMLDirTree.setSelectedAccount(cardbookRepository.currentAccountId);
				}
				if (wdw_cardbook.accountSelected == true) {
					wdw_cardbook.setCurrentAccountId(document.getElementById('cardbookAccountsTree').selectedRow.id);
				}
				cardbookHTMLDirTree.addListenersForAccounts();
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.refreshAccountsInDirTree error : " + e, "Error");
			}
		},

		async handleAccountsEvents(aEvent) {
			let row = aEvent.target.closest("li");
			switch (aEvent.type) {
				case "contextmenu":
					if (!row) {
						return;
					}
					document.getElementById("cardbookAccountsTree").selectedRow = row;
					if (aEvent.button == 2) {
						// This is a right-click. Open where it happened.
						cardbookHTMLDirTree.dirContext.openPopupAtScreen(aEvent.screenX, aEvent.screenY, true);
					  } else {
						// This is a context menu key press. Open near the middle of the row.
						cardbookHTMLDirTree.dirContext.openPopup(row, {
						  triggerEvent: aEvent,
						  position: "overlap",
						  x: row.clientWidth / 2,
						  y: row.clientHeight / 2,
						});
					  }
					  aEvent.preventDefault();
					break;
				case "collapsed":
					cardbookRepository.cardbookPreferences.setExpanded(aEvent.target.id, false);
					break;
				case "expanded":
					cardbookRepository.cardbookPreferences.setExpanded(aEvent.target.id, true);
					break;
				case "dragstart":
					wdw_cardbook.startDrag(aEvent);
					break;
				case "dragover":
					aEvent.dataTransfer.dropEffect = "none";
					aEvent.preventDefault();
					if (row) {
						if (row.nodetype != "SEARCH" && 
							!cardbookRepository.cardbookPreferences.getReadOnly(row.root)) {
								aEvent.dataTransfer.dropEffect = aEvent.ctrlKey ? "copy" : "move";
						}
					}
					break;
				case "drop":
					wdw_cardbook.dragCards(aEvent);
					break;
				case "select":
					let accounsTree = document.getElementById('cardbookAccountsTree');
					if (accounsTree.selectedRow) {
						if (wdw_cardbook.accountSelected) {
							wdw_cardbook.setCurrentAccountId(accounsTree.selectedRow.id);
						}
						wdw_cardbook.setNoSearchMode();
						wdw_cardbook.setNoComplexSearchMode();
						let dirPrefId = accounsTree.selectedRow.root;
						if (cardbookRepository.cardbookPreferences.getType(dirPrefId) == "SEARCH" && cardbookRepository.cardbookPreferences.getEnabled(dirPrefId)) {
							wdw_cardbook.setComplexSearchMode(dirPrefId);
						}
						wdw_cardbook.clearAccountOrCat();
						wdw_cardbook.clearCard();
						await cardbookHTMLCardsTree.displayBook();
					}
					break;
			}
		},

		createContact: async function () {
			var myNewCard = new cardbookCardParser();
			await wdw_cardbook.createCard(myNewCard, "CreateContact");
		},

		createList: async function () {
			var myNewCard = new cardbookCardParser();
			myNewCard.isAList = true;
			await wdw_cardbook.createCard(myNewCard, "CreateList");
		},

		createTemplate: async function () {
			var myNewCard = new cardbookCardParser();
			let dirPrefId = "";
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[2] && (account[3] != "SEARCH")) {
					dirPrefId = account[1];
					break;
				}
			}
			if (dirPrefId) {
				myNewCard.dirPrefId = dirPrefId;
				myNewCard.fn = cardbookRepository.cardbookPreferences.getFnFormula(wdw_cardEdition.workingCard.dirPrefId);
				await wdw_cardbook.createCard(myNewCard, "EditTemplate");
			}
		},

		createCard: async function (aCard, aEditionMode) {
			if (document.getElementById('cardbookAccountsTree').selectedRow) {
				let myId = document.getElementById('cardbookAccountsTree').selectedRow.id;
				// to be sure that this accountId is defined : in search mode, it's possible to have weird results
				if (myId != "false") {
					aCard.dirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
					let myType = document.getElementById('cardbookAccountsTree').selectedRow.nodetype;
					let myName = document.getElementById('cardbookAccountsTree').selectedRow.name;
					if (myName != cardbookRepository.cardbookPrefs["uncategorizedCards"]) {
						if (myType == "categories") {
							cardbookRepository.addCategoryToCard(aCard, myName);
						} else if (myType == "org") {
							cardbookRepository.addOrgToCard(aCard, myId);
						}
					}
				} else {
					for (let account of cardbookRepository.cardbookAccounts) {
						if (account[2] && account[3] != "SEARCH" && !account[4]) {
							aCard.dirPrefId = account[1];
							break;
						}
					}
				}
			} else {
				return;
			}
			await cardbookWindowUtils.openEditionWindow(aCard, aEditionMode);
		},

		editCard: async function () {
			let listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			if (listOfSelectedCard.length == 1) {
				await cardbookWindowUtils.editCardFromCard(listOfSelectedCard[0]);
			}
		},

		mergeCards: async function () {
			try {
				let listOfSelectedCard = wdw_cardbook.findMergeableContacts();
				let ids = listOfSelectedCard.map(card => card.cbid);
				let mode = listOfSelectedCard.filter(card => card.isAList).length > 0 ? "LIST" : "CONTACT";
				let url = "chrome/content/mergeCards/wdw_mergeCards.html";
				let params = new URLSearchParams();
				params.set("hideCreate", false);
				params.set("source", "MERGE");
				params.set("mode", mode);
				params.set("ids", ids.join(","));
				params.set("mergeId", cardbookRepository.cardbookUtils.getUUID());
				let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
														url: `${url}?${params.toString()}`,
														type: "popup"});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.mergeCards error : " + e, "Error");
			}
		},

		duplicateCards: async function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			var myTopic = "cardsDuplicated";
			var myActionId = cardbookActions.startAction(myTopic, null, null, listOfSelectedCard.length);
			await wdw_cardbook.bulkOperation(myActionId);
			for (var i = 0; i < listOfSelectedCard.length; i++) {
				var myCard = listOfSelectedCard[i];
				if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
					continue;
				}
				var myOutCard = new cardbookCardParser();
				await cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
				myOutCard.fn = myOutCard.fn + " " + cardbookRepository.extension.localeData.localizeMessage("fnDuplicatedMessage");
				myOutCard.cardurl = "";
				myOutCard.etag = "0";
				cardbookRepository.cardbookUtils.setCardUUID(myOutCard);
				await cardbookRepository.saveCardFromUpdate({}, myOutCard, myActionId, false);
			}
			await cardbookActions.endAction(myActionId);
		},

		findDuplicatesFromAccountsOrCats: async function () {
			try {
				if (document.getElementById('cardbookAccountsTree').selectedRow) {
					var myDirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
					await wdw_cardbook.findDuplicates(myDirPrefId);
				} else {
					return;
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.findDuplicatesFromAccountsOrCats error : " + e, "Error");
			}
		},

		findDuplicates: async function (aDirPrefId) {
			try {
				let url = "chrome/content/findDuplicates/wdw_findDuplicates.html";
				let params = new URLSearchParams();
				if (aDirPrefId) {
					params.set("dirPrefId", aDirPrefId);
				}
				let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
														url: `${url}?${params.toString()}`,
														type: "popup"});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.findDuplicates error : " + e, "Error");
			}
		},

		formatDataFromAccountsOrCats: function () {
			try {
				if (document.getElementById('cardbookAccountsTree').selectedRow) {
					var myDirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
					wdw_cardbook.formatData(myDirPrefId);
				} else {
					return;
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.formatDataFromAccountsOrCats error : " + e, "Error");
			}
		},

		formatData: async function (aDirPrefId) {
			try {
				let url = "chrome/content/formatData/wdw_formatData.html";
				let params = new URLSearchParams();
				params.set("dirPrefId", aDirPrefId);
				let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
														url: `${url}?${params.toString()}`,
														type: "popup"});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.formatData error : " + e, "Error");
			}
		},

		generateFnFromAccountsOrCats: function () {
			try {
				if (document.getElementById('cardbookAccountsTree').selectedRow) {
					var myAccountId = document.getElementById('cardbookAccountsTree').selectedRow.id;
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
				await wdw_cardbook.bulkOperation(myActionId);
				var counter = 0;
				for (var i = 0; i < myCards.length; i++) {
					var myCard = myCards[i];
					var myOutCard = new cardbookCardParser();
					await cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
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
			let listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
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
			let listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			let description = "";
			let title = "";
			for (let card of listOfSelectedCard) {
				// todo unify cardbookRepository.preferEmailPref and cardbookRepository.preferIMPPPref
				let phone = cardbookRepository.cardbookUtils.getPrefAddressFromCard(card, "tel", cardbookRepository.cardbookPrefs["preferEmailPref"]);
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

		deleteCardsAndValidate: async function (aCardList, aMessage) {
			try {
				var confirmTitle = cardbookRepository.extension.localeData.localizeMessage("confirmTitle");
				if (aCardList && aCardList.constructor === Array) {
					var listOfSelectedCard = aCardList;
				} else {
					var listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
				}
				var cardsCount = listOfSelectedCard.length;
				if (aMessage) {
					var confirmMsg = aMessage;
				} else {
					var confirmMsg = PluralForm.get(cardsCount, cardbookRepository.extension.localeData.localizeMessage("selectedCardsDeletionConfirmMessagePF", cardsCount));
				}
				if (Services.prompt.confirm(window, confirmTitle, confirmMsg)) {
					// not standard cardbookWindowUtils.setSelectedPreviousCard();
					var myTopic = "cardsDeleted";
					var myActionId = cardbookActions.startAction(myTopic, listOfSelectedCard, null, listOfSelectedCard.length);
					await wdw_cardbook.bulkOperation(myActionId);
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
					if (document.getElementById("cardbookSearchInput").value != "") {
						var defaultFileName = document.getElementById("cardbookSearchInput").value + ".vcf";
					} else {
						var defaultFileName = document.getElementById('cardbookAccountsTree').selectedRow.name + ".vcf";
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
				listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
				if (aMenu.id == "exportCardsToFileFromCards" || aMenu.id == "cardbookContactsMenuExportCardsToFile") {
					if (listOfSelectedCard.length == 1) {
						var defaultFileName = listOfSelectedCard[0].fn + ".vcf";
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
				cardbookActions.endAsyncAction(myActionId, {window: window, length: aListOfSelectedCard.length, name: aFile.leafName});
				if (cardbookRepository.cardbookUtils.getFileNameExtension(aFile.leafName).toLowerCase() == "csv") {
					cardbookRepository.currentAction[myActionId]["mode"] = "export";
					cardbookRepository.currentAction[myActionId]["status"] = "STARTED";
					cardbookRepository.currentAction[myActionId]["params"] = {};
					cardbookRepository.currentAction[myActionId]["params"]["aFile"] = aFile;
					cardbookRepository.currentAction[myActionId]["selectedCards"] = aListOfSelectedCard;
					let url = "chrome/content/csvTranslator/wdw_csvTranslator.html";
					let params = new URLSearchParams();
					params.set("mode", "export");
					params.set("includePref", false);
					params.set("lineHeader", true);
					params.set("columnSeparator", cardbookRepository.cardbookPrefs["exportDelimiter"]);
					params.set("actionId", myActionId);
					params.set("filename", aFile.leafName);
					params.set("filepath", aFile.path);
					let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
															url: `${url}?${params.toString()}`,
															type: "popup"});
				} else {
					await wdw_cardbook.bulkOperation(myActionId);
					await cardbookRepository.cardbookSynchronization.writeCardsToFile(aFile.path, aListOfSelectedCard, myActionId, aListOfSelectedCard.length);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsToFileNext error : " + e, "Error");
			}
		},

		writeCardsToCSVFile: async function (aExportData) {
			try {
				cardbookRepository.cardbookPreferences.setStringPref("exportDelimiter", aExportData.columnSeparator);
				await wdw_cardbook.bulkOperation(aExportData.actionId);
				let output = "";
				let k = 0;
				let labels = aExportData.labels.split("|");
				for (let column of labels) {
					if (k === 0) {
						output = "\"" + column + "\"";
						k++;
					} else {
						output = output + aExportData.columnSeparator + "\"" + column + "\"";
					}
				}
				k = 0;
				let fields = aExportData.fields.split("|");
				let listOfCard = cardbookRepository.currentAction[aExportData.actionId].selectedCards;
				for (let card of listOfCard) {
					for (let column of fields) {
						let tmpValue;
						if (column == "categories_0_array") {
							tmpValue = cardbookRepository.cardbookUtils.getCardValueByField(card, column, false);
							tmpValue = cardbookRepository.cardbookUtils.unescapeArrayComma(cardbookRepository.cardbookUtils.escapeArrayComma(tmpValue)).join(",");
						} else {
							tmpValue = cardbookRepository.cardbookUtils.getCardValueByField(card, column, aExportData.includePref).join("\r\n");
						}
						let tmpResult = "\"" + tmpValue + "\"";
						if (k === 0) {
							output = output + "\r\n" + tmpResult;
							k++;
						} else {
							output = output + aExportData.columnSeparator + tmpResult;
						}
					}
					k = 0;
				}

				// a final blank line
				output = output + "\r\n";
				await cardbookRepository.cardbookUtils.writeContentToFile(aExportData.filepath, output, "UTF8", aExportData.actionId, listOfCard.length);
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

		exportCardsToDirNext: async function (aDirectory, aListOfSelectedCard) {
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
					await wdw_cardbook.bulkOperation(myActionId);
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

		exportCardsImagesNext: async function (aDirectory, aListOfSelectedCard) {
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
					await wdw_cardbook.bulkOperation(myActionId);
					cardbookRepository.cardbookSynchronization.writeCardsImages(aDirectory.path, aListOfSelectedCard, myActionId);
					cardbookActions.endAsyncAction(myActionId, {window: window, name: aDirectory.leafName});
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsImagesNext error : " + e, "Error");
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
				var myTarget = document.getElementById('cardbookAccountsTree').selectedRow.id;
				var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(myTarget);
				var myDirPrefIdUrl = cardbookRepository.cardbookPreferences.getUrl(myDirPrefId);
				var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);

				// search if file is already open
				if (aFile.path == myDirPrefIdUrl) {
					cardbookRepository.cardbookUtils.formatStringForOutput("importNotIntoSameFile");
					return;
				}
				var myTopic = "cardsImportedFromFile";
				var myActionId = cardbookActions.startAction(myTopic, [aFile.leafName], myDirPrefId, 1);
				var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(myTarget);
				cardbookRepository.importConflictChoice[myDirPrefId] = {};
				cardbookRepository.currentAction[myActionId]["mode"] = "import";
				cardbookRepository.currentAction[myActionId]["status"] = "STARTED";
				cardbookRepository.currentAction[myActionId]["params"] = {};
				if (cardbookRepository.cardbookUtils.getFileNameExtension(aFile.leafName).toLowerCase() == "csv") {
					wdw_cardbook.loadCSVFile(aFile, myDirPrefId, myTarget, "IMPORTFILE", myActionId);
				} else {
					cardbookRepository.cardbookSynchronization.loadFile(aFile, myDirPrefId, myTarget, "IMPORTFILE", myActionId);
				}
				cardbookRepository.cardbookSynchronization.waitForImportFinished(myDirPrefId, myActionId, {window: window, name: aFile.leafName, dirname: myDirPrefIdName});
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
			params["aActionId"] = aActionId;
			cardbookRepository.cardbookUtils.readContentFromFile(aFile.path, wdw_cardbook.loadCSVFileNext1, params);
		},
	
		loadCSVFileNext1: async function (aContent, aParams) {
			try {
				if (aContent) {
					let result = cardbookRepository.cardbookUtils.CSVToArray(aContent);
					aParams.fileContentArray = result.result;
					let delimiter = result.delimiter || ";"
					let headers = aParams.fileContentArray[0].join(delimiter);
					cardbookRepository.currentAction[aParams.aActionId]["params"] = aParams;
					cardbookRepository.currentAction[aParams.aActionId]["params"]["aContent"] = aContent;
					
					let url = "chrome/content/csvTranslator/wdw_csvTranslator.html";
					let params = new URLSearchParams();
					params.set("mode", "import");
					params.set("includePref", false);
					params.set("lineHeader", true);
					params.set("columnSeparator", delimiter);
					params.set("actionId", aParams.aActionId);
					params.set("filename", aParams.aFile.leafName);
					params.set("filepath", aParams.aFile.path);
					params.set("foundColumns", headers);

					cardbookRepository.currentAction[aParams.aActionId]["params"]["aFile"] = null;

					let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
														url: `${url}?${params.toString()}`,
														type: "popup"});
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("fileEmpty", [aParams.aFile.path]);
					wdw_cardbook.finishCSV(aParams.aActionId);
					cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.loadCSVFileNext1 error : " + e, "Error");
				wdw_cardbook.finishCSV(aParams.aActionId);
				cardbookRepository.cardbookFileResponse[aParams.aPrefId]++;
			}
		},
	
		loadCSVFileNext2: async function (aImportData) {
			try {
				await wdw_cardbook.bulkOperation(aImportData.actionId);
				let content = cardbookRepository.currentAction[aImportData.actionId]["params"].aContent;
				let dirPrefId = cardbookRepository.currentAction[aImportData.actionId]["params"].aPrefId;
				let dirPrefName = cardbookRepository.currentAction[aImportData.actionId]["params"].aPrefIdName;
				let target = cardbookRepository.currentAction[aImportData.actionId]["params"].aTarget;
				let version = cardbookRepository.currentAction[aImportData.actionId]["params"].aPrefIdVersion;
				let dateformat = cardbookRepository.currentAction[aImportData.actionId]["params"].aTarget;
				let result = cardbookRepository.cardbookUtils.CSVToArray(content, aImportData.columnSeparator);
				let fileContentArray = result.result;
				let start = 0;
				if (aImportData.lineHeader) {
					start = 1;
				}
				let fileContentArrayLength = fileContentArray.length;
				let fields = aImportData.fields.split("|")
				cardbookRepository.cardbookServerCardSyncTotal[dirPrefId] = fileContentArrayLength - start;
				for (let i = start; i < fileContentArrayLength; i++) {
					let card = new cardbookCardParser();
					try {
						card.dirPrefId = dirPrefId;
						for (var j = 0; j < fileContentArray[i].length; j++) {
							if (fields[j]) {
								cardbookRepository.cardbookUtils.setCardValueByField(card, fields[j], fileContentArray[i][j]);
							}
						}
						card.version = cardbookRepository.cardbookPreferences.getVCardVersion(dirPrefId);
						if (card.fn == "") {
							cardbookRepository.cardbookUtils.getDisplayedName(card, card.dirPrefId,
																[card.prefixname, card.firstname, card.othername, card.lastname, card.suffixname, card.nickname],
																[card.org, card.title, card.role]);
						}
					}
					catch (e) {
						cardbookRepository.cardbookServerCardSyncError[dirPrefId]++;
						cardbookRepository.cardbookServerCardSyncDone[dirPrefId]++;
						if (e.message == "") {
							cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [dirPrefName, cardbookRepository.extension.localeData.localizeMessage(e.code), fileContentArray[i]], "Error");
						} else {
							cardbookRepository.cardbookUtils.formatStringForOutput("parsingCardError", [dirPrefName, e.message, fileContentArray[i]], "Error");
						}
						continue;
					}
					await cardbookRepository.cardbookSynchronization.importCard(card, target, version, dateformat, dateformat,
																		aImportData.actionId);
				}
				wdw_cardbook.finishCSV(aImportData.actionId);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.loadCSVFileNext2 error : " + e, "Error");
				wdw_cardbook.finishCSV(aImportData.actionId);
			}
		},

		finishCSV: function (aActionId) {
			cardbookRepository.currentAction[aActionId]["status"] = "FINISHED";
		},

		importCardsFromDir: function () {
			try {
				cardbookWindowUtils.callDirPicker("dirImportTitle", wdw_cardbook.importCardsFromDirNext);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.importCardsFromDir error : " + e, "Error");
			}
		},

		importCardsFromDirNext: async function (aDirectory) {
			try {
				var myTarget = document.getElementById('cardbookAccountsTree').selectedRow.id;
				var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(myTarget);
				var myDirPrefIdUrl = cardbookRepository.cardbookPreferences.getUrl(myDirPrefId);
				var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);

				// search if dir is already open
				if (aDirectory.path == myDirPrefIdUrl) {
					cardbookRepository.cardbookUtils.formatStringForOutput("importNotIntoSameDir");
					return;
				}
				var myTopic = "cardsImportedFromDir";
				var myActionId = cardbookActions.startAction(myTopic, [aDirectory.leafName], myDirPrefId, 1);
				cardbookRepository.importConflictChoice[myDirPrefId] = {};
				cardbookRepository.currentAction[myActionId]["mode"] = "import";
				cardbookRepository.currentAction[myActionId]["status"] = "STARTED";
				cardbookRepository.currentAction[myActionId]["params"] = {};
				await wdw_cardbook.bulkOperation(myActionId);
				var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(myTarget);
				cardbookRepository.cardbookSynchronization.loadDir(aDirectory, myDirPrefId, myTarget, "IMPORTDIR", myActionId);
				cardbookRepository.cardbookSynchronization.waitForImportFinished(myDirPrefId, myActionId, {window: window, name: aDirectory.leafName, dirname: myDirPrefIdName});
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
				listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
				wdw_cardbook.copyCards(listOfSelectedCard, "CUT");
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.cutCardsFromCards error : " + e, "Error");
			}
		},

		copyCardsFromCards: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
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
						var myTarget = document.getElementById('cardbookAccountsTree').selectedRow.id;
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
									}
									if (!cardbookRepository.importConflictChoice[myDirPrefId][choice]) {
										cardbookRepository.importConflictChoice[myDirPrefId][choice] = {};
									}
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
										await wdw_cardbook.bulkOperation(myActionId);
										var dataLength = dataArray.length
										for (var i = 0; i < dataLength; i++) {
											if (cardbookRepository.cardbookCards[dataArray[i]]) {
												var myCard = cardbookRepository.cardbookCards[dataArray[i]];
												if (myDirPrefId == myCard.dirPrefId) {
													if (myNodeType == "categories" && myCard.categories.includes(myNodeName)) {
														cardbookRepository.importConflictChoice[myDirPrefId][choice].result = "duplicate";
													} else if (myNodeType == "org" && orgNode == myCard.org) {
														cardbookRepository.importConflictChoice[myDirPrefId][choice].result = "duplicate";
													} else if (!cardbookRepository.possibleNodes.includes(myNodeType)) {
														cardbookRepository.importConflictChoice[myDirPrefId][choice].result = "duplicate";
													} else {
														cardbookRepository.importConflictChoice[myDirPrefId][choice].result = "update";
													}
												}
												var mySourceDateFormat = cardbookRepository.getDateFormat(myCard.dirPrefId, myCard.version);
												// Services.tm.currentThread.dispatch({ run: async function() {
												await cardbookRepository.cardbookSynchronization.importCard(myCard, myTarget, myDirPrefIdVCardVersion, mySourceDateFormat, myDirPrefIdDateFormat,
													myActionId);
												if (myDirPrefId != myCard.dirPrefId && 
													cardbookRepository.importConflictChoice[myDirPrefId] &&
													cardbookRepository.importConflictChoice[myDirPrefId][choice] &&
													cardbookRepository.importConflictChoice[myDirPrefId][choice].result != "cancel") {
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

		bulkOperation: async function (aActionId) {
			if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
				await cardbookRepository.cardbookUtils.bulkOperation(aActionId);
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

		doubleClickCards: async function (aEvent) {
			if (aEvent.button != 0 || aEvent.ctrlKey || aEvent.metaKey || aEvent.shiftKey || aEvent.altKey) {
				return;
			}
			let rowHeader = aEvent.target.closest(`thead[is="cb-tree-view-table-header"]`);
			let rowCard = aEvent.target.closest(`tr[is="ab-table-card-row"]`);
			if (rowCard) {
				wdw_cardbook.chooseActionCardsTree();
			} else if (rowHeader) {
				return;
			} else {
				let dirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
				if (!cardbookRepository.cardbookPreferences.getReadOnly(dirPrefId) && cardbookRepository.cardbookPreferences.getEnabled(dirPrefId)) {
					if (cardbookRepository.cardbookUtils.getAvailableAccountNumber() !== 0) {
						await wdw_cardbook.createContact();
					}
				}
			}
		},

		chooseActionCardsTree: async function () {
			var preferEmailEdition = cardbookRepository.cardbookPrefs["preferEmailEdition"];
			if (preferEmailEdition) {
				await wdw_cardbook.editCard();
			} else {
				await wdw_cardbook.emailCardsFromAction("to");
			}
		},

		// when choosing a menu entry, the command action is also fired
		// so this function is intended not to have two emails sent
		emailCardsFromAction: async function (aAction) {
			let listOfSelectedCard = [];
			if (document.commandDispatcher.focusedElement) {
				if (document.commandDispatcher.focusedElement.closest("vbox").id == "leftPaneVbox1") {
					if (cardbookRepository.cardbookUtils.getAccountId(cardbookRepository.currentAccountId) != cardbookRepository.currentAccountId) {
						listOfSelectedCard = cardbookWindowUtils.getCardsFromAccountsOrCats();
					}
				} else if (document.commandDispatcher.focusedElement.closest("vbox").id == "cardbookCardsTreeBox") {
					listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
				}
			}
			await wdw_cardbook.emailCards(listOfSelectedCard, null, aAction);
		},

		searchForOnlineKeyFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			cardbookEnigmail.searchForOnlineKey(listOfSelectedCard, null);
		},
		
		importKeyFromCards: function () {
			let listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
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
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			wdw_cardbook.shareCardsByEmail(listOfSelectedCard);
		},

		openURLFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			wdw_cardbook.openURLCards(listOfSelectedCard, null);
		},

		printCards: async function() {
			let printBrowser = document.getElementById("cardbookPrintContent");
			let listOfSelectedCard = [];
			if (document.commandDispatcher.focusedElement.closest("vbox").id == "cardbookCardsTreeBox") {
				listOfSelectedCard = cardbookWindowUtils.getSelectedCardsId();
			} else if (document.commandDispatcher.focusedElement.closest("vbox").id == "leftPaneVbox1") {
				if (document.getElementById('cardbookAccountsTree').selectedRow) {
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
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			ovl_cardbookFindEmails.findEmails(listOfSelectedCard, null);
		},

		findEventsFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			var myCard = listOfSelectedCard[0];
			ovl_cardbookFindEvents.findEvents(myCard, null, myCard.fn);
		},

		localizeCardsFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			wdw_cardbook.localizeCards(listOfSelectedCard, null);
		},

		warnEmptyEmailContacts: function(aListOfEmptyFn, aListOfNotEmptyEmails) {
			var result = true;
			if (cardbookRepository.cardbookPrefs["warnEmptyEmails"]) {
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
					cardbookRepository.cardbookPreferences.setBoolPref("warnEmptyEmails", false);
				}
			}
			return result;
		},

		emailCards: async function (aListOfSelectedCard, aListOfSelectedMails, aMsgField) {
			let useOnlyEmail = cardbookRepository.cardbookPrefs["useOnlyEmail"];
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
				compFields = [{field: aMsgField, value: result.notEmptyResults}];
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
			let listOfAddresses = [];
			if (aListOfSelectedCard) {
				listOfAddresses = cardbookRepository.cardbookUtils.getAddressesFromCards(aListOfSelectedCard);
			} else if (aListOfSelectedAddresses) {
				listOfAddresses = JSON.parse(JSON.stringify(aListOfSelectedAddresses));
			}
			
			let localizeEngine = cardbookRepository.cardbookPrefs["localizeEngine"];
			let urlEngine = "";
			if (localizeEngine === "GoogleMaps") {
				urlEngine = "https://www.google.com/maps?q=";
			} else if (localizeEngine === "OpenStreetMap") {
				urlEngine = "https://www.openstreetmap.org/search?query=";
			} else if (localizeEngine === "BingMaps") {
				urlEngine = "https://www.bing.com/maps/?q=";
			} else {
				return;
			}

			function getAddressURL(address) {
				let result = JSON.parse(JSON.stringify(address));
				result.shift();
				result = result.join("+").replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+");
				return result;
			}

			if (localizeEngine === "GoogleMaps") {
				let url = urlEngine;
				for (let address of listOfAddresses) {
					url = url + getAddressURL(address) + "/";
				}
				cardbookWindowUtils.openURL(url);
			} else {
				for (let address of listOfAddresses) {
					let url = urlEngine + getAddressURL(address);
					cardbookWindowUtils.openURL(url);
				}
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
			
			var listOfUid = [];
			var myCount = 0;
			var useOnlyEmail = cardbookRepository.cardbookPrefs["useOnlyEmail"];
			if (aEvent.target instanceof HTMLLIElement) {
				var myAccountPrefId = document.getElementById('cardbookAccountsTree').selectedRow.id;
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
			} else if (aEvent.target instanceof HTMLTableRowElement) {
				let listOfSelectedIds = cardbookWindowUtils.getSelectedCardsId();
				for (let id of listOfSelectedIds) {
					listOfUid.push(id);
					let card = cardbookRepository.cardbookCards[id];
					let emails = cardbookRepository.cardbookUtils.getMimeEmailsFromCardsAndLists([card], useOnlyEmail);
					aEvent.dataTransfer.mozSetDataAt("text/unicode", emails.notEmptyResults.join(" , "), myCount);
					aEvent.dataTransfer.mozSetDataAt("text/x-moz-address", emails.notEmptyResults.join(" , "), myCount);
					aEvent.dataTransfer.mozSetDataAt("text/x-moz-cardbook-id", id, myCount);
					aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-dest-filename", card.fn + ".vcf", myCount);
					aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise", new CardBookDataProvider(), myCount);
					myCount++;
				}
			}
		},
		
		dragCards: async function (aEvent) {
			if (wdw_cardbook.dragAndDrop == "DROP") {
				return;
			}
			wdw_cardbook.dragAndDrop = "DROP";
			if (aEvent.target.closest("vbox").id == "cardbookCardsTreeBox") {
				var myTarget = cardbookRepository.currentAccountId;
			} else if (aEvent.target.closest("vbox").id == "leftPaneVbox1") {
				let row = aEvent.target.closest("li");
				if (row) {
					var myTarget = row.id;
				} else {
					wdw_cardbook.dragAndDrop = "";
					return;
				}
			} else {
				return
			}
			var nodeArray = cardbookRepository.cardbookUtils.escapeStringSemiColon(myTarget).split("::");
			var myDirPrefId = nodeArray[0];
			if (!myDirPrefId) {
				wdw_cardbook.dragAndDrop = "";
				return;
			}	
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
			}
			if (!cardbookRepository.importConflictChoice[myDirPrefId][choice]) {
				cardbookRepository.importConflictChoice[myDirPrefId][choice] = {};
			}
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
			await wdw_cardbook.bulkOperation(myActionId);
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
								cardbookRepository.importConflictChoice[myDirPrefId][choice].result = "update";
							}
						}
						var mySourceDateFormat = cardbookRepository.getDateFormat(myCard.dirPrefId, myCard.version);
						// Services.tm.currentThread.dispatch({ run: async function() {
						await cardbookRepository.cardbookSynchronization.importCard(myCard, myTarget, myDirPrefIdVCardVersion, mySourceDateFormat, myDirPrefIdDateFormat,
															myActionId);
						if (myDirPrefId != myCard.dirPrefId &&
							cardbookRepository.importConflictChoice[myDirPrefId] &&
							cardbookRepository.importConflictChoice[myDirPrefId][choice] &&
							cardbookRepository.importConflictChoice[myDirPrefId][choice].result != "cancel") {
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
			wdw_cardbook.dragAndDrop = "";
		},

		editComplexSearch: function () {
			wdw_cardbook.addAddressbook("search");
		},

		searchRemote: async function () {
			try {
				var myValue = document.getElementById('cardbookSearchInput').value;
				if (myValue == "") {
					return;
				}
				var myPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
				if (cardbookRepository.cardbookUtils.isMyAccountSyncing(myPrefId)) {
					return;
				}
				var myPrefIdType = cardbookRepository.cardbookPreferences.getType(myPrefId);
				var myPrefEnabled = cardbookRepository.cardbookPreferences.getEnabled(myPrefId);
				var myPrefDBCached = cardbookRepository.cardbookPreferences.getDBCached(myPrefId);
				if (myPrefEnabled && !myPrefDBCached && cardbookRepository.cardbookUtils.isMyAccountRemote(myPrefIdType)) {
					cardbookRepository.cardbookPreferences.setLastSearch(myPrefId, myValue);
					await cardbookRepository.cardbookSynchronization.searchRemote(myPrefId, myValue);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.searchRemote error : " + e, "Error");
			}
		},

		onStartSearch: function () {
			wdw_cardbook.clearAccountOrCat();
			wdw_cardbook.clearCard();
		},

		displayBirthdayList: async function() {
			let url = "chrome/content/birthdays/wdw_birthdayList.html";
			let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
													url: url,
													type: "popup"});
		},
	
		displaySyncList: async function() {
			let url = "chrome/content/birthdays/wdw_birthdaySync.html";
			let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
													url: url,
													type: "popup"});
		},

		setComplexSearchMode: function (aDirPrefId) {
			wdw_cardbook.setNoSearchMode();
			cardbookRepository.cardbookComplexSearchMode = "SEARCH";
		},

		setNoComplexSearchMode: function () {
			cardbookRepository.cardbookComplexSearchMode = "NOSEARCH";
		},

		setNoSearchMode: function () {
			document.getElementById('cardbookSearchInput').value = "";
		},

		addAddressbook: async function (aAction, aDirPrefId) {
			let url = "chrome/content/addressbooksconfiguration/wdw_addressbooksAdd.html";
			let params = new URLSearchParams();
			if (aDirPrefId) {
				params.set("dirPrefId", aDirPrefId);
			}
			if (aAction) {
				params.set("action", aAction);
			}
			let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
													url: `${url}?${params.toString()}`,
													type: "popup"});
		},
		
		editAddressbook: async function () {
			if (document.getElementById('cardbookAccountsTree').selectedRow) {
				var myPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
				var myPrefIdType = cardbookRepository.cardbookPreferences.getType(myPrefId);
				if (myPrefIdType === "SEARCH") {
					wdw_cardbook.addAddressbook("search", myPrefId);
				} else {
					if (cardbookRepository.cardbookUtils.isMyAccountSyncing(myPrefId)) {
						return;
					}
					cardbookRepository.cardbookSynchronization.initMultipleOperations(myPrefId);
					let url = "chrome/content/addressbooksconfiguration/wdw_addressbooksEdit.html";
					let params = new URLSearchParams();
					params.set("dirPrefId", myPrefId);
					let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
															url: `${url}?${params.toString()}`,
															type: "popup"});
				}
			}
		},

		removeAddressbook: async function () {
			try {
				if (cardbookHTMLDirTree.visibleData.length != 0) {
					if (document.getElementById('cardbookAccountsTree').selectedRow) {
						var myParentAccountId = document.getElementById('cardbookAccountsTree').selectedRow.root;
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
								await cardbookRepository.removeAccountFromComplexSearch(myParentAccountId);
								cardbookRepository.removeAccountFromRepository(myParentAccountId);
							} else {
								cardbookRepository.removeComplexSearchFromRepository(myParentAccountId);
								await cardbookRepository.removeSearch(myParentAccountId);
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

		enableOrDisableAddressbook: async function () {
			if (document.getElementById('cardbookAccountsTree').selectedRow) {
				var aDirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
				var aValue = !cardbookRepository.cardbookPreferences.getEnabled(aDirPrefId);
			} else {
				return;
			}
			if (cardbookRepository.cardbookUtils.isMyAccountSyncing(aDirPrefId)) {
				return;
			}
			let name = cardbookRepository.cardbookPreferences.getName(aDirPrefId);
			let readonly = cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId);
			let modifiedAccount = {dirPrefId: aDirPrefId, name: name, readonly: readonly, enabled: aValue};
			await cardbookRepository.modifyAddressbook(modifiedAccount);
		},

		readOnlyOrReadWriteAddressbook: async function () {
			if (document.getElementById('cardbookAccountsTree').selectedRow) {
				var aDirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
				var aValue = !cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId);
			} else {
				return;
			}
			if (cardbookRepository.cardbookUtils.isMyAccountSyncing(aDirPrefId)) {
				return;
			}
			let name = cardbookRepository.cardbookPreferences.getName(aDirPrefId);
			let enabled = cardbookRepository.cardbookPreferences.getEnabled(aDirPrefId);
			let modifiedAccount = {dirPrefId: aDirPrefId, name: name, readonly: aValue, enabled: enabled};
			await cardbookRepository.modifyAddressbook(modifiedAccount);
		},

		returnKey: async function () {
			if (document.commandDispatcher.focusedElement.closest("vbox").id == "cardbookCardsTreeBox") {
				wdw_cardbook.chooseActionCardsTree();
			} else if (document.commandDispatcher.focusedElement.closest("vbox").id == "leftPaneVbox1") {
				if (document.getElementById('cardbookAccountsTree').selectedRow) {
					var myDirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
					var myNodeName = document.getElementById('cardbookAccountsTree').selectedRow.name;
					var myNodeId = document.getElementById('cardbookAccountsTree').selectedRow.id;
					var myNodeType = document.getElementById('cardbookAccountsTree').selectedRow.nodetype;
					if (myNodeId == myDirPrefId) {
						wdw_cardbook.editAddressbook();
					} else {
						await wdw_cardbook.renameNode(myDirPrefId, myNodeId, myNodeName, myNodeType, true);
					}
				}
			}
		},

		newKey: async function () {
			if (document.getElementById('cardbookAccountsTree').selectedRow) {
				var myDirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
				if (!cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId) && cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId)) {
					await wdw_cardbook.createContact();
				}
			}
		},

		deleteKey: async function () {
			if (document.getElementById('cardbookAccountsTree').selectedRow) {
				var myDirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
				var myNodeId = document.getElementById('cardbookAccountsTree').selectedRow.id;
				var myNodeName = document.getElementById('cardbookAccountsTree').selectedRow.name;
				var myNodeType = document.getElementById('cardbookAccountsTree').selectedRow.nodetype;
				if (document.commandDispatcher.focusedElement.closest("vbox").id == "cardbookCardsTreeBox") {
					if (cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId)) {
						if (!cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId)) {
							await wdw_cardbook.deleteCardsAndValidate();
						}
					}
				} else if (document.commandDispatcher.focusedElement.closest("vbox").id == "leftPaneVbox1") {
					if (myDirPrefId == myNodeId) {
						await wdw_cardbook.removeAddressbook();
					} else {
						wdw_cardbook.removeNode(myDirPrefId, myNodeId, myNodeName, myNodeType, true);
					}
				}
			}
		},

		F9Key: function () {
			if (document.getElementById('cardbook-menupopup')) {
				document.getElementById('cardbook-menupopup').openPopup(document.getElementById('cardbook-menupopup'), "after_start", 0, 0, false, false);
			}
		},

		copyKey: function () {
			if (document.getElementById('cardbookAccountsTree').selectedRow) {
				if (document.commandDispatcher.focusedElement.closest("vbox").id == "cardbookCardsTreeBox") {
					wdw_cardbook.copyCardsFromCards();
				} else if (document.commandDispatcher.focusedElement.closest("vbox").id == "leftPaneVbox1") {
					wdw_cardbook.copyCardsFromAccountsOrCats();
				}
			}
		},

		pasteKey: function () {
			if (document.getElementById('cardbookAccountsTree').selectedRow) {
				wdw_cardbook.pasteCards();
			}
		},

		cutKey: function () {
			if (document.getElementById('cardbookAccountsTree').selectedRow) {
				if (document.commandDispatcher.focusedElement.closest("vbox").id == "cardbookCardsTreeBox") {
					wdw_cardbook.cutCardsFromCards();
				} else if (document.commandDispatcher.focusedElement.closest("vbox").id == "leftPaneVbox1") {
					wdw_cardbook.cutCardsFromAccountsOrCats();
				}
			}
		},

		findKey: async function () {
			if (document.getElementById('cardbookSearchInput')) {
				document.getElementById('cardbookSearchInput').focus();
			}
		},

		doubleClickAccountOrCat: async function (aEvent) {
			let row = aEvent.target.closest("li");
			if (!row) {
				wdw_cardbook.addAddressbook();
			} else {
				let root = row.root;
				let id = row.id;
				if (id == root) {
					wdw_cardbook.editAddressbook();
				} else {
					await wdw_cardbook.selectNodeToAction('EDIT');
				}
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
							var dirPrefId = account[1];
							var color = cardbookRepository.cardbookPreferences.getColor(dirPrefId);
							if (account[2]) {
								cardbookRepository.createCssCardRules(styleSheet, dirPrefId, color);
							}
						}
						for (let category in cardbookRepository.cardbookNodeColors) {
							var color = cardbookRepository.cardbookNodeColors[category];
							var categoryCleanName = cardbookRepository.cardbookUtils.formatCategoryForCss(category);
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
				wdw_cardbook.createNode("", "categories");
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
			await wdw_cardbook.bulkOperation(myActionId);
			for (let id of selectedId) {
				if (cardbookRepository.cardbookCards[id]) {
					let myCard = cardbookRepository.cardbookCards[id];
					if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					let myOutCard = new cardbookCardParser();
					await cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
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
			await wdw_cardbook.bulkOperation(myActionId);
			for (let id of selectedId) {
				if (cardbookRepository.cardbookCards[id]) {
					let myCard = cardbookRepository.cardbookCards[id];
					if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					let myOutCard = new cardbookCardParser();
					await cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
					cardbookRepository.removeCategoryFromCard(myOutCard, aCategoryName);
					await cardbookRepository.saveCardFromUpdate(myCard, myOutCard, myActionId, true);
				}
			}
			await cardbookActions.endAction(myActionId);
		},

		renameNode: async function (aDirPrefId, aNodeId, aNodeName, aNodeType, aNodeSelect) {
			try {
				if (cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId)) {
					return;
				}
				let lowerCat = aNodeName.toLowerCase();
				let mailpop = 0;
				if (cardbookRepository.cardbookMailPopularityIndex[lowerCat] && cardbookRepository.cardbookMailPopularityIndex[lowerCat].count) {
					mailpop = cardbookRepository.cardbookMailPopularityIndex[lowerCat].count;
				}
				let context = (aNodeType == "categories") ? "EditCat" : "EditNode";
				let url = "chrome/content/renameField/wdw_cardbookRenameField.html";
				let params = new URLSearchParams();
				params.set("dirPrefId", aDirPrefId);
				params.set("type", aNodeType);
				params.set("context", context);
				params.set("showColor", "true");
				if (cardbookRepository.cardbookNodeColors[aNodeName]) {
					params.set("color", cardbookRepository.cardbookNodeColors[aNodeName]);
				}
				params.set("name", aNodeName);
				params.set("id", aNodeId);
				params.set("mailpop", mailpop);
				let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
														url: `${url}?${params.toString()}`,
														type: "popup"});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.renameNode error : " + e, "Error");
			}
		},

		modifyNode: async function (aNodeData) {
			let uncategorized = (aNodeData.name == cardbookRepository.cardbookUncategorizedCards) ? true : false;
			let nameChanged = aNodeData.oldName != aNodeData.name;
			let colorChanged = aNodeData.oldColor != aNodeData.color;
			let mailpopChanged = aNodeData.oldMailpop != aNodeData.mailpop;

			let myTopic = aNodeData.type != "categories" ? "nodeRenamed" : "categoryRenamed";
			let myActionId = cardbookActions.startAction(myTopic, [aNodeData.oldName], aNodeData.dirPrefId + "::" + aNodeData.type + "::" + aNodeData.name);
			await wdw_cardbook.bulkOperation(myActionId);
			if (nameChanged) {
				let myCards = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[aNodeData.id].cards));
				let allDirPrefIds = Array.from(myCards, item => item.dirPrefId);
				// aNodeData.dirPrefId might be a complex search
				allDirPrefIds.push(aNodeData.dirPrefId);
				allDirPrefIds = cardbookRepository.arrayUnique(allDirPrefIds);
				if (aNodeData.type == "categories" && !uncategorized) {
					async function saveCat(aDirPrefId1) {
						let oldCat = cardbookRepository.cardbookCategories[aDirPrefId1+"::"+aNodeData.oldName];
						let newCat = new cardbookCategoryParser();
						cardbookRepository.cardbookUtils.cloneCategory(oldCat, newCat);
						newCat.cbid = aNodeData.dirPrefId+"::"+aNodeData.name;
						newCat.name = aNodeData.name;
						if (newCat.uid == aNodeData.oldName) {
							newCat.uid = aNodeData.name;
						}
						await cardbookRepository.saveCategory(oldCat, newCat, myActionId);
					}
					if (allDirPrefIds.length) {
						for (let dirPrefId of allDirPrefIds) {
							await saveCat(dirPrefId);
						}
					} else {
						await saveCat(aNodeData.dirPrefId);
					}
				}
				if (uncategorized) {
					await cardbookRepository.renameUncategorized(aNodeData.oldName, aNodeData.name);
					cardbookRepository.cardbookUtils.notifyObservers(myTopic, "forceAccount::" + aNodeData.dirPrefId + "::" + aNodeData.type + "::" + aNodeData.name);
				} else {
					for (let card of myCards) {
						// as it is possible to rename a category from a virtual folder
						// should avoid to modify cards belonging to a read-only address book
						if (cardbookRepository.cardbookPreferences.getReadOnly(card.dirPrefId)) {
							continue;
						}
						let myOutCard = new cardbookCardParser();
						await cardbookRepository.cardbookUtils.cloneCard(card, myOutCard);
						if (aNodeData.type == "categories") {
							cardbookRepository.renameCategoryFromCard(myOutCard, aNodeData.oldName, aNodeData.name);
						} else if (aNodeData.type == "org") {
							cardbookRepository.renameOrgFromCard(myOutCard, aNodeData.id, aNodeData.name);
						}
						await cardbookRepository.saveCardFromUpdate(card, myOutCard, myActionId, false);
					}
				}
				if (aNodeData.oldName in cardbookRepository.cardbookNodeColors) {
					cardbookRepository.cardbookNodeColors[aNodeData.name] = cardbookRepository.cardbookNodeColors[aNodeData.oldName];
					delete cardbookRepository.cardbookNodeColors[aNodeData.oldName];
					cardbookRepository.saveNodeColors();
					wdw_cardbook.loadCssRules();
				}
			}
			if (colorChanged) {
				if (nameChanged) {
					delete cardbookRepository.cardbookNodeColors[aNodeData.oldName];
				}
				if (aNodeData.color) {
					cardbookRepository.cardbookNodeColors[aNodeData.name] = aNodeData.color;
				} else {
					delete cardbookRepository.cardbookNodeColors[aNodeData.name];
				}
				cardbookRepository.saveNodeColors();
				wdw_cardbook.loadCssRules();
				if (!nameChanged) {
					cardbookRepository.cardbookUtils.notifyObservers("addressbookModified", "forceAccount::" + aNodeData.dirPrefId + "::" + aNodeData.type + "::" + aNodeData.name);
				}
			}
			if (nameChanged) {
				cardbookIDBMailPop.updateMailPop(aNodeData.oldName, "0");
			}
			if (mailpopChanged) {
				let value = parseInt(aNodeData.mailpop) || "0";
				cardbookIDBMailPop.updateMailPop(aNodeData.name, value);
			}
			if (nameChanged && !uncategorized) {
				await cardbookActions.endAction(myActionId, true);
			}
		},

		removeNode: async function (aDirPrefId, aNodeId, aNodeName, aNodeType, aNodeSelect) {
				try {
				if ((aNodeName == cardbookRepository.cardbookPrefs["uncategorizedCards"]) ||
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
					await wdw_cardbook.bulkOperation(myActionId);
					
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
						await cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
						if (aNodeType == "categories") {
							cardbookRepository.removeCategoryFromCard(myOutCard, aNodeName);
						} else if (aNodeType == "org") {
							cardbookRepository.removeOrgFromCard(myOutCard, aNodeId);
						}
						await cardbookRepository.saveCardFromUpdate(myCard, myOutCard, myActionId, false);
					}
					if (aNodeType == "categories") {
						async function delCat(aDirPrefId1) {
							await cardbookRepository.deleteCategories([cardbookRepository.cardbookCategories[aDirPrefId1+"::"+aNodeName]], myActionId);
						}
						if (allDirPrefIds.length) {
							for (let dirPrefId of allDirPrefIds) {
								if (cardbookRepository.cardbookDisplayCards[dirPrefId+"::categories::"+aNodeName].cards.length == 0) {
									await delCat(dirPrefId);
								}
							}
						} else {
							await delCat(aDirPrefId);
						}
					}
					await cardbookActions.endAction(myActionId, true);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.removeNode error : " + e.toSource(), "Error");
			}
		},

		createCategory: async function (aCategoryData) {
			if (aCategoryData.dirPrefId) {
				if (cardbookRepository.cardbookAccountsCategories[aCategoryData.dirPrefId].includes(aCategoryData.name)) {
					return
				}
				let myActionId = cardbookActions.startAction("categoryCreated", [aCategoryData.name], aCategoryData.dirPrefId + "::categories::" + aCategoryData.name);
				await wdw_cardbook.bulkOperation(myActionId);
				let newCat = new cardbookCategoryParser(aCategoryData.name, aCategoryData.dirPrefId);
				cardbookRepository.cardbookUtils.addTagCreated(newCat);
				await cardbookRepository.saveCategory({}, newCat, myActionId);
				await cardbookActions.endAction(myActionId, true);
			} else {
				wdw_cardbook.addCategoryToSelectedCards(aCategoryData.name, true);
			}
			if (aCategoryData.color) {
				cardbookRepository.cardbookNodeColors[aCategoryData.name] = aCategoryData.color;
				cardbookRepository.saveNodeColors();
				wdw_cardbook.loadCssRules();
			}
			if (aCategoryData.mailpop) {
				let value = parseInt(aCategoryData.mailpop) || 0;
				cardbookIDBMailPop.updateMailPop(aCategoryData.name, value);
			}
		},

		createNode: async function (aDirPrefId, aNodeType) {
			try {
				if (aNodeType != "categories" ) {
					return
				} else if (aDirPrefId) {
					if (cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId) ||
					cardbookRepository.cardbookPreferences.getType(aDirPrefId) == "SEARCH") {
						return;
					}
				}

				let url = "chrome/content/renameField/wdw_cardbookRenameField.html";
				let params = new URLSearchParams();
				params.set("dirPrefId", aDirPrefId);
				params.set("type", aNodeType);
				params.set("context", "CreateCat");
				params.set("showColor", "true");
				let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
														url: `${url}?${params.toString()}`,
														type: "popup"});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.createNode error : " + e, "Error");
			}
		},

		selectNodeToAction: async function (aAction) {
			try {
				var myDirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
				var myNodeType = document.getElementById('cardbookAccountsTree').selectedRow.nodetype;

				if (aAction == "CREATE") {
					myNodeType = cardbookRepository.cardbookPreferences.getNode(myDirPrefId);
					if (myNodeType != "categories") {
						return;
					}
					await wdw_cardbook.createNode(myDirPrefId, myNodeType);
				} else if (!cardbookRepository.possibleNodes.includes(myNodeType)) {
					return;
				} else {
					var myNodeName = document.getElementById('cardbookAccountsTree').selectedRow.name;
					var myNodeId = document.getElementById('cardbookAccountsTree').selectedRow.id;
					if (aAction == "REMOVE") {
						wdw_cardbook.removeNode(myDirPrefId, myNodeId, myNodeName, myNodeType, true);
					} else if (aAction == "CONVERT") {
						if (myNodeType == "org") {
							wdw_cardbook.createListFromNode(myDirPrefId, myNodeId, myNodeName, myNodeType);
						} else {
							wdw_cardbook.convertNodeToList(myDirPrefId, myNodeId, myNodeName, myNodeType);
						}
					} else if (aAction == "EDIT") {
						await wdw_cardbook.renameNode(myDirPrefId, myNodeId, myNodeName, myNodeType, true);
					}
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbook.selectNodeToAction error : " + e, "Error");
			}
		},

		createListFromNode: async function (aDirPrefId, aNodeId, aNodeName, aNodeType, aNodeSelect) {
			try {
				if ((aNodeName == cardbookRepository.cardbookPrefs["uncategorizedCards"]) ||
					cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId)) {
					return;
				}
				var myDirPrefIds = {};
				var listOfUids = [];
				var myTopic = "listCreatedFromNode";
				var myActionId = cardbookActions.startAction(myTopic, [aNodeName]);
				await wdw_cardbook.bulkOperation(myActionId);
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
				if ((aNodeName == cardbookRepository.cardbookPrefs["uncategorizedCards"]) ||
					cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId)) {
					return;
				}
				var myCards = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[aNodeId].cards));
				var myDirPrefIds = {};
				var myTopic = aNodeType != "categories" ? "listCreatedFromNode" : "categoryConvertedToList";
				var myActionId = cardbookActions.startAction(myTopic, [aNodeName]);
				await wdw_cardbook.bulkOperation(myActionId);
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
					await cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
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
					await wdw_cardbook.bulkOperation(myActionId);
					var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);
					var myCategoryName = myCard.fn;
					if (myCard.version == "4.0") {
						for (var k = 0; k < myCard.member.length; k++) {
							var uid = myCard.member[k].replace("urn:uuid:", "");
							if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+uid]) {
								var myTargetCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+uid];
								var myOutCard = new cardbookCardParser();
								await cardbookRepository.cardbookUtils.cloneCard(myTargetCard, myOutCard);
								cardbookRepository.addCategoryToCard(myOutCard, myCategoryName);
								await cardbookRepository.saveCardFromUpdate(myTargetCard, myOutCard, myActionId, true);
								cardbookRepository.cardbookUtils.formatStringForOutput("cardAddedToCategory", [myDirPrefIdName, myOutCard.fn, myCategoryName]);
							}
						}
					} else if (myCard.version == "3.0") {
						var memberCustom = cardbookRepository.cardbookPrefs["memberCustom"];
						for (var k = 0; k < myCard.others.length; k++) {
							var localDelim1 = myCard.others[k].indexOf(":",0);
							if (localDelim1 >= 0) {
								var header = myCard.others[k].substr(0,localDelim1);
								var trailer = myCard.others[k].substr(localDelim1+1,myCard.others[k].length);
								if (header == memberCustom) {
									if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+trailer.replace("urn:uuid:", "")]) {
										var myTargetCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+trailer.replace("urn:uuid:", "")];
										var myOutCard = new cardbookCardParser();
										await cardbookRepository.cardbookUtils.cloneCard(myTargetCard, myOutCard);
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

		copyEntryFromTree: function () {
			var label = cardbookRepository.extension.localeData.localizeMessage(wdw_cardbook.currentType + "Label");
			wdw_cardbook.copyFieldValue(wdw_cardbook.currentType, label, wdw_cardbook.currentIndex, wdw_cardbook.currentValue);
		},

		copyPartialEntryFromTree: function (aPartialIndex) {
			var label = cardbookRepository.extension.localeData.localizeMessage(wdw_cardbook.currentType + "Label");
			wdw_cardbook.copyPartialFieldValue(wdw_cardbook.currentType, wdw_cardbook.currentIndex, aPartialIndex);
		},

		copyFieldValue: function (aFieldName, aFieldLabel, aFieldIndex, aFieldValue, aFieldAllValue) {
			var card = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			var dateFormat = cardbookRepository.getDateFormat(card.dirPrefId, card.version);
			cardbookRepository.currentCopiedEntryName = aFieldName;
			cardbookRepository.currentCopiedEntryLabel = aFieldLabel;
			// events 
			if (aFieldName == "event") {
				cardbookRepository.currentCopiedEntryValue = aFieldValue;
			// multilines fields
			} else if (cardbookRepository.multilineFields.includes(aFieldName) || aFieldName == "tz") {
				cardbookRepository.currentCopiedEntryValue = JSON.stringify(card[aFieldName][aFieldIndex]);
			// date fields
			} else if (cardbookRepository.dateFields.includes(aFieldName)) {
				var newDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(card[aFieldName], dateFormat);
				cardbookRepository.currentCopiedEntryValue = cardbookRepository.cardbookDates.convertUTCDateToDateString(newDate, "4.0");
			// structured org
			} else if (aFieldName.startsWith("org_")) {
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
				result = card.fn + "\n" + cardbookRepository.cardbookUtils.formatAddress(card[aFieldName][aFieldIndex][0]);
			// date fields
			} else if (cardbookRepository.dateFields.includes(aFieldName)) {
				result = cardbookRepository.cardbookDates.getFormattedDateForDateString(card[aFieldName], dateFormat, cardbookRepository.cardbookPrefs["dateDisplayedFormat"]);
			// events 
			} else if (aFieldName == "event") {
				var event = aFieldValue.split("::");
				var formattedDate = cardbookRepository.cardbookDates.getFormattedDateForDateString(event[0], dateFormat, cardbookRepository.cardbookPrefs["dateDisplayedFormat"]);
				result = formattedDate + " " + event[1];
			// others multilines fields
			} else if (cardbookRepository.multilineFields.includes(aFieldName)) {
				result = card[aFieldName][aFieldIndex][0][0];
			// custom fields and org
			} else if (aFieldValue != "") {
				result = aFieldValue.trim();
			// tz
			} else if (aFieldName == "tz") {
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
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
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
			await wdw_cardbook.bulkOperation(myActionId);
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
				await cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
				if (cardbookRepository.multilineFields.includes(cardbookRepository.currentCopiedEntryName) || cardbookRepository.currentCopiedEntryName == 'tz') {
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
				} else if (cardbookRepository.currentCopiedEntryName.startsWith("org_")) {
					let orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
					let allOrg = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
					let arr = cardbookRepository.currentCopiedEntryName.split("_");
					arr.shift();
					let name = arr.join("_");
					let index = allOrg.indexOf(name);
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

		openLogEdition: async function () {
			let url = "chrome/content/log/wdw_logEdition.html";
			let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
															url: url,
															type: "popup"});
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

		confirmApplyAB: function (aEvent) {
			let destAB = aEvent.originalTarget.value;
			let destABName = aEvent.originalTarget.label;
		},
		
		cardbookAccountMenuContextShowing: function () {
			if (!document.getElementById('cardbookAccountsTree').selectedRow) {
				wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
													'cardbookAccountMenuReadOnlyOrReadWriteAddressbook', 'cardbookAccountMenuSync', 'cardbookAccountMenuPrint',
													'cardbookAccountMenuExports', 'cardbookAccountMenuImports'], true);
				wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "disableFromAccountsOrCats");
				wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readWriteFromAccountsOrCats");
			} else {
				var myPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
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

				let cardsCount = cardbookWindowUtils.getCardsFromAccountsOrCats().length;
				if (cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuImports'], true);
					if (cardsCount == 0) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExports'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExports'], false);
					}
				} else if (cardbookRepository.cardbookPreferences.getEnabled(myPrefId)) {
					if (cardbookRepository.cardbookPreferences.getReadOnly(myPrefId)) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuImports'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuImports'], false);
					}
					if (cardsCount == 0) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExports'], true);
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
			}
		},
	
		cardbookContactsMenuContextShowing: function () {
			cardbookWindowUtils.addCardsToCategoryMenuSubMenu('cardbookContactsMenuCategoriesMenuPopup');
			wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuFindEvents'], true);
			if (cardbookHTMLDirTree.visibleData.length == 0) {
				wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuFindEmails', 'cardbookContactsMenuLocalizeCards',
													'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry',
													'cardbookContactsMenuPrint', 'cardbookContactsMenuExports',
													'cardbookContactsMenuMergeCards', 'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], true);
			} else {
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
				if (cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards'], true);
				} else {
					if (document.getElementById('cardbookAccountsTree').selectedRow) {
						var myPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
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
				if (!Services.prefs.getBoolPref("mailnews.database.global.indexer.enabled")) {
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
			if (document.getElementById('cardbookAccountsTree').selectedRow) {
				var myPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
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

				var myType = document.getElementById('cardbookAccountsTree').selectedRow.nodetype;
				if (!cardbookRepository.possibleNodes.includes(myType)) {
					wdw_cardbook.enableOrDisableElement(['removeNodeFromAccountsOrCats', 'editNodeFromAccountsOrCats', 'convertNodeFromAccountsOrCats'], true);
				} else {
					if (myType != "categories") {
						wdw_cardbook.setElementIdLabelWithBundle('removeNodeFromAccountsOrCats', "removeNodeFromAccountsOrCats");
						wdw_cardbook.setElementIdLabelWithBundle('editNodeFromAccountsOrCats', "editNodeFromAccountsOrCats");
						wdw_cardbook.setElementIdLabelWithBundle('convertNodeFromAccountsOrCats', "convertNodeFromAccountsOrCats");
					}
					var myNodeName = document.getElementById('cardbookAccountsTree').selectedRow.name;
					if (myNodeName == cardbookRepository.cardbookPrefs["uncategorizedCards"]) {
						wdw_cardbook.enableOrDisableElement(['removeNodeFromAccountsOrCats'], false);
						wdw_cardbook.enableOrDisableElement(['editNodeFromAccountsOrCats'], false);
						wdw_cardbook.enableOrDisableElement(['convertNodeFromAccountsOrCats'], false);
					} else {
						var myPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
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
				let cardsCount = cardbookWindowUtils.getCardsFromAccountsOrCats().length;
				if (cardsCount == 0) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats', 'cutCardsFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportsFromAccountsOrCatsMenu', 'generateFnFromAccountsOrCats',
														'findDuplicatesFromAccountsOrCats', 'formatDataFromAccountsOrCats', 'convertNodeFromAccountsOrCats', 'printFromAccountsOrCats'], true);
				} else {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportsFromAccountsOrCatsMenu', 'findDuplicatesFromAccountsOrCats',
														'formatDataFromAccountsOrCats', 'printFromAccountsOrCats'], false);
				}
				if (cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
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
	
		cardsTreeContextShowing: function () {
			if (cardbookHTMLDirTree.visibleData.length == 0) {
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
					let dirPrefId = document.getElementById('dirPrefIdTextBox').value;
					let uid = document.getElementById('uidTextBox').value;
					let card = cardbookRepository.cardbookCards[dirPrefId+"::"+uid];
					if (card) {
						if (!card.isAList || cardbookRepository.cardbookPreferences.getReadOnly(dirPrefId)) {
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
				if (document.getElementById('cardbookAccountsTree').selectedRow) {
					var myPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
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
				if (!Services.prefs.getBoolPref("mailnews.database.global.indexer.enabled")) {
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
			wdw_cardbook.enableOrDisableElement(['findemailemailTree'], !Services.prefs.getBoolPref("mailnews.database.global.indexer.enabled"));
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

		tzTreeContextShowing: function () {
			wdw_cardbook.setCopyLabel('tz');
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
			} else if (document.getElementById('cardbookAccountsTree').selectedRow) {
				var myPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
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
			} else {
				wdw_cardbook.disableCardModification();
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

		updateStatusInformation: function() {
			if (document.getElementById('cardbookAccountsTree').selectedRow && cardbookHTMLCardsTree.cardsList.view) {
				let message = "";
				let accountId = document.getElementById('cardbookAccountsTree').selectedRow.id;
				let dirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
				let cached = cardbookRepository.cardbookPreferences.getDBCached(dirPrefId);
				if (document.getElementById("cardbookSearchInput").value != "" || !cached) {
					let length = cardbookHTMLCardsTree.cardsList.view._rowMap.length;
					let modified = 0;
					for (let i in cardbookHTMLCardsTree.cardsList.view._rowMap) {
						let card = cardbookHTMLCardsTree.cardsList.view._rowMap[i].card;
						if (card.updated || card.created) {
							modified++;
						}
					}
					if (modified) {
						message = cardbookRepository.extension.localeData.localizeMessage("numberContactsFoundModified", [length, modified]);
					} else {
						message = cardbookRepository.extension.localeData.localizeMessage("numberContactsFound", [length]);
					}
				} else {
					if (document.getElementById('cardbookAccountsTree').selectedRow && cardbookHTMLCardsTree.cardsList.view) {
						let length = cardbookHTMLCardsTree.cardsList.view._rowMap.length;
						let modified = cardbookRepository.cardbookDisplayCards[accountId].modified;
						if (modified) {
							message = cardbookRepository.extension.localeData.localizeMessage("numberContactsModified", [length, modified]);
						} else {
							message = cardbookRepository.extension.localeData.localizeMessage("numberContacts", [length]);
						}
					}
				}

				let selectedLength = cardbookWindowUtils.getSelectedCards().length;
				if (selectedLength > 1) {
					document.getElementById("selectedContacts").removeAttribute("hidden");
					document.getElementById("selectedContacts").value = cardbookRepository.extension.localeData.localizeMessage("numberContactsSelected", [selectedLength]);
				} else {
					document.getElementById("selectedContacts").setAttribute("hidden", "true");
				}
				document.getElementById("totalContacts").removeAttribute("hidden");
				document.getElementById("totalContacts").value = message;
			}
		},
	
		windowControlShowing: function () {
			if (cardbookRepository.cardbookUtils.getAvailableAccountNumber() === 0) {
				wdw_cardbook.enableOrDisableElement(['cardbookToolbarSyncButton', 'cardbookAccountMenuSyncs'], true);
				wdw_cardbook.disableCardCreation();
				wdw_cardbook.disableCardModification();
				wdw_cardbook.disableCardDeletion();
				wdw_cardbook.disableCardIM();
			} else {
				if (cardbookHTMLDirTree.visibleData.length == 0) {
					wdw_cardbook.disableCardCreation();
					wdw_cardbook.disableCardModification();
					wdw_cardbook.disableCardDeletion();
					wdw_cardbook.disableCardIM();
				} else if (document.getElementById("cardbookSearchInput").value != "" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
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
					if (document.getElementById('cardbookAccountsTree').selectedRow) {
						var myPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
						if (cardbookRepository.cardbookPreferences.getEnabled(myPrefId)) {
							if (cardbookRepository.cardbookPreferences.getReadOnly(myPrefId)) {
								wdw_cardbook.disableCardCreation();
								wdw_cardbook.disableCardDeletion();
							} else {
								wdw_cardbook.enableCardCreation();
								wdw_cardbook.enableListCreation();
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
		},

		refreshWindow: async function (aParams) {
			wdw_cardbook.windowControlShowing();

			wdw_cardbook.refreshAccountsInDirTree();
			
			let forceCard = false;
			if (aParams) {
				forceCard = aParams.endsWith(":::forceCard");
				aParams = aParams.replace(/:::forceCard$/, "");
			}

			let mySyncCondition = false;
			if (cardbookRepository.cardbookComplexSearchMode == "SEARCH") {
				mySyncCondition = true;
			} else {
				if (aParams) {
					if (aParams.startsWith("forceAccount::")) {
						mySyncCondition = true;
					} else {
						let myDirPredId = cardbookRepository.cardbookUtils.getAccountId(aParams);
						let myCurrentDirPredId = cardbookRepository.cardbookUtils.getAccountId(cardbookRepository.currentAccountId);
						mySyncCondition = (myCurrentDirPredId == myDirPredId);
					}
				} else {
					mySyncCondition = true;
				}
			}

			// for search mode the reselection is done inside their functions
			if (mySyncCondition) {
				await cardbookHTMLCardsTree.displayBook();
			}
			wdw_cardbook.windowControlShowing();
		}
	};
};
