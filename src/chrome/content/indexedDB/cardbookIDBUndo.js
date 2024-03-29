var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookIDBUndo = {
	cardbookActionsDatabaseVersion: "6",
	cardbookActionsDatabaseName: "CardBookUndo",

	// first step for getting the undos
	openUndoDB: function() {
		// generic output when errors on DB
		cardbookRepository.cardbookActionsDatabase.onerror = function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("Undo Database error : " + e.value, "Error");
		};

		var request = indexedDB.open(cardbookIDBUndo.cardbookActionsDatabaseName, cardbookIDBUndo.cardbookActionsDatabaseVersion);
	
		// when version changes
		// for the moment delete all and recreate one new empty
		request.onupgradeneeded = function(e) {
			var db = e.target.result;
			e.target.transaction.onerror = cardbookRepository.cardbookActionsDatabase.onerror;

			if (db.objectStoreNames.contains("cardUndos")) {
				db.deleteObjectStore("cardUndos");
			}
			var store = db.createObjectStore("cardUndos", {keyPath: "undoId", autoIncrement: false});
		};

		request.onsuccess = function(e) {
			cardbookRepository.cardbookActionsDatabase.db = e.target.result;
			cardbookRepository.currentUndoId = Number(cardbookRepository.cardbookPrefs["currentUndoId"]);
			cardbookActions.setUndoAndRedoMenuAndButton();
			cardbookRepository.cardbookUtils.notifyObservers("undoDBOpen");
		};

		request.onerror = cardbookRepository.cardbookActionsDatabase.onerror;
	},

	// check if the card is in a wrong encryption state
	// then decrypt the card if possible
	checkUndoItem: async function(aItem) {
		try {
			var stateMismatched = cardbookIndexedDB.encryptionEnabled != 'encrypted' in aItem;
			var versionMismatched = aItem.encryptionVersion && aItem.encryptionVersion != cardbookEncryptor.VERSION;
			if (stateMismatched || versionMismatched) {
				if ('encrypted' in aItem) {
					aItem = await cardbookEncryptor.decryptUndoItem(aItem);
				}
				await cardbookIDBUndo.addUndoItem(aItem.undoId, aItem.undoCode, aItem.undoMessage, aItem.oldCards, aItem.newCards, aItem.oldCats, aItem.newCats, true);
			} else {
				if ('encrypted' in aItem) {
					aItem = await cardbookEncryptor.decryptUndoItem(aItem);
				}
			}
			return aItem;
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Undo decryption failed e : " + e, "Error");
			throw new Error("failed to decrypt the undo : " + e);
		}
	},

	// remove an undo action
	removeUndoItem: function(aUndoId) {
		var db = cardbookRepository.cardbookActionsDatabase.db;
		var transaction = db.transaction(["cardUndos"], "readwrite");
		var store = transaction.objectStore("cardUndos");
		var keyRange = IDBKeyRange.upperBound(aUndoId);
		var cursorRequest = store.delete(keyRange);
		cursorRequest.onsuccess = function(e) {
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undo(s) less than " + aUndoId + " deleted from encrypted undoDB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undo(s) less than " + aUndoId + " deleted from undoDB");
			}
		};
		
		cursorRequest.onerror = cardbookRepository.cardbookActionsDatabase.onerror;
	},

	// add an undo action
	addUndoItem: async function(aUndoId, aUndoCode, aUndoMessage, aOldCards, aNewCards, aOldCats, aNewCats, aExactId, aMode) {
		var undoItem = {undoId : aUndoId, undoCode : aUndoCode, undoMessage : aUndoMessage, oldCards: aOldCards, newCards: aNewCards, oldCats: aOldCats, newCats: aNewCats};
		var storedItem = cardbookIndexedDB.encryptionEnabled ? (await cardbookEncryptor.encryptUndoItem(undoItem)) : undoItem;
		return new Promise( function(resolve, reject) {
			var db = cardbookRepository.cardbookActionsDatabase.db;
			var transaction = db.transaction(["cardUndos"], "readwrite");
			var store = transaction.objectStore("cardUndos");
			if (aExactId) {
				var keyRange = IDBKeyRange.only(aUndoId);
			} else {
				var keyRange = IDBKeyRange.lowerBound(aUndoId);
			}
			try {
				var cursorDeleteRequest = store.delete(keyRange);
				cursorDeleteRequest.onsuccess = function(e) {
					if (cardbookIndexedDB.encryptionEnabled) {
						if (aExactId) {
							cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undo " + aUndoId + " deleted from encrypted undoDB");
						} else {
							cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undos more than " + aUndoId + " deleted from encrypted undoDB");
						}
					} else {
						if (aExactId) {
							cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undo " + aUndoId + " deleted from undoDB");
						} else {
							cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undos more than " + aUndoId + " deleted from undoDB");
						}
					}
					try {
						var cursorAddRequest = store.put(storedItem);
						cursorAddRequest.onsuccess = async function(e) {
							cardbookRepository.currentUndoId = aUndoId;
							cardbookActions.saveCurrentUndoId();
							if (cardbookIndexedDB.encryptionEnabled) {
								cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undo " + aUndoId + " written to encrypted undoDB");
							} else {
								cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : undo " + aUndoId + " written to undoDB");
							}
							var maxUndoChanges = cardbookRepository.cardbookPrefs["maxUndoChanges"];
							var undoIdToDelete = aUndoId - maxUndoChanges;
							if (undoIdToDelete > 0) {
								cardbookIDBUndo.removeUndoItem(undoIdToDelete);
							}
							if (aMode) {
								await cardbookActions.fetchCryptoActivity(aMode);
							}
							resolve();
						};
						
						cursorAddRequest.onerror = async function(e) {
							if (aMode) {
								await cardbookActions.fetchCryptoActivity(aMode);
							}
							cardbookRepository.cardbookActionsDatabase.onerror(e);
						};
					} catch(e) {
						cardbookRepository.cardbookActionsDatabase.onerror(e);
					}
				};

				cursorDeleteRequest.onerror = async function(e) {
					if (aMode) {
						await cardbookActions.fetchCryptoActivity(aMode);
					}
					cardbookRepository.cardbookActionsDatabase.onerror(e);
				};
			} catch(e) {
				cardbookRepository.cardbookActionsDatabase.onerror(e);
			}
		});
	},

	// set the menu label for the undo and redo menu entries
	setUndoAndRedoMenuAndButton: function(aMenuName, aButtonName, aUndoId) {
		// CardBook tab not open or db not open
		// for the standalone window it was unpossible to use the menus menu_undo et menu_redo
		// so menu_undo1 and menu_redo1 were used
		if (!document.getElementById(aMenuName)) {
			if (!document.getElementById(aMenuName + "1")) {
				return;
			} else {
				var myMenu = document.getElementById(aMenuName + "1");
			}
		} else {
			var myMenu = document.getElementById(aMenuName);
		}
		if (!cardbookRepository.cardbookActionsDatabase.db) {
			return;
		}
		var db = cardbookRepository.cardbookActionsDatabase.db;
		var transaction = db.transaction(["cardUndos"], "readonly");
		var store = transaction.objectStore("cardUndos");
		var keyRange = IDBKeyRange.bound(aUndoId, aUndoId);
		var cursorRequest = store.getAll(keyRange);

		const handleItem = async item => {
			try {
				item = await cardbookIDBUndo.checkUndoItem(item);
			}
			catch(e) {
				return;
			}
			myMenu.removeAttribute('disabled');
			myMenu.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage(aMenuName + ".long.label", [item.undoMessage]));
			if (document.getElementById(aButtonName)) {
				document.getElementById(aButtonName).removeAttribute('disabled');
			}
		};

		cursorRequest.onsuccess = async function(e) {
			var result = e.target.result;
			if (result && result.length != 0) {
				for (let item of result) {
					handleItem(item);
				}
			} else {
				myMenu.setAttribute('disabled', 'true');
				myMenu.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage(aMenuName + ".short.label"));
				if (document.getElementById(aButtonName)) {
					document.getElementById(aButtonName).setAttribute('disabled', 'true');
				}
			}
		};
		
		cursorRequest.onerror = cardbookRepository.cardbookActionsDatabase.onerror;
	},

	// do the undo action
	executeUndoItem: async function() {
		var db = cardbookRepository.cardbookActionsDatabase.db;
		var transaction = db.transaction(["cardUndos"], "readonly");
		var store = transaction.objectStore("cardUndos");
		var keyRange = IDBKeyRange.bound(cardbookRepository.currentUndoId, cardbookRepository.currentUndoId);
		var cursorRequest = store.getAll(keyRange);
	
		const handleItem = async item => {
			try {
				item = await cardbookIDBUndo.checkUndoItem(item);
			}
			catch(e) {
				return;
			}
			var myTopic = "undoActionDone";
			var myActionId = cardbookActions.startAction(myTopic, [item.undoMessage]);
			for (let myCatToCreate of item.oldCats) {
				let myCatToDelete = item.newCats.find(child => child.dirPrefId+"::"+child.uid == myCatToCreate.dirPrefId+"::"+myCatToCreate.uid);
				if (!myCatToDelete) {
					var myMessage = "debug mode : executing undo " + cardbookRepository.currentUndoId + " adding myCatToCreate.cbid : " + myCatToCreate.cbid;
					cardbookIDBCat.checkCatForUndoAction(myMessage, myCatToCreate, myActionId);
				} else {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing undo " + cardbookRepository.currentUndoId + " updating myCatToCreate.cbid : " + myCatToCreate.cbid);
					cardbookRepository.cardbookUtils.addTagUpdated(myCatToCreate);
					myCatToCreate.etag = myCatToDelete.etag;
					await cardbookRepository.saveCategory(myCatToDelete, myCatToCreate, myActionId);
				}
			}
			for (let myCardToDelete of item.newCards) {
				let myCardToCreate1 = item.oldCards.find(child => child.cbid == myCardToDelete.cbid);
				if (!myCardToCreate1) {
					let myCardToCreate2 = cardbookRepository.cardbookDisplayCards[myCardToDelete.dirPrefId].cards.find(child => child.cbid == myCardToDelete.cbid);
					// may not exist anymore with the same id, for example for Google contacts where ids are changed
					// in this tricky case, pass
					if (myCardToCreate2) {
						if (myCardToCreate2.created === true) {
							cardbookRepository.cardbookUtils.addTagCreated(myCardToDelete);
							cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing undo " + cardbookRepository.currentUndoId + " deleting myCardToDelete.cbid : " + myCardToDelete.cbid);
							cardbookRepository.currentAction[myActionId].totalCards++;
							await cardbookRepository.deleteCards([myCardToDelete], myActionId);
						} else {
							cardbookRepository.cardbookUtils.addTagDeleted(myCardToDelete);
							myCardToDelete.etag = myCardToCreate2.etag;
							cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing undo " + cardbookRepository.currentUndoId + " deleting myCardToDelete.cbid : " + myCardToDelete.cbid);
							cardbookRepository.currentAction[myActionId].totalCards++;
							await cardbookRepository.deleteCards([myCardToDelete], myActionId);
						}
					}
				}
			}
			for (let myCardToCreate of item.oldCards) {
				let myCardToDelete = cardbookRepository.cardbookDisplayCards[myCardToCreate.dirPrefId].cards.find(child => child.cbid == myCardToCreate.cbid);
				if (!myCardToDelete) {
					var myMessage = "debug mode : executing undo " + cardbookRepository.currentUndoId + " adding myCardToCreate.cbid : " + myCardToCreate.cbid;
					await cardbookIDBCard.checkCardForUndoAction(myMessage, myCardToCreate, myActionId);
				} else {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing undo " + cardbookRepository.currentUndoId + " updating myCardToCreate.cbid : " + myCardToCreate.cbid);
					cardbookRepository.cardbookUtils.addTagUpdated(myCardToCreate);
					myCardToCreate.etag = myCardToDelete.etag;
					await cardbookRepository.saveCardFromMove(myCardToDelete, myCardToCreate, myActionId, false);
				}
			}
			for (let myCatToDelete of item.newCats) {
				let myCatToCreate = item.oldCats.find(child => child.dirPrefId+"::"+child.uid == myCatToDelete.dirPrefId+"::"+myCatToDelete.uid);
				if (!myCatToCreate) {
					cardbookRepository.cardbookUtils.addTagCreated(myCatToDelete);
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing undo " + cardbookRepository.currentUndoId + " deleting myCatToDelete.cbid : " + myCatToDelete.cbid);
					await cardbookRepository.deleteCategories([myCatToDelete], myActionId);
				}
			}
			cardbookRepository.currentUndoId--;
			cardbookActions.saveCurrentUndoId();
			cardbookActions.setUndoAndRedoMenuAndButton();
			await cardbookActions.endAction(myActionId);
		};

		cursorRequest.onsuccess = async function(e) {
			var result = e.target.result;
			if (result) {
				for (var item of result) {
					handleItem(item);
				}
			}
		};

		cursorRequest.onerror = cardbookRepository.cardbookActionsDatabase.onerror;
	},

	// do the redo action
	executeRedoItem: async function() {
		var db = cardbookRepository.cardbookActionsDatabase.db;
		var transaction = db.transaction(["cardUndos"], "readonly");
		var store = transaction.objectStore("cardUndos");
		var nextUndoId = cardbookRepository.currentUndoId;
		nextUndoId++;
		var keyRange = IDBKeyRange.bound(nextUndoId, nextUndoId);
		var cursorRequest = store.getAll(keyRange);
	
		const handleItem = async item => {
			try {
				item = await cardbookIDBUndo.checkUndoItem(item);
			}
			catch(e) {
				return;
			}
			var myTopic = "redoActionDone";
			var myActionId = cardbookActions.startAction(myTopic, [item.undoMessage]);
			for (let myCatToCreate of item.newCats) {
				let myCatToDelete = item.oldCats.find(child => child.dirPrefId+"::"+child.uid == myCatToCreate.dirPrefId+"::"+myCatToCreate.uid);
				if (!myCatToDelete) {
					var myMessage = "debug mode : executing redo " + cardbookRepository.currentUndoId + " adding myCatToCreate.cbid : " + myCatToCreate.cbid;
					cardbookIDBCat.checkCatForUndoAction(myMessage, myCatToCreate, myActionId);
				} else {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing redo " + cardbookRepository.currentUndoId + " updating myCatToCreate.cbid : " + myCatToCreate.cbid);
					cardbookRepository.cardbookUtils.addTagUpdated(myCatToCreate);
					myCatToCreate.etag = myCatToDelete.etag;
					await cardbookRepository.saveCategory(myCatToDelete, myCatToCreate, myActionId);
				}
			}
			for (let myCardToDelete of item.oldCards) {
				let myCardToCreate1 = item.newCards.find(child => child.cbid == myCardToDelete.cbid);
				if (!myCardToCreate1) {
					let myCardToCreate2 = cardbookRepository.cardbookDisplayCards[myCardToDelete.dirPrefId].cards.find(child => child.cbid == myCardToDelete.cbid);
					if (myCardToCreate2.created === true) {
						cardbookRepository.cardbookUtils.addTagCreated(myCardToDelete);
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing redo " + cardbookRepository.currentUndoId + " deleting myCardToDelete.cbid : " + myCardToDelete.cbid);
						cardbookRepository.currentAction[myActionId].totalCards++;
						await cardbookRepository.deleteCards([myCardToDelete], myActionId);
					} else {
						cardbookRepository.cardbookUtils.addTagDeleted(myCardToDelete);
						myCardToDelete.etag = myCardToCreate2.etag;
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing redo " + cardbookRepository.currentUndoId + " deleting myCardToDelete.cbid : " + myCardToDelete.cbid);
						cardbookRepository.currentAction[myActionId].totalCards++;
						await cardbookRepository.deleteCards([myCardToDelete], myActionId);
					}
				}
			}
			for (let myCardToCreate of item.newCards) {
				let myCardToDelete = cardbookRepository.cardbookDisplayCards[myCardToCreate.dirPrefId].cards.find(child => child.cbid == myCardToCreate.cbid);
				if (!myCardToDelete) {
					var myMessage = "debug mode : executing undo " + cardbookRepository.currentUndoId + " adding myCardToCreate.cbid : " + myCardToCreate.cbid;
					await cardbookIDBCard.checkCardForUndoAction(myMessage, myCardToCreate, myActionId);
				} else {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing redo " + cardbookRepository.currentUndoId + " updating myCardToCreate.cbid : " + myCardToCreate.cbid);
					cardbookRepository.cardbookUtils.addTagUpdated(myCardToCreate);
					myCardToCreate.etag = myCardToDelete.etag;
					await cardbookRepository.saveCardFromMove(myCardToDelete, myCardToCreate, myActionId, false);
				}
			}
			for (let myCatToDelete of item.oldCats) {
				let myCatToCreate = item.newCats.find(child => child.dirPrefId+"::"+child.uid == myCatToDelete.dirPrefId+"::"+myCatToDelete.uid);
				if (!myCatToCreate) {
					cardbookRepository.cardbookUtils.addTagCreated(myCatToDelete);
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : executing redo " + cardbookRepository.currentUndoId + " deleting myCatToDelete.cbid : " + myCatToDelete.cbid);
					await cardbookRepository.deleteCategories([myCatToDelete], myActionId);
				}
			}
			cardbookRepository.currentUndoId++;
			cardbookActions.saveCurrentUndoId();
			cardbookActions.setUndoAndRedoMenuAndButton();
			await cardbookActions.endAction(myActionId);
		};

		cursorRequest.onsuccess = async function(e) {
			var result = e.target.result;
			if (result) {
				for (var item of result) {
					handleItem(item);
				}
			}
		};

		cursorRequest.onerror = cardbookRepository.cardbookActionsDatabase.onerror;
	},

	encryptUndos: async function() {
		var undoDB = cardbookRepository.cardbookActionsDatabase.db;
		var undoTransaction = undoDB.transaction(["cardUndos"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookActionsDatabase,
			undoTransaction.objectStore("cardUndos"),
			async item => {
				try {
					await cardbookIDBUndo.addUndoItem(item.undoId, item.undoCode, item.undoMessage, item.oldCards, item.newCards, item.oldCats, item.newCats, true, "encryption");
				}
				catch(e) {
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Undo encryption failed e : " + e, "Error");
				}
			},
			item => !("encrypted" in item),
			() => cardbookActions.finishCryptoActivityOK("encryption")
		);
	},

	decryptUndos: async function() {
		var undoDB = cardbookRepository.cardbookActionsDatabase.db;
		var undoTransaction = undoDB.transaction(["cardUndos"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookActionsDatabase,
			undoTransaction.objectStore("cardUndos"),
			async item => {
				try {
					item = await cardbookEncryptor.decryptUndoItem(item);
					await cardbookIDBUndo.addUndoItem(item.undoId, item.undoCode, item.undoMessage, item.oldCards, item.newCards, item.oldCats, item.newCats, true, "decryption");
				}
				catch(e) {
					await cardbookActions.fetchCryptoActivity("decryption");
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Undo decryption failed e : " + e, "Error");
				}
			},
			item => ("encrypted" in item),
			() => cardbookActions.finishCryptoActivityOK("decryption")
		);
	},

	upgradeUndos: async function() {
		var undoDB = cardbookRepository.cardbookActionsDatabase.db;
		var undoTransaction = undoDB.transaction(["cardUndos"], "readonly");
		return cardbookIndexedDB.migrateItems(
			cardbookRepository.cardbookActionsDatabase,
			undoTransaction.objectStore("cardUndos"),
			async item => {
				try {
					item = await cardbookEncryptor.decryptUndoItem(item);
					await cardbookIDBUndo.addUndoItem(item.undoId, item.undoCode, item.undoMessage, item.oldCards, item.newCards, item.oldCats, item.newCats, true, "encryption");
				}
				catch(e) {
					await cardbookActions.fetchCryptoActivity("encryption");
					cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Undo encryption failed e : " + e, "Error");
				}
			},
			item => ("encrypted" in item && item.encryptionVersion != cardbookEncryptor.VERSION),
			() => cardbookActions.finishCryptoActivityOK("encryption")
		);
	}
};
