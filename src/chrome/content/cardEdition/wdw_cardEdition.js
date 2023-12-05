if ("undefined" == typeof(wdw_cardEdition)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { FormHistory } = ChromeUtils.import("resource://gre/modules/FormHistory.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	XPCOMUtils.defineLazyModuleGetter(this, "PhoneNumber", "chrome://cardbook/content/formautofill/phonenumberutils/PhoneNumber.jsm");

	var cardEditionNotification = {};
	XPCOMUtils.defineLazyGetter(cardEditionNotification, "errorNotifications", () => {
		return new MozElements.NotificationBox(element => {
			element.setAttribute("flex", "1");
			document.getElementById("errorNotificationsHbox").append(element);
		});
	});

	var wdw_cardEdition = {

		contactNotLoaded: true,
		editionFields: [],
		currentAdrId: [],
		emailToAdd: [],
		cardbookeditlists: {},
		workingCard: {},
		cardRegion: "",

		getEmails: function () {
			let emails = [];
			let cardEmails = cardbookWindowUtils.getAllTypes("email", true);
			for (let cardRow of cardEmails) {
				emails.push(cardRow[0][0]);
			}
			return emails;
		},

		searchForOnlineKeyEdit: function () {
			let emails = wdw_cardEdition.getEmails();
			if (emails.length) {
				cardbookEnigmail.searchForOnlineKeyEdit(emails);
			}
		},

		searchForThKeyEdit: function () {
			let emails = wdw_cardEdition.getEmails();
			if (emails.length) {
				cardbookEnigmail.searchForThKeyEdit(emails);
			}
		},

		searchForLocalKeyEdit: function () {
			cardbookWindowUtils.callFilePicker("fileSelectionGPGTitle", "OPEN", "GPG", "", "", wdw_cardEdition.searchForLocalKeyEditNext);
		},

		searchForLocalKeyEditNext: function (aFile) {
			try {
				if (aFile) {
					var params = {};
					params["showError"] = true;
					cardbookRepository.cardbookUtils.readContentFromFile(aFile.path, wdw_cardEdition.searchForLocalKeyEditNext2, params);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("searchForLocalKeyEditNext error : " + e, "Error");
			}
		},

		searchForLocalKeyEditNext2: function (aContent, aParam) {
			try {
				if (aContent) {
					wdw_cardEdition.addKeyToEdit(aContent);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("searchForLocalKeyEditNext2 error : " + e, "Error");
			}
		},
	
		addKeyToEdit: function (aKey) {
			let type = "key";
			let re = /[\n\u0085\u2028\u2029]|\r\n?/g;
			aKey = aKey.replace(/-----(BEGIN|END) PGP PUBLIC KEY BLOCK-----/g, "").trim().replace(re, "\\r\\n");
			let allKeyArray = cardbookWindowUtils.getAllKeys(false);
			allKeyArray = allKeyArray.filter(child => (child.value != "" || child.URI != ""));
			allKeyArray.push({types: [], value: aKey, URI: "", extension: ""});
			cardbookElementTools.deleteRows(type + "ReadWriteGroupbox");
			cardbookWindowUtils.constructDynamicKeysRows(wdw_cardEdition.workingCard.dirPrefId, type, allKeyArray, wdw_cardEdition.workingCard.version);
		},

		displayListTrees: function (aTreeName) {
			var cardsTreeView = {
				get rowCount() { return wdw_cardEdition.cardbookeditlists[aTreeName].length; },
				isContainer: function(idx) { return false },
				canDrop: function(idx) { return true },
				cycleHeader: function(idx) { return false },
				isEditable: function(idx, column) { return false },
				getCellText: function(idx, column) {
					if (column.id == aTreeName + "Uid") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx][0];
					}
					else if (column.id == aTreeName + "Name") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx][4];
					}
					else if (column.id == aTreeName + "Fn") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx][1];
					}
					else if (column.id == aTreeName + "Firstname") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx][3];
					}
					else if (column.id == aTreeName + "Lastname") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx][2];
					}
				}
			}
			document.getElementById(aTreeName).view = cardsTreeView;
		},

		displayLists: function (aCard) {
			document.getElementById('searchAvailableCardsInput').value = "";
			document.getElementById('kindTextBox').value = "";
			wdw_cardEdition.cardbookeditlists.availableCardsTree = [];
			wdw_cardEdition.cardbookeditlists.addedCardsTree = [];

			var myMembers = cardbookRepository.cardbookUtils.getMembersFromCard(aCard);
			document.getElementById('kindTextBox').value = myMembers.kind;
			for (let email of myMembers.mails) {
				wdw_cardEdition.addEmailToAdded(email.toLowerCase());
			}
			for (let card of myMembers.uids) {
				wdw_cardEdition.addUidToAdded(card.uid);
			}

			wdw_cardEdition.sortCardsTreeCol('addedCardsTree', null, null);
			wdw_cardEdition.searchAvailableCards();
		},

		sortTrees: function (aEvent, aTreeName) {
			if (aEvent.button != 0) {
				return;
			}
			var target = aEvent.originalTarget;
			if (target.localName == "treecol") {
				wdw_cardEdition.sortCardsTreeCol(aTreeName, target);
			}
		},

		sortCardsTreeCol: function (aTreeName, aColumn, aSelectedList) {
			var myTree = document.getElementById(aTreeName);
			
			// get selected cards
			var listOfUid = {};
			if (!aSelectedList) {
				listOfUid[aTreeName] = wdw_cardEdition.getSelectedCardsForList(aTreeName);
			} else {
				listOfUid[aTreeName] = aSelectedList;
			}

			var columnName;
			var columnArray;
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
			
			switch(columnName) {
				case "availableCardsTreeName":
				case "addedCardsTreeName":
					columnArray=4;
					break;
				case "availableCardsTreeUid":
				case "addedCardsTreeUid":
					columnArray=0;
					break;
				case "availableCardsTreeFn":
				case "addedCardsTreeFn":
					columnArray=1;
					break;
				case "availableCardsTreeLastname":
				case "addedCardsTreeLastname":
					columnArray=2;
					break;
				case "availableCardsTreeFirstname":
				case "addedCardsTreeFirstname":
					columnArray=3;
					break;
				default:
                    columnArray=4;
                    if (aTreeName == "availableCardsTree") {
                        columnName = "availableCardsTreeName";
                    } else {
                        columnName = "addedCardsTreeName";
                    }
                    break;
            }
			if (wdw_cardEdition.cardbookeditlists[aTreeName]) {
				cardbookRepository.cardbookUtils.sortMultipleArrayByString(wdw_cardEdition.cardbookeditlists[aTreeName], columnArray, order);
			} else {
				return;
			}

			//setting these will make the sort option persist
			myTree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
			myTree.setAttribute("sortResource", columnName);

			wdw_cardEdition.displayListTrees(aTreeName);

			//set the appropriate attributes to show to indicator
			var cols = myTree.getElementsByTagName("treecol");
			for (var i = 0; i < cols.length; i++) {
				cols[i].removeAttribute("sortDirection");
			}
			document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");

			// select Cards back
			wdw_cardEdition.setSelectedCardsForList(myTree, listOfUid[aTreeName]);
		},

		addUidToAdded: function (aCardUid) {
			var found = false;
			for (var j = 0; j < wdw_cardEdition.cardbookeditlists.addedCardsTree.length; j++) {
				if (wdw_cardEdition.cardbookeditlists.addedCardsTree[j][0] == aCardUid) {
					found = true;
					break;
				}
			}
			if (!found && cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+aCardUid]) {
				var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+aCardUid];
				wdw_cardEdition.cardbookeditlists.addedCardsTree.splice(0, 0, [myCard.uid, myCard.fn, myCard.lastname, myCard.firstname, cardbookRepository.cardbookUtils.getName(myCard), "CARD"]);
			}
		},

		addEmailToAdded: function (aEmail) {
			var found = false;
			for (var j = 0; j < wdw_cardEdition.cardbookeditlists.addedCardsTree.length; j++) {
				if (wdw_cardEdition.cardbookeditlists.addedCardsTree[j][1] == aEmail && wdw_cardEdition.cardbookeditlists.addedCardsTree[j][5] == "EMAIL") {
					found = true;
					break;
				}
			}
			if (!found) {
				var myCard = {};
				cardbookRepository.cardbookUtils.setCardUUID(myCard);
				myCard.fn = aEmail;
				myCard.lastname = "";
				myCard.firstname = "";
				wdw_cardEdition.cardbookeditlists.addedCardsTree.splice(0, 0, [myCard.uid, myCard.fn, myCard.lastname, myCard.firstname, cardbookRepository.cardbookUtils.getName(myCard), "EMAIL"]);
			}
		},

		removeUidFromAdded: function (aCardUid) {
			function removeCardList(element) {
				return (element[0] != aCardUid);
			}
			wdw_cardEdition.cardbookeditlists.addedCardsTree = wdw_cardEdition.cardbookeditlists.addedCardsTree.filter(removeCardList);
		},

		getSelectedCardsForList: function (aTreeName) {
			let tree = document.getElementById(aTreeName);
			var listOfUid = [];
			var numRanges = tree.view.selection.getRangeCount();
			var start = new Object();
			var end = new Object();
			for (var i = 0; i < numRanges; i++) {
				tree.view.selection.getRangeAt(i,start,end);
				for (var j = start.value; j <= end.value; j++){
					listOfUid.push(tree.view.getCellText(j, tree.columns.getNamedColumn(aTreeName + 'Uid')));
				}
			}
			return listOfUid;
		},

		setSelectedCardsForList: function (aTree, aListOfUid) {
			for (let i = 0; i < aTree.view.rowCount; i++) {
				for (let j = 0; j < aListOfUid.length; j++) {
					if (aTree.view.getCellText(i, aTree.columns.getNamedColumn(aTree.id + 'Uid')) == aListOfUid[j]) {
						aTree.view.selection.rangedSelect(i,i,true);
						break;
					}
				}
			}
		},

		modifyLists: function (aObject) {
			let action = "appendCard";
			switch (aObject.id) {
				case "availableCardsTreeChildren":
				case "appendCardButton":
					action = "appendCard";
					break;
				case "addEmailInput":
					action = "appendEmail";
					break;
				case "appendCardEmailsButton":
					action = "appendCardsEmail";
					break;
				case "addedCardsTreeChildren":
				case "deleteListButton":
					action = "delete";
					break;
			}
			let availableCards = wdw_cardEdition.getSelectedCardsForList("availableCardsTree");
			let addedCards = wdw_cardEdition.getSelectedCardsForList("addedCardsTree");
			switch (action) {
				case "appendCard":
					for (let card of availableCards) {
						wdw_cardEdition.addUidToAdded(card);
					}
					// if no contact selected try to add email
					// break;
				case "appendEmail":
					let email = document.getElementById('addEmailInput').value;
					if (email) {
						let addresses = MailServices.headerParser.parseEncodedHeaderW(email);
						for (let address of addresses) {
							if (address.email.includes("@")) {
								wdw_cardEdition.addEmailToAdded(address.email.toLowerCase());
							}
						}
						document.getElementById('addEmailInput').value = "";
					}
					break;
				case "appendCardsEmail":
					for (let uid of availableCards) {
						let card = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+uid];
						if (card) {
							for (let email of card.email) {
								let addresses = MailServices.headerParser.parseEncodedHeaderW(email[0][0]);
								for (let address of addresses) {
									if (address.email.includes("@")) {
										wdw_cardEdition.addEmailToAdded(address.email.toLowerCase());
									}
								}
							}
						}
					}
					break;
				case "delete":
					for (let card of addedCards) {
						wdw_cardEdition.removeUidFromAdded(card);
					}
					break;
				default:
					break;
			}
			wdw_cardEdition.sortCardsTreeCol('addedCardsTree', null, addedCards);
			wdw_cardEdition.searchAvailableCards(availableCards);
		},

		searchAvailableCards: function (aSelectedList) {
			function addCardFromLongSearch(aCard) {
				for (let added of wdw_cardEdition.cardbookeditlists.addedCardsTree) {
					if (added[0] == aCard.uid) {
						return;
					}
				}
				if (aCard.uid != document.getElementById('uidTextBox').value) {
					wdw_cardEdition.cardbookeditlists.availableCardsTree.push([aCard.uid, aCard.fn, aCard.lastname, aCard.firstname, cardbookRepository.cardbookUtils.getName(aCard), "CARD"]);
				}
			}
			function addCardFromCategories(aCard) {
				for (let available of wdw_cardEdition.cardbookeditlists.availableCardsTree) {
					if (available[0] == aCard.uid) {
						return;
					}
				}
				for (let added of wdw_cardEdition.cardbookeditlists.addedCardsTree) {
					if (added[0] == aCard.uid) {
						return;
					}
				}
				if (aCard.uid != document.getElementById('uidTextBox').value) {
					wdw_cardEdition.cardbookeditlists.availableCardsTree.push([aCard.uid, aCard.fn, aCard.lastname, aCard.firstname, cardbookRepository.cardbookUtils.getName(aCard), "CARD"]);
				}
			}
			var listOfUid = [];
			if (!aSelectedList) {
				listOfUid = wdw_cardEdition.getSelectedCardsForList("availableCardsTree");
			} else {
				listOfUid = aSelectedList;
			}
			var searchValue = cardbookRepository.makeSearchString(document.getElementById('searchAvailableCardsInput').value);
			wdw_cardEdition.cardbookeditlists.availableCardsTree = [];
			var myCurrentDirPrefId = document.getElementById('dirPrefIdTextBox').value;
			if (myCurrentDirPrefId != "") {
				for (var i in cardbookRepository.cardbookCardLongSearch[myCurrentDirPrefId]) {
					// cards
					if (i.includes(searchValue) || searchValue == "") {
						for (let card of cardbookRepository.cardbookCardLongSearch[myCurrentDirPrefId][i]) {
							addCardFromLongSearch(card);
						}
					}
					// categories
					if (searchValue) {
						for (let category of cardbookRepository.cardbookAccountsCategories[myCurrentDirPrefId]) {
							if (category.toUpperCase().includes(searchValue)) {
								for (let card of cardbookRepository.cardbookDisplayCards[myCurrentDirPrefId+"::categories::"+category].cards) {
									addCardFromCategories(card);
								}
							}
						}
					}
				}
			}
			wdw_cardEdition.sortCardsTreeCol('availableCardsTree', null, listOfUid);
		},

		availableCardsTreeContextShowing: function (aEvent) {
			if (cardbookWindowUtils.displayColumnsPicker(aEvent)) {
				var myTree = document.getElementById('availableCardsTree');
				var myAvailableCards = wdw_cardEdition.getSelectedCardsForList("availableCardsTree");
				if (myAvailableCards.length > 1) {
					return;
				}
				var cell = myTree.getCellAt(aEvent.clientX, aEvent.clientY);
				var myUid = myTree.view.getCellText(cell.row, myTree.columns.getNamedColumn('availableCardsUid'));
				// clean up
				var myPopup = document.getElementById("availableCardsTreeContextMenu");
				var i = 0;
				while (true) {
					if (document.getElementById('appendEmail' + i)) {
						myPopup.removeChild(document.getElementById('appendEmail' + i));
						i++;
					} else {
						break;
					}
				}
				// then add
				if (cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+myUid]) {
					var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+myUid];
					for (var i = 0; i < myCard.email.length; i++) {
						var menuItem = document.createXULElement("menuitem");
						menuItem.setAttribute("id", 'appendEmail' + i);
						menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("appendEmailLabel", [myCard.email[i][0][0]]));
						menuItem.setAttribute("value", myCard.email[i][0][0]);
						menuItem.addEventListener("command", function(aEvent) {
								wdw_cardEdition.addEmailToAdded(this.value.toLowerCase());
								wdw_cardEdition.sortCardsTreeCol('addedCardsTree', null, null);
								aEvent.stopPropagation();
							}, false);
						myPopup.appendChild(menuItem);
					}
				}
				return true;
			} else {
				return false;
			}
		},

		loadCategories: function (aCategoryChecked) {
			let categoryList = cardbookRepository.cardbookAccountsCategories[wdw_cardEdition.workingCard.dirPrefId].concat(aCategoryChecked);
			categoryList = cardbookRepository.cardbookUtils.cleanCategories(categoryList);
			cardbookRepository.cardbookUtils.sortArrayByString(categoryList,1);

			let listRows = document.getElementById('categoriesMenupopup');
			for (let i = listRows.childNodes.length -1; i >= 0; i--) {
				let child = listRows.childNodes[i];
				if (child.tagName != "html:input" && child.tagName != "menuseparator") {
					listRows.removeChild(child);
				}
			}

			for (let category of categoryList) {
				let item = document.createXULElement("menuitem");
				item.setAttribute("class", "menuitem-iconic cardbook-item cardbookCategoryMenuClass");
				item.setAttribute("label", category);
				item.setAttribute("value", category);
				item.setAttribute("type", "checkbox");
				if (category in cardbookRepository.cardbookNodeColors && cardbookRepository.cardbookPrefs["useColor"] != "nothing") {
					item.setAttribute("colorType", 'category_' + cardbookRepository.cardbookUtils.formatCategoryForCss(category));
				}
				if (aCategoryChecked.includes(category)) {
					item.setAttribute("checked", "true");
				}
				listRows.appendChild(item);
			}

			cardbookWindowUtils.updateComplexMenulist('category', 'categoriesMenupopup');
		},

		getCategories: function () {
			let categoryList = document.getElementById("categoriesMenupopup").querySelectorAll("menuitem.cardbook-item[checked]");
			return Array.from(categoryList, cat => cat.getAttribute("value"));
		},

		loadEditionMode: function () {
			let titleString = "wdw_cardEdition" + window.arguments[0].editionMode + "Title";
			document.title = cardbookRepository.extension.localeData.localizeMessage(titleString, [window.arguments[0].cardIn.fn]);
			if (window.arguments[0].editionMode == "ViewResult") {
				document.getElementById('addressbookMenulistReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').value = cardbookRepository.extension.localeData.localizeMessage("addToAddressbook");
				document.getElementById('addressbookMenulistReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesmodernGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('keyReadOnlyHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteToolsVbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'false');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'false');
				document.getElementById('saveEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('classicalRows').setAttribute('hidden', 'true');
				document.getElementById('modernRows').setAttribute('hidden', 'true');
				document.getElementById('helpTab').setAttribute("collapsed", true);
			} else if (window.arguments[0].editionMode == "ViewResultHideCreate") {
				document.getElementById('addressbookMenulistReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('addressbookMenulistReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesmodernGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('keyReadOnlyHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteToolsVbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'false');
				document.getElementById('saveEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonDown').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonUp').setAttribute('hidden', 'true');
				document.getElementById('classicalRows').setAttribute('hidden', 'true');
				document.getElementById('modernRows').setAttribute('hidden', 'true');
				document.getElementById('helpTab').setAttribute("collapsed", true);
			} else if (window.arguments[0].editionMode == "ViewContact" || window.arguments[0].editionMode == "ViewList") {
				document.getElementById('addressbookMenulistReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('addressbookMenulistReadOnlyGroupbox').removeAttribute('hidden');
				document.getElementById('addressbookHeader').value = cardbookRepository.extension.localeData.localizeMessage("addressbookHeader");
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('fnTextBox').setAttribute('class', 'indent');
				document.getElementById('categoriesmodernGroupbox').removeAttribute('hidden');
				document.getElementById('categoriesReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadOnlyGroupbox').removeAttribute('hidden');
				document.getElementById('listReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadOnlyHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteToolsVbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('defaultCardImage').removeAttribute('context');
				document.getElementById('defaultCardImage').removeAttribute('ondblclick');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('saveEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonDown').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonUp').setAttribute('hidden', 'true');
				document.getElementById('helpTab').setAttribute("collapsed", true);
				var panesView = cardbookRepository.cardbookPrefs["panesView"];
				if (panesView == "classical") {
					document.getElementById('modernRows').setAttribute('hidden', 'true');
				} else {
					document.getElementById('classicalRows').setAttribute('hidden', 'true');
				}
				document.getElementById('readWriteTypesVbox').setAttribute('hidden', 'true');
			} else if (window.arguments[0].editionMode == "EditContact" || window.arguments[0].editionMode == "EditList") {
				document.getElementById('addressbookMenulistReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').value = cardbookRepository.extension.localeData.localizeMessage("addressbookHeader");
				document.getElementById('addressbookMenulistReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesmodernGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('keyReadOnlyHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteToolsVbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('classicalRows').setAttribute('hidden', 'true');
				document.getElementById('modernRows').setAttribute('hidden', 'true');
				document.getElementById('helpTab').setAttribute("collapsed", true);
			} else if (window.arguments[0].editionMode == "CreateContact" || window.arguments[0].editionMode == "CreateList") {
				document.getElementById('addressbookMenulistReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').value = cardbookRepository.extension.localeData.localizeMessage("addToAddressbook");
				document.getElementById('addressbookMenulistReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesmodernGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('keyReadOnlyHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteToolsVbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('classicalRows').setAttribute('hidden', 'true');
				document.getElementById('modernRows').setAttribute('hidden', 'true');
				document.getElementById('helpTab').setAttribute("collapsed", true);
			} else if (window.arguments[0].editionMode == "AddEmail") {
				wdw_cardEdition.emailToAdd = wdw_cardEdition.workingCard.email[0];
				document.getElementById('addressbookMenulistReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').value = cardbookRepository.extension.localeData.localizeMessage("addToAddressbook");
				document.getElementById('addressbookMenulistReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('existingDataGroupbox').removeAttribute('hidden');
				document.getElementById('contactMenulist').removeAttribute('hidden');
				document.getElementById('categoriesmodernGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('keyReadOnlyHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteToolsVbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('classicalRows').setAttribute('hidden', 'true');
				document.getElementById('modernRows').setAttribute('hidden', 'true');
				document.getElementById('helpTab').setAttribute("collapsed", true);
			} else if (window.arguments[0].editionMode == "EditTemplate") {
				document.getElementById('addressbookMenulistReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').value = cardbookRepository.extension.localeData.localizeMessage("addressbookHeader");
				document.getElementById('addressbookMenulistReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesmodernGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('keyReadOnlyHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteToolsVbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('classicalRows').setAttribute('hidden', 'true');
				document.getElementById('modernRows').setAttribute('hidden', 'true');
				document.getElementById('helpTab').setAttribute("collapsed", false);
				document.getElementById('applyTemplateButton').setAttribute('hidden', 'true');
			}
			if (window.arguments[0].cardIn.isAList) {
				document.getElementById('contactGroupbox').setAttribute('hidden', 'true');
				wdw_cardEdition.expandButton(document.getElementById('expandPersonalImage'), false);
				wdw_cardEdition.expandButton(document.getElementById('expandOrgImage'), false);
				document.getElementById('firstTabSpacer').setAttribute('hidden', 'true');
				document.getElementById('preferDisplayNameCheckBox').setAttribute('hidden', 'true');
			} else {
				document.getElementById('contactGroupbox').removeAttribute('hidden');
				wdw_cardEdition.expandButton(document.getElementById('expandPersonalImage'), true);
				wdw_cardEdition.expandButton(document.getElementById('expandOrgImage'), true);
				document.getElementById('firstTabSpacer').removeAttribute('hidden');
				document.getElementById('preferDisplayNameCheckBox').removeAttribute('hidden');
			}
			document.getElementById('lastnameTextBox').focus();
			document.getElementById('addressbookMenulistLabel').scrollIntoView();
			wdw_cardEdition.autoComputeFn(document.getElementById('autoComputeFnButton'), cardbookRepository.cardbookPrefs["autoComputeFn"]);
		},

		setFieldsAsDefault: function () {
			cardbookRepository.cardbookUtils.setEditionFields(wdw_cardEdition.editionFields);
			document.getElementById('fieldsMenupopup').hidePopup();
		},

		checkEditionFields: function (aField) {
			if (wdw_cardEdition.editionFields[0][0] == "allFields") {
				return true;
			}
			for (let field of wdw_cardEdition.editionFields) {
				if (field[2] == aField) {
					return field[0];
				}
			}
			return false;
		},

		loadFieldSelector: function () {
			cardbookElementTools.deleteRows('fieldsMenupopup');

			let listRows = document.getElementById('fieldsMenupopup');
			for (let field of wdw_cardEdition.editionFields) {
				let item = document.createXULElement("menuitem");
				item.setAttribute("class", "menuitem-iconic cardbook-item");
				item.setAttribute("label", field[1]);
				item.setAttribute("value", field[2]);
				item.setAttribute("type", "checkbox");
				if (field[0]) {
					item.setAttribute("checked", "true");
				}
				listRows.appendChild(item);
			}
			let menuseparator = document.createXULElement("menuseparator");
			listRows.appendChild(menuseparator);
			let fieldsButton = document.createXULElement("menuitem");
			fieldsButton.setAttribute("class", "menuitem-iconic");
			fieldsButton.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("fieldsButtonLabel"));
			fieldsButton.addEventListener("command", wdw_cardEdition.setFieldsAsDefault, false);
			listRows.appendChild(fieldsButton);

			cardbookWindowUtils.updateComplexMenulist('fields', 'fieldsMenupopup');
		},

		changeEditionFields: function () {
			let myMenupopup = document.getElementById('fieldsMenupopup');
			let itemsList = myMenupopup.querySelectorAll("menuitem.cardbook-item");

			for (let item of itemsList) {
				for (let i = 0; i < wdw_cardEdition.editionFields.length; i++) {
					if (item.getAttribute("value") == wdw_cardEdition.editionFields[i][2]) {
						wdw_cardEdition.editionFields[i][0] = item.getAttribute("checked") == "true";
						break;
					}
				}
			}
			let readonly = cardbookRepository.cardbookPreferences.getReadOnly(wdw_cardEdition.workingCard.dirPrefId);
			cardbookWindowUtils.display40(wdw_cardEdition.workingCard.version, readonly);
			cardbookWindowUtils.displayDates(wdw_cardEdition.workingCard.version, readonly);
			wdw_cardEdition.loadEditionFields();
		},

		loadEditionFields: function () {
			switch(window.arguments[0].editionMode) {
				case "ViewResultHideCreate":
				case "ViewContact":
				case "ViewList":
					wdw_cardEdition.showPane('generalTabPanel');
					return;
			}

			if (wdw_cardEdition.checkEditionFields("addressbook") && window.arguments[0].editionMode != "EditTemplate") {
				document.getElementById('addressbookMenulistReadWriteGroupbox').removeAttribute('hidden');
			} else {
				document.getElementById('addressbookMenulistReadWriteGroupbox').setAttribute('hidden', 'true');
			}
			if (wdw_cardEdition.checkEditionFields("categories") || wdw_cardEdition.workingCard.categories.length != 0) {
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
			} else {
				document.getElementById('categoriesReadWriteGroupbox').setAttribute('hidden', 'true');
			}
			if (wdw_cardEdition.checkEditionFields("note") || wdw_cardEdition.workingCard.note) {
				document.getElementById('noteTab').removeAttribute('hidden');
			} else {
				document.getElementById('noteTab').setAttribute('hidden', 'true');
			}
			if (wdw_cardEdition.checkEditionFields("list") && window.arguments[0].editionMode != "EditTemplate") {
				document.getElementById('listTab').removeAttribute('hidden');
			} else {
				document.getElementById('listTab').setAttribute('hidden', 'true');
			}
			if (wdw_cardEdition.checkEditionFields("key") && window.arguments[0].editionMode != "EditTemplate") {
				document.getElementById('keyTab').removeAttribute('hidden');
			} else {
				document.getElementById('keyTab').setAttribute('hidden', 'true');
			}
			if (wdw_cardEdition.checkEditionFields("fn") || wdw_cardEdition.workingCard.fn) {
				document.getElementById('fnGroupbox').removeAttribute('hidden');
			} else {
				document.getElementById('fnGroupbox').setAttribute('hidden', 'true');
			}

			for (let field of cardbookRepository.allColumns.personal) {
				if (cardbookRepository.dateFields.includes(field) || cardbookRepository.newFields.includes(field)) {
					// already done
					continue;
				}
				if (wdw_cardEdition.checkEditionFields(field) || wdw_cardEdition.workingCard[field]) {
					document.getElementById(field + 'Row').removeAttribute('hidden');
				} else {
					document.getElementById(field + 'Row').setAttribute('hidden', 'true');
				}
			}
			if (document.getElementById("firstnameRow").hasAttribute('hidden') ||
				document.getElementById("firstnameTextBox").hasAttribute('hidden') ||
				document.getElementById("lastnameRow").hasAttribute('hidden') ||
				document.getElementById("lastnameTextBox").hasAttribute('hidden'))	{
				document.getElementById('cardbookSwitchButtonUp').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonDown').setAttribute('hidden', 'true');
			} else {
				document.getElementById('cardbookSwitchButtonUp').removeAttribute('hidden');
				document.getElementById('cardbookSwitchButtonDown').removeAttribute('hidden');
			}
			if (!wdw_cardEdition.workingCard.isAList) {
				for (let field of cardbookRepository.multilineFields) {
					if (wdw_cardEdition.checkEditionFields(field) || document.getElementById(field + '_0_valueBox').value) {
						document.getElementById(field + 'Groupbox').removeAttribute('hidden');
					} else {
						document.getElementById(field + 'Groupbox').setAttribute('hidden', 'true');
					}
				}
				for (let field of ['event']) {
					if (wdw_cardEdition.checkEditionFields(field) || document.getElementById(field + '_0_valueBox').value || document.getElementById(field + '_0_valueDateBox').value) {
						document.getElementById(field + 'Groupbox').removeAttribute('hidden');
					} else {
						document.getElementById(field + 'Groupbox').setAttribute('hidden', 'true');
					}
				}
				for (let field of ['tz']) {
					let ABType = cardbookRepository.cardbookPreferences.getType(wdw_cardEdition.workingCard.dirPrefId);
					if (ABType.startsWith("GOOGLE") || ABType == "APPLE" || ABType == "OFFICE365" || ABType == "YAHOO") {
						document.getElementById(field + 'Groupbox').setAttribute('hidden', 'true');
					} else if (wdw_cardEdition.checkEditionFields(field) || document.getElementById(field + '_0_menulistTz').value || document.getElementById(field + '_0_menulistTz').value) {
						document.getElementById(field + 'Groupbox').removeAttribute('hidden');
					} else {
						document.getElementById(field + 'Groupbox').setAttribute('hidden', 'true');
					}
				}
			}
			for (let type of ['personal', 'org']) {
				for (let i = 0; i < cardbookRepository.customFields[type].length; i++) {
					if (wdw_cardEdition.checkEditionFields(cardbookRepository.customFields[type][i][0]) || document.getElementById('customField' + i + type + 'TextBox').value) {
						document.getElementById('customField' + i + type + 'Row').removeAttribute('hidden');
					} else {
						document.getElementById('customField' + i + type + 'Row').setAttribute('hidden', 'true');
					}
				}
			}
			var orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
			if (orgStructure) {
				let myOrgStructure = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
				for (let i = 0; i < myOrgStructure.length; i++) {
					if (wdw_cardEdition.checkEditionFields('org_' + myOrgStructure[i]) || document.getElementById('orgTextBox_' + i).value) {
						document.getElementById('orgRow_' + i).removeAttribute('hidden');
					} else {
						document.getElementById('orgRow_' + i).setAttribute('hidden', 'true');
					}
				}
			} else {
				if (wdw_cardEdition.checkEditionFields('org') || document.getElementById('orgTextBox_0').value) {
					document.getElementById('orgRow_0').removeAttribute('hidden');
				} else {
					document.getElementById('orgRow_0').setAttribute('hidden', 'true');
				}
			}
			for (let field of ['title', 'role']) {
				if (wdw_cardEdition.checkEditionFields(field) || wdw_cardEdition.workingCard[field]) {
					document.getElementById(field + 'Row').removeAttribute('hidden');
				} else {
					document.getElementById(field + 'Row').setAttribute('hidden', 'true');
				}
			}
			for (let field of cardbookRepository.adrElements) {
				let partialIndex = cardbookRepository.adrElements.indexOf(field);
				let found = false;
				for (let adr of wdw_cardEdition.workingCard.adr) {
					if (adr[0][partialIndex] != "") {
						found = true;
						break;
					}
				}
				if (wdw_cardEdition.checkEditionFields(field) || found) {
					document.getElementById(field + 'Row').removeAttribute('hidden');
				} else {
					document.getElementById(field + 'Row').setAttribute('hidden', 'true');
				}
			}
			
			cardbookWindowUtils.updateComplexMenulist('fields', 'fieldsMenupopup');
			wdw_cardEdition.showPane('generalTabPanel');
		},

		setConvertButtons: function () {
			let forceHide = false;
			switch(window.arguments[0].editionMode) {
				case "ViewResult":
				case "ViewResultHideCreate":
				case "ViewContact":
				case "ViewList":
					forceHide = true;
			}
			let itemsList = document.getElementById("rightPaneDownHbox2").querySelectorAll("button.cardbookProcessClass");
			for (let item of itemsList) {
				if (forceHide) {
					item.setAttribute('hidden', 'true');
				} else {
					let code = item.id.replace("ProcessButton", "");
					for (let field of wdw_cardEdition.editionFields) {
						if (field[0] == "allFields") {
							item.setAttribute('hidden', 'true');
							break;
						} else if (code == field[2]) {
							if (field[3] != "") {
								item.removeAttribute('hidden');
							} else {
								item.setAttribute('hidden', 'true');
							}
							break;
						}
					}
				}
			}
		},

		setConvertFunction: function (aEvent) {
			let button = aEvent.target;
			if (!button.hasAttribute('autoConvertField')) {
				button.setAttribute('autoConvertField', 'true');
				button.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("dontAutoConvertField"));
			} else {
				button.removeAttribute('autoConvertField');
				button.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("autoConvertField"));
			}
		},

		onInputField: function (aEvent) {
			let textbox = aEvent.target;
			let field = textbox.getAttribute('data-field-name');
			let button = document.getElementById(`${field}ProcessButton`);
			if (!button.hidden && button.hasAttribute("autoConvertField")) {
				let tmpArray = wdw_cardEdition.editionFields.filter(x => x[2] == field);
				let convertionFunction = tmpArray[0][4];
				let value = cardbookRepository.cardbookUtils.convertField(convertionFunction, textbox.value);
				textbox.value = value;
			}
			let orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
			let allOrg = [];
			if (orgStructure != "") {
				allOrg = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
			}
			if ([ 'lastname', 'firstname', 'othername', 'prefixname', 'suffixname', 'nickname' ].includes(field) ||
				(allOrg.length == 0 && cardbookRepository.allColumns.org.includes(field)) ||
				(allOrg.length != 0 && allOrg.includes(field.replace(/^org\./, "")))) {
				wdw_cardEdition.setDisplayName();
			}
		},

		loadHelpTab: function () {
			let orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
			let allOrg = [];
			if (orgStructure != "") {
				allOrg = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
			}
			document.getElementById('formulaMemberLabel1').value = "{{1}} : " + cardbookRepository.extension.localeData.localizeMessage("prefixnameLabel");
			document.getElementById('formulaMemberLabel2').value = "{{2}} : " + cardbookRepository.extension.localeData.localizeMessage("firstnameLabel");
			document.getElementById('formulaMemberLabel3').value = "{{3}} : " + cardbookRepository.extension.localeData.localizeMessage("othernameLabel");
			document.getElementById('formulaMemberLabel4').value = "{{4}} : " + cardbookRepository.extension.localeData.localizeMessage("lastnameLabel");
			document.getElementById('formulaMemberLabel5').value = "{{5}} : " + cardbookRepository.extension.localeData.localizeMessage("suffixnameLabel");
			document.getElementById('formulaMemberLabel6').value = "{{6}} : " + cardbookRepository.extension.localeData.localizeMessage("nicknameLabel");

			let count = 6;
			let table = document.getElementById('formulaSampleTable');
			if (allOrg.length == 0) {
				count++;
				let row = cardbookElementTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
				let labelData = cardbookElementTools.addHTMLTD(row, 'formulaMemberLabel' + count + '.1');
				let label = cardbookElementTools.addLabel(labelData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + cardbookRepository.extension.localeData.localizeMessage("orgLabel"), null, {});		
			} else {
				for (let org of allOrg) {
					count++;
					let row = cardbookElementTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
					let labelData = cardbookElementTools.addHTMLTD(row, 'formulaMemberLabel' + count + '.1');
					let label = cardbookElementTools.addLabel(labelData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + org, null, {});
				}
			}
			count++;
			let rowTitle = cardbookElementTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
			let titleData = cardbookElementTools.addHTMLTD(rowTitle, 'formulaMemberLabel' + count + '.2');
			let labelTitle = cardbookElementTools.addLabel(titleData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + cardbookRepository.extension.localeData.localizeMessage("titleLabel"), null, {});
			count++;
			let rowRole = cardbookElementTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
			let roleData = cardbookElementTools.addHTMLTD(rowRole, 'formulaMemberLabel' + count + '.3');
			let labelRole = cardbookElementTools.addLabel(roleData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + cardbookRepository.extension.localeData.localizeMessage("roleLabel"), null, {});
		},

		setEditionFields: function () {
			wdw_cardEdition.editionFields = cardbookRepository.cardbookUtils.getEditionFields();
		},

		loadDefaultVersion: function () {
			if (wdw_cardEdition.workingCard.version == "") {
				var myDirPrefId = document.getElementById('addressbookMenulist').value;
				document.getElementById("versionTextBox").value = cardbookRepository.cardbookPreferences.getVCardVersion(myDirPrefId);
				wdw_cardEdition.workingCard.version = document.getElementById("versionTextBox").value;
			} else {
				document.getElementById("versionTextBox").value = wdw_cardEdition.workingCard.version;
			}
		},

		removeContacts: function () {
			document.getElementById('contactMenulist').selectedIndex = 0;
			cardbookElementTools.deleteRows('contactMenupopup');
			wdw_cardEdition.contactNotLoaded = true;
		},

		loadContacts: function () {
			if (wdw_cardEdition.contactNotLoaded) {
				var myPopup = document.getElementById("contactMenupopup");
				var myAddressBookId = document.getElementById('addressbookMenulist').value;
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", "");
				menuItem.setAttribute("value", "");
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				myPopup.appendChild(menuItem);
				document.getElementById('contactMenulist').selectedIndex = 0;
				var mySortedContacts = [];
				for (let card of cardbookRepository.cardbookDisplayCards[myAddressBookId].cards) {
					if (!card.isAList) {
						mySortedContacts.push([card.fn, card.uid]);
					}
				}
				cardbookRepository.cardbookUtils.sortMultipleArrayByString(mySortedContacts,0,1);
				for (var i = 0; i < mySortedContacts.length; i++) {
					var menuItem = document.createXULElement("menuitem");
					menuItem.setAttribute("label", mySortedContacts[i][0]);
					menuItem.setAttribute("value", mySortedContacts[i][1]);
					menuItem.setAttribute("class", "menuitem-iconic");
					menuItem.setAttribute("type", "radio");
					myPopup.appendChild(menuItem);
				}
				wdw_cardEdition.contactNotLoaded = false;
			}
		},

		changeAddressbook: async function () {
			wdw_cardEdition.removeContacts();
			document.getElementById('dirPrefIdTextBox').value = document.getElementById('addressbookMenulist').value;
			if (window.arguments[0].editionMode == "AddEmail") {
				wdw_cardEdition.workingCard = null;
				wdw_cardEdition.workingCard = new cardbookCardParser();
				await wdw_cardEdition.cloneCard(window.arguments[0].cardIn, wdw_cardEdition.workingCard);
			}
			wdw_cardEdition.loadDefaultVersion();

			// keep the current changes
			var myOutCard = new cardbookCardParser();
			await wdw_cardEdition.calculateResult(myOutCard);
			// convertion if AB changed
			var myTargetName = cardbookRepository.cardbookPreferences.getName(myOutCard.dirPrefId);
			var myTargetVersion = cardbookRepository.cardbookPreferences.getVCardVersion(myOutCard.dirPrefId);
			var mySourceDateFormat = cardbookRepository.getDateFormat(wdw_cardEdition.workingCard.dirPrefId, cardbookRepository.cardbookPreferences.getVCardVersion(wdw_cardEdition.workingCard.dirPrefId));
			var myTargetDateFormat = cardbookRepository.getDateFormat(myOutCard.dirPrefId, myTargetVersion);
			if (cardbookRepository.cardbookUtils.convertVCard(myOutCard, myTargetName, myTargetVersion, mySourceDateFormat, myTargetDateFormat)) {
				cardbookRepository.writePossibleCustomFields();
			}
			
			await wdw_cardEdition.cloneCard(myOutCard, wdw_cardEdition.workingCard);
			myOutCard = null;
			wdw_cardEdition.workingCard.dirPrefId = document.getElementById('addressbookMenulist').value;

			wdw_cardEdition.loadDateFormatLabels();
			wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
		},

		changeContact: async function () {
			var myDirPrefId = document.getElementById('addressbookMenulist').value;
			var myUid = document.getElementById('contactMenulist').value;
			if (myUid) {
				wdw_cardEdition.workingCard = null;
				wdw_cardEdition.workingCard = new cardbookCardParser();
				await wdw_cardEdition.cloneCard(cardbookRepository.cardbookCards[myDirPrefId+"::"+myUid], wdw_cardEdition.workingCard);
				if (window.arguments[0].editionMode == "AddEmail" ) {
					wdw_cardEdition.workingCard.email.push(wdw_cardEdition.emailToAdd);
				}
			} else {
				wdw_cardEdition.workingCard = null;
				wdw_cardEdition.workingCard = new cardbookCardParser();
				await wdw_cardEdition.cloneCard(window.arguments[0].cardIn, wdw_cardEdition.workingCard);
			}
			wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
		},

		switchLastnameAndFirstname: function () {
			var tmpValue = document.getElementById('lastnameTextBox').value;
			document.getElementById('lastnameTextBox').value = document.getElementById('firstnameTextBox').value;
			document.getElementById('firstnameTextBox').value = tmpValue;
			document.getElementById('lastnameTextBox').focus();
			document.getElementById('lastnameTextBox').dispatchEvent(new Event('input'));
			document.getElementById('firstnameTextBox').dispatchEvent(new Event('input'));
		},

		autoComputeFn: function (aButton, aForce) {
			if ("undefined" == typeof(aForce)) {
				if (!aButton.hasAttribute('autoComputeFn')) {
					aButton.setAttribute('autoComputeFn', 'true');
					aButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("dontAutoComputeFn"));
				} else {
					aButton.removeAttribute('autoComputeFn');
					aButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("autoComputeFn"));
				}
				cardbookRepository.cardbookPreferences.setBoolPref("autoComputeFn", !cardbookRepository.cardbookPrefs["autoComputeFn"]);
			} else {
				if (aForce == true) {
					aButton.setAttribute('autoComputeFn', 'true');
					aButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("dontAutoComputeFn"));
				} else {
					aButton.removeAttribute('autoComputeFn');
					aButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("autoComputeFn"));
				}
			}
		},

		expandButton: function (aButton, aForce) {
			let table = document.getElementById(aButton.id.replace(/^expand/, "").replace(/Image$/, "").toLowerCase() + "Table");
			if ("undefined" == typeof(aForce)) {
				if (!aButton.getAttribute('expanded')) {
					table.removeAttribute('hidden');
					aButton.setAttribute('expanded', 'true');
				} else {
					table.setAttribute('hidden', 'true');
					aButton.removeAttribute('expanded');
				}
			} else {
				if (aForce == true) {
					table.removeAttribute('hidden');
					aButton.setAttribute('expanded', 'true');
				} else {
					table.setAttribute('hidden', 'true');
					aButton.removeAttribute('expanded');
				}
			}				
		},

		unsetWrongValidation: function () {
			cardbookNotifications.setNotification(cardEditionNotification.errorNotifications, "OK");
		},

		displayCard: function (aCard) {
			wdw_cardEdition.clearCard();
			var aReadOnly = cardbookRepository.cardbookPreferences.getReadOnly(aCard.dirPrefId);
			cardbookWindowUtils.displayCard(aCard, aReadOnly);
			
			// specific
			document.getElementById('addressbookTextBox').value = cardbookRepository.cardbookPreferences.getName(aCard.dirPrefId);

			if (!aReadOnly) {
				wdw_cardEdition.loadCategories(aCard.categories);
				cardbookElementTools.loadGender("genderMenupopup", "genderMenulist", wdw_cardEdition.workingCard.gender);
				cardbookWindowUtils.displayPref(aCard.version);
				var dateFormat = cardbookRepository.getDateFormat(wdw_cardEdition.workingCard.dirPrefId, wdw_cardEdition.workingCard.version);
				for (var field of cardbookRepository.dateFields) {
					if (document.getElementById(field + 'Datepicker')) {
						document.getElementById(field + 'Datepicker').value = cardbookRepository.cardbookDates.getDateStringFromVCardDate(aCard[field], dateFormat);
					}
				}
			} else {
				let aParent = document.getElementById('categoriesmodernRow');
				cardbookElementTools.addCategoriesRow(aParent, cardbookRepository.cardbookUtils.sortArrayByString(aCard.categories,1));
				cardbookWindowUtils.adjustFields();
				document.getElementById('dirPrefIdTextBox').setAttribute('hidden', 'true');
				document.getElementById('uidTextBox').setAttribute('hidden', 'true');
				document.getElementById('versionTextBox').setAttribute('hidden', 'true');
				document.getElementById('othersTextBox').setAttribute('hidden', 'true');
			}
			document.getElementById('preferDisplayNameCheckBox').checked = true;
			for (let email of wdw_cardEdition.workingCard.emails) {
				if (cardbookRepository.cardbookPreferDisplayNameIndex[email.toLowerCase()]) {
					document.getElementById('preferDisplayNameCheckBox').checked = false;
					break;
				}
			}

			wdw_cardEdition.loadDateFormatLabels();
			wdw_cardEdition.loadEditionFields();
			wdw_cardEdition.loadFieldSelector();
			wdw_cardEdition.setConvertButtons()
		},

		clearCard: function () {
			cardbookWindowUtils.clearCard();
			for (let type of cardbookRepository.multilineFields) {
				cardbookElementTools.deleteRows(type + 'Groupbox');
			}
			cardbookElementTools.deleteRows('eventGroupbox');
			cardbookElementTools.deleteRows('tzGroupbox');
			document.getElementById('genderMenulist').selectedIndex = 0;
			wdw_cardEdition.loadCategories([]);
		},

		getOrg: function (aTrimArray) {
			let myOrg = [];
			let result = "";
			let i = 0;
			while (true) {
				if (document.getElementById('orgRow_' + i)) {
					myOrg.push(cardbookRepository.cardbookUtils.escapeStringSemiColon(document.getElementById('orgTextBox_' + i).value.trim()));
					i++;
				} else {
					break;
				}
			}
			if (aTrimArray) {
				// trim the array
				for (let i = myOrg.length-1; i >= 0; i--) {
					if (myOrg[i] == "") {
						myOrg.pop();
					} else {
						break;
					}
				}
			}
			result = cardbookRepository.cardbookUtils.unescapeStringSemiColon(myOrg.join(";"));
			return result;
		},

		setDisplayName: function () {
			if (document.getElementById('autoComputeFnButton').hasAttribute('autoComputeFn')) {
				var myNewOrg = wdw_cardEdition.getOrg(false);
				var myNewFn = cardbookRepository.cardbookUtils.getDisplayedNameFromFormula(document.getElementById('dirPrefIdTextBox').value, [document.getElementById('prefixnameTextBox').value.trim(),
																	document.getElementById('firstnameTextBox').value.trim(),
																	document.getElementById('othernameTextBox').value.trim(),
																	document.getElementById('lastnameTextBox').value.trim(),
																	document.getElementById('suffixnameTextBox').value.trim(),
																	document.getElementById('nicknameTextBox').value.trim()],
																	[myNewOrg,
																	document.getElementById('titleTextBox').value.trim(),
																	document.getElementById('roleTextBox').value.trim()]);
				document.getElementById('fnTextBox').value = myNewFn;
				wdw_cardEdition.workingCard.lastname = document.getElementById('lastnameTextBox').value.trim();
				wdw_cardEdition.workingCard.firstname = document.getElementById('firstnameTextBox').value.trim();
				wdw_cardEdition.workingCard.othername = document.getElementById('othernameTextBox').value.trim();
				wdw_cardEdition.workingCard.suffixname = document.getElementById('suffixnameTextBox').value.trim();
				wdw_cardEdition.workingCard.prefixname = document.getElementById('prefixnameTextBox').value.trim();
				wdw_cardEdition.workingCard.nickname = document.getElementById('nicknameTextBox').value.trim();
				wdw_cardEdition.workingCard.org = myNewOrg;
				wdw_cardEdition.workingCard.fn = myNewFn;
			}
		},

		loadDateFormatLabels: function () {
			var dateFormat = cardbookRepository.cardbookDates.getDateFormatLabel(wdw_cardEdition.workingCard.dirPrefId, wdw_cardEdition.workingCard.version);
			myD = cardbookRepository.extension.localeData.localizeMessage("dateFormatsDLabel");
			myM = cardbookRepository.extension.localeData.localizeMessage("dateFormatsMLabel");
			myY = cardbookRepository.extension.localeData.localizeMessage("dateFormatsYLabel");
			for (var field of cardbookRepository.dateFields) {
				if (document.getElementById(field + 'DatepickerLabel')) {
					document.getElementById(field + 'DatepickerLabel').value = cardbookRepository.extension.localeData.localizeMessage(field + "Label") + " (" + dateFormat.replace(/D/g, myD).replace(/M/g, myM).replace(/Y/g, myY) + ")";
				}
			}
		},

		loadCountries: function () {
			var countryList = document.getElementById('countryMenulist');
			var countryPopup = document.getElementById('countryMenupopup');
			cardbookElementTools.loadCountries(countryPopup, countryList, countryList.value, true, false);
		},

		cloneCard: async function (aSourceCard, aTargetCard) {
			// we need to keep the list flag as the normal cloneCard function may not find this information
			// for new cards
			await cardbookRepository.cardbookUtils.cloneCard(aSourceCard, aTargetCard);
			aTargetCard.isAList = aSourceCard.isAList;
		},

		startDrag: function (aEvent, aTreeChildren) {
			try {
				let treeName = "availableCardsTree";
				if (aTreeChildren.id == "availableCardsTreeChildren") {
					treeName = "availableCardsTree";
				} else if (aTreeChildren.id == "addedCardsTreeChildren") {
					treeName = "addedCardsTree";
				} else {
					return;
				}
				let uids = wdw_cardEdition.getSelectedCardsForList(treeName);
				for (let i = 0; i < uids.length; i++) {
					aEvent.dataTransfer.mozSetDataAt("text/x-moz-cardbook-id", uids[i], i);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardEdition.startDrag error : " + e, "Error");
			}
		},

		dragCards: function (aEvent, aTreeName) {
			try {
				aEvent.preventDefault();
				for (var i = 0; i < aEvent.dataTransfer.mozItemCount; i++) {
					var types = aEvent.dataTransfer.mozTypesAt(i);
					for (var j = 0; j < types.length; j++) {
						if (types[j] == "text/x-moz-cardbook-id") {
							var myId = aEvent.dataTransfer.mozGetDataAt("text/x-moz-cardbook-id", i);
							if (aTreeName == "availableCardsTree") {
								wdw_cardEdition.removeUidFromAdded(myId);
							} else if (aTreeName == "addedCardsTree") {
								wdw_cardEdition.addUidToAdded(myId);
							} else {
								return;
							}
						}
					}
				}
				wdw_cardEdition.sortCardsTreeCol('addedCardsTree', null, null);
				wdw_cardEdition.searchAvailableCards();
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardEdition.dragCards error : " + e, "Error");
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
						for (let category in cardbookRepository.cardbookNodeColors) {
							var color = cardbookRepository.cardbookNodeColors[category];
							cardbookRepository.createCssCategoryRules(styleSheet, 'category_' + cardbookRepository.cardbookUtils.formatCategoryForCss(category), color);
						}
						cardbookRepository.reloadCss(myStyleSheet);
						return;
					}
				}
			}
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
		
		load: async function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			cardBookEditionObserver.register();

			wdw_cardEdition.workingCard = {};
			wdw_cardEdition.workingCard = new cardbookCardParser();
			await wdw_cardEdition.cloneCard(window.arguments[0].cardIn, wdw_cardEdition.workingCard);

			wdw_cardEdition.loadEditionMode();
			wdw_cardEdition.setEditionFields();
			wdw_cardEdition.changePreviousNext();
			wdw_cardEdition.loadHelpTab();

			var ABList = document.getElementById('addressbookMenulist');
			var ABPopup = document.getElementById('addressbookMenupopup');
			cardbookElementTools.loadAddressBooks(ABPopup, ABList, wdw_cardEdition.workingCard.dirPrefId, true, false,
													(window.arguments[0].editionMode == "ViewContact" || window.arguments[0].editionMode == "ViewList"), false, false);
			// the dirPrefId may be different from the one loaded in case of a complex search
			wdw_cardEdition.workingCard.dirPrefId = document.getElementById('addressbookMenulist').value;
			
			wdw_cardEdition.loadCssRules();
			wdw_cardEdition.loadDefaultVersion();
			wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
			
			wdw_cardEdition.cardRegion = cardbookRepository.cardbookUtils.getCardRegion(wdw_cardEdition.workingCard);
			
			// address panel behaviour
			function firePopupShownAdr(event) {
				//to avoid this would be fired by autocomplete popups
				if (event.target.id == 'adrPanel') {
					document.getElementById('streetTextBox').focus();
				}
			};
			document.getElementById('adrPanel').addEventListener("popupshown", firePopupShownAdr, false);
			// save the information in case of a hiding (especially when another window opens up)
			function firePopupHidingAdr() {
				cardbookWindowUtils.validateAdrPanel();
				cardbookWindowUtils.cancelAdrPanel();
			};
			document.getElementById('adrPanel').addEventListener("popuphiding", firePopupHidingAdr, false);
			function firePopupHiddenAdr(event) {
				//to avoid this would be fired by autocomplete popups
				if (event.target.id == 'adrPanel') {
					var myId = wdw_cardEdition.currentAdrId.join("_");
					document.getElementById(myId).focus();
				}
			};
			document.getElementById('adrPanel').addEventListener("popuphidden", firePopupHiddenAdr, false);
		},

		saveMailPopularity: function () {
			let i = 0;
			while (true) {
				if (document.getElementById('emailproperty_' + i + '_Row')) {
					let email = document.getElementById('email_' + i + '_Textbox').value.toLowerCase();
					let emailValue = parseInt(document.getElementById('popularity_' + i + '_Textbox').value) || "0";
					cardbookIDBMailPop.updateMailPop(email, emailValue);
					i++;
				} else {
					break;
				}
			}
		},

		savePreferDisplayName: function () {
			let i = 0;
			while (true) {
				if (document.getElementById('emailproperty_' + i + '_Row')) {
					let email = document.getElementById('email_' + i + '_Textbox').value;
					if (document.getElementById("preferDisplayNameCheckBox").checked == true) {
						cardbookIDBPrefDispName.removePrefDispName(email);
					} else {
						cardbookIDBPrefDispName.addPrefDispName({email: email});
					}
					i++;
				} else {
					break;
				}
			}
		},

		updateFormHistory: function (aField) {
			let myValue = document.getElementById(aField).value;
			if (myValue == "") {
				return;
			}
			let data = {op: "add", fieldname: aField, value: myValue};
			return new Promise((resolve, reject) => {
				let handlers = {
					handleError(error) {
						console.log(error);
					},
					handleCompletion(reason) {
						resolve();
					}
				};
				FormHistory.update(data, handlers);
			});
		},

		updateFormFields: function () {
			// first static fields
			var fieldHistorized = [ 'locality', 'region', 'postalCode', 'title', 'role' ];
			for (let field of fieldHistorized) {
				wdw_cardEdition.updateFormHistory(field + 'TextBox');
			}
			// then dynamic fields
			var i = 0;
			while (true) {
				if (document.getElementById('orgTextBox_' + i)) {
					wdw_cardEdition.updateFormHistory('orgTextBox_' + i);
					i++;
				} else {
					break;
				}
			}
		},

		calculateResult: async function (aCard) {
			await wdw_cardEdition.cloneCard(wdw_cardEdition.workingCard, aCard);
			aCard.dirPrefId = document.getElementById('addressbookMenulist').value;
			let ABType = cardbookRepository.cardbookPreferences.getType(aCard.dirPrefId);

			aCard.version = document.getElementById("versionTextBox").value;
			aCard.categories = wdw_cardEdition.getCategories();
			
			aCard.org = wdw_cardEdition.getOrg(true);
			aCard.title = document.getElementById('titleTextBox').value.trim();
			aCard.role = document.getElementById('roleTextBox').value.trim();

			aCard.fn = document.getElementById('fnTextBox').value.trim();
			
			aCard.lastname = document.getElementById('lastnameTextBox').value.trim();
			aCard.firstname = document.getElementById('firstnameTextBox').value.trim();
			aCard.othername = document.getElementById('othernameTextBox').value.trim();
			aCard.suffixname = document.getElementById('suffixnameTextBox').value.trim();
			aCard.prefixname = document.getElementById('prefixnameTextBox').value.trim();
			aCard.nickname = document.getElementById('nicknameTextBox').value.trim();
			aCard.gender = document.getElementById('genderMenulist').value.trim();

			var dateFormat = cardbookRepository.getDateFormat(document.getElementById('dirPrefIdTextBox').value, document.getElementById('versionTextBox').value);
			for (var field of cardbookRepository.dateFields) {
				aCard[field] = cardbookRepository.cardbookDates.getVCardDateFromDateString(document.getElementById(field + 'Datepicker').value, dateFormat);
			}

			aCard.birthplace = document.getElementById('birthplaceTextBox').value.trim();
			aCard.deathplace = document.getElementById('deathplaceTextBox').value.trim();
			
			aCard.note = document.getElementById('noteTextBox').value.trim();

			for (let media of cardbookRepository.allColumns.media) {
				if (media == "photo") {
					aCard[media] = {types: [], value: "", URI: "", extension: "", attachmentId: ""};
					aCard[media].value = document.getElementById(media + 'URITextBox').value;
					aCard[media].extension = document.getElementById(media + 'ExtensionTextBox').value;
					if (document.getElementById(media + 'AttachmentIdTextBox')) {
						aCard[media].attachmentId = document.getElementById(media + 'AttachmentIdTextBox').value;
					}
				} else {
					aCard[media] = {types: [], value: "", URI: "", extension: ""};
					aCard[media].value = document.getElementById(media + 'URITextBox').value;
					aCard[media].extension = document.getElementById(media + 'ExtensionTextBox').value;
				}
			}

			for (let field of cardbookRepository.multilineFields) {
				aCard[field] = cardbookWindowUtils.getAllTypes(field, true);
			}
			aCard.tz = cardbookWindowUtils.getAllTz(true);

			var keys = cardbookWindowUtils.getAllKeys(true);
			var re = /[\n\u0085\u2028\u2029]|\r\n?/g;
			keys = keys.map(key => {
				key.value = key.value.replace(/-----(BEGIN|END) PGP PUBLIC KEY BLOCK-----/g, "").trim().replace(re, "\\r\\n"); //key.value.replaceAll("\n", "\\n").replaceAll("\r", "\\r");
				return key;
			});
			aCard.key = keys;

			var othersTemp1 = [];
			for (var i in cardbookRepository.customFields) {
				for (var j = 0; j < cardbookRepository.customFields[i].length; j++) {
					if (document.getElementById('customField' + cardbookRepository.customFields[i][j][2] + i + 'TextBox')) {
						var customValue = document.getElementById('customField' + cardbookRepository.customFields[i][j][2] + i + 'TextBox').value.trim();
						if (customValue) {
							othersTemp1.push(cardbookRepository.customFields[i][j][0] + ":" + customValue);
						}
					}
				}
			}
			var re = /[\n\u0085\u2028\u2029]|\r\n?/;
			var othersTemp3 = [];
			var othersTemp2 = document.getElementById('othersTextBox').value;
			if (othersTemp2) {
				othersTemp3 = othersTemp2.split(re);
			}
			aCard.others = othersTemp1.concat(othersTemp3);

			aCard.others = aCard.others.filter(element => !element.toUpperCase().startsWith(cardbookRepository.defaultEmailFormat));
			if (document.getElementById('PreferMailFormatPopup').value == "1") {
				aCard.others.push(cardbookRepository.defaultEmailFormat + ":FALSE");
			} else if (document.getElementById('PreferMailFormatPopup').value == "2") {
				aCard.others.push(cardbookRepository.defaultEmailFormat + ":TRUE");
			}

			var myPGNextNumber = cardbookRepository.cardbookTypes.rebuildAllPGs(aCard);
			var myEvents = cardbookWindowUtils.getAllEvents(true);
			cardbookRepository.cardbookUtils.addEventstoCard(aCard, myEvents, myPGNextNumber, dateFormat);

			// trying desesperately to find a Fn
			if (aCard.fn == "") {
				cardbookRepository.cardbookUtils.getDisplayedName(aCard, document.getElementById('dirPrefIdTextBox').value, [document.getElementById('prefixnameTextBox').value.trim(),
																document.getElementById('firstnameTextBox').value.trim(),
																document.getElementById('othernameTextBox').value.trim(),
																document.getElementById('lastnameTextBox').value.trim(),
																document.getElementById('suffixnameTextBox').value.trim(),
																document.getElementById('nicknameTextBox').value.trim()],
																[wdw_cardEdition.getOrg(false),
																document.getElementById('titleTextBox').value.trim(),
																document.getElementById('roleTextBox').value.trim()]);
			}
					
			if (aCard.isAList) {
				let members = [];
				for (let addedCardLine of wdw_cardEdition.cardbookeditlists.addedCardsTree) {
					if (addedCardLine[5] == "EMAIL") {
						members.push("mailto:" + addedCardLine[1]);
					} else {
						if (ABType == "OFFICE365") {
							if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+addedCardLine[0]]) {
								let card = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+addedCardLine[0]];
								for (let email of card.emails) {
									members.push("mailto:" + email);
								}
							}
						} else {
							members.push("urn:uuid:" + addedCardLine[0]);
						}
					}
				}
				cardbookRepository.cardbookUtils.addMemberstoCard(aCard, members, document.getElementById('kindTextBox').value.trim());
			}
		},

		getNextAndPreviousCard: function () {
			let result = {};
			let previous = 0;
			let next = 0;
			for (let index in cardbookRepository.displayedIds) {
				if (cardbookRepository.displayedIds[index] == window.arguments[0].cardIn.cbid) {
					previous = parseInt(index)-1;
					next = parseInt(index)+1;
					break;
				}
			}
			if (cardbookRepository.displayedIds[previous]) {
				result.previous = cardbookRepository.cardbookCards[cardbookRepository.displayedIds[previous]];
			}
			if (cardbookRepository.displayedIds[next]) {
				result.next = cardbookRepository.cardbookCards[cardbookRepository.displayedIds[next]];
			}
			return result;
		},

		changePreviousNext: function () {
			document.getElementById('previousEditButton').setAttribute('hidden', 'true');
			document.getElementById('nextEditButton').setAttribute('hidden', 'true');
			switch(window.arguments[0].editionMode) {
				case "ViewResult":
				case "ViewResultHideCreate":
				case "CreateContact":
				case "CreateList":
				case "AddEmail":
				case "EditTemplate":
					return;
			}
			document.getElementById('previousEditButton').setAttribute('hidden', 'true');
			document.getElementById('nextEditButton').setAttribute('hidden', 'true');
			let cards = wdw_cardEdition.getNextAndPreviousCard();
			if (cards.previous) {
				document.getElementById("previousEditButton").removeAttribute('hidden');
			}
			if (cards.next) {
				document.getElementById("nextEditButton").removeAttribute('hidden');
			}
		},

		changeContactFromOrder: async function (aOrder) {
			window.arguments[0].cardEditionAction = "SAVE";
			await wdw_cardEdition.saveFinal(false);
			window.arguments[0].cardEditionAction = "";
			let cards = wdw_cardEdition.getNextAndPreviousCard();
			window.arguments[0].cardIn = new cardbookCardParser();
			if (aOrder == "next") {
				await wdw_cardEdition.cloneCard(cards.next, window.arguments[0].cardIn);
			} else {
				await wdw_cardEdition.cloneCard(cards.previous, window.arguments[0].cardIn);
			}

			if (window.arguments[0].cardIn.isAList) {
				var myType = "List";
			} else {
				var myType = "Contact";
			}
			if (cardbookRepository.cardbookPreferences.getReadOnly(window.arguments[0].cardIn.dirPrefId)) {
				window.arguments[0].editionMode = "View" + myType;
			} else {
				window.arguments[0].editionMode = "Edit" + myType;
			}
			window.arguments[0].cardOut = {};
			await wdw_cardEdition.load();
		},

		validate: async function () {
			if (await wdw_cardEditionValidations.validateOffice365() &&
				wdw_cardEditionValidations.validateMailPopularity() &&
				wdw_cardEditionValidations.validateDateFields() &&
				wdw_cardEditionValidations.validateEvents() &&
				window.arguments[0].editionMode != "ViewContact" && 
				window.arguments[0].editionMode != "ViewList") {
				wdw_cardEdition.unsetWrongValidation();
				return true;
			} else {
				return false;
			}
		},

		saveFinal: async function (aClose = true) {
			if (await wdw_cardEdition.validate()) {
				var myOutCard = new cardbookCardParser();
				await wdw_cardEdition.calculateResult(myOutCard);

				wdw_cardEdition.saveMailPopularity();

				wdw_cardEdition.workingCard = null;
				wdw_cardEdition.updateFormFields();
				// no change, no save
				if (window.arguments[0].editionMode != "ViewResult" && window.arguments[0].editionMode != "ViewResultHideCreate") {
					cardbookRepository.cardbookUtils.sortArrayByString(window.arguments[0].cardIn.categories,1)
					var cardin = await cardbookRepository.cardbookUtils.cardToVcardData(window.arguments[0].cardIn);
					cardbookRepository.cardbookUtils.sortArrayByString(myOutCard.categories,1)
					var cardout = await cardbookRepository.cardbookUtils.cardToVcardData(myOutCard, false);
					if (cardin == cardout && window.arguments[0].cardIn.dirPrefId == myOutCard.dirPrefId) {
						if (aClose) {
							wdw_cardEdition.cancel();
						}
						cardbookRepository.cardbookUtils.notifyObservers("cardEdited");
						return;
					}
				}

				myOutCard.uid = myOutCard.uid.replace(/^urn:uuid:/i, "");
				if (cardbookRepository.cardbookPreferences.getUrnuuid(myOutCard.dirPrefId)) {
					myOutCard.uid = "urn:uuid:" + myOutCard.uid;
				}
				window.arguments[0].cardOut = myOutCard;

				if (window.arguments[0].editionMode == "AddEmail") {
					await wdw_cardEdition.cloneCard(window.arguments[0].cardOut, window.arguments[0].cardIn);
				}

				if (window.arguments[0].editionCallback) {
					window.arguments[0].editionCallback(window.arguments[0].cardIn, window.arguments[0].cardOut, window.arguments[0].editionMode);
				}
				cardBookEditionObserver.unregister();
				if (aClose) {
					wdw_cardEdition.closeWindow();
				}
			}
		},

		create: function () {
			window.arguments[0].cardEditionAction = "CREATE";
			wdw_cardEdition.saveFinal();
		},

		createAndReplace: function () {
			window.arguments[0].cardEditionAction = "CREATEANDREPLACE";
			wdw_cardEdition.saveFinal();
		},

		save: function () {
			window.arguments[0].cardEditionAction = "SAVE";
			wdw_cardEdition.saveFinal();
		},

		returnKey: function () {
			let focusedElement = document.commandDispatcher.focusedElement; 
			if (focusedElement.id == "addEmailInput") {
				wdw_cardEdition.modifyLists(focusedElement);
				return;
			} else if (window.arguments[0].editionMode == "ViewResult" || window.arguments[0].editionMode == "ViewResultHideCreate") {
				return;
			} else if (document.getElementById('adrPanel').state == 'open') {
				cardbookWindowUtils.validateAdrPanel();
				return;
			}
			wdw_cardEdition.save();
		},

		cancel: function () {
			window.arguments[0].cardEditionAction = "CANCEL";
			cardBookEditionObserver.unregister();
			wdw_cardEdition.closeWindow();
		},

		closeWindow: function () {
			close();
		}

	};

};
