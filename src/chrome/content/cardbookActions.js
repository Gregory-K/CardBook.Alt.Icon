if ("undefined" == typeof(cardbookActions)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

	var cardbookActions = {

		mainContext: "CardBook",
		cryptoCount: 0,
		cryptoDone: 0,
		cryptoActivity: {},
		syncActivity: {},
		lTimerActionAll: {},

		setUndoAndRedoMenuAndButton: function () {
			let myCurrentUndoId = cardbookRepository.currentUndoId;
			let undoData = {menu: "menu_undo", button: "cardbookToolbarBackButton", value: myCurrentUndoId};
			cardbookRepository.cardbookUtils.notifyObservers("setUndoAndRedoMenuAndButton", JSON.stringify(undoData));
			myCurrentUndoId++;
			let redoData = {menu: "menu_redo", button: "cardbookToolbarForwardButton", value: myCurrentUndoId};
			cardbookRepository.cardbookUtils.notifyObservers("setUndoAndRedoMenuAndButton", JSON.stringify(redoData));
		},

		saveCurrentUndoId: function () {
			cardbookRepository.cardbookPreferences.setStringPref("currentUndoId", cardbookRepository.currentUndoId);
		},

		addUndoCardsAction: async function (aActionCode, aActionMessage, aOldCards, aNewCards, aOldCats, aNewCats) {
			let myNextUndoId = cardbookRepository.currentUndoId + 1;
			await cardbookIDBUndo.addUndoItem(myNextUndoId, aActionCode, aActionMessage, aOldCards, aNewCards, aOldCats, aNewCats, false);
		},

		undo: function () {
			cardbookIDBUndo.executeUndoItem();
		},

		redo: function () {
			cardbookIDBUndo.executeRedoItem();
		},

		initProcess: function(aProcessName, aContextDisplayText, aContextType, aIcon) {
			var gActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);
			var process = Components.classes["@mozilla.org/activity-process;1"].createInstance(Components.interfaces.nsIActivityProcess);
			process.init(aProcessName, "CardBook");
			process.iconClass = aIcon;
			process.groupingStyle = Components.interfaces.nsIActivity.GROUPING_STYLE_BYCONTEXT;
			process.contextDisplayText = aContextDisplayText;
			process.contextType = aContextType;
			gActivityManager.addActivity(process);
			return process;
		},

		finishProcess: function(aProcess) {
			var gActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);
			if (gActivityManager.containsActivity(aProcess.id)) {
				aProcess.state = Components.interfaces.nsIActivityProcess.STATE_COMPLETED;
				gActivityManager.removeActivity(aProcess.id);
			}
		},

		addEvent: function(aEventName, aIcon) {
			var gActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);
			var event = Components.classes["@mozilla.org/activity-event;1"].createInstance(Components.interfaces.nsIActivityEvent);
			event.init(aEventName, null, "", null, Date.now());
			event.iconClass = aIcon;
			gActivityManager.addActivity(event);
			return event;
		},

		initSyncActivity: function(aDirPrefId, aDirPrefName) {
			var processName = cardbookRepository.extension.localeData.localizeMessage("synchroRunning", [aDirPrefName]);
			var process = cardbookActions.initProcess(processName, aDirPrefName, aDirPrefId, 'syncMail');
			if (!cardbookActions.syncActivity[aDirPrefId]) {
				cardbookActions.syncActivity[aDirPrefId] = {};
			}
			cardbookActions.syncActivity[aDirPrefId].syncProcess = process;
		},

		fetchSyncActivity: function(aDirPrefId, aCountDone, aCountTotal) {
			if (cardbookActions.syncActivity[aDirPrefId] && cardbookActions.syncActivity[aDirPrefId].syncProcess) {
				var processMessage = cardbookRepository.extension.localeData.localizeMessage("synchroProcessed", [aCountDone, aCountTotal]);
				cardbookActions.syncActivity[aDirPrefId].syncProcess.setProgress(processMessage, aCountDone, aCountTotal);
			}
		},

		finishSyncActivity: function(aDirPrefId) {
			if (cardbookActions.syncActivity[aDirPrefId] && cardbookActions.syncActivity[aDirPrefId].syncProcess) {
				cardbookActions.finishProcess(cardbookActions.syncActivity[aDirPrefId].syncProcess);
			}
		},

		finishSyncActivityOK: function(aDirPrefId, aDirPrefName) {
			cardbookActions.finishSyncActivity(aDirPrefId);
			if (cardbookActions.syncActivity[aDirPrefId].syncEvent) {
				var gActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);
				if (gActivityManager.containsActivity(cardbookActions.syncActivity[aDirPrefId].syncEvent.id)) {
					gActivityManager.removeActivity(cardbookActions.syncActivity[aDirPrefId].syncEvent.id);
				}
			}
			var eventName = cardbookRepository.extension.localeData.localizeMessage("synchroFinished", [aDirPrefName]);
			var event = cardbookActions.addEvent(eventName, "syncMail");
			cardbookActions.syncActivity[aDirPrefId].syncEvent = event;
		},

		initCryptoActivity: function(aMode) {
			cardbookActions.cryptoDone = 0;
			cardbookActions.cryptoCount = 0;
			var processName = cardbookRepository.extension.localeData.localizeMessage(aMode + "Started");
			var processTitle = cardbookRepository.extension.localeData.localizeMessage("cardbookTitle");
			var process = cardbookActions.initProcess(processName, processTitle, cardbookActions.mainContext, "editItem");
			if (!cardbookActions.cryptoActivity[cardbookActions.mainContext]) {
				cardbookActions.cryptoActivity[cardbookActions.mainContext] = {};
			}
			cardbookActions.cryptoActivity[cardbookActions.mainContext].syncProcess = process;
		},

		fetchCryptoCount: async function(aCountTotal) {
			cardbookActions.cryptoCount = cardbookActions.cryptoCount + aCountTotal;
			await notifyTools.notifyBackground({query: "cardbook.conf.addProgressBar", type: "crypto", total: cardbookActions.cryptoCount});
		},

		fetchCryptoActivity: async function(aMode) {
			cardbookActions.cryptoDone++;
			if (cardbookActions.cryptoActivity[cardbookActions.mainContext] && cardbookActions.cryptoActivity[cardbookActions.mainContext].syncProcess) {
				if (cardbookActions.cryptoDone % 100 == 0) {
					let processMessage = cardbookRepository.extension.localeData.localizeMessage(aMode + "Processed", [cardbookActions.cryptoDone, cardbookActions.cryptoCount]);
					cardbookActions.cryptoActivity[cardbookActions.mainContext].syncProcess.setProgress(processMessage, cardbookActions.cryptoDone, cardbookActions.cryptoCount);
					await notifyTools.notifyBackground({query: "cardbook.conf.addProgressBar", type: "crypto", done: cardbookActions.cryptoDone});
				}
			}
			if (cardbookActions.cryptoDone == cardbookActions.cryptoCount) {
				await notifyTools.notifyBackground({query: "cardbook.conf.addProgressBar", type: "crypto", done: cardbookActions.cryptoDone});
				cardbookActions.finishCryptoActivityOK(aMode);
			}
		},

		finishCryptoActivity: function() {
			if (cardbookActions.cryptoActivity[cardbookActions.mainContext] && cardbookActions.cryptoActivity[cardbookActions.mainContext].syncProcess) {
				cardbookActions.finishProcess(cardbookActions.cryptoActivity[cardbookActions.mainContext].syncProcess);
			}
		},

		finishCryptoActivityOK: function(aMode) {
			cardbookActions.finishCryptoActivity();
			if (cardbookActions.cryptoActivity[cardbookActions.mainContext].syncEvent) {
				var gActivityManager = Components.classes["@mozilla.org/activity-manager;1"].getService(Components.interfaces.nsIActivityManager);
				if (gActivityManager.containsActivity(cardbookActions.cryptoActivity[cardbookActions.mainContext].syncEvent.id)) {
					gActivityManager.removeActivity(cardbookActions.cryptoActivity[cardbookActions.mainContext].syncEvent.id);
				}
			}
			var eventName = cardbookRepository.extension.localeData.localizeMessage(aMode + "Finished");
			var event = cardbookActions.addEvent(eventName, "syncMail");
			cardbookActions.cryptoActivity[cardbookActions.mainContext].syncEvent = event;
		},

		addActivity: function(aMessageCode, aArray, aIcon) {
			var eventName = cardbookRepository.extension.localeData.localizeMessage(aMessageCode, aArray);
			cardbookActions.addEvent(eventName, aIcon);
		},
			
		addActivityFromUndo: function(aActionId) {
			if (cardbookRepository.currentAction[aActionId]) {
				var eventName = cardbookRepository.currentAction[aActionId].message;
				var iconClass = "";
				switch(cardbookRepository.currentAction[aActionId].actionCode) {
					case "cardsConverted":
					case "cardsMerged":
					case "cardsDuplicated":
					case "displayNameGenerated":
					case "cardModified":
					case "categoryRenamed":
					case "categoryConvertedToList":
					case "listConvertedToCategory":
					case "nodeRenamed":
					case "listCreatedFromNode":
					case "cardsFormatted":
						iconClass = "editItem";
						break;
					case "outgoingEmailCollected":
					case "emailCollectedByFilter":
					case "emailDeletedByFilter":
					case "cardsImportedFromFile":
					case "cardsImportedFromDir":
					case "cardCreated":
					case "categoryCreated":
					case "categorySelected":
						iconClass = "addItem";
						break;
					case "cardsExportedToFile":
					case "cardsExportedToDir":
					case "cardsImagesExported":
					case "cardsPasted":
					case "cardsDragged":
					case "linePasted":
						iconClass = "moveMail";
						break;
					case "undoActionDone":
					case "redoActionDone":
						iconClass = "undo";
						break;
					case "categoryUnselected":
					case "categoryDeleted":
					case "cardsDeleted":
					case "nodeDeleted":
						iconClass = "deleteMail";
						break;
				}
				cardbookActions.addEvent(eventName, iconClass);
			}
		},
			
		addUndoMessage: function(aActionId, aArray) {
			if (cardbookRepository.currentAction[aActionId]) {
				let myActionCode = cardbookRepository.currentAction[aActionId].actionCode;
				switch(myActionCode) {
					case "cardsConverted":
					case "outgoingEmailCollected":
					case "emailCollectedByFilter":
					case "emailDeletedByFilter":
					case "cardsMerged":
					case "cardsDuplicated":
					case "cardsPasted":
					case "cardsDragged":
					case "displayNameGenerated":
					case "linePasted":
						cardbookRepository.currentAction[aActionId].message = cardbookRepository.extension.localeData.localizeMessage(myActionCode + 'Undo');
						break;
					case "cardsImportedFromFile":
					case "cardsImportedFromDir":
					case "cardsExportedToFile":
					case "cardsExportedToDir":
					case "cardsImagesExported":
					case "undoActionDone":
					case "redoActionDone":
					case "cardCreated":
					case "cardModified":
					case "categoryCreated":
					case "categoryRenamed":
					case "categorySelected":
					case "categoryUnselected":
					case "categoryDeleted":
					case "categoryConvertedToList":
					case "listConvertedToCategory":
					case "nodeRenamed":
					case "nodeDeleted":
					case "listCreatedFromNode":
					case "cardsFormatted":
							cardbookRepository.currentAction[aActionId].message = cardbookRepository.extension.localeData.localizeMessage(myActionCode + 'Undo', aArray);
						break;
					case "cardsDeleted":
						if (aArray && aArray.length == 1) {
							cardbookRepository.currentAction[aActionId].message = cardbookRepository.extension.localeData.localizeMessage(myActionCode + '1' + 'Undo', [aArray[0].fn]);
						} else {
							cardbookRepository.currentAction[aActionId].message = cardbookRepository.extension.localeData.localizeMessage(myActionCode + '2' + 'Undo');
						}
						break;
				}
			}
		},

		startAction: function (aActionCode, aArray, aRefreshAccount, aTotal) {
			cardbookRepository.currentActionId++;
			if (!cardbookRepository.currentAction[cardbookRepository.currentActionId]) {
				cardbookRepository.currentAction[cardbookRepository.currentActionId] = {actionCode : aActionCode, message : "", oldCards: [], newCards: [], oldCats: [], newCats: [], addedCards: 0, totalCards: 0, doneCards: 0, totalCats: 0, doneCats: 0, files: [], refresh: ""};
			}
			if (aRefreshAccount) {
				cardbookRepository.currentAction[cardbookRepository.currentActionId].refresh = aRefreshAccount;
			}
			if (aTotal) {
				cardbookRepository.currentAction[cardbookRepository.currentActionId].totalEstimatedCards = aTotal;
			}
			cardbookActions.addUndoMessage(cardbookRepository.currentActionId, aArray);
			return cardbookRepository.currentActionId;
		},

		alertAction: function (aActionId, aFinishParams) {
			if (cardbookRepository.currentAction[aActionId]) {
				let myActionCode = cardbookRepository.currentAction[aActionId].actionCode;
				switch(myActionCode) {
					case "cardsImportedFromFile":
						cardbookRepository.cardbookSynchronization.finishImportFromFile(aFinishParams.window, cardbookRepository.currentAction[aActionId].addedCards, aFinishParams.name, aFinishParams.dirname);
						break;
					case "cardsImportedFromDir":
						cardbookRepository.cardbookSynchronization.finishImportFromDir(aFinishParams.window, cardbookRepository.currentAction[aActionId].addedCards, aFinishParams.name, aFinishParams.dirname);
						break;
					case "cardsExportedToDir":
						cardbookRepository.cardbookSynchronization.finishExportToDir(aFinishParams.window, aFinishParams.length, aFinishParams.name);
						break;
					case "cardsExportedToFile":
						cardbookRepository.cardbookSynchronization.finishExportToFile(aFinishParams.window, aFinishParams.length, aFinishParams.name);
						break;
					case "cardsImagesExported":
						cardbookRepository.cardbookSynchronization.finishExportImages(aFinishParams.window, cardbookRepository.currentAction[aActionId].totalCards, aFinishParams.name);
						break;
				}
			}
		},

		endAsyncAction: function (aActionId, aFinishParams) {
			if (cardbookRepository.currentAction[aActionId]) {
				cardbookActions.lTimerActionAll[aActionId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
				var lTimerActions = cardbookActions.lTimerActionAll[aActionId];
				lTimerActions.initWithCallback({ notify: function(lTimerActions) {
					var myAction = cardbookRepository.currentAction[aActionId];
					if (myAction.totalCards == myAction.doneCards && myAction.totalCats == myAction.doneCats) {
						cardbookActions.alertAction(aActionId, aFinishParams);
						cardbookActions.endAction(aActionId, null, aFinishParams);
						lTimerActions.cancel();
					}
				}
				}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
			}
		},

		endAction: async function (aActionId, aForceRefresh) {
			if (cardbookRepository.currentAction[aActionId]) {
				var myAction = cardbookRepository.currentAction[aActionId];
				if (myAction.files.length > 0) {
					cardbookActions.addActivityFromUndo(aActionId);
					if (myAction.actionCode != "undoActionDone" && myAction.actionCode != "redoActionDone"  && myAction.actionCode != "syncMyPhoneExplorer"
						&& myAction.actionCode != "cardsExportedToFile" && myAction.actionCode != "cardsExportedToDir" && myAction.actionCode != "cardsImagesExported"
						&& myAction.doneCards != 0) {
						await cardbookActions.addUndoCardsAction(myAction.actionCode, myAction.message, myAction.oldCards, myAction.newCards, myAction.oldCats, myAction.newCats);
					}
					if (myAction.refresh != "") {
						cardbookRepository.cardbookUtils.notifyObservers(myAction.actionCode, "forceAccount::" + myAction.refresh);
					} else {
						cardbookRepository.cardbookUtils.notifyObservers(myAction.actionCode);
					}
					await cardbookRepository.reWriteFiles(myAction.files);
					if (cardbookRepository.cardbookPrefs["syncAfterChange"]) {
						cardbookRepository.cardbookSynchronization.syncAccounts(myAction.files);
					}
				} else if (aForceRefresh == true) {
					cardbookRepository.cardbookUtils.notifyObservers(myAction.actionCode, "forceAccount::" + myAction.refresh);
				}
				cardbookRepository.currentAction[aActionId] = null;
				cardbookActions.setUndoAndRedoMenuAndButton();
			}
		}
	};
};
