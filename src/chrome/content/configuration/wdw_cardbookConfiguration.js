/*
Preferences.addAll([
	{ id: "extensions.cardbook.exclusive", type: "bool" },
	{ id: "extensions.cardbook.autocompletion", type: "bool" },
	{ id: "extensions.cardbook.autocompleteSortByPopularity", type: "bool" },
	{ id: "extensions.cardbook.proposeConcatEmails", type: "bool" },
	{ id: "extensions.cardbook.autocompleteShowAddressbook", type: "bool" },
	{ id: "extensions.cardbook.autocompleteShowEmailType", type: "bool" },
	{ id: "extensions.cardbook.autocompleteShowPopularity", type: "bool" },
	{ id: "extensions.cardbook.autocompleteWithColor", type: "bool" },
	{ id: "extensions.cardbook.autocompleteRestrictSearch", type: "bool" },
	{ id: "extensions.cardbook.autocompleteRestrictSearchFields", type: "string" },
	{ id: "extensions.cardbook.useColor", type: "string" },
	{ id: "extensions.cardbook.debugMode", type: "bool" },
	{ id: "extensions.cardbook.statusInformationLineNumber", type: "string" },
	{ id: "extensions.cardbook.listTabView", type: "bool" },
	{ id: "extensions.cardbook.technicalTabView", type: "bool" },
	{ id: "extensions.cardbook.vcardTabView", type: "bool" },
	{ id: "extensions.cardbook.keyTabView", type: "bool" },
	{ id: "extensions.cardbook.localizeEngine", type: "string" },
	{ id: "extensions.cardbook.showNameAs", type: "string" },
	{ id: "extensions.cardbook.adrFormula", type: "string" },
	{ id: "extensions.cardbook.localizeTarget", type: "string" },
	{ id: "extensions.cardbook.preferEmailEdition", type: "bool" },
	{ id: "extensions.cardbook.dateDisplayedFormat", type: "string" },
	{ id: "extensions.cardbook.defaultRegion", type: "string" },
	{ id: "extensions.cardbook.fieldsNameList", type: "string" },
	{ id: "extensions.cardbook.localDataEncryption", type: "bool" },
	{ id: "extensions.cardbook.preferIMPPPref", type: "bool" },
	{ id: "extensions.cardbook.URLPhoneURL", type: "string" },
	{ id: "extensions.cardbook.URLPhoneUser", type: "string" },
	{ id: "extensions.cardbook.URLPhoneBackground", type: "bool" },
	{ id: "extensions.cardbook.kindCustom", type: "string" },
	{ id: "extensions.cardbook.memberCustom", type: "string" },
	{ id: "extensions.cardbook.syncAfterChange", type: "bool" },
	{ id: "extensions.cardbook.initialSync", type: "bool" },
	{ id: "extensions.cardbook.initialSyncDelay", type: "string" },
	{ id: "extensions.cardbook.solveConflicts", type: "string" },
	{ id: "extensions.cardbook.maxModifsPushed", type: "string" },
	{ id: "extensions.cardbook.requestsTimeout", type: "string" },
	{ id: "extensions.cardbook.multiget", type: "string" },
	{ id: "extensions.cardbook.discoveryAccountsNameList", type: "string" },
	{ id: "extensions.cardbook.decodeReport", type: "bool" },
	{ id: "extensions.cardbook.preferEmailPref", type: "bool" },
	{ id: "extensions.cardbook.warnEmptyEmails", type: "bool" },
	{ id: "extensions.cardbook.useOnlyEmail", type: "bool" },
	{ id: "extensions.cardbook.addressBooksNameList", type: "string" },
	{ id: "extensions.cardbook.birthday.bday", type: "bool" },
	{ id: "extensions.cardbook.birthday.anniversary", type: "bool" },
	{ id: "extensions.cardbook.birthday.deathdate", type: "bool" },
	{ id: "extensions.cardbook.birthday.events", type: "bool" },
	{ id: "extensions.cardbook.calendarsNameList", type: "string" },
	{ id: "extensions.cardbook.numberOfDaysForSearching", type: "string" },
	{ id: "extensions.cardbook.showPopupOnStartup", type: "bool" },
	{ id: "extensions.cardbook.showPeriodicPopup", type: "bool" },
	{ id: "extensions.cardbook.periodicPopupIime", type: "string" },
	{ id: "extensions.cardbook.showPopupEvenIfNoBirthday", type: "bool" },
	{ id: "extensions.cardbook.numberOfDaysForWriting", type: "string" },
	{ id: "extensions.cardbook.syncWithLightningOnStartup", type: "bool" },
	{ id: "extensions.cardbook.eventEntryTitle", type: "string" },
	{ id: "extensions.cardbook.repeatingEvent", type: "bool" },
	{ id: "extensions.cardbook.eventEntryWholeDay", type: "bool" },
	{ id: "extensions.cardbook.eventEntryTime", type: "string" },
	{ id: "extensions.cardbook.calendarEntryAlarm", type: "string" },
	{ id: "extensions.cardbook.calendarEntryCategories", type: "string" },
]);
*/

var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

Services.scriptloader.loadSubScript("chrome://cardbook/content/scripts/i18n.js");

var CardBookConfigNotification = {};
XPCOMUtils.defineLazyGetter(CardBookConfigNotification, "errorNotifications", () => {
	return new MozElements.NotificationBox(element => {
		element.setAttribute("flex", "1");
		document.getElementById("errorNotificationsHbox").append(element);
	});
});

var wdw_cardbookConfiguration = {

	allCustomFields: {},
	allIMPPs: {},
	allTypes: {},
	allOrg: [],
	allRestrictions: [],
	allEmailsCollections: [],
	allVCards: [],
	allFields: [],
	allDiscoveryAccounts: [],
	allAddressbooks: [],
	allCalendars: [],
	preferEmailPrefOld: false,
	encryptionPrefOld: false,
	URLPhoneURLOld: "",
	URLPhoneUserOld: "",
	autocompleteRestrictSearchFields: "",
	customListsFields: ['kindCustom', 'memberCustom'],
	
	customFieldCheck: function (aTextBox) {
		let value = aTextBox.value.trim();
		if (value == "") {
			aTextBox.value = "X-";
		} else {
			aTextBox.value = value.toUpperCase();
		}
	},

	sortTable: function (aTableName) {
		let table = document.getElementById(aTableName);
		let order = table.getAttribute("data-sort-order") == "ascending" ? 1 : -1;
		let columnName = table.getAttribute("data-sort-column");
		
		let columnArray = wdw_cardbookConfiguration.getTableMapArray(columnName);
		let columnType = wdw_cardbookConfiguration.getTableMapType(columnName);
		let data = wdw_cardbookConfiguration.getTableData(aTableName);

		if (data && data.length) {
			if (columnType == "number") {
				cardbookRepository.cardbookUtils.sortMultipleArrayByNumber(data, columnArray, order);
			} else {
				cardbookRepository.cardbookUtils.sortMultipleArrayByString(data, columnArray, order);
			}
		}

		if (aTableName == "accountsVCardsTable") {
			wdw_cardbookConfiguration.displayVCards();
		} else if (aTableName == "accountsRestrictionsTable") {
			wdw_cardbookConfiguration.displayRestrictions();
		} else if (aTableName == "typesTable") {
			wdw_cardbookConfiguration.displayTypes();
		} else if (aTableName == "emailsCollectionTable") {
			wdw_cardbookConfiguration.displayEmailsCollection();
		} else if (aTableName == "IMPPsTable") {
			wdw_cardbookConfiguration.displayIMPPs();
		} else if (aTableName == "customFieldsTable") {
			wdw_cardbookConfiguration.displayCustomFields();
		} else if (aTableName == "orgTreeTable") {
			wdw_cardbookConfiguration.displayOrg();
		} else if (aTableName == "fieldsTreeTable") {
			wdw_cardbookConfiguration.displayFields();
		} else if (aTableName == "discoveryAccountsTable") {
			wdw_cardbookConfiguration.displayDiscoveryAccounts();
		} else if (aTableName == "addressbooksTable") {
			wdw_cardbookConfiguration.displayAddressbooks();
		} else if (aTableName == "calendarsTable") {
			wdw_cardbookConfiguration.displayCalendars();
		}
	},

	clickTree: function (aEvent) {
		if (aEvent.target.tagName == "html:td") {
			let row = aEvent.target.closest("tr");
			let tbody = aEvent.target.closest("tbody");
			let table = aEvent.target.closest("table");
			for (let child of tbody.childNodes) {
				child.removeAttribute("rowSelected");
			}
			row.setAttribute("rowSelected", "true");

			if (table.id == "accountsVCardsTable") {
				wdw_cardbookConfiguration.selectVCard();
			} else if (table.id == "accountsRestrictionsTable") {
				wdw_cardbookConfiguration.selectRestriction();
			} else if (table.id == "typesTable") {
				wdw_cardbookConfiguration.selectType();
			} else if (table.id == "emailsCollectionTable") {
				wdw_cardbookConfiguration.selectEmailsCollection();
			} else if (table.id == "IMPPsTable") {
				wdw_cardbookConfiguration.selectIMPPs();
			} else if (table.id == "customFieldsTable") {
				wdw_cardbookConfiguration.selectCustomFields();
			} else if (table.id == "orgTreeTable") {
				wdw_cardbookConfiguration.selectOrg();
			}
		}
	},

	doubleClickTree: function (aEvent) {
		let tableName = aEvent.target.closest("table").id;
		if (aEvent.target.tagName == "html:th") {
			return;
		} else if (aEvent.target.tagName == "html:td") {
			if (tableName == "accountsVCardsTable") {
				wdw_cardbookConfiguration.renameVCard();
			} else if (tableName == "accountsRestrictionsTable") {
				wdw_cardbookConfiguration.renameRestriction();
			} else if (tableName == "typesTable") {
				wdw_cardbookConfiguration.renameType();
			} else if (tableName == "emailsCollectionTable") {
				wdw_cardbookConfiguration.renameEmailsCollection();
			} else if (tableName == "IMPPsTable") {
				wdw_cardbookConfiguration.renameIMPP();
			} else if (tableName == "customFieldsTable") {
				wdw_cardbookConfiguration.renameCustomFields();
			} else if (tableName == "orgTreeTable") {
				wdw_cardbookConfiguration.renameOrg();
			}
		} else {
			if (tableName == "accountsVCardsTable") {
				wdw_cardbookConfiguration.addVCard();
			} else if (tableName == "accountsRestrictionsTable") {
				wdw_cardbookConfiguration.addRestriction();
			} else if (tableName == "typesTable") {
				wdw_cardbookConfiguration.addType();
			} else if (tableName == "emailsCollectionTable") {
				wdw_cardbookConfiguration.addEmailsCollection();
			} else if (tableName == "IMPPsTable") {
				wdw_cardbookConfiguration.addIMPP();
			} else if (tableName == "customFieldsTable") {
				wdw_cardbookConfiguration.addCustomFields();
			} else if (tableName == "orgTreeTable") {
				wdw_cardbookConfiguration.addOrg();
			}
		}
	},

	clickToSort: function (aEvent) {
		if (aEvent.target.tagName == "html:th" || aEvent.target.tagName == "html:img") {
			let column = aEvent.target.closest("th");
			let columnName = column.getAttribute("data-value");
			let table = column.closest("table");
			if (table.getAttribute("data-sort-column") == columnName) {
				if (table.getAttribute("data-sort-order") == "ascending") {
					table.setAttribute("data-sort-order", "descending");
				} else {
					table.setAttribute("data-sort-order", "ascending");
				}
			} else {
				table.setAttribute("data-sort-column", columnName);
				table.setAttribute("data-sort-order", "ascending");
			}
			wdw_cardbookConfiguration.sortTable(table.id);
		}
		aEvent.stopImmediatePropagation();
	},

	keyDownTree: function (aEvent) {
		let row = aEvent.target.closest("tr");
		let tmpArray = row.id.split("_");
		let x = tmpArray[tmpArray.length -1];
		if (aEvent.keyCode == '38') {
			// up arrow
			if (row.previousElementSibling) {
				let previousRow = row.previousElementSibling;
				let tbody = aEvent.target.closest("tbody");
				for (let child of tbody.childNodes) {
					child.removeAttribute("rowSelected");
				}
				previousRow.setAttribute("rowSelected", "true");
				previousRow.focus();
			}
		} else if (aEvent.keyCode == '40') {
			// down arrow
			if (row.nextElementSibling) {
				let nextRow = row.nextElementSibling;
				let tbody = aEvent.target.closest("tbody");
				for (let child of tbody.childNodes) {
					child.removeAttribute("rowSelected");
				}
				nextRow.setAttribute("rowSelected", "true");
				nextRow.focus();
			}
		} else if (aEvent.key == ' ') {
			// space
			let table = aEvent.target.closest("table");
			let data = wdw_cardbookConfiguration.getTableData(table.id);
			let y = 0;
			let checkbox = row.querySelector("input[type='checkbox']");
			checkbox.checked = !data[x][y];
			checkbox.dispatchEvent(new Event('click'));
		}
	},
	
	enableOrDisableCheckbox: function (aEvent) {
		// works only for first column checkboxes
		let tmpArray = aEvent.target.id.split("_");
		if (tmpArray[tmpArray.length -1] == "checkbox") {
			let x = tmpArray[tmpArray.length -3];
			let y = tmpArray[tmpArray.length -2];
			let table = aEvent.target.closest("table");
			let data = wdw_cardbookConfiguration.getTableData(table.id);
			data[x][y] = !data[x][y];
			let pref = wdw_cardbookConfiguration.getTablePreference(table.id);
			if (table.id == "addressbooksTable") {
				wdw_cardbookConfiguration.changeAddressbooksMainCheckbox();
			} else if (table.id == "discoveryAccountsTable") {
				wdw_cardbookConfiguration.changeDiscoveryMainCheckbox();
			} else if (table.id == "fieldsTreeTable") {
				wdw_cardbookConfiguration.changeFieldsMainCheckbox();
			} else if (table.id == "calendarsTable") {
				wdw_cardbookConfiguration.changeCalendarsMainCheckbox();
			}
			wdw_cardbookConfiguration.preferenceChanged(pref);
		}
	},
	
	getTableCurrentIndex: function (aTableName) {
		let selectedList = document.getElementById(aTableName).querySelectorAll("tr[rowSelected='true']");
		if (selectedList.length) {
			let tmpArray = selectedList[0].id.split("_");
			return tmpArray[tmpArray.length - 1];
		}
	},

	getTableMapArray: function (aColumnName) {
		if (aColumnName == "accountsRestrictionsMailName") {
			return 2;
		} else if (aColumnName == "accountsRestrictionsABName") {
			return 4;
		} else if (aColumnName == "accountsRestrictionsCatName") {
			return 6;
		} else if (aColumnName == "accountsRestrictionsIncludeName") {
			return 8;
		} else if (aColumnName == "typesLabel") {
			return 0;
		} else if (aColumnName == "emailsCollectionMailName") {
			return 2;
		} else if (aColumnName == "emailsCollectionABName") {
			return 4;
		} else if (aColumnName == "emailsCollectionCatName") {
			return 6;
		} else if (aColumnName == "accountsVCardsMailName") {
			return 2;
		} else if (aColumnName == "accountsVCardsFn") {
			return 4;
		} else if (aColumnName == "accountsVCardsFileName") {
			return 7;
		} else if (aColumnName == "IMPPCodeHeader") {
			return 0;
		} else if (aColumnName == "IMPPLabelHeader") {
			return 1;
		} else if (aColumnName == "IMPPProtocolHeader") {
			return 2;
		} else if (aColumnName == "customFieldCodeHeader") {
			return 0;
		} else if (aColumnName == "customFieldLabelHeader") {
			return 1;
		} else if (aColumnName == "customFieldRankHeader") {
			return 2;
		} else if (aColumnName == "orgLabel") {
			return 0;
		} else if (aColumnName == "orgRank") {
			return 1;
		} else if (aColumnName == "fieldsName") {
			return 1;
		} else if (aColumnName == "discoveryAccountsName") {
			return 1;
		} else if (aColumnName == "addressbooksName") {
			return 1;
		} else if (aColumnName == "calendarsName") {
			return 1;
		}
	},

	getTableMapType: function (aColumnName) {
		if (aColumnName == "orgRank") {
			return "number";
		} else if (aColumnName == "customFieldRankHeader") {
			return "number";
		} else {
			return "string";
		}
	},

	getTableData: function (aTableName) {
		if (aTableName == "accountsVCardsTable") {
			return wdw_cardbookConfiguration.allVCards;
		} else if (aTableName == "accountsRestrictionsTable") {
			return wdw_cardbookConfiguration.allRestrictions;
		} else if (aTableName == "typesTable") {
			let ABType = document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value;
			let type = document.getElementById('typesCategoryRadiogroup').selectedItem.value;
			if (wdw_cardbookConfiguration.allTypes[ABType] && wdw_cardbookConfiguration.allTypes[ABType][type]) {
				return wdw_cardbookConfiguration.allTypes[ABType][type];
			} else {
				return;
			}
		} else if (aTableName == "emailsCollectionTable") {
			return wdw_cardbookConfiguration.allEmailsCollections;
		} else if (aTableName == "IMPPsTable") {
			return wdw_cardbookConfiguration.allIMPPs[document.getElementById('imppsCategoryRadiogroup').selectedItem.value];
		} else if (aTableName == "customFieldsTable") {
			return wdw_cardbookConfiguration.allCustomFields[document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value];
		} else if (aTableName == "orgTreeTable") {
			return wdw_cardbookConfiguration.allOrg;
		} else if (aTableName == "fieldsTreeTable") {
			return wdw_cardbookConfiguration.allFields;
		} else if (aTableName == "discoveryAccountsTable") {
			return wdw_cardbookConfiguration.allDiscoveryAccounts;
		} else if (aTableName == "addressbooksTable") {
			return wdw_cardbookConfiguration.allAddressbooks;
		} else if (aTableName == "calendarsTable") {
			return wdw_cardbookConfiguration.allCalendars;
		}
	},

	getTablePreference: function (aTableName) {
		if (aTableName == "accountsVCardsTable") {
			return "attachedVCard";
		} else if (aTableName == "accountsRestrictionsTable") {
			return "accountsRestrictions";
		} else if (aTableName == "typesTable") {
			return "customTypes";
		} else if (aTableName == "emailsCollectionTable") {
			return "emailsCollection";
		} else if (aTableName == "IMPPsTable") {
			return "impps";
		} else if (aTableName == "customFieldsTable") {
			return "customFields";
		} else if (aTableName == "orgTreeTable") {
			return "orgStructure";
		} else if (aTableName == "fieldsTreeTable") {
			return "fields";
		} else if (aTableName == "discoveryAccountsTable") {
			return "discoveryAccounts";
		} else if (aTableName == "addressbooksTable") {
			return "addressbooks";
		} else if (aTableName == "calendarsTable") {
			return "calendars";
		}
	},

	loadTitle: function () {
		document.title = cardbookRepository.extension.localeData.localizeMessage("cardbookPrefTitle") + " (" + cardbookRepository.addonVersion + ")";
	},

	autocompleteRestrictSearch: function () {
		document.getElementById('chooseAutocompleteRestrictSearchFieldsButton').disabled=!document.getElementById('autocompleteRestrictSearchCheckBox').checked;
		document.getElementById('resetAutocompleteRestrictSearchFieldsButton').disabled=!document.getElementById('autocompleteRestrictSearchCheckBox').checked;
	},

	translateFields: function (aFieldList) {
		let fields = aFieldList.split('|');
		let result = [];
		for (let field of fields) {
			result.push(cardbookRepository.cardbookUtils.getTranslatedField(field));
		}
		return cardbookRepository.cardbookUtils.cleanArray(result).join('|');
	},

	loadAutocompleteRestrictSearchFields: function () {
		wdw_cardbookConfiguration.autocompleteRestrictSearchFields = cardbookRepository.autocompleteRestrictSearchFields.join('|');
		if (wdw_cardbookConfiguration.autocompleteRestrictSearchFields == "") {
			wdw_cardbookConfiguration.autocompleteRestrictSearchFields = cardbookRepository.defaultAutocompleteRestrictSearchFields;
		}
		document.getElementById('autocompleteRestrictSearchFieldsTextBox').value = wdw_cardbookConfiguration.translateFields(wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
	},

	chooseAutocompleteRestrictSearchFieldsButton: function () {
		let template = cardbookRepository.cardbookUtils.getTemplate(wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
		let myArgs = {template: template, mode: "choice", includePref: false, lineHeader: true, columnSeparator: "",
						file: null, selectedCards: null, actionId: null, headers: "",
						action: "", params: {}, actionCallback: wdw_cardbookConfiguration.chooseAutocompleteRestrictSearchFieldsButtonNext};
		let myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/csvTranslator/wdw_csvTranslator.xhtml", "", cardbookRepository.windowParams, myArgs);
	},

	chooseAutocompleteRestrictSearchFieldsButtonNext: async function (aFile, aListofCard, aActionId, aColumns, aColumnSeparator, aIncludePref, aAction, aHeaders, aLineHeader, aParams) {
		if (aAction == "SAVE") {
			let result = [];
			for (let column of  aColumns) {
				result.push(column[0]);
			}
			wdw_cardbookConfiguration.autocompleteRestrictSearchFields = result.join('|');
			document.getElementById('autocompleteRestrictSearchFieldsTextBox').value = wdw_cardbookConfiguration.translateFields(wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
			wdw_cardbookConfiguration.preferenceChanged('autocompleteRestrictSearch');
		}
	},

	resetAutocompleteRestrictSearchFieldsButton: function () {
		wdw_cardbookConfiguration.autocompleteRestrictSearchFields = cardbookRepository.defaultAutocompleteRestrictSearchFields;
		document.getElementById('autocompleteRestrictSearchFieldsTextBox').value = wdw_cardbookConfiguration.translateFields(wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
		wdw_cardbookConfiguration.preferenceChanged('autocompleteRestrictSearch');
	},

	validateAutocompleteRestrictSearchFields: function () {
		if (document.getElementById('autocompletionCheckBox').checked && document.getElementById('autocompleteRestrictSearchCheckBox').checked) {
			if ((wdw_cardbookConfiguration.autocompleteRestrictSearchFields != cardbookRepository.autocompleteRestrictSearchFields.join('|')) ||
				(document.getElementById('autocompleteRestrictSearchCheckBox').checked != cardbookRepository.autocompleteRestrictSearch)) {
				cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.autocompleteRestrictSearchFields", wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
				cardbookRepository.autocompleteRestrictSearch = document.getElementById('autocompleteRestrictSearchCheckBox').checked;
				cardbookRepository.autocompleteRestrictSearchFields = wdw_cardbookConfiguration.autocompleteRestrictSearchFields.split('|');
				cardbookRepository.cardbookCardShortSearch = {};
				for (let j in cardbookRepository.cardbookCards) {
					let myCard = cardbookRepository.cardbookCards[j];
					cardbookRepository.addCardToShortSearch(myCard);
				}
			} else {
				cardbookRepository.autocompleteRestrictSearch = document.getElementById('autocompleteRestrictSearchCheckBox').checked;
			}
		} else {
			cardbookRepository.autocompleteRestrictSearch = document.getElementById('autocompleteRestrictSearchCheckBox').checked;
			cardbookRepository.cardbookCardShortSearch = {};
		}
		cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.autocompleteRestrictSearch", document.getElementById('autocompleteRestrictSearchCheckBox').checked);
		wdw_cardbookConfiguration.autocompleteRestrictSearch();
	},

	loadPrefEmailPref: function () {
		wdw_cardbookConfiguration.preferEmailPrefOld = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.preferEmailPref");
	},

	validatePrefEmailPref: function () {
		let newCheck = document.getElementById('preferEmailPrefCheckBox').checked;
		if (newCheck !== wdw_cardbookConfiguration.preferEmailPrefOld) {
			cardbookRepository.preferEmailPref = newCheck;
			for (let j in cardbookRepository.cardbookCards) {
				let card = cardbookRepository.cardbookCards[j];
				if (!card.isAList) {
					let newEmails = cardbookRepository.cardbookUtils.getPrefAddressFromCard(card, "email", newCheck);
					if (newEmails.join(',') != card.emails.join(',')) {
						let tmpCard = new cardbookCardParser();
						cardbookRepository.cardbookUtils.cloneCard(card, tmpCard);
						cardbookRepository.saveCardFromMove(card, tmpCard, null, false);
					}
				}
			}
			cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.preferEmailPref", newCheck);
		}
	},

	loadEncryptionPref: function () {
		wdw_cardbookConfiguration.encryptionPrefOld = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.localDataEncryption");
	},

	validateEncryptionPref: async function () {
		let newCheck = document.getElementById('localDataEncryptionEnabledCheckBox').checked;
		if (newCheck !== wdw_cardbookConfiguration.encryptionPrefOld) {
			cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.localDataEncryption", newCheck);
			if (newCheck) {
				cardbookIndexedDB.encryptDBs();
			} else {
				cardbookIndexedDB.decryptDBs();
			}
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.localDataEncryption.validatedVersion", String(cardbookEncryptor.VERSION));
		}
	},

	loadAdrFormula: async function () {
		let adrFormula = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.adrFormula");
		document.getElementById('adrFormulaTextBox').value = adrFormula.replace(/\n/g, "\\n").trim();
		document.getElementById('formulaMemberLabel1').value = "{{1}} : " + cardbookRepository.extension.localeData.localizeMessage("postOfficeLabel");
		document.getElementById('formulaMemberLabel2').value = "{{2}} : " + cardbookRepository.extension.localeData.localizeMessage("extendedAddrLabel");
		document.getElementById('formulaMemberLabel3').value = "{{3}} : " + cardbookRepository.extension.localeData.localizeMessage("streetLabel");
		document.getElementById('formulaMemberLabel4').value = "{{4}} : " + cardbookRepository.extension.localeData.localizeMessage("localityLabel");
		document.getElementById('formulaMemberLabel5').value = "{{5}} : " + cardbookRepository.extension.localeData.localizeMessage("regionLabel");
		document.getElementById('formulaMemberLabel6').value = "{{6}} : " + cardbookRepository.extension.localeData.localizeMessage("postalCodeLabel");
		document.getElementById('formulaMemberLabel7').value = "{{7}} : " + cardbookRepository.extension.localeData.localizeMessage("countryLabel");
		document.getElementById('formulaSampleTextBox1').value = cardbookRepository.extension.localeData.localizeMessage("postOfficeLabel");
		document.getElementById('formulaSampleTextBox2').value = cardbookRepository.extension.localeData.localizeMessage("extendedAddrLabel");
		document.getElementById('formulaSampleTextBox3').value = cardbookRepository.extension.localeData.localizeMessage("streetLabel");
		document.getElementById('formulaSampleTextBox4').value = cardbookRepository.extension.localeData.localizeMessage("localityLabel");
		document.getElementById('formulaSampleTextBox5').value = cardbookRepository.extension.localeData.localizeMessage("regionLabel");
		document.getElementById('formulaSampleTextBox6').value = cardbookRepository.extension.localeData.localizeMessage("postalCodeLabel");
		document.getElementById('formulaSampleTextBox7').value = cardbookRepository.extension.localeData.localizeMessage("countryLabel");
		await wdw_cardbookConfiguration.changeAdrPreview();
	},

	resetAdrFormula: function () {
		document.getElementById('adrFormulaTextBox').value = cardbookRepository.defaultAdrFormula.replace(/\n/g, "\\n").trim();
		wdw_cardbookConfiguration.preferenceChanged('adrFormula');
	},

	changeAdrPreview: async function () {
		let addressFormula = document.getElementById('adrFormulaTextBox').value.replace(/\\n/g, "\n").trim();
		let address = [ document.getElementById('formulaSampleTextBox1').value,
						document.getElementById('formulaSampleTextBox2').value,
						document.getElementById('formulaSampleTextBox3').value,
						document.getElementById('formulaSampleTextBox4').value,
						document.getElementById('formulaSampleTextBox5').value,
						document.getElementById('formulaSampleTextBox6').value,
						document.getElementById('formulaSampleTextBox7').value ]
		document.getElementById('adrPreviewTextBox').value = await cardbookRepository.cardbookUtils.formatAddress(address, addressFormula);
	},

	validateAdrFormula: async function () {
		await wdw_cardbookConfiguration.changeAdrPreview();
		if (document.getElementById('adrFormulaTextBox').value == "") {
			wdw_cardbookConfiguration.resetAdrFormula();
		}
		// to be sure the pref is saved (resetting its value does not save the preference)
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.adrFormula", document.getElementById('adrFormulaTextBox').value.replace(/\\n/g, "\n").trim());
	},

	loadEventEntryTitle: function () {
		let eventEntryTitle = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.eventEntryTitle");
		if (eventEntryTitle == "") {
			document.getElementById('calendarEntryTitleTextBox').value=cardbookRepository.extension.localeData.localizeMessage("eventEntryTitleMessage");
		}
		document.getElementById('eventEntryTimeDesc1').value = "%1$S : " + cardbookRepository.extension.localeData.localizeMessage("fnLabel");
		document.getElementById('eventEntryTimeDesc2').value = "%2$S : " + cardbookRepository.extension.localeData.localizeMessage("ageLabel");
		document.getElementById('eventEntryTimeDesc3').value = "%3$S : " + cardbookRepository.extension.localeData.localizeMessage("yearLabel");
		document.getElementById('eventEntryTimeDesc4').value = "%4$S : " + cardbookRepository.extension.localeData.localizeMessage("nameLabel");
		let type = cardbookRepository.extension.localeData.localizeMessage("localPage.type.label");
		let fieldType = [];
		for (let field of cardbookRepository.dateFields) {
			fieldType.push(cardbookRepository.extension.localeData.localizeMessage(`${field}Label`));
		}
		fieldType.push(cardbookRepository.extension.localeData.localizeMessage("eventInNoteEventPrefix"));
		detail = fieldType.join(" - ");
		document.getElementById('eventEntryTimeDesc5').value = "%5$S : " + `${type} [ ${detail} ]`;
	},

	showTab: function () {
		if (window.arguments) {
			if (window.arguments[0].showTab) {
				wdw_cardbookConfiguration.showPane(window.arguments[0].showTab);
			}
		}
	},

	cardbookAutoComplete: function () {
		document.getElementById('autocompleteSortByPopularityCheckBox').disabled=!document.getElementById('autocompletionCheckBox').checked;
		document.getElementById('autocompleteProposeConcatEmailsCheckBox').disabled=!document.getElementById('autocompletionCheckBox').checked;
		document.getElementById('autocompleteShowAddressbookCheckBox').disabled=!document.getElementById('autocompletionCheckBox').checked;
		document.getElementById('autocompleteShowEmailTypeCheckBox').disabled=!document.getElementById('autocompletionCheckBox').checked;
		document.getElementById('autocompleteShowPopularityCheckBox').disabled=!document.getElementById('autocompletionCheckBox').checked;
		document.getElementById('autocompleteWithColorCheckBox').disabled=!document.getElementById('autocompletionCheckBox').checked;
		document.getElementById('autocompleteRestrictSearchCheckBox').disabled=!document.getElementById('autocompletionCheckBox').checked;
		if (document.getElementById('autocompletionCheckBox').checked && document.getElementById('autocompleteRestrictSearchCheckBox').checked) {
			document.getElementById('chooseAutocompleteRestrictSearchFieldsButton').disabled=false;
			document.getElementById('resetAutocompleteRestrictSearchFieldsButton').disabled=false;
		} else {
			document.getElementById('chooseAutocompleteRestrictSearchFieldsButton').disabled=true;
			document.getElementById('resetAutocompleteRestrictSearchFieldsButton').disabled=true;
		}
	},

	validateAutoComplete: function () {
		wdw_cardbookConfiguration.cardbookAutoComplete();
		cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.autocompletion", document.getElementById('autocompletionCheckBox').checked);
	},

	remindViaPopup: function () {
		if (document.getElementById('showPopupOnStartupCheckBox').checked || document.getElementById('showPeriodicPopupCheckBox').checked) {
			document.getElementById('showPopupEvenIfNoBirthdayCheckBox').disabled=false;
		} else {
			document.getElementById('showPopupEvenIfNoBirthdayCheckBox').disabled=true;
		}
		document.getElementById('periodicPopupTimeTextBox').disabled=!document.getElementById('showPeriodicPopupCheckBox').checked;
		document.getElementById('periodicPopupTimeLabel').disabled=!document.getElementById('showPeriodicPopupCheckBox').checked;
	},

	validateShowPopupOnStartup: function () {
		wdw_cardbookConfiguration.remindViaPopup();
		cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.showPopupOnStartup", document.getElementById('showPopupOnStartupCheckBox').checked);
	},

	validateShowPeriodicPopup: function () {
		wdw_cardbookConfiguration.remindViaPopup();
		cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.showPeriodicPopup", document.getElementById('showPeriodicPopupCheckBox').checked);
	},

	wholeDay: function () {
		document.getElementById('calendarEntryTimeTextBox').disabled=document.getElementById('calendarEntryWholeDayCheckBox').checked;
		document.getElementById('calendarEntryTimeLabel').disabled=document.getElementById('calendarEntryWholeDayCheckBox').checked;
	},

	validateEventEntryWholeDay: function () {
		wdw_cardbookConfiguration.wholeDay();
		cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.eventEntryWholeDay", document.getElementById('calendarEntryWholeDayCheckBox').checked);
	},

	LightningInstallation: function () {
		if (document.getElementById('calendarEntryWholeDayCheckBox').checked) {
			document.getElementById('calendarEntryTimeTextBox').disabled=true;
			document.getElementById('calendarEntryTimeLabel').disabled=true;
		} else {
			document.getElementById('calendarEntryTimeTextBox').disabled=false;
			document.getElementById('calendarEntryTimeLabel').disabled=false;
		}
	},

	loadFields: function () {
		let tmpArray = [];
		tmpArray = cardbookRepository.cardbookUtils.getEditionFields();
		wdw_cardbookConfiguration.allFields = [];
		let fields = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.fieldsNameList");
		let pref = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(fields).split(";"));
		for (let field of tmpArray) {
			if ( (pref.includes(field[1])) || (pref == "allFields") ) {
				wdw_cardbookConfiguration.allFields.push([true, field[0], field[1]]);
			} else {
				wdw_cardbookConfiguration.allFields.push([false, field[0], field[1]]);
			}
		}
		wdw_cardbookConfiguration.changeFieldsMainCheckbox();
	},
	
	displayFields: function () {
		cardbookElementTools.deleteRows("fieldsTreeTable");
		let headers = [];
		let data = wdw_cardbookConfiguration.allFields.map(x => [ x[0], x[1] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		cardbookElementTools.addTreeTable("fieldsTreeTable", headers, data, dataParameters);
		wdw_cardbookConfiguration.changeFieldsMainCheckbox();
	},
	
	changeFieldsMainCheckbox: function () {
		let totalChecked = 0;
		for (let field of wdw_cardbookConfiguration.allFields) {
			if (field[0]) {
				totalChecked++;
			}
		}
		let checkbox = document.getElementById('fieldsCheckbox');
		if (totalChecked == wdw_cardbookConfiguration.allFields.length && totalChecked != 0) {
			checkbox.checked = true;
		} else {
			checkbox.checked = false;
		}
	},

	changedFieldsMainCheckbox: function () {
		let checkbox = document.getElementById('fieldsCheckbox');
		let myState = false;
		if (checkbox.getAttribute('checked') == "true") {
			myState = true;
		}
		let tmpArray = [];
		for (let field of wdw_cardbookConfiguration.allFields) {
			tmpArray.push([myState, field[1], field[2]]);
		}

		wdw_cardbookConfiguration.allFields = JSON.parse(JSON.stringify(tmpArray));
		wdw_cardbookConfiguration.sortTable("fieldsTreeTable");
		wdw_cardbookConfiguration.preferenceChanged('fields');
	},
	
	validateFields: function () {
		let checkbox = document.getElementById('fieldsCheckbox');
		if (checkbox.getAttribute('checked') == "true") {
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.fieldsNameList", "allFields");
		} else {
			let tmpArray = [];
			for (let field of wdw_cardbookConfiguration.allFields) {
				if (field[0]) {
					tmpArray.push(cardbookRepository.cardbookUtils.escapeStringSemiColon(field[2]));
				}
			}
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.fieldsNameList", cardbookRepository.cardbookUtils.unescapeStringSemiColon(tmpArray.join(";")));
		}
	},

	validateFieldsFromOrgOrCustom: function (aOldField, aNewField) {
		let fields = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.fieldsNameList").split(";");
		if (fields[0] == "allFields") {
			return;
		} else if (aOldField || aNewField) {
			if (aOldField) {
				aOldField = cardbookRepository.cardbookUtils.escapeStringSemiColon(aOldField);
				let i = 0;
				while (i < fields.length) {
					if (fields[i] === aOldField) {
						fields.splice(i, 1);
					} else {
						++i;
					}
				}
			}
			if (aNewField) {
				aNewField = cardbookRepository.cardbookUtils.escapeStringSemiColon(aNewField);
				fields.push(aNewField);
			}
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.fieldsNameList", fields.join(";"));
			// need to reload the edition fields
			wdw_cardbookConfiguration.loadFields();
			wdw_cardbookConfiguration.sortTable("fieldsTreeTable");
		}
	},

	loadDiscoveryAccounts: function () {
		let pref = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.discoveryAccountsNameList");
		let urls = cardbookRepository.cardbookSynchronization.getAllURLsToDiscover();
		wdw_cardbookConfiguration.allDiscoveryAccounts = [];
		for (let url of urls) {
			if (pref.includes(url[1])) {
				wdw_cardbookConfiguration.allDiscoveryAccounts.push([true, url[0], url[1]]);
			} else {
				wdw_cardbookConfiguration.allDiscoveryAccounts.push([false, url[0], url[1]]);
			}
		}
	},
	
	displayDiscoveryAccounts: function () {
		cardbookElementTools.deleteRows("discoveryAccountsTable");
		let headers = [];
		let data = wdw_cardbookConfiguration.allDiscoveryAccounts.map(x => [ x[0], x[1] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		cardbookElementTools.addTreeTable("discoveryAccountsTable", headers, data, dataParameters);
		wdw_cardbookConfiguration.changeDiscoveryMainCheckbox();
	},
	
	changeDiscoveryMainCheckbox: function () {
		let totalChecked = 0;
		for (let discoveryAccount of wdw_cardbookConfiguration.allDiscoveryAccounts) {
			if (discoveryAccount[0]) {
				totalChecked++;
			}
		}
		let checkbox = document.getElementById('discoveryAccountsCheckbox');
		if (totalChecked == wdw_cardbookConfiguration.allDiscoveryAccounts.length && totalChecked != 0) {
			checkbox.checked = true;
		} else {
			checkbox.checked = false;
		}
	},

	changedDiscoveryMainCheckbox: function () {
		let checkbox = document.getElementById('discoveryAccountsCheckbox');
		let state = false;
		if (checkbox.getAttribute('checked') == "true") {
			state = true;
		}
		let tmpArray = [];
		for (let discoveryAccount of wdw_cardbookConfiguration.allDiscoveryAccounts) {
			tmpArray.push([state, discoveryAccount[1], discoveryAccount[2]]);
		}
		wdw_cardbookConfiguration.allDiscoveryAccounts = JSON.parse(JSON.stringify(tmpArray));
		wdw_cardbookConfiguration.sortTable("discoveryAccountsTable");
		wdw_cardbookConfiguration.preferenceChanged('discoveryAccounts');
	},
	
	validateDiscoveryAccounts: function () {
		let tmpArray = [];
		for (let discoveryAccount of wdw_cardbookConfiguration.allDiscoveryAccounts) {
			if (discoveryAccount[0]) {
				tmpArray.push(discoveryAccount[2]);
			}
		}
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.discoveryAccountsNameList", tmpArray.join(','));
	},

	loadAddressbooks: function () {
		let pref = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.addressBooksNameList");
		let tmpArray = [];
		let accounts = cardbookRepository.cardbookPreferences.getAllPrefIds();
		for (let dirPrefId of accounts) {
			if (cardbookRepository.cardbookPreferences.getBoolPref(cardbookRepository.cardbookPreferences.prefCardBookData + dirPrefId + "." + "enabled", true) &&
				cardbookRepository.cardbookPreferences.getType(dirPrefId) != "SEARCH") {
				tmpArray.push([cardbookRepository.cardbookPreferences.getName(dirPrefId), dirPrefId]);
			}
		}
		cardbookRepository.cardbookUtils.sortMultipleArrayByString(tmpArray,0,1);
		wdw_cardbookConfiguration.allAddressbooks = [];
		for (let account of tmpArray) {
			if ( (pref.includes(account[1])) || (pref == "allAddressBooks") ) {
				wdw_cardbookConfiguration.allAddressbooks.push([true, account[0], account[1]]);
			} else {
				wdw_cardbookConfiguration.allAddressbooks.push([false, account[0], account[1]]);
			}
		}
	},
	
	displayAddressbooks: function () {
		cardbookElementTools.deleteRows("addressbooksTable");
		let headers = [];
		let data = wdw_cardbookConfiguration.allAddressbooks.map(x => [ x[0], x[1] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		cardbookElementTools.addTreeTable("addressbooksTable", headers, data, dataParameters);
		wdw_cardbookConfiguration.changeAddressbooksMainCheckbox();
	},
	
	changeAddressbooksMainCheckbox: function () {
		let totalChecked = 0;
		for (let addressbook of wdw_cardbookConfiguration.allAddressbooks) {
			if (addressbook[0]) {
				totalChecked++;
			}
		}
		let checkbox = document.getElementById('addressbooksCheckbox');
		if (totalChecked == wdw_cardbookConfiguration.allAddressbooks.length && totalChecked != 0) {
			checkbox.checked = true;
		} else {
			checkbox.checked = false;
		}
	},

	changedAddressbooksMainCheckbox: function () {
		let checkbox = document.getElementById('addressbooksCheckbox');
		let state = false;
		if (checkbox.getAttribute('checked') == "true") {
			state = true;
		}
		let tmpArray = [];
		for (let addressbook of wdw_cardbookConfiguration.allAddressbooks) {
			tmpArray.push([state, addressbook[1], addressbook[2]]);
		}
		wdw_cardbookConfiguration.allAddressbooks = JSON.parse(JSON.stringify(tmpArray));
		wdw_cardbookConfiguration.sortTable("addressbooksTable");
		wdw_cardbookConfiguration.preferenceChanged('addressbooks');
	},
	
	validateAddressbooks: function () {
		let checkbox = document.getElementById('addressbooksCheckbox');
		if (checkbox.getAttribute('checked') == "true") {
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.addressBooksNameList", "allAddressBooks");
		} else {
			let tmpArray = [];
			for (let addressbook of wdw_cardbookConfiguration.allAddressbooks) {
				if (addressbook[0]) {
					tmpArray.push(addressbook[2]);
				}
			}
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.addressBooksNameList", tmpArray.join(','));
		}
	},
	
	loadCalendars: function () {
		let pref = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.calendarsNameList");
		let tmpArray = [];
		let calendarManager = Components.classes["@mozilla.org/calendar/manager;1"].getService(Components.interfaces.calICalendarManager);
		let calendars = calendarManager.getCalendars({});
		for (let prop in calendars) {
			let cal = calendars[prop];
			tmpArray.push([cal.name, cal.id]);
		}
		cardbookRepository.cardbookUtils.sortMultipleArrayByString(tmpArray,0,1);
		wdw_cardbookConfiguration.allCalendars = [];
		let totalChecked = 0;
		for (let cal of tmpArray) {
			if ( (pref.includes(cal[1])) || (pref == "allCalendars") ) {
				wdw_cardbookConfiguration.allCalendars.push([true, cal[0], cal[1]]);
				totalChecked++;
			} else {
				wdw_cardbookConfiguration.allCalendars.push([false, cal[0], cal[1]]);
			}
		}
		// no way to detect that a calendar was deleted
		if (totalChecked != pref.split(',').length) {
			wdw_cardbookConfiguration.preferenceChanged('calendars');
		}
	},
	
	displayCalendars: function () {
		cardbookElementTools.deleteRows("calendarsTable");
		let headers = [];
		let data = wdw_cardbookConfiguration.allCalendars.map(x => [ x[0], x[1] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		cardbookElementTools.addTreeTable("calendarsTable", headers, data, dataParameters);
		wdw_cardbookConfiguration.LightningInstallation();
		wdw_cardbookConfiguration.changeCalendarsMainCheckbox();
	},
	
	changeCalendarsMainCheckbox: function () {
		let totalChecked = 0;
		for (let calendar of wdw_cardbookConfiguration.allCalendars) {
			if (calendar[0]) {
				totalChecked++;
			}
		}
		let checkbox = document.getElementById('calendarsCheckbox');
		if (totalChecked == wdw_cardbookConfiguration.allCalendars.length && totalChecked != 0) {
			checkbox.checked = true;
		} else {
			checkbox.checked = false;
		}
	},

	changedCalendarsMainCheckbox: function () {
		let checkbox = document.getElementById('calendarsCheckbox');
		let state = false;
		if (checkbox.getAttribute('checked') == "true") {
			state = true;
		}
		let tmpArray = [];
		for (let calendar of wdw_cardbookConfiguration.allCalendars) {
			tmpArray.push([state, calendar[1], calendar[2]]);
		}
		wdw_cardbookConfiguration.allCalendars = JSON.parse(JSON.stringify(tmpArray));
		wdw_cardbookConfiguration.sortTable("calendarsTable");
		wdw_cardbookConfiguration.preferenceChanged('calendars');
	},
	
	validateCalendars: function () {
		let tmpArray = [];
		for (let calendar of wdw_cardbookConfiguration.allCalendars) {
			if (calendar[0]) {
				tmpArray.push(calendar[2]);
			}
		}
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.calendarsNameList", tmpArray.join(','));
	},

	resetCalendarEntryTitle: function () {
		document.getElementById('calendarEntryTitleTextBox').value = cardbookRepository.extension.localeData.localizeMessage("eventEntryTitleMessage");
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.eventEntryTitle", cardbookRepository.extension.localeData.localizeMessage("eventEntryTitleMessage"));
	},

	validateEventEntryTitle: function () {
		if (document.getElementById('calendarEntryTitleTextBox').value == "") {
			wdw_cardbookConfiguration.resetCalendarEntryTitle();
		}
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.eventEntryTitle", document.getElementById('calendarEntryTitleTextBox').value);
	},

	getEmailAccountName: function(aEmailAccountId) {
		if (aEmailAccountId == "allMailAccounts") {
			return cardbookRepository.extension.localeData.localizeMessage(aEmailAccountId);
		}
		for (let account of MailServices.accounts.accounts) {
			for (let identity of account.identities) {
				if (account.incomingServer.type == "pop3" || account.incomingServer.type == "imap") {
					if (aEmailAccountId == identity.key) {
						return identity.email;
					}
				}
			}
		}
		return "";			
	},

	getABName: function(dirPrefId) {
		if (!cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive")) {
			for (let addrbook of MailServices.ab.directories) {
				if (addrbook.dirPrefId == dirPrefId) {
					return addrbook.dirName;
				}
			}
		}
		return cardbookRepository.cardbookUtils.getPrefNameFromPrefId(dirPrefId);
	},

	selectVCard: function() {
		let btnEdit = document.getElementById("renameVCardLabel");
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("accountsVCardsTable");
		if (wdw_cardbookConfiguration.allVCards.length && currentIndex) {
			btnEdit.disabled = false;
		} else {
			btnEdit.disabled = true;
		}
		document.getElementById("deleteVCardLabel").disabled = btnEdit.disabled;
	},

	loadVCards: function () {
		let results = [];
		results = cardbookRepository.cardbookPreferences.getAllVCards();
		let count = 0;
		for (let result of results) {
			let emailAccountName = wdw_cardbookConfiguration.getEmailAccountName(result[1]);
			if (emailAccountName != "") {
				let index = count++;
				let fn =  result[3];
				if (cardbookRepository.cardbookCards[result[2]+"::"+result[3]]) {
					fn = cardbookRepository.cardbookCards[result[2]+"::"+result[3]].fn;
				}
				wdw_cardbookConfiguration.allVCards.push([(result[0] == "true"), index.toString(), emailAccountName, result[1], fn, result[2], result[3], result[4]]);
			}
		}
	},
	
	displayVCards: function () {
		cardbookElementTools.deleteRows("accountsVCardsTable");
		let headers = [ "accountsVCardsEnabled", "accountsVCardsMailName", "accountsVCardsFn", "accountsVCardsFileName" ];
		let data = wdw_cardbookConfiguration.allVCards.map(x => [ x[0], x[2], x[4], x[7] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		let rowParameters = {};
		let sortFunction = wdw_cardbookConfiguration.clickToSort;
		cardbookElementTools.addTreeTable("accountsVCardsTable", headers, data, dataParameters, rowParameters, sortFunction);
		wdw_cardbookConfiguration.selectVCard();
	},
	
	addVCard: function () {
		let myArgs = {emailAccountName: "", emailAccountId: "", fn: "", addressBookId: "", contactId: "", fileName: "",  typeAction: ""};
		let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
		mail3PaneWindow.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddVcards.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
		if (myArgs.typeAction == "SAVE") {
			wdw_cardbookConfiguration.allVCards.push([true, wdw_cardbookConfiguration.allVCards.length.toString(), myArgs.emailAccountName, myArgs.emailAccountId, myArgs.fn, myArgs.addressBookId, myArgs.contactId, myArgs.fileName]);
			wdw_cardbookConfiguration.sortTable("accountsVCardsTable");
			wdw_cardbookConfiguration.preferenceChanged('attachedVCard');
		}
	},

	renameVCard: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("accountsVCardsTable");
		if (currentIndex) {
			let enabled = wdw_cardbookConfiguration.allVCards[currentIndex][0];
			let id = wdw_cardbookConfiguration.allVCards[currentIndex][1];
			let mailName = wdw_cardbookConfiguration.allVCards[currentIndex][2];
			let mailId = wdw_cardbookConfiguration.allVCards[currentIndex][3];
			let fn = wdw_cardbookConfiguration.allVCards[currentIndex][4];
			let ABDirPrefId = wdw_cardbookConfiguration.allVCards[currentIndex][5];
			let contactId = wdw_cardbookConfiguration.allVCards[currentIndex][6];
			let filename = wdw_cardbookConfiguration.allVCards[currentIndex][7];
			let myArgs = {emailAccountName: mailName, emailAccountId: mailId, fn: fn, addressBookId: ABDirPrefId, contactId: contactId, fileName: filename, typeAction: ""};
			let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
			mail3PaneWindow.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddVcards.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE") {
				let result = [];
				for (let vCard of wdw_cardbookConfiguration.allVCards) {
					if (id === vCard[1]) {
						result.push([enabled, id, myArgs.emailAccountName, myArgs.emailAccountId, myArgs.fn, myArgs.addressBookId, myArgs.contactId, myArgs.fileName]);
					} else {
						result.push(vCard);
					}
				}
				wdw_cardbookConfiguration.allVCards = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTable("accountsVCardsTable");
				wdw_cardbookConfiguration.preferenceChanged('attachedVCard');
			}
		}
	},
	
	deleteVCard: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("accountsVCardsTable");
		if (currentIndex) {
			let id = wdw_cardbookConfiguration.allVCards[currentIndex][1];
			let result = [];
			for (let vCard of wdw_cardbookConfiguration.allVCards) {
				if (id !== vCard[1]) {
					result.push(vCard);
				}
			}
			wdw_cardbookConfiguration.allVCards = JSON.parse(JSON.stringify(result));
			wdw_cardbookConfiguration.sortTable("accountsVCardsTable");
			wdw_cardbookConfiguration.preferenceChanged('attachedVCard');
		}
	},
	
	validateVCards: function () {
		cardbookRepository.cardbookPreferences.delVCards();
		for (let i = 0; i < wdw_cardbookConfiguration.allVCards.length; i++) {
			cardbookRepository.cardbookPreferences.setVCard(i.toString(), wdw_cardbookConfiguration.allVCards[i][0].toString() + "::" + wdw_cardbookConfiguration.allVCards[i][3]
												+ "::" + wdw_cardbookConfiguration.allVCards[i][5] + "::" + wdw_cardbookConfiguration.allVCards[i][6] + "::" + wdw_cardbookConfiguration.allVCards[i][7]);
		}
	},

	selectRestriction: function() {
		let btnEdit = document.getElementById("renameRestrictionLabel");
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("accountsRestrictionsTable");
		if (wdw_cardbookConfiguration.allRestrictions.length && currentIndex) {
			btnEdit.disabled = false;
		} else {
			btnEdit.disabled = true;
		}
		document.getElementById("deleteRestrictionLabel").disabled = btnEdit.disabled;
	},

	loadRestrictions: function () {
		let results = [];
		results = cardbookRepository.cardbookPreferences.getAllRestrictions();
		let count = 0;
		// no way to detect that a mail account was deleted
		let cleanup = false;
		for (let result of results) {
			let emailAccountName = wdw_cardbookConfiguration.getEmailAccountName(result[2]);
			if (emailAccountName != "") {
				let ABName = wdw_cardbookConfiguration.getABName(result[3]);
				if (ABName != "") {
					let index = count++;
					let categoryId = "";
					let categoryName = "";
					if (result[4]) {
						categoryId = result[3] + "::categories::" + result[4];
						categoryName = result[4];
					}
					wdw_cardbookConfiguration.allRestrictions.push([(result[0] == "true"), index.toString(), emailAccountName, result[2],
																	ABName, result[3], categoryName, categoryId, cardbookRepository.extension.localeData.localizeMessage(result[1] + "Label"), result[1]]);
				} else {
					cleanup = true;
				}
			} else {
				cleanup = true;
			}
		}
		if (cleanup) {
			wdw_cardbookConfiguration.preferenceChanged('accountsRestrictions');
		}
	},
	
	displayRestrictions: function () {
		cardbookElementTools.deleteRows("accountsRestrictionsTable");
		let headers = ["accountsRestrictionsEnabled", "accountsRestrictionsIncludeName", "accountsRestrictionsMailName", "accountsRestrictionsABName", "accountsRestrictionsCatName"];
		let data = wdw_cardbookConfiguration.allRestrictions.map(x => [ x[0], x[8], x[2], x[4], x[6] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		let rowParameters = {};
		let sortFunction = wdw_cardbookConfiguration.clickToSort;
		cardbookElementTools.addTreeTable("accountsRestrictionsTable", headers, data, dataParameters, rowParameters, sortFunction);
		wdw_cardbookConfiguration.selectRestriction();
	},

	addRestriction: function () {
		let myArgs = {emailAccountId: "", emailAccountName: "", addressBookId: "", addressBookName: "", categoryName: "", includeName: "",  includeCode: "", typeAction: "", context: "Restriction"};
		let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
		mail3PaneWindow.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddEmails.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
		if (myArgs.typeAction == "SAVE") {
			wdw_cardbookConfiguration.allRestrictions.push([true, wdw_cardbookConfiguration.allRestrictions.length.toString(), myArgs.emailAccountName, myArgs.emailAccountId,
															myArgs.addressBookName, myArgs.addressBookId, myArgs.categoryName, myArgs.categoryId, myArgs.includeName, myArgs.includeCode]);
			wdw_cardbookConfiguration.sortTable("accountsRestrictionsTable");
			wdw_cardbookConfiguration.preferenceChanged('accountsRestrictions');
		}
	},
	
	renameRestriction: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("accountsRestrictionsTable");
		if (currentIndex) {
			let enabled = wdw_cardbookConfiguration.allRestrictions[currentIndex][0];
			let id = wdw_cardbookConfiguration.allRestrictions[currentIndex][1];
			let mailName = wdw_cardbookConfiguration.allRestrictions[currentIndex][2];
			let mailId = wdw_cardbookConfiguration.allRestrictions[currentIndex][3];
			let ABName = wdw_cardbookConfiguration.allRestrictions[currentIndex][4];
			let ABDirPrefId = wdw_cardbookConfiguration.allRestrictions[currentIndex][5];
			let catName = wdw_cardbookConfiguration.allRestrictions[currentIndex][6];
			let catId = wdw_cardbookConfiguration.allRestrictions[currentIndex][7];
			let includeName = wdw_cardbookConfiguration.allRestrictions[currentIndex][8];
			let includeCode = wdw_cardbookConfiguration.allRestrictions[currentIndex][9];

			let myArgs = {emailAccountId: mailId, emailAccountName: mailName, addressBookId: ABDirPrefId, addressBookName: ABName, categoryId: catId, categoryName: catName,
							includeName: includeName, includeCode: includeCode, typeAction: "", context: "Restriction"};
			let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
			mail3PaneWindow.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddEmails.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE") {
				let result = [];
				for (let restriction of wdw_cardbookConfiguration.allRestrictions) {
					if (id == restriction[1]) {
						result.push([enabled, id, myArgs.emailAccountName, myArgs.emailAccountId, myArgs.addressBookName, myArgs.addressBookId, myArgs.categoryName, myArgs.categoryId,
									myArgs.includeName, myArgs.includeCode]);
					} else {
						result.push(restriction);
					}
				}
				wdw_cardbookConfiguration.allRestrictions = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTable("accountsRestrictionsTable");
				wdw_cardbookConfiguration.preferenceChanged('accountsRestrictions');
			}
		}
	},
	
	deleteRestriction: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("accountsRestrictionsTable");
		if (currentIndex) {
			let id = wdw_cardbookConfiguration.allRestrictions[currentIndex][1];
			let result = [];
			for (let restriction of wdw_cardbookConfiguration.allRestrictions) {
				if (id != restriction[1]) {
					result.push(restriction);
				}
			}
			wdw_cardbookConfiguration.allRestrictions = JSON.parse(JSON.stringify(result));
			wdw_cardbookConfiguration.sortTable("accountsRestrictionsTable");
			wdw_cardbookConfiguration.preferenceChanged('accountsRestrictions');
		}
	},
	
	validateRestrictions: function () {
		cardbookRepository.cardbookPreferences.delRestrictions();
		for (let i = 0; i < wdw_cardbookConfiguration.allRestrictions.length; i++) {
			cardbookRepository.cardbookPreferences.setRestriction(i.toString(), wdw_cardbookConfiguration.allRestrictions[i][0].toString() + "::" + wdw_cardbookConfiguration.allRestrictions[i][9]
												+ "::" + wdw_cardbookConfiguration.allRestrictions[i][3] + "::" + wdw_cardbookConfiguration.allRestrictions[i][5] + "::" + wdw_cardbookConfiguration.allRestrictions[i][6]);
		}
	},

	selectType: function() {
		let btnEdit = document.getElementById("renameTypeLabel");
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("typesTable");
		let ABType = document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value;
		let type = document.getElementById('typesCategoryRadiogroup').selectedItem.value;
		if (wdw_cardbookConfiguration.allTypes[ABType] && wdw_cardbookConfiguration.allTypes[ABType][type].length && currentIndex) {
			btnEdit.disabled = false;
		} else {
			btnEdit.disabled = true;
		}
		document.getElementById("deleteTypeLabel").disabled = btnEdit.disabled;
		let btnAdd = document.getElementById("addTypeLabel");
		let value = document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value;
		if (cardbookRepository.cardbookCoreTypes[value].addnew == true) {
			btnAdd.disabled = false;
		} else {
			btnAdd.disabled = true;
		}
	},

	loadTypes: function () {
		let ABTypes = [ 'CARDDAV', 'GOOGLE2', 'APPLE', 'OFFICE365', 'YAHOO' ];
		for (let i in ABTypes) {
			let myABType = ABTypes[i];
			wdw_cardbookConfiguration.allTypes[myABType] = {};
			for (let field of cardbookRepository.multilineFields) {
				wdw_cardbookConfiguration.allTypes[myABType][field] = cardbookRepository.cardbookTypes.getTypes(myABType, field, false);
			}
		}
	},

	displayTypes: function () {
		cardbookElementTools.deleteRows("typesTable");
		let ABType = document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value;
		let type = document.getElementById('typesCategoryRadiogroup').selectedItem.value;
		let headers = [ "typesLabel" ];
		let data = [];
		if (wdw_cardbookConfiguration.allTypes[ABType] && wdw_cardbookConfiguration.allTypes[ABType][type]) {
			data = wdw_cardbookConfiguration.allTypes[ABType][type].map(x => [ x[0] ]);
		}
		let dataParameters = [];
		let rowParameters = {};
		let sortFunction = wdw_cardbookConfiguration.clickToSort;
		cardbookElementTools.addTreeTable("typesTable", headers, data, dataParameters, rowParameters, sortFunction);
		wdw_cardbookConfiguration.selectType();
	},

	addType: function () {
		let ABType = document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value;
		if (cardbookRepository.cardbookCoreTypes[ABType].addnew == true) {
			let type = document.getElementById('typesCategoryRadiogroup').selectedItem.value;
			let validationList = [];
			for (let value of wdw_cardbookConfiguration.allTypes[ABType][type]) {
				validationList.push(value[0]);
				validationList.push(value[1]);
			}
			let myArgs = {type: "", context: "AddType", typeAction: "", validationList: validationList};
			let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
			mail3PaneWindow.openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE" && myArgs.type != "") {
				wdw_cardbookConfiguration.allTypes[ABType][type].push([myArgs.type, myArgs.type]);
				wdw_cardbookConfiguration.sortTable("typesTable");
				wdw_cardbookConfiguration.preferenceChanged('customTypes');
			}
		}
	},
	
	renameType: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("typesTable");
		if (currentIndex) {
			let ABType = document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value;
			let type = document.getElementById('typesCategoryRadiogroup').selectedItem.value;
			let validationList = [];
			for (let value of wdw_cardbookConfiguration.allTypes[ABType][type]) {
				validationList.push(value[0]);
				validationList.push(value[1]);
			}

			let currentValue = wdw_cardbookConfiguration.allTypes[ABType][type][currentIndex][0];
			validationList = validationList.filter(element => element != currentValue);

			let myArgs = {type: currentValue, context: "EditType", typeAction: "", validationList: validationList};
			let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
			mail3PaneWindow.openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE" && myArgs.type != "") {
				let result = [];
				for (let value of wdw_cardbookConfiguration.allTypes[ABType][type]) {
					if (currentValue === value[0]) {
						result.push([myArgs.type, value[1]]);
					} else {
						result.push(value);
					}
				}
				wdw_cardbookConfiguration.allTypes[ABType][type] = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTable("typesTable");
				wdw_cardbookConfiguration.preferenceChanged('customTypes');
			}
		}
	},
	
	deleteType: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("typesTable");
		if (currentIndex) {
			let ABType = document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value;
			let type = document.getElementById('typesCategoryRadiogroup').selectedItem.value;
			let currentValue = wdw_cardbookConfiguration.allTypes[ABType][type][currentIndex][0];
			let result = [];
			for (let value of wdw_cardbookConfiguration.allTypes[ABType][type]) {
				if (currentValue !== value[0]) {
					result.push(value);
				}
			}
			wdw_cardbookConfiguration.allTypes[ABType][type] = JSON.parse(JSON.stringify(result));
			wdw_cardbookConfiguration.sortTable("typesTable");
			wdw_cardbookConfiguration.preferenceChanged('customTypes');
		}
	},
	
	resetType: function () {
		let ABType = document.getElementById('ABtypesCategoryRadiogroup').selectedItem.value;
		let type = document.getElementById('typesCategoryRadiogroup').selectedItem.value;
		cardbookRepository.cardbookPreferences.delBranch(cardbookRepository.cardbookPreferences.prefCardBookCustomTypes + ABType + "." + type);
		wdw_cardbookConfiguration.allTypes[ABType][type] = cardbookRepository.cardbookTypes.getTypes(ABType, type, true);
		wdw_cardbookConfiguration.sortTable("typesTable");
		wdw_cardbookConfiguration.preferenceChanged('customTypes');
	},

	validateTypes: function () {
		cardbookRepository.cardbookPreferences.delBranch(cardbookRepository.cardbookPreferences.prefCardBookCustomTypes);
		let ABTypes = [ 'CARDDAV', 'GOOGLE2', 'APPLE', 'OFFICE365', 'YAHOO' ];
		for (let i in ABTypes) {
			let ABType = ABTypes[i];
			for (let j in cardbookRepository.multilineFields) {
				let type = cardbookRepository.multilineFields[j];
				// searching for new or updated
				for (let k = 0; k < wdw_cardbookConfiguration.allTypes[ABType][type].length; k++) {
					let isItANew = true;
					let label = wdw_cardbookConfiguration.allTypes[ABType][type][k][0];
					let code = wdw_cardbookConfiguration.allTypes[ABType][type][k][1];
					for (let l = 0; l < cardbookRepository.cardbookCoreTypes[ABType][type].length; l++) {
						let coreCodeType = cardbookRepository.cardbookCoreTypes[ABType][type][l][0];
						if (code == coreCodeType) {
							if (label != cardbookRepository.extension.localeData.localizeMessage(coreCodeType)) {
								cardbookRepository.cardbookPreferences.setStringPref(cardbookRepository.cardbookPreferences.prefCardBookCustomTypes + ABType + "." + type + "." + code + ".value", label);
							}
							isItANew = false;
							break;
						}
					}
					if (isItANew) {
						cardbookRepository.cardbookPreferences.setStringPref(cardbookRepository.cardbookPreferences.prefCardBookCustomTypes + ABType + "." + type + "." + code + ".value", label);
					}
				}
				// searching for deleted
				for (let k = 0; k < cardbookRepository.cardbookCoreTypes[ABType][type].length; k++) {
					let coreCodeType = cardbookRepository.cardbookCoreTypes[ABType][type][k][0];
					let wasItDeleted = true;
					for (let l = 0; l < wdw_cardbookConfiguration.allTypes[ABType][type].length; l++) {
						let code = wdw_cardbookConfiguration.allTypes[ABType][type][l][1];
						if (code == coreCodeType) {
							wasItDeleted = false;
							break;
						}
					}
					if (wasItDeleted) {
						cardbookRepository.cardbookPreferences.setBoolPref(cardbookRepository.cardbookPreferences.prefCardBookCustomTypes + ABType + "." + type + "." + coreCodeType + ".disabled", true);
					}
				}
			}
		}
	},

	selectEmailsCollection: function() {
		let btnEdit = document.getElementById("renameEmailsCollectionLabel");
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("emailsCollectionTable");
		if (wdw_cardbookConfiguration.allEmailsCollections.length && currentIndex) {
			btnEdit.disabled = false;
		} else {
			btnEdit.disabled = true;
		}
		document.getElementById("deleteEmailsCollectionLabel").disabled = btnEdit.disabled;
	},

	loadEmailsCollection: function () {
		let results = [];
		results = cardbookRepository.cardbookPreferences.getAllEmailsCollections();
		let count = 0;
		for (let result of results) {
			let emailAccountName = wdw_cardbookConfiguration.getEmailAccountName(result[1]);
			if (emailAccountName != "") {
				let ABName = wdw_cardbookConfiguration.getABName(result[2]);
				if (ABName != "") {
					let index = count++;
					let categoryId = "";
					let categoryName = "";
					if (result[3]) {
						categoryId = result[2] + "::categories::" + result[3];
						categoryName = result[3];
					}
					wdw_cardbookConfiguration.allEmailsCollections.push([(result[0] == "true"), index.toString(), emailAccountName, result[1],
																	ABName, result[2], categoryName, categoryId]);
				}
			}
		}
	},

	displayEmailsCollection: function () {
		cardbookElementTools.deleteRows("emailsCollectionTable");
		let headers = [ "emailsCollectionEnabled", "emailsCollectionMailName", "emailsCollectionABName", "emailsCollectionCatName" ];
		let data = wdw_cardbookConfiguration.allEmailsCollections.map(x => [ x[0], x[2], x[4], x[6] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		cardbookElementTools.addTreeTable("emailsCollectionTable", headers, data, dataParameters);
		wdw_cardbookConfiguration.selectEmailsCollection();
	},
	
	addEmailsCollection: function () {
		let myArgs = {emailAccountId: "", emailAccountName: "", addressBookId: "", addressBookName: "", categoryName: "", typeAction: "", context: "Collection"};
		let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
		mail3PaneWindow.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddEmails.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
		if (myArgs.typeAction == "SAVE") {
			wdw_cardbookConfiguration.allEmailsCollections.push([true, wdw_cardbookConfiguration.allEmailsCollections.length.toString(), myArgs.emailAccountName, myArgs.emailAccountId,
															myArgs.addressBookName, myArgs.addressBookId, myArgs.categoryName, myArgs.categoryId]);
			wdw_cardbookConfiguration.sortTable("emailsCollectionTable");
			wdw_cardbookConfiguration.preferenceChanged('emailsCollection');
		}
	},

	renameEmailsCollection: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("emailsCollectionTable");
		if (currentIndex) {
			let enabled = wdw_cardbookConfiguration.allEmailsCollections[currentIndex][0];
			let id = wdw_cardbookConfiguration.allEmailsCollections[currentIndex][1];
			let mailName = wdw_cardbookConfiguration.allEmailsCollections[currentIndex][2];
			let mailId = wdw_cardbookConfiguration.allEmailsCollections[currentIndex][3];
			let ABName = wdw_cardbookConfiguration.allEmailsCollections[currentIndex][4];
			let ABDirPrefId = wdw_cardbookConfiguration.allEmailsCollections[currentIndex][5];
			let catName = wdw_cardbookConfiguration.allEmailsCollections[currentIndex][6];
			let catId = wdw_cardbookConfiguration.allEmailsCollections[currentIndex][7];
			let myArgs = {emailAccountId: mailId, emailAccountName: mailName, addressBookId: ABDirPrefId, addressBookName: ABName, categoryId: catId, categoryName: catName,
							typeAction: "", context: "Collection"};
							let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
			mail3PaneWindow.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddEmails.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE") {
				let result = [];
				for (let emailCollection of wdw_cardbookConfiguration.allEmailsCollections) {
					if (id === emailCollection[1]) {
						result.push([enabled, id, myArgs.emailAccountName, myArgs.emailAccountId, myArgs.addressBookName, myArgs.addressBookId, myArgs.categoryName, myArgs.categoryId]);
					} else {
						result.push(emailCollection);
					}
				}
				wdw_cardbookConfiguration.allEmailsCollections = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTable("emailsCollectionTable");
				wdw_cardbookConfiguration.preferenceChanged('emailsCollection');
			}
		}
	},
	
	deleteEmailsCollection: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("emailsCollectionTable");
		if (currentIndex) {
			let id = wdw_cardbookConfiguration.allEmailsCollections[currentIndex][1];
			let result = [];
			for (let emailCollection of wdw_cardbookConfiguration.allEmailsCollections) {
				if (id !== emailCollection[1]) {
					result.push(emailCollection);
				}
			}
			wdw_cardbookConfiguration.allEmailsCollections = JSON.parse(JSON.stringify(result));
			wdw_cardbookConfiguration.sortTable("emailsCollectionTable");
			wdw_cardbookConfiguration.preferenceChanged('emailsCollection');
		}
	},
	
	validateEmailsCollection: function () {
		cardbookRepository.cardbookPreferences.delEmailsCollection();
		for (let i = 0; i < wdw_cardbookConfiguration.allEmailsCollections.length; i++) {
			cardbookRepository.cardbookPreferences.setEmailsCollection(i.toString(), wdw_cardbookConfiguration.allEmailsCollections[i][0].toString() + "::" + wdw_cardbookConfiguration.allEmailsCollections[i][3]
													+ "::" + wdw_cardbookConfiguration.allEmailsCollections[i][5] + "::" + wdw_cardbookConfiguration.allEmailsCollections[i][6]);
		}
	},
	
	loadURLPhonesPassword: function () {
		let URL = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.URLPhoneURL");
		document.getElementById('URLPhoneURLTextBox').value = URL;
		let user = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.URLPhoneUser");
		document.getElementById('URLPhoneUserTextBox').value = user;
		document.getElementById('URLPhonePasswordTextBox').value = cardbookRepository.cardbookPasswordManager.getPassword(user, URL);
		wdw_cardbookConfiguration.URLPhoneURLOld = URL;
		wdw_cardbookConfiguration.URLPhoneUserOld = user;
	},

	showPassword: function () {
		let myPasswordTextbox = document.getElementById("URLPhonePasswordTextBox");
		if (!myPasswordTextbox.value) {
			return;
		}

		let myPasswordTextboxInfo = document.getElementById("URLPhonePasswordTextBoxInfo");
		if (myPasswordTextbox.type == "password") {
			myPasswordTextbox.type = "text";
			myPasswordTextboxInfo.src = "chrome://messenger/skin/icons/visible.svg";
		} else {
			myPasswordTextbox.type = "password";
			myPasswordTextboxInfo.src = "chrome://messenger/skin/icons/hidden.svg";
		}
	},

	displayURLPhones: function () {
		if (document.getElementById('imppsCategoryRadiogroup').selectedItem.value == "impp") {
			document.getElementById('URLPhoneGroupbox').hidden = true;
		} else {
			document.getElementById('URLPhoneGroupbox').hidden = false;
			if (wdw_cardbookConfiguration.allIMPPs['tel'].length == 1 && wdw_cardbookConfiguration.allIMPPs['tel'][0][2].toLowerCase() == "url") {
				document.getElementById('URLPhoneURLLabel').disabled = false;
				document.getElementById('URLPhoneURLTextBox').disabled = false;
				document.getElementById('URLPhoneUserLabel').disabled = false;
				document.getElementById('URLPhoneUserTextBox').disabled = false;
				document.getElementById('URLPhonePasswordLabel').disabled = false;
				document.getElementById('URLPhonePasswordTextBox').disabled = false;
				document.getElementById('URLPhoneBackgroundCheckBox').disabled = false;
			} else {
				document.getElementById('URLPhoneURLLabel').disabled = true;
				document.getElementById('URLPhoneURLTextBox').disabled = true;
				document.getElementById('URLPhoneUserLabel').disabled = true;
				document.getElementById('URLPhoneUserTextBox').disabled = true;
				document.getElementById('URLPhonePasswordLabel').disabled = true;
				document.getElementById('URLPhonePasswordTextBox').disabled = true;
				document.getElementById('URLPhoneBackgroundCheckBox').disabled = true;
			}
		}
		wdw_cardbookConfiguration.loadURLPhonesPassword();
	},
	
	validateURLPhonesPassword: function () {
		let URL = document.getElementById('URLPhoneURLTextBox').value;
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.URLPhoneURL", URL);
		let user = document.getElementById('URLPhoneUserTextBox').value;
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.URLPhoneUser", user);
		let password = document.getElementById('URLPhonePasswordTextBox').value;
		if (password) {
			cardbookRepository.cardbookPasswordManager.removePassword(wdw_cardbookConfiguration.URLPhoneUserOld, wdw_cardbookConfiguration.URLPhoneURLOld);
			cardbookRepository.cardbookPasswordManager.rememberPassword(user, URL, password, true);
		} else {
			cardbookRepository.cardbookPasswordManager.removePassword(user, URL);
		}
		wdw_cardbookConfiguration.URLPhoneURLOld = URL;
		wdw_cardbookConfiguration.URLPhoneUserOld = user;
	},

	resetIMPP: function () {
		cardbookRepository.cardbookPreferences.delBranch(cardbookRepository.cardbookPreferences.prefCardBookIMPPs);
		cardbookRepository.setDefaultImppTypes();
		wdw_cardbookConfiguration.allIMPPs['impp'] = [];
		wdw_cardbookConfiguration.allIMPPs['impp'] = cardbookRepository.cardbookUtils.sortMultipleArrayByString(cardbookRepository.cardbookPreferences.getAllIMPPs(),1,1);
		wdw_cardbookConfiguration.sortTable("IMPPsTable");
		wdw_cardbookConfiguration.preferenceChanged('impps');
	},

	selectIMPPsCategory: function() {
		let type = document.getElementById('imppsCategoryRadiogroup').selectedItem.value;
		wdw_cardbookConfiguration.sortTable("IMPPsTable");
	},

	selectIMPPs: function() {
		let type = document.getElementById('imppsCategoryRadiogroup').selectedItem.value;
		let resetButton = document.getElementById("resetIMPPLabel");
		if (type == "impp") {
			resetButton.hidden = false;
		} else {
			resetButton.hidden = true;
		}
		let btnAdd = document.getElementById("addIMPPLabel");
		btnAdd.disabled = false;
		if (type == "tel" && wdw_cardbookConfiguration.allIMPPs['tel'].length == 1) {
			btnAdd.disabled = true;
		}
		let btnEdit = document.getElementById("renameIMPPLabel");
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("IMPPsTable");
		if (wdw_cardbookConfiguration.allIMPPs[type] && wdw_cardbookConfiguration.allIMPPs[type].length && currentIndex) {
			btnEdit.disabled = false;
		} else {
			btnEdit.disabled = true;
		}
		document.getElementById("deleteIMPPLabel").disabled = btnEdit.disabled;
		wdw_cardbookConfiguration.displayURLPhones();
	},

	loadIMPPs: function () {
		wdw_cardbookConfiguration.allIMPPs['impp'] = [];
		wdw_cardbookConfiguration.allIMPPs['impp'] = cardbookRepository.cardbookUtils.sortMultipleArrayByString(cardbookRepository.cardbookPreferences.getAllIMPPs(),1,1);
		wdw_cardbookConfiguration.allIMPPs['tel'] = [];
		wdw_cardbookConfiguration.allIMPPs['tel'] = cardbookRepository.cardbookUtils.sortMultipleArrayByString(cardbookRepository.cardbookPreferences.getAllTels(),1,1);
	},
	
	displayIMPPs: function () {
		cardbookElementTools.deleteRows("IMPPsTable");
		let headers = [ "IMPPCodeHeader", "IMPPLabelHeader", "IMPPProtocolHeader" ];
		let type = document.getElementById('imppsCategoryRadiogroup').selectedItem.value;
		let data = [];
		if (wdw_cardbookConfiguration.allIMPPs[type]) {
			data = wdw_cardbookConfiguration.allIMPPs[type].map(x => [ x[0], x[1], x[2] ]);
		}
		let dataParameters = [];
		let rowParameters = {};
		let sortFunction = wdw_cardbookConfiguration.clickToSort;
		cardbookElementTools.addTreeTable("IMPPsTable", headers, data, dataParameters, rowParameters, sortFunction);
		wdw_cardbookConfiguration.selectIMPPs();
	},

	addIMPP: function () {
		let type = document.getElementById('imppsCategoryRadiogroup').selectedItem.value;
		let myArgs = {code: "", label: "", protocol: "", typeAction: ""};
		let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
		mail3PaneWindow.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddIMPP.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
		if (myArgs.typeAction == "SAVE") {
			wdw_cardbookConfiguration.allIMPPs[type].push([myArgs.code, myArgs.label, myArgs.protocol, wdw_cardbookConfiguration.allIMPPs[type].length]);
			wdw_cardbookConfiguration.sortTable("IMPPsTable");
			wdw_cardbookConfiguration.preferenceChanged('impps');
		}
	},
	
	renameIMPP: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("IMPPsTable");
		if (currentIndex) {
			let type = document.getElementById('imppsCategoryRadiogroup').selectedItem.value;
			let code = wdw_cardbookConfiguration.allIMPPs[type][currentIndex][0];
			let label = wdw_cardbookConfiguration.allIMPPs[type][currentIndex][1];
			let protocol = wdw_cardbookConfiguration.allIMPPs[type][currentIndex][2];
			let id = wdw_cardbookConfiguration.allIMPPs[type][currentIndex][3];
			let myArgs = {code: code, label: label, protocol: protocol, typeAction: ""};
			let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
			mail3PaneWindow.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddIMPP.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE") {
				let result = [];
				for (let impp of wdw_cardbookConfiguration.allIMPPs[type]) {
					if (id == impp[3]) {
						result.push([myArgs.code, myArgs.label, myArgs.protocol, id]);
					} else {
						result.push(impp);
					}
				}
				wdw_cardbookConfiguration.allIMPPs[type] = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTable("IMPPsTable");
				wdw_cardbookConfiguration.preferenceChanged('impps');
			}
		}
	},
	
	deleteIMPP: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("IMPPsTable");
		if (currentIndex) {
			let type = document.getElementById('imppsCategoryRadiogroup').selectedItem.value;
			let id = wdw_cardbookConfiguration.allIMPPs[type][currentIndex][3];
			let result = [];
			for (let impp of wdw_cardbookConfiguration.allIMPPs[type]) {
				if (id != impp[3]) {
					result.push(impp);
				}
			}
			wdw_cardbookConfiguration.allIMPPs[type] = JSON.parse(JSON.stringify(result));
			wdw_cardbookConfiguration.sortTable("IMPPsTable");
			wdw_cardbookConfiguration.preferenceChanged('impps');
		}
	},

	validateIMPPs: function () {
		cardbookRepository.cardbookPreferences.delIMPPs();
		for (let i in wdw_cardbookConfiguration.allIMPPs['impp']) {
			cardbookRepository.cardbookPreferences.setIMPPs(i, wdw_cardbookConfiguration.allIMPPs['impp'][i][0] + ":" + wdw_cardbookConfiguration.allIMPPs['impp'][i][1] + ":" + wdw_cardbookConfiguration.allIMPPs['impp'][i][2]);
		}
		cardbookRepository.cardbookPreferences.delTels();
		for (let i in wdw_cardbookConfiguration.allIMPPs['tel']) {
			cardbookRepository.cardbookPreferences.setTels(i, wdw_cardbookConfiguration.allIMPPs['tel'][i][0] + ":" + wdw_cardbookConfiguration.allIMPPs['tel'][i][1] + ":" + wdw_cardbookConfiguration.allIMPPs['tel'][i][2]);
		}
	},

	selectCustomFields: function() {
		let btnEdit = document.getElementById("renameCustomFieldsLabel");
		let btnUp = document.getElementById("upCustomFieldsLabel");
		let btnDown = document.getElementById("downCustomFieldsLabel");
		let type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("customFieldsTable");
		if (wdw_cardbookConfiguration.allCustomFields[type] && wdw_cardbookConfiguration.allCustomFields[type].length && currentIndex) {
			btnEdit.disabled = false;
			if (wdw_cardbookConfiguration.allCustomFields[type].length > 1) {
				if (currentIndex == 0) {
					btnUp.disabled = true;
				} else {
					btnUp.disabled = false;
				}
				if (currentIndex == wdw_cardbookConfiguration.allCustomFields[type].length-1) {
					btnDown.disabled = true;
				} else {
					btnDown.disabled = false;
				}
			} else {
				btnUp.disabled = true;
				btnDown.disabled = true;
			}
		} else {
			btnEdit.disabled = true;
			btnUp.disabled = true;
			btnDown.disabled = true;
		}
		document.getElementById("deleteCustomFieldsLabel").disabled = btnEdit.disabled;
	},

	loadCustomFields: function () {
		wdw_cardbookConfiguration.allCustomFields = cardbookRepository.cardbookPreferences.getAllCustomFields();
	},

	displayCustomFields: function () {
		cardbookElementTools.deleteRows("customFieldsTable");
		let headers = [ "customFieldRankHeader", "customFieldCodeHeader", "customFieldLabelHeader" ];
		let type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
		let data = [];
		if (wdw_cardbookConfiguration.allCustomFields[type]) {
			data = wdw_cardbookConfiguration.allCustomFields[type].map(x => [ x[2], x[0], x[1] ]);
		}
		let dataParameters = [];
		let rowParameters = {};
		let sortFunction = wdw_cardbookConfiguration.clickToSort;
		cardbookElementTools.addTreeTable("customFieldsTable", headers, data, dataParameters, rowParameters, sortFunction);
		wdw_cardbookConfiguration.selectCustomFields();
	},

	upCustomFields: function () {
		let type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("customFieldsTable");
		if (wdw_cardbookConfiguration.allCustomFields[type] && wdw_cardbookConfiguration.allCustomFields[type].length && currentIndex) {
			let id = wdw_cardbookConfiguration.allCustomFields[type][currentIndex][2]*1;
			let temp = [wdw_cardbookConfiguration.allCustomFields[type][id-1][0], wdw_cardbookConfiguration.allCustomFields[type][id-1][1], parseInt(id)];
			wdw_cardbookConfiguration.allCustomFields[type][id-1] = [wdw_cardbookConfiguration.allCustomFields[type][id][0], wdw_cardbookConfiguration.allCustomFields[type][id][1], parseInt(id-1)];
			wdw_cardbookConfiguration.allCustomFields[type][id] = temp;
			wdw_cardbookConfiguration.sortTable("customFieldsTable");
			wdw_cardbookConfiguration.preferenceChanged('customFields');
		}
	},

	downCustomFields: function () {
		let type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("customFieldsTable");
		if (wdw_cardbookConfiguration.allCustomFields[type] && wdw_cardbookConfiguration.allCustomFields[type].length && currentIndex) {
			let id = wdw_cardbookConfiguration.allCustomFields[type][currentIndex][2]*1;
			let temp = [wdw_cardbookConfiguration.allCustomFields[type][id+1][0], wdw_cardbookConfiguration.allCustomFields[type][id+1][1], parseInt(id)];
			wdw_cardbookConfiguration.allCustomFields[type][id+1] = [wdw_cardbookConfiguration.allCustomFields[type][id][0], wdw_cardbookConfiguration.allCustomFields[type][id][1], parseInt(id+1)];
			wdw_cardbookConfiguration.allCustomFields[type][id] = temp;
			wdw_cardbookConfiguration.sortTable("customFieldsTable");
			wdw_cardbookConfiguration.preferenceChanged('customFields');
		}
	},

	addCustomFields: function () {
		let type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
		let validationList = wdw_cardbookConfiguration.getAllCustomsFields();
		let myArgs = {code: "", label: "", typeAction: "", validationList: validationList};
		let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
		mail3PaneWindow.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddCustomField.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
		if (myArgs.typeAction == "SAVE") {
			let result = [];
			let already = false;
			for (let i = 0; i < wdw_cardbookConfiguration.allCustomFields[type].length; i++) {
				if (myArgs.code.toLowerCase() === wdw_cardbookConfiguration.allCustomFields[type][i][0].toLowerCase()) {
					result.push([myArgs.code, myArgs.label, i]);
					already = true;
				} else {
					result.push([wdw_cardbookConfiguration.allCustomFields[type][i][0], wdw_cardbookConfiguration.allCustomFields[type][i][1], i]);
				}
			}
			if (!already) {
				result.push([myArgs.code, myArgs.label, wdw_cardbookConfiguration.allCustomFields[type].length]);
			}
			wdw_cardbookConfiguration.allCustomFields[type] = JSON.parse(JSON.stringify(result));
			wdw_cardbookConfiguration.sortTable("customFieldsTable");
			if (!already) {
				wdw_cardbookConfiguration.preferenceChanged('customFields', null, myArgs.code);
			} else {
				wdw_cardbookConfiguration.preferenceChanged('customFields');
			}
		}
	},

	renameCustomFields: function () {
		let type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("customFieldsTable");
		if (wdw_cardbookConfiguration.allCustomFields[type] && wdw_cardbookConfiguration.allCustomFields[type].length && currentIndex) {
			let code = wdw_cardbookConfiguration.allCustomFields[type][currentIndex][0];
			let label = wdw_cardbookConfiguration.allCustomFields[type][currentIndex][1];
			let id = wdw_cardbookConfiguration.allCustomFields[type][currentIndex][2];
			let validationList = wdw_cardbookConfiguration.getAllCustomsFields();
			validationList = validationList.filter(element => element != code);
			let myArgs = {code: code, label: label, typeAction: "", validationList: validationList};
			let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
			mail3PaneWindow.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfigurationAddCustomField.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE") {
				let result = [];
				let already = false;
				for (let i = 0; i < wdw_cardbookConfiguration.allCustomFields[type].length; i++) {
					if (myArgs.code.toLowerCase() === wdw_cardbookConfiguration.allCustomFields[type][i][0].toLowerCase()) {
						result.push([myArgs.code, myArgs.label, i]);
						already = true;
					} else {
						result.push([wdw_cardbookConfiguration.allCustomFields[type][i][0], wdw_cardbookConfiguration.allCustomFields[type][i][1], i]);
					}
				}
				if (!already) {
					result = [];
					for (let i = 0; i < wdw_cardbookConfiguration.allCustomFields[type].length; i++) {
						if (id == wdw_cardbookConfiguration.allCustomFields[type][i][2]) {
							result.push([myArgs.code, myArgs.label, i]);
						} else {
							result.push([wdw_cardbookConfiguration.allCustomFields[type][i][0], wdw_cardbookConfiguration.allCustomFields[type][i][1], i]);
						}
					}
				}
				wdw_cardbookConfiguration.allCustomFields[type] = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTable("customFieldsTable");
				if (!already) {
					wdw_cardbookConfiguration.preferenceChanged('customFields', code, myArgs.code);
				} else {
					wdw_cardbookConfiguration.preferenceChanged('customFields');
				}
			}
		}
	},

	deleteCustomFields: function () {
		let type = document.getElementById('customFieldsCategoryRadiogroup').selectedItem.value;
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("customFieldsTable");
		if (wdw_cardbookConfiguration.allCustomFields[type] && wdw_cardbookConfiguration.allCustomFields[type].length && currentIndex) {
			let id = wdw_cardbookConfiguration.allCustomFields[type][currentIndex][2];
			let code = wdw_cardbookConfiguration.allCustomFields[type][currentIndex][0];
			let result = [];
			let count = 0;
			for (let customField of wdw_cardbookConfiguration.allCustomFields[type]) {
				if (id != customField[2]) {
					result.push([customField[0], customField[1], count]);
					count++;
				}
			}
			wdw_cardbookConfiguration.allCustomFields[type] = JSON.parse(JSON.stringify(result));
			wdw_cardbookConfiguration.sortTable("customFieldsTable");
			wdw_cardbookConfiguration.preferenceChanged('customFields', code, null);
		}
	},

	getAllCustomsFields: function () {
		let allcustomFieldNames = [];
		for (let type in wdw_cardbookConfiguration.allCustomFields) {
			for (let customField of wdw_cardbookConfiguration.allCustomFields[type]) {
				allcustomFieldNames.push(customField[0]);
			}
		}
		for (let type in wdw_cardbookConfiguration.customListsFields) {
			let nameValue = document.getElementById(wdw_cardbookConfiguration.customListsFields[type] + 'TextBox').value;
			allcustomFieldNames.push(nameValue);
		}
		return allcustomFieldNames;
	},

	validateCustomFields: function () {
		cardbookRepository.cardbookPreferences.delCustomFields();
		for (let type in wdw_cardbookConfiguration.allCustomFields) {
			for (let customField of wdw_cardbookConfiguration.allCustomFields[type]) {
				cardbookRepository.cardbookPreferences.setCustomFields(type, customField[2], customField[0] + ":" + customField[1]);
			}
		}
		cardbookRepository.customFields = cardbookRepository.cardbookPreferences.getAllCustomFields();
	},

	resetCustomListFields: function () {
		document.getElementById('kindCustomTextBox').value = cardbookRepository.defaultKindCustom;
		document.getElementById('memberCustomTextBox').value = cardbookRepository.defaultMemberCustom;
		wdw_cardbookConfiguration.validateCustomListValues();
	},

	validateCustomListValues: function () {
		for (let i in wdw_cardbookConfiguration.customListsFields) {
			let value = document.getElementById(wdw_cardbookConfiguration.customListsFields[i] + 'TextBox').value;
			let validationListOrig = wdw_cardbookConfiguration.getAllCustomsFields();
			let validationList = cardbookRepository.arrayUnique(validationListOrig);
			if (validationList.length != validationListOrig.length) {
				cardbookNotifications.setNotification(CardBookConfigNotification.errorNotifications, "customFieldsErrorUNIQUE");
				return;
			} else if (value.toUpperCase() !== value) {
				cardbookNotifications.setNotification(CardBookConfigNotification.errorNotifications, "customFieldsErrorUPPERCASE", [value]);
				return;
			} else if (!(value.toUpperCase().startsWith("X-"))) {
				cardbookNotifications.setNotification(CardBookConfigNotification.errorNotifications, "customFieldsErrorX", [value]);
				return;
			} else if (cardbookRepository.notAllowedCustoms.indexOf(value.toUpperCase()) != -1) {
				cardbookNotifications.setNotification(CardBookConfigNotification.errorNotifications, "customFieldsErrorFIELD", [value]);
				return;
			} else if (value.includes(":") || value.includes(",") || value.includes(";") || value.includes(".")) {
				cardbookNotifications.setNotification(CardBookConfigNotification.errorNotifications, "customFieldsErrorCHAR", [value]);
				return;
			}
		}
		cardbookNotifications.setNotification(CardBookConfigNotification.errorNotifications, "OK");
		wdw_cardbookConfiguration.preferenceChanged('customListFields');
	},

	loadCustomListFields: function () {
		for (let i in wdw_cardbookConfiguration.customListsFields) {
			document.getElementById(wdw_cardbookConfiguration.customListsFields[i] + 'TextBox').value = cardbookRepository.cardbookPreferences.getStringPref(cardbookRepository.cardbookPreferences.prefCardBookRoot + wdw_cardbookConfiguration.customListsFields[i]);
		}
	},

	validateCustomListFields: function () {
		for (let i in wdw_cardbookConfiguration.customListsFields) {
			cardbookRepository.cardbookPreferences.setStringPref(cardbookRepository.cardbookPreferences.prefCardBookRoot + wdw_cardbookConfiguration.customListsFields[i], document.getElementById(wdw_cardbookConfiguration.customListsFields[i] + 'TextBox').value);
		}
	},

	selectOrg: function() {
		let btnEdit = document.getElementById("renameOrgLabel");
		let btnUp = document.getElementById("upOrgLabel");
		let btnDown = document.getElementById("downOrgLabel");
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("orgTreeTable");
		if (wdw_cardbookConfiguration.allOrg.length && currentIndex) {
			btnEdit.disabled = false;
			if (wdw_cardbookConfiguration.allOrg.length > 1) {
				if (currentIndex == 0) {
					btnUp.disabled = true;
				} else {
					btnUp.disabled = false;
				}
				if (currentIndex == wdw_cardbookConfiguration.allOrg.length-1) {
					btnDown.disabled = true;
				} else {
					btnDown.disabled = false;
				}
			} else {
				btnUp.disabled = true;
				btnDown.disabled = true;
			}
		} else {
			btnEdit.disabled = true;
			btnUp.disabled = true;
			btnDown.disabled = true;
		}
		document.getElementById("deleteOrgLabel").disabled = btnEdit.disabled;
	},

	loadOrg: function () {
		let orgStructure = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
		if (orgStructure != "") {
			let tmpArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
			for (let i = 0; i < tmpArray.length; i++) {
				wdw_cardbookConfiguration.allOrg.push([tmpArray[i], i]);
			}
		} else {
			wdw_cardbookConfiguration.allOrg = [];
		}
	},
	
	displayOrg: function () {
		cardbookElementTools.deleteRows("orgTreeTable");
		let headers = [ "orgRank", "orgLabel" ];
		let data = [];
		if (wdw_cardbookConfiguration.allOrg) {
			data = wdw_cardbookConfiguration.allOrg.map(x => [ x[1], x[0] ]);
		}
		let dataParameters = [];
		let rowParameters = {};
		let sortFunction = wdw_cardbookConfiguration.clickToSort;
		cardbookElementTools.addTreeTable("orgTreeTable", headers, data, dataParameters, rowParameters, sortFunction);
		wdw_cardbookConfiguration.selectOrg();
	},
	
	upOrg: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("orgTreeTable");
		if (wdw_cardbookConfiguration.allOrg.length && currentIndex) {
			let id = wdw_cardbookConfiguration.allOrg[currentIndex][1]*1;
			let temp = [wdw_cardbookConfiguration.allOrg[id-1][0], parseInt(id)];
			wdw_cardbookConfiguration.allOrg[id-1] = [wdw_cardbookConfiguration.allOrg[id][0], parseInt(id-1)];
			wdw_cardbookConfiguration.allOrg[id] = temp;
			wdw_cardbookConfiguration.sortTable("orgTreeTable");
			wdw_cardbookConfiguration.preferenceChanged('orgStructure');
		}
	},

	downOrg: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("orgTreeTable");
		if (wdw_cardbookConfiguration.allOrg.length && currentIndex) {
			let id = wdw_cardbookConfiguration.allOrg[currentIndex][1]*1;
			let temp = [wdw_cardbookConfiguration.allOrg[id+1][0], parseInt(id)];
			wdw_cardbookConfiguration.allOrg[id+1] = [wdw_cardbookConfiguration.allOrg[id][0], parseInt(id+1)];
			wdw_cardbookConfiguration.allOrg[id] = temp;
			wdw_cardbookConfiguration.sortTable("orgTreeTable");
			wdw_cardbookConfiguration.preferenceChanged('orgStructure');
		}
	},

	addOrg: function () {
		let validationList = JSON.parse(JSON.stringify(wdw_cardbookConfiguration.allOrg));
		let myArgs = {type: "", context: "Org", typeAction: "", validationList: validationList};
		let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
		mail3PaneWindow.openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
		if (myArgs.typeAction == "SAVE") {
			let result = [];
			let already = false;
			for (let i = 0; i < wdw_cardbookConfiguration.allOrg.length; i++) {
				if (myArgs.type.toLowerCase() === wdw_cardbookConfiguration.allOrg[i][0].toLowerCase()) {
					result.push([myArgs.type, i]);
					already = true;
				} else {
					result.push([wdw_cardbookConfiguration.allOrg[i][0], i]);
				}
			}
			if (!already) {
				result.push([myArgs.type, wdw_cardbookConfiguration.allOrg.length]);
			}
			wdw_cardbookConfiguration.allOrg = JSON.parse(JSON.stringify(result));
			wdw_cardbookConfiguration.sortTable("orgTreeTable");
			if (!already) {
				wdw_cardbookConfiguration.preferenceChanged('orgStructure', null, "org." + myArgs.type);
			} else {
				wdw_cardbookConfiguration.preferenceChanged('orgStructure');
			}
		}
	},
	
	renameOrg: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("orgTreeTable");
		if (wdw_cardbookConfiguration.allOrg.length && currentIndex) {
			let label = wdw_cardbookConfiguration.allOrg[currentIndex][0];
			let id = wdw_cardbookConfiguration.allOrg[currentIndex][1];
			let validationList = JSON.parse(JSON.stringify(wdw_cardbookConfiguration.allOrg));
			validationList = validationList.filter(element => element != label);
			let myArgs = {type: label, context: "Org", typeAction: "", validationList: validationList};
			let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
			mail3PaneWindow.openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xhtml", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE" && myArgs.type != "") {
				let result = [];
				let already = false;
				for (let i = 0; i < wdw_cardbookConfiguration.allOrg.length; i++) {
					if (myArgs.type.toLowerCase() === wdw_cardbookConfiguration.allOrg[i][0].toLowerCase()) {
						result.push([myArgs.type, i]);
						already = true;
					} else {
						result.push([wdw_cardbookConfiguration.allOrg[i][0], i]);
					}
				}
				if (!already) {
					result = [];
					for (let i = 0; i < wdw_cardbookConfiguration.allOrg.length; i++) {
						if (id == wdw_cardbookConfiguration.allOrg[i][1]) {
							result.push([myArgs.type, i]);
						} else {
							result.push([wdw_cardbookConfiguration.allOrg[i][0], i]);
						}
					}
				}
				wdw_cardbookConfiguration.allOrg = JSON.parse(JSON.stringify(result));
				wdw_cardbookConfiguration.sortTable("orgTreeTable");
				if (!already) {
					wdw_cardbookConfiguration.preferenceChanged('orgStructure', "org." + label, "org." + myArgs.type);
				} else {
					wdw_cardbookConfiguration.preferenceChanged('orgStructure');
				}
			}
		}
	},
	
	deleteOrg: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("orgTreeTable");
		if (wdw_cardbookConfiguration.allOrg.length && currentIndex) {
			let label = wdw_cardbookConfiguration.allOrg[currentIndex][0];
			let id = wdw_cardbookConfiguration.allOrg[currentIndex][1];
			let result = [];
			let count = 0;
			for (let org of wdw_cardbookConfiguration.allOrg) {
				if (id != org[1]) {
					result.push([org[0], count]);
					count++;
				}
			}
			wdw_cardbookConfiguration.allOrg = JSON.parse(JSON.stringify(result));
			wdw_cardbookConfiguration.sortTable("orgTreeTable");
			wdw_cardbookConfiguration.preferenceChanged('orgStructure', "org." + label, null);
		}
	},
	
	validateOrg: function () {
		let tmpArray = [];
		for (let org of wdw_cardbookConfiguration.allOrg) {
			tmpArray.push(cardbookRepository.cardbookUtils.escapeStringSemiColon(org[0]));
		}
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.orgStructure", cardbookRepository.cardbookUtils.unescapeStringSemiColon(tmpArray.join(";")));
	},

	loadDateDisplayedFormat: function () {
		let labelLong = cardbookRepository.extension.localeData.localizeMessage("dateDisplayedFormatLong");
		let labelShort = cardbookRepository.extension.localeData.localizeMessage("dateDisplayedFormatShort");
		let date = new Date();
		let dateString = cardbookRepository.cardbookDates.convertDateToDateString(date, "4.0");
		let dateFormattedLong = cardbookRepository.cardbookDates.getFormattedDateForDateString(dateString, "4.0", "0");
		document.getElementById('dateDisplayedFormatLong').setAttribute("label", labelLong.replace("%P1%", dateFormattedLong));
		let dateFormattedShort = cardbookRepository.cardbookDates.getFormattedDateForDateString(dateString, "4.0", "1");
		document.getElementById('dateDisplayedFormatShort').setAttribute("label", labelShort.replace("%P1%", dateFormattedShort));
	},

	loadInitialSyncDelay: function () {
		let initialSync = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.initialSync");
		if (!(initialSync)) {
			document.getElementById('initialSyncDelay').disabled = true;
			document.getElementById('initialSyncDelayTextBox').disabled = true;
		}
	},

	validateStatusInformationLineNumber: function () {
		let value = document.getElementById('statusInformationLineNumberTextBox').value;
		if (value < 10) {
			document.getElementById('statusInformationLineNumberTextBox').value = 10;
			value = 10;
		}
		cardbookRepository.statusInformationLineNumber = value;
		while (cardbookRepository.statusInformation.length > value) {
			cardbookRepository.statusInformation.splice(0, 1);
		}
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.statusInformationLineNumber", cardbookRepository.statusInformationLineNumber);
	},

	showInitialSync: function () {
		if (document.getElementById('initialSyncCheckBox').checked) {
			document.getElementById('initialSyncDelay').disabled = false;
			document.getElementById('initialSyncDelayTextBox').disabled = false;
		} else {
			document.getElementById('initialSyncDelay').disabled = true;
			document.getElementById('initialSyncDelayTextBox').disabled = true;
		}
	},

	validateInitialSync: function () {
		wdw_cardbookConfiguration.showInitialSync();
		cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.initialSync", document.getElementById('initialSyncCheckBox').checked);
	},

	loadCountries: async function () {
		let countryList = document.getElementById('defaultRegionMenulist');
		let countryPopup = document.getElementById('defaultRegionMenupopup');
		let country = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.defaultRegion");
		await cardbookElementTools.loadCountries(countryPopup, countryList, country, true, true);
	},

	validateShowNameAs: function () {
		cardbookRepository.showNameAs = document.getElementById('showNameAsRadiogroup').selectedItem.value;
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.showNameAs", cardbookRepository.showNameAs);
	},

	validateDateDisplayedFormat: function () {
		cardbookRepository.dateDisplayedFormat = document.getElementById('dateDisplayedFormatMenulist').selectedItem.value;
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.dateDisplayedFormat", cardbookRepository.dateDisplayedFormat);
	},

	validateUseColor: function () {
		cardbookRepository.useColor = document.getElementById('useColorRadiogroup').selectedItem.value;
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.useColor", cardbookRepository.useColor);
	},

	showPane: function (paneID) {
		if (!paneID) {
			return;
		}
		
		let pane = document.getElementById(paneID);
		if (!pane) {
			return;
		}

		let categories = document.getElementById('categories');
		let item = categories.querySelector(".category[value=" + paneID + "]");
		categories.selectedItem = item;

		let window = document.getElementById('wdw_cardbookConfigurationWindow');
		window.setAttribute("lastSelected", paneID);
		Services.xulStore.persist(window, "lastSelected");

		let nodes = document.getElementById("paneDeck").querySelectorAll(".cardbook-pane");
		for (let node of nodes) {
			if (node.id == paneID) {
				node.hidden = false;
			} else {
				node.hidden = true;
			}
		}
	},

	loadPreferenceFields: function () {
		for (let node of document.querySelectorAll("[preference]")) {
			// set instantApply
			if (node.getAttribute("instantApply") == "true") {
				node.addEventListener("command", function(event) {wdw_cardbookConfiguration.saveInstantApply(event.target);});
				node.addEventListener("change", function(event) {wdw_cardbookConfiguration.saveInstantApply(event.target);});
			}
			
			// fill the preference fields
			let nodeName = node.tagName.toLowerCase();
			let prefName = node.getAttribute("preference");
			let prefType = node.getAttribute("type");
			let prefValue;
			switch (prefType) {
				case "bool":
					prefValue = cardbookRepository.cardbookPreferences.getBoolPref(prefName, false);
					break;
				case "string":
				case "text":
				case "number":
					prefValue = cardbookRepository.cardbookPreferences.getStringPref(prefName, "");
					break;
				default:
					throw new Error("loadPreferenceFields : prefType null or unknown : " + prefType);
			}
			
			// nodename will have the namespace prefix removed and the value of the type attribute (if any) appended
			switch (nodeName) {
				case "checkbox":
				case "input.checkbox":
					node.checked = prefValue;
					break;
				case "textbox":
				case "input.text":
				case "html:input":
					node.setAttribute("value", prefValue);              
					break;
				case "menulist":
					let index = 0;
					for (let child of node.menupopup.childNodes) {
						if (child.value == prefValue) {
							node.selectedIndex = index;
							break;
						}
						index = index + 1;
					}
					break;
				case "radiogroup":
					let index1 = 0;
					for (let child of node.childNodes) {
						if (child.value == prefValue) {
							node.selectedIndex = index1;
							break;
						}
						index1 = index1 + 1;
					}
					break;
				default:
					throw new Error("loadPreferenceFields : nodeName unknown : " + nodeName);
			}
		}
	},

	loadInitialPane: function () {
		let window = document.getElementById('wdw_cardbookConfigurationWindow');
		if (window.hasAttribute("lastSelected")) {
			wdw_cardbookConfiguration.showPane(window.getAttribute("lastSelected"));
		} else {
			wdw_cardbookConfiguration.showPane("cardbook-generalPane");
		}
	},

	load: async function () {
		i18n.updateDocument({ extension: cardbookRepository.extension });
		wdw_cardbookConfiguration.loadInitialPane();
		wdw_cardbookConfiguration.loadTitle();
		wdw_cardbookConfiguration.loadPreferenceFields();
		wdw_cardbookConfiguration.loadIMPPs();
		wdw_cardbookConfiguration.sortTable("IMPPsTable");
		wdw_cardbookConfiguration.loadCustomFields();
		wdw_cardbookConfiguration.sortTable("customFieldsTable");
		wdw_cardbookConfiguration.loadCustomListFields();
		wdw_cardbookConfiguration.loadOrg();
		wdw_cardbookConfiguration.sortTable("orgTreeTable");
		await wdw_cardbookConfiguration.loadCountries();
		wdw_cardbookConfiguration.loadDateDisplayedFormat();
		wdw_cardbookConfiguration.loadDiscoveryAccounts();
		wdw_cardbookConfiguration.sortTable("discoveryAccountsTable");
		// should be after loadCustomFields and loadOrg
		wdw_cardbookConfiguration.loadFields();
		wdw_cardbookConfiguration.sortTable("fieldsTreeTable");
		wdw_cardbookConfiguration.loadAddressbooks();
		wdw_cardbookConfiguration.sortTable("addressbooksTable");
		wdw_cardbookConfiguration.loadCalendars();
		wdw_cardbookConfiguration.sortTable("calendarsTable");
		wdw_cardbookConfiguration.loadInitialSyncDelay();
		wdw_cardbookConfiguration.loadVCards();
		wdw_cardbookConfiguration.sortTable("accountsVCardsTable");
		wdw_cardbookConfiguration.loadRestrictions();
		wdw_cardbookConfiguration.sortTable("accountsRestrictionsTable");
		wdw_cardbookConfiguration.loadTypes();
		wdw_cardbookConfiguration.sortTable("typesTable");
		wdw_cardbookConfiguration.loadEmailsCollection();
		wdw_cardbookConfiguration.sortTable("emailsCollectionTable");
		wdw_cardbookConfiguration.loadPrefEmailPref();
		wdw_cardbookConfiguration.loadEncryptionPref();
		await wdw_cardbookConfiguration.loadAdrFormula();
		wdw_cardbookConfiguration.remindViaPopup();
		wdw_cardbookConfiguration.wholeDay();
		wdw_cardbookConfiguration.cardbookAutoComplete();
		wdw_cardbookConfiguration.loadAutocompleteRestrictSearchFields();
		wdw_cardbookConfiguration.loadEventEntryTitle();
		wdw_cardbookConfiguration.showTab();

		let categories = document.getElementById("categories");
		categories.addEventListener("select", event => wdw_cardbookConfiguration.showPane(event.target.value));
	},
	
	saveInstantApply: function (aNode) {
		// for menulists and radiogroups
		let nodeName = aNode.tagName.toLowerCase();
		switch (nodeName) {
			case "menuitem":
				aNode = aNode.parentNode.parentNode;
				break;
			case "radio":
				aNode = aNode.parentNode;
				break;
		}
		let prefName = aNode.getAttribute("preference");
		let prefType = aNode.getAttribute("type");
		switch (prefType) {
			case "bool":
				cardbookRepository.cardbookPreferences.setBoolPref(prefName, aNode.checked);
				break;
			case "string":
			case "text":
			case "number":
				cardbookRepository.cardbookPreferences.setStringPref(prefName, aNode.value);
				break;
			default:
				throw new Error("saveInstantApply : prefType null or unknown : " + prefType);
		}
	},

	preferenceChanged: async function (aPreference, aOldField, aNewField) {
		switch (aPreference) {
			case "autocompletion":
				wdw_cardbookConfiguration.validateAutoComplete();
				break;
			case "autocompleteRestrictSearch":
				wdw_cardbookConfiguration.validateAutocompleteRestrictSearchFields();
				break;
			case "useColor":
				wdw_cardbookConfiguration.validateUseColor();
				break;
			case "accountsRestrictions":
				wdw_cardbookConfiguration.validateRestrictions();
				break;
			case "statusInformationLineNumber":
				wdw_cardbookConfiguration.validateStatusInformationLineNumber();
				break;
			case "debugMode":
				cardbookRepository.debugMode = document.getElementById('debugModeCheckBox').checked;
				break;
			case "showNameAs":
				wdw_cardbookConfiguration.validateShowNameAs();
				break;
			case "adrFormula":
				await wdw_cardbookConfiguration.validateAdrFormula();
				break;
			case "dateDisplayedFormat":
				wdw_cardbookConfiguration.validateDateDisplayedFormat();
				break;
			case "fields":
				wdw_cardbookConfiguration.validateFields();
				break;
			case "customTypes":
				wdw_cardbookConfiguration.validateTypes();
				break;
			case "localDataEncryption":
				wdw_cardbookConfiguration.validateEncryptionPref();
				break;
			case "impps":
				wdw_cardbookConfiguration.validateIMPPs();
				break;
			case "URLPhonePassword":
				wdw_cardbookConfiguration.validateURLPhonesPassword();
				break;
			case "customFields":
				wdw_cardbookConfiguration.validateCustomFields();
				// need to reload the edition fields
				wdw_cardbookConfiguration.validateFieldsFromOrgOrCustom(aOldField, aNewField);
				break;
			case "customListFields":
				wdw_cardbookConfiguration.validateCustomListFields();
				break;
			case "orgStructure":
				wdw_cardbookConfiguration.validateOrg();
				// need to reload the edition fields
				wdw_cardbookConfiguration.validateFieldsFromOrgOrCustom(aOldField, aNewField);
				break;
			case "attachedVCard":
				wdw_cardbookConfiguration.validateVCards();
				break;
			case "discoveryAccounts":
				wdw_cardbookConfiguration.validateDiscoveryAccounts();
				break;
			case "initialSync":
				wdw_cardbookConfiguration.validateInitialSync();
				break;
			case "emailsCollection":
				wdw_cardbookConfiguration.validateEmailsCollection();
				break;
			case "preferEmailPref":
				wdw_cardbookConfiguration.validatePrefEmailPref();
				break;
			case "addressbooks":
				wdw_cardbookConfiguration.validateAddressbooks();
				break;
			case "calendars":
				wdw_cardbookConfiguration.validateCalendars();
				break;
			case "eventEntryTitle":
				wdw_cardbookConfiguration.validateEventEntryTitle();
				break;
			case "showPopupOnStartup":
				wdw_cardbookConfiguration.validateShowPopupOnStartup();
				break;
			case "showPeriodicPopup":
				wdw_cardbookConfiguration.validateShowPeriodicPopup();
				break;
			case "eventEntryWholeDay":
				wdw_cardbookConfiguration.validateEventEntryWholeDay();
				break;
		}
		cardbookRepository.cardbookUtils.notifyObservers("preferencesChanged");
	}
};

document.addEventListener("DOMContentLoaded", wdw_cardbookConfiguration.load);