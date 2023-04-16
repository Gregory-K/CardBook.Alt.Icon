var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookIndexedDB = {

	get encryptionEnabled() {
		return cardbookRepository.cardbookPrefs["localDataEncryption"];
	},

	// remove an account
	removeAccount: function(aDirPrefId, aDirPrefName) {
		// cards
		var db = cardbookRepository.cardbookDatabase.db;
		var transaction = db.transaction(["cards"], "readwrite");
		var store = transaction.objectStore("cards");
		var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
		var cursorRequest = store.delete(keyRange);
	
		cursorRequest.onsuccess = async function(e) {
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from encrypted DB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from DB");
			}
		};

		cursorRequest.onerror = cardbookRepository.cardbookDatabase.onerror;

		// categories
		var db = cardbookRepository.cardbookCatDatabase.db;
		var transaction = db.transaction(["categories"], "readwrite");
		var store = transaction.objectStore("categories");
		var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
		var cursorRequest = store.delete(keyRange);
	
		cursorRequest.onsuccess = async function(e) {
			if (cardbookIndexedDB.encryptionEnabled) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from encrypted CatDB");
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from CatDB");
			}
		};

		cursorRequest.onerror = cardbookRepository.cardbookCatDatabase.onerror;

		// images
		for (let media of cardbookRepository.allColumns.media) {
			var db = cardbookRepository.cardbookImageDatabase.db;
			var transaction = db.transaction([media], "readwrite");
			var store = transaction.objectStore(media);
			var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
			var cursorRequest = store.delete(keyRange);
		
			cursorRequest.onsuccess = async function(e) {
				if (cardbookIndexedDB.encryptionEnabled) {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from encrypted ImageDB (" + media + ")");
				} else {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : deleted from ImageDB (" + media + ")");
				}
			};
	
			cursorRequest.onerror = cardbookRepository.cardbookImageDatabase.onerror;
		}
	},

	migrateItems: async function(aDatabase, aStore, aMigrateItem, aShouldMigrateItem, aOnComplete) {
		var getAllRequest = aStore.getAll();
		var toBeMigrated = [];

		getAllRequest.onsuccess = async function(e) {
			var result = e.target.result;
			if (result) {
				for (var item of result) {
					if (aShouldMigrateItem(item)) {
						toBeMigrated.push(item);
					}
				}
				await cardbookActions.fetchCryptoCount(toBeMigrated.length);
				for (var item of toBeMigrated) {
					aMigrateItem(item);
				}
				if (toBeMigrated.length == 0) {
					aOnComplete();
				}
			}
		};
		
		getAllRequest.onerror = (e) => {
			cardbookActions.finishCryptoActivity();
			aDatabase.onerror(e);
		};
	},

	encryptDBs: async function() {
		cardbookActions.initCryptoActivity("encryption");
		await cardbookIDBCat.encryptCategories();
		await cardbookIDBCard.encryptCards();
		await cardbookIDBUndo.encryptUndos();
		await cardbookIDBImage.encryptImages();
		await cardbookIDBMailPop.encryptMailPops();
		await cardbookIDBPrefDispName.encryptPrefDispNames();
	},

	decryptDBs: async function() {
		cardbookActions.initCryptoActivity("decryption");
		await cardbookIDBCat.decryptCategories();
		await cardbookIDBCard.decryptCards();
		await cardbookIDBUndo.decryptUndos();
		await cardbookIDBImage.decryptImages();
		await cardbookIDBMailPop.decryptMailPops();
		await cardbookIDBPrefDispName.decryptPrefDispNames();
	},

	upgradeDBs: async function() {
		var lastValidatedVersion = cardbookRepository.cardbookPrefs["localDataEncryption.validatedVersion"];
		if (lastValidatedVersion != cardbookEncryptor.VERSION) {
			cardbookActions.initCryptoActivity("encryption");
			Promise.all([
				cardbookIDBCat.upgradeCategories(),
				cardbookIDBCard.upgradeCards(),
				cardbookIDBUndo.upgradeUndos(),
				cardbookIDBImage.upgradeImages(),
				cardbookIDBMailPop.upgradeMailPops(),
				cardbookIDBPrefDispName.upgradePrefDispNames()
			]).then(() => {
				cardbookRepository.cardbookPreferences.setStringPref("localDataEncryption.validatedVersion", String(cardbookEncryptor.VERSION));
			});
		}
	}
};
