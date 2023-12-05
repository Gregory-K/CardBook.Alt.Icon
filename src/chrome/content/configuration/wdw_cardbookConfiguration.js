import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";
import { cardbookHTMLUtils } from "../cardbookHTMLUtils.mjs";
import { cardbookHTMLDates } from "../cardbookHTMLDates.mjs";
import { cardbookHTMLNotification } from "../cardbookHTMLNotification.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
import { cardbookNewPreferences } from "../preferences/cardbookNewPreferences.mjs";

var wdw_cardbookConfiguration = {

	allCustomFields: {},
	allIMPPs: {},
	coreTypes: {},
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
	updateOperations: {},
	customListsFields: ['kindCustom', 'memberCustom'],
	defaultAutocompleteRestrictSearchFields: "firstname|lastname",
	multilineFields: [ 'email', 'tel', 'adr', 'impp', 'url' ],
	dateFields: [ 'bday', 'anniversary', 'deathdate' ],
	notAllowedCustoms: [ 'X-ABDATE', 'X-ABLABEL', 'X-CATEGORIES', 'X-MOZILLA-HTML' ],
	defaultKindCustom: "X-ADDRESSBOOKSERVER-KIND",
	defaultMemberCustom: "X-ADDRESSBOOKSERVER-MEMBER",

	addProgressBar: function (aType, aTotal, aDone) {
		if (!wdw_cardbookConfiguration.updateOperations[aType]) {
			wdw_cardbookConfiguration.updateOperations[aType] = {};
		}
		if (!wdw_cardbookConfiguration.updateOperations[aType].total) {
			wdw_cardbookConfiguration.updateOperations[aType].total = 0;
		}
		if (!wdw_cardbookConfiguration.updateOperations[aType].done) {
			wdw_cardbookConfiguration.updateOperations[aType].done = 0;
		}
		if (aTotal) {
			wdw_cardbookConfiguration.updateOperations[aType].total = aTotal;
		}
		if (aDone) {
			wdw_cardbookConfiguration.updateOperations[aType].done = aDone;
		}
		if (wdw_cardbookConfiguration.updateOperations[aType].total) {
			let name = `updateProgressmeter${aType}`;
			let parent = "progressmeterBox";
			if (!document.getElementById(name)) {
				let progressmeterBox = document.getElementById(parent);
				cardbookHTMLTools.addHTMLPROGRESS(progressmeterBox, name);
			}
			if (wdw_cardbookConfiguration.updateOperations[aType].done) {
				let value = Math.round(wdw_cardbookConfiguration.updateOperations[aType].done / wdw_cardbookConfiguration.updateOperations[aType].total * 100);
				document.getElementById(name).value = value;
			}
			if (wdw_cardbookConfiguration.updateOperations[aType].done == wdw_cardbookConfiguration.updateOperations[aType].total) {
				cardbookHTMLTools.deleteRows(parent);
				wdw_cardbookConfiguration.updateOperations[aType].state = "ended";
				wdw_cardbookConfiguration.updateOperations[aType].done = 0;
				wdw_cardbookConfiguration.setRestrictConcurrentState(false);
			}
		}
	},

	checkUpdateOperationState: function (aType) {
		if (!wdw_cardbookConfiguration.updateOperations[aType]) {
			wdw_cardbookConfiguration.updateOperations[aType] = {};
		}
		if (wdw_cardbookConfiguration.updateOperations[aType].state &&
			wdw_cardbookConfiguration.updateOperations[aType].state == "started") {
			return false;
		} else {
			wdw_cardbookConfiguration.updateOperations[aType].state = "started";
			wdw_cardbookConfiguration.setRestrictConcurrentState(true);
			return true;
		}
	},

	setRestrictConcurrentState: function (aDisabledState) {
		for (let node of document.querySelectorAll(".restrictConcurrent")) {
			cardbookHTMLTools.disableNode(node, aDisabledState);
		}
	},

	customFieldCheck: function (aTextBox) {
		let value = aTextBox.value.trim();
		if (value == "") {
			aTextBox.value = "X-";
		} else {
			aTextBox.value = value.toUpperCase();
		}
	},

	openLink: async function (aLink) {
		await messenger.runtime.sendMessage({query: "cardbook.openExternalURL", link: aLink})
	},

	sortTable: async function (aTableName) {
		let table = document.getElementById(aTableName);
		let order = table.getAttribute("data-sort-order") == "ascending" ? 1 : -1;
		let columnName = table.getAttribute("data-sort-column");
		
		let columnArray = wdw_cardbookConfiguration.getTableMapArray(columnName);
		let columnType = wdw_cardbookConfiguration.getTableMapType(columnName);
		let data = wdw_cardbookConfiguration.getTableData(aTableName);

		if (data && data.length) {
			if (columnType == "number") {
				cardbookHTMLUtils.sortMultipleArrayByNumber(data, columnArray, order);
			} else {
				cardbookHTMLUtils.sortMultipleArrayByString(data, columnArray, order);
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
			await wdw_cardbookConfiguration.displayIMPPs();
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

	clickTree: async function (aEvent) {
		if (aEvent.target.tagName.toLowerCase() == "td") {
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
				await wdw_cardbookConfiguration.selectIMPPs();
			} else if (table.id == "customFieldsTable") {
				wdw_cardbookConfiguration.selectCustomFields();
			} else if (table.id == "orgTreeTable") {
				wdw_cardbookConfiguration.selectOrg();
			} else if (table.id == "fieldsTreeTable") {
				wdw_cardbookConfiguration.selectField();
			}
		}
	},

	doubleClickTree: function (aEvent) {
		let tableName = aEvent.target.closest("table").id;
		if (aEvent.target.tagName.toLowerCase() == "th") {
			return;
		} else if (aEvent.target.tagName.toLowerCase() == "td") {
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
			} else if (tableName == "fieldsTreeTable") {
				wdw_cardbookConfiguration.renameField();
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
		if (aEvent.target.tagName.toLowerCase() == "th" || aEvent.target.tagName.toLowerCase() == "img") {
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
			let ABType = cardbookHTMLUtils.getRadioValue("ABtypesCategoryRadiogroup");
			let type = cardbookHTMLUtils.getRadioValue("typesCategoryRadiogroup");
			if (wdw_cardbookConfiguration.allTypes[ABType] && wdw_cardbookConfiguration.allTypes[ABType][type]) {
				return wdw_cardbookConfiguration.allTypes[ABType][type];
			} else {
				return;
			}
		} else if (aTableName == "emailsCollectionTable") {
			return wdw_cardbookConfiguration.allEmailsCollections;
		} else if (aTableName == "IMPPsTable") {
			let type = cardbookHTMLUtils.getRadioValue("imppsCategoryRadiogroup");
			return wdw_cardbookConfiguration.allIMPPs[type];
		} else if (aTableName == "customFieldsTable") {
			let type = cardbookHTMLUtils.getRadioValue("customFieldsCategoryRadiogroup");
			return wdw_cardbookConfiguration.allCustomFields[type];
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

	loadTitle: async function () {
		let cbVersion = await cardbookHTMLUtils.getPrefValue("addonVersion");
		document.title = messenger.i18n.getMessage("cardbookPrefTitle") + " (" + cbVersion + ")";
	},

	translateFields: async function (aFieldList) {
		let fields = aFieldList.split('|');
		let result = [];
		for (let field of fields) {
			let label = await messenger.runtime.sendMessage({query: "cardbook.getTranslatedField", value: field});
			result.push(label);
		}
		return cardbookHTMLUtils.cleanArray(result).join('|');
	},

	loadAutocompleteRestrictSearchFields: async function () {
		wdw_cardbookConfiguration.autocompleteRestrictSearchFields = await cardbookHTMLUtils.getPrefValue("autocompleteRestrictSearchFields");
		if (wdw_cardbookConfiguration.autocompleteRestrictSearchFields == "") {
			wdw_cardbookConfiguration.autocompleteRestrictSearchFields = wdw_cardbookConfiguration.defaultAutocompleteRestrictSearchFields;
		}
		document.getElementById('autocompleteRestrictSearchFieldsTextBox').value = await wdw_cardbookConfiguration.translateFields(wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
	},

	chooseAutocompleteRestrictSearchFieldsButton: async function () {
		let url = "chrome/content/csvTranslator/wdw_csvTranslator.html";
		let params = new URLSearchParams();
		params.set("mode", "choice");
		params.set("fields", wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
		params.set("includePref", false);
		params.set("lineHeader", true);
		let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
												url: `${url}?${params.toString()}`,
												type: "popup"});
	},

	saveAutocompleteRestrictSearchFields: async function (aParams) {
		wdw_cardbookConfiguration.autocompleteRestrictSearchFields = aParams.fields.split(',').join('|');
		document.getElementById('autocompleteRestrictSearchFieldsTextBox').value = aParams.labels.split(',').join('|');
		wdw_cardbookConfiguration.preferenceChanged('autocompleteRestrictSearch');
	},

	resetAutocompleteRestrictSearchFieldsButton: async function () {
		wdw_cardbookConfiguration.autocompleteRestrictSearchFields = wdw_cardbookConfiguration.defaultAutocompleteRestrictSearchFields;
		document.getElementById('autocompleteRestrictSearchFieldsTextBox').value = await wdw_cardbookConfiguration.translateFields(wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
		wdw_cardbookConfiguration.preferenceChanged('autocompleteRestrictSearch');
	},

	validateAutocompleteRestrictSearchFields: async function () {
		if (wdw_cardbookConfiguration.checkUpdateOperationState("enableShortSearch")) {
			await cardbookHTMLUtils.setPrefValue("autocompleteRestrictSearch", document.getElementById('autocompleteRestrictSearchCheckBox').checked);
			if (document.getElementById('autocompletionCheckBox').checked && document.getElementById('autocompleteRestrictSearchCheckBox').checked) {
				await cardbookHTMLUtils.setPrefValue("autocompleteRestrictSearchFields", wdw_cardbookConfiguration.autocompleteRestrictSearchFields);
				await messenger.runtime.sendMessage({query: "cardbook.disableShortSearch"});
				await messenger.runtime.sendMessage({query: "cardbook.enableShortSearch"});
			} else {
				await messenger.runtime.sendMessage({query: "cardbook.disableShortSearch"});
				wdw_cardbookConfiguration.updateOperations["enableShortSearch"].state = "ended";
				wdw_cardbookConfiguration.setRestrictConcurrentState(false);
			}
		}
	},

	loadPrefEmailPref: async function () {
		wdw_cardbookConfiguration.preferEmailPrefOld = await cardbookHTMLUtils.getPrefValue("preferEmailPref");
	},

	validatePrefEmailPref: async function () {
		if (wdw_cardbookConfiguration.checkUpdateOperationState("changePrefEmail")) {
			let newCheck = document.getElementById('preferEmailPrefCheckBox').checked;
			if (newCheck !== wdw_cardbookConfiguration.preferEmailPrefOld) {
				wdw_cardbookConfiguration.preferEmailPrefOld = newCheck;
				await cardbookHTMLUtils.setPrefValue("preferEmailPref", newCheck);
				await messenger.runtime.sendMessage({query: "cardbook.changePrefEmail", value: newCheck});
			}
		}
	},

	loadEncryptionPref: async function () {
		wdw_cardbookConfiguration.encryptionPrefOld = await cardbookHTMLUtils.getPrefValue("localDataEncryption");
	},

	validateEncryptionPref: async function () {
		if (wdw_cardbookConfiguration.checkUpdateOperationState("crypto")) {
			let newCheck = document.getElementById('localDataEncryptionEnabledCheckBox').checked;
			if (newCheck !== wdw_cardbookConfiguration.encryptionPrefOld) {
				await cardbookHTMLUtils.setPrefValue("localDataEncryption", newCheck);
				if (newCheck) {
					await messenger.runtime.sendMessage({query: "cardbook.encryptDBs"});
				} else {
					await messenger.runtime.sendMessage({query: "cardbook.decryptDBs"});
				}
				let version = await messenger.runtime.sendMessage({query: "cardbook.getEncryptorVersion"});
				await cardbookHTMLUtils.setPrefValue("localDataEncryption.validatedVersion", version);
				wdw_cardbookConfiguration.encryptionPrefOld = newCheck;
			}
		}
	},

	loadAdrFormula: async function () {
		let adrFormula = await cardbookHTMLUtils.getPrefValue("adrFormula");
		document.getElementById('adrFormulaTextBox').value = adrFormula.replace(/\n/g, "\\n").trim();
		document.getElementById('formulaMemberLabel1').textContent = "{{1}} : " + messenger.i18n.getMessage("postOfficeLabel");
		document.getElementById('formulaMemberLabel2').textContent = "{{2}} : " + messenger.i18n.getMessage("extendedAddrLabel");
		document.getElementById('formulaMemberLabel3').textContent = "{{3}} : " + messenger.i18n.getMessage("streetLabel");
		document.getElementById('formulaMemberLabel4').textContent = "{{4}} : " + messenger.i18n.getMessage("localityLabel");
		document.getElementById('formulaMemberLabel5').textContent = "{{5}} : " + messenger.i18n.getMessage("regionLabel");
		document.getElementById('formulaMemberLabel6').textContent = "{{6}} : " + messenger.i18n.getMessage("postalCodeLabel");
		document.getElementById('formulaMemberLabel7').textContent = "{{7}} : " + messenger.i18n.getMessage("countryLabel");
		document.getElementById('formulaSampleTextBox1').value = messenger.i18n.getMessage("postOfficeLabel");
		document.getElementById('formulaSampleTextBox2').value = messenger.i18n.getMessage("extendedAddrLabel");
		document.getElementById('formulaSampleTextBox3').value = messenger.i18n.getMessage("streetLabel");
		document.getElementById('formulaSampleTextBox4').value = messenger.i18n.getMessage("localityLabel");
		document.getElementById('formulaSampleTextBox5').value = messenger.i18n.getMessage("regionLabel");
		document.getElementById('formulaSampleTextBox6').value = messenger.i18n.getMessage("postalCodeLabel");
		document.getElementById('formulaSampleTextBox7').value = messenger.i18n.getMessage("countryLabel");
		await wdw_cardbookConfiguration.changeAdrPreview();
	},

	resetAdrFormula: function () {
		let defaultAdrFormula = messenger.i18n.getMessage("addressFormatFormula");
		document.getElementById('adrFormulaTextBox').value = defaultAdrFormula.replace(/\n/g, "\\n").trim();
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
						document.getElementById('formulaSampleTextBox7').value ];
		document.getElementById('adrPreviewTextBox').textContent = await messenger.runtime.sendMessage({query: "cardbook.formatAddress", address: address, addressFormula: addressFormula});
	},

	validateAdrFormula: async function () {
		await wdw_cardbookConfiguration.changeAdrPreview();
		if (document.getElementById('adrFormulaTextBox').value == "") {
			wdw_cardbookConfiguration.resetAdrFormula();
		}
		// to be sure the pref is saved (resetting its value does not save the preference)
		await cardbookHTMLUtils.setPrefValue("adrFormula", document.getElementById('adrFormulaTextBox').value.replace(/\\n/g, "\n").trim());
	},

	loadEventEntryTitle: async function () {
		let eventEntryTitle = await cardbookHTMLUtils.getPrefValue("eventEntryTitle");
		if (eventEntryTitle == "") {
			document.getElementById('calendarEntryTitleTextBox').value=messenger.i18n.getMessage("eventEntryTitleMessage");
		}
		document.getElementById('eventEntryTimeDesc1').textContent = "%1$S : " + messenger.i18n.getMessage("fnLabel");
		document.getElementById('eventEntryTimeDesc2').textContent = "%2$S : " + messenger.i18n.getMessage("ageLabel");
		document.getElementById('eventEntryTimeDesc3').textContent = "%3$S : " + messenger.i18n.getMessage("yearLabel");
		document.getElementById('eventEntryTimeDesc4').textContent = "%4$S : " + messenger.i18n.getMessage("nameLabel");
		let type = messenger.i18n.getMessage("localPage.type.label");
		let fieldType = [];
		for (let field of wdw_cardbookConfiguration.dateFields) {
			fieldType.push(messenger.i18n.getMessage(`${field}Label`));
		}
		fieldType.push(messenger.i18n.getMessage("eventInNoteEventPrefix"));
		let detail = fieldType.join(" - ");
		document.getElementById('eventEntryTimeDesc5').textContent = "%5$S : " + `${type} [ ${detail} ]`;
	},

	showTab: async function () {
		let urlParams = new URLSearchParams(window.location.search);
		let showTab = urlParams.get("showTab");
		if (showTab) {
			await wdw_cardbookConfiguration.showPane(showTab);
		}
	},

	cardbookAutoComplete: function () {
		let view1 = !document.getElementById('autocompletionCheckBox').checked;
		cardbookHTMLTools.disableNode(document.getElementById('autocompleteSearch'), view1);
		let view2 = !(document.getElementById('autocompletionCheckBox').checked && document.getElementById('autocompleteRestrictSearchCheckBox').checked);
		cardbookHTMLTools.disableNode(document.getElementById('autocompleteRestrictSearchvBox'), view2);
	},

	validateAutoComplete: async function () {
		wdw_cardbookConfiguration.cardbookAutoComplete();
		await cardbookHTMLUtils.setPrefValue("autocompletion", document.getElementById('autocompletionCheckBox').checked);
	},

	remindViaPopup: function () {
		if (document.getElementById('showPopupOnStartupCheckBox').checked || document.getElementById('showPeriodicPopupCheckBox').checked) {
			document.getElementById('showPopupEvenIfNoBirthdayCheckBox').disabled=false;
			document.getElementById('showPopupEvenIfNoBirthdayLabel').classList.remove("disabled");
		} else {
			document.getElementById('showPopupEvenIfNoBirthdayCheckBox').disabled=true;
			document.getElementById('showPopupEvenIfNoBirthdayLabel').classList.add("disabled");
		}
		document.getElementById('periodicPopupTimeTextBox').disabled=!document.getElementById('showPeriodicPopupCheckBox').checked;
		if (document.getElementById('showPeriodicPopupCheckBox').checked) {
			document.getElementById('periodicPopupTimeLabel').classList.remove("disabled");
		} else {
			document.getElementById('periodicPopupTimeLabel').classList.add("disabled");
		}
	},

	validateShowPopupOnStartup: async function () {
		wdw_cardbookConfiguration.remindViaPopup();
		await cardbookHTMLUtils.setPrefValue("showPopupOnStartup", document.getElementById('showPopupOnStartupCheckBox').checked);
	},

	validateShowPeriodicPopup: async function () {
		wdw_cardbookConfiguration.remindViaPopup();
		await cardbookHTMLUtils.setPrefValue("showPeriodicPopup", document.getElementById('showPeriodicPopupCheckBox').checked);
	},

	wholeDay: function () {
		document.getElementById('calendarEntryTimeTextBox').disabled=document.getElementById('calendarEntryWholeDayCheckBox').checked;
		if (document.getElementById('calendarEntryWholeDayCheckBox').checked) {
			document.getElementById('calendarEntryTimeLabel').classList.remove("disabled");
		} else {
			document.getElementById('calendarEntryTimeLabel').classList.add("disabled");
		}
	},

	validateEventEntryWholeDay: async function () {
		wdw_cardbookConfiguration.wholeDay();
		await cardbookHTMLUtils.setPrefValue("eventEntryWholeDay", document.getElementById('calendarEntryWholeDayCheckBox').checked);
	},

	LightningInstallation: function () {
		if (document.getElementById('calendarEntryWholeDayCheckBox').checked) {
			document.getElementById('calendarEntryTimeTextBox').disabled=true;
			document.getElementById('calendarEntryTimeLabel').classList.add("disabled");
		} else {
			document.getElementById('calendarEntryTimeTextBox').disabled=false;
			document.getElementById('calendarEntryTimeLabel').classList.remove("disabled");
		}
	},

	selectField: function() {
		let btnEdit = document.getElementById("renameFieldsLabel");
		// note and street are textarea fields
		let disabledFields = [ "addressbook", "categories", "fn",  "key", "gender", "bday", "anniversary", "deathdate", "country", "email", "tel", "adr", "impp", "url", "event", "note", "street", "list"];
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("fieldsTreeTable");
		if (wdw_cardbookConfiguration.allFields.length && currentIndex) {
			if (disabledFields.includes(wdw_cardbookConfiguration.allFields[currentIndex][2])) {
				btnEdit.disabled = true;
			} else {
				btnEdit.disabled = false;
			}
		} else {
			btnEdit.disabled = true;
		}
	},

	loadFields: async function () {
		wdw_cardbookConfiguration.allFields = [];
		wdw_cardbookConfiguration.allFields = await messenger.runtime.sendMessage({query: "cardbook.getEditionFields"});
		wdw_cardbookConfiguration.changeFieldsMainCheckbox();
	},
	
	displayFields: function () {
		let headers = [ "selected", "fields", "convertTo" ];
		let data = wdw_cardbookConfiguration.allFields.map(x => [ x[0], x[1], x[3] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		let tableParameters = { "events": [ [ "click", wdw_cardbookConfiguration.clickTree ],
											[ "dblclick", wdw_cardbookConfiguration.doubleClickTree ],
											[ "keydown", wdw_cardbookConfiguration.keyDownTree ] ] };
		let dataId = 1;
		cardbookHTMLTools.addTreeTable("fieldsTreeTable", headers, data, dataParameters, null, tableParameters, null, dataId);
		wdw_cardbookConfiguration.changeFieldsMainCheckbox();
	},
	
	renameField: async function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("fieldsTreeTable");
		let btnEdit = document.getElementById("renameFieldsLabel");
		if (wdw_cardbookConfiguration.allFields.length && currentIndex && !btnEdit.disabled) {
			let url = "chrome/content/configuration/wdw_cardbookConfigurationEditField.html";
			let params = new URLSearchParams();
			params.set("enabled", wdw_cardbookConfiguration.allFields[currentIndex][0]);
			params.set("label", wdw_cardbookConfiguration.allFields[currentIndex][1]);
			params.set("field", wdw_cardbookConfiguration.allFields[currentIndex][2]);
			params.set("convertionLabel", wdw_cardbookConfiguration.allFields[currentIndex][3]);
			params.set("convertion", wdw_cardbookConfiguration.allFields[currentIndex][4]);
			let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
													url: `${url}?${params.toString()}`,
													type: "popup"});
		}
	},

	saveField: async function (aParams) {
		let result = [];
		for (let field of wdw_cardbookConfiguration.allFields) {
			if (aParams.field === field[2]) {
				result.push([(aParams.enabled === "true"), aParams.label, aParams.field, aParams.convertionLabel, 
									aParams.convertion]);
			} else {
				result.push(field);
			}
		}
		wdw_cardbookConfiguration.allFields = JSON.parse(JSON.stringify(result));
		wdw_cardbookConfiguration.sortTable("fieldsTreeTable");
		wdw_cardbookConfiguration.preferenceChanged('fields');
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
		let state = false;
		if (checkbox.checked) {
			state = true;
		}
		let tmpArray = [];
		for (let field of wdw_cardbookConfiguration.allFields) {
			tmpArray.push([state, field[1], field[2], field[3], field[4]]);
		}

		wdw_cardbookConfiguration.allFields = JSON.parse(JSON.stringify(tmpArray));
		wdw_cardbookConfiguration.sortTable("fieldsTreeTable");
		wdw_cardbookConfiguration.preferenceChanged('fields');
	},
	
	validateFields: async function (aFields) {
		let result = {};
		let fields = wdw_cardbookConfiguration.allFields;
		if (aFields) {
			fields = aFields;
		}
		for (let field of fields) {
			if (field[0] == "allFields") {
				result = "allFields";
				break;
			} else {
				result[field[2]] = { displayed: field[0], function: field[4] };
			}
		}
		await cardbookHTMLUtils.setPrefValue("fieldsNameList", JSON.stringify(result));
	},

	validateFieldsFromOrgOrCustom: async function (aOldField, aNewField) {
		let fields = JSON.parse(JSON.stringify(wdw_cardbookConfiguration.allFields));

		if (fields[0][0] == "allFields") {
			await wdw_cardbookConfiguration.loadFields();
			wdw_cardbookConfiguration.sortTable("fieldsTreeTable");
		} else if (aOldField || aNewField) {
			if (aOldField && !aNewField) {
				fields = fields.filter( x => x[2] != aOldField);
				await wdw_cardbookConfiguration.validateFields(fields);
			} else if (aNewField && !aOldField) {
				fields.push([true, aNewField.replace(/^org\./, ""), aNewField])
				await wdw_cardbookConfiguration.validateFields(fields);
			} else {
				for (let field of fields) {
					if (field[2] == aOldField) {
						field[2] = aNewField;
						break;
					}
				}
				await wdw_cardbookConfiguration.validateFields(fields);
			}
			// need to reload the edition fields
			await wdw_cardbookConfiguration.loadFields();
			wdw_cardbookConfiguration.sortTable("fieldsTreeTable");
		}
	},

	loadDiscoveryAccounts: async function () {
		let pref = await cardbookHTMLUtils.getPrefValue("discoveryAccountsNameList");
		let urls = await messenger.runtime.sendMessage({query: "cardbook.getAllURLsToDiscover"});
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
		let headers = [];
		let data = wdw_cardbookConfiguration.allDiscoveryAccounts.map(x => [ x[0], x[1] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		let rowParameters = {};
		let tableParameters = { "events": [ [ "click", wdw_cardbookConfiguration.clickTree ],
											[ "dblclick", wdw_cardbookConfiguration.doubleClickTree ],
											[ "keydown", wdw_cardbookConfiguration.keyDownTree ] ] };
		cardbookHTMLTools.addTreeTable("discoveryAccountsTable", headers, data, dataParameters, rowParameters, tableParameters);
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
		if (checkbox.checked) {
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
	
	validateDiscoveryAccounts: async function () {
		let tmpArray = [];
		for (let discoveryAccount of wdw_cardbookConfiguration.allDiscoveryAccounts) {
			if (discoveryAccount[0]) {
				tmpArray.push(discoveryAccount[2]);
			}
		}
		await cardbookHTMLUtils.setPrefValue("discoveryAccountsNameList", tmpArray.join(','));
	},

	loadAddressbooks: async function () {
		let pref = await cardbookHTMLUtils.getPrefValue("addressBooksNameList");
		let tmpArray = [];
		let accounts = await cardbookNewPreferences.getAllPrefIds();
		for (let dirPrefId of accounts) {
			let enabled = await cardbookNewPreferences.getEnabled(dirPrefId);
			let type = await cardbookNewPreferences.getType(dirPrefId);
			if (enabled && type != "SEARCH") {
				let name = await cardbookNewPreferences.getName(dirPrefId);
				tmpArray.push([name, dirPrefId]);
			}
		}
		cardbookHTMLUtils.sortMultipleArrayByString(tmpArray,0,1);
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
		let headers = [];
		let data = wdw_cardbookConfiguration.allAddressbooks.map(x => [ x[0], x[1] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		let rowParameters = {};
		let tableParameters = { "events": [ [ "click", wdw_cardbookConfiguration.clickTree ],
											[ "dblclick", wdw_cardbookConfiguration.doubleClickTree ],
											[ "keydown", wdw_cardbookConfiguration.keyDownTree ] ] };
		cardbookHTMLTools.addTreeTable("addressbooksTable", headers, data, dataParameters, rowParameters, tableParameters);
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
		if (checkbox.checked) {
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
	
	validateAddressbooks: async function () {
		let checkbox = document.getElementById('addressbooksCheckbox');
		if (checkbox.checked) {
			await cardbookHTMLUtils.setPrefValue("addressBooksNameList", "allAddressBooks");
		} else {
			let tmpArray = [];
			for (let addressbook of wdw_cardbookConfiguration.allAddressbooks) {
				if (addressbook[0]) {
					tmpArray.push(addressbook[2]);
				}
			}
			await cardbookHTMLUtils.setPrefValue("addressBooksNameList", tmpArray.join(','));
		}
	},
	
	loadCalendars: async function () {
		let pref = await cardbookHTMLUtils.getPrefValue("calendarsNameList");
		let tmpArray = [];
		tmpArray = await messenger.runtime.sendMessage({query: "cardbook.getCalendars"});
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
		let headers = [];
		let data = wdw_cardbookConfiguration.allCalendars.map(x => [ x[0], x[1] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		let rowParameters = {};
		let tableParameters = { "events": [ [ "click", wdw_cardbookConfiguration.clickTree ],
											[ "dblclick", wdw_cardbookConfiguration.doubleClickTree ],
											[ "keydown", wdw_cardbookConfiguration.keyDownTree ] ] };
		cardbookHTMLTools.addTreeTable("calendarsTable", headers, data, dataParameters, rowParameters, tableParameters);
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
		if (checkbox.checked) {
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
	
	validateCalendars: async function () {
		let tmpArray = [];
		for (let calendar of wdw_cardbookConfiguration.allCalendars) {
			if (calendar[0]) {
				tmpArray.push(calendar[2]);
			}
		}
		await cardbookHTMLUtils.setPrefValue("calendarsNameList", tmpArray.join(','));
	},

	resetCalendarEntryTitle: async function () {
		document.getElementById('calendarEntryTitleTextBox').value = messenger.i18n.getMessage("eventEntryTitleMessage");
		await cardbookHTMLUtils.setPrefValue("eventEntryTitle", messenger.i18n.getMessage("eventEntryTitleMessage"));
	},

	validateEventEntryTitle: async function () {
		if (document.getElementById('calendarEntryTitleTextBox').value == "") {
			await wdw_cardbookConfiguration.resetCalendarEntryTitle();
		}
		await cardbookHTMLUtils.setPrefValue("eventEntryTitle", document.getElementById('calendarEntryTitleTextBox').value);
	},

	getEmailAccountName: async function(aEmailAccountId) {
		if (aEmailAccountId == "allMailAccounts") {
			return messenger.i18n.getMessage(aEmailAccountId);
		}
		for (let account of await browser.accounts.list()) {
			if (account.type == "pop3" || account.type == "imap") {
				for (let identity of account.identities) {
					if (aEmailAccountId == identity.id) {
						return identity.email;
					}
				}
			}
		}
		return "";			
	},

	getABName: async function(dirPrefId) {
		let exclusive = await cardbookHTMLUtils.getPrefValue("exclusive");
		if (!exclusive) {
			for (let addrbook of await browser.addressBooks.list()) {
				if (addrbook.id == dirPrefId) {
					return addrbook.name;
				}
			}
		}
		let name = await cardbookNewPreferences.getName(dirPrefId);
		return name;
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

	loadVCards: async function () {
		let results = [];
		results = await cardbookNewPreferences.getAllVCards();
		let count = 0;
		for (let result of results) {
			let emailAccountName = await wdw_cardbookConfiguration.getEmailAccountName(result[1]);
			if (emailAccountName != "") {
				let index = count++;
				let fn = result[3];
				fn = await messenger.runtime.sendMessage({query: "cardbook.getFn", id: result[2]+"::"+result[3]});
				wdw_cardbookConfiguration.allVCards.push([(result[0] == "true"), index.toString(), emailAccountName, result[1], fn, result[2], result[3], result[4]]);
			}
		}
	},
	
	displayVCards: function () {
		let headers = [ "accountsVCardsEnabled", "accountsVCardsMailName", "accountsVCardsFn", "accountsVCardsFileName" ];
		let data = wdw_cardbookConfiguration.allVCards.map(x => [ x[0], x[2], x[4], x[7] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		let rowParameters = {};
		let tableParameters = { "events": [ [ "click", wdw_cardbookConfiguration.clickTree ],
											[ "dblclick", wdw_cardbookConfiguration.doubleClickTree ],
											[ "keydown", wdw_cardbookConfiguration.keyDownTree ] ] };
		let sortFunction = wdw_cardbookConfiguration.clickToSort;
		cardbookHTMLTools.addTreeTable("accountsVCardsTable", headers, data, dataParameters, rowParameters, tableParameters, sortFunction);
		wdw_cardbookConfiguration.selectVCard();
	},
	
	addVCard: async function () {
		let url = "chrome/content/configuration/wdw_cardbookConfigurationAddVcards.html";
		let params = new URLSearchParams();
		params.set("enabled", "true");
		params.set("id", "");
		params.set("emailAccountName", "");
		params.set("emailAccountId", "");
		params.set("addressBookId", "");
		params.set("contactName", "");
		params.set("contactId", "");
		params.set("fileName", "");
		let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
												url: `${url}?${params.toString()}`,
												type: "popup"});
	},

	renameVCard: async function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("accountsVCardsTable");
		if (currentIndex) {
			let url = "chrome/content/configuration/wdw_cardbookConfigurationAddVcards.html";
			let params = new URLSearchParams();
			params.set("enabled", wdw_cardbookConfiguration.allVCards[currentIndex][0]);
			params.set("id", wdw_cardbookConfiguration.allVCards[currentIndex][1]);
			params.set("emailAccountName", wdw_cardbookConfiguration.allVCards[currentIndex][2]);
			params.set("emailAccountId", wdw_cardbookConfiguration.allVCards[currentIndex][3]);
			params.set("addressBookId", wdw_cardbookConfiguration.allVCards[currentIndex][5]);
			params.set("contactName", wdw_cardbookConfiguration.allVCards[currentIndex][4]);
			params.set("contactId", wdw_cardbookConfiguration.allVCards[currentIndex][6]);
			params.set("fileName", wdw_cardbookConfiguration.allVCards[currentIndex][7]);
			let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
													url: `${url}?${params.toString()}`,
													type: "popup"});
		}
	},
	
	saveVCard: function (aParams) {
		let result = [];
		for (let vCard of wdw_cardbookConfiguration.allVCards) {
			if (aParams.id != "" && aParams.id === vCard[1]) {
				result.push([(aParams.enabled === "true"), aParams.id, aParams.emailAccountName, aParams.emailAccountId, aParams.contactName, 
									aParams.addressBookId, aParams.contactId, aParams.fileName]);
			} else {
				result.push(vCard);
			}
		}
		if (aParams.id == "") {
			result.push([true, wdw_cardbookConfiguration.allVCards.length.toString(), 
				aParams.emailAccountName, aParams.emailAccountId, aParams.contactName, aParams.addressBookId, aParams.contactId, aParams.fileName]);
		}
		wdw_cardbookConfiguration.allVCards = JSON.parse(JSON.stringify(result));
		wdw_cardbookConfiguration.sortTable("accountsVCardsTable");
		wdw_cardbookConfiguration.preferenceChanged('attachedVCard');
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

	validateVCards: async function () {
		await cardbookHTMLUtils.delBranch(cardbookNewPreferences.prefCardBookAccountVCards);
		for (let i = 0; i < wdw_cardbookConfiguration.allVCards.length; i++) {
				await cardbookHTMLUtils.setPrefValue(cardbookNewPreferences.prefCardBookAccountVCards + i.toString(), wdw_cardbookConfiguration.allVCards[i][0].toString() + "::" + wdw_cardbookConfiguration.allVCards[i][3]
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

	loadRestrictions: async function () {
		let results = [];
		results = await cardbookNewPreferences.getAllRestrictions();
		let count = 0;
		// no way to detect that a mail account was deleted
		let cleanup = false;
		for (let result of results) {
			let emailAccountName = await wdw_cardbookConfiguration.getEmailAccountName(result[2]);
			if (emailAccountName != "") {
				let ABName = await wdw_cardbookConfiguration.getABName(result[3]);
				if (ABName != "") {
					let index = count++;
					let categoryId = "";
					let categoryName = "";
					if (result[4]) {
						categoryId = result[3] + "::categories::" + result[4];
						categoryName = result[4];
					}
					wdw_cardbookConfiguration.allRestrictions.push([(result[0] == "true"), index.toString(), emailAccountName, result[2],
																	ABName, result[3], categoryName, categoryId, messenger.i18n.getMessage(result[1] + "Label"), result[1]]);
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
		let headers = ["accountsRestrictionsEnabled", "accountsRestrictionsIncludeName", "accountsRestrictionsMailName", "accountsRestrictionsABName", "accountsRestrictionsCatName"];
		let data = wdw_cardbookConfiguration.allRestrictions.map(x => [ x[0], x[8], x[2], x[4], x[6] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		let rowParameters = {};
		let tableParameters = { "events": [ [ "click", wdw_cardbookConfiguration.clickTree ],
											[ "dblclick", wdw_cardbookConfiguration.doubleClickTree ],
											[ "keydown", wdw_cardbookConfiguration.keyDownTree ] ] };
		let sortFunction = wdw_cardbookConfiguration.clickToSort;
		cardbookHTMLTools.addTreeTable("accountsRestrictionsTable", headers, data, dataParameters, rowParameters, tableParameters, sortFunction);
		wdw_cardbookConfiguration.selectRestriction();
	},

	addRestriction: async function () {
		let url = "chrome/content/configuration/wdw_cardbookConfigurationAddEmails.html";
		let params = new URLSearchParams();
		params.set("enabled", "true");
		params.set("id", "");
		params.set("emailAccountName", "");
		params.set("emailAccountId", "");
		params.set("addressBookName", "");
		params.set("addressBookId", "");
		params.set("categoryName", "");
		params.set("categoryId", "");
		params.set("includeName", "");
		params.set("includeCode", "");
		params.set("context", "Restriction");
		let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
												url: `${url}?${params.toString()}`,
												type: "popup"});
	},
	
	renameRestriction: async function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("accountsRestrictionsTable");
		if (currentIndex) {
			let url = "chrome/content/configuration/wdw_cardbookConfigurationAddEmails.html";
			let params = new URLSearchParams();
			params.set("enabled", wdw_cardbookConfiguration.allRestrictions[currentIndex][0]);
			params.set("id", wdw_cardbookConfiguration.allRestrictions[currentIndex][1]);
			params.set("emailAccountName", wdw_cardbookConfiguration.allRestrictions[currentIndex][2]);
			params.set("emailAccountId", wdw_cardbookConfiguration.allRestrictions[currentIndex][3]);
			params.set("addressBookName", wdw_cardbookConfiguration.allRestrictions[currentIndex][4]);
			params.set("addressBookId", wdw_cardbookConfiguration.allRestrictions[currentIndex][5]);
			params.set("categoryName", wdw_cardbookConfiguration.allRestrictions[currentIndex][6]);
			params.set("categoryId", wdw_cardbookConfiguration.allRestrictions[currentIndex][7]);
			params.set("includeName", wdw_cardbookConfiguration.allRestrictions[currentIndex][8]);
			params.set("includeCode", wdw_cardbookConfiguration.allRestrictions[currentIndex][9]);
			params.set("context", "Restriction");
			let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
													url: `${url}?${params.toString()}`,
													type: "popup"});
		}
	},

	saveRestriction: function (aParams) {
		let result = [];
		for (let restriction of wdw_cardbookConfiguration.allRestrictions) {
			if (aParams.id != "" && aParams.id == restriction[1]) {
				result.push([(aParams.enabled === "true"), aParams.id, aParams.emailAccountName, aParams.emailAccountId, aParams.addressBookName, aParams.addressBookId,
								aParams.categoryName, aParams.categoryId, aParams.includeName, aParams.includeCode]);
			} else {
				result.push(restriction);
			}
		}
		if (aParams.id == "") {
			result.push([true, wdw_cardbookConfiguration.allRestrictions.length.toString(), aParams.emailAccountName, aParams.emailAccountId, aParams.addressBookName, aParams.addressBookId,
				aParams.categoryName, aParams.categoryId, aParams.includeName, aParams.includeCode]);
		}
		wdw_cardbookConfiguration.allRestrictions = JSON.parse(JSON.stringify(result));
		wdw_cardbookConfiguration.sortTable("accountsRestrictionsTable");
		wdw_cardbookConfiguration.preferenceChanged('accountsRestrictions');
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
	
	validateRestrictions: async function () {
		await cardbookHTMLUtils.delBranch(cardbookNewPreferences.prefCardBookAccountRestrictions);
		for (let i = 0; i < wdw_cardbookConfiguration.allRestrictions.length; i++) {
			await cardbookHTMLUtils.setPrefValue(cardbookNewPreferences.prefCardBookAccountRestrictions + i.toString(), wdw_cardbookConfiguration.allRestrictions[i][0].toString() + "::" + wdw_cardbookConfiguration.allRestrictions[i][9]
												+ "::" + wdw_cardbookConfiguration.allRestrictions[i][3] + "::" + wdw_cardbookConfiguration.allRestrictions[i][5] + "::" + wdw_cardbookConfiguration.allRestrictions[i][6]);
		}
	},

	selectType: function() {
		let btnEdit = document.getElementById("renameTypeLabel");
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("typesTable");
		let ABType = cardbookHTMLUtils.getRadioValue("ABtypesCategoryRadiogroup");
		let type = cardbookHTMLUtils.getRadioValue("typesCategoryRadiogroup");
		if (wdw_cardbookConfiguration.allTypes[ABType] && wdw_cardbookConfiguration.allTypes[ABType][type].length && currentIndex) {
			btnEdit.disabled = false;
		} else {
			btnEdit.disabled = true;
		}
		document.getElementById("deleteTypeLabel").disabled = btnEdit.disabled;
		let btnAdd = document.getElementById("addTypeLabel");
		if (wdw_cardbookConfiguration.coreTypes[ABType].addnew == true) {
			btnAdd.disabled = false;
		} else {
			btnAdd.disabled = true;
		}
	},

	loadTypes: async function () {
		wdw_cardbookConfiguration.coreTypes = await messenger.runtime.sendMessage({query: "cardbook.getCoreTypes"});
		let ABTypes = [ 'CARDDAV', 'GOOGLE2', 'APPLE', 'OFFICE365', 'YAHOO' ];
		for (let i in ABTypes) {
			let myABType = ABTypes[i];
			wdw_cardbookConfiguration.allTypes[myABType] = {};
			for (let field of wdw_cardbookConfiguration.multilineFields) {
				wdw_cardbookConfiguration.allTypes[myABType][field] = await messenger.runtime.sendMessage({query: "cardbook.getTypes", ABType: myABType, type: field, reset: false});
			}
		}
	},

	displayTypes: function () {
		let ABType = cardbookHTMLUtils.getRadioValue("ABtypesCategoryRadiogroup");
		let type = cardbookHTMLUtils.getRadioValue("typesCategoryRadiogroup");
		let headers = [ "typesLabel" ];
		let data = [];
		if (wdw_cardbookConfiguration.allTypes[ABType] && wdw_cardbookConfiguration.allTypes[ABType][type]) {
			data = wdw_cardbookConfiguration.allTypes[ABType][type].map(x => [ x[0] ]);
		}
		let dataParameters = [];
		let rowParameters = {};
		let tableParameters = { "events": [ [ "click", wdw_cardbookConfiguration.clickTree ],
											[ "dblclick", wdw_cardbookConfiguration.doubleClickTree ],
											[ "keydown", wdw_cardbookConfiguration.keyDownTree ] ] };
		let sortFunction = wdw_cardbookConfiguration.clickToSort;
		cardbookHTMLTools.addTreeTable("typesTable", headers, data, dataParameters, rowParameters, tableParameters, sortFunction);
		wdw_cardbookConfiguration.selectType();
	},

	addType: async function () {
		let ABType = cardbookHTMLUtils.getRadioValue("ABtypesCategoryRadiogroup");
		if (wdw_cardbookConfiguration.coreTypes[ABType].addnew == true) {
		 	let type = cardbookHTMLUtils.getRadioValue("typesCategoryRadiogroup");
		 	let validationList = [];
		 	for (let value of wdw_cardbookConfiguration.allTypes[ABType][type]) {
		 		validationList.push(value[0]);
		 		validationList.push(value[1]);
		 	}
			let url = "chrome/content/configuration/wdw_cardbookConfigurationRenameField.html";
			let params = new URLSearchParams();
			params.set("ABType", ABType);
			params.set("type", type);
			params.set("value", "");
			params.set("context", "AddType");
			params.set("validationList", validationList);
			let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
														url: `${url}?${params.toString()}`,
														type: "popup"});
		}
	},
	
	renameType: async function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("typesTable");
		if (currentIndex) {
			let ABType = cardbookHTMLUtils.getRadioValue("ABtypesCategoryRadiogroup");
			let type = cardbookHTMLUtils.getRadioValue("typesCategoryRadiogroup");
			let validationList = [];
			for (let value of wdw_cardbookConfiguration.allTypes[ABType][type]) {
				validationList.push(value[0]);
				validationList.push(value[1]);
			}
			let value = wdw_cardbookConfiguration.allTypes[ABType][type][currentIndex][0];
			let valueType = wdw_cardbookConfiguration.allTypes[ABType][type][currentIndex][1];
			validationList = validationList.filter(element => element != value);

			let url = "chrome/content/configuration/wdw_cardbookConfigurationRenameField.html";
			let params = new URLSearchParams();
			params.set("ABType", ABType);
			params.set("type", type);
			params.set("value", value);
			params.set("valueType", valueType);
			params.set("context", "EditType");
			params.set("validationList", validationList);
			let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
														url: `${url}?${params.toString()}`,
														type: "popup"});
		}
	},
	
	saveType: function (aParams) {
		let result = [];
		let found = false;
		let cores = wdw_cardbookConfiguration.coreTypes[aParams.ABType][aParams.type].map(x => x[0]);
		for (let value of wdw_cardbookConfiguration.allTypes[aParams.ABType][aParams.type]) {
			if (aParams.valueType === value[1]) {
				if (cores.includes(aParams.valueType)) {
					result.push([aParams.value, aParams.valueType]);
				} else {
					result.push([aParams.value, aParams.value]);
				}
				found = true;
			} else {
				result.push(value);
			}
		}
		if (!found) {
			result.push([aParams.value, aParams.value]);
		}
		wdw_cardbookConfiguration.allTypes[aParams.ABType][aParams.type] = JSON.parse(JSON.stringify(result));
		wdw_cardbookConfiguration.sortTable("typesTable");
		wdw_cardbookConfiguration.preferenceChanged('customTypes');
	},
	
	deleteType: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("typesTable");
		if (currentIndex) {
			let ABType = cardbookHTMLUtils.getRadioValue("ABtypesCategoryRadiogroup");
			let type = cardbookHTMLUtils.getRadioValue("typesCategoryRadiogroup");
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
	
	resetType: async function () {
		let ABType = cardbookHTMLUtils.getRadioValue("ABtypesCategoryRadiogroup");
		let type = cardbookHTMLUtils.getRadioValue("typesCategoryRadiogroup");
		await cardbookHTMLUtils.delBranch(cardbookNewPreferences.prefCardBookCustomTypes + ABType + "." + type);
		wdw_cardbookConfiguration.allTypes[ABType][type] = await messenger.runtime.sendMessage({query: "cardbook.getTypes", ABType: ABType, type: type, reset: true});
		wdw_cardbookConfiguration.sortTable("typesTable");
		wdw_cardbookConfiguration.preferenceChanged('customTypes');
	},

	validateTypes: async function () {
		await cardbookHTMLUtils.delBranch(cardbookNewPreferences.prefCardBookCustomTypes);
		let ABTypes = [ 'CARDDAV', 'GOOGLE2', 'APPLE', 'OFFICE365', 'YAHOO' ];
		for (let i in ABTypes) {
			let ABType = ABTypes[i];
			for (let j in wdw_cardbookConfiguration.multilineFields) {
				let type = wdw_cardbookConfiguration.multilineFields[j];
				// searching for new or updated
				for (let k = 0; k < wdw_cardbookConfiguration.allTypes[ABType][type].length; k++) {
					let isItANew = true;
					let label = wdw_cardbookConfiguration.allTypes[ABType][type][k][0];
					let code = wdw_cardbookConfiguration.allTypes[ABType][type][k][1];
					for (let l = 0; l < wdw_cardbookConfiguration.coreTypes[ABType][type].length; l++) {
						let coreCodeType = wdw_cardbookConfiguration.coreTypes[ABType][type][l][0];
						if (code == coreCodeType) {
							if (label != messenger.i18n.getMessage(coreCodeType)) {
								await cardbookHTMLUtils.setPrefValue(cardbookNewPreferences.prefCardBookCustomTypes + ABType + "." + type + "." + code + ".value", label);
							}
							isItANew = false;
							break;
						}
					}
					if (isItANew) {
						await cardbookHTMLUtils.setPrefValue(cardbookNewPreferences.prefCardBookCustomTypes + ABType + "." + type + "." + code + ".value", label);
					}
				}
				// searching for deleted
				for (let k = 0; k < wdw_cardbookConfiguration.coreTypes[ABType][type].length; k++) {
					let coreCodeType = wdw_cardbookConfiguration.coreTypes[ABType][type][k][0];
					let wasItDeleted = true;
					for (let l = 0; l < wdw_cardbookConfiguration.allTypes[ABType][type].length; l++) {
						let code = wdw_cardbookConfiguration.allTypes[ABType][type][l][1];
						if (code == coreCodeType) {
							wasItDeleted = false;
							break;
						}
					}
					if (wasItDeleted) {
						await cardbookHTMLUtils.setPrefValue(cardbookNewPreferences.prefCardBookCustomTypes + ABType + "." + type + "." + coreCodeType + ".disabled", true);
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

	loadEmailsCollection: async function () {
		let results = [];
		results = await cardbookNewPreferences.getAllEmailsCollections();
		let count = 0;
		for (let result of results) {
			let emailAccountName = await wdw_cardbookConfiguration.getEmailAccountName(result[1]);
			if (emailAccountName != "") {
				let ABName = await wdw_cardbookConfiguration.getABName(result[2]);
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
		let headers = [ "emailsCollectionEnabled", "emailsCollectionMailName", "emailsCollectionABName", "emailsCollectionCatName" ];
		let data = wdw_cardbookConfiguration.allEmailsCollections.map(x => [ x[0], x[2], x[4], x[6] ]);
		let dataParameters = [];
		dataParameters[0] = {"events": [ [ "click", wdw_cardbookConfiguration.enableOrDisableCheckbox ] ] };
		let rowParameters = {};
		let tableParameters = { "events": [ [ "click", wdw_cardbookConfiguration.clickTree ],
											[ "dblclick", wdw_cardbookConfiguration.doubleClickTree ],
											[ "keydown", wdw_cardbookConfiguration.keyDownTree ] ] };
		cardbookHTMLTools.addTreeTable("emailsCollectionTable", headers, data, dataParameters, rowParameters, tableParameters);
		wdw_cardbookConfiguration.selectEmailsCollection();
	},
	
	addEmailsCollection: async function () {
		let url = "chrome/content/configuration/wdw_cardbookConfigurationAddEmails.html";
		let params = new URLSearchParams();
		params.set("enabled", "true");
		params.set("id", "");
		params.set("emailAccountName", "");
		params.set("emailAccountId", "");
		params.set("addressBookName", "");
		params.set("addressBookId", "");
		params.set("categoryName", "");
		params.set("categoryId", "");
		params.set("includeName", "");
		params.set("includeCode", "");
		params.set("context", "EmailsCollection");
		let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
												url: `${url}?${params.toString()}`,
												type: "popup"});
	},
	
	renameEmailsCollection: async function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("emailsCollectionTable");
		if (currentIndex) {
			let url = "chrome/content/configuration/wdw_cardbookConfigurationAddEmails.html";
			let params = new URLSearchParams();
			params.set("enabled", wdw_cardbookConfiguration.allEmailsCollections[currentIndex][0]);
			params.set("id", wdw_cardbookConfiguration.allEmailsCollections[currentIndex][1]);
			params.set("emailAccountName", wdw_cardbookConfiguration.allEmailsCollections[currentIndex][2]);
			params.set("emailAccountId", wdw_cardbookConfiguration.allEmailsCollections[currentIndex][3]);
			params.set("addressBookName", wdw_cardbookConfiguration.allEmailsCollections[currentIndex][4]);
			params.set("addressBookId", wdw_cardbookConfiguration.allEmailsCollections[currentIndex][5]);
			params.set("categoryName", wdw_cardbookConfiguration.allEmailsCollections[currentIndex][6]);
			params.set("categoryId", wdw_cardbookConfiguration.allEmailsCollections[currentIndex][7]);
			params.set("context", "EmailsCollection");
			let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
													url: `${url}?${params.toString()}`,
													type: "popup"});
		}
	},

	saveEmailsCollection: function (aParams) {
		let result = [];
		for (let emailscollection of wdw_cardbookConfiguration.allEmailsCollections) {
			if (aParams.id != "" && aParams.id == emailscollection[1]) {
				result.push([(aParams.enabled === "true"), aParams.id, aParams.emailAccountName, aParams.emailAccountId, aParams.addressBookName, aParams.addressBookId,
								aParams.categoryName, aParams.categoryId]);
		} else {
				result.push(emailscollection);
			}
		}
		if (aParams.id == "") {
			result.push([true, wdw_cardbookConfiguration.allEmailsCollections.length.toString(), aParams.emailAccountName, aParams.emailAccountId, aParams.addressBookName, aParams.addressBookId,
				aParams.categoryName, aParams.categoryId]);
		}
		wdw_cardbookConfiguration.allEmailsCollections = JSON.parse(JSON.stringify(result));
		wdw_cardbookConfiguration.sortTable("emailsCollectionTable");
		wdw_cardbookConfiguration.preferenceChanged('emailsCollection');
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
	
	validateEmailsCollection: async function () {
		await cardbookHTMLUtils.delBranch(cardbookNewPreferences.prefCardBookEmailsCollection);
		for (let i = 0; i < wdw_cardbookConfiguration.allEmailsCollections.length; i++) {
			await cardbookHTMLUtils.setPrefValue(cardbookNewPreferences.prefCardBookEmailsCollection + i.toString(), wdw_cardbookConfiguration.allEmailsCollections[i][0].toString() + "::" + wdw_cardbookConfiguration.allEmailsCollections[i][3]
													+ "::" + wdw_cardbookConfiguration.allEmailsCollections[i][5] + "::" + wdw_cardbookConfiguration.allEmailsCollections[i][6]);
		}
	},
	
	loadURLPhonesPassword: async function () {
		let URL = await cardbookHTMLUtils.getPrefValue("URLPhoneURL");
		document.getElementById('URLPhoneURLTextBox').value = URL;
		let user = await cardbookHTMLUtils.getPrefValue("URLPhoneUser");
		document.getElementById('URLPhoneUserTextBox').value = user;
		document.getElementById('URLPhonePasswordTextBox').value = await messenger.runtime.sendMessage({query: "cardbook.getPassword", user: user, url: URL});
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

	displayURLPhones: async function () {
		let type = cardbookHTMLUtils.getRadioValue("imppsCategoryRadiogroup");
		if (type == "impp") {
			document.getElementById("URLPhoneGroupbox").classList.add("hidden");
		} else {
			document.getElementById("URLPhoneGroupbox").classList.remove("hidden");
			if (wdw_cardbookConfiguration.allIMPPs['tel'].length == 1 && wdw_cardbookConfiguration.allIMPPs['tel'][0][2].toLowerCase() == "url") {
				cardbookHTMLTools.disableNode(document.getElementById('URLPhoneGroupbox'), false);
			} else {
				cardbookHTMLTools.disableNode(document.getElementById('URLPhoneGroupbox'), true);
			}
		}
		await wdw_cardbookConfiguration.loadURLPhonesPassword();
	},
	
	validateURLPhonesPassword: async function () {
		let URL = document.getElementById('URLPhoneURLTextBox').value;
		await cardbookHTMLUtils.setPrefValue("URLPhoneURL", URL);
		let user = document.getElementById('URLPhoneUserTextBox').value;
		await cardbookHTMLUtils.setPrefValue("URLPhoneUser", user);
		let password = document.getElementById('URLPhonePasswordTextBox').value;
		if (password) {
			await messenger.runtime.sendMessage({query: "cardbook.removePassword", user: wdw_cardbookConfiguration.URLPhoneUserOld, url: wdw_cardbookConfiguration.URLPhoneURLOld});
			await messenger.runtime.sendMessage({query: "cardbook.rememberPassword", user: user, url: URL, pwd: password, save: true});
		} else {
			await messenger.runtime.sendMessage({query: "cardbook.removePassword", user: user, url: URL});
		}
		wdw_cardbookConfiguration.URLPhoneURLOld = URL;
		wdw_cardbookConfiguration.URLPhoneUserOld = user;
	},

	resetIMPP: async function () {
		await cardbookHTMLUtils.delBranch(cardbookNewPreferences.prefCardBookIMPPs);
		await messenger.runtime.sendMessage({query: "cardbook.setDefaultImppTypes"});
		wdw_cardbookConfiguration.allIMPPs['impp'] = [];
		wdw_cardbookConfiguration.allIMPPs['impp'] = cardbookHTMLUtils.sortMultipleArrayByString(await cardbookNewPreferences.getAllIMPPs(),1,1);
		wdw_cardbookConfiguration.sortTable("IMPPsTable");
		wdw_cardbookConfiguration.preferenceChanged('impps');
	},

	selectIMPPsCategory: function() {
		wdw_cardbookConfiguration.sortTable("IMPPsTable");
	},

	selectIMPPs: async function() {
		let type = cardbookHTMLUtils.getRadioValue("imppsCategoryRadiogroup");
		let resetButton = document.getElementById("resetIMPPLabel");
		if (type == "impp") {
			resetButton.classList.remove("hidden");
		} else {
			resetButton.classList.add("hidden");
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
		await wdw_cardbookConfiguration.displayURLPhones();
	},

	loadIMPPs: async function () {
		wdw_cardbookConfiguration.allIMPPs['impp'] = [];
		wdw_cardbookConfiguration.allIMPPs['impp'] = cardbookHTMLUtils.sortMultipleArrayByString(await cardbookNewPreferences.getAllIMPPs(),1,1);
		wdw_cardbookConfiguration.allIMPPs['tel'] = [];
		wdw_cardbookConfiguration.allIMPPs['tel'] = cardbookHTMLUtils.sortMultipleArrayByString(await cardbookNewPreferences.getAllTels(),1,1);
	},
	
	displayIMPPs: async function () {
		let headers = [ "IMPPCodeHeader", "IMPPLabelHeader", "IMPPProtocolHeader" ];
		let type = cardbookHTMLUtils.getRadioValue("imppsCategoryRadiogroup");
		let data = [];
		if (wdw_cardbookConfiguration.allIMPPs[type]) {
			data = wdw_cardbookConfiguration.allIMPPs[type].map(x => [ x[0], x[1], x[2] ]);
		}
		let dataParameters = [];
		let rowParameters = {};
		let tableParameters = { "events": [ [ "click", wdw_cardbookConfiguration.clickTree ],
											[ "dblclick", wdw_cardbookConfiguration.doubleClickTree ],
											[ "keydown", wdw_cardbookConfiguration.keyDownTree ] ] };
		let sortFunction = wdw_cardbookConfiguration.clickToSort;
		cardbookHTMLTools.addTreeTable("IMPPsTable", headers, data, dataParameters, rowParameters, tableParameters, sortFunction);
		await wdw_cardbookConfiguration.selectIMPPs();
	},

	addIMPP: async function () {
		let type = cardbookHTMLUtils.getRadioValue("imppsCategoryRadiogroup");
		let url = "chrome/content/configuration/wdw_cardbookConfigurationAddIMPP.html";
		let params = new URLSearchParams();
		params.set("id", "");
		params.set("type", type);
		params.set("code", "");
		params.set("label", "");
		params.set("protocol", "");
		let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
												url: `${url}?${params.toString()}`,
												type: "popup"});
	},
	
	renameIMPP: async function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("IMPPsTable");
		if (currentIndex) {
			let type = cardbookHTMLUtils.getRadioValue("imppsCategoryRadiogroup");
			let url = "chrome/content/configuration/wdw_cardbookConfigurationAddIMPP.html";
			let params = new URLSearchParams();
			params.set("id", wdw_cardbookConfiguration.allIMPPs[type][currentIndex][3]);
			params.set("type", type);
			params.set("code", wdw_cardbookConfiguration.allIMPPs[type][currentIndex][0]);
			params.set("label", wdw_cardbookConfiguration.allIMPPs[type][currentIndex][1]);
			params.set("protocol", wdw_cardbookConfiguration.allIMPPs[type][currentIndex][2]);
			let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
													url: `${url}?${params.toString()}`,
													type: "popup"});
		}
	},
	
	saveIMPPs: function (aParams) {
		let result = [];
		for (let impp of wdw_cardbookConfiguration.allIMPPs[aParams.type]) {
			if (aParams.id != "" && aParams.id == impp[3]) {
				result.push([aParams.code, aParams.label, aParams.protocol, aParams.id]);
			} else {
				result.push(impp);
			}
		}
		if (aParams.id == "") {
			result.push([aParams.code, aParams.label, aParams.protocol, wdw_cardbookConfiguration.allIMPPs[aParams.type].length]);
		}
		wdw_cardbookConfiguration.allIMPPs[aParams.type] = JSON.parse(JSON.stringify(result));
		wdw_cardbookConfiguration.sortTable("IMPPsTable");
		wdw_cardbookConfiguration.preferenceChanged('impps');
	},

	deleteIMPP: function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("IMPPsTable");
		if (currentIndex) {
			let type = cardbookHTMLUtils.getRadioValue("imppsCategoryRadiogroup");
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

	validateIMPPs: async function () {
		await cardbookHTMLUtils.delBranch(cardbookNewPreferences.prefCardBookIMPPs);
		for (let i in wdw_cardbookConfiguration.allIMPPs['impp']) {
			await cardbookHTMLUtils.setPrefValue(cardbookNewPreferences.prefCardBookIMPPs + i, wdw_cardbookConfiguration.allIMPPs['impp'][i][0] + ":" + wdw_cardbookConfiguration.allIMPPs['impp'][i][1] + ":" + wdw_cardbookConfiguration.allIMPPs['impp'][i][2]);
		}
		await cardbookHTMLUtils.delBranch(cardbookNewPreferences.prefCardBookTels);
		for (let i in wdw_cardbookConfiguration.allIMPPs['tel']) {
			await cardbookHTMLUtils.setPrefValue(cardbookNewPreferences.prefCardBookTels + i, wdw_cardbookConfiguration.allIMPPs['tel'][i][0] + ":" + wdw_cardbookConfiguration.allIMPPs['tel'][i][1] + ":" + wdw_cardbookConfiguration.allIMPPs['tel'][i][2]);
		}
	},

	selectCustomFields: function() {
		let btnEdit = document.getElementById("renameCustomFieldsLabel");
		let btnUp = document.getElementById("upCustomFieldsLabel");
		let btnDown = document.getElementById("downCustomFieldsLabel");
		let type = cardbookHTMLUtils.getRadioValue("customFieldsCategoryRadiogroup");
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

	loadCustomFields: async function () {
		wdw_cardbookConfiguration.allCustomFields = await cardbookNewPreferences.getAllCustomFields();
	},

	displayCustomFields: function () {
		let headers = [ "customFieldRankHeader", "customFieldCodeHeader", "customFieldLabelHeader" ];
		let type = cardbookHTMLUtils.getRadioValue("customFieldsCategoryRadiogroup");
		let data = [];
		if (wdw_cardbookConfiguration.allCustomFields[type]) {
			data = wdw_cardbookConfiguration.allCustomFields[type].map(x => [ x[2], x[0], x[1] ]);
		}
		let dataParameters = [];
		let rowParameters = {};
		let tableParameters = { "events": [ [ "click", wdw_cardbookConfiguration.clickTree ],
											[ "dblclick", wdw_cardbookConfiguration.doubleClickTree ],
											[ "keydown", wdw_cardbookConfiguration.keyDownTree ] ] };
		let sortFunction = wdw_cardbookConfiguration.clickToSort;
		let dataId = 1;
		cardbookHTMLTools.addTreeTable("customFieldsTable", headers, data, dataParameters, rowParameters, tableParameters, sortFunction, dataId);
		wdw_cardbookConfiguration.selectCustomFields();
	},

	upCustomFields: function () {
		let type = cardbookHTMLUtils.getRadioValue("customFieldsCategoryRadiogroup");
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
		let type = cardbookHTMLUtils.getRadioValue("customFieldsCategoryRadiogroup");
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

	addCustomFields: async function () {
		let url = "chrome/content/configuration/wdw_cardbookConfigurationAddCustomField.html";
		let params = new URLSearchParams();
		params.set("id", "");
		params.set("type", cardbookHTMLUtils.getRadioValue("customFieldsCategoryRadiogroup"));
		params.set("code", "");
		params.set("label", "");
		let validationList = wdw_cardbookConfiguration.getAllCustomsFields();
		params.set("validationList", validationList);
		let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
												url: `${url}?${params.toString()}`,
												type: "popup"});
	},

	renameCustomFields: async function () {
		let type = cardbookHTMLUtils.getRadioValue("customFieldsCategoryRadiogroup");
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("customFieldsTable");
		if (wdw_cardbookConfiguration.allCustomFields[type] && wdw_cardbookConfiguration.allCustomFields[type].length && currentIndex) {
			let url = "chrome/content/configuration/wdw_cardbookConfigurationAddCustomField.html";
			let params = new URLSearchParams();
			params.set("id", wdw_cardbookConfiguration.allCustomFields[type][currentIndex][2]);
			params.set("type", type);
			let code = wdw_cardbookConfiguration.allCustomFields[type][currentIndex][0];
			params.set("code", code);
			params.set("label", wdw_cardbookConfiguration.allCustomFields[type][currentIndex][1]);
			let validationList = wdw_cardbookConfiguration.getAllCustomsFields();
			validationList = validationList.filter(element => element != code);
			params.set("validationList", validationList);
			let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
													url: `${url}?${params.toString()}`,
													type: "popup"});
		}
	},

	saveCustomFields: function (aParams) {
		let result = [];
		for (let customField of wdw_cardbookConfiguration.allCustomFields[aParams.type]) {
			if (aParams.id != "" && aParams.id == customField[2]) {
				result.push([aParams.code, aParams.label, aParams.id]);
			} else {
				result.push([customField[0], customField[1], customField[2]]);
			}
		}
		if (aParams.id == "") {
			result.push([aParams.code, aParams.label, wdw_cardbookConfiguration.allCustomFields[aParams.type].length]);
		}
		wdw_cardbookConfiguration.allCustomFields[aParams.type] = JSON.parse(JSON.stringify(result));
		wdw_cardbookConfiguration.sortTable("customFieldsTable");
		if (aParams.id == "") {
			wdw_cardbookConfiguration.preferenceChanged('customFields', null, aParams.code);
		} else {
			wdw_cardbookConfiguration.preferenceChanged('customFields', aParams.code, aParams.code);
		}
	},

	deleteCustomFields: function () {
		let type = cardbookHTMLUtils.getRadioValue("customFieldsCategoryRadiogroup");
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

	validateCustomFields: async function () {
		for (let type in wdw_cardbookConfiguration.allCustomFields) {
			await cardbookHTMLUtils.delBranch(cardbookNewPreferences.prefCardBookCustomFields + type);
			for (let customField of wdw_cardbookConfiguration.allCustomFields[type]) {
				let name = cardbookNewPreferences.prefCardBookCustomFields + type + "." + customField[2];
				let value = customField[0] + ":" + customField[1];
				await cardbookHTMLUtils.setPrefValue(name, value);
			}
		}
		await messenger.runtime.sendMessage({query: "cardbook.loadCustoms"});
	},

	resetCustomListFields: function () {
		document.getElementById('kindCustomTextBox').value = wdw_cardbookConfiguration.defaultKindCustom;
		document.getElementById('memberCustomTextBox').value = wdw_cardbookConfiguration.defaultMemberCustom;
		wdw_cardbookConfiguration.validateCustomListValues();
	},

	validateCustomListValues: function () {
		let notificationMessage = document.getElementById("notificationMessage");
		for (let i in wdw_cardbookConfiguration.customListsFields) {
			let value = document.getElementById(wdw_cardbookConfiguration.customListsFields[i] + 'TextBox').value;
			let validationListOrig = wdw_cardbookConfiguration.getAllCustomsFields();
			let validationList = cardbookHTMLUtils.arrayUnique(validationListOrig);
			if (validationList.length != validationListOrig.length) {
				cardbookHTMLNotification.setNotification(notificationMessage, "warning", "customFieldsErrorUNIQUE");
				return;
			} else if (value.toUpperCase() !== value) {
				cardbookHTMLNotification.setNotification(notificationMessage, "warning", "customFieldsErrorUPPERCASE", [value]);
				return;
			} else if (!(value.toUpperCase().startsWith("X-"))) {
				cardbookHTMLNotification.setNotification(notificationMessage, "warning", "customFieldsErrorX", [value]);
				return;
			} else if (wdw_cardbookConfiguration.notAllowedCustoms.indexOf(value.toUpperCase()) != -1) {
				cardbookHTMLNotification.setNotification(notificationMessage, "warning", "customFieldsErrorFIELD", [value]);
				return;
			} else if (value.includes(":") || value.includes(",") || value.includes(";") || value.includes(".")) {
				cardbookHTMLNotification.setNotification(notificationMessage, "warning", "customFieldsErrorCHAR", [value]);
				return;
			}
		}
		cardbookHTMLNotification.setNotification(notificationMessage, "OK");
		wdw_cardbookConfiguration.preferenceChanged('customListFields');
	},

	loadCustomListFields: async function () {
		for (let i in wdw_cardbookConfiguration.customListsFields) {
			document.getElementById(wdw_cardbookConfiguration.customListsFields[i] + 'TextBox').value = await cardbookHTMLUtils.getPrefValue(wdw_cardbookConfiguration.customListsFields[i]);
		}
	},

	validateCustomListFields: async function () {
		for (let i in wdw_cardbookConfiguration.customListsFields) {
			await cardbookHTMLUtils.setPrefValue(wdw_cardbookConfiguration.customListsFields[i], document.getElementById(wdw_cardbookConfiguration.customListsFields[i] + 'TextBox').value);
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

	loadOrg: async function () {
		let orgStructure = await cardbookHTMLUtils.getPrefValue("orgStructure");
		if (orgStructure != "") {
			let tmpArray = cardbookHTMLUtils.unescapeArray(cardbookHTMLUtils.escapeString(orgStructure).split(";"));
			for (let i = 0; i < tmpArray.length; i++) {
				wdw_cardbookConfiguration.allOrg.push([tmpArray[i], i]);
			}
		} else {
			wdw_cardbookConfiguration.allOrg = [];
		}
	},
	
	displayOrg: function () {
		let headers = [ "orgRank", "orgLabel" ];
		let data = [];
		if (wdw_cardbookConfiguration.allOrg) {
			data = wdw_cardbookConfiguration.allOrg.map(x => [ x[1], x[0] ]);
		}
		let dataParameters = [];
		let rowParameters = {};
		let tableParameters = { "events": [ [ "click", wdw_cardbookConfiguration.clickTree ],
											[ "dblclick", wdw_cardbookConfiguration.doubleClickTree ],
											[ "keydown", wdw_cardbookConfiguration.keyDownTree ] ] };
		let sortFunction = wdw_cardbookConfiguration.clickToSort;
		let dataId = 1;
		cardbookHTMLTools.addTreeTable("orgTreeTable", headers, data, dataParameters, rowParameters, tableParameters, sortFunction, dataId);
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

	addOrg: async function () {
		let validationList = JSON.parse(JSON.stringify(wdw_cardbookConfiguration.allOrg));
		let url = "chrome/content/configuration/wdw_cardbookConfigurationRenameField.html";
		let params = new URLSearchParams();
		params.set("id", "");
		params.set("value", "");
		params.set("context", "Org");
		params.set("validationList", validationList);
		let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
													url: `${url}?${params.toString()}`,
													type: "popup"});
	},
	
	renameOrg: async function () {
		let currentIndex = wdw_cardbookConfiguration.getTableCurrentIndex("orgTreeTable");
		if (wdw_cardbookConfiguration.allOrg.length && currentIndex) {
			let label = wdw_cardbookConfiguration.allOrg[currentIndex][0];
			let id = wdw_cardbookConfiguration.allOrg[currentIndex][1];
			let validationList = JSON.parse(JSON.stringify(wdw_cardbookConfiguration.allOrg));
			validationList = validationList.filter(element => element != label);

			let url = "chrome/content/configuration/wdw_cardbookConfigurationRenameField.html";
			let params = new URLSearchParams();
			params.set("id", id);
			params.set("value", label);
			params.set("context", "Org");
			params.set("validationList", validationList);
			let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
														url: `${url}?${params.toString()}`,
														type: "popup"});
		}
	},
	
	saveOrg: function (aParams) {
		let result = [];
		let oldValue = "";
		for (let i = 0; i < wdw_cardbookConfiguration.allOrg.length; i++) {
			if (aParams.id != "" && aParams.id == wdw_cardbookConfiguration.allOrg[i][1]) {
				oldValue = wdw_cardbookConfiguration.allOrg[i][0];
				result.push([aParams.value, i]);
			} else {
				result.push([wdw_cardbookConfiguration.allOrg[i][0], i]);
			}
		}
		if (aParams.id == "") {
			result.push([aParams.value, wdw_cardbookConfiguration.allOrg.length]);
		}
		wdw_cardbookConfiguration.allOrg = JSON.parse(JSON.stringify(result));
		wdw_cardbookConfiguration.sortTable("orgTreeTable");
		wdw_cardbookConfiguration.preferenceChanged('orgStructure');
		if (aParams.id == "") {
			wdw_cardbookConfiguration.preferenceChanged('orgStructure', null, "org_" + aParams.value);
		} else {
			wdw_cardbookConfiguration.preferenceChanged('orgStructure', "org_" + oldValue, "org_" + aParams.value);
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
			wdw_cardbookConfiguration.preferenceChanged('orgStructure', "org_" + label, null);
		}
	},
	
	validateOrg: async function () {
		let tmpArray = [];
		for (let org of wdw_cardbookConfiguration.allOrg) {
			tmpArray.push(cardbookHTMLUtils.escapeStringSemiColon(org[0]));
		}
		await cardbookHTMLUtils.setPrefValue("orgStructure", cardbookHTMLUtils.unescapeStringSemiColon(tmpArray.join(";")));
	},

	loadDateDisplayedFormat: async function () {
		let labelLong = messenger.i18n.getMessage("dateDisplayedFormatLong");
		let labelShort = messenger.i18n.getMessage("dateDisplayedFormatShort");
		let date = new Date();
		let dateString = cardbookHTMLDates.convertDateToDateString(date, "4.0");
		let dateFormattedLong = cardbookHTMLDates.getFormattedDateForDateString(dateString, "4.0", "0");
		document.getElementById('dateDisplayedFormatLong').textContent = labelLong.replace("%P1%", dateFormattedLong);
		let dateFormattedShort = cardbookHTMLDates.getFormattedDateForDateString(dateString, "4.0", "1");
		document.getElementById('dateDisplayedFormatShort').textContent = labelShort.replace("%P1%", dateFormattedShort);
		document.getElementById('dateDisplayedFormatMenulist').value = await cardbookHTMLUtils.getPrefValue("dateDisplayedFormat");
	},

	validateDateDisplayedFormat: async function () {
		await cardbookHTMLUtils.setPrefValue("dateDisplayedFormat", document.getElementById('dateDisplayedFormatMenulist').value);
	},

	loadCountries: async function () {
		let countryList = await messenger.runtime.sendMessage({query: "cardbook.getCountries", useCodeValues: true});
        cardbookHTMLUtils.sortMultipleArrayByString(countryList,1,1);
		let countryMenu = document.getElementById('defaultRegionMenulist');
		let country = await cardbookHTMLUtils.getPrefValue("defaultRegion");
		await cardbookHTMLTools.loadOptions(countryMenu, countryList, country, true);
	},

	validateCountries: async function () {
		await cardbookHTMLUtils.setPrefValue("defaultRegion", document.getElementById('defaultRegionMenulist').value);
	},

	loadInitialSyncDelay: async function () {
		let initialSync = await cardbookHTMLUtils.getPrefValue("initialSync");
		if (!(initialSync)) {
			document.getElementById('initialSyncDelay').classList.add("disabled");
			document.getElementById('initialSyncDelayTextBox').disabled = true;
		}
	},

	validateStatusInformationLineNumber: async function () {
		let value = document.getElementById('statusInformationLineNumberTextBox').value;
		if (value < 10) {
			document.getElementById('statusInformationLineNumberTextBox').value = 10;
			value = 10;
		}
		await messenger.runtime.sendMessage({query: "cardbook.setStatusInformation", value: aValue});
		await cardbookHTMLUtils.setPrefValue("statusInformationLineNumber", value);
	},

	showInitialSync: function () {
		if (document.getElementById('initialSyncCheckBox').checked) {
			document.getElementById('initialSyncDelay').classList.remove("disabled");
			document.getElementById('initialSyncDelayTextBox').disabled = false;
		} else {
			document.getElementById('initialSyncDelay').classList.add("disabled");
			document.getElementById('initialSyncDelayTextBox').disabled = true;
		}
	},

	validateInitialSync: async function () {
		wdw_cardbookConfiguration.showInitialSync();
		await cardbookHTMLUtils.setPrefValue("initialSync", document.getElementById('initialSyncCheckBox').checked);
	},

	validateShowNameAs: async function () {
		await cardbookHTMLUtils.setPrefValue("showNameAs", cardbookHTMLUtils.getRadioValue("showNameAsRadiogroup"));
	},

	validateUseColor: async function () {
		await cardbookHTMLUtils.setPrefValue("useColor", cardbookHTMLUtils.getRadioValue("useColorRadiogroup"));
	},

	showPane: async function (paneID) {
		if (!paneID) {
			return;
		}
		
		let pane = document.getElementById(paneID);
		if (!pane) {
			return;
		}

		let categories = document.getElementById('category-cardbook-Tabbox');
		let item = categories.querySelector(".category[value=" + paneID + "]");
		categories.selectedItem = item;

		for (let button of document.querySelectorAll("#category-cardbook-Tabbox button")) {
			if (button.value == paneID) {
				button.classList.add("active");
			} else {
				button.classList.remove("active");
			}
		}

		for (let node of document.querySelectorAll(".tab-container section")) {
			if (node.id == paneID) {
				node.classList.add("active");
			} else {
				node.classList.remove("active");
			}
		}
		await cardbookHTMLUtils.setPrefValue("prefs.lastSelected", paneID);
	},

	loadPreferenceFields: async function () {
		for (let node of document.querySelectorAll("[preference]")) {
			// set instantApply
			if (node.getAttribute("instantApply") == "true") {
				node.addEventListener("click", function(event) {wdw_cardbookConfiguration.saveInstantApply(event.target);});
				node.addEventListener("change", function(event) {wdw_cardbookConfiguration.saveInstantApply(event.target);});
			}
			
			// fill the preference fields
			let nodeName = node.tagName.toLowerCase();
			let prefName = node.getAttribute("preference");
			let prefType = node.getAttribute("type");
			let prefValue;
			switch (prefType) {
				case "checkbox":
					prefValue = await cardbookHTMLUtils.getPrefValue(prefName);
					break;
				case "string":
				case "text":
				case "number":
				case "radio":
					prefValue = await cardbookHTMLUtils.getPrefValue(prefName);
					break;
				default:
					throw new Error("loadPreferenceFields : prefType null or unknown : " + prefType);
			}
			
			// nodename will have the namespace prefix removed and the value of the type attribute (if any) appended
			switch (nodeName) {
				case "input":
					switch (prefType) {
						case "checkbox":
							node.checked = prefValue;
							break;
						case "string":
						case "text":
						case "number":
						case "password":
							node.setAttribute("value", prefValue);
							break;
						case "radio":
							node.checked = (node.value == prefValue);
							break;
						default:
							node.setAttribute("value", prefValue);
					}
					break;
				case "select":
					node.setAttribute("value", prefValue);
					break;
				default:
					throw new Error("loadPreferenceFields : nodeName unknown : " + nodeName);
			}
		}
	},

	loadInitialPane: async function () {
		let lastSelected = await cardbookHTMLUtils.getPrefValue("prefs.lastSelected");
		if (lastSelected) {
			await wdw_cardbookConfiguration.showPane(lastSelected);
		} else {
			await wdw_cardbookConfiguration.showPane("cardbook-generalPane");
		}
	},

	load: async function () {
		i18n.updateDocument();
		cardbookHTMLRichContext.loadRichContext();
		for (let button of document.querySelectorAll("#category-cardbook-Tabbox button")) {
			button.addEventListener("click", event => wdw_cardbookConfiguration.showPane(event.target.value));
		}

		await wdw_cardbookConfiguration.loadInitialPane();
		await wdw_cardbookConfiguration.loadTitle();
		await wdw_cardbookConfiguration.loadPreferenceFields();
		await wdw_cardbookConfiguration.loadIMPPs();
		wdw_cardbookConfiguration.sortTable("IMPPsTable");
		await wdw_cardbookConfiguration.loadCustomFields();
		wdw_cardbookConfiguration.sortTable("customFieldsTable");
		await wdw_cardbookConfiguration.loadCustomListFields();
		await wdw_cardbookConfiguration.loadOrg();
		wdw_cardbookConfiguration.sortTable("orgTreeTable");
		await wdw_cardbookConfiguration.loadDateDisplayedFormat();
		await wdw_cardbookConfiguration.loadCountries();
		await wdw_cardbookConfiguration.loadDiscoveryAccounts();
		wdw_cardbookConfiguration.sortTable("discoveryAccountsTable");
		// should be after loadCustomFields and loadOrg
		await wdw_cardbookConfiguration.loadFields();
		wdw_cardbookConfiguration.sortTable("fieldsTreeTable");
		await wdw_cardbookConfiguration.loadAddressbooks();
		wdw_cardbookConfiguration.sortTable("addressbooksTable");
		await wdw_cardbookConfiguration.loadCalendars();
		wdw_cardbookConfiguration.sortTable("calendarsTable");
		await wdw_cardbookConfiguration.loadInitialSyncDelay();
		await wdw_cardbookConfiguration.loadVCards();
		wdw_cardbookConfiguration.sortTable("accountsVCardsTable");
		await wdw_cardbookConfiguration.loadRestrictions();
		wdw_cardbookConfiguration.sortTable("accountsRestrictionsTable");
		await wdw_cardbookConfiguration.loadTypes();
		wdw_cardbookConfiguration.sortTable("typesTable");
		await wdw_cardbookConfiguration.loadEmailsCollection();
		wdw_cardbookConfiguration.sortTable("emailsCollectionTable");
		await wdw_cardbookConfiguration.loadPrefEmailPref();
		await wdw_cardbookConfiguration.loadEncryptionPref();
		await wdw_cardbookConfiguration.loadAdrFormula();
		wdw_cardbookConfiguration.remindViaPopup();
		wdw_cardbookConfiguration.wholeDay();
		wdw_cardbookConfiguration.cardbookAutoComplete();
		await wdw_cardbookConfiguration.loadAutocompleteRestrictSearchFields();
		await wdw_cardbookConfiguration.loadEventEntryTitle();
		await wdw_cardbookConfiguration.showTab();

		// checkbox
		document.getElementById("autocompletionCheckBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('autocompletion'));
		document.getElementById("autocompleteRestrictSearchCheckBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('autocompleteRestrictSearch'));
		document.getElementById("debugModeCheckBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('debugMode'));
		document.getElementById("fieldsCheckbox").addEventListener("input", event => wdw_cardbookConfiguration.changedFieldsMainCheckbox());
		document.getElementById("localDataEncryptionEnabledCheckBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('localDataEncryption'));
		document.getElementById("initialSyncCheckBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('initialSync'));
		document.getElementById("discoveryAccountsCheckbox").addEventListener("input", event => wdw_cardbookConfiguration.changedDiscoveryMainCheckbox());
		document.getElementById("preferEmailPrefCheckBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('preferEmailPref'));
		document.getElementById("addressbooksCheckbox").addEventListener("input", event => wdw_cardbookConfiguration.changedAddressbooksMainCheckbox());
		document.getElementById("calendarsCheckbox").addEventListener("input", event => wdw_cardbookConfiguration.changedCalendarsMainCheckbox());
		document.getElementById("showPopupOnStartupCheckBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('showPopupOnStartup'));
		document.getElementById("showPeriodicPopupCheckBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('showPeriodicPopup'));
		document.getElementById("calendarEntryWholeDayCheckBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('eventEntryWholeDay'));

		// radio
		let useColorRadiogroup = cardbookHTMLUtils.getRadioNodes("useColorRadiogroup");
		for (let node of useColorRadiogroup) {
			node.addEventListener("change", event => wdw_cardbookConfiguration.preferenceChanged('useColor'));
		}
		let localizeEngineRadiogroup = cardbookHTMLUtils.getRadioNodes("localizeEngineRadiogroup");
		for (let node of localizeEngineRadiogroup) {
			node.addEventListener("change", event => wdw_cardbookConfiguration.saveInstantApply(event.target));
		}
		let showNameAsRadiogroup = cardbookHTMLUtils.getRadioNodes("showNameAsRadiogroup");
		for (let node of showNameAsRadiogroup) {
			node.addEventListener("change", event => wdw_cardbookConfiguration.preferenceChanged('showNameAs'));
		}
		let localizeTargetRadiogroup = cardbookHTMLUtils.getRadioNodes("localizeTargetRadiogroup");
		for (let node of localizeTargetRadiogroup) {
			node.addEventListener("change", event => wdw_cardbookConfiguration.saveInstantApply(event.target));
		}
		let ABtypesCategoryRadiogroup = cardbookHTMLUtils.getRadioNodes("ABtypesCategoryRadiogroup");
		for (let node of ABtypesCategoryRadiogroup) {
			node.addEventListener("change", event => wdw_cardbookConfiguration.sortTable('typesTable'));
		}
		let typesCategoryRadiogroup = cardbookHTMLUtils.getRadioNodes("typesCategoryRadiogroup");
		for (let node of typesCategoryRadiogroup) {
			node.addEventListener("change", event => wdw_cardbookConfiguration.sortTable('typesTable'));
		}
		let imppsCategoryRadiogroup = cardbookHTMLUtils.getRadioNodes("imppsCategoryRadiogroup");
		for (let node of imppsCategoryRadiogroup) {
			node.addEventListener("change", event => wdw_cardbookConfiguration.selectIMPPsCategory());
		}
		let customFieldsCategoryRadiogroup = cardbookHTMLUtils.getRadioNodes("customFieldsCategoryRadiogroup");
		for (let node of customFieldsCategoryRadiogroup) {
			node.addEventListener("change", event => wdw_cardbookConfiguration.sortTable('customFieldsTable'));
		}
		let solveConflictsRadiogroup = cardbookHTMLUtils.getRadioNodes("solveConflictsRadiogroup");
		for (let node of solveConflictsRadiogroup) {
			node.addEventListener("change", event => wdw_cardbookConfiguration.saveInstantApply(event.target));
		}
		
		// select
		document.getElementById("dateDisplayedFormatMenulist").addEventListener("change", event => wdw_cardbookConfiguration.validateDateDisplayedFormat());
		document.getElementById("defaultRegionMenulist").addEventListener("change", event => wdw_cardbookConfiguration.validateCountries());

		// button
		document.getElementById("chooseAutocompleteRestrictSearchFieldsButton").addEventListener("click", event => wdw_cardbookConfiguration.chooseAutocompleteRestrictSearchFieldsButton());
		document.getElementById("resetAutocompleteRestrictSearchFieldsButton").addEventListener("click", event => wdw_cardbookConfiguration.resetAutocompleteRestrictSearchFieldsButton());
		document.getElementById("addRestrictionLabel").addEventListener("click", event => wdw_cardbookConfiguration.addRestriction());
		document.getElementById("renameRestrictionLabel").addEventListener("click", event => wdw_cardbookConfiguration.renameRestriction());
		document.getElementById("deleteRestrictionLabel").addEventListener("click", event => wdw_cardbookConfiguration.deleteRestriction());
		document.getElementById("resetAdrFormulaButton").addEventListener("click", event => wdw_cardbookConfiguration.resetAdrFormula());
		document.getElementById("renameFieldsLabel").addEventListener("click", event => wdw_cardbookConfiguration.renameField());
		document.getElementById("addTypeLabel").addEventListener("click", event => wdw_cardbookConfiguration.addType());
		document.getElementById("renameTypeLabel").addEventListener("click", event => wdw_cardbookConfiguration.renameType());
		document.getElementById("deleteTypeLabel").addEventListener("click", event => wdw_cardbookConfiguration.deleteType());
		document.getElementById("resetTypeLabel").addEventListener("click", event => wdw_cardbookConfiguration.resetType());
		document.getElementById("addIMPPLabel").addEventListener("click", event => wdw_cardbookConfiguration.addIMPP());
		document.getElementById("renameIMPPLabel").addEventListener("click", event => wdw_cardbookConfiguration.renameIMPP());
		document.getElementById("deleteIMPPLabel").addEventListener("click", event => wdw_cardbookConfiguration.deleteIMPP());
		document.getElementById("resetIMPPLabel").addEventListener("click", event => wdw_cardbookConfiguration.resetIMPP());
		document.getElementById("addCustomFieldsLabel").addEventListener("click", event => wdw_cardbookConfiguration.addCustomFields());
		document.getElementById("renameCustomFieldsLabel").addEventListener("click", event => wdw_cardbookConfiguration.renameCustomFields());
		document.getElementById("deleteCustomFieldsLabel").addEventListener("click", event => wdw_cardbookConfiguration.deleteCustomFields());
		document.getElementById("upCustomFieldsLabel").addEventListener("click", event => wdw_cardbookConfiguration.upCustomFields());
		document.getElementById("downCustomFieldsLabel").addEventListener("click", event => wdw_cardbookConfiguration.downCustomFields());
		document.getElementById("addOrgLabel").addEventListener("click", event => wdw_cardbookConfiguration.addOrg());
		document.getElementById("renameOrgLabel").addEventListener("click", event => wdw_cardbookConfiguration.renameOrg());
		document.getElementById("deleteOrgLabel").addEventListener("click", event => wdw_cardbookConfiguration.deleteOrg());
		document.getElementById("upOrgLabel").addEventListener("click", event => wdw_cardbookConfiguration.upOrg());
		document.getElementById("downOrgLabel").addEventListener("click", event => wdw_cardbookConfiguration.downOrg());
		document.getElementById("resetListButton").addEventListener("click", event => wdw_cardbookConfiguration.resetCustomListFields());
		document.getElementById("addVCardLabel").addEventListener("click", event => wdw_cardbookConfiguration.addVCard());
		document.getElementById("renameVCardLabel").addEventListener("click", event => wdw_cardbookConfiguration.renameVCard());
		document.getElementById("deleteVCardLabel").addEventListener("click", event => wdw_cardbookConfiguration.deleteVCard());
		document.getElementById("addEmailsCollectionLabel").addEventListener("click", event => wdw_cardbookConfiguration.addEmailsCollection());
		document.getElementById("renameEmailsCollectionLabel").addEventListener("click", event => wdw_cardbookConfiguration.renameEmailsCollection());
		document.getElementById("deleteEmailsCollectionLabel").addEventListener("click", event => wdw_cardbookConfiguration.deleteEmailsCollection());
		document.getElementById("resetCalendarEntryTitleButton").addEventListener("click", event => wdw_cardbookConfiguration.resetCalendarEntryTitle());
		document.getElementById("contributeButton").addEventListener("click", event => wdw_cardbookConfiguration.openLink(event.target.value));

		// anchor
		for (let anchor of document.querySelectorAll("#cardbook-helpPane a")) {
			anchor.addEventListener("click", event => wdw_cardbookConfiguration.openLink(event.target.textContent));
		}

		// input
		document.getElementById("adrFormulaTextBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('adrFormula'));
		for (let input of document.querySelectorAll("#formulaMemberTable input")) {
			input.addEventListener("input", event => wdw_cardbookConfiguration.changeAdrPreview());
		}
		document.getElementById("URLPhoneURLTextBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('URLPhonePassword'));
		document.getElementById("URLPhoneUserTextBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('URLPhonePassword'));
		document.getElementById("URLPhonePasswordTextBox").addEventListener("input", event => wdw_cardbookConfiguration.preferenceChanged('URLPhonePassword'));
		for (let input of document.querySelectorAll("#customFieldsDef input")) {
			input.addEventListener("input", event => {
				wdw_cardbookConfiguration.customFieldCheck(event.target);
				wdw_cardbookConfiguration.validateCustomListValues();
			});
		}

		// image
		document.getElementById("URLPhonePasswordTextBoxInfo").addEventListener("click", event => wdw_cardbookConfiguration.showPassword());
	},

	saveInstantApply: async function (aNode) {
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
			case "checkbox":
				await cardbookHTMLUtils.setPrefValue(prefName, aNode.checked);
				await messenger.runtime.sendMessage({query: "cardbook.notifyObserver", value: "cardbook.pref.preferencesChanged"});
				break;
			case "string":
			case "text":
			case "number":
			case "radio":
				await cardbookHTMLUtils.setPrefValue(prefName, aNode.value);
				await messenger.runtime.sendMessage({query: "cardbook.notifyObserver", value: "cardbook.pref.preferencesChanged"});
				break;
			default:
				throw new Error("saveInstantApply : prefType null or unknown : " + prefType);
		}
	},

	preferenceChanged: async function (aPreference, aOldField, aNewField) {
		switch (aPreference) {
			case "autocompletion":
				await wdw_cardbookConfiguration.validateAutoComplete();
				break;
			case "autocompleteRestrictSearch":
				await wdw_cardbookConfiguration.validateAutocompleteRestrictSearchFields();
				break;
			case "useColor":
				await wdw_cardbookConfiguration.validateUseColor();
				break;
			case "accountsRestrictions":
				await wdw_cardbookConfiguration.validateRestrictions();
				break;
			case "statusInformationLineNumber":
				await wdw_cardbookConfiguration.validateStatusInformationLineNumber();
				break;
			case "debugMode":
				await cardbookHTMLUtils.setPrefValue("debugMode", document.getElementById('debugModeCheckBox').checked);
				break;
			case "showNameAs":
				await wdw_cardbookConfiguration.validateShowNameAs();
				break;
			case "adrFormula":
				await wdw_cardbookConfiguration.validateAdrFormula();
				break;
			case "fields":
				await wdw_cardbookConfiguration.validateFields();
				break;
			case "customTypes":
				await wdw_cardbookConfiguration.validateTypes();
				break;
			case "localDataEncryption":
				wdw_cardbookConfiguration.validateEncryptionPref();
				break;
			case "impps":
				await wdw_cardbookConfiguration.validateIMPPs();
				break;
			case "URLPhonePassword":
				await wdw_cardbookConfiguration.validateURLPhonesPassword();
				break;
			case "customFields":
				await wdw_cardbookConfiguration.validateCustomFields();
				// need to reload the edition fields
				await wdw_cardbookConfiguration.validateFieldsFromOrgOrCustom(aOldField, aNewField);
				break;
			case "customListFields":
				await wdw_cardbookConfiguration.validateCustomListFields();
				break;
			case "orgStructure":
				await wdw_cardbookConfiguration.validateOrg();
				// need to reload the edition fields
				await wdw_cardbookConfiguration.validateFieldsFromOrgOrCustom(aOldField, aNewField);
				break;
			case "attachedVCard":
				await wdw_cardbookConfiguration.validateVCards();
				break;
			case "discoveryAccounts":
				await wdw_cardbookConfiguration.validateDiscoveryAccounts();
				break;
			case "initialSync":
				await wdw_cardbookConfiguration.validateInitialSync();
				break;
			case "emailsCollection":
				await wdw_cardbookConfiguration.validateEmailsCollection();
				break;
			case "preferEmailPref":
				await wdw_cardbookConfiguration.validatePrefEmailPref();
				break;
			case "addressbooks":
				await wdw_cardbookConfiguration.validateAddressbooks();
				break;
			case "calendars":
				await wdw_cardbookConfiguration.validateCalendars();
				break;
			case "eventEntryTitle":
				await wdw_cardbookConfiguration.validateEventEntryTitle();
				break;
			case "showPopupOnStartup":
				await wdw_cardbookConfiguration.validateShowPopupOnStartup();
				break;
			case "showPeriodicPopup":
				await wdw_cardbookConfiguration.validateShowPeriodicPopup();
				break;
			case "eventEntryWholeDay":
				await wdw_cardbookConfiguration.validateEventEntryWholeDay();
				break;
		}
		await messenger.runtime.sendMessage({query: "cardbook.notifyObserver", value: "cardbook.pref.preferencesChanged"});
	}
};

await wdw_cardbookConfiguration.load();

messenger.runtime.onMessage.addListener( (info) => {
	switch (info.query) {
		case "cardbook.conf.saveRestriction":
			wdw_cardbookConfiguration.saveRestriction(info.urlParams);
			break;
		case "cardbook.conf.saveEmailsCollection":
			wdw_cardbookConfiguration.saveEmailsCollection(info.urlParams);
			break;
		case "cardbook.conf.saveCustomFields":
			wdw_cardbookConfiguration.saveCustomFields(info.urlParams);
			break;
		case "cardbook.conf.saveVCard":
			wdw_cardbookConfiguration.saveVCard(info.urlParams);
			break;
		case "cardbook.conf.saveIMPPs":
			wdw_cardbookConfiguration.saveIMPPs(info.urlParams);
			break;
		case "cardbook.conf.saveField":
			wdw_cardbookConfiguration.saveField(info.urlParams);
			break;
		case "cardbook.conf.saveOrg":
			wdw_cardbookConfiguration.saveOrg(info.urlParams);
			break;
		case "cardbook.conf.saveType":
			wdw_cardbookConfiguration.saveType(info.urlParams);
			break;
		case "cardbook.conf.saveAutocompleteRestrictSearchFields":
			wdw_cardbookConfiguration.saveAutocompleteRestrictSearchFields(info.urlParams);
			break;
		case "cardbook.conf.addProgressBar":
			wdw_cardbookConfiguration.addProgressBar(info.type, info.total, info.done);
			break;
		}
});

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});
