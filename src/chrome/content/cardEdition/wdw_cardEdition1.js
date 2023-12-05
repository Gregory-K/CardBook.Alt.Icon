import { cardbookNewPreferences } from "../preferences/cardbookNewPreferences.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
import { cardbookHTMLUtils } from "../cardbookHTMLUtils.mjs";
import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";
import { cardbookHTMLDates } from "../cardbookHTMLDates.mjs";
import { cardbookHTMLFormulas } from "../cardbookHTMLFormulas.mjs";
import { cardbookHTMLNotification } from "../cardbookHTMLNotification.mjs";
import { cardbookHTMLTypes } from "../cardbookHTMLTypes.mjs";
import {cardbookHTMLWindowUtils } from "../cardbookHTMLWindowUtils.mjs"
import { cardEditionHTMLValidations } from "./cardEditionHTMLValidations.mjs";

var wdw_cardEdition = {
	contactNotLoaded: true,
	editionFields: [],
	allColumns: {},
	customFields: {},
	currentAdrId: [],
	emailToAdd: [],
	cardbookeditlists: {},
	workingCard: {},
	cardRegion: "",
	keyFilePickerId: "",
	defaultEmailFormat: "X-MOZILLA-HTML",
	notificationMessage: {},
	editionMode: "",
	editionAction: "",
	cardContent: "",
	cbIdIn: "",
	cardIn: {},
	loadTemplateFilePickerId: "",
	applyTemplateFilePickerId: "",

	getEmails: function () {
		let emails = [];
		let cardEmails = null; // test cardbookWindowUtils.getAllTypes("email", true);
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

	searchForLocalKeyEdit: async function () {
		wdw_cardEdition.keyFilePickerId = await messenger.runtime.sendMessage({query: "cardbook.getUUID"});
		await messenger.runtime.sendMessage({query: "cardbook.callFilePicker", id: wdw_cardEdition.keyFilePickerId, result: "content", title: "fileSelectionGPGTitle", mode: "OPEN", type: "GPG"});
	},		

	searchForLocalKeyEditNext: async function (aContent) {
		try {
			if (aContent) {
				wdw_cardEdition.addKeyToEdit(aContent);
			}
		}
		catch (e) {
			await messenger.runtime.sendMessage({query: "cardbook.updateStatusProgressInformation", string: `wdw_cardEdition.searchForLocalKeyEditNext error : ${e}`, error: "Error"});
		}
	},

	addKeyToEdit: function (aKey) {
		let type = "key";
		let re = /[\n\u0085\u2028\u2029]|\r\n?/g;
		aKey = aKey.replace(/-----(BEGIN|END) PGP PUBLIC KEY BLOCK-----/g, "").trim().replace(re, "\\r\\n");
		let allKeyArray = null; // test cardbookWindowUtils.getAllKeys(false);
		allKeyArray = allKeyArray.filter(child => (child.value != "" || child.URI != ""));
		allKeyArray.push({types: [], value: aKey, URI: "", extension: ""});
		cardbookHTMLTools.deleteRows(type + "ReadWriteGroupbox");
		// test cardbookWindowUtils.constructDynamicKeysRows(wdw_cardEdition.workingCard.dirPrefId, type, allKeyArray, wdw_cardEdition.workingCard.version);
	},

	/*
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

	displayLists: async function (aCard) {
		document.getElementById('searchAvailableCardsInput').value = "";
		document.getElementById('kindTextBox').value = "";
		wdw_cardEdition.cardbookeditlists.availableCardsTree = [];
		wdw_cardEdition.cardbookeditlists.addedCardsTree = [];

		let members = await messenger.runtime.sendMessage({query: "cardbook.getMembersFromCard", card: aCard});
		document.getElementById('kindTextBox').value = members.kind;
		for (let email of members.mails) {
			wdw_cardEdition.addEmailToAdded(email.toLowerCase());
		}
		for (let card of members.uids) {
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
			cardbookHTMLUtils.sortMultipleArrayByString(wdw_cardEdition.cardbookeditlists[aTreeName], columnArray, order);
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
					menuItem.setAttribute("label", messenger.i18n.getMessage("appendEmailLabel", [myCard.email[i][0][0]]));
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
	*/
	loadCategories: async function (categories) {
		let readonly = await cardbookNewPreferences.getReadOnly(wdw_cardEdition.workingCard.dirPrefId);
		if (readonly) {
			document.getElementById("categoriesMultiTextbox").classList.add("hidden");
			let parent = document.getElementById('categoriesDiv');
			cardbookHTMLTools.addCategoriesRow(parent, cardbookHTMLUtils.sortArrayByString(categories,1));
		} else {
			document.getElementById("categoriesDiv").classList.add("hidden");
			let allCategories = await messenger.runtime.sendMessage({query: "cardbook.getCategories", defaultPrefId: wdw_cardEdition.workingCard.dirPrefId});
			let list = document.getElementById("categories");
			let i = 0;
			for (let [label, value] of allCategories) {
				let checked = categories.includes(label) ? {checked: true} : {};
				let option = cardbookHTMLTools.addHTMLOPTION(list, `${list.id}_option_${i}`, label, label, checked);
				i++;
			}
			document.getElementById("categoriesMultiTextbox").setAttribute("loaded", "true");
		}
	},

	getCategories: function () {
		let categoryList = document.getElementById("categoriesMultiTextbox").getValues();
		return Array.from(categoryList, cat => cat.getAttribute("value"));
	},

	loadEditionMode: async function () {
		let titleString = "wdw_cardEdition" + wdw_cardEdition.editionMode + "Title";
		document.title = messenger.i18n.getMessage(titleString, [wdw_cardEdition.cardIn.fn]);
		if (wdw_cardEdition.editionMode == "ViewResult") {
			document.getElementById('addressbookHeader').textContent = messenger.i18n.getMessage("addToAddressbook");
			document.getElementById('addressbookMenulist').classList.remove("hidden");
			document.getElementById('addressbookInputLabel').classList.add("hidden");
			document.getElementById('existingDataGroupbox').classList.add("hidden");
			document.getElementById('contactMenulist').classList.add("hidden");
			document.getElementById('listReadOnlyGroupbox').classList.add("hidden");
			document.getElementById('listReadWriteGroupbox').classList.remove("hidden");
			document.getElementById('keyReadOnlyHbox').classList.add("hidden");
			document.getElementById('keyReadWriteHbox').classList.remove("hidden");
			document.getElementById('keyReadWriteToolsVbox').classList.remove("hidden");
			document.getElementById('createEditionButton').setAttribute('hidden', 'false');
			document.getElementById('createAndReplaceEditionButton').setAttribute('hidden', 'false');
			document.getElementById('saveEditionButton').classList.add("hidden");
			document.getElementById('helpTab').setAttribute("collapsed", true);
		} else if (wdw_cardEdition.editionMode == "ViewResultHideCreate") {
			document.getElementById('addressbookRow').classList.add("hidden");
			document.getElementById('existingDataGroupbox').classList.add("hidden");
			document.getElementById('contactMenulist').classList.add("hidden");
			document.getElementById('listReadOnlyGroupbox').classList.add("hidden");
			document.getElementById('listReadWriteGroupbox').classList.remove("hidden");
			document.getElementById('keyReadOnlyHbox').classList.add("hidden");
			document.getElementById('keyReadWriteHbox').classList.remove("hidden");
			document.getElementById('keyReadWriteToolsVbox').classList.remove("hidden");
			document.getElementById('createEditionButton').classList.add("hidden");
			document.getElementById('createAndReplaceEditionButton').setAttribute('hidden', 'false');
			document.getElementById('saveEditionButton').classList.add("hidden");
			document.getElementById('cardbookSwitchButtonDown').classList.add("hidden");
			document.getElementById('cardbookSwitchButtonUp').classList.add("hidden");
			document.getElementById('helpTab').setAttribute("collapsed", true);
		} else if (wdw_cardEdition.editionMode == "ViewContact" || wdw_cardEdition.editionMode == "ViewList") {
			document.getElementById('addressbookMenulist').classList.add("hidden");
			document.getElementById('addressbookInputLabel').classList.remove("hidden");
			document.getElementById('existingDataGroupbox').classList.add("hidden");
			document.getElementById('contactMenulist').classList.add("hidden");
			document.getElementById('fnInputText').setAttribute('class', 'indent');
			document.getElementById('listReadOnlyGroupbox').classList.remove("hidden");
			document.getElementById('listReadWriteGroupbox').classList.add("hidden");
			document.getElementById('keyReadOnlyHbox').classList.remove("hidden");
			document.getElementById('keyReadWriteHbox').classList.add("hidden");
			document.getElementById('keyReadWriteToolsVbox').classList.add("hidden");
			document.getElementById('defaultCardImage').removeAttribute('editionMode');
			document.getElementById('createEditionButton').classList.add("hidden");
			document.getElementById('createAndReplaceEditionButton').classList.add("hidden");
			document.getElementById('saveEditionButton').classList.add("hidden");
			document.getElementById('cardbookSwitchButtonDown').classList.add("hidden");
			document.getElementById('cardbookSwitchButtonUp').classList.add("hidden");
			document.getElementById('helpTab').setAttribute("collapsed", true);
			document.getElementById('readWriteTypesVbox').classList.add("hidden");
		} else if (wdw_cardEdition.editionMode == "EditContact" || wdw_cardEdition.editionMode == "EditList") {
			document.getElementById('addressbookMenulist').classList.remove("hidden");
			document.getElementById('addressbookInputLabel').classList.add("hidden");
			document.getElementById('existingDataGroupbox').classList.add("hidden");
			document.getElementById('contactMenulist').classList.add("hidden");
			document.getElementById('listReadOnlyGroupbox').classList.add("hidden");
			document.getElementById('listReadWriteGroupbox').classList.remove("hidden");
			document.getElementById('keyReadOnlyHbox').classList.add("hidden");
			document.getElementById('keyReadWriteHbox').classList.remove("hidden");
			document.getElementById('keyReadWriteToolsVbox').classList.remove("hidden");
			document.getElementById('createEditionButton').classList.add("hidden");
			document.getElementById('createAndReplaceEditionButton').classList.add("hidden");
			document.getElementById('helpTab').setAttribute("collapsed", true);
		} else if (wdw_cardEdition.editionMode == "CreateContact" || wdw_cardEdition.editionMode == "CreateList") {
			document.getElementById('addressbookHeader').textContent = messenger.i18n.getMessage("addToAddressbook");
			document.getElementById('addressbookMenulist').classList.remove("hidden");
			document.getElementById('addressbookInputLabel').classList.add("hidden");
			document.getElementById('existingDataGroupbox').classList.add("hidden");
			document.getElementById('contactMenulist').classList.add("hidden");
			document.getElementById('listReadOnlyGroupbox').classList.add("hidden");
			document.getElementById('listReadWriteGroupbox').classList.remove("hidden");
			document.getElementById('keyReadOnlyHbox').classList.add("hidden");
			document.getElementById('keyReadWriteHbox').classList.remove("hidden");
			document.getElementById('keyReadWriteToolsVbox').classList.remove("hidden");
			document.getElementById('createEditionButton').classList.add("hidden");
			document.getElementById('createAndReplaceEditionButton').classList.add("hidden");
			document.getElementById('helpTab').setAttribute("collapsed", true);
		} else if (wdw_cardEdition.editionMode == "AddEmail") {
			wdw_cardEdition.emailToAdd = wdw_cardEdition.workingCard.email[0];
			document.getElementById('addressbookHeader').textContent = messenger.i18n.getMessage("addToAddressbook");
			document.getElementById('addressbookMenulist').classList.remove("hidden");
			document.getElementById('addressbookInputLabel').classList.add("hidden");
			document.getElementById('existingDataGroupbox').classList.remove("hidden");
			document.getElementById('contactMenulist').classList.remove("hidden");
			document.getElementById('listReadOnlyGroupbox').classList.add("hidden");
			document.getElementById('listReadWriteGroupbox').classList.remove("hidden");
			document.getElementById('keyReadOnlyHbox').classList.add("hidden");
			document.getElementById('keyReadWriteHbox').classList.remove("hidden");
			document.getElementById('keyReadWriteToolsVbox').classList.remove("hidden");
			document.getElementById('createEditionButton').classList.add("hidden");
			document.getElementById('createAndReplaceEditionButton').classList.add("hidden");
			document.getElementById('helpTab').setAttribute("collapsed", true);
		} else if (wdw_cardEdition.editionMode == "EditTemplate") {
			document.getElementById('addressbookRow').classList.add("hidden");
			document.getElementById('existingDataGroupbox').classList.add("hidden");
			document.getElementById('contactMenulist').classList.add("hidden");
			document.getElementById('listReadOnlyGroupbox').classList.add("hidden");
			document.getElementById('listReadWriteGroupbox').classList.remove("hidden");
			document.getElementById('keyReadOnlyHbox').classList.add("hidden");
			document.getElementById('keyReadWriteHbox').classList.remove("hidden");
			document.getElementById('keyReadWriteToolsVbox').classList.remove("hidden");
			document.getElementById('createEditionButton').classList.add("hidden");
			document.getElementById('createAndReplaceEditionButton').classList.add("hidden");
			document.getElementById('helpTab').setAttribute("collapsed", false);
			document.getElementById('applyTemplateButton').classList.add("hidden");
		}
		if (wdw_cardEdition.cardIn.isAList) {
			document.getElementById('contactGroupbox').classList.add("hidden");
			wdw_cardEdition.expandButton(document.getElementById('expandPersonalImage'), false);
			wdw_cardEdition.expandButton(document.getElementById('expandOrgImage'), false);
			document.getElementById('preferDisplayNameCheckBox').classList.add("hidden");
		} else {
			document.getElementById('contactGroupbox').classList.remove("hidden");
			wdw_cardEdition.expandButton(document.getElementById('expandPersonalImage'), true);
			wdw_cardEdition.expandButton(document.getElementById('expandOrgImage'), true);
			document.getElementById('preferDisplayNameCheckBox').classList.remove("hidden");
		}
		document.getElementById('lastnameInputText').focus();
		let autoComputeFn = await cardbookHTMLUtils.getPrefValue("autoComputeFn");
		wdw_cardEdition.autoComputeFn(document.getElementById('autoComputeFnButton'), autoComputeFn);
	},

	setFieldsAsDefault: async function () {
		await cardbookHTMLUtils.setPrefValue("fieldsNameList", wdw_cardEdition.editionFields);
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
		//test to rewrite
		cardbookHTMLTools.deleteRows('fieldsMenupopup');

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
		fieldsButton.setAttribute("label", messenger.i18n.getMessage("fieldsButtonLabel"));
		fieldsButton.addEventListener("command", wdw_cardEdition.setFieldsAsDefault, false);
		listRows.appendChild(fieldsButton);

		// test cardbookWindowUtils.updateComplexMenulist('fields', 'fieldsMenupopup');
	},

	changeEditionFields: async function () {
		// test usefull ?
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
		let readonly = await cardbookNewPreferences.getReadOnly(wdw_cardEdition.workingCard.dirPrefId);
		// test cardbookWindowUtils.display40(wdw_cardEdition.workingCard.version, readonly);
		// test cardbookWindowUtils.displayDates(wdw_cardEdition.workingCard.version, readonly);
		await wdw_cardEdition.loadEditionFields();
	},

	loadEditionFields: async function () {
		switch(wdw_cardEdition.editionMode) {
			case "ViewResultHideCreate":
			case "ViewContact":
			case "ViewList":
				wdw_cardEdition.showPane('generalTabPanel');
				return;
		}

		if (wdw_cardEdition.checkEditionFields("categories") || wdw_cardEdition.workingCard.categories.length != 0) {
			document.getElementById('categoriesRow').classList.remove("hidden");
		} else {
			document.getElementById('categoriesRow').classList.add("hidden");
		}
		if (wdw_cardEdition.checkEditionFields("note") || wdw_cardEdition.workingCard.note) {
			document.getElementById('noteTab').classList.remove("hidden");
		} else {
			document.getElementById('noteTab').classList.add("hidden");
		}
		if (wdw_cardEdition.checkEditionFields("list") && wdw_cardEdition.editionMode != "EditTemplate") {
			document.getElementById('listTab').classList.remove("hidden");
		} else {
			document.getElementById('listTab').classList.add("hidden");
		}
		if (wdw_cardEdition.checkEditionFields("key") && wdw_cardEdition.editionMode != "EditTemplate") {
			document.getElementById('keyTab').classList.remove("hidden");
		} else {
			document.getElementById('keyTab').classList.add("hidden");
		}
		if (wdw_cardEdition.checkEditionFields("fn") || wdw_cardEdition.workingCard.fn) {
			document.getElementById('fnGroupbox').classList.remove("hidden");
		} else {
			document.getElementById('fnGroupbox').classList.add("hidden");
		}

		for (let field of wdw_cardEdition.allColumns.personal) {
			if (cardbookHTMLDates.dateFields.includes(field) || cardbookHTMLUtils.newFields.includes(field)) {
				// already done
				continue;
			}
			if (wdw_cardEdition.checkEditionFields(field) || wdw_cardEdition.workingCard[field]) {
				document.getElementById(field + 'Row').classList.remove("hidden");
			} else {
				document.getElementById(field + 'Row').classList.add("hidden");
			}
		}
		if (document.getElementById("firstnameRow").hasAttribute('hidden') ||
			document.getElementById("firstnameInputText").hasAttribute('hidden') ||
			document.getElementById("lastnameRow").hasAttribute('hidden') ||
			document.getElementById("lastnameInputText").hasAttribute('hidden'))	{
			document.getElementById('cardbookSwitchButtonUp').classList.add("hidden");
			document.getElementById('cardbookSwitchButtonDown').classList.add("hidden");
		} else {
			document.getElementById('cardbookSwitchButtonUp').classList.remove("hidden");
			document.getElementById('cardbookSwitchButtonDown').classList.remove("hidden");
		}
		if (!wdw_cardEdition.workingCard.isAList) {
			for (let field of cardbookHTMLTypes.multilineFields) {
				if (wdw_cardEdition.checkEditionFields(field) || document.getElementById(field + '_0_valueBox').value) {
					document.getElementById(field + 'Groupbox').classList.remove("hidden");
				} else {
					document.getElementById(field + 'Groupbox').classList.add("hidden");
				}
			}
			for (let field of ['event']) {
				if (wdw_cardEdition.checkEditionFields(field) || document.getElementById(field + '_0_valueBox').value || document.getElementById(field + '_0_valueDateBox').value) {
					document.getElementById(field + 'Groupbox').classList.remove("hidden");
				} else {
					document.getElementById(field + 'Groupbox').classList.add("hidden");
				}
			}
			for (let field of ['tz']) {
				let ABType = await cardbookNewPreferences.getType(wdw_cardEdition.workingCard.dirPrefId);
				if (ABType.startsWith("GOOGLE") || ABType == "APPLE" || ABType == "OFFICE365" || ABType == "YAHOO") {
					document.getElementById(field + 'Groupbox').classList.add("hidden");
				} else if (wdw_cardEdition.checkEditionFields(field) || document.getElementById(field + '_0_menulistTz').value || document.getElementById(field + '_0_menulistTz').value) {
					document.getElementById(field + 'Groupbox').classList.remove("hidden");
				} else {
					document.getElementById(field + 'Groupbox').classList.add("hidden");
				}
			}
		}
		for (let type of ['personal', 'org']) {
			for (let i = 0; i < wdw_cardEdition.customFields[type].length; i++) {
				if (wdw_cardEdition.checkEditionFields(wdw_cardEdition.customFields[type][i][0]) || document.getElementById('customField' + i + type + 'TextBox').value) {
					document.getElementById('customField' + i + type + 'Row').classList.remove("hidden");
				} else {
					document.getElementById('customField' + i + type + 'Row').classList.add("hidden");
				}
			}
		}
		let orgStructure = await cardbookHTMLUtils.getPrefValue("orgStructure");
		if (orgStructure) {
			let myOrgStructure = cardbookHTMLUtils.unescapeArray(cardbookHTMLUtils.escapeString(orgStructure).split(";"));
			for (let i = 0; i < myOrgStructure.length; i++) {
				if (wdw_cardEdition.checkEditionFields('org_' + myOrgStructure[i]) || document.getElementById('orgTextBox_' + i).value) {
					document.getElementById('orgRow_' + i).classList.remove("hidden");
				} else {
					document.getElementById('orgRow_' + i).classList.add("hidden");
				}
			}
		} else {
			if (wdw_cardEdition.checkEditionFields('org') || document.getElementById('orgTextBox_0').value) {
				document.getElementById('orgRow_0').classList.remove("hidden");
			} else {
				document.getElementById('orgRow_0').classList.add("hidden");
			}
		}
		for (let field of ['title', 'role']) {
			if (wdw_cardEdition.checkEditionFields(field) || wdw_cardEdition.workingCard[field]) {
				document.getElementById(field + 'Row').classList.remove("hidden");
			} else {
				document.getElementById(field + 'Row').classList.add("hidden");
			}
		}
		let adrElements = await messenger.runtime.sendMessage({query: "cardbook.getAdrElements"});
		for (let field of adrElements) {
			let partialIndex = adrElements.indexOf(field);
			let found = false;
			for (let adr of wdw_cardEdition.workingCard.adr) {
				if (adr[0][partialIndex] != "") {
					found = true;
					break;
				}
			}
			if (wdw_cardEdition.checkEditionFields(field) || found) {
				document.getElementById(field + 'Row').classList.remove("hidden");
			} else {
				document.getElementById(field + 'Row').classList.add("hidden");
			}
		}
		
		// test cardbookWindowUtils.updateComplexMenulist('fields', 'fieldsMenupopup');
		wdw_cardEdition.showPane('generalTabPanel');
	},

	setConvertButtons: function () {
		let forceHide = false;
		switch(wdw_cardEdition.editionMode) {
			case "ViewResult":
			case "ViewResultHideCreate":
			case "ViewContact":
			case "ViewList":
				forceHide = true;
		}
		let itemsList = document.getElementById("rightPaneDownHbox2").querySelectorAll("button.cardbookProcessClass");
		for (let item of itemsList) {
			if (forceHide) {
				item.classList.add("hidden");
			} else {
				let code = item.id.replace("ProcessButton", "");
				for (let field of wdw_cardEdition.editionFields) {
					if (field[0] == "allFields") {
						item.classList.add("hidden");
						break;
					} else if (code == field[2]) {
						if (field[3] != "") {
							item.classList.remove("hidden");
						} else {
							item.classList.add("hidden");
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
			button.setAttribute('title', messenger.i18n.getMessage("dontAutoConvertField"));
		} else {
			button.removeAttribute('autoConvertField');
			button.setAttribute('title', messenger.i18n.getMessage("autoConvertField"));
		}
	},

	onInputField: async function (aEvent) {
		let textbox = aEvent.target;
		let field = textbox.getAttribute('data-field-name');
		let button = document.getElementById(`${field}ProcessButton`);
		if (!button.classList.contains("hidden") && button.hasAttribute("autoConvertField")) {
			let tmpArray = wdw_cardEdition.editionFields.filter(x => x[2] == field);
			let convertionFunction = tmpArray[0][4];
			let value = cardbookHTMLUtils.convertField(convertionFunction, textbox.value);
			textbox.value = value;
		}
		let orgStructure = await cardbookHTMLUtils.getPrefValue("orgStructure");
		let allOrg = [];
		if (orgStructure != "") {
			allOrg = cardbookHTMLUtils.unescapeArray(cardbookHTMLUtils.escapeString(orgStructure).split(";"));
		}
		if ([ 'lastname', 'firstname', 'othername', 'prefixname', 'suffixname', 'nickname' ].includes(field) ||
			(allOrg.length == 0 && wdw_cardEdition.allColumns.org.includes(field)) ||
			(allOrg.length != 0 && allOrg.includes(field.replace(/^org\./, "")))) {
				await wdw_cardEdition.setDisplayName();
		}
	},

	loadHelpTab: async function () {
		let orgStructure = await cardbookHTMLUtils.getPrefValue("orgStructure");
		let allOrg = [];
		if (orgStructure != "") {
			allOrg = cardbookHTMLUtils.unescapeArray(cardbookHTMLUtils.escapeString(orgStructure).split(";"));
		}
		document.getElementById('formulaMemberLabel1').value = "{{1}} : " + messenger.i18n.getMessage("prefixnameLabel");
		document.getElementById('formulaMemberLabel2').value = "{{2}} : " + messenger.i18n.getMessage("firstnameLabel");
		document.getElementById('formulaMemberLabel3').value = "{{3}} : " + messenger.i18n.getMessage("othernameLabel");
		document.getElementById('formulaMemberLabel4').value = "{{4}} : " + messenger.i18n.getMessage("lastnameLabel");
		document.getElementById('formulaMemberLabel5').value = "{{5}} : " + messenger.i18n.getMessage("suffixnameLabel");
		document.getElementById('formulaMemberLabel6').value = "{{6}} : " + messenger.i18n.getMessage("nicknameLabel");

		let count = 6;
		let table = document.getElementById('formulaSampleTable');
		if (allOrg.length == 0) {
			count++;
			let row = cardbookHTMLTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
			let labelData = cardbookHTMLTools.addHTMLTD(row, 'formulaMemberLabel' + count + '.1');
			let label = cardbookHTMLTools.addHTMLLABEL(labelData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + messenger.i18n.getMessage("orgLabel"), {});
		} else {
			for (let org of allOrg) {
				count++;
				let row = cardbookHTMLTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
				let labelData = cardbookHTMLTools.addHTMLTD(row, 'formulaMemberLabel' + count + '.1');
				let label = cardbookHTMLTools.addHTMLLABEL(labelData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + org, {});
			}
		}
		count++;
		let rowTitle = cardbookHTMLTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
		let titleData = cardbookHTMLTools.addHTMLTD(rowTitle, 'formulaMemberLabel' + count + '.2');
		let labelTitle = cardbookHTMLTools.addHTMLLABEL(titleData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + messenger.i18n.getMessage("titleLabel"), {});
		count++;
		let rowRole = cardbookHTMLTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
		let roleData = cardbookHTMLTools.addHTMLTD(rowRole, 'formulaMemberLabel' + count + '.3');
		let labelRole = cardbookHTMLTools.addHTMLLABEL(roleData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + messenger.i18n.getMessage("roleLabel"), {});
	},

	setEditionFields: async function () {
		wdw_cardEdition.editionFields = await messenger.runtime.sendMessage({query: "cardbook.getEditionFields"});
	},

	loadDefaultVersion: async function () {
		if (wdw_cardEdition.workingCard.version == "") {
			var myDirPrefId = document.getElementById('addressbookMenulist').value;
			document.getElementById("versionTextBox").value = await cardbookNewPreferences.getVCardVersion(myDirPrefId);
			wdw_cardEdition.workingCard.version = document.getElementById("versionTextBox").value;
		} else {
			document.getElementById("versionTextBox").value = wdw_cardEdition.workingCard.version;
		}
	},

	removeContacts: function () {
		document.getElementById('contactMenulist').selectedIndex = 0;
		cardbookHTMLTools.deleteRows('contactMenupopup');
		wdw_cardEdition.contactNotLoaded = true;
	},

	loadContacts: async function () {
		if (wdw_cardEdition.contactNotLoaded) {
			let contactMenulist = document.getElementById('contactMenulist');
			let dirPrefId = document.getElementById('addressbookMenulist').value;
			await cardbookHTMLTools.loadContacts(contactMenulist, dirPrefId, "");
			wdw_cardEdition.contactNotLoaded = false;
		}
	},

	changeAddressbook: async function () {
		wdw_cardEdition.removeContacts();
		document.getElementById('dirPrefIdTextBox').value = document.getElementById('addressbookMenulist').value;
		if (wdw_cardEdition.editionMode == "AddEmail") {
			wdw_cardEdition.workingCard = null;
			wdw_cardEdition.workingCard = await wdw_cardEdition.cloneCard(wdw_cardEdition.cardIn, wdw_cardEdition.workingCard);
		}
		await wdw_cardEdition.loadDefaultVersion();

		// keep the current changes
		var myOutCard = await messenger.runtime.sendMessage({query: "cardbook.getCardParser"});
		await wdw_cardEdition.calculateResult(myOutCard);
		// convertion if AB changed
		var myTargetName = await cardbookNewPreferences.getName(myOutCard.dirPrefId);
		var myTargetVersion = await cardbookNewPreferences.getVCardVersion(myOutCard.dirPrefId);
		var mySourceDateFormat = await cardbookHTMLUtils.getDateFormat(wdw_cardEdition.workingCard.dirPrefId, await cardbookNewPreferences.getVCardVersion(wdw_cardEdition.workingCard.dirPrefId));
		var myTargetDateFormat = await cardbookHTMLUtils.getDateFormat(myOutCard.dirPrefId, myTargetVersion);
		if (await cardbookHTMLUtils.convertVCard(myOutCard, myTargetName, myTargetVersion, mySourceDateFormat, myTargetDateFormat)) {
			await messenger.runtime.sendMessage({query: "cardbook.writePossibleCustomFields"});
		}
		
		wdw_cardEdition.workingCard = await wdw_cardEdition.cloneCard(myOutCard, wdw_cardEdition.workingCard);
		myOutCard = null;
		wdw_cardEdition.workingCard.dirPrefId = document.getElementById('addressbookMenulist').value;

		await wdw_cardEdition.loadContacts();
		await wdw_cardEdition.loadDateFormatLabels();
		await wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
	},

	changeContact: async function () {
		var myDirPrefId = document.getElementById('addressbookMenulist').value;
		var myUid = document.getElementById('contactMenulist').value;
		if (myUid) {
			wdw_cardEdition.workingCard = null;
			let results = await messenger.runtime.sendMessage({query: "cardbook.getCards", cbids: [myDirPrefId+"::"+myUid]});
			let card = results[0];
			wdw_cardEdition.workingCard = await wdw_cardEdition.cloneCard(card, wdw_cardEdition.workingCard);
			if (wdw_cardEdition.editionMode == "AddEmail" ) {
				wdw_cardEdition.workingCard.email.push(wdw_cardEdition.emailToAdd);
			}
		} else {
			wdw_cardEdition.workingCard = null;
			wdw_cardEdition.workingCard = await wdw_cardEdition.cloneCard(wdw_cardEdition.cardIn, wdw_cardEdition.workingCard);
		}
		await wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
	},

	switchLastnameAndFirstname: function () {
		var tmpValue = document.getElementById('lastnameInputText').value;
		document.getElementById('lastnameInputText').value = document.getElementById('firstnameInputText').value;
		document.getElementById('firstnameInputText').value = tmpValue;
		document.getElementById('lastnameInputText').focus();
		document.getElementById('lastnameInputText').dispatchEvent(new Event('input'));
		document.getElementById('firstnameInputText').dispatchEvent(new Event('input'));
	},

	autoComputeFn: async function (aButton, aForce) {
		if ("undefined" == typeof(aForce)) {
			if (!aButton.hasAttribute('autoComputeFn')) {
				aButton.setAttribute('autoComputeFn', 'true');
				aButton.setAttribute('title', messenger.i18n.getMessage("dontAutoComputeFn"));
			} else {
				aButton.removeAttribute('autoComputeFn');
				aButton.setAttribute('title', messenger.i18n.getMessage("autoComputeFn"));
			}
			let autoComputeFn = await cardbookHTMLUtils.getPrefValue("autoComputeFn");
			await cardbookNewPreferences.setPref("autoComputeFn", !autoComputeFn);
		} else {
			if (aForce == true) {
				aButton.setAttribute('autoComputeFn', 'true');
				aButton.setAttribute('title', messenger.i18n.getMessage("dontAutoComputeFn"));
			} else {
				aButton.removeAttribute('autoComputeFn');
				aButton.setAttribute('title', messenger.i18n.getMessage("autoComputeFn"));
			}
		}
	},

	expandButton: function (aButton, aForce) {
		let table = document.getElementById(aButton.id.replace(/^expand/, "").replace(/Image$/, "").toLowerCase() + "Table");
		if ("undefined" == typeof(aForce)) {
			if (!aButton.getAttribute('expanded')) {
				table.classList.remove("hidden");
				aButton.setAttribute('expanded', 'true');
			} else {
				table.classList.add("hidden");
				aButton.removeAttribute('expanded');
			}
		} else {
			if (aForce == true) {
				table.classList.remove("hidden");
				aButton.setAttribute('expanded', 'true');
			} else {
				table.classList.add("hidden");
				aButton.removeAttribute('expanded');
			}
		}				
	},

	unsetWrongValidation: function () {
		cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "OK");
	},

	displayCard: async function (aCard) {
		await wdw_cardEdition.clearCard();
		let aReadOnly = await cardbookNewPreferences.getReadOnly(aCard.dirPrefId);
		await cardbookHTMLWindowUtils.displayCard(aCard, aReadOnly);
		
		await wdw_cardEdition.loadCategories(aCard.categories);
		if (!aReadOnly) {
			await cardbookHTMLTools.loadPreferMailFormat("preferMailFormatMenulist", "0");
			await cardbookHTMLTools.loadGender("genderMenulist", wdw_cardEdition.workingCard.gender);
			await cardbookHTMLTools.loadCountries("countryMenulist", "");
			// test cardbookWindowUtils.displayPref(aCard.version);
		} else {
			// test cardbookWindowUtils.adjustFields();
			// test controler les champs ci dessous
			document.getElementById('dirPrefIdTextBox').classList.add("hidden");
			document.getElementById('uidTextBox').classList.add("hidden");
			document.getElementById('versionTextBox').classList.add("hidden");
			document.getElementById('othersTextBox').classList.add("hidden");
		}
		document.getElementById('preferDisplayNameCheckBox').checked = true;
		for (let email of wdw_cardEdition.workingCard.emails) {

			if (await messenger.runtime.sendMessage({query: "cardbook.cardbookPreferDisplayNameIndex", email: email.toLowerCase()})) {
				document.getElementById('preferDisplayNameCheckBox').checked = false;
				break;
			}
		}

		await wdw_cardEdition.loadDateFormatLabels();
		await wdw_cardEdition.loadEditionFields();
		// test wdw_cardEdition.loadFieldSelector();
		wdw_cardEdition.setConvertButtons()
	},

	clearCard: async function () {
		// test cardbookWindowUtils.clearCard();
		for (let type of cardbookHTMLTypes.multilineFields) {
			cardbookHTMLTools.deleteRows(type + 'Groupbox');
		}
		cardbookHTMLTools.deleteRows('eventGroupbox');
		cardbookHTMLTools.deleteRows('tzGroupbox');
		document.getElementById('preferMailFormatMenulist').selectedIndex = 0;
		document.getElementById('genderMenulist').selectedIndex = 0;
		await wdw_cardEdition.loadCategories([]);
	},

	getOrg: function (aTrimArray) {
		let myOrg = [];
		let result = "";
		let i = 0;
		while (true) {
			if (document.getElementById('orgRow_' + i)) {
				myOrg.push(cardbookHTMLUtils.escapeStringSemiColon(document.getElementById('orgTextBox_' + i).value.trim()));
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
		result = cardbookHTMLUtils.unescapeStringSemiColon(myOrg.join(";"));
		return result;
	},

	setDisplayName: async function () {
		if (document.getElementById('autoComputeFnButton').hasAttribute('autoComputeFn')) {
			var myNewOrg = wdw_cardEdition.getOrg(false);
			var myNewFn = await cardbookHTMLFormulas.getDisplayedNameFromFormula(document.getElementById('dirPrefIdTextBox').value, [document.getElementById('prefixnameInputText').value.trim(),
																document.getElementById('firstnameInputText').value.trim(),
																document.getElementById('othernameInputText').value.trim(),
																document.getElementById('lastnameInputText').value.trim(),
																document.getElementById('suffixnameInputText').value.trim(),
																document.getElementById('nicknameInputText').value.trim()],
																[myNewOrg,
																document.getElementById('titleInputText').value.trim(),
																document.getElementById('roleInputText').value.trim()]);
			document.getElementById('fnInputText').value = myNewFn;
			wdw_cardEdition.workingCard.lastname = document.getElementById('lastnameInputText').value.trim();
			wdw_cardEdition.workingCard.firstname = document.getElementById('firstnameInputText').value.trim();
			wdw_cardEdition.workingCard.othername = document.getElementById('othernameInputText').value.trim();
			wdw_cardEdition.workingCard.suffixname = document.getElementById('suffixnameInputText').value.trim();
			wdw_cardEdition.workingCard.prefixname = document.getElementById('prefixnameInputText').value.trim();
			wdw_cardEdition.workingCard.nickname = document.getElementById('nicknameInputText').value.trim();
			wdw_cardEdition.workingCard.org = myNewOrg;
			wdw_cardEdition.workingCard.fn = myNewFn;
		}
	},

	loadDateFormatLabels: async function () {
		let dateFormat = await cardbookHTMLDates.getDateFormatLabel(wdw_cardEdition.workingCard.dirPrefId, wdw_cardEdition.workingCard.version);
		let myD = messenger.i18n.getMessage("dateFormatsDLabel");
		let myM = messenger.i18n.getMessage("dateFormatsMLabel");
		let myY = messenger.i18n.getMessage("dateFormatsYLabel");
		for (var field of cardbookHTMLDates.dateFields) {
			if (document.getElementById(field + 'Label')) {
				document.getElementById(field + 'Label').value = messenger.i18n.getMessage(field + "Label") + " (" + dateFormat.replace(/D/g, myD).replace(/M/g, myM).replace(/Y/g, myY) + ")";
			}
		}
	},

	cloneCard: async function (aSourceCard, aTargetCard) {
		// we need to keep the list flag as the normal cloneCard function may not find this information
		// for new cards
		aTargetCard = await messenger.runtime.sendMessage({query: "cardbook.cloneCard", cardIn: aSourceCard, cardOut: aTargetCard});
		aTargetCard.isAList = aSourceCard.isAList;
		return aTargetCard;
	},

	startDrag: async function (aEvent, aTreeChildren) {
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
			await messenger.runtime.sendMessage({query: "cardbook.updateStatusProgressInformation", string: `wdw_cardEdition.startDrag error : ${e}`, error: "Error"});
		}
	},

	dragCards: async function (aEvent, aTreeName) {
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
			await messenger.runtime.sendMessage({query: "cardbook.updateStatusProgressInformation", string: `wdw_cardEdition.dragCards error : ${e}`, error: "Error"});
		}
	},

	/* test
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
	*/

	createTemplate: async function () {
		await messenger.runtime.sendMessage({query: "cardbook.openTemplate"});
	},

	loadTemplate: async function () {
		await messenger.runtime.sendMessage({query: "cardbook.callFilePicker", id: wdw_cardEdition.gFilePickerId, result: "content", title: "fileSelectionTPLTitle", mode: "OPEN", type: "TPL"});
	},

	loadTemplateNext: async function (aContent) {
		if (aContent) {
			await messenger.runtime.sendMessage({query: "cardbook.openTemplate", content: aContent});
		}
	},

	saveTemplate: async function (aCardOut) {
		await messenger.runtime.sendMessage({query: "cardbook.callFilePicker", id: wdw_cardEdition.gFilePickerId, result: "write", title: "fileCreationTPLTitle", mode: "SAVE", type: "TPL", content: aCardOut});
	},

	applyTemplate: async function () {
		await messenger.runtime.sendMessage({query: "cardbook.callFilePicker", id: wdw_cardEdition.gFilePickerId, result: "content", title: "fileSelectionTPLTitle", mode: "OPEN", type: "TPL"});
	},

	applyTemplateNext: async function (aContent) {
		if (aContent) {
			let re = /[\n\u0085\u2028\u2029]|\r\n?/;
			let fileContentArray = cardbookHTMLUtils.cleanArrayWithoutTrim(aContent.split(re));
			let fileContentArrayLength = fileContentArray.length
			let cardContent = "";
			for (let i = 0; i < fileContentArrayLength; i++) {
				if (fileContentArray[i].toUpperCase().startsWith("BEGIN:VCARD")) {
					cardContent = fileContentArray[i];
				} else if (fileContentArray[i].toUpperCase().startsWith("END:VCARD")) {
					cardContent = cardContent + "\r\n" + fileContentArray[i];
					let myTempCard = await messenger.runtime.sendMessage({query: "cardbook.getCardParser"});
					await wdw_cardEdition.calculateResult(myTempCard);

					let myTemplateCard = await messenger.runtime.sendMessage({query: "cardbook.getCardParser", content: cardContent, dirPrefId: myTempCard.dirPrefId});
					if (myTemplateCard.isAList != myTempCard.isAList || myTempCard.isAList) {
						return;
					}

					let listFields = ["prefixname", "firstname", "othername", "lastname", "suffixname", "nickname", "org", "title", "role"]
					for (let field of listFields) {
						if (myTempCard[field] == "" && myTemplateCard[field] != "") {
							myTempCard[field] = myTemplateCard[field];
						}
					}
					myTempCard.categories = myTempCard.categories.concat(myTemplateCard.categories);
					myTempCard.categories = cardbookHTMLUtils.cleanCategories(myTempCard.categories);

					let myOrg = [wdw_cardEdition.getOrg(false), myTempCard.title, myTempCard.role];
					let myN = [myTempCard.prefixname, myTempCard.firstname, myTempCard.othername, myTempCard.lastname,
								myTempCard.suffixname, myTempCard.nickname];
					let data = cardbookHTMLFormulas.getFnDataForFormula(myN, myOrg);

					if (myTemplateCard.fn.includes("{{")) {
						myTempCard.fn = cardbookHTMLFormulas.getStringFromFormula(myTemplateCard.fn, data);
					} else {
						let myFnFormula = await cardbookNewPreferences.getFnFormula(aDirPrefId);
						myTempCard.fn = cardbookHTMLFormulas.getStringFromFormula(myFnFormula, data);
					}

					function stringify(aEntryLine) {
						return aEntryLine[0].join(",");
					};
					function addIfMissing(aEntryLine, aEntryLines) {
						let lineToAdd = stringify(aEntryLine);
						for (let entryLine of aEntryLines) {
							if (stringify(entryLine) == lineToAdd) {
								return;
							}
						}
						aEntryLines.push(aEntryLine);
					};
					for (let type of cardbookHTMLTypes.multilineFields) {
						if (type == "adr") {
							for (let entryLine of myTemplateCard[type]) {
								addIfMissing(entryLine, myTempCard[type])
							}
						} else {
							for (let entryLine of myTemplateCard[type]) {
								entryLine[0][0] = cardbookHTMLFormulas.getStringFromFormula(entryLine[0][0], data).toLowerCase();
								addIfMissing(entryLine, myTempCard[type])
							}
						}
					}

					if (myTempCard.note == "" && myTemplateCard.note != "") {
						myTempCard.note = cardbookHTMLFormulas.getStringFromFormula(myTemplateCard.note, data);
					}

					let dateFormat = cardbookHTMLUtils.getDateFormat(myTempCard.dirPrefId, myTempCard.version);
					let myEvents = cardbookHTMLUtils.getEventsFromCard(myTemplateCard.note.split("\n"), myTemplateCard.others);
					let myPGNextNumber = cardbookHTMLUtils.rebuildAllPGs(myTempCard);
					for (let entryLine of myEvents.result) {
						entryLine[1] = cardbookHTMLFormulas.getStringFromFormula(entryLine[1], data);
					}
					cardbookHTMLUtils.addEventstoCard(myTempCard, myEvents.result, myPGNextNumber, dateFormat);

					for (let type of ["personal", "org"]) {
						for (let custom of wdw_cardEdition.customFields[type]) {
							let tempCustomValue = await messenger.runtime.sendMessage({query: "cardbook.getCardValueByField", card: myTempCard, field: custom[0], includePref: false});
							let templateCustomValue = await messenger.runtime.sendMessage({query: "cardbook.getCardValueByField", card: myTemplateCard, field: custom[0], includePref: false});
							if (tempCustomValue.length == 0 && templateCustomValue.length != 0) {
								let value = cardbookHTMLFormulas.getStringFromFormula(templateCustomValue[0], data);
								myTempCard = await messenger.runtime.sendMessage({query: "cardbook.setCardValueByField", card: myTempCard, field: custom[0], value: value});
							}
						}
					}

					wdw_cardEdition.workingCard = await wdw_cardEdition.cloneCard(myTempCard, wdw_cardEdition.workingCard);
					wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
					myTempCard = null;
					
					// first vCard shown
					return;
				} else if (fileContentArray[i] == "") {
					continue;
				} else {
					cardContent = cardContent + "\r\n" + fileContentArray[i];
				}
			}
		}
	},

	setTemplateCard: async function (aContent) {
		if (!aContent) {
			wdw_cardEdition.cbIdIn = await messenger.runtime.sendMessage({query: "cardbook.getCardParser"});
			wdw_cardEdition.cbIdIn.dirPrefId = wdw_cardEdition.workingCard.dirPrefId;
			wdw_cardEdition.cbIdIn.fn = await cardbookNewPreferences.getFnFormula(wdw_cardEdition.workingCard.dirPrefId);
		} else {
			let re = /[\n\u0085\u2028\u2029]|\r\n?/;
			let fileContentArray = cardbookHTMLUtils.cleanArrayWithoutTrim(aContent.split(re));
			let fileContentArrayLength = fileContentArray.length
			let cardContent = "";
			for (let i = 0; i < fileContentArrayLength; i++) {
				if (fileContentArray[i].toUpperCase().startsWith("BEGIN:VCARD")) {
					cardContent = fileContentArray[i];
				} else if (fileContentArray[i].toUpperCase() == "FN:") {
					let fnFormula = await cardbookNewPreferences.getFnFormula(wdw_cardEdition.workingCard.dirPrefId);
					cardContent = cardContent + "\r\n" + "FN:" + fnFormula;
				} else if (fileContentArray[i].toUpperCase().startsWith("END:VCARD")) {
					cardContent = cardContent + "\r\n" + fileContentArray[i];
					wdw_cardEdition.cbIdIn = await messenger.runtime.sendMessage({query: "cardbook.getCardParser", content: cardContent, dirPrefId: wdw_cardEdition.workingCard.dirPrefId});
					// test if (myTemplateCard.isAList != wdw_cardEdition.workingCard.isAList || wdw_cardEdition.workingCard.isAList) {
					// test 	return;
					// test }
					wdw_cardEdition.cbIdIn.dirPrefId = wdw_cardEdition.workingCard.dirPrefId;
					return;
				} else if (fileContentArray[i] == "") {
					continue;
				} else {
					cardContent = cardContent + "\r\n" + fileContentArray[i];
				}
			}
		}
	},

	showPane: function (paneID) {
		console.log(paneID)
		if (!paneID) {
			return;
		}
		
		let pane = document.getElementById(paneID);
		if (!pane) {
			return;
		}
		
		let tabnodes = document.getElementById("rightPaneDownHbox2").querySelectorAll(".cardbookTab");
		for (let node of tabnodes) {
			console.log(node.id)
			if (node.id != paneID) {
				console.log("hidden : " + node.id)
				node.setAttribute("hidden", "true");
				document.getElementById(node.id.replace("Panel", "")).removeAttribute("visuallyselected");
			} else {
				console.log("pas hidden : " + node.id)
				document.getElementById(node.id.replace("Panel", "")).setAttribute("visuallyselected", "true");
				node.removeAttribute("hidden");
			}
		}
	},
	
	load: async function () {
		let urlParams = new URLSearchParams(window.location.search);
		wdw_cardEdition.editionMode = urlParams.get("editionMode");
		wdw_cardEdition.cardContent = urlParams.get("cardContent");
		wdw_cardEdition.cbIdIn = urlParams.get("cbIdIn");
		if (wdw_cardEdition.editionMode == "EditTemplate") {
			await wdw_cardEdition.setTemplateCard(wdw_cardEdition.cardContent);
		} else {
			let results = await messenger.runtime.sendMessage({query: "cardbook.getCards", cbids: [wdw_cardEdition.cbIdIn]});
			wdw_cardEdition.cardIn = results[0];
		}

		i18n.updateDocument();
		cardbookHTMLRichContext.loadRichContext();
	
		wdw_cardEdition.customFields = await messenger.runtime.sendMessage({query: "cardbook.getCustomFields"});
		wdw_cardEdition.allColumns = await messenger.runtime.sendMessage({query: "cardbook.getAllColumns"});
		wdw_cardEdition.notificationMessage = document.getElementById('notificationMessage');
		wdw_cardEdition.loadTemplateFilePickerId = await messenger.runtime.sendMessage({query: "cardbook.getUUID"});
		wdw_cardEdition.applyTemplateFilePickerId = await messenger.runtime.sendMessage({query: "cardbook.getUUID"});

		// checkbox
		document.getElementById("preferDisplayNameCheckBox").addEventListener("input", wdw_cardEdition.savePreferDisplayName);

		// input
		let inputs = document.getElementById("rightPaneDownHbox2").querySelectorAll("input");
		for (let input of inputs) {
			if (input.hasAttribute("data-field-name")) {
				input.addEventListener("input", event => wdw_cardEdition.onInputField(event));
			}
		}
		for (let field of cardbookHTMLDates.dateFields) {
			let input = document.getElementById(`${field}InputText`);
			input.addEventListener("input", wdw_cardEdition.unsetWrongValidation);
		}

		// button
		document.getElementById('generalTab').addEventListener("click", event => wdw_cardEdition.showPane('generalTabPanel'));
		document.getElementById('noteTab').addEventListener("click", event => wdw_cardEdition.showPane('noteTabPanel'));
		document.getElementById('listTab').addEventListener("click", event => wdw_cardEdition.showPane('listTabPanel'));
		document.getElementById('keyTab').addEventListener("click", event => wdw_cardEdition.showPane('keyTabPanel'));
		document.getElementById('helpTab').addEventListener("click", event => wdw_cardEdition.showPane('helpTabPanel'));

		document.getElementById('searchForOnlineKeyEditButton').addEventListener("click", wdw_cardEdition.searchForOnlineKeyEdit);
		document.getElementById('searchForThKeyEditButton').addEventListener("click", wdw_cardEdition.searchForThKeyEdit);
		document.getElementById('searchForLocalKeyEditButton').addEventListener("click", wdw_cardEdition.searchForLocalKeyEdit);

		document.getElementById('autoComputeFnButton').addEventListener("click", event => wdw_cardEdition.autoComputeFn(event.target));
		document.getElementById('expandPersonalImage').addEventListener("click", event => wdw_cardEdition.expandButton(event.target));
		document.getElementById('expandOrgImage').addEventListener("click", event => wdw_cardEdition.expandButton(event.target));
		let convertButtons = document.getElementById("rightPaneDownHbox2").querySelectorAll("button.cardbookProcessClass");
		for (let button of convertButtons) {
			button.addEventListener("click", wdw_cardEdition.setConvertFunction);
		}
		let switchButtons = document.getElementById("rightPaneDownHbox2").querySelectorAll("button.cardbookSwitchButtonDownClass");
		for (let button of switchButtons) {
			button.addEventListener("click", wdw_cardEdition.switchLastnameAndFirstname);
		}
		document.getElementById('createTemplateButton').addEventListener("click", wdw_cardEdition.createTemplate);
		document.getElementById('openTemplateButton').addEventListener("click", wdw_cardEdition.loadTemplate);
		document.getElementById('applyTemplateButton').addEventListener("click", wdw_cardEdition.applyTemplate);
		document.getElementById('previousEditButton').addEventListener("click", event => wdw_cardEdition.changeContactFromOrder('previous'));
		document.getElementById('nextEditButton').addEventListener("click", event => wdw_cardEdition.changeContactFromOrder('next'));
		document.getElementById('createEditionButton').addEventListener("click", wdw_cardEdition.create);
		document.getElementById('createAndReplaceEditionButton').addEventListener("click", wdw_cardEdition.createAndReplace);
		document.getElementById('saveEditionButton').addEventListener("click", wdw_cardEdition.save);
		document.getElementById('cancelButton').addEventListener("click", wdw_cardEdition.cancel);

		// select
		document.getElementById('addressbookMenulist').addEventListener("change", wdw_cardEdition.changeAddressbook);
		document.getElementById('contactMenulist').addEventListener("change", wdw_cardEdition.changeContact);


		/* test
		ondblclick="wdw_imageEdition.addImageCardFromFile();" 
		ondrop="wdw_imageEdition.dragImageCard(event);"
		ondragenter="wdw_imageEdition.checkDragImageCard(event);"
		ondragover="wdw_imageEdition.checkDragImageCard(event);"
		*/

		wdw_cardEdition.workingCard = {};
		wdw_cardEdition.workingCard = await messenger.runtime.sendMessage({query: "cardbook.getCardParser", dirPrefId: wdw_cardEdition.cardIn.dirPrefId});
		wdw_cardEdition.workingCard = await wdw_cardEdition.cloneCard(wdw_cardEdition.cardIn, wdw_cardEdition.workingCard);

		await wdw_cardEdition.loadEditionMode();
		await wdw_cardEdition.setEditionFields();
		await wdw_cardEdition.changePreviousNext();
		await wdw_cardEdition.loadHelpTab();

		let ABList = document.getElementById('addressbookMenulist');
		let readonly = wdw_cardEdition.editionMode == "ViewContact" || wdw_cardEdition.editionMode == "ViewList";
		await cardbookHTMLTools.loadAddressBooks(ABList, wdw_cardEdition.workingCard.dirPrefId, true, false, readonly, false, false);
		console.log(wdw_cardEdition.workingCard.dirPrefId)
		document.getElementById('dirPrefIdTextBox').value = wdw_cardEdition.workingCard.dirPrefId;
		await wdw_cardEdition.loadContacts();
		console.log(document.getElementById('dirPrefIdTextBox').value)

		// the dirPrefId may be different from the one loaded in case of a complex search
		wdw_cardEdition.workingCard.dirPrefId = document.getElementById('addressbookMenulist').value;
		
		// test wdw_cardEdition.loadCssRules();
		await wdw_cardEdition.loadDefaultVersion();
		await wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
		
		wdw_cardEdition.cardRegion = await messenger.runtime.sendMessage({query: "cardbook.getCardRegion", card: wdw_cardEdition.workingCard});
		
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
			// test cardbookWindowUtils.validateAdrPanel();
			// test cardbookWindowUtils.cancelAdrPanel();
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

	calculateResult: async function (aCard) {
		aCard = await wdw_cardEdition.cloneCard(wdw_cardEdition.workingCard, aCard);
		aCard.dirPrefId = document.getElementById('addressbookMenulist').value;
		let ABType = await cardbookNewPreferences.getType(aCard.dirPrefId);

		aCard.version = document.getElementById("versionTextBox").value;
		aCard.categories = wdw_cardEdition.getCategories();
		
		aCard.org = wdw_cardEdition.getOrg(true);
		aCard.title = document.getElementById('titleInputText').value.trim();
		aCard.role = document.getElementById('roleInputText').value.trim();

		aCard.fn = document.getElementById('fnInputText').value.trim();
		
		aCard.lastname = document.getElementById('lastnameInputText').value.trim();
		aCard.firstname = document.getElementById('firstnameInputText').value.trim();
		aCard.othername = document.getElementById('othernameInputText').value.trim();
		aCard.suffixname = document.getElementById('suffixnameInputText').value.trim();
		aCard.prefixname = document.getElementById('prefixnameInputText').value.trim();
		aCard.nickname = document.getElementById('nicknameInputText').value.trim();
		aCard.gender = document.getElementById('genderMenulist').value.trim();

		var dateFormat = await cardbookHTMLUtils.getDateFormat(document.getElementById('dirPrefIdTextBox').value, document.getElementById('versionTextBox').value);
		for (var field of cardbookHTMLDates.dateFields) {
			aCard[field] = cardbookHTMLDates.getVCardDateFromDateString(document.getElementById(field + 'InputText').value, dateFormat);
		}

		aCard.birthplace = document.getElementById('birthplaceInputText').value.trim();
		aCard.deathplace = document.getElementById('deathplaceInputText').value.trim();
		
		aCard.note = document.getElementById('noteTextBox').value.trim();

		for (let media of wdw_cardEdition.allColumns.media) {
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

		for (let field of cardbookHTMLTypes.multilineFields) {
			aCard[field] = ""; // test cardbookWindowUtils.getAllTypes(field, true);
		}
		// test aCard.tz = cardbookWindowUtils.getAllTz(true);

		var keys = null; // test cardbookWindowUtils.getAllKeys(true);
		var re = /[\n\u0085\u2028\u2029]|\r\n?/g;
		keys = keys.map(key => {
			key.value = key.value.replace(/-----(BEGIN|END) PGP PUBLIC KEY BLOCK-----/g, "").trim().replace(re, "\\r\\n"); //key.value.replaceAll("\n", "\\n").replaceAll("\r", "\\r");
			return key;
		});
		aCard.key = keys;

		var othersTemp1 = [];
		for (var i in wdw_cardEdition.customFields) {
			for (var j = 0; j < wdw_cardEdition.customFields[i].length; j++) {
				if (document.getElementById('customField' + wdw_cardEdition.customFields[i][j][2] + i + 'TextBox')) {
					var customValue = document.getElementById('customField' + wdw_cardEdition.customFields[i][j][2] + i + 'TextBox').value.trim();
					if (customValue) {
						othersTemp1.push(wdw_cardEdition.customFields[i][j][0] + ":" + customValue);
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

		aCard.others = aCard.others.filter(element => !element.toUpperCase().startsWith(wdw_cardEdition.defaultEmailFormat));
		if (document.getElementById('preferMailFormatMenulist').value == "1") {
			aCard.others.push(wdw_cardEdition.defaultEmailFormat + ":FALSE");
		} else if (document.getElementById('preferMailFormatMenulist').value == "2") {
			aCard.others.push(wdw_cardEdition.defaultEmailFormat + ":TRUE");
		}

		var myPGNextNumber = cardbookHTMLUtils.rebuildAllPGs(aCard);
		var myEvents = null; // test cardbookWindowUtils.getAllEvents(true);
		cardbookHTMLUtils.addEventstoCard(aCard, myEvents, myPGNextNumber, dateFormat);

		// trying desesperately to find a Fn
		if (aCard.fn == "") {
			await cardbookHTMLFormulas.getDisplayedName(aCard, document.getElementById('dirPrefIdTextBox').value, [document.getElementById('prefixnameInputText').value.trim(),
															document.getElementById('firstnameInputText').value.trim(),
															document.getElementById('othernameInputText').value.trim(),
															document.getElementById('lastnameInputText').value.trim(),
															document.getElementById('suffixnameInputText').value.trim(),
															document.getElementById('nicknameInputText').value.trim()],
															[wdw_cardEdition.getOrg(false),
															document.getElementById('titleInputText').value.trim(),
															document.getElementById('roleInputText').value.trim()]);
		}
				
		/*if (aCard.isAList) {
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
			let kind = document.getElementById('kindTextBox').value.trim();
			await cardbookHTMLUtils.addMemberstoCard(aCard, members, kind);
		}*/
	},

	changePreviousNext: async function () {
		document.getElementById('previousEditButton').classList.add("hidden");
		document.getElementById('nextEditButton').classList.add("hidden");
		switch(wdw_cardEdition.editionMode) {
			case "ViewResult":
			case "ViewResultHideCreate":
			case "CreateContact":
			case "CreateList":
			case "AddEmail":
			case "EditTemplate":
				return;
		}
		document.getElementById('previousEditButton').classList.add("hidden");
		document.getElementById('nextEditButton').classList.add("hidden");
		let cards = await messenger.runtime.sendMessage({query: "cardbook.getNextAndPreviousCard", cbid: wdw_cardEdition.cardIn.cbid});
		if (cards.previous) {
			document.getElementById("previousEditButton").classList.remove("hidden");
		}
		if (cards.next) {
			document.getElementById("nextEditButton").classList.remove("hidden");
		}
	},

	changeContactFromOrder: async function (aOrder) {
		wdw_cardEdition.editionAction = "SAVE";
		await wdw_cardEdition.saveFinal(false);
		wdw_cardEdition.editionAction = "";
		let cards = await messenger.runtime.sendMessage({query: "cardbook.getNextAndPreviousCard", cbid: wdw_cardEdition.cardIn.cbid});
		wdw_cardEdition.cardIn = await messenger.runtime.sendMessage({query: "cardbook.getCardParser"});
		if (aOrder == "next") {
			wdw_cardEdition.cardIn = await wdw_cardEdition.cloneCard(cards.next, wdw_cardEdition.cardIn);
		} else {
			wdw_cardEdition.cardIn = await wdw_cardEdition.cloneCard(cards.previous, wdw_cardEdition.cardIn);
		}

		if (wdw_cardEdition.cardIn.isAList) {
			var myType = "List";
		} else {
			var myType = "Contact";
		}
		if (await cardbookNewPreferences.getReadOnly(wdw_cardEdition.cardIn.dirPrefId)) {
			wdw_cardEdition.editionMode = "View" + myType;
		} else {
			wdw_cardEdition.editionMode = "Edit" + myType;
		}
		await wdw_cardEdition.load();
	},

	validate: async function (aCard) {
		if (await cardEditionHTMLValidations.validateOffice365(aCard) &&
			cardEditionHTMLValidations.validateMailPopularity() &&
			await cardEditionHTMLValidations.validateDateFields() &&
			cardEditionHTMLValidations.validateEvents() &&
			wdw_cardEdition.editionMode != "ViewContact" && 
			wdw_cardEdition.editionMode != "ViewList") {
			wdw_cardEdition.unsetWrongValidation();
			return true;
		} else {
			return false;
		}
	},

	saveFinal: async function (aClose = true) {
		var myOutCard = await messenger.runtime.sendMessage({query: "cardbook.getCardParser"});
		await wdw_cardEdition.calculateResult(myOutCard);
		if (await wdw_cardEdition.validate(myOutCard)) {
			wdw_cardEdition.saveMailPopularity();

			wdw_cardEdition.workingCard = null;
			// no change, no save
			if (wdw_cardEdition.editionMode != "ViewResult" && wdw_cardEdition.editionMode != "ViewResultHideCreate") {
				cardbookHTMLUtils.sortArrayByString(wdw_cardEdition.cardIn.categories,1)
				let cardin = await messenger.runtime.sendMessage({query: "cardbook.cardToVcardData", card: wdw_cardEdition.cardIn});
				cardbookHTMLUtils.sortArrayByString(myOutCard.categories,1)
				let cardout = await messenger.runtime.sendMessage({query: "cardbook.cardToVcardData", card: myOutCard});
				if (cardin == cardout && wdw_cardEdition.cardIn.dirPrefId == myOutCard.dirPrefId) {
					if (aClose) {
						wdw_cardEdition.cancel();
					}
					await messenger.runtime.sendMessage({query: "cardbook.notifyObserver", value: "cardbook.cardEdited"});
					return;
				}
			}

			myOutCard.uid = myOutCard.uid.replace(/^urn:uuid:/i, "");
			if (await cardbookNewPreferences.getUrnuuid(myOutCard.dirPrefId)) {
				myOutCard.uid = "urn:uuid:" + myOutCard.uid;
			}

			// test if (wdw_cardEdition.editionMode == "AddEmail") {
			// test 	await wdw_cardEdition.cloneCard(myOutCard, wdw_cardEdition.cardIn);
			// test }

			if (wdw_cardEdition.editionMode == "EditTemplate") {
				wdw_cardEdition.saveTemplate(myOutCard);
			} else {
				let test;
				// test cardbookWindowUtils.saveEditionWindow(wdw_cardEdition.cardIn, myOutCard, wdw_cardEdition.editionMode);
			}
			if (aClose) {
				wdw_cardEdition.closeWindow();
			}
		}
	},

	create: function () {
		wdw_cardEdition.editionAction = "CREATE";
		wdw_cardEdition.saveFinal();
	},

	createAndReplace: function () {
		wdw_cardEdition.editionAction = "CREATEANDREPLACE";
		wdw_cardEdition.saveFinal();
	},

	save: function () {
		wdw_cardEdition.editionAction = "SAVE";
		wdw_cardEdition.saveFinal();
	},

	returnKey: function () {
		let focusedElement = document.commandDispatcher.focusedElement; 
		if (focusedElement.id == "addEmailInput") {
			wdw_cardEdition.modifyLists(focusedElement);
			return;
		} else if (wdw_cardEdition.editionMode == "ViewResult" || wdw_cardEdition.editionMode == "ViewResultHideCreate") {
			return;
		} else if (document.getElementById('adrPanel').state == 'open') {
			// test cardbookWindowUtils.validateAdrPanel();
			return;
		}
		wdw_cardEdition.save();
	},

	cancel: function () {
		wdw_cardEdition.editionAction = "CANCEL";
		wdw_cardEdition.closeWindow();
	},

	closeWindow: function () {
		close();
	}
};


window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

wdw_cardEdition.load();

messenger.runtime.onMessage.addListener( (info) => {
	switch (info.query) {
	}
});

messenger.runtime.onMessage.addListener( (info) => {
	switch (info.query) {
		case "cardbook.callFilePickerDone":
			if (info.id == wdw_cardEdition.loadTemplateFilePickerId) {
				wdw_cardEdition.loadTemplateNext(info.file);
			} else if (info.id == wdw_cardEdition.applyTemplateFilePickerId) {
				wdw_cardEdition.applyTemplateNext(info.file);
			}
			break;
		case "cardbook.pref.preferencesChanged":
			wdw_cardEdition.setEditionFields();
			wdw_cardEdition.loadEditionFields();
			// test wdw_cardEdition.loadFieldSelector();
			wdw_cardEdition.setConvertButtons();
			wdw_cardEdition.changePreviousNext();
			break;
		case "cardbook.callFilePickerDone":
			loadTemplateNext(info.id, info.file);
			break;
	}
});
