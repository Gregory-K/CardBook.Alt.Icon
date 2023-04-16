var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/scripts/notifyTools.js", this);

var cardbookInit = {

	setPrefsInMemory: async function () {
		cardbookRepository.cardbookPrefs = {};
		let allPrefs = await notifyTools.notifyBackground({query: "cardbook.pref.getAllPrefs"});
		for (const [key, value] of Object.entries(allPrefs)) {
			cardbookRepository.cardbookPrefs[key] = value;
		}
		if (!Services.prefs.getBoolPref("extensions.cardbook.optionsMigrated", false)) {
			let oldPrefix = "extensions.cardbook."
			let allPrefs = Services.prefs.getChildList(oldPrefix);
			  for (let pref of allPrefs) {
				let startReg = new RegExp("^" + oldPrefix);
				let newPref = pref.replace(startReg, "");
				let type = Services.prefs.getPrefType(pref);
				let value = "";
				switch (type) {
					case Services.prefs.PREF_STRING:
						value = Services.prefs.getStringPref(pref);
						break;
					case Services.prefs.PREF_INT:
						value = Services.prefs.getIntPref(pref);
						break;
					case Services.prefs.PREF_BOOL:
						value = Services.prefs.getBoolPref(pref);
						break;
					}
				cardbookRepository.cardbookPrefs[newPref] = value;
			}
		}
	},

	keepMigrationLog: async function (aArray) {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append("cardBookPrefMigration.log");
		
		if (!cacheDir.exists()) {
			// read and write permissions to owner and group, read-only for others.
			cacheDir.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
		}
		if (cacheDir.exists()) {
			await cardbookRepository.cardbookUtils.writeContentToFile(cacheDir.path, aArray.join("\r\n"), "UTF8");
		}
		console.log(`Migration log : ${cacheDir.path}`)
	},

	addToLog: function (aArray, aMessage) {
		console.log(aMessage);
		aArray.push(aMessage);
	},

	migratePrefs: async function () {
		if (!Services.prefs.getBoolPref("extensions.cardbook.optionsMigrated", false)) {
			let log = [];
			cardbookInit.addToLog(log, "Starting migration");
			let result = await notifyTools.notifyBackground({query: "cardbook.pref.migrateClear"});
			if (result == "KO") {
				return
			}
			let oldPrefix = "extensions.cardbook."
			let allPrefs = Services.prefs.getChildList(oldPrefix);
			for (let pref of allPrefs) {
				let startReg = new RegExp("^" + oldPrefix);
				let newPref = pref.replace(startReg, "");
				let type = Services.prefs.getPrefType(pref);
				let value = "";
				let result = "KO";
				switch (type) {
					case Services.prefs.PREF_STRING:
						value = Services.prefs.getStringPref(pref);
						result = await notifyTools.notifyBackground({query: "cardbook.pref.migrateString", key: newPref, value: value})
						break;
					case Services.prefs.PREF_INT:
						value = Services.prefs.getIntPref(pref);
						result = await notifyTools.notifyBackground({query: "cardbook.pref.migrateString", key: newPref, value: value})
						break;
					case Services.prefs.PREF_BOOL:
						value = Services.prefs.getBoolPref(pref);
						result = await notifyTools.notifyBackground({query: "cardbook.pref.migrateString", key: newPref, value: value})
						break;
					default:
						result = "OK";
				}
				if (result == "KO") {
					cardbookInit.addToLog(log, "FAILED migration for : prefName : " + newPref + " : prefValue : " + value);
				} else {
					cardbookInit.addToLog(log, "OK migration for : prefName : " + newPref + " : prefValue : " + value);
				}
			}
			cardbookInit.addToLog(log, "migration OK");
			await cardbookInit.keepMigrationLog(log);
			Services.prefs.setBoolPref("extensions.cardbook.optionsMigrated", true);
		} else {
			console.log("no migration");
		}
	},

	initPrefs: async function () {
		await notifyTools.notifyBackground({query: "cardbook.pref.initPrefs"});
		// force to have nice svg
		Services.prefs.setBoolPref("svg.context-properties.content.enabled", true);
	},

	initRepo: function () {
		if (cardbookRepository.firstLoad) {
			return;
		}
		// setting userAgent and prodid
		cardbookRepository.userAgent = "Thunderbird CardBook/" + cardbookRepository.cardbookPrefs["addonVersion"];
		cardbookRepository.prodid = "-//Thunderbird.net/NONSGML Thunderbird CardBook V"+ cardbookRepository.cardbookPrefs["addonVersion"]; + "//" + cardbookRepository.getLang().toUpperCase();

		// setting cardbookGenderLookup for having lookups
		cardbookRepository.setGenderLookup();

		// setting the default region
		cardbookRepository.setDefaultRegion();

		// setting the default region
		cardbookRepository.setDefaultImppTypes();

		// migration functions (should be removed)
		cardbookRepository.loadCustoms();

		// for version < 75.0
		cardbookRepository.updateFieldsNameList();

		// load category colors
		try {
			if ("undefined" == typeof(cardbookRepository.cardbookPrefs["categoryColors"])) {
				cardbookRepository.cardbookNodeColors = {};
			} else {
				cardbookRepository.cardbookNodeColors = JSON.parse(cardbookRepository.cardbookPrefs["categoryColors"]);
			}
		}
		catch (e) {
			cardbookRepository.cardbookNodeColors = {};
		}
	}
};

async function startup() {
	await cardbookInit.migratePrefs();
	await cardbookInit.initPrefs();
	await cardbookInit.setPrefsInMemory();
	cardbookInit.initRepo();
}

