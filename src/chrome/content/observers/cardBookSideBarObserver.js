var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardBookSideBarObserver = {
	register: function() {
		cardBookObserverRepository.registerAll(this);
	},
	
	unregister: function() {
		cardBookObserverRepository.unregisterAll(this);
	},
	
	observe: function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "cardbook.accountsLoaded":
			case "cardbook.addressbookCreated":
			case "cardbook.addressbookDeleted":
			case "cardbook.addressbookModified":
				wdw_cardbookContactsSidebar.loadAB();
				break;
			case "cardbook.syncRunning":
			case "cardbook.cardCreated":
			case "cardbook.cardModified":
			case "cardbook.cardsConverted":
			case "cardbook.cardsDeleted":
			case "cardbook.cardsDragged":
			case "cardbook.cardsMerged":
			case "cardbook.cardsDuplicated":
			case "cardbook.cardsImportedFromDir":
			case "cardbook.cardsImportedFromFile":
			case "cardbook.cardsPasted":
			case "cardbook.categoryConvertedToList":
			case "cardbook.categoryCreated":
			case "cardbook.categoryDeleted":
			case "cardbook.categoryRenamed":
			case "cardbook.categorySelected":
			case "cardbook.categoryUnselected":
			case "cardbook.displayNameGenerated":
			case "cardbook.emailCollectedByFilter":
			case "cardbook.emailDeletedByFilter":
			case "cardbook.linePasted":
			case "cardbook.listConvertedToCategory":
			case "cardbook.listCreatedFromNode":
			case "cardbook.nodeDeleted":
			case "cardbook.nodeRenamed":
			case "cardbook.outgoingEmailCollected":
			case "cardbook.redoActionDone":
			case "cardbook.undoActionDone":
				wdw_cardbookContactsSidebar.loadAB(aData);
				break;
			case "cardbook.pref.preferencesChanged":
				wdw_cardbookContactsSidebar.onRestrictionsChanged();
				break;
			case "cardbook.identityChanged":
				wdw_cardbookContactsSidebar.onIdentityChanged(aData);
				break;
		}
	}
};
