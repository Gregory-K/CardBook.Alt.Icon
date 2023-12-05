var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookAboutMessageObserver = {
	register: function() {
		cardBookObserverRepository.registerAll(this);
	},
	
	unregister: function() {
		cardBookObserverRepository.unregisterAll(this);
	},
	
	observe: function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "cardbook.addressbookModified":
			case "cardbook.syncFisnished":
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
				if (!("undefined" == typeof(ReloadMessage))) {
					ReloadMessage();
				}
				break;
		}
	}
};
