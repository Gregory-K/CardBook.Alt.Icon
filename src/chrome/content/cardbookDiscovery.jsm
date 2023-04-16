var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var EXPORTED_SYMBOLS = ["cardbookDiscovery"];
var cardbookDiscovery = {

	addAddressbook: async function (aAccountsToAdd) {
		if (aAccountsToAdd.length) {
			let url = "chrome/content/addressbooksconfiguration/wdw_addressbooksAdd.html";
			let params = new URLSearchParams();
			params.set("accountsToAdd", JSON.stringify(aAccountsToAdd));
			params.set("action", "discovery");
			let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
													url: `${url}?${params.toString()}`,
													type: "popup"});
		}
	},

	removeAddressbook: async function (aDirPrefId) {
		try {
			var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aDirPrefId);
		
			var confirmTitle = cardbookRepository.extension.localeData.localizeMessage("confirmTitle");
			var confirmMsg = cardbookRepository.extension.localeData.localizeMessage("accountDeletionDiscoveryConfirmMessage", [myDirPrefIdName]);
			var returnFlag = false;
			returnFlag = Services.prompt.confirm(null, confirmTitle, confirmMsg);
			if (returnFlag) {
				await cardbookRepository.removeAccountFromComplexSearch(aDirPrefId);
				cardbookRepository.removeAccountFromRepository(aDirPrefId);
				// cannot be launched from cardbookRepository
				cardbookIndexedDB.removeAccount(aDirPrefId, myDirPrefIdName);
				cardbookRepository.cardbookPreferences.delAccount(aDirPrefId);
				cardbookRepository.cardbookUtils.formatStringForOutput("addressbookDeleted", [myDirPrefIdName]);
				cardbookActions.addActivity("addressbookDeleted", [myDirPrefIdName], "deleteMail");
				cardbookRepository.cardbookUtils.notifyObservers("addressbookDeleted");
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookDiscovery.removeAddressbook error : " + e, "Error");
		}
	}
};
