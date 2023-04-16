var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var cardBookWindowObserver = {

	registered: false,

	register: function() {
		if (cardBookWindowObserver.registered === false) {
			cardBookObserverRepository.registerAll(this);
			cardBookWindowObserver.registered = true;
		}
	},
	
	unregister: function() {
		cardBookObserverRepository.unregisterAll(this);
		cardBookWindowObserver.registered = false;
	},
	
	observe: async function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "cardbook.modifyNode":
				let nodeData = JSON.parse(aData);
				await wdw_cardbook.modifyNode(nodeData);
				break;
			case "cardbook.createCategory":
				let categoryData = JSON.parse(aData);
				await wdw_cardbook.createCategory(categoryData);
				break;
			case "cardbook.finishCSV":
				wdw_cardbook.finishCSV(aData);
				break;
			case "cardbook.writeCardsToCSVFile":
				let exportData = JSON.parse(aData);
				wdw_cardbook.writeCardsToCSVFile(exportData);
				break;
			case "cardbook.loadCSVFile":
				let importData = JSON.parse(aData);
				wdw_cardbook.loadCSVFileNext2(importData);
				break;
			case "cardbook.pref.preferencesChanged":
				ovl_cardbookLayout.orientPanes();
				ovl_cardbookLayout.resizePanes();
				wdw_cardbook.showCorrectTabs();
				wdw_cardbook.loadCssRules();
				var myColumns = cardbookTreeUtils.getColumnsState().split(',');
				wdw_cardbook.addTreeColumns();
				cardbookTreeUtils.setColumnsState(myColumns);
				wdw_cardbook.refreshWindow();
				break;
			case "cardbook.accountsLoaded":
				wdw_cardbook.loadFirstWindow();
				break;
			case "cardbook.addressbookCreated":
			case "cardbook.addressbookDeleted":
				wdw_cardbook.clearCard();
			case "cardbook.addressbookModified":
			case "cardbook.complexSearchLoaded":
				wdw_cardbook.loadCssRules();
			case "cardbook.syncFisnished":
				wdw_cardbook.setSearchRemoteHboxOnSyncFinished(aData);
			case "cardbook.syncRunning":
				wdw_cardbook.refreshWindow(aData);
				break;
			case "cardbook.cardCreated":
			case "cardbook.cardEdited":
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
			case "cardbook.outgoingEmailCollected":
			case "cardbook.redoActionDone":
			case "cardbook.undoActionDone":
			case "cardbook.listCreatedFromNode":
			case "cardbook.nodeDeleted":
			case "cardbook.nodeRenamed":
			case "cardbook.cardsFormatted":
				wdw_cardbook.refreshWindow(aData||":::forceCard");
				break;
		}
	}
};

var cardBookWindowMutationObserver = {
	register: function() {
		var observer = new MutationObserver(function handleMutations(mutations) {
			if (cardbookRepository.cardbookReorderMode == "NOREORDER") {
				cardbookTreeUtils.saveColumnsState();
			}
		});
		observer.observe(document.getElementById("cardsTreecols"), {
			attributes: true,
			subtree: true,
			attributeFilter: ["hidden", "ordinal", "width"]
		});
	}
};

var cardsTreeMutationObserver = {
	register: function() {
		var observer = new MutationObserver(function handleMutations(mutations) {
			if (cardbookRepository.cardbookReorderMode == "NOREORDER") {
				cardbookTreeUtils.saveColumnsSort();
			}
		});
		observer.observe(document.getElementById("cardsTree"), {
			attributes: true,
			subtree: true,
			attributeFilter: ["sortDirection", "sortResource"]
		});
	}
};

var cardboookModeMutationObserver = {
	register: function() {
		var observer = new MutationObserver(function handleMutations(mutations) {
			if (document.getElementById("cardboookModeBroadcasterTab")) {
				cardbookRepository.cardbookUtils.notifyObservers(document.getElementById("cardboookModeBroadcasterTab").getAttribute("mode") + "Mode");
			}
		});
		observer.observe(document.getElementById("cardboookModeBroadcasterTab"), {
			attributes: true,
			subtree: true,
			attributeFilter: ["mode"]
		});
	}
};

Services.obs.addObserver({
		async observe(subDialogWindow) {
			if (!subDialogWindow.location.href.startsWith("chrome://global/content/print.html?")) {
				return;
			}

			await new Promise(resolve =>
				subDialogWindow.document.addEventListener("print-settings", resolve, { once: true })
			);
		
			if (subDialogWindow.PrintEventHandler.activeCurrentURI != "chrome://cardbook/content/print/printing-template.html") {
				return;
			}
			Services.scriptloader.loadSubScript("chrome://cardbook/content/print/cardbookPrint.js", subDialogWindow);
			Services.scriptloader.loadSubScript("chrome://cardbook/content/print/wdw_cardbookPrint.js", subDialogWindow);		
		},
	},  "subdialog-loaded");
