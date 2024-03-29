var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardBookObserverRepository = {
	registerAll: function(aObserver) {
		Services.obs.addObserver(aObserver, "cardbook.openCBTab", false);

		Services.obs.addObserver(aObserver, "cardbook.addressbookCreated", false);
		Services.obs.addObserver(aObserver, "cardbook.addressbookDeleted", false);
		Services.obs.addObserver(aObserver, "cardbook.addressbookModified", false);

		Services.obs.addObserver(aObserver, "cardbook.setUndoAndRedoMenuAndButton", false);
		Services.obs.addObserver(aObserver, "cardbook.undoActionDone", false);
		Services.obs.addObserver(aObserver, "cardbook.redoActionDone", false);
		Services.obs.addObserver(aObserver, "cardbook.categoryRenamed", false);
		Services.obs.addObserver(aObserver, "cardbook.categoryDeleted", false);
		Services.obs.addObserver(aObserver, "cardbook.categoryCreated", false);
		Services.obs.addObserver(aObserver, "cardbook.categoryConvertedToList", false);
		Services.obs.addObserver(aObserver, "cardbook.cardEdited", false);
		Services.obs.addObserver(aObserver, "cardbook.cardModified", false);
		Services.obs.addObserver(aObserver, "cardbook.cardCreated", false);
		Services.obs.addObserver(aObserver, "cardbook.cardsDeleted", false);
		Services.obs.addObserver(aObserver, "cardbook.listConvertedToCategory", false);
		Services.obs.addObserver(aObserver, "cardbook.displayNameGenerated", false);
		Services.obs.addObserver(aObserver, "cardbook.categorySelected", false);
		Services.obs.addObserver(aObserver, "cardbook.categoryUnselected", false);
		Services.obs.addObserver(aObserver, "cardbook.cardsConverted", false);
		Services.obs.addObserver(aObserver, "cardbook.cardsDuplicated", false);
		Services.obs.addObserver(aObserver, "cardbook.cardsMerged", false);
		Services.obs.addObserver(aObserver, "cardbook.linePasted", false);
		Services.obs.addObserver(aObserver, "cardbook.emailCollectedByFilter", false);
		Services.obs.addObserver(aObserver, "cardbook.emailDeletedByFilter", false);
		Services.obs.addObserver(aObserver, "cardbook.outgoingEmailCollected", false);
		Services.obs.addObserver(aObserver, "cardbook.cardsPasted", false);
		Services.obs.addObserver(aObserver, "cardbook.cardsDragged", false);
		Services.obs.addObserver(aObserver, "cardbook.cardsImportedFromFile", false);
		Services.obs.addObserver(aObserver, "cardbook.cardsImportedFromDir", false);
		Services.obs.addObserver(aObserver, "cardbook.nodeRenamed", false);
		Services.obs.addObserver(aObserver, "cardbook.nodeDeleted", false);
		Services.obs.addObserver(aObserver, "cardbook.listCreatedFromNode", false);
		Services.obs.addObserver(aObserver, "cardbook.cardsFormatted", false);

		Services.obs.addObserver(aObserver, "cardbook.syncRunning", false);
		Services.obs.addObserver(aObserver, "cardbook.syncFisnished", false);

		Services.obs.addObserver(aObserver, "cardbook.catDBOpen", false);
		Services.obs.addObserver(aObserver, "cardbook.DBOpen", false);
		Services.obs.addObserver(aObserver, "cardbook.undoDBOpen", false);
		Services.obs.addObserver(aObserver, "cardbook.mailPopDBOpen", false);
		Services.obs.addObserver(aObserver, "cardbook.prefDispNameDBOpen", false);
		Services.obs.addObserver(aObserver, "cardbook.imageDBOpen", false);
		Services.obs.addObserver(aObserver, "cardbook.searchDBOpen", false);
		Services.obs.addObserver(aObserver, "cardbook.complexSearchInitLoaded", false);
		Services.obs.addObserver(aObserver, "cardbook.complexSearchLoaded", false);
		Services.obs.addObserver(aObserver, "cardbook.accountsLoaded", false);

		Services.obs.addObserver(aObserver, "cardbook.pref.preferencesChanged", false);

		Services.obs.addObserver(aObserver, "cardbook.AB.saveEditAB", false);
		Services.obs.addObserver(aObserver, "cardbook.AB.saveSearchAB", false);
		Services.obs.addObserver(aObserver, "cardbook.AB.saveNewAB", false);
		Services.obs.addObserver(aObserver, "cardbook.AB.cancelEditAB", false);

		Services.obs.addObserver(aObserver, "cardbook.finishCSV", false);
		Services.obs.addObserver(aObserver, "cardbook.writeCardsToCSVFile", false);
		Services.obs.addObserver(aObserver, "cardbook.loadCSVFile", false);
		Services.obs.addObserver(aObserver, "cardbook.createCategory", false);
		Services.obs.addObserver(aObserver, "cardbook.modifyNode", false);

		Services.obs.addObserver(aObserver, "cardbook.identityChanged", false);

		Services.obs.addObserver(aObserver, "cardbook.mailMode", false);
		Services.obs.addObserver(aObserver, "cardbook.cardbookMode", false);
	},
	
	unregisterAll: function(aObserver) {
		Services.obs.removeObserver(aObserver, "cardbook.openCBTab");

		Services.obs.removeObserver(aObserver, "cardbook.addressbookCreated");
		Services.obs.removeObserver(aObserver, "cardbook.addressbookDeleted");
		Services.obs.removeObserver(aObserver, "cardbook.addressbookModified");

		Services.obs.removeObserver(aObserver, "cardbook.setUndoAndRedoMenuAndButton");
		Services.obs.removeObserver(aObserver, "cardbook.undoActionDone");
		Services.obs.removeObserver(aObserver, "cardbook.redoActionDone");
		Services.obs.removeObserver(aObserver, "cardbook.categoryRenamed");
		Services.obs.removeObserver(aObserver, "cardbook.categoryDeleted");
		Services.obs.removeObserver(aObserver, "cardbook.categoryCreated");
		Services.obs.removeObserver(aObserver, "cardbook.categoryConvertedToList");
		Services.obs.removeObserver(aObserver, "cardbook.cardEdited");
		Services.obs.removeObserver(aObserver, "cardbook.cardModified");
		Services.obs.removeObserver(aObserver, "cardbook.cardCreated");
		Services.obs.removeObserver(aObserver, "cardbook.cardsDeleted");
		Services.obs.removeObserver(aObserver, "cardbook.listConvertedToCategory");
		Services.obs.removeObserver(aObserver, "cardbook.displayNameGenerated");
		Services.obs.removeObserver(aObserver, "cardbook.categorySelected");
		Services.obs.removeObserver(aObserver, "cardbook.categoryUnselected");
		Services.obs.removeObserver(aObserver, "cardbook.cardsConverted");
		Services.obs.removeObserver(aObserver, "cardbook.cardsDuplicated");
		Services.obs.removeObserver(aObserver, "cardbook.cardsMerged");
		Services.obs.removeObserver(aObserver, "cardbook.linePasted");
		Services.obs.removeObserver(aObserver, "cardbook.emailCollectedByFilter");
		Services.obs.removeObserver(aObserver, "cardbook.emailDeletedByFilter");
		Services.obs.removeObserver(aObserver, "cardbook.outgoingEmailCollected");
		Services.obs.removeObserver(aObserver, "cardbook.cardsPasted");
		Services.obs.removeObserver(aObserver, "cardbook.cardsDragged");
		Services.obs.removeObserver(aObserver, "cardbook.cardsImportedFromFile");
		Services.obs.removeObserver(aObserver, "cardbook.cardsImportedFromDir");
		Services.obs.removeObserver(aObserver, "cardbook.nodeRenamed");
		Services.obs.removeObserver(aObserver, "cardbook.nodeDeleted");
		Services.obs.removeObserver(aObserver, "cardbook.listCreatedFromNode");
		Services.obs.removeObserver(aObserver, "cardbook.cardsFormatted");

		Services.obs.removeObserver(aObserver, "cardbook.syncRunning");
		Services.obs.removeObserver(aObserver, "cardbook.syncFisnished");

		Services.obs.removeObserver(aObserver, "cardbook.catDBOpen");
		Services.obs.removeObserver(aObserver, "cardbook.DBOpen");
		Services.obs.removeObserver(aObserver, "cardbook.undoDBOpen");
		Services.obs.removeObserver(aObserver, "cardbook.mailPopDBOpen");
		Services.obs.removeObserver(aObserver, "cardbook.prefDispNameDBOpen");
		Services.obs.removeObserver(aObserver, "cardbook.imageDBOpen");
		Services.obs.removeObserver(aObserver, "cardbook.searchDBOpen");
		Services.obs.removeObserver(aObserver, "cardbook.complexSearchInitLoaded");
		Services.obs.removeObserver(aObserver, "cardbook.complexSearchLoaded");

		Services.obs.removeObserver(aObserver, "cardbook.pref.preferencesChanged");

		Services.obs.removeObserver(aObserver, "cardbook.AB.saveEditAB");
		Services.obs.removeObserver(aObserver, "cardbook.AB.saveSearchAB");
		Services.obs.removeObserver(aObserver, "cardbook.AB.saveNewAB");
		Services.obs.removeObserver(aObserver, "cardbook.AB.cancelEditAB");

		Services.obs.removeObserver(aObserver, "cardbook.finishCSV");
		Services.obs.removeObserver(aObserver, "cardbook.writeCardsToCSVFile");
		Services.obs.removeObserver(aObserver, "cardbook.loadCSVFile");
		Services.obs.removeObserver(aObserver, "cardbook.createCategory");
		Services.obs.removeObserver(aObserver, "cardbook.modifyNode");

		Services.obs.removeObserver(aObserver, "cardbook.identityChanged");

		Services.obs.removeObserver(aObserver, "cardbook.mailMode");
		Services.obs.removeObserver(aObserver, "cardbook.cardbookMode");
	}
};
