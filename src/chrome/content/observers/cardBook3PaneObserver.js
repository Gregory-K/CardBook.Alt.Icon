var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var cardBook3PaneObserver = {
	
	register: function() {
		cardBookObserverRepository.registerAll(this);
	},
	
	unregister: function() {
		cardBookObserverRepository.unregisterAll(this);
	},
	
	observe: async function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "cardbook.pref.preferencesChanged":
				ovl_cardbookAbout3Pane.reloadCardBookQFB();
				break;
			case "cardbook.DBOpen":
				ovl_cardbookAbout3Pane.reloadCardBookQFB();
				break;
			case "cardbook.cardEdited":
			case "cardbook.cardCreated":
			case "cardbook.cardModified":
			case "cardbook.cardsDeleted":
			case "cardbook.cardsDragged":
			case "cardbook.cardsMerged":
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
			case "cardbook.listConvertedToCategory":
			case "cardbook.listCreatedFromNode":
			case "cardbook.nodeDeleted":
			case "cardbook.nodeRenamed":
			case "cardbook.outgoingEmailCollected":
			case "cardbook.redoActionDone":
			case "cardbook.undoActionDone":
			case "cardbook.addressbookCreated":
			case "cardbook.addressbookDeleted":
			case "cardbook.addressbookModified":
				ovl_cardbookAbout3Pane.reloadCardBookQFB();
				break;
		}
	}
};
