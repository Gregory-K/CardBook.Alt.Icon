export var cardbookNewPreferences = {

	prefCardBookData: "data.",
	prefCardBookTels: "tels.",
	prefCardBookIMPPs: "impps.",
	prefCardBookCustomFields: "customFields.",
	prefCardBookAccountVCards: "vcards.",
	prefCardBookAccountRestrictions: "accountsRestrictions.",
	prefCardBookEmailsCollection: "emailsCollection.",
	prefCardBookCustomTypes: "customTypes.",
	changedPrefs: {
		"addonVersion": "92.0.1",
	},
	defaultPrefs: {
		"autocompletion": true,
		"autocompleteSortByPopularity": true,
		"proposeConcatEmails": false,
		"autocompleteShowAddressbook": false,
		"autocompleteShowEmailType": false,
		"autocompleteShowPopularity": false,
		"autocompleteWithColor": true,
		"autocompleteRestrictSearch": false,
		"autocompleteRestrictSearchFields": "firstname|lastname",
		"useColor": "background",
		"exclusive": false,
		"requestsTimeout": "120",
		"statusInformationLineNumber": "250",
		"debugMode": false,
		"preferEmailEdition": true,
		"listTabView": true,
		"technicalTabView": true,
		"vcardTabView": true,
		"keyTabView": true,
		"panesView": "modern",
		"syncAfterChange": true,
		"initialSync": true,
		"initialSyncDelay": "0",
		"solveConflicts": "User",
		"multiget": "100",
		"maxModifsPushed": "100",
		"decodeReport": true,
		"preferEmailPref": true,
		"preferIMPPPref": true,
		"warnEmptyEmails": true,
		"useOnlyEmail": false,
		"fieldsNameList": "allFields",
		"fieldsNameListUpdate1": true,
		"fieldsNameListUpdate2": true,
		"fieldsNameListUpdate3": false,
		"autoComputeFn": true,
		"usePreferenceValue": false,
		"firstRun": true,
		"kindCustom": "X-ADDRESSBOOKSERVER-KIND",
		"memberCustom": "X-ADDRESSBOOKSERVER-MEMBER",
		"localizeEngine": "OpenStreetMap",
		"localizeTarget": "out",
		"showNameAs": "DSP",
		"adrFormula": messenger.i18n.getMessage("addressFormatFormula"),
		"defaultFnFormula": "({{1}} |)({{2}} |)({{3}} |)({{4}} |)({{5}} |)({{6}} |)({{7}}|)",
		"dateDisplayedFormat": "0",
		"addressBooksNameList": "allAddressBooks",
		"birthday.bday": true,
		"birthday.anniversary": true,
		"birthday.deathdate": true,
		"birthday.events": true,
		"numberOfDaysForSearching": "30",
		"showPopupOnStartup": false,
		"showPeriodicPopup": false,
		"periodicPopupIime": "08:00",
		"showPopupEvenIfNoBirthday": true,
		"syncWithLightningOnStartup": false,
		"numberOfDaysForWriting": "365",
		"eventEntryTitle": messenger.i18n.getMessage("eventEntryTitleMessage"),
		"calendarEntryCategories": messenger.i18n.getMessage("anniversaryCategory"),
		"eventEntryTime": "00:00",
		"repeatingEvent": true,
		"eventEntryWholeDay": false,
		"calendarEntryAlarm": "168",
		"calendarEntryAlarmMigrated": false,
		"viewABPane": true,
		"viewABContact": true,
		"accountsShown": "all",
		"defaultRegion": "NOTSET",
		"localDataEncryption": false,
		"localDataEncryption.validatedVersion": "",
		"localDataEncryption.counter": "",
		"uncategorizedCards": messenger.i18n.getMessage("uncategorizedCards"),
		// not UI accessible prefs
		"maxUndoChanges": "100",
		"currentUndoId": "0",
		"setupCardDAVAccounts": "",
		"URLPhoneURL": "",
		"URLPhoneUser": "",
		"URLPhoneBackground": false,
		"cardbookToolbar.currentset": "",
		"cardbookToolbar.mode": "",
		"discoveryAccountsNameList": "",
		"preferenceValueLabel": "",
		"orgStructure": "",
		"calendarsNameList": "",
		"calendarEntryCategories": "",
		"accountShown": "",
		"supportedVersion": ["3.0", "4.0"],
		"prefs.lastSelected": "cardbook-generalPane",
		"searchAllAB": "allAB",
		"cardbookAccountsTreeWidth": "300",
		"cardbookCardsTreeWidth": "500",
		"cardbookCardsTreeHeight": "500",
		"window.wdw_cardbookConfigurationAddCustomField.html.state": {"width": 500, "height": 300},
		"window.wdw_csvTranslator.html.state": {"width": 700, "height": 600},
		"window.wdw_cardbookConfigurationEditField.html.state": {"width": 600, "height": 500},
		"window.wdw_cardbookConfigurationAddVcards.html.state": {"width": 600, "height": 500},
		"window.wdw_cardbookConfigurationAddEmails.html.state": {"width": 600, "height": 400},
		"window.wdw_cardbookConfigurationRenameField.html.state": {"width": 500, "height": 300},
		"window.wdw_cardbookConfigurationAddIMPP.html.state": {"width": 600, "height": 300},
		"window.wdw_cardbookConfiguration.html.state": {"width": 600, "height": 500},
		"window.wdw_addressbooksAdd.html.state": {"width": 900, "height": 800},
		"window.wdw_formatData.html.state": {"width": 900, "height": 600},
		"window.wdw_logEdition.html.state": {"width": 900, "height": 600},
		"window.wdw_cardbookRenameField.html.state": {"width": 400, "height": 100},
		"window.wdw_cardbookAskUser.html.state": {"width": 900, "height": 300},
		"window.wdw_bulkOperation.html.state": {"width": 400, "height": 200},
		"window.wdw_birthdayList.html.state": {"width": 600, "height": 500},
		"window.wdw_birthdaySync.html.state": {"width": 400, "height": 300},
		"window.wdw_cardbookEventContacts.html.state": {"width": 600, "height": 500},
	},

	initPrefs: async function () {
		let allPrefs = await cardbookNewPreferences.getAllPrefs();
		for (const [key, value] of Object.entries(this.defaultPrefs)) {
			if ("undefined" == typeof(allPrefs[key])) {
				await cardbookNewPreferences.setPref(key, value);
			}
		}
		for (const [key, value] of Object.entries(this.changedPrefs)) {
			await cardbookNewPreferences.setPref(key, value);
		}
	},

	removePrefs: async function (keys) {
		await browser.storage.local.remove(keys);
	},

	clear: async function () {
		await browser.storage.local.clear();
	},

	getAllPrefs: async function () {
		let data = await browser.storage.local.get();
		return data;
	},

	getPrefs: async function (keys) {
		let data = await browser.storage.local.get(keys);
		return data;
	},

    setPref: async function (key, value) {
		await browser.storage.local.set({ [key]: value});
	},

	getBranch: async function (aStartingPoint) {
		let childList = await this.getAllPrefs();
		let values = [];
		for (const [key, value] of Object.entries(childList)) {
			if (key.startsWith(aStartingPoint)) {
				values.push([key, value]);
			}
		}
		return values;
	},

	getBranchKeys: async function (aStartingPoint) {
		let childList = await this.getAllPrefs();
		let keys = [];
		for (const [key, value] of Object.entries(childList)) {
			if (key.startsWith(aStartingPoint)) {
				keys.push(key);
			}
		}
		return keys;
	},

	delBranch: async function (aStartingPoint) {
		let keys = await this.getBranchKeys(aStartingPoint);
		await this.removePrefs(keys);
	},

	sortMultipleArrayByNumber: function (aArray, aIndex, aInvert) {
		function compare1(a, b) { return (a[aIndex] - b[aIndex])*aInvert; };
		function compare2(a, b) { return (a - b)*aInvert; };
		if (aIndex != -1) {
			return aArray.sort(compare1);
		} else {
			return aArray.sort(compare2);
		}
	},

	// return { pers: [], personal: [ [ "X-CUSTOM2", "Custom2", 0 ] ], org: [] }
	getAllCustomFields: async function () {
		var finalResult = {};
		// to delete pers
		for (let type of [ 'pers', 'personal', 'org' ]) {
			finalResult[type] = [];
			let search = this.prefCardBookCustomFields + type + ".";
			let childList = await this.getBranch(search);
			for (let result of childList) {
				let rank = result[0].replace(search, "");
				let values = result[1].split(":");
				finalResult[type].push([values[0], values[1], parseInt(rank)]);
			}
			this.sortMultipleArrayByNumber(finalResult[type],2,1);
		}
		return finalResult;
	},

	// return Array [ [ "true", "allMailAccounts", "fe6bbe94-4114-45b0-a596-37082163b7db", "1a4fb09f-7df4-4fc5-995a-b7262de591dd", "file.vcf" ], ]
	getAllVCards: async function () {
		var finalResult = [];
		let search = this.prefCardBookAccountVCards;
		let childList = await this.getBranch(search);
		for (let result of childList) {
			finalResult.push(result[1].split("::"));
		}
		return finalResult;
	},

	// return Array [ [ "true", "exclude", "allMailAccounts", "fe6bbe94-4114-45b0-a596-37082163b7db", "cat" ], ]
	getAllRestrictions: async function () {
		var finalResult = [];
		let search = this.prefCardBookAccountRestrictions;
		let childList = await this.getBranch(search);
		for (let result of childList) {
			finalResult.push(result[1].split("::"));
		}
		return finalResult;
	},

	// return Array [ [ "true", "allMailAccounts", "fe6bbe94-4114-45b0-a596-37082163b7db", "cat" ], ]
	getAllEmailsCollections: async function () {
		var finalResult = [];
		let search = this.prefCardBookEmailsCollection;
		let childList = await this.getBranch(search);
		for (let result of childList) {
			finalResult.push(result[1].split("::"));
		}
		return finalResult;
	},

	// return Array [ [ "imppcode", "impplabel", "imppprot", 0 ], ]
	getAllIMPPs: async function () {
		var finalResult = [];
		let search = this.prefCardBookIMPPs;
		let childList = await this.getBranch(search);
		for (let result of childList) {
			let rank = result[0].replace(search, "");
			let values = result[1].split(":");
			finalResult.push([values[0], values[1], values[2], parseInt(rank)]);
		}
		this.sortMultipleArrayByNumber(finalResult,3,1);
		return finalResult;
	},

	// return [ [ "telcode", "tellabel", "telprot", 0 ], ]
	getAllTels: async function () {
		var finalResult = [];
		let search = this.prefCardBookTels;
		let childList = await this.getBranch(search);
		for (let result of childList) {
			let rank = result[0].replace(search, "");
			let values = result[1].split(":");
			finalResult.push([values[0], values[1], values[2], parseInt(rank)]);
		}
		this.sortMultipleArrayByNumber(finalResult,3,1);
		return finalResult;
	},

	getAllPrefIds: async function () {
		var finalResult = [];
		let search = this.prefCardBookData;
		let childList = await this.getBranch(search);
		for (let result of childList) {
			let prop = result[0].replace(search, "");
			let tmpArray = prop.split('.');
			if (tmpArray[1] == "id") {
				finalResult.push(result[1]);
			}
		}
		return finalResult;
	},

	getABProperty: async function (aDirPrefId, aProperty) {
		let prop = await this.getPrefs([this.prefCardBookData + aDirPrefId + "." + aProperty]);
		return Object.values(prop)[0];
	},

	getName: async function (aDirPrefId) {
		return await this.getABProperty(aDirPrefId, "name");
	},

	getType: async function (aDirPrefId) {
		return await this.getABProperty(aDirPrefId, "type");
	},

	getEnabled: async function (aDirPrefId) {
		return await this.getABProperty(aDirPrefId, "enabled");
	},

	getVCardVersion: async function (aDirPrefId) {
		return await this.getABProperty(aDirPrefId, "vCard");
	},

	getColor: async function (aDirPrefId) {
		return await this.getABProperty(aDirPrefId, "color");
	},

	getUrl: async function (aDirPrefId) {
		return await this.getABProperty(aDirPrefId, "url");
	},

	getUser: async function (aDirPrefId) {
		return await this.getABProperty(aDirPrefId, "user");
	},

	getReadOnly: async function (aDirPrefId) {
		return await this.getABProperty(aDirPrefId, "readonly");
	},

	getUrnuuid: async function (aDirPrefId) {
		return await this.getABProperty(aDirPrefId, "urnuuid");
	},

	getDBCached: async function (aDirPrefId) {
		return await this.getABProperty(aDirPrefId, "DBcached");
	},

	getAutoSyncEnabled: async function (aDirPrefId) {
		return await this.getABProperty(aDirPrefId, "autoSyncEnabled");
	},

	getLastSync: async function (aDirPrefId) {
		return await this.getABProperty(aDirPrefId, "lastsync");
	},

	getAutoSyncInterval: async function (aDirPrefId) {
		let autoSyncInterval = await this.getABProperty(aDirPrefId, "autoSyncInterval");
		if (autoSyncInterval) {
			return autoSyncInterval;
		} else {
			return "60";
		}
	},
	
	getNode: async function (aDirPrefId) {
		let node = await this.getABProperty(aDirPrefId, "node");
		if (node) {
			return node;
		} else {
			return "categories";
		}
	},

	getDefaultFnFormula: function () {
		return this.defaultPrefs["defaultFnFormula"];
	},

	getFnFormula: async function (aDirPrefId) {
		if (aDirPrefId) {
			let fnFormula = await this.getABProperty(aDirPrefId, "fnFormula");
			if (fnFormula) {
				return fnFormula;
			} else {
				return this.getDefaultFnFormula();
			}
		} else {
			return this.getDefaultFnFormula();
		}
	}
};
