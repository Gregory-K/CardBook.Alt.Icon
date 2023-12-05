var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var cardBookObserver = {
	
	DBOpen: false,
	catDBOpen: false,
	undoDBOpen: false,
	mailPopDBOpen: false,
	prefDispNameDBOpen: false,
	imageDBOpen: false,
	
	register: function() {
		cardBookObserverRepository.registerAll(this);
	},
	
	unregister: function() {
		cardBookObserverRepository.unregisterAll(this);
	},
	
	upgradeDBs: function() {
		if (this.mailPopDBOpen && this.prefDispNameDBOpen && this.catDBOpen && this.DBOpen && this.undoDBOpen && this.imageDBOpen) {
			cardbookIndexedDB.upgradeDBs();
		}
	},
	
	observe: async function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "cardbook.AB.saveEditAB":
				let saveEditAccount = JSON.parse(aData);
				await cardbookRepository.modifyAddressbook(saveEditAccount);
				break;
			case "cardbook.AB.cancelEditAB":
				let cancelEditAccount = JSON.parse(aData);
				cardbookRepository.cancelModifyAddressbook(cancelEditAccount);
				break;
			case "cardbook.AB.saveNewAB":
				let newAccount = JSON.parse(aData);
				await cardbookRepository.createAddressbook(newAccount);
				break;
			case "cardbook.AB.saveSearchAB":
				let searchAccount = JSON.parse(aData);
				await cardbookRepository.modifySearchAddressbook(searchAccount);
				break;
			case "cardbook.openCBTab":
				ovl_cardbook.open();
				break;
			case "cardbook.undoDBOpen":
				this.undoDBOpen = true;
				this.upgradeDBs();
				break;
			case "cardbook.imageDBOpen":
				this.imageDBOpen = true;
				this.upgradeDBs();
				break;
			case "cardbook.mailPopDBOpen":
				this.mailPopDBOpen = true;
				this.upgradeDBs();
				cardbookIDBMailPop.loadMailPop();
				break;
			case "cardbook.prefDispNameDBOpen":
				this.prefDispNameDBOpen = true;
				this.upgradeDBs();
				cardbookIDBPrefDispName.loadPrefDispName();
				break;
			case "cardbook.catDBOpen":
				this.catDBOpen = true;
				this.upgradeDBs();
				cardbookIDBCard.openCardDB();
				break;
			case "cardbook.DBOpen":
				this.DBOpen = true;
				this.upgradeDBs();
				cardbookIDBSearch.openSearchDB();
				break;
			case "cardbook.searchDBOpen":
				await cardbookRepository.cardbookSynchronization.loadComplexSearchAccounts();
				break;
			case "cardbook.complexSearchInitLoaded":
				cardbookRepository.cardbookSynchronization.loadAccounts();
				break;
		}
	}
};
