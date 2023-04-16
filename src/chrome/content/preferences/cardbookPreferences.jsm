var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/scripts/notifyTools.js", this);

var EXPORTED_SYMBOLS = ["cardbookPreferences"];
var cardbookPreferences = {

	prefCardBookData: "data.",
	prefCardBookTels: "tels.",
	prefCardBookIMPPs: "impps.",
	prefCardBookCustomFields: "customFields.",
	prefCardBookAccountVCards: "vcards.",
	prefCardBookAccountRestrictions: "accountsRestrictions.",
	prefCardBookEmailsCollection: "emailsCollection.",
	prefCardBookCustomTypes: "customTypes.",

	_arrayUnique: function (array) {
		var a = array.concat();
		for(var i=0; i<a.length; ++i) {
			for(var j=i+1; j<a.length; ++j) {
				if(a[i] === a[j])
					a.splice(j--, 1);
			}
		}
		return a;
	},

	delBranch: function (aStartingPoint) {
		try {
			let childList = this.getChildList(aStartingPoint);
			let keys = Object.keys(childList);
			for (let key of keys){
				if ("undefined" !== typeof(cardbookRepository.cardbookPrefs[key])) {
					cardbookRepository.cardbookPrefs[key] = null;
				}
			}
			// async 
			notifyTools.notifyBackground({query: "cardbook.pref.removePrefs", keys: keys})
		}
		catch(e) {
			console.debug("cardbookPreferences.delBranch : failed to delete" + aStartingPoint + "\n" + e + "\n");
		}
	},

	getBoolPref: function (prefName, aDefaultValue) {
		try {
			return cardbookRepository.cardbookPrefs[prefName] ?? aDefaultValue;
		}
		catch(e) {
			return aDefaultValue;
		}
	},

	setBoolPref: function (prefName, value) {
		try {
			cardbookRepository.cardbookPrefs[prefName] = value;
			// async 
			notifyTools.notifyBackground({query: "cardbook.pref.setPref", key: prefName, value: value})
		}
		catch(e) {
			console.debug("cardbookPreferences.setBoolPref : failed to set" + prefName + "\n" + e + "\n");
		}
	},

	getStringPref: function (prefName) {
		try {
			return cardbookRepository.cardbookPrefs[prefName] ?? "";
		}
		catch(e) {
			return "";
		}
	},

	setStringPref: function (prefName, value) {
		try {
			cardbookRepository.cardbookPrefs[prefName] = value;
			// async 
			notifyTools.notifyBackground({query: "cardbook.pref.setPref", key: prefName, value: value})
		}
		catch(e) {
			console.debug("cardbookPreferences.setStringPref : failed to set" + prefName + "\n" + e + "\n");
		}
	},

	getChildList: function (prefName) {
		try {
			var result = {};
			for (const [key, value] of Object.entries(cardbookRepository.cardbookPrefs)) {
				if (key.startsWith(prefName)) {
					result[key] = value;
				}
			}
			return result;
		}
		catch(e) {
			console.debug("cardbookPreferences.setStringPref : failed to set" + prefName + "\n" + e + "\n");
		}
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
	getAllCustomFields: function () {
		try {
			var finalResult = {};
			// to delete pers
			for (let type of [ 'pers', 'personal', 'org' ]) {
				finalResult[type] = [];
				let search = this.prefCardBookCustomFields + type + ".";
				let childList = this.getChildList(search);
				for (const [key, value] of Object.entries(childList)) {
					let rank = key.replace(search, "");
					let values = value.split(":");
					finalResult[type].push([values[0], values[1], parseInt(rank)]);
				}
				cardbookPreferences.sortMultipleArrayByNumber(finalResult[type],2,1);
			}
			return finalResult;
		}
		catch(e) {
			console.debug("cardbookPreferences.getAllCustomFields error : " + e + "\n");
		}
	},

	getDiscoveryAccounts: function () {
		try {
			var finalResult = [];
			var tmpResult1 = [];
			var tmpResult2 = [];
			var tmpValue = this.getStringPref("discoveryAccountsNameList");
			if (tmpValue != "") {
				tmpResult1 = tmpValue.split(",");
				for (var i = 0; i < tmpResult1.length; i++) {
					tmpResult2 = tmpResult1[i].split("::");
					finalResult.push([tmpResult2[1],tmpResult2[0]]);
				}
			}
			return finalResult;
		}
		catch(e) {
			console.debug("cardbookPreferences.getDiscoveryAccounts error : " + e + "\n");
		}
	},

	// return [ [ "telcode", "tellabel", "telprot", 0 ], ]
	getAllTels: function () {
		try {
			var finalResult = [];
			let search = this.prefCardBookTels;
			let childList = this.getChildList(search);
			for (const [key, value] of Object.entries(childList)) {
				let rank = key.replace(search, "");
				let values = value.split(":");
				finalResult.push([values[0], values[1], values[2], parseInt(rank)]);
			}
			cardbookPreferences.sortMultipleArrayByNumber(finalResult,3,1);
			return finalResult;
		}
		catch(e) {
			console.debug("cardbookPreferences.getAllTels error : " + e + "\n");
		}
	},

	// return  [ "c35db08b-3bd9-467b-a8d3-cc4051c97671",  ]
	getAllComplexSearchIds: function () {
		try {
			var finalResult = [];
			let search = this.prefCardBookData;
			let childList = this.getChildList(search);
			for (const [key, value] of Object.entries(childList)) {
				let prop = key.replace(search, "");
				let tmpArray = prop.split('.');
				if (tmpArray[1] == 'type' && value == "SEARCH") {
					finalResult.push(tmpArray[0]);
				}
			}
			return finalResult;
		}
		catch(e) {
			console.debug("cardbookPreferences.getAllPrefIds error : " + e + "\n");
		}
	},

	getAllPrefIds: function () {
		try {
			var finalResult = [];
			let search = this.prefCardBookData;
			let childList = this.getChildList(search);
			for (const [key, value] of Object.entries(childList)) {
				let prop = key.replace(search, "");
				let tmpArray = prop.split('.');
				if (tmpArray[1] == "id") {
					finalResult.push(tmpArray[0]);
				}
			}
			return finalResult;
		}
		catch(e) {
			console.debug("cardbookPreferences.getAllPrefIds error : " + e + "\n");
		}
	},

	// return Array [ [ "true", "exclude", "allMailAccounts", "fe6bbe94-4114-45b0-a596-37082163b7db", "cat" ], ]
	getAllRestrictions: function () {
		try {
			var finalResult = [];
			let search = this.prefCardBookAccountRestrictions;
			let childList = this.getChildList(search);
			for (const [key, value] of Object.entries(childList)) {
				finalResult.push(value.split("::"));
			}
			return finalResult;
		}
		catch(e) {
			return [];
		}
	},

	delRestrictions: function (aRestrictionId) {
		try {
			if (aRestrictionId) {
				cardbookPreferences.delBranch(this.prefCardBookAccountRestrictions + aRestrictionId);
			} else {
				cardbookPreferences.delBranch(this.prefCardBookAccountRestrictions);
			}
		}
		catch(e) {
			console.debug("cardbookPreferences.delRestrictions : failed to delete" + this.prefCardBookAccountRestrictions + "\n" + e + "\n");
		}
	},

	setRestriction: function (aRestrictionId, aRestrictionValue) {
		try {
			this.setStringPref(this.prefCardBookAccountRestrictions + aRestrictionId, aRestrictionValue);
		}
		catch(e) {
			console.debug("cardbookPreferences.setRestriction : failed to set" + this.prefCardBookAccountRestrictions + aRestrictionId + "\n" + e + "\n");
		}
	},

	// return Array [ [ "true", "allMailAccounts", "fe6bbe94-4114-45b0-a596-37082163b7db", "1a4fb09f-7df4-4fc5-995a-b7262de591dd", "file.vcf" ], ]
	getAllVCards: function () {
		try {
			var finalResult = [];
			let search = this.prefCardBookAccountVCards;
			let childList = this.getChildList(search);
			for (const [key, value] of Object.entries(childList)) {
				finalResult.push(value.split("::"));
			}
			return finalResult;
		}
		catch(e) {
			return [];
		}
	},

	delVCards: function (aVCardId) {
		try {
			if (aVCardId) {
				cardbookPreferences.delBranch(this.prefCardBookAccountVCards + aVCardId);
			} else {
				cardbookPreferences.delBranch(this.prefCardBookAccountVCards);
			}
		}
		catch(e) {
			console.debug("cardbookPreferences.delVCards : failed to delete" + this.prefCardBookAccountVCards + "\n" + e + "\n");
		}
	},

	setVCard: function (aVCardId, aVCardValue) {
		try {
			this.setStringPref(this.prefCardBookAccountVCards + aVCardId, aVCardValue);
		}
		catch(e) {
			console.debug("cardbookPreferences.setVCard : failed to set" + this.prefCardBookAccountVCards + aVCardId + "\n" + e + "\n");
		}
	},

	// return Array [ [ "true", "allMailAccounts", "fe6bbe94-4114-45b0-a596-37082163b7db", "cat" ], ]
	getAllEmailsCollections: function () {
		try {
			var finalResult = [];
			let search = this.prefCardBookEmailsCollection;
			let childList = this.getChildList(search);
			for (const [key, value] of Object.entries(childList)) {
				finalResult.push(value.split("::"));
			}
			return finalResult;
		}
		catch(e) {
			return [];
		}
	},

	delEmailsCollection: function (aRestrictionId) {
		try {
			if (aRestrictionId) {
				cardbookPreferences.delBranch(this.prefCardBookEmailsCollection + aRestrictionId);
			} else {
				cardbookPreferences.delBranch(this.prefCardBookEmailsCollection);
			}
		}
		catch(e) {
			console.debug("cardbookPreferences.delEmailsCollection : failed to delete" + this.prefCardBookEmailsCollection + "\n" + e + "\n");
		}
	},

	setEmailsCollection: function (aRestrictionId, aRestrictionValue) {
		try {
			this.setStringPref(this.prefCardBookEmailsCollection + aRestrictionId, aRestrictionValue);
		}
		catch(e) {
			console.debug("cardbookPreferences.setEmailsCollection : failed to set" + this.prefCardBookEmailsCollection + aRestrictionId + "\n" + e + "\n");
		}
	},

	insertIMPPsSeed: function () {
		this.setIMPPs(0,"skype:" + cardbookRepository.extension.localeData.localizeMessage("impp.skype") + ":skype");
		this.setIMPPs(1,"jabber:" + cardbookRepository.extension.localeData.localizeMessage("impp.jabber") + ":xmpp");
		this.setIMPPs(2,"googletalk:" + cardbookRepository.extension.localeData.localizeMessage("impp.googletalk") + ":gtalk");
		this.setIMPPs(3,"qq:" + cardbookRepository.extension.localeData.localizeMessage("impp.qq") + ":qq");
		this.setIMPPs(4,"jami:" + cardbookRepository.extension.localeData.localizeMessage("impp.jami") + ":jami");
	},

	// return Array [ [ "imppcode", "impplabel", "imppprot", 0 ], ]
	getAllIMPPs: function () {
		try {
			var finalResult = [];
			let search = this.prefCardBookIMPPs;
			let childList = this.getChildList(search);
			for (const [key, value] of Object.entries(childList)) {
				let rank = key.replace(search, "");
				let values = value.split(":");
				finalResult.push([values[0], values[1], values[2], parseInt(rank)]);
			}
			cardbookPreferences.sortMultipleArrayByNumber(finalResult,3,1);
			return finalResult;
		}
		catch(e) {
			console.debug("cardbookPreferences.getAllIMPPs error : " + e + "\n");
		}
	},

	getIMPPs: function (prefName) {
		try {
			let value = this.getStringPref(this.prefCardBookIMPPs + prefName);
			return value;
		}
		catch(e) {
			console.debug("cardbookPreferences.getIMPPs : failed to get" + this.prefCardBookIMPPs + prefName + "\n" + e + "\n");
		}
	},

	setIMPPs: function (prefName, value) {
		try {
			this.setStringPref(this.prefCardBookIMPPs + prefName, value);
		}
		catch(e) {
			console.debug("cardbookPreferences.setIMPPs : failed to set" + this.prefCardBookIMPPs + prefName + "\n" + e + "\n");
		}
	},

	delIMPPs: function () {
		try {
			cardbookPreferences.delBranch(this.prefCardBookIMPPs);
		}
		catch(e) {
			console.debug("cardbookPreferences.delIMPPs : failed to delete" + this.prefCardBookIMPPs + "\n" + e + "\n");
		}
	},

	getCustomFields: function (prefName) {
		try {
			let value = this.getStringPref(this.prefCardBookCustomFields + prefName);
			return value;
		}
		catch(e) {
			console.debug("cardbookPreferences.getCustomFields : failed to get" + this.prefCardBookCustomFields + prefName + "\n" + e + "\n");
		}
	},

	setCustomFields: function (aType, prefName, value) {
		try {
			this.setStringPref(this.prefCardBookCustomFields + aType + "." + prefName, value);
		}
		catch(e) {
			console.debug("cardbookPreferences.setCustomFields : failed to set" + this.prefCardBookCustomFields + aType + "." + prefName + "\n" + e + "\n");
		}
	},

	delCustomFields: function (aType) {
		try {
			if (aType) {
				cardbookPreferences.delBranch(this.prefCardBookCustomFields + aType);
			} else {
				cardbookPreferences.delBranch(this.prefCardBookCustomFields);
			}
		}
		catch(e) {
			console.debug("cardbookPreferences.delCustomFields : failed to delete" + this.prefCardBookCustomFields + aType + "\n" + e + "\n");
		}
	},

	getTels: function (prefName) {
		try {
			let value = this.getStringPref(this.prefCardBookTels + prefName);
			return value;
		}
		catch(e) {
			console.debug("cardbookPreferences.getTels : failed to get" + this.prefCardBookTels + prefName + "\n" + e + "\n");
		}
	},

	setTels: function (prefName, value) {
		try {
			this.setStringPref(this.prefCardBookTels + prefName, value);
		}
		catch(e) {
			console.debug("cardbookPreferences.setTels : failed to set" + this.prefCardBookTels + prefName + "\n" + e + "\n");
		}
	},

	delTels: function () {
		try {
			cardbookPreferences.delBranch(this.prefCardBookTels);
		}
		catch(e) {
			console.debug("cardbookPreferences.delTels : failed to delete" + this.prefCardBookTels + "\n" + e + "\n");
		}
	},

	getPrefValueLabel: function () {
		let prefValueLabel = this.getStringPref("preferenceValueLabel");
		if (prefValueLabel) {
			return prefValueLabel;
		} else {
			return cardbookRepository.extension.localeData.localizeMessage("prefValueLabel");
		}
	},

	getId: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "id");
	},

	setId: function (aDirPrefId, id) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "id", id);
	},

	getName: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "name");
	},

	setName: function (aDirPrefId, name) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "name", name);
	},

	getUrl: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "url");
	},

	setUrl: function (aDirPrefId, url) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "url", url);
	},

	getUser: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "user");
	},

	setUser: function (aDirPrefId, user) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "user", user);
	},

	getType: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "type");
	},

	setType: function (aDirPrefId, type) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "type", type);
	},

	getNode: function (aDirPrefId) {
		let node = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "node");
		if (node) {
			return node;
		} else {
			return "categories";
		}
	},

	setNode: function (aDirPrefId, type) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "node", type);
	},

	getEnabled: function (aDirPrefId) {
		return this.getBoolPref(this.prefCardBookData + aDirPrefId + "." + "enabled", false);
	},

	setEnabled: function (aDirPrefId, enabled) {
		this.setBoolPref(this.prefCardBookData + aDirPrefId + "." + "enabled", enabled);
	},

	getReadOnly: function (aDirPrefId) {
		return this.getBoolPref(this.prefCardBookData + aDirPrefId + "." + "readonly", false);
	},

	setReadOnly: function (aDirPrefId, readonly) {
		this.setBoolPref(this.prefCardBookData + aDirPrefId + "." + "readonly", readonly);
	},

	getExpanded: function (aDirPrefId) {
		return this.getBoolPref(this.prefCardBookData + aDirPrefId + "." + "expanded", true);
	},

	setExpanded: function (aDirPrefId, expanded) {
		this.setBoolPref(this.prefCardBookData + aDirPrefId + "." + "expanded", expanded);
	},

   getColor: function (aDirPrefId) {
		let color = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "color");
		if (color) {
			return color;
		} else {
			return "#A8C2E1";
		}
	},

	setColor: function (aDirPrefId, color) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "color", color);
	},

	getDBCached: function (aDirPrefId) {
		return this.getBoolPref(this.prefCardBookData + aDirPrefId + "." + "DBcached", false);
	},

	setDBCached: function (aDirPrefId, DBcached) {
		this.setBoolPref(this.prefCardBookData + aDirPrefId + "." + "DBcached", DBcached);
	},

	getVCardVersion: function (aDirPrefId) {
		let vCard = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "vCard");
		if (vCard) {
			return vCard;
		} else {
			return "3.0";
		}
	},

	setVCardVersion: function (aDirPrefId, aVCard) {
		if (aVCard) {
			this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "vCard", aVCard);
		}
	},

	getLastSearch: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "lastSearch");
	},

	setLastSearch: function (aDirPrefId, name) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "lastSearch", name);
	},

	getUrnuuid: function (aDirPrefId) {
		return this.getBoolPref(this.prefCardBookData + aDirPrefId + "." + "urnuuid", false);
	},

	setUrnuuid: function (aDirPrefId, aUrnuuid) {
		this.setBoolPref(this.prefCardBookData + aDirPrefId + "." + "urnuuid", aUrnuuid);
	},

	getSourceId: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "sourceId");
	},

	setSourceId: function (aDirPrefId, aSourceId) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "sourceId", aSourceId);
	},

	getAutoSyncEnabled: function (aDirPrefId) {
		return this.getBoolPref(this.prefCardBookData + aDirPrefId + "." + "autoSyncEnabled", true);
	},

	setAutoSyncEnabled: function (aDirPrefId, aAutoSyncEnabled) {
		this.setBoolPref(this.prefCardBookData + aDirPrefId + "." + "autoSyncEnabled", aAutoSyncEnabled);
	},

	getAutoSyncInterval: function (aDirPrefId) {
		let autoSyncInterval = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "autoSyncInterval");
		if (autoSyncInterval) {
			return autoSyncInterval;
		} else {
			return "60";
		}
	},

	setAutoSyncInterval: function (aDirPrefId, aAutoSyncInterval) {
		if (aAutoSyncInterval) {
			this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "autoSyncInterval", aAutoSyncInterval);
		}
	},

	getFnFormula: function (aDirPrefId) {
		if (aDirPrefId) {
			let fnFormula = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "fnFormula");
			if (fnFormula) {
				return fnFormula;
			} else {
				return cardbookRepository.defaultFnFormula;
			}
		} else {
			return cardbookRepository.defaultFnFormula;
		}
	},

	setFnFormula: function (aDirPrefId, aFnFormula) {
		if (aFnFormula) {
			this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "fnFormula", aFnFormula);
		}
	},

	getSortDirection: function (aDirPrefId) {
		if (aDirPrefId) {
			let sortDirection = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "sortDirection");
			if (sortDirection) {
				return sortDirection;
			} else {
				return cardbookRepository.defaultSortDirection;
			}
		} else {
			return cardbookRepository.defaultSortDirection;
		}
	},

	setSortDirection: function (aDirPrefId, aSortDirection) {
		if (aSortDirection) {
			this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "sortDirection", aSortDirection);
		}
	},

	getSortResource: function (aDirPrefId) {
		if (aDirPrefId) {
			let sortResource = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "sortResource");
			if (sortResource) {
				return sortResource;
			} else {
				return cardbookRepository.defaultSortResource;
			}
		} else {
			return cardbookRepository.defaultSortResource;
		}
	},

	setSortResource: function (aDirPrefId, aSortResource) {
		if (aSortResource) {
			this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "sortResource", aSortResource);
		}
	},

	getDisplayedColumns: function (aDirPrefId) {
		if (aDirPrefId) {
			let displayedColumns = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "displayedColumns");
			if (displayedColumns) {
				return displayedColumns;
			} else {
				return cardbookRepository.defaultDisplayedColumns;
			}
		} else {
			return cardbookRepository.defaultDisplayedColumns;
		}
	},

	setDisplayedColumns: function (aDirPrefId, aDisplayedColumns) {
		if (aDisplayedColumns) {
			this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "displayedColumns", aDisplayedColumns);
		}
	},

	getMaxModifsPushed: function () {
		let maxModifsPushed = this.getStringPref("maxModifsPushed");
		if (maxModifsPushed) {
			return maxModifsPushed;
		} else {
			return "60";
		}
	},

	getEditionFields: function () {
		try {
			let fields = this.getStringPref("fieldsNameList");
			if (fields == "allFields") {
				return fields;
			} else {
				return JSON.parse(fields);
			}
		}
		catch(e) {
			return "allFields";
		}
	},

	setEditionFields: function (aValue) {
		if (aValue) {
			this.setStringPref("fieldsNameList", aValue);
		}
	},

	delAccount: function (aDirPrefId) {
		try {
			cardbookPreferences.delBranch(this.prefCardBookData + aDirPrefId);
		}
		catch(e) {
			console.debug("cardbookPreferences.delAccount : failed to delete" + this.prefCardBookData + aDirPrefId + "\n" + e + "\n");
		}
	}
};
