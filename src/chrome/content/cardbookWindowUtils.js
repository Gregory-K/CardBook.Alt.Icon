if ("undefined" == typeof(cardbookWindowUtils)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/lists/cardbookListConversion.js", this);

	var cardbookWindowUtils = {

		getBroadcasterOnCardBook: function () {
			if (document.getElementById('cardboookModeBroadcasterTab')) {
				if (document.getElementById('cardboookModeBroadcasterTab').getAttribute('mode') == 'cardbook') {
					return true;
				}
			} else if (document.getElementById('cardboookModeBroadcasterWindow')) {
				if (document.getElementById('cardboookModeBroadcasterWindow').getAttribute('mode') == 'cardbook') {
					return true;
				}
			}
			return false;
		},

		callFilePicker: function (aTitle, aMode, aType, aDefaultFileName, aDefaultDir, aCallback, aCallbackParam) {
			try {
				var myWindowTitle = cardbookRepository.extension.localeData.localizeMessage(aTitle);
				var nsIFilePicker = Components.interfaces.nsIFilePicker;
				var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
				if (aMode === "SAVE") {
					fp.init(window, myWindowTitle, nsIFilePicker.modeSave);
				} else if (aMode === "OPEN") {
					fp.init(window, myWindowTitle, nsIFilePicker.modeOpen);
				}
				if (aType === "VCF") {
					fp.appendFilter("VCF File","*.vcf");
				} else if (aType === "TPL") {
					fp.appendFilter("TPL File","*.tpl");
				} else if (aType === "GPG") {
					fp.appendFilter("ASC File","*.asc");
					fp.appendFilter("PUB File","*.pub");
					fp.appendFilter("GPG File","*.gpg");
				} else if (aType === "EXPORTFILE") {
					//bug 545091 on linux and macosx
					fp.defaultExtension = "vcf";
					fp.appendFilter("VCF File","*.vcf");
					fp.appendFilter("CSV File","*.csv");
				} else if (aType === "IMAGES") {
					fp.appendFilters(nsIFilePicker.filterImages);
				}
				fp.appendFilters(fp.filterAll);
				if (aDefaultFileName) {
					fp.defaultString = aDefaultFileName;
				}
				if (aDefaultDir) {
					fp.displayDirectory = aDefaultDir;
				}
				fp.open(rv => {
					if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
						aCallback(fp.file, aCallbackParam);
					}
				});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.callFilePicker error : " + e, "Error");
			}
		},

		callDirPicker: function (aTitle, aCallback, aCallbackParam) {
			try {
				var myWindowTitle = cardbookRepository.extension.localeData.localizeMessage(aTitle);
				var nsIFilePicker = Components.interfaces.nsIFilePicker;
				var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
				fp.init(window, myWindowTitle, nsIFilePicker.modeGetFolder);
				fp.open(rv => {
					if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
						aCallback(fp.file, aCallbackParam);
					}
				});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.callDirPicker error : " + e, "Error");
			}
		},

		getSelectedCards: function () {
			let selectedCards = [];
			for (let index of cardbookHTMLCardsTree.cardsList.selectedIndices) {
				selectedCards.push(cardbookHTMLCardsTree.cardsList.view._rowMap[index].card);
			}
			return selectedCards;
		},

		getSelectedCardsCount: function () {
			return cardbookHTMLCardsTree.cardsList.selectedIndices.length;
		},

		getSelectedCardsDirPrefId: function () {
			let selectedDir = [];
			for (let index of cardbookHTMLCardsTree.cardsList.selectedIndices) {
				selectedDir.push(cardbookHTMLCardsTree.cardsList.view._rowMap[index].card.dirPrefId);
			}
			return cardbookRepository.arrayUnique(selectedDir);
		},

		getSelectedCardsId: function () {
			let selectedUids = [];
			for (let index of cardbookHTMLCardsTree.cardsList.selectedIndices) {
				selectedUids.push(cardbookHTMLCardsTree.cardsList.view._rowMap[index].card.cbid);
			}
			return selectedUids;
		},

		setSelectedPreviousCard: function () {
			let index = Math.min(...cardbookHTMLCardsTree.cardsList.selectedIndices);
			index = index == 0  ? 0 : index - 1;
			cardbookHTMLCardsTree.cardsList.selectedIndices = [ index ];
		},

		setSelectedCards: function (aListOfCard) {
			let cards = JSON.parse(JSON.stringify(aListOfCard));
			let indexFound = [];
			for (let index in cardbookHTMLCardsTree.cardsList.view._rowMap) {
				let i = cards.length
				while (i--) {
					if (cards[i].cbid == cardbookHTMLCardsTree.cardsList.view._rowMap[index].card.cbid) {
						indexFound.push(parseInt(index));
						cards.splice(i, 1);
						break;
					}
				}
				if (cards.length == 0) {
					break;
				}
			}
			cardbookHTMLCardsTree.cardsList.selectedIndices = indexFound;
		},

		getCardsFromAccountsOrCats: function () {
			try {
				let listOfSelectedCard = [];
				for (let index in cardbookHTMLCardsTree.cardsList.view._rowMap) {
					let card = cardbookHTMLCardsTree.cardsList.view._rowMap[index].card;
					listOfSelectedCard.push(card);
				}
				return listOfSelectedCard;
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.getCardsFromAccountsOrCats error : " + e, "Error");
			}
		},

		openConfigurationWindow: async function() {
			try {
				let url = "chrome/content/configuration/wdw_cardbookConfiguration.html";
				await notifyTools.notifyBackground({query: "cardbook.openTab",
													url: url,
													type: "popup"});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.openConfigurationWindow error : " + e, "Error");
			}
		},

		openEditionWindow: function(aCard, aMode) {
			try {
				let windowsList = Services.wm.getEnumerator("CardBook:contactEditionWindow");
				let found = false;
				while (windowsList.hasMoreElements()) {
					let myWindow = windowsList.getNext();
					if (myWindow.arguments[0] && myWindow.arguments[0].cardIn && myWindow.arguments[0].cardIn.cbid == aCard.cbid) {
						myWindow.focus();
						found = true;
						break;
					}
				}
				if (!found) {
					let callback = cardbookWindowUtils.saveEditionWindow;
					if (aMode == "EditTemplate") {
						callback = wdw_templateEdition.saveTemplate;
					}
					let myArgs = {cardIn: aCard, cardOut: {}, editionMode: aMode, cardEditionAction: "", editionCallback: callback};
					Services.wm.getMostRecentWindow(null).openDialog("chrome://cardbook/content/cardEdition/wdw_cardEdition.xhtml", "", cardbookRepository.windowParams, myArgs);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.openEditionWindow error : " + e, "Error");
			}
		},

		saveEditionWindow: async function(aOrigCard, aOutCard, aMode) {
			try {
				switch (aMode) {
					// case "EditList":
					// case "EditContact":
					// case "CreateContact":
					// case "CreateList":
					// case "AddEmail":
					case "ViewList":
					case "ViewContact":
						return;
						break;
				}
				if (cardbookRepository.cardbookCards[aOutCard.dirPrefId+"::"+aOutCard.uid]) {
					var myTopic = "cardModified";
				} else {
					var myTopic = "cardCreated";
				}
				var myActionId = cardbookActions.startAction(myTopic, [aOutCard.fn]);
				await cardbookRepository.saveCardFromUpdate(aOrigCard, aOutCard, myActionId, true);
				await cardbookActions.endAction(myActionId);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.saveEditionWindow error : " + e, "Error");
			}
		},

		openURL: function (aUrl) {
			try {
				var uri = Services.io.newURI(aUrl, null, null);
			}
			catch(e) {
				cardbookRepository.cardbookUtils.formatStringForOutput("invalidURL", [aUrl], "Error");
				return;
			}
			var localizeTarget = cardbookRepository.cardbookPrefs["localizeTarget"];
			if (localizeTarget === "in") {
				let tabmail = document.getElementById("tabmail");
				if (!tabmail) {
					// Try opening new tabs in an existing 3pane window
					let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
					if (mail3PaneWindow) {
						tabmail = mail3PaneWindow.document.getElementById("tabmail");
						mail3PaneWindow.focus();
					}
				}
				if (tabmail) {
					tabmail.openTab("contentTab", {url: aUrl});
				} else {
					Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://messenger/content/", "_blank","chrome,dialog=no,all", null,
					{ tabType: "contentTab", tabParams: {contentPage: aUrl} });
				}
			} else if (localizeTarget === "out") {
				cardbookRepository.cardbookUtils.openExternalURL(aUrl);
			}
		},

		openIMPP: function (aIMPPRow) {
			var serviceCode = cardbookRepository.cardbookTypes.getIMPPCode(aIMPPRow[1]);
			var serviceProtocol = cardbookRepository.cardbookTypes.getIMPPProtocol(aIMPPRow[0]);
			if (serviceCode != "") {
				var serviceLine = [];
				serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForCode(serviceCode)
				if (serviceLine[0]) {
					var myValue = aIMPPRow[0].join(" ");
					var myRegexp = new RegExp("^" + serviceLine[2] + ":");
					var myAddress = aIMPPRow[0][0].replace(myRegexp, "");
					cardbookRepository.cardbookUtils.openExternalURL(cardbookRepository.cardbookUtils.formatIMPPForOpenning(serviceLine[2] + ":" + myAddress));
				}
			} else if (serviceProtocol != "") {
				var serviceLine = [];
				serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForProtocol(serviceProtocol)
				if (serviceLine[0]) {
					var myRegexp = new RegExp("^" + serviceLine[2] + ":");
					var myAddress = aIMPPRow[0][0].replace(myRegexp, "");
					cardbookRepository.cardbookUtils.openExternalURL(cardbookRepository.cardbookUtils.formatIMPPForOpenning(serviceLine[2] + ":" + myAddress));
				}
			}
		},

		openTel: function (aValue) {
			var telProtocol = "callto";
			var telProtocolLine = cardbookRepository.cardbookPrefs["tels.0"];
			if (telProtocolLine) {
				var telProtocolLineArray = telProtocolLine.split(':');
				if (telProtocolLineArray[2]) {
					telProtocol = telProtocolLineArray[2];
				}
			}
			var myValue = cardbookRepository.cardbookUtils.formatTelForOpenning(aValue);
			if (telProtocol != "url") {
				var myResult = telProtocol + ":" + myValue;
				cardbookRepository.cardbookUtils.openExternalURL(myResult);
			} else {
				var myUrl = cardbookRepository.cardbookPrefs["URLPhoneURL"].replace("{{1}}", myValue).replace("$1", myValue);
				var myBackground = cardbookRepository.cardbookPrefs["URLPhoneBackground"];
				if (myBackground) {
					var myUser = cardbookRepository.cardbookPrefs["URLPhoneUser"];
					var myPassword = cardbookRepository.cardbookPasswordManager.getPassword(myUser, myUrl);
					var req = CardbookHttpRequest(myUrl, myUser);
					req.withCredentials = true;					
					req.open('GET', myUrl, true, myUser, myPassword);
					req.send(null);
				} else {
					cardbookRepository.cardbookUtils.openExternalURL(myUrl);
				}
			}
		},

		panelMenupopupHiding: function (aEvent, aType, aMenupopupName) {
			cardbookWindowUtils.updateComplexMenulist(aType, aMenupopupName);
			if (aType === "type") {
				return true;
			} else {
				return aEvent.explicitOriginalTarget.localName != "menuitem";
			}
		},

		panelMenulistKeydown: function (aEvent, aType, aMenupopupName) {
			let myMenupopup = document.getElementById(aMenupopupName);
			let myMenulist = document.getElementById(aMenupopupName.replace("Menupopup", "Menulist"));
			let myTextbox = document.getElementById(aMenupopupName.replace("Menupopup", "Textbox"));
			switch (aEvent.key) {
				case "Escape":
					myMenupopup.hidePopup();
					setTimeout(function() {
							myMenulist.focus();
						}, 0);
					aEvent.stopImmediatePropagation();
					aEvent.preventDefault();
					return;
				case "ArrowDown":
				case "ArrowUp":
					myMenupopup.openPopup(myMenupopup, "after_start", 0, 0, false, false);
					setTimeout(function() {
							myTextbox.focus();
						}, 0);
					aEvent.preventDefault();
					return;
				default:
					return;
			}
		},

		panelTextboxKeydown: function (aEvent, aType, aMenupopupName) {
			let itemValue = aEvent.target.value;
			let myMenupopup = document.getElementById(aMenupopupName);
			let myMenulist = document.getElementById(aMenupopupName.replace("Menupopup", "Menulist"));
			switch (aEvent.key) {
				case "Escape":
					if (itemValue) {
						aEvent.target.value = "";
					} else {
						myMenupopup.hidePopup();
					}
					setTimeout(function() {
							myMenulist.focus();
						}, 0);
					aEvent.stopImmediatePropagation();
					aEvent.preventDefault();
					return;
				case "Enter":
					itemValue = itemValue.trim();
					if (itemValue != "") {
						break;
					}
					return;
				default:
					return;
			}
			aEvent.preventDefault();

			let itemList = myMenupopup.querySelectorAll("menuitem.cardbook-item");
			let items = Array.from(itemList, item => item.getAttribute("label"));
			
			let newIndex = items.indexOf(itemValue);
			if (newIndex > -1) {
				let item = itemList[newIndex];
				if (item.hasAttribute("checked")) {
					item.removeAttribute("checked");
				} else {
					item.setAttribute("checked", true);
				}
			} else {
				items.push(itemValue);
				cardbookRepository.cardbookUtils.sortArrayByString(items,1);
				newIndex = items.indexOf(itemValue);
				
				let item = document.createXULElement("menuitem");
				item.setAttribute("class", "menuitem-iconic cardbook-item");
				item.setAttribute("label", itemValue);
				item.setAttribute("value", itemValue);
				if (aType == "type") {
					item.setAttribute("type", "radio");
				} else {
					item.setAttribute("type", "checkbox");
				}
				item.setAttribute("checked", "true");
				myMenupopup.insertBefore(item, itemList[newIndex]);
			}
			
			aEvent.target.value = "";
			// By pushing this to the end of the event loop, the other checked items in the list
			// are cleared, where only one category is allowed.
			setTimeout(function() {
					cardbookWindowUtils.updateComplexMenulist(aType, aMenupopupName);
				}, 0);
		},

		updateComplexMenulist: function (aType, aMenupopupName) {
			let myMenupopup = document.getElementById(aMenupopupName);
			let myMenulist = document.getElementById(aMenupopupName.replace("Menupopup", "Menulist"));

			let label = "";
			let itemsList = myMenupopup.querySelectorAll("menuitem.cardbook-item[checked]");
			if (aType == "fields") {
				label = cardbookRepository.extension.localeData.localizeMessage("editionGroupboxLabel");
			} else if (itemsList.length > 1) {
				if (aType == "category") {
					label = cardbookRepository.extension.localeData.localizeMessage("multipleCategories");
				} else if (aType == "type") {
					label = cardbookRepository.extension.localeData.localizeMessage("multipleTypes");
				}
			} else if (itemsList.length == 1) {
				label = itemsList[0].getAttribute("label");
			} else {
				if (aType == "category") {
					label = cardbookRepository.extension.localeData.localizeMessage("none");
				} else if (aType == "type") {
					// label = cardbookRepository.extension.localeData.localizeMessage("noType");
					// better empty
					label = "";
				}
			}
			myMenulist.setAttribute("label", label);
		},

		addToCardBookMenuSubMenu: function(aMenuName, aIdentityKey, aCallback, aProperties) {
			try {
				var ABInclRestrictions = {};
				var ABExclRestrictions = {};
				var catInclRestrictions = {};
				var catExclRestrictions = {};

				function _loadRestrictions(aIdentityKey) {
					var result = [];
					result = cardbookRepository.cardbookPreferences.getAllRestrictions();
					ABInclRestrictions = {};
					ABExclRestrictions = {};
					catInclRestrictions = {};
					catExclRestrictions = {};
					if (!aIdentityKey) {
						ABInclRestrictions["length"] = 0;
						return;
					}
					for (var i = 0; i < result.length; i++) {
						var resultArray = result[i];
						if ((resultArray[0] == "true") && (resultArray[3] != "") && ((resultArray[2] == aIdentityKey) || (resultArray[2] == "allMailAccounts"))) {
							if (resultArray[1] == "include") {
								ABInclRestrictions[resultArray[3]] = 1;
								if (resultArray[4]) {
									if (!(catInclRestrictions[resultArray[3]])) {
										catInclRestrictions[resultArray[3]] = {};
									}
									catInclRestrictions[resultArray[3]][resultArray[4]] = 1;
								}
							} else {
								if (resultArray[4]) {
									if (!(catExclRestrictions[resultArray[3]])) {
										catExclRestrictions[resultArray[3]] = {};
									}
									catExclRestrictions[resultArray[3]][resultArray[4]] = 1;
								} else {
									ABExclRestrictions[resultArray[3]] = 1;
								}
							}
						}
					}
					ABInclRestrictions["length"] = cardbookRepository.cardbookUtils.sumElements(ABInclRestrictions);
				};

				_loadRestrictions(aIdentityKey);

				var myPopup = document.getElementById(aMenuName);
				while (myPopup.hasChildNodes()) {
					myPopup.lastChild.remove();
				}
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[2] && !account[4] && (account[3] != "SEARCH")) {
						var myDirPrefId = account[1];
						if (cardbookRepository.verifyABRestrictions(myDirPrefId, "allAddressBooks", ABExclRestrictions, ABInclRestrictions)) {
							var menuItem = document.createXULElement("menuitem");
							menuItem.setAttribute("id", account[1]);
							for (let prop in aProperties) {
								menuItem.setAttribute(prop, aProperties[prop]);
							}
							menuItem.addEventListener("command", function(aEvent) {
									// first case add an attachment
									if (this.hasAttribute('emailAttachment')) {
										aCallback(this.id);
									} else {
										let headerField = aEvent.currentTarget.parentNode.parentNode.parentNode.headerField;
										aCallback(this.id, headerField.emailAddress, headerField.displayName);
									}
									aEvent.stopPropagation();
								}, false);
							menuItem.setAttribute("label", account[0]);
							myPopup.appendChild(menuItem);
						}
					}
				}
			}
			catch (e) {
				var errorTitle = "addToCardBookMenuSubMenu";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		adjustFields: function () {
			var nullableFields = {fn: [ 'fn' ],
									personal: [ 'lastname', 'firstname', 'othername', 'prefixname', 'suffixname', 'nickname', 'bday', 'gender', 'birthplace', 'anniversary', 'deathdate', 'deathplace' ],
									categories: [ 'categories' ],
									note: [ 'note' ],
									misc: [ 'mailer', 'geo', 'sortstring', 'class1', 'tz', 'agent', 'key', 'photoURI', 'logoURI', 'soundURI' ],
									tech: [ 'dirPrefId', 'version', 'prodid', 'uid', 'cardurl', 'rev', 'etag' ],
									others: [ 'others' ],
									vcard: [ 'vcard' ],
									};
			for (var i in nullableFields) {
				var found1 = false;
				var found2 = false;
				var found = false;
				for (var field of nullableFields[i]) {
					var row = document.getElementById(field + 'Row');
					var textbox = document.getElementById(field + 'TextBox');
					var textbox1 = document.getElementById(field + 'classicalTextBox');
					var textbox2 = document.getElementById(field + 'modernTextBox');
					var label = document.getElementById(field + 'Label');
					if (textbox) {
						var myTestValue = "";
						if (textbox.value) {
							myTestValue = textbox.value;
						} else {
							myTestValue = textbox.getAttribute('value');
						}
						if (myTestValue) {
							if (row) {
								row.removeAttribute('hidden');
							}
							if (textbox) {
								textbox.removeAttribute('hidden');
							}
							if (label) {
								label.removeAttribute('hidden');
							}
							found = true;
						} else {
							if (row) {
								row.setAttribute('hidden', 'true');
							}
							if (textbox) {
								textbox.setAttribute('hidden', 'true');
							}
							if (label) {
								label.setAttribute('hidden', 'true');
							}
						}
					}
					if (textbox1) {
						var myTestValue = "";
						if (textbox1.value) {
							myTestValue = textbox1.value;
						} else {
							myTestValue = textbox1.getAttribute('value');
						}
						if (myTestValue) {
							if (row) {
								row.removeAttribute('hidden');
							}
							if (textbox1) {
								textbox1.removeAttribute('hidden');
							}
							if (label) {
								label.removeAttribute('hidden');
							}
							found1 = true;
						} else {
							if (row) {
								row.setAttribute('hidden', 'true');
							}
							if (textbox1) {
								textbox1.setAttribute('hidden', 'true');
							}
							if (label) {
								label.setAttribute('hidden', 'true');
							}
						}
					}
					if (textbox2) {
						var myTestValue = "";
						if (textbox2.value) {
							myTestValue = textbox2.value;
						} else {
							myTestValue = textbox2.getAttribute('value');
						}
						if (myTestValue) {
							if (row) {
								row.removeAttribute('hidden');
							}
							if (textbox2) {
								textbox2.removeAttribute('hidden');
							}
							if (label) {
								label.removeAttribute('hidden');
							}
							found2 = true;
						} else {
							if (row) {
								row.setAttribute('hidden', 'true');
							}
							if (textbox2) {
								textbox2.setAttribute('hidden', 'true');
							}
							if (label) {
								label.setAttribute('hidden', 'true');
							}
						}
					}
				}
				if (cardbookRepository.customFields[i]) {
					for (var j = 0; j < cardbookRepository.customFields[i].length; j++) {
						if (document.getElementById('customField' + cardbookRepository.customFields[i][j][2] + i + 'TextBox')) {
							if (document.getElementById('customField' + cardbookRepository.customFields[i][j][2] + i + 'TextBox').value != "") {
								found = true;
							}
						}
					}
				}
				var groupbox = document.getElementById(i + 'Groupbox');
				if (groupbox) {
					if (found) {
						groupbox.removeAttribute('hidden');
					} else {
						groupbox.setAttribute('hidden', 'true');
					}
				}
				var groupbox1 = document.getElementById(i + 'classicalGroupbox');
				if (groupbox1) {
					if (found1) {
						groupbox1.removeAttribute('hidden');
					} else {
						groupbox1.setAttribute('hidden', 'true');
					}
				}
				var label1 = document.getElementById(i + 'classicalLabel');
				if (label1) {
					if (found1) {
						label1.removeAttribute('hidden');
					} else {
						label1.setAttribute('hidden', 'true');
					}
				}
				var groupbox2 = document.getElementById(i + 'modernGroupbox');
				if (groupbox2) {
					if (found2) {
						groupbox2.removeAttribute('hidden');
					} else {
						groupbox2.setAttribute('hidden', 'true');
					}
				}
				var label2 = document.getElementById(i + 'modernLabel');
				if (label2) {
					if (found2) {
						label2.removeAttribute('hidden');
					} else {
						label2.setAttribute('hidden', 'true');
					}
				}
			}
			
			if (document.getElementById('categoriesclassicalRow')) {
				var groupbox = document.getElementById('categoriesclassicalGroupbox');
				if (document.getElementById('categoriesclassicalRow').childElementCount != "0") {
					groupbox.removeAttribute('hidden');
				} else {
					groupbox.setAttribute('hidden', 'true');
				}
			}
			if (document.getElementById('categoriesmodernGroupbox')) {
				var groupbox = document.getElementById('categoriesmodernGroupbox');
				if (document.getElementById('categoriesmodernRow').childElementCount != "0") {
					groupbox.removeAttribute('hidden');
				} else {
					groupbox.setAttribute('hidden', 'true');
				}
			}
			var groupbox = document.getElementById('orgGroupbox');
			if (document.getElementById('orgTable').childElementCount != "0") {
				groupbox.removeAttribute('hidden');
			} else {
				groupbox.setAttribute('hidden', 'true');
			}
		},

		displayCard: function (aCard, aReadOnly) {
			var fieldArray = [ "fn", "lastname", "firstname", "othername", "prefixname", "suffixname", "nickname",
								"birthplace", "deathplace", "mailer", "sortstring",
								"class1", "agent", "prodid", "uid", "version", "dirPrefId", "cardurl", "etag" ];
			for (var field of fieldArray) {
				if (document.getElementById(field + 'TextBox') && aCard[field]) {
					document.getElementById(field + 'TextBox').value = aCard[field];
					if (aReadOnly) {
						document.getElementById(field + 'TextBox').setAttribute('readonly', 'true');
						document.getElementById(field + 'TextBox').addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
					} else {
						document.getElementById(field + 'TextBox').removeAttribute('readonly');
					}
				}
			}
			var fieldArray = [ "bday", "anniversary", "deathdate", "rev" ];
			for (var field of fieldArray) {
				if (document.getElementById(field + 'TextBox') && aCard[field]) {
					if (aReadOnly) {
						document.getElementById(field + 'TextBox').value = cardbookRepository.cardbookDates.getFormattedDateForCard(aCard, field);
						document.getElementById(field + 'TextBox').setAttribute('readonly', 'true');
						document.getElementById(field + 'TextBox').addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
					}
				}
			}
			if (aCard.gender != "") {
				document.getElementById('genderTextBox').value = cardbookRepository.cardbookGenderLookup[aCard.gender];
				if (aReadOnly) {
					document.getElementById('genderTextBox').setAttribute('readonly', 'true');
					document.getElementById('genderTextBox').addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
				} else {
					document.getElementById('genderTextBox').removeAttribute('readonly');
				}
			}

			let listbox = document.getElementById('listGroupbox');
			if (aCard.isAList) {
				listbox.removeAttribute('hidden');
				if (aReadOnly) {
					document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
				} else {
					document.getElementById('PreferMailFormatReadWriteGroupbox').setAttribute('hidden', 'true');
				}
			} else {
				listbox.setAttribute('hidden', 'true');
				let mailFormat = cardbookRepository.cardbookUtils.getMailFormatFromCard(aCard);
				if (aReadOnly) {
					if (mailFormat == "1") {
						document.getElementById('PreferMailFormatReadOnlyGroupbox').removeAttribute('hidden');
						document.getElementById('PreferMailFormatTextbox').value = cardbookRepository.extension.localeData.localizeMessage("PlainText.label");
					} else if (mailFormat == "2") {
						document.getElementById('PreferMailFormatReadOnlyGroupbox').removeAttribute('hidden');
						document.getElementById('PreferMailFormatTextbox').value = cardbookRepository.extension.localeData.localizeMessage("HTML.label");
					} else {
						document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
					}
				} else {
					document.getElementById('PreferMailFormatReadWriteGroupbox').removeAttribute('hidden');
					document.getElementById("PreferMailFormatPopup").value = mailFormat;
				}
			}

			var myRemainingOthers = [];
			myRemainingOthers = cardbookWindowUtils.constructCustom(aReadOnly, 'personal', aCard.others);
			
			cardbookWindowUtils.constructOrg(aReadOnly, aCard.org, aCard.title, aCard.role);
			myRemainingOthers = cardbookWindowUtils.constructCustom(aReadOnly, 'org', myRemainingOthers);
            
			var fieldArray = [ [ "photo", "URI" ], [ "logo", "URI" ], [ "sound", "URI" ] ];
			for (var field of fieldArray) {
				if (document.getElementById(field[0] + field[1] + 'TextBox')) {
					document.getElementById(field[0] + field[1] + 'TextBox').value = aCard[field[0]][field[1]];
					if (aReadOnly) {
						document.getElementById(field[0] + field[1] + 'TextBox').setAttribute('readonly', 'true');
					} else {
						document.getElementById(field[0] + field[1] + 'TextBox').removeAttribute('readonly');
					}
				}
			}
			
			wdw_imageEdition.displayImageCard(aCard, !aReadOnly);
			cardbookWindowUtils.display40(aCard.version, aReadOnly);
			cardbookWindowUtils.displayDates(aCard.version, aReadOnly);

			var myNoteArray = aCard.note.split("\n");
			var myEvents = cardbookRepository.cardbookUtils.getEventsFromCard(myNoteArray, myRemainingOthers);
			if (aCard.isAList) {
				if (aReadOnly) {
					cardbookWindowUtils.loadStaticList(aCard);
				} else {
					wdw_cardEdition.displayLists(aCard);
				}
			} else {
				cardbookElementTools.deleteRowsAllTypes();
				for (let field of cardbookRepository.multilineFields) {
					if (aReadOnly) {
						if (aCard[field].length > 0) {
							cardbookWindowUtils.constructStaticRows(aCard.dirPrefId, field, aCard[field], aCard.version);
						}
					} else {
						if (field == "impp") {
							cardbookRepository.cardbookTypes.loadIMPPs(aCard[field]);
						}
						cardbookWindowUtils.constructDynamicRows(field, aCard[field], aCard.version);
					}
				}
				if (aReadOnly) {
					cardbookWindowUtils.constructStaticEventsRows(aCard.dirPrefId, myEvents.result, aCard.version);
				} else {
					cardbookWindowUtils.constructDynamicEventsRows(aCard.dirPrefId, "event", myEvents.result, aCard.version);
				}
				let field = [];
				if (Array.isArray(aCard.tz)) {
					field = aCard.tz;
				} else {
					field = [[aCard.tz]];
				}
				if (aReadOnly) {
					cardbookWindowUtils.constructStaticTzRows(field);
				} else {
					cardbookWindowUtils.constructDynamicTzRows("tz", field);
				}
			}
			
			document.getElementById('othersTextBox').value = myEvents.remainingOthers.join("\n");
			if (document.getElementById('othersTextBox')) {
				if (aReadOnly) {
					document.getElementById('othersTextBox').setAttribute('readonly', 'true');
				} else {
					document.getElementById('othersTextBox').removeAttribute('readonly');
				}
			}
			var panesView = cardbookRepository.cardbookPrefs["panesView"];
			if (document.getElementById('note' + panesView + 'TextBox')) {
				var myNoteBox = document.getElementById('note' + panesView + 'TextBox');
			} else if (document.getElementById('noteTextBox')) {
				var myNoteBox = document.getElementById('noteTextBox');
			}
			if (myNoteBox) {
				myNoteBox.value = myEvents.remainingNote.join("\n");
				if (aReadOnly) {
					myNoteBox.setAttribute('readonly', 'true');
				} else {
					myNoteBox.removeAttribute('readonly');
				}
			}
			cardbookWindowUtils.loadEmailProperties(aCard, aReadOnly);
			
			if (aReadOnly) {
				cardbookWindowUtils.constructStaticKeysRows(aCard.dirPrefId, aCard.key, aCard.version, aCard.fn, aCard.dirPrefId);
			} else {
				cardbookWindowUtils.constructDynamicKeysRows(aCard.dirPrefId, "key", aCard.key, aCard.version);
			}
		},

		clearCard: function () {
			var fieldArray = [ "fn", "lastname", "firstname", "othername", "prefixname", "suffixname", "nickname", "gender",
								"bday", "birthplace", "anniversary", "deathdate", "deathplace", "mailer", "geo", "sortstring", "class1", "tz",
								"agent", "prodid", "uid", "version", "dirPrefId", "cardurl", "rev", "etag", "others", "vcard",
								"photoURI", "logoURI", "soundURI" ];
			for (var i = 0; i < fieldArray.length; i++) {
				if (document.getElementById(fieldArray[i] + 'TextBox')) {
					document.getElementById(fieldArray[i] + 'TextBox').value = "";
				}
			}
			var fieldArray = [ "note" ];
			for (var i = 0; i < fieldArray.length; i++) {
				if (document.getElementById(fieldArray[i] + 'modernTextBox')) {
					document.getElementById(fieldArray[i] + 'modernTextBox').value = "";
				}
				if (document.getElementById(fieldArray[i] + 'classicalTextBox')) {
					document.getElementById(fieldArray[i] + 'classicalTextBox').value = "";
				}
			}

			cardbookElementTools.deleteTableRows('orgTable');
			cardbookElementTools.deleteRows('categoriesmodernRow');
			
			// need to remove the Custom from Pers
			// for the Org, everything is cleared out
			let table = document.getElementById('personalTable');
			for (let i = table.rows.length -1; i >= 0; i--) {
				let row = table.rows[i];
				if (row.id.startsWith('customField')) {
					table.removeChild(row);
				}
			}

			wdw_imageEdition.clearImageCard();
			cardbookElementTools.deleteRows('addedCardsGroupbox');
			cardbookElementTools.deleteRows('emailpropertyGroupbox');
			cardbookElementTools.deleteRows("keyReadWriteGroupbox");
			cardbookElementTools.deleteRows('keyReadOnlyGroupbox');
		},

		constructCustom: function (aReadOnly, aType, aOtherValue) {
			let othersTemp = JSON.parse(JSON.stringify(aOtherValue));
			let result = [];
			result = cardbookRepository.customFields[aType];
			for (let i = 0; i < result.length; i++) {
				let myCode = result[i][0];
				let myLabel = result[i][1];
				let myField = 'customField' + i + aType;
				let myValue = '';
				let j;
				for (j = 0; j < othersTemp.length; j++) {
					let delim = othersTemp[j].indexOf(":", 0);
					let header = othersTemp[j].substr(0, delim);
					let value = othersTemp[j].substr(delim+1, othersTemp[j].length);
					let headerTmp = header.split(";");
					if (myCode == headerTmp[0]) {
						myValue = value;
						break;
					}
				}
				let dummy = othersTemp.splice(j,1);
				j--;
				let table = document.getElementById(aType + 'Table');
				if (aReadOnly) {
					if (myValue != "") {
						currentRow = cardbookElementTools.addHTMLTR(table, myField + 'Row');
						let labelData = cardbookElementTools.addHTMLTD(currentRow, myField + 'Label' + '.1');
						cardbookElementTools.addLabel(labelData, myField + 'Label', myLabel, myField + 'TextBox', {class: 'header'});
						let textboxData = cardbookElementTools.addHTMLTD(currentRow, myField + 'TextBox' + '.2');
						let myTextbox = cardbookElementTools.addLabel(textboxData, myField + 'TextBox', myValue, null, {"data-field-name": myCode, "data-field-label": myLabel});
						myTextbox.addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
					}
				} else {
					currentRow = cardbookElementTools.addHTMLTR(table, myField + 'Row');
					let labelData = cardbookElementTools.addHTMLTD(currentRow, myField + 'Label' + '.1');
					cardbookElementTools.addLabel(labelData, myField + 'Label', myLabel, myField + 'TextBox', {class: 'header'});
					let textboxData = cardbookElementTools.addHTMLTD(currentRow, myField + 'TextBox' + '.2');
					let textbox = cardbookElementTools.addHTMLINPUT(textboxData, myField + 'TextBox', myValue, {"data-field-name": myCode});
					textbox.addEventListener("input", wdw_cardEdition.onInputField, false);
					cardbookElementTools.addProcessButton(textboxData, myCode + 'ProcessButton');
				}
			}
			return othersTemp;
		},

		constructOrg: function (aReadOnly, aOrgValue, aTitleValue, aRoleValue) {
			let aOrigBox = document.getElementById('orgTable');
			let orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
			let currentRow;
			if (orgStructure != "") {
				let myOrgStructure = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
				let myOrgValue = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(aOrgValue).split(";"));
				for (let i = 0; i < myOrgStructure.length; i++) {
					let myValue = "";
					if (myOrgValue[i]) {
						myValue = myOrgValue[i];
					}
					if (aReadOnly) {
						if (myValue != "") {
							currentRow = cardbookElementTools.addHTMLTR(aOrigBox, 'orgRow_' + i);
							let labelData = cardbookElementTools.addHTMLTD(currentRow, 'orgTextBox_' + i + '.1');
							cardbookElementTools.addLabel(labelData, 'orgLabel_' + i, myOrgStructure[i], 'orgTextBox_' + i, {class: 'header'});
							let textboxData = cardbookElementTools.addHTMLTD(currentRow, 'orgTextBox_' + i + '.2');
							let myTextbox = cardbookElementTools.addLabel(textboxData, 'orgTextBox_' + i, myValue, null, {"data-field-name": 'org_' + myOrgStructure[i], "data-field-label": myOrgStructure[i], allValue: myOrgValue.join("::")});
							myTextbox.addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
						}
					} else {
						currentRow = cardbookElementTools.addHTMLTR(aOrigBox, 'orgRow_' + i);
						let labelData = cardbookElementTools.addHTMLTD(currentRow, 'orgTextBox_' + i + '.1');
						cardbookElementTools.addLabel(labelData, 'orgLabel_' + i, myOrgStructure[i], 'orgTextBox_' + i, {class: 'header'});
						let textboxData = cardbookElementTools.addHTMLTD(currentRow, 'orgTextBox_' + i + '.2');
						let myTextBox = cardbookElementTools.addHTMLINPUT(textboxData, 'orgTextBox_' + i, myValue, {"data-field-name": 'org_' + myOrgStructure[i], type: 'autocomplete', autocompletesearch: 'form-history', autocompletesearchparam: 'orgTextBox_' + i, class:'padded'});
						myTextBox.addEventListener("input", wdw_cardEdition.onInputField, false);
						cardbookElementTools.addProcessButton(textboxData, 'org_' + myOrgStructure[i] + 'ProcessButton');
					}
				}
			} else {
				let myOrgValue = cardbookRepository.cardbookUtils.unescapeString(cardbookRepository.cardbookUtils.escapeString(aOrgValue));
				if (aReadOnly) {
					if (myOrgValue != "") {
						currentRow = cardbookElementTools.addHTMLTR(aOrigBox, 'orgRow_0');
						let myLabel = cardbookRepository.extension.localeData.localizeMessage("orgLabel");
						let labelData = cardbookElementTools.addHTMLTD(currentRow, 'orgTextBox_0' + '.1');
						cardbookElementTools.addLabel(labelData, 'orgLabel', myLabel, 'orgTextBox_0', {class: 'header'});
						let textboxData = cardbookElementTools.addHTMLTD(currentRow, 'orgTextBox_0' + '.2');
						let myTextbox = cardbookElementTools.addLabel(textboxData, 'orgTextBox_0', myOrgValue, null, {"data-field-name": 'org', "data-field-label": myLabel});
						myTextbox.addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
					}
				} else {
					currentRow = cardbookElementTools.addHTMLTR(aOrigBox, 'orgRow_0');
					let labelData = cardbookElementTools.addHTMLTD(currentRow, 'orgLabel' + '.1');
					cardbookElementTools.addLabel(labelData, 'orgLabel', cardbookRepository.extension.localeData.localizeMessage("orgLabel"), 'orgTextBox_0', {class: 'header'});
					let textboxData = cardbookElementTools.addHTMLTD(currentRow, 'orgTextBox_0' + '.2');
					let myTextBox = cardbookElementTools.addHTMLINPUT(textboxData, 'orgTextBox_0', myOrgValue, {'data-field-name': 'org', type: 'autocomplete', autocompletesearch: 'form-history', autocompletesearchparam: 'orgTextBox_0', class:'padded'});
					myTextBox.addEventListener("input", wdw_cardEdition.onInputField, false);
					cardbookElementTools.addProcessButton(textboxData, 'orgProcessButton');
				}
			}
			if (aReadOnly) {
				if (aTitleValue != "") {
					currentRow = cardbookElementTools.addHTMLTR(aOrigBox, 'titleRow');
					let myLabel = cardbookRepository.extension.localeData.localizeMessage("titleLabel");
					let labelData = cardbookElementTools.addHTMLTD(currentRow, 'titleLabel' + '.1');
					cardbookElementTools.addLabel(labelData, 'titleLabel', myLabel, 'titleLabel', {class: 'header'});
					let textboxData = cardbookElementTools.addHTMLTD(currentRow, 'titleTextBox' + '.2');
					let myTextbox = cardbookElementTools.addLabel(textboxData, 'titleTextBox', aTitleValue, null, {"data-field-name": 'title', "data-field-label": myLabel});
					myTextbox.addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
				}
				if (aRoleValue != "") {
					currentRow = cardbookElementTools.addHTMLTR(aOrigBox, 'roleRow');
					let myLabel = cardbookRepository.extension.localeData.localizeMessage("roleLabel");
					let labelData = cardbookElementTools.addHTMLTD(currentRow, 'roleLabel' + '.1');
					cardbookElementTools.addLabel(labelData, 'roleLabel', myLabel, 'roleLabel', {class: 'header'});
					let textboxData = cardbookElementTools.addHTMLTD(currentRow, 'roleTextBox' + '.2');
					let myTextbox = cardbookElementTools.addLabel(textboxData, 'roleTextBox', aRoleValue, null, {"data-field-name": 'role', "data-field-label": myLabel});
					myTextbox.addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
				}
			} else {
				currentRow = cardbookElementTools.addHTMLTR(aOrigBox, 'titleRow');
				let titleLabelData = cardbookElementTools.addHTMLTD(currentRow, 'titleLabel' + '.1');
				cardbookElementTools.addLabel(titleLabelData, 'titleLabel', cardbookRepository.extension.localeData.localizeMessage("titleLabel"), 'titleTextBox', {class: 'header'});
				let titleTextboxData = cardbookElementTools.addHTMLTD(currentRow, 'titleTextBox' + '.2');
				let titleTextBox = cardbookElementTools.addHTMLINPUT(titleTextboxData, 'titleTextBox', aTitleValue, {"data-field-name": 'title', type: 'autocomplete', autocompletesearch: 'form-history', autocompletesearchparam: 'titleTextBox', class:'padded'});
				titleTextBox.addEventListener("input", wdw_cardEdition.onInputField, false);
				cardbookElementTools.addProcessButton(titleTextboxData, 'titleProcessButton');
				titleTextBox.addEventListener("input", wdw_cardEdition.setDisplayName, false);
				currentRow = cardbookElementTools.addHTMLTR(aOrigBox, 'roleRow');
				let roleLabelData = cardbookElementTools.addHTMLTD(currentRow, 'roleLabel' + '.1');
				cardbookElementTools.addLabel(roleLabelData, 'roleLabel', cardbookRepository.extension.localeData.localizeMessage("roleLabel"), 'roleTextBox', {class: 'header'});
				let roleTextboxData = cardbookElementTools.addHTMLTD(currentRow, 'roleTextBox' + '.2');
				let roleTextBox = cardbookElementTools.addHTMLINPUT(roleTextboxData, 'roleTextBox', aRoleValue, {"data-field-name": 'role', type: 'autocomplete', autocompletesearch: 'form-history', autocompletesearchparam: 'titleTextBox', class:'padded'});
				roleTextBox.addEventListener("input", wdw_cardEdition.onInputField, false);
				cardbookElementTools.addProcessButton(roleTextboxData, 'roleProcessButton');
			}
		},

		getPrefForLine: function (aType, aIndex) {
			let result = [];
			let myPrefButton = document.getElementById(aType + '_' + aIndex + '_PrefImage');
			if (document.getElementById('versionTextBox').value === "4.0") {
				if (myPrefButton.getAttribute('haspref')) {
					if (document.getElementById(aType + '_' + aIndex + '_prefWeightBox').value) {
						result.push("PREF=" + document.getElementById(aType + '_' + aIndex + '_prefWeightBox').value);
					} else {
						result.push("PREF=1");
					}
				}
			} else {
				if (myPrefButton.getAttribute('haspref')) {
					result.push("TYPE=PREF");
				}
			}
			return result;
		},

		getTypeForLine: function (aType, aIndex) {
			var myLineTypeResult = cardbookWindowUtils.getPrefForLine(aType, aIndex);

			if (document.getElementById(aType + '_' + aIndex + '_othersTypesBox')) {
				let value = document.getElementById(aType + '_' + aIndex + '_othersTypesBox').value;
				myLineTypeResult = myLineTypeResult.concat(value.split(','));
			}
			
			var myLineTypeType = [];

			var myTypes = [];
			if (document.getElementById(aType + '_' + aIndex + '_MenulistType')) {
				var itemsListbox = document.getElementById(aType + '_' + aIndex + '_MenulistType');
				var item = itemsListbox.querySelectorAll("menuitem.cardbook-item[checked]");
				if (item[0]) {
					var myValue = item[0].getAttribute('value').trim();
					myTypes = [myValue, "PG"];
					var ABType = cardbookRepository.cardbookPreferences.getType(wdw_cardEdition.workingCard.dirPrefId);
					var ABTypeFormat = cardbookRepository.getABTypeFormat(ABType);
					for (var i = 0; i < cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType].length; i++) {
						if (myValue.toUpperCase() == cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][0].toUpperCase()) {
							var prefPossibility = cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][1].split(";")[0];
							if (cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][2] && cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][2] == "PG") {
								myTypes = [prefPossibility, "PG"];
							} else {
								myTypes = [prefPossibility, "NOPG"];
							}
						}
					}
				} else {
					myTypes = [];
				}
			}
			var myOutputPg = [];
			var myPgName = "";
			if (myTypes.length != 0) {
				if (myTypes[1] == "PG") {
					myOutputPg = [ "X-ABLABEL:" + myTypes[0] ];
					myPgName = "ITEM1";
				} else {
					myLineTypeType.push("TYPE=" + myTypes[0]);
				}
			}

			if (myLineTypeType.length > 0) {
				myLineTypeResult = myLineTypeResult.concat(myLineTypeType);
				myLineTypeResult = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.formatTypes(cardbookRepository.cardbookUtils.escapeArray(myLineTypeResult)));
			}
			
			if (aType == "adr") {
				var j = 0;
				var myLineTypeValue = [];
				while (true) {
					if (document.getElementById(aType + '_' + aIndex + '_valueBox_' + j)) {
						var myTypeValue = document.getElementById(aType + '_' + aIndex + '_valueBox_' + j).value.replace(/\\n/g, "\n").trim();
						myLineTypeValue.push(myTypeValue);
						j++;
					} else {
						break;
					}
				}
			} else if (aType == "impp") {
				var myLineTypeValue = [];
				myLineTypeValue.push(document.getElementById(aType + '_' + aIndex + '_valueBox').value);
				if (myLineTypeValue.join("") != "") {
					function removeServiceType(element) {
						return (element == element.replace(/^X-SERVICE-TYPE=/i, ""));
					}
					myLineTypeResult = myLineTypeResult.filter(removeServiceType);
					var code = "";
					if (document.getElementById(aType + '_' + aIndex + '_menulistIMPP').value) {
						code = document.getElementById(aType + '_' + aIndex + '_menulistIMPP').value
					}
					var serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForCode(code);

					if (serviceLine[0]) {
						var myRegexp = new RegExp("^" + serviceLine[2] + ":");
						myLineTypeValue[0] = myLineTypeValue[0].replace(myRegexp, "");
						myLineTypeValue[0] = serviceLine[2] + ":" + myLineTypeValue[0];
					}
				}
			} else {
				var myLineTypeValue = [ "" ];
				if (document.getElementById(aType + '_' + aIndex + '_valueBox').value) {
					myLineTypeValue = [document.getElementById(aType + '_' + aIndex + '_valueBox').value.trim()];
				}
			}
			
			return [myLineTypeValue, myLineTypeResult, myPgName, myOutputPg];
		},

		getAllTypes: function (aType, aRemoveNull) {
			var i = 0;
			var myResult = [];
			while (true) {
				if (document.getElementById(aType + '_' + i + '_hbox')) {
					var lineResult = cardbookWindowUtils.getTypeForLine(aType, i);
					if (lineResult[0].join("") != "" || !aRemoveNull) {
						myResult.push([lineResult[0], lineResult[1], lineResult[2], lineResult[3]]);
					}
					i++;
				} else {
					break;
				}
			}
			return myResult;
		},

		getAllEvents: function (aRemoveNull) {
			var myType = "event";
			var i = 0;
			var myResult = [];
			while (true) {
				if (document.getElementById(myType + '_' + i + '_hbox')) {
					var myPrefButton = document.getElementById(myType + '_' + i + '_PrefImage');
					var dateResult = document.getElementById(myType + '_' + i + '_valueDateBox').value;
					var nameResult = document.getElementById(myType + '_' + i + '_valueBox').value;
					if ((nameResult != "" && dateResult != "") || !aRemoveNull) {
						myResult.push([dateResult, nameResult, myPrefButton.getAttribute('haspref')]);
					}
					i++;
				} else {
					break;
				}
			}
			return myResult;
		},

		getAllTz: function (aRemoveNull) {
			var myType = "tz";
			var i = 0;
			var myResult = [];
			while (true) {
				if (document.getElementById(myType + '_' + i + '_hbox')) {
					var nameResult = document.getElementById(myType + '_' + i + '_menulistTz').value;
					if ((nameResult != "") || !aRemoveNull) {
						myResult.push([[nameResult], []]);
					}
					i++;
				} else {
					break;
				}
			}
			return myResult;
		},

		getAllKeys: function (aRemoveNull) {
			var type = "key";
			var i = 0;
			var result = [];
			while (true) {
				if (document.getElementById(type + '_' + i + '_hbox')) {
					var keyTypes = cardbookWindowUtils.getPrefForLine(type, i);
					var keyResult = document.getElementById(type + '_' + i + '_valueBox').value;
					if (keyResult != "" || !aRemoveNull) {
						if ((keyResult.search(/^http/i) >= 0) || (keyResult.search(/^file/i) >= 0)) {
							result.push({types: keyTypes, value: "", URI: keyResult, extension: ""});
						} else {
							result.push({types: keyTypes, value: keyResult, URI: "", extension: ""});
						}
					}
					i++;
				} else {
					break;
				}
			}
			return result;
		},

		openAdrPanel: function (aAdrLine, aIdArray) {
			wdw_cardEdition.loadCountries();
			wdw_cardEdition.currentAdrId = JSON.parse(JSON.stringify(aIdArray));
			document.getElementById('postOfficeTextBox').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][0]);
			document.getElementById('extendedAddrTextBox').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][1]);
			document.getElementById('streetTextBox').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][2]);
			document.getElementById('localityTextBox').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][3]);
			document.getElementById('regionTextBox').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][4]);
			document.getElementById('postalCodeTextBox').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][5]);
			let country = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][6]);
			if (cardbookRepository.countriesList.includes(country.toLowerCase())) {
				document.getElementById('countryMenulist').value = cardbookRepository.extension.localeData.localizeMessage("region-name-" + country.toLowerCase());
			} else if (country == "") {
				let cardRegion = cardbookRepository.cardbookUtils.getCardRegion(wdw_cardEdition.workingCard);
				document.getElementById('countryMenulist').value = "";
				if (cardRegion != "") {
					document.getElementById('countryMenulist').value = cardbookRepository.extension.localeData.localizeMessage("region-name-" + cardRegion.toLowerCase());
				}
			} else {
				document.getElementById('countryMenulist').value = country;
			}
			document.getElementById('adrPanel').openPopup(document.getElementById(wdw_cardEdition.currentAdrId.join("_")), 'after_start', 0, 0, true);
		},

		closeAdrPanel: function () {
			document.getElementById('adrPanel').hidePopup();
			wdw_cardEdition.cardRegion = cardbookRepository.cardbookUtils.getCardRegion(wdw_cardEdition.workingCard);
		},

		validateAdrPanel: function () {
			var myId = wdw_cardEdition.currentAdrId.join("_");
			document.getElementById(myId + '_' + '0').value = document.getElementById('postOfficeTextBox').value.trim();
			document.getElementById(myId + '_' + '1').value = document.getElementById('extendedAddrTextBox').value.trim();
			document.getElementById(myId + '_' + '2').value = document.getElementById('streetTextBox').value.replace(/\n/g, "\\n").trim();
			document.getElementById(myId + '_' + '3').value = document.getElementById('localityTextBox').value.trim();
			document.getElementById(myId + '_' + '4').value = document.getElementById('regionTextBox').value.trim();
			document.getElementById(myId + '_' + '5').value = document.getElementById('postalCodeTextBox').value.trim();
			document.getElementById(myId + '_' + '6').value = document.getElementById('countryMenulist').value.trim();

			var myTmpArray = [];
			for (var i = 0; i < 7; i++) {
				if (document.getElementById(myId + '_' + i).value != "") {
					myTmpArray.push(document.getElementById(myId + '_' + i).value.replace(/\\n/g, " ").trim());
				}
			}
			document.getElementById(myId).value = myTmpArray.join(" ").trim();
		},

		cancelAdrPanel: function () {
			let adrTextBox = document.getElementById(wdw_cardEdition.currentAdrId[0] + '_' + wdw_cardEdition.currentAdrId[1] + '_valueBox');
			adrTextBox.dispatchEvent(new Event('input'));
		},

		findNextLine: function (aType) {
			var i = 0;
			while (true) {
				if (document.getElementById(aType + '_' + i + '_hbox') || document.getElementById(aType + '_' + i + '_row')) {
					i++;
				} else {
					return i;
				}
			}
		},

		constructDynamicRows: function (aType, aArray, aVersion) {
			var start = cardbookWindowUtils.findNextLine(aType);
			for (var i = 0; i < aArray.length; i++) {
				cardbookWindowUtils.loadDynamicTypes(aType, i+start, aArray[i][1], aArray[i][2], aArray[i][3], aArray[i][0], aVersion);
			}
			if (aArray.length == 0) {
				cardbookWindowUtils.loadDynamicTypes(aType, start, [], "", [], [""], aVersion);
			}
		},

		constructDynamicEventsRows: function (aDirPrefId, aType, aEventType, aVersion) {
			var start = cardbookWindowUtils.findNextLine(aType);
			for (var i = 0; i < aEventType.length; i++) {
				cardbookWindowUtils.loadDynamicEventsTypes(aDirPrefId, aType, i+start, aEventType[i], aVersion);
			}
			if (aEventType.length == 0) {
				cardbookWindowUtils.loadDynamicEventsTypes(aDirPrefId, aType, start, ["", "", ""], aVersion);
			}
		},

		constructDynamicTzRows: function (aType, aTzType) {
			var start = cardbookWindowUtils.findNextLine(aType);
			for (var i = 0; i < aTzType.length; i++) {
				cardbookWindowUtils.loadDynamicTzTypes(aType, i+start, aTzType[i],);
			}
			if (aTzType.length == 0) {
				cardbookWindowUtils.loadDynamicTzTypes(aType, start, [[], []]);
			}
		},

		constructDynamicKeysRows: function (aDirPrefId, aType, aKeyType, aVersion) {
			var start = cardbookWindowUtils.findNextLine(aType);
			for (var i = 0; i < aKeyType.length; i++) {
				cardbookWindowUtils.loadDynamicKeysTypes(aDirPrefId, aType, i+start, aKeyType[i], aVersion);
			}
			if (aKeyType.length == 0) {
				cardbookWindowUtils.loadDynamicKeysTypes(aDirPrefId, aType, start, {types: [], value: "", URI: "", extension: ""}, aVersion);
			}
		},

		constructStaticRows: function (aDirPrefId, aType, aArray, aVersion) {
			for (let i = 0; i < aArray.length; i++) {
				cardbookWindowUtils.loadStaticTypes(aDirPrefId, aType, i, aArray[i][1], aArray[i][2], aArray[i][3], aArray[i][0], aVersion);
			}
		},

		constructStaticEventsRows: function (aDirPrefId, aEventType, aVersion) {
			for (var i = 0; i < aEventType.length; i++) {
				cardbookWindowUtils.loadStaticEventsTypes(aDirPrefId, "event", i, aEventType[i], aVersion);
			}
		},

		constructStaticTzRows: function (aTzType) {
			for (var i = 0; i < aTzType.length; i++) {
				cardbookWindowUtils.loadStaticTzTypes("tz", i, aTzType[i]);
			}
		},
		
		constructStaticKeysRows: function (aDirPrefId, aKey, aVersion, aCardFn, aCardDirPrefId) {
			for (var i = 0; i < aKey.length; i++) {
				cardbookWindowUtils.loadStaticKeysTypes(aDirPrefId, "key", i, aKey[i], aVersion, aCardFn, aCardDirPrefId);
			}
		},

		display40: function (aCardVersion, aReadOnly) {
			if (aCardVersion == "4.0") {
				if (aReadOnly) {
					document.getElementById('birthplaceRow').removeAttribute('hidden');
					document.getElementById('deathplaceRow').removeAttribute('hidden');
					if (document.getElementById('genderRow1')) {
						document.getElementById('genderRow1').setAttribute('hidden', 'true');
						if (document.getElementById('genderTextBox').value) {
							document.getElementById('genderRow2').removeAttribute('hidden');
							document.getElementById('genderTextBox').setAttribute('readonly', 'true');
						} else {
							document.getElementById('genderRow2').setAttribute('hidden', 'true');
						}
					} else if (document.getElementById('genderRow')) {
						document.getElementById('genderTextBox').setAttribute('readonly', 'true');
					}
					document.getElementById('birthplaceTextBox').setAttribute('readonly', 'true');
					document.getElementById('deathplaceTextBox').setAttribute('readonly', 'true');
				} else {
					// edition
					if (document.getElementById('genderRow1')) {
						if (wdw_cardEdition.checkEditionFields('gender') || wdw_cardEdition.workingCard.gender) {
							document.getElementById('genderRow1').removeAttribute('hidden');
						} else {
							document.getElementById('genderRow1').setAttribute('hidden', 'true');
						}
						document.getElementById('genderRow2').setAttribute('hidden', 'true');
					} else if (document.getElementById('genderRow')) {
						document.getElementById('genderTextBox').setAttribute('readonly', 'true');
					}
					if (wdw_cardEdition.checkEditionFields('birthplace') || wdw_cardEdition.workingCard.birthplace) {
						document.getElementById('birthplaceRow').removeAttribute('hidden');
						document.getElementById('birthplaceTextBox').removeAttribute('readonly');
					} else {
						document.getElementById('birthplaceRow').setAttribute('hidden', 'true');
					}
					if (wdw_cardEdition.checkEditionFields('deathplace') || wdw_cardEdition.workingCard.deathplace) {
						document.getElementById('deathplaceRow').removeAttribute('hidden');
						document.getElementById('deathplaceTextBox').removeAttribute('readonly');
					} else {
						document.getElementById('deathplaceRow').setAttribute('hidden', 'true');
					}
				}
			} else {
				if (document.getElementById('genderRow1')) {
					document.getElementById('genderRow1').setAttribute('hidden', 'true');
					document.getElementById('genderRow2').setAttribute('hidden', 'true');
				} else if (document.getElementById('genderRow')) {
					document.getElementById('genderRow').setAttribute('hidden', 'true');
				}
				if (document.getElementById('birthplaceRow')) {
					document.getElementById('birthplaceRow').setAttribute('hidden', 'true');
				}
				if (document.getElementById('deathplaceRow')) {
					document.getElementById('deathplaceRow').setAttribute('hidden', 'true');
				}
			}
		},

		displayDates: function (aCardVersion, aReadOnly) {
			if (aCardVersion == "4.0") {
				if (aReadOnly) {
					if (document.getElementById('bdayRow1')) {
						document.getElementById('bdayRow1').setAttribute('hidden', 'true');
						document.getElementById('anniversaryRow1').setAttribute('hidden', 'true');
						document.getElementById('deathdateRow1').setAttribute('hidden', 'true');
						if (document.getElementById('bdayTextBox').value) {
							document.getElementById('bdayRow2').removeAttribute('hidden');
							document.getElementById('bdayTextBox').setAttribute('readonly', 'true');
						} else {
							document.getElementById('bdayRow2').setAttribute('hidden', 'true');
						}
						if (document.getElementById('anniversaryTextBox').value) {
							document.getElementById('anniversaryRow2').removeAttribute('hidden');
							document.getElementById('anniversaryTextBox').setAttribute('readonly', 'true');
						} else {
							document.getElementById('anniversaryRow2').setAttribute('hidden', 'true');
						}
						if (document.getElementById('deathdateTextBox').value) {
							document.getElementById('deathdateRow2').removeAttribute('hidden');
							document.getElementById('deathdateTextBox').setAttribute('readonly', 'true');
						} else {
							document.getElementById('deathdateRow2').setAttribute('hidden', 'true');
						}
					} else if (document.getElementById('bdayRow')) {
						document.getElementById('bdayTextBox').setAttribute('readonly', 'true');
						document.getElementById('anniversaryTextBox').setAttribute('readonly', 'true');
						document.getElementById('deathdateTextBox').setAttribute('readonly', 'true');
					}
				} else {
					// edition
					if (document.getElementById('bdayRow1')) {
						for (var field of cardbookRepository.dateFields) {
							if (wdw_cardEdition.checkEditionFields(field) || wdw_cardEdition.workingCard[field]) {
								document.getElementById(field + 'Row1').removeAttribute('hidden');
							} else {
								document.getElementById(field + 'Row1').setAttribute('hidden', 'true');
							}
							document.getElementById(field + 'Row2').setAttribute('hidden', 'true');
						}
					} else if (document.getElementById('bdayRow')) {
						for (var field of cardbookRepository.dateFields) {
							document.getElementById(field + 'TextBox').setAttribute('readonly', 'true');
						}
					}
				}
			} else {
				if (document.getElementById('bdayRow1')) {
					if (!aReadOnly) {
						if (wdw_cardEdition.checkEditionFields('bday') || wdw_cardEdition.workingCard.bday) {
							document.getElementById('bdayRow1').removeAttribute('hidden');
						} else {
							document.getElementById('bdayRow1').setAttribute('hidden', 'true');
						}
						document.getElementById('bdayRow2').setAttribute('hidden', 'true');
					} else {
						document.getElementById('bdayRow1').setAttribute('hidden', 'true');
						document.getElementById('bdayRow2').removeAttribute('hidden');
					}
				} else if (document.getElementById('bdayRow')) {
					document.getElementById('bdayRow').removeAttribute('hidden');
				}
				if (document.getElementById('anniversaryRow1')) {
					document.getElementById('anniversaryRow1').setAttribute('hidden', 'true');
					document.getElementById('anniversaryRow2').setAttribute('hidden', 'true');
				} else if (document.getElementById('anniversaryRow')) {
					document.getElementById('anniversaryRow').setAttribute('hidden', 'true');
				}
				if (document.getElementById('deathdateRow1')) {
					document.getElementById('deathdateRow1').setAttribute('hidden', 'true');
					document.getElementById('deathdateRow2').setAttribute('hidden', 'true');
				} else if (document.getElementById('deathdateRow')) {
					document.getElementById('deathdateRow').setAttribute('hidden', 'true');
				}
			}
		},

		displayPref: function (aVersion) {
			var usePreferenceValue = cardbookRepository.cardbookPrefs["usePreferenceValue"];
			for (let field of cardbookRepository.multilineFields) {
				if (document.getElementById(field + 'Groupbox')) {
					var j = 0;
					while (true) {
						if (document.getElementById(field + '_' + j + '_prefWeightBox')) {
							var myPrefWeightBoxLabel = document.getElementById(field + '_' + j + '_prefWeightBoxLabel');
							var myPrefWeightBox = document.getElementById(field + '_' + j + '_prefWeightBox');
							if (aVersion === "4.0" && usePreferenceValue) {
								myPrefWeightBoxLabel.removeAttribute('hidden');
								myPrefWeightBox.removeAttribute('hidden');
							} else {
								myPrefWeightBoxLabel.setAttribute('hidden', 'true');
								myPrefWeightBox.setAttribute('hidden', 'true');
							}
							if (document.getElementById(field + '_' + j + '_PrefImage').getAttribute('haspref')) {
								myPrefWeightBoxLabel.removeAttribute('readonly');
							} else {
								myPrefWeightBoxLabel.setAttribute('readonly', 'true');
							}
							j++;
						} else {
							break;
						}
					}
				}
			}
		},

		loadDynamicTypes: function (aType, aIndex, aInputTypes, aPgName, aPgType, aCardValue, aVersion) {
			var aOrigBox = document.getElementById(aType + 'Groupbox');
			
			if (aIndex == 0) {
				cardbookElementTools.addCaption(aType, aOrigBox);
			}
			
			var aHBox = cardbookElementTools.addHBox(aType, aIndex, aOrigBox, {class: "input-container"});

			var myInputTypes = [];
			myInputTypes = cardbookRepository.cardbookUtils.getOnlyTypesFromTypes(aInputTypes);
			var myOthersTypes = cardbookRepository.cardbookUtils.getNotTypesFromTypes(aInputTypes);
			
			var aPrefButton = cardbookElementTools.addPrefStar(aHBox, aType, aIndex, cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(aInputTypes))
			
			cardbookElementTools.addLabel(aHBox, aType + '_' + aIndex + '_prefWeightBoxLabel', cardbookRepository.cardbookPreferences.getPrefValueLabel(), aType + '_' + aIndex + '_prefWeightBox', {tooltip: cardbookRepository.extension.localeData.localizeMessage("prefWeightTooltip")});
			cardbookElementTools.addHTMLINPUT(aHBox, aType + '_' + aIndex + '_prefWeightBox', cardbookRepository.cardbookUtils.getPrefValueFromTypes(aInputTypes, document.getElementById('versionTextBox').value), {size: "5"});
			if (aPrefButton.getAttribute('haspref')) {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBoxLabel').disabled = false;
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').disabled = false;
			} else {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBoxLabel').disabled = true;
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').disabled = true;
			}

			var usePreferenceValue = cardbookRepository.cardbookPrefs["usePreferenceValue"];
			if (document.getElementById('versionTextBox').value === "4.0" && usePreferenceValue) {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBoxLabel').removeAttribute('hidden');
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').removeAttribute('hidden');
			} else {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBoxLabel').setAttribute('hidden', 'true');
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('hidden', 'true');
			}

			cardbookElementTools.addHTMLINPUT(aHBox, aType + '_' + aIndex + '_othersTypesBox', myOthersTypes, {hidden: "true"});

			if (aType != "impp") {
				var myCheckedArrayTypes = [];
				if (aPgType.length != 0 && aPgName != "") {
					let found = false;
					for (var j = 0; j < aPgType.length; j++) {
						let tmpArray = aPgType[j].split(":");
						if (tmpArray[0] == "X-ABLABEL") {
							cardbookElementTools.addMenuTypelist(aHBox, aType, aIndex, [tmpArray[1]]);
							myCheckedArrayTypes.push(tmpArray[1]);
							found = true;
							break;
						}
					}
					if (!found) {
						for (var j = 0; j < myInputTypes.length; j++) {
							myCheckedArrayTypes.push(myInputTypes[j]);
						}
						cardbookElementTools.addMenuTypelist(aHBox, aType, aIndex, myCheckedArrayTypes);
					}
				} else {
					for (var j = 0; j < myInputTypes.length; j++) {
						myCheckedArrayTypes.push(myInputTypes[j]);
					}
					cardbookElementTools.addMenuTypelist(aHBox, aType, aIndex, myCheckedArrayTypes);
				}
			}

			let keyTextbox;
			if (aType == "impp") {
				var serviceCode = cardbookRepository.cardbookTypes.getIMPPCode(aInputTypes);
				var serviceProtocol = cardbookRepository.cardbookTypes.getIMPPProtocol(aCardValue);
				cardbookElementTools.addMenuIMPPlist(aHBox, aType, aIndex, cardbookRepository.cardbookTypes.allIMPPs, serviceCode, serviceProtocol);
				var myValue = aCardValue.join(" ");
				if (serviceCode != "") {
					var serviceLine = [];
					serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForCode(serviceCode)
					if (serviceLine[0]) {
						var myRegexp = new RegExp("^" + serviceLine[2] + ":");
						myValue = myValue.replace(myRegexp, "");
					}
				} else if (serviceProtocol != "") {
					var serviceLine = [];
					serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForProtocol(serviceProtocol)
					if (serviceLine[0]) {
						var myRegexp = new RegExp("^" + serviceLine[2] + ":");
						myValue = myValue.replace(myRegexp, "");
					}
				}
				keyTextbox = cardbookElementTools.addKeyTextbox(aHBox, aType + '_' + aIndex + '_valueBox', myValue, {}, aIndex);
			} else if (aType == "adr") {
				var myTmpArray = [];
				for (var i = 0; i < aCardValue.length; i++) {
					if (aCardValue[i] != "") {
						myTmpArray.push(aCardValue[i].replace(/\n/g, " "));
					}
				}
				keyTextbox = cardbookElementTools.addKeyTextbox(aHBox, aType + '_' + aIndex + '_valueBox', myTmpArray.join(" "), {}, aIndex);
			} else {
				keyTextbox = cardbookElementTools.addKeyTextbox(aHBox, aType + '_' + aIndex + '_valueBox', cardbookRepository.cardbookUtils.cleanArray(aCardValue).join(" "), {}, aIndex);
			}

			if (aType == "adr") {
				function fireEditAdrOnClick(aEvent) {
					if (aEvent.button == 0) {
						var myIdArray = this.id.split('_');
						var myTempResult = cardbookWindowUtils.getTypeForLine(aType, aIndex);
						if (myTempResult.length == 0) {
							var adrLine = [ ["", "", "", "", "", "", ""], [""], "", [""] ];
						} else {
							var adrLine = myTempResult;
						}
						cardbookWindowUtils.openAdrPanel(adrLine, myIdArray);
					}
				};
				document.getElementById(aType + '_' + aIndex + '_valueBox').addEventListener("click", fireEditAdrOnClick, false);
				function fireEditAdrOnInput() {
					var myIdArray = this.id.split('_');
					var myTempResult = cardbookWindowUtils.getTypeForLine(aType, aIndex);
					if (myTempResult.length == 0) {
						var adrLine = [ ["", "", "", "", "", "", ""], [""], "", [""] ];
					} else {
						var adrLine = myTempResult;
					}
					cardbookWindowUtils.openAdrPanel(adrLine, myIdArray);
				};
				document.getElementById(aType + '_' + aIndex + '_valueBox').addEventListener("keydown", fireEditAdrOnInput, false);

				let i = 0;
				while ( i < 7 ) {
					if (aCardValue[i]) {
						cardbookElementTools.addHTMLINPUT(aHBox, aType + '_' + aIndex + '_valueBox_' + i, aCardValue[i].replace(/\n/g, "\\n"), {hidden: "true"});
					} else {
						cardbookElementTools.addHTMLINPUT(aHBox, aType + '_' + aIndex + '_valueBox_' + i, "", {hidden: "true"});
					}
					i++;
				}
			} else if (aType == "tel") {
				function fireInputTel(event) {
					var myValidationButton = document.getElementById(aType + '_' + aIndex + '_validateButton');
					var tel = PhoneNumber.Parse(this.value, wdw_cardEdition.cardRegion);
					if (tel && tel.internationalFormat && this.value == tel.internationalFormat) {
						myValidationButton.setAttribute('class', 'small-button cardbookValidated');
						myValidationButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("validatedEntryTooltip"));
					} else {
						myValidationButton.setAttribute('class', 'small-button cardbookNotValidated');
						myValidationButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("notValidatedEntryTooltip"));
					}
				};
				document.getElementById(aType + '_' + aIndex + '_valueBox').addEventListener("input", fireInputTel, false);
			} else if (aType == "email") {
				function fireInputEmail(event) {
					var myValidationButton = document.getElementById(aType + '_' + aIndex + '_validateButton');
					var emailLower = this.value.toLowerCase();
					var atPos = this.value.lastIndexOf("@");
					if (this.value == emailLower && atPos > 0 && atPos + 1 < this.value.length) {
						myValidationButton.setAttribute('class', 'small-button cardbookValidated');
						myValidationButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("validatedEntryTooltip"));
					} else {
						myValidationButton.setAttribute('class', 'small-button cardbookNotValidated');
						myValidationButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("notValidatedEntryTooltip"));
					}
				};
				document.getElementById(aType + '_' + aIndex + '_valueBox').addEventListener("input", fireInputEmail, false);
			}
		
			if (aType == "tel") {
				function fireValidateTelButton(event) {
					if (document.getElementById(this.id).disabled) {
						return;
					}
					var myTelTextBox = document.getElementById(aType + '_' + aIndex + '_valueBox');
					var tel = PhoneNumber.Parse(myTelTextBox.value, wdw_cardEdition.cardRegion);
					if (tel && tel.internationalFormat) {
						myTelTextBox.value = tel.internationalFormat;
						this.setAttribute('class', 'small-button cardbookValidated');
						this.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("validatedEntryTooltip"));
					} else {
						this.setAttribute('class', 'small-button cardbookNotValidated');
						this.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("notValidatedEntryTooltip"));
					}
				};
				var myTelTextBoxValue = document.getElementById(aType + '_' + aIndex + '_valueBox').value;
				if (myTelTextBoxValue == "") {
					cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'noValidated', 'validate', fireValidateTelButton);
				} else {
					var tel = PhoneNumber.Parse(myTelTextBoxValue, wdw_cardEdition.cardRegion);
					if (tel && tel.internationalFormat) {
						cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'validated', 'validate', fireValidateTelButton);
					} else {
						cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'notValidated', 'validate', fireValidateTelButton);
					}
				}
			} else if (aType == "email") {
				function fireValidateEmailButton(event) {
					if (document.getElementById(this.id).disabled) {
						return;
					}
					let myEmailTextBox = document.getElementById(aType + '_' + aIndex + '_valueBox');
					let emailLower = myEmailTextBox.value.toLowerCase();
					emailLower = emailLower.replace("'", "").replace('"', "");
					let atPos = myEmailTextBox.value.lastIndexOf("@");
					if (atPos > 0 && atPos + 1 < myEmailTextBox.value.length) {
						myEmailTextBox.value = emailLower;
						this.setAttribute('label', '✔');
						this.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("validatedEntryTooltip"));
					} else {
						this.setAttribute('label', '!');
						this.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("notValidatedEntryTooltip"));
					}
				};
				var myEmailTextBoxValue = document.getElementById(aType + '_' + aIndex + '_valueBox').value;
				if (myEmailTextBoxValue == "") {
					cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'noValidated', 'validate', fireValidateEmailButton);
				} else {
					var emailLower = myEmailTextBoxValue.toLowerCase();
					var atPos = myEmailTextBoxValue.lastIndexOf("@");
					if (myEmailTextBoxValue == emailLower && atPos > 0 && atPos + 1 < myEmailTextBoxValue.length) {
						cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'validated', 'validate', fireValidateEmailButton);
					} else {
						cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'notValidated', 'validate', fireValidateEmailButton);
					}
				}
			} else if (aType == "url") {
				function fireValidateUrlButton(event) {
					if (document.getElementById(this.id).disabled) {
						return;
					}
					function assignUrlButton(aFile, aField) {
						aField.value = "file://" + aFile.path;
						aField.dispatchEvent(new Event('input'));
					};
					var myUrlTextBox = document.getElementById(aType + '_' + aIndex + '_valueBox');
					try {
						var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
						myFile.initWithPath(myUrlTextBox.value.replace("file://", ""));
						cardbookWindowUtils.callFilePicker("fileSelectionTitle", "OPEN", "", "", myFile.parent, assignUrlButton, myUrlTextBox);
					} catch(e) {
						cardbookWindowUtils.callFilePicker("fileSelectionTitle", "OPEN", "", "", "", assignUrlButton, myUrlTextBox);
					}
				};
				cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'link', 'link', fireValidateUrlButton);
			}
			
			function fireUpButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllTypes(aType, false);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1-1];
				myAllValuesArray[aIndex*1-1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRowsType(aType);
				cardbookWindowUtils.constructDynamicRows(aType, myAllValuesArray, aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'up', 'up', fireUpButton);
			
			function fireDownButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllTypes(aType, false);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1+1];
				myAllValuesArray[aIndex*1+1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRowsType(aType);
				cardbookWindowUtils.constructDynamicRows(aType, myAllValuesArray, aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'down', 'down', fireDownButton);

			function fireRemoveButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllTypes(aType, false);
				cardbookElementTools.deleteRowsType(aType);
				if (myAllValuesArray.length == 0) {
					cardbookWindowUtils.constructDynamicRows(aType, myAllValuesArray, aVersion);
				} else {
					var removed = myAllValuesArray.splice(aIndex, 1);
					cardbookWindowUtils.constructDynamicRows(aType, myAllValuesArray, aVersion);
				}
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'remove', 'remove', fireRemoveButton);
			
			function fireAddButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myValue = document.getElementById(aType + '_' + aIndex + '_valueBox').value;
				if (myValue == "") {                                                                                       
					return;
				}
				var myNextIndex = 1+ 1*aIndex;
				cardbookWindowUtils.loadDynamicTypes(aType, myNextIndex, [], "", [], [""], aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'add', 'add', fireAddButton);

			keyTextbox.dispatchEvent(new Event('input'));
		},

		loadDynamicEventsTypes: function (aDirPrefId, aType, aIndex, aEventType, aVersion) {
			var aOrigBox = document.getElementById(aType + 'Groupbox');
			
			if (aIndex == 0) {
				cardbookElementTools.addCaption(aType, aOrigBox);
			}
			
			var aHBox = cardbookElementTools.addHBox(aType, aIndex, aOrigBox, {class: "input-container"});

			var aPrefButton = cardbookElementTools.addPrefStar(aHBox, aType, aIndex, aEventType[2])

			let myDateFormat = cardbookRepository.getDateFormat(aDirPrefId, aVersion);
			cardbookElementTools.addDatepicker(aHBox, aType + '_' + aIndex + '_valueDateBox', cardbookRepository.cardbookDates.getDateStringFromVCardDate(aEventType[0], myDateFormat), {});
			var keyTextbox = cardbookElementTools.addKeyTextbox(aHBox, aType + '_' + aIndex + '_valueBox', aEventType[1], {}, aIndex);

			function fireUpButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllEvents(false);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1-1];
				myAllValuesArray[aIndex*1-1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRowsType(aType);
				cardbookWindowUtils.constructDynamicEventsRows(aDirPrefId, aType, myAllValuesArray, aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'up', 'up', fireUpButton);
			
			function fireDownButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllEvents(false);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1+1];
				myAllValuesArray[aIndex*1+1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRowsType(aType);
				cardbookWindowUtils.constructDynamicEventsRows(aDirPrefId, aType, myAllValuesArray, aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'down', 'down', fireDownButton);

			function fireRemoveButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllEvents(false);
				cardbookElementTools.deleteRowsType(aType);
				if (myAllValuesArray.length == 0) {
					cardbookWindowUtils.constructDynamicEventsRows(aDirPrefId, aType, myAllValuesArray, aVersion);
				} else {
					var removed = myAllValuesArray.splice(aIndex, 1);
					cardbookWindowUtils.constructDynamicEventsRows(aDirPrefId, aType, myAllValuesArray, aVersion);
				}
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'remove', 'remove', fireRemoveButton);
			
			function fireAddButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myValue = document.getElementById(aType + '_' + aIndex + '_valueBox').value;
				if (myValue == "") {                                                                                       
					return;
				}
				var myNextIndex = 1+ 1*aIndex;
				cardbookWindowUtils.loadDynamicEventsTypes(aDirPrefId, aType, myNextIndex, ["", ""], aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'add', 'add', fireAddButton);

			keyTextbox.dispatchEvent(new Event('input'));
		},

		loadDynamicTzTypes: function (aType, aIndex, aTzType) {
			let aOrigBox = document.getElementById(aType + 'Groupbox');
			
			if (aIndex == 0) {
				cardbookElementTools.addCaption(aType, aOrigBox);
			}
			
			let aHBox = cardbookElementTools.addHBox(aType, aIndex, aOrigBox, {class: "input-container", align: "end"});
			let menulist = cardbookElementTools.addMenuTzlist(aHBox, aType, aIndex, aTzType[0]);

			function fireUpButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllTz(false);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1-1];
				myAllValuesArray[aIndex*1-1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRowsType(aType);
				cardbookWindowUtils.constructDynamicTzRows(aType, myAllValuesArray);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'up', 'up', fireUpButton);
			
			function fireDownButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllTz(false);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1+1];
				myAllValuesArray[aIndex*1+1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRowsType(aType);
				cardbookWindowUtils.constructDynamicTzRows(aType, myAllValuesArray);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'down', 'down', fireDownButton);

			function fireRemoveButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllTz(false);
				cardbookElementTools.deleteRowsType(aType);
				if (myAllValuesArray.length == 0) {
					cardbookWindowUtils.constructDynamicEventsRows(aDirPrefId, aType, myAllValuesArray, aVersion);
				} else {
					var removed = myAllValuesArray.splice(aIndex, 1);
					cardbookWindowUtils.constructDynamicTzRows(aType, myAllValuesArray);
				}
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'remove', 'remove', fireRemoveButton);
			
			function fireAddButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myValue = document.getElementById(aType + '_' + aIndex + '_menulistTz').value;
				if (myValue == "") {                                                                                       
					return;
				}
				var myNextIndex = 1+ 1*aIndex;
				cardbookWindowUtils.loadDynamicTzTypes(aType, myNextIndex, [[], []]);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'add', 'add', fireAddButton);

			menulist.dispatchEvent(new Event('select'));
		},

		loadDynamicKeysTypes: function (aDirPrefId, aType, aIndex, aKeyType, aVersion) {
			var aOrigBox = document.getElementById(aType + 'ReadWriteGroupbox');
			
			var aHBox = cardbookElementTools.addHBox(aType, aIndex, aOrigBox, {class: "input-container"});

			var aPrefButton = cardbookElementTools.addPrefStar(aHBox, aType, aIndex, cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(aKeyType.types))
			
			let value;
			if (aKeyType.URI != "") {
				value = aKeyType.URI;
			} else {
				value = aKeyType.value.replaceAll("\\n", "\n").replaceAll("\\r", "\r");
			}
			var keyTextbox = cardbookElementTools.addKeyTextarea(aHBox, aType + '_' + aIndex + '_valueBox', value, { "style": "flex: 1" }, aIndex);

			function fireLinkKeyButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				function assignUrlButton(aFile, aField) {
					aField.value = "file://" + aFile.path;
					aField.dispatchEvent(new Event('input'));
				};
				var myKeyTextBox = document.getElementById(aType + '_' + aIndex + '_valueBox');
				try {
					var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
					myFile.initWithPath(myKeyTextBox.value.replace("file://", ""));
					cardbookWindowUtils.callFilePicker("fileSelectionTitle", "OPEN", "", "", myFile.parent, assignUrlButton, myKeyTextBox);
				} catch(e) {
					cardbookWindowUtils.callFilePicker("fileSelectionTitle", "OPEN", "", "", "", assignUrlButton, myKeyTextBox);
				}
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'link', 'link', fireLinkKeyButton);

			function fireUpButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllKeys(false);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1-1];
				myAllValuesArray[aIndex*1-1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRows(aType + "ReadWriteGroupbox");
				cardbookWindowUtils.constructDynamicKeysRows(aDirPrefId, aType, myAllValuesArray, aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'up', 'up', fireUpButton);
			
			function fireDownButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllKeys(false);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1+1];
				myAllValuesArray[aIndex*1+1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRows(aType + "ReadWriteGroupbox");
				cardbookWindowUtils.constructDynamicKeysRows(aDirPrefId, aType, myAllValuesArray, aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'down', 'down', fireDownButton);

			function fireRemoveButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllKeys(false);
				cardbookElementTools.deleteRows(aType + "ReadWriteGroupbox");
				if (myAllValuesArray.length == 0) {
					cardbookWindowUtils.constructDynamicKeysRows(aDirPrefId, aType, myAllValuesArray, aVersion);
				} else {
					var removed = myAllValuesArray.splice(aIndex, 1);
					cardbookWindowUtils.constructDynamicKeysRows(aDirPrefId, aType, myAllValuesArray, aVersion);
				}
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'remove', 'remove', fireRemoveButton);
			
			function fireAddButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myValue = document.getElementById(aType + '_' + aIndex + '_valueBox').value;
				if (myValue == "") {                                                                                       
					return;
				}
				var myNextIndex = 1+ 1*aIndex;
				cardbookWindowUtils.loadDynamicKeysTypes(aDirPrefId, aType, myNextIndex, {types: [], value: "", URI: "", extension: ""}, aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'add', 'add', fireAddButton);

			keyTextbox.dispatchEvent(new Event('input'));
		},

		loadStaticTypes: function (aDirPrefId, aType, aIndex, aInputTypes, aPgName, aPgType, aCardValue, aVersion) {
			if (aCardValue.join(" ") == "") {
				return;
			}

			let aOrigBox;
			let panesView = cardbookRepository.cardbookPrefs["panesView"];
			if (aIndex == 0) {
				let parent = document.getElementById(panesView + 'Rows');
				aOrigBox = cardbookElementTools.addVBox(parent, aType + panesView + 'Groupbox', {flex: '1'});
				cardbookElementTools.addCaption(aType, aOrigBox);
			} else {
				aOrigBox = document.getElementById(aType + panesView + 'Groupbox');
			}
			
			let row = cardbookElementTools.addHTMLTR(aOrigBox, aType + '_' + aIndex + '_TableRow');

			let myInputTypes = [];
			myInputTypes = cardbookRepository.cardbookUtils.getOnlyTypesFromTypes(aInputTypes);

			let myDisplayedTypes = [];
			if (aPgType.length != 0 && aPgName != "") {
				let found = false;
				for (let j = 0; j < aPgType.length; j++) {
					let tmpArray = aPgType[j].split(":");
					if (tmpArray[0] == "X-ABLABEL") {
						myDisplayedTypes.push(tmpArray[1]);
						found = true;
						break;
					}
				}
				if (!found) {
					myDisplayedTypes.push(cardbookRepository.cardbookTypes.whichLabelTypeShouldBeChecked(aType, aDirPrefId, myInputTypes));
				}
			} else {
				myDisplayedTypes.push(cardbookRepository.cardbookTypes.whichLabelTypeShouldBeChecked(aType, aDirPrefId, myInputTypes));
			}
			
			let imageData = cardbookElementTools.addHTMLTD(row, aType + '_' + aIndex + '_PrefImage' + '.1');
			let aPrefImage = document.createXULElement('image');
			imageData.appendChild(aPrefImage);
			aPrefImage.setAttribute('id', aType + '_' + aIndex + '_PrefImage');
			if (cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(aInputTypes)) {
				aPrefImage.setAttribute('class', 'cardbookPrefStarClass');
				aPrefImage.setAttribute('haspref', 'true');
			} else {
				aPrefImage.setAttribute('class', 'cardbookNoPrefStarClass');
				aPrefImage.removeAttribute('haspref');
			}

			let prefweightData = cardbookElementTools.addHTMLTD(row, aType + '_' + aIndex + '_prefWeightBox' + '.1');
			cardbookElementTools.addHTMLINPUT(prefweightData, aType + '_' + aIndex + '_prefWeightBox', cardbookRepository.cardbookUtils.getPrefValueFromTypes(aInputTypes, document.getElementById('versionTextBox').value),
										{readonly: 'true'});
			if (document.getElementById('versionTextBox').value === "4.0") {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('hidden', 'false');
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('width', '3');
			} else {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('hidden', 'true');
			}

			let myValueTextbox;
			let typeData = cardbookElementTools.addHTMLTD(row, aType + '_' + aIndex + '_typeBox' + '.1');
			let valueData = cardbookElementTools.addHTMLTD(row, aType + '_' + aIndex + '_valueBox' + '.1');
			if (aType == "impp") {
				let serviceCode = cardbookRepository.cardbookTypes.getIMPPCode(aInputTypes);
				let serviceProtocol = cardbookRepository.cardbookTypes.getIMPPProtocol(aCardValue);
				let myValue = aCardValue.join(" ");
				if (serviceCode != "") {
					let serviceLine = [];
					serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForCode(serviceCode)
					if (serviceLine[0]) {
						myDisplayedTypes = myDisplayedTypes.concat(serviceLine[1]);
						cardbookElementTools.addLabel(typeData, aType + '_' + aIndex + '_typeBox', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), null, {});
						let myRegexp = new RegExp("^" + serviceLine[2] + ":");
						myValue = myValue.replace(myRegexp, "");
						myValueTextbox = cardbookElementTools.addLabel(valueData, aType + '_' + aIndex + '_valueBox', myValue, null, {});
						myValueTextbox.setAttribute('link', 'true');
					} else {
						myDisplayedTypes = myDisplayedTypes.concat(serviceCode);
						cardbookElementTools.addLabel(typeData, aType + '_' + aIndex + '_typeBox', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), null, {});
						myValueTextbox = cardbookElementTools.addLabel(valueData, aType + '_' + aIndex + '_valueBox', myValue, null, {});
						myValueTextbox.setAttribute('readonly', 'true');
					}
				} else if (serviceProtocol != "") {
					var serviceLine = [];
					serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForProtocol(serviceProtocol)
					if (serviceLine[0]) {
						myDisplayedTypes = myDisplayedTypes.concat(serviceLine[1]);
						cardbookElementTools.addLabel(typeData, aType + '_' + aIndex + '_typeBox', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), null, {});
						let myRegexp = new RegExp("^" + serviceLine[2] + ":");
						myValue = myValue.replace(myRegexp, "");
						myValueTextbox = cardbookElementTools.addLabel(valueData, aType + '_' + aIndex + '_valueBox', myValue, null, {});
						myValueTextbox.setAttribute('link', 'true');
					} else {
						myDisplayedTypes = myDisplayedTypes.concat(serviceCode);
						cardbookElementTools.addLabel(typeData, aType + '_' + aIndex + '_typeBox', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), null, {});
						myValueTextbox = cardbookElementTools.addLabel(valueData, aType + '_' + aIndex + '_valueBox', myValue, null, {});
						myValueTextbox.setAttribute('readonly', 'true');
					}
				} else {
					cardbookElementTools.addLabel(typeData, aType + '_' + aIndex + '_typeBox', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), null, {});
					myValueTextbox = cardbookElementTools.addLabel(valueData, aType + '_' + aIndex + '_valueBox', myValue, null, {});
					myValueTextbox.setAttribute('readonly', 'true');
				}
			} else {
				cardbookElementTools.addLabel(typeData, aType + '_' + aIndex + '_typeBox', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), null, {});
	
				if (aType == "adr") {
					let re = /[\n\u0085\u2028\u2029]|\r\n?/;
					let myAdrResult = cardbookRepository.cardbookUtils.formatAddress(aCardValue);
					let myAdrResultArray = myAdrResult.split(re);
					myValueTextbox = cardbookElementTools.addHTMLTEXTAREA(valueData, aType + '_' + aIndex + '_valueBox', myAdrResult, {rows: myAdrResultArray.length});
				} else {
					myValueTextbox = cardbookElementTools.addLabel(valueData, aType + '_' + aIndex + '_valueBox', cardbookRepository.cardbookUtils.cleanArray(aCardValue).join(" "), null, {});
				}
				
				if (aType == "adr") {
					myValueTextbox.setAttribute('link', 'true');
				} else if (aType == "url" || aType == "email") {
					myValueTextbox.setAttribute('class', 'text-link');
				} else if (aType == "tel") {
					try {
						myValueTextbox.setAttribute('link', 'true');
					}
					catch(e) {
						myValueTextbox.setAttribute('readonly', 'true');
					}
				}
			}
			
			myValueTextbox.addEventListener("contextmenu", cardbookRichContext.fireTypeContext, false);
				
			function fireClick(event) {
				if (wdw_cardbook) {
					wdw_cardbook.chooseActionTreeForClick(event)
				}
			};
			myValueTextbox.addEventListener("click", fireClick, false);
		},

		loadStaticEventsTypes: function (aDirPrefId, aType, aIndex, aEventType, aVersion) {
			let aOrigBox;
			let panesView = cardbookRepository.cardbookPrefs["panesView"];
			if (aIndex == 0) {
				let parent = document.getElementById(panesView + 'Rows');
				aOrigBox = cardbookElementTools.addVBox(parent, aType + panesView + 'Groupbox', {flex: '1'});
				cardbookElementTools.addCaption(aType, aOrigBox);
			} else {
				aOrigBox = document.getElementById(aType + panesView + 'Groupbox');
			}
			
			let row = cardbookElementTools.addHTMLTR(aOrigBox, aType + '_' + aIndex + '_TableRow');

			let imageData = cardbookElementTools.addHTMLTD(row, aType + '_' + aIndex + '_PrefImage' + '.1');
			let aPrefImage = document.createXULElement('image');
			imageData.appendChild(aPrefImage);
			aPrefImage.setAttribute('id', aType + '_' + aIndex + '_PrefImage');
			if (aEventType[2]) {
				aPrefImage.setAttribute('class', 'cardbookPrefStarClass');
				aPrefImage.setAttribute('haspref', 'true');
			} else {
				aPrefImage.setAttribute('class', 'cardbookNoPrefStarClass');
				aPrefImage.removeAttribute('haspref');
			}

			let prefweightData = cardbookElementTools.addHTMLTD(row, aType + '_' + aIndex + '_prefWeightBox' + '.1');
			cardbookElementTools.addLabel(prefweightData, aType + '_' + aIndex + '_prefWeightBox', '', null, {});
			if (aVersion === "4.0") {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('hidden', 'false');
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('width', '3');
			} else {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('hidden', 'true');
			}
			
			let dateFormat = cardbookRepository.getDateFormat(aDirPrefId, aVersion);
			let myFormattedDate = cardbookRepository.cardbookDates.getFormattedDateForDateString(aEventType[0], dateFormat, cardbookRepository.cardbookPrefs["dateDisplayedFormat"]);
			let myDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(aEventType[0], dateFormat);
			let myDateString = cardbookRepository.cardbookDates.convertUTCDateToDateString(myDate, "4.0");
			let typeData = cardbookElementTools.addHTMLTD(row, aType + '_' + aIndex + '_typeBox' + '.1');
			let myValueTextbox1 = cardbookElementTools.addLabel(typeData, aType + '_' + aIndex + '_typeBox', myFormattedDate, null, {fieldValue: myDateString + "::" + aEventType[1] + "::" + aEventType[2]});
	
			let valueData = cardbookElementTools.addHTMLTD(row, aType + '_' + aIndex + '_valueBox' + '.1');
			let myValueTextbox2 = cardbookElementTools.addLabel(valueData, aType + '_' + aIndex + '_valueBox', aEventType[1], null,
											{flex: '1', fieldValue: myDateString + "::" + aEventType[1] + "::" + aEventType[2]});

			myValueTextbox1.addEventListener("contextmenu", cardbookRichContext.fireTypeContext, false);
			myValueTextbox2.addEventListener("contextmenu", cardbookRichContext.fireTypeContext, false);
			
			function fireClick(event) {
				if (wdw_cardbook) {
					wdw_cardbook.chooseActionTreeForClick(event)
				}
			};
			row.addEventListener("click", fireClick, false);
		},

		loadStaticTzTypes: function (aType, aIndex, aTzType) {
			if (aTzType.length == 1 && aTzType[0] == "") {
				return;
			}

			let aOrigBox;
			let panesView = cardbookRepository.cardbookPrefs["panesView"];
			if (aIndex == 0) {
				let parent = document.getElementById(panesView + 'Rows');
				aOrigBox = cardbookElementTools.addVBox(parent, aType + panesView + 'Groupbox', {flex: '1'});
				cardbookElementTools.addCaption(aType, aOrigBox);
			} else {
				aOrigBox = document.getElementById(aType + panesView + 'Groupbox');
			}
			
			let row = cardbookElementTools.addHTMLTR(aOrigBox, aType + '_' + aIndex + '_TableRow');

			let imageData = cardbookElementTools.addHTMLTD(row, aType + '_' + aIndex + '_PrefImage' + '.1');
			let aPrefImage = document.createXULElement('image');
			imageData.appendChild(aPrefImage);
			aPrefImage.setAttribute('id', aType + '_' + aIndex + '_PrefImage');
			aPrefImage.setAttribute('class', 'cardbookNoPrefStarClass');
			aPrefImage.removeAttribute('haspref');

			let typeData = cardbookElementTools.addHTMLTD(row, aType + '_' + aIndex + '_typeBox' + '.1');
			let myValueTextbox = cardbookElementTools.addLabel(typeData, aType + '_' + aIndex + '_typeBox', aTzType[0], null, {"data-field-name": "tz"});

			myValueTextbox.addEventListener("contextmenu", cardbookRichContext.fireTypeContext, false);
				
			function fireClick(event) {
				if (wdw_cardbook) {
					wdw_cardbook.chooseActionTreeForClick(event)
				}
			};
			myValueTextbox.addEventListener("click", fireClick, false);
		},

		loadStaticKeysTypes: function (aDirPrefId, aType, aIndex, aKeyType, aVersion, aCardFn, aCardDirPrefId) {
			var aOrigBox = document.getElementById(aType + 'ReadOnlyGroupbox');
			var aButton = cardbookElementTools.addKeyButton(aOrigBox, aType, aIndex, aKeyType, aCardFn, aCardDirPrefId);
		},

		loadEmailProperties: function (aCard, aReadOnly) {
			let emails = [];
			if (aCard.isAList) {
				emails.push(aCard.fn.toLowerCase());
			} else {
				for (let email of aCard.email) {
					emails.push(email[0][0].toLowerCase());
				}
			}

			document.getElementById("listTab").setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("listsTabLabel"));
			let aOrigBox = document.getElementById('emailpropertyGroupbox');
			let popLabel = cardbookRepository.extension.localeData.localizeMessage("popularityLabel");
			let i = 0;
			for (let email of emails) {
				let mailPopularityValue = 0;
				if (cardbookRepository.cardbookMailPopularityIndex[email.toLowerCase()]) {
					mailPopularityValue = cardbookRepository.cardbookMailPopularityIndex[email.toLowerCase()].count;
				}
				let table;
				if (!document.getElementById('emailpropertyTable')) {
					table = cardbookElementTools.addHTMLTABLE(aOrigBox, 'emailpropertyTable');
				} else {
					table = document.getElementById('emailpropertyTable');
				}
				let emailRow = cardbookElementTools.addHTMLTR(table, 'emailproperty_' + i + '_emailRow');
				let emailData = cardbookElementTools.addHTMLTD(emailRow, 'emailRow_' + i + '_Textbox' + '.1');
				cardbookElementTools.addLabel(emailData, 'emailheader_' + i + '_Textbox', email, null, {class: "boldFont", readonly: 'true'});

				let row = cardbookElementTools.addHTMLTR(table, 'emailproperty_' + i + '_Row');
				if (aReadOnly) {
					let labelData = cardbookElementTools.addHTMLTD(row, 'pop_' + i + '_Textbox' + '.1');
					cardbookElementTools.addLabel(labelData, 'pop_' + i + '_Textbox', popLabel, null, {});
					let valueData = cardbookElementTools.addHTMLTD(row, 'popularity_' + i + '_Textbox' + '.1');
					cardbookElementTools.addLabel(valueData, 'popularity_' + i + '_Textbox', mailPopularityValue, null, {});
				} else {
					let labelData = cardbookElementTools.addHTMLTD(row, 'pop_' + i + '_Textbox' + '.1');
					cardbookElementTools.addLabel(labelData, 'pop_' + i + '_Textbox', popLabel, null, {});
					let valueData = cardbookElementTools.addHTMLTD(row, 'popularity_' + i + '_Textbox' + '.1');
					cardbookElementTools.addHTMLINPUT(valueData, 'popularity_' + i + '_Textbox', mailPopularityValue, {type:"number", min:"0", max:"100000", class:"size5"});
				}
				let labelData = cardbookElementTools.addHTMLTD(row, 'email_' + i + '_Textbox' + '.1');
				cardbookElementTools.addLabel(labelData, 'email_' + i + '_Textbox', email, null, {hidden: 'true'});
				cardbookWindowUtils.addMemberOf(aCard.dirPrefId, email, table, i, aCard.isAList);
				i++;
			}
		},

		addMemberOf: async function (aDirPrefId, aEmail, aOrigBox, aIndex, aIsAList) {
			let memberOfLabel = cardbookRepository.extension.localeData.localizeMessage("memberOfLabel");
			for (let list of cardbookRepository.cardbookDisplayCards[aDirPrefId].cards.filter(card => card.isAList)) {
				let listConversion = new cardbookListConversion(list.fn + " <" + list.fn + ">", null, true);
				if ((listConversion.emailResult.includes(aEmail) && !aIsAList) ||
					(listConversion.recursiveList.includes(aEmail) && aIsAList && aEmail != list.fn)) {
					let row = cardbookElementTools.addHTMLTR(aOrigBox, 'memberOf_' + aIndex + '_TableRow');
					let labelData = cardbookElementTools.addHTMLTD(row, 'memberOf_' + aIndex + '_Textbox' + '.1');
					cardbookElementTools.addLabel(labelData, 'memberOf_' + aIndex + '_Textbox', memberOfLabel, null, {});
					let valueData = cardbookElementTools.addHTMLTD(row, 'fn_' + list.cbid + '_valueBox' + '.1', {class: 'cardbook-large-column'});
					let listTextbox = cardbookElementTools.addLabel(valueData, 'fn_' + list.cbid + '_valueBox', cardbookRepository.cardbookUtils.getName(list), null, {});
					listTextbox.setAttribute('class', 'text-link cardbookMemberOf');
					listTextbox.addEventListener("click", cardbookWindowUtils.editCardFromList, false);

					let itemList = aOrigBox.querySelectorAll(".cardbookMemberOf");
					let items = Array.from(itemList, item => item.getAttribute("id"));
					items = cardbookRepository.arrayUnique(items);
					let listsTabLabel = cardbookRepository.extension.localeData.localizeMessage("listsTabLabel");
					document.getElementById("listTab").setAttribute("label", listsTabLabel + " (" + items.length + ")");
				}
			}
		},

		loadStaticList: function (aCard) {
			var addedCards = [];
			var myMembers = cardbookRepository.cardbookUtils.getMembersFromCard(aCard);
			for (let email of myMembers.mails) {
				addedCards.push(["", [email.toLowerCase()], ""]);
			}
			for (let card of myMembers.uids) {
				if (card.isAList) {
					addedCards.push([cardbookRepository.cardbookUtils.getName(card), [""], card.cbid]);
				} else {
					addedCards.push([cardbookRepository.cardbookUtils.getName(card), card.emails, card.cbid]);
				}
			}

			for (let i = 0; i < addedCards.length; i++) {
				let aOrigBox = document.getElementById('addedCardsGroupbox');

				if (i == 0) {
					let label = cardbookRepository.extension.localeData.localizeMessage("addedCardsGroupboxLabel") + " (" + addedCards.length + ")";
					cardbookElementTools.addCaptionWithLabel('addedCards', aOrigBox, label);
				}

				let row = cardbookElementTools.addHTMLTR(aOrigBox, 'addedCards_' + i + '_row');

				let imageData = cardbookElementTools.addHTMLTD(row, 'dummyListPrefBox_' + i + '.1');
				let aImage = document.createXULElement('image');
				imageData.appendChild(aImage);
				aImage.setAttribute('id', 'dummyListPrefBox_' + i);
				aImage.setAttribute('class', 'cardbookNoPrefStarClass');

				let labelData = cardbookElementTools.addHTMLTD(row, 'email_' + addedCards[i][2] + '_valueBox' + '.1');
				cardbookElementTools.addLabel(labelData, 'email_' + addedCards[i][2] + '_valueBox', addedCards[i][1].join(" "), null, {});

				let textboxData = cardbookElementTools.addHTMLTD(row, 'fn_' + addedCards[i][2] + '_valueBox' + '.1');
				let myCardTextbox = cardbookElementTools.addLabel(textboxData, 'fn_' + addedCards[i][2] + '_valueBox', addedCards[i][0], null, {});
				myCardTextbox.setAttribute('class', 'text-link');
				myCardTextbox.addEventListener("click", cardbookWindowUtils.editCardFromList, false);
			}
		},

		connectCardsFromChatButton: function(aButton) {
			try {
				var myPopup = document.getElementById(aButton.id + "MenuPopup");
				if (myPopup.childNodes.length == 0) {
					return;
				} else if (myPopup.childNodes.length == 1) {
					myPopup.lastChild.doCommand();
				} else {
					myPopup.openPopup(aButton, 'after_start', 0, 0, true);
				}
			}
			catch (e) {
				var errorTitle = "connectCardsFromChatButton";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		addCardToIMPPMenuSubMenu: function(aCard, aMenuName) {
			try {
				if (!document.getElementById(aMenuName)) {
					return;
				}
				var myPopup = document.getElementById(aMenuName);
				var myMenu = document.getElementById(aMenuName.replace("MenuPopup", ""));
				while (myPopup.hasChildNodes()) {
					myPopup.lastChild.remove();
				}
				
				myMenu.disabled = true;
				if (aCard) {
					var telProtocolLine = cardbookRepository.cardbookPrefs["tels.0"];
					var rowNumber = 0;
					if (telProtocolLine) {
						var telProtocolLineArray = telProtocolLine.split(':');
						var telLabel = telProtocolLineArray[1];
						var telProtocol = telProtocolLineArray[2];
						var myTels = cardbookRepository.cardbookUtils.getPrefAddressFromCard(aCard, "tel", cardbookRepository.cardbookPrefs["preferIMPPPref"]);
						for (var i = 0; i < myTels.length; i++) {
							var menuItem = document.createXULElement("menuitem");
							var myRegexp = new RegExp("^" + telProtocol + ":");
							var myAddress = myTels[i].replace(myRegexp, "");
							menuItem.setAttribute("id", rowNumber);
							menuItem.addEventListener("command", function(aEvent) {
									cardbookWindowUtils.openTel(this.value);
									aEvent.stopPropagation();
								}, false);
							menuItem.setAttribute("label", telLabel + ": " + myAddress);
							menuItem.setAttribute("value", myAddress);
							myPopup.appendChild(menuItem);
							rowNumber++;
							myMenu.disabled = false;
						}
					}
					var myIMPPs = cardbookRepository.cardbookUtils.getPrefAddressFromCard(aCard, "impp", cardbookRepository.cardbookPrefs["preferIMPPPref"]);
					for (var i = 0; i < myIMPPs.length; i++) {
						var serviceProtocol = cardbookRepository.cardbookTypes.getIMPPProtocol([myIMPPs[i]]);
						var serviceLine = [];
						serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForProtocol(serviceProtocol)
						if (serviceLine[0]) {
							var menuItem = document.createXULElement("menuitem");
							var myRegexp = new RegExp("^" + serviceLine[2] + ":");
							var myAddress = myIMPPs[i].replace(myRegexp, "");
							menuItem.setAttribute("id", rowNumber);
							menuItem.addEventListener("command", function(aEvent) {
									cardbookRepository.cardbookUtils.openExternalURL(cardbookRepository.cardbookUtils.formatIMPPForOpenning(this.value));
									aEvent.stopPropagation();
								}, false);
							menuItem.setAttribute("label", serviceLine[1] + ": " + myAddress);
							menuItem.setAttribute("value", serviceLine[2] + ":" + myAddress);
							myPopup.appendChild(menuItem);
							rowNumber++;
							myMenu.disabled = false;
						}
					}
				}
				if (!myPopup.hasChildNodes()) {
					myMenu.disabled=true;
				}
			}
			catch (e) {
				var errorTitle = "addCardToIMPPMenuSubMenu";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		addCardsToCategoryMenuSubMenu: function(aMenuName) {
			try {
				var myPopup = document.getElementById(aMenuName);
				var myMenu = document.getElementById(aMenuName.replace("MenuPopup", ""));
				for (let i = myPopup.childNodes.length; i > 2; --i) {
					myPopup.lastChild.remove();
				}

				var listOfDirPrefId = cardbookWindowUtils.getSelectedCardsDirPrefId();
				var selectedId = cardbookWindowUtils.getSelectedCardsId();
				if (selectedId.length > 0) {
					var myCategoryList = [];
					for (let dirPrefId of listOfDirPrefId) {
						myCategoryList = myCategoryList.concat(cardbookRepository.cardbookAccountsCategories[dirPrefId]);
					}
					myCategoryList = cardbookRepository.cardbookUtils.cleanCategories(myCategoryList);
					cardbookRepository.cardbookUtils.sortArrayByString(myCategoryList,1);
					for (let category of myCategoryList) {
						var item = document.createXULElement("menuitem");
						item.setAttribute("id", category);
						item.setAttribute("type", "checkbox");
						item.setAttribute("class", "menuitem-iconic cardbookCategoryMenuClass");
						if (category in cardbookRepository.cardbookNodeColors && cardbookRepository.useColor != "nothing") {
							item.setAttribute("colorType", 'category_' + cardbookRepository.cardbookUtils.formatCategoryForCss(category));
						}
						item.addEventListener("command", function(aEvent) {
								if (this.getAttribute("checked") == "true") {
									wdw_cardbook.addCategoryToSelectedCards(this.id, false);
								} else {
									wdw_cardbook.removeCategoryFromSelectedCards(this.id);
								}
								aEvent.stopPropagation();
							}, false);
						item.setAttribute("label", category);
						var categoryCount = 0;
						for (let id of selectedId) {
							var myCard = cardbookRepository.cardbookCards[id];
							if (myCard.categories.includes(category)) {
								categoryCount++;
							}
						}
						if (categoryCount == 0) {
							item.setAttribute("checked", "false");
							item.setAttribute("disabled", "false");
						} else if (categoryCount == selectedId.length) {
							item.setAttribute("checked", "true");
							item.setAttribute("disabled", "false");
						} else {
							item.setAttribute("checked", "false");
							item.setAttribute("disabled", "true");
						}						
						myPopup.appendChild(item);
					}
				}
			}
			catch (e) {
				var errorTitle = "addCardToCategoryMenuSubMenu";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		editCardFromList: async function (aEvent) {
			let element = document.elementFromPoint(aEvent.clientX, aEvent.clientY);
			let cbid = element.id.split('_')[1];
			await cardbookWindowUtils.editCardFromCard(cardbookRepository.cardbookCards[cbid]);
		},

		editCardFromCard: async function (aCard) {
			if (aCard) {
				var myOutCard = new cardbookCardParser();
				await cardbookRepository.cardbookUtils.cloneCard(aCard, myOutCard);
				if (myOutCard.isAList) {
					var myType = "List";
				} else {
					var myType = "Contact";
				}
				if (cardbookRepository.cardbookPreferences.getReadOnly(aCard.dirPrefId)) {
					cardbookWindowUtils.openEditionWindow(myOutCard, "View" + myType);
				} else {
					cardbookWindowUtils.openEditionWindow(myOutCard, "Edit" + myType);
				}
			}
		},

		displayColumnsPicker: function (aEvent) {
			let target = aEvent.explicitOriginalTarget;
			if (target.localName == "treecol") {
				let treeColPicker = target.parentNode.querySelector("treecolpicker");
				let popup = treeColPicker.querySelector(`menupopup[anonid="popup"]`);
				treeColPicker.buildPopup(popup);
				popup.openPopup(target, "after_start", 0, 0, true);
				return false;
			}
			return true;
		},

	};
};
