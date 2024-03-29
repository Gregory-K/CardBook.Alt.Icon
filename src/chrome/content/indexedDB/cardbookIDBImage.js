var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookIDBImage = {
	cardbookImageDatabaseVersion: "1",
	cardbookImageDatabaseName: "CardBookImage",
	doUpgrade: false,

	// first step for getting the images
	openImageDB: function() {
		// generic output when errors on DB
		cardbookRepository.cardbookImageDatabase.onerror = function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("Image Database error : " + e.value, "Error");
		};

		var request = indexedDB.open(cardbookIDBImage.cardbookImageDatabaseName, cardbookIDBImage.cardbookImageDatabaseVersion);
	
		// when version changes
		// for the moment delete all and recreate one new empty
		request.onupgradeneeded = function(e) {
			var db = e.target.result;
			e.target.transaction.onerror = cardbookRepository.cardbookImageDatabase.onerror;
			if (e.oldVersion < 1) {
				for (let media of cardbookRepository.allColumns.media) {
					if (db.objectStoreNames.contains(media)) {
						db.deleteObjectStore(media);
					}
					let store = db.createObjectStore(media, {keyPath: "cbid", autoIncrement: false});
					store.createIndex("dirPrefIdIndex", "dirPrefId", { unique: false });
				}
				cardbookIDBImage.doUpgrade = true;
			}
		};

		// when success, call the observer for starting the load cache and maybe the sync
		request.onsuccess = function(e) {
			cardbookRepository.cardbookImageDatabase.db = e.target.result;
			if (cardbookIDBImage.doUpgrade) {
				let cacheDir = cardbookRepository.getLocalDirectory();
				let dirIterator1 = new OS.File.DirectoryIterator(cacheDir.path);
				let ABlist = [];
				let imagelist = {};
				dirIterator1.forEach(entry => {
					if (entry.isDir) {
						ABlist.push(entry.name);
					}
				}).then( async function findImageFiles() {
					for (let name of ABlist) {
						let ABDir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
						ABDir.initWithPath(cacheDir.path);
						ABDir.append(name);
						ABDir.append("mediacache");
						if (ABDir.exists() && ABDir.isDirectory()) {
							imagelist[name] = [];
							let dirIterator2 = new OS.File.DirectoryIterator(ABDir.path);
							await dirIterator2.forEach(entry => {
								if (!entry.isDir) {
									let imageFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
									imageFile.initWithPath(ABDir.path);
									imageFile.append(entry.name);
									imagelist[name].push(imageFile.path);
								}
							});
						}
					}
				}).then( async function read() {
					for (let name of ABlist) {
						if (imagelist[name]) {
							for (let imageFilePath of imagelist[name]) {
								let imageFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
								imageFile.initWithPath(imageFilePath);
								if (imageFile.exists() && imageFile.isFile()) {
									try {
										let [ base64, extension ] = await cardbookRepository.cardbookUtils.getImageFromURI("", "", "", "file://" + imageFile.path);
										let filenameArray = imageFile.leafName.split(".");
										let uid = filenameArray[0];
										let extension1 =  extension || filenameArray[filenameArray.length-1];
										await cardbookIDBImage.addImage( "photo", "Migration", {cbid: name+"::"+uid, dirPrefId: name, extension: extension1, content: base64});
									} catch (e) {}
								}
							}
						}
					}
				}).then( () => {
					cardbookIDBImage.doUpgrade = false;
				});
			}
			cardbookRepository.cardbookUtils.notifyObservers("imageDBOpen");
		};
		
		// when error, call the observer for starting the load cache and maybe the sync
		request.onerror = function(e) {
			cardbookRepository.cardbookUtils.notifyObservers("imageDBOpen");
			cardbookRepository.cardbookImageDatabase.onerror(e);
		};
	},

	// check if the image is in a wrong encryption state
	// then decrypt the image if possible
	checkImage: async function(aDB, aDirPrefName, aImage) {
		try {
			var stateMismatched = cardbookIndexedDB.encryptionEnabled != 'encrypted' in aImage;
			var versionMismatched = aImage.encryptionVersion && aImage.encryptionVersion != cardbookEncryptor.VERSION;
			if (stateMismatched || versionMismatched) {
				if ('encrypted' in aImage) {
					aImage = await cardbookEncryptor.decryptImage(aImage);
				}
				await cardbookIDBImage.addImage(aDB, aDirPrefName, aImage);
			} else {
				if ('encrypted' in aImage) {
					aImage = await cardbookEncryptor.decryptImage(aImage);
				}
			}
			return aImage;
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
			throw new Error("failed to decrypt the image : " + e);
		}
	},

	// add or override the image to the cache
	addImage: async function(aDB, aDirPrefName, aImage, aCardName, aMode) {
		try {
			var storedImage = cardbookIndexedDB.encryptionEnabled ? (await cardbookEncryptor.encryptImage(aImage)) : aImage;
			let result = new Promise( function(resolve, reject) {
				try {
					var db = cardbookRepository.cardbookImageDatabase.db;
					var transaction = db.transaction([aDB], "readwrite");
					var store = transaction.objectStore(aDB);
					var cursorRequest = store.put(storedImage);
					cursorRequest.onsuccess = async function(e) {
						if (cardbookIndexedDB.encryptionEnabled) {
							cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Image for " + aCardName + " written to encrypted ImageDB (" + aDB + ")");
						} else {
							cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Image for " + aCardName + " written to ImageDB (" + aDB + ")");
						}
						if (aMode) {
							await cardbookActions.fetchCryptoActivity(aMode);
						}
						resolve();
					};
					
					cursorRequest.onerror = async function(e) {
						if (aMode) {
							await cardbookActions.fetchCryptoActivity(aMode);
						}
						cardbookRepository.cardbookImageDatabase.onerror(e);
						reject();
					};
				} catch(e) {
					cardbookRepository.cardbookImageDatabase.onerror(e);
					reject();
				}
			});
			let dummy = await result;
		} catch(e) {}
	},

	// delete the image
	removeImage: async function(aDB, aDirPrefName, aImage, aCardName) {
		return new Promise( function(resolve, reject) {
			var db = cardbookRepository.cardbookImageDatabase.db;
			var transaction = db.transaction([aDB], "readwrite");
			var store = transaction.objectStore(aDB);
			var cursorRequest = store.delete(aImage.cbid);
			cursorRequest.onsuccess = function(e) {
				if (cardbookIndexedDB.encryptionEnabled) {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Image " + aCardName + " deleted from encrypted ImageDB (" + aDB + ")");
				} else {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aDirPrefName + " : debug mode : Image " + aCardName + " deleted from ImageDB (" + aDB + ")");
				}
				resolve();
			};
			cursorRequest.onerror = function(e) {
				reject();
				cardbookRepository.cardbookImageDatabase.onerror(e);
			};
		});
	},

	getImage: function(aDB, aDirPrefName, aImageId, aCardName) {
		return new Promise( function(resolve, reject) {
			var db = cardbookRepository.cardbookImageDatabase.db;
			var transaction = db.transaction([aDB], "readonly");
			var store = transaction.objectStore(aDB);
			var cursorRequest = store.get(aImageId);
			cursorRequest.onsuccess = async function(e) {
				var result = e.target.result;
				if (result) {
					let image = await cardbookIDBImage.checkImage(aDB, aDirPrefName, result, aCardName);
					resolve(image);
				} else {
					resolve();
				}
			};
			cursorRequest.onerror = function(e) {
				cardbookRepository.cardbookImageDatabase.onerror(e);
				resolve();
			};
		});
	},
	
	encryptImages: async function() {
		var db = cardbookRepository.cardbookImageDatabase.db;
		for (let media of cardbookRepository.allColumns.media) {
			var imagesTransaction = db.transaction([media], "readonly");
			return cardbookIndexedDB.migrateItems(
				cardbookRepository.cardbookImageDatabase,
				imagesTransaction.objectStore(media),
				async image => {
					try {
						await cardbookIDBImage.addImage(media, cardbookRepository.cardbookPreferences.getName(image.dirPrefId), image, "unknown", "encryption");
					}
					catch(e) {
						cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
					}
				},
				image => !("encrypted" in image),
				() => cardbookActions.finishCryptoActivityOK("encryption")
			);
		}
	},

	decryptImages: async function() {
		var db = cardbookRepository.cardbookImageDatabase.db;
		for (let media of cardbookRepository.allColumns.media) {
			var imagesTransaction = db.transaction([media], "readonly");
			return cardbookIndexedDB.migrateItems(
				cardbookRepository.cardbookImageDatabase,
				imagesTransaction.objectStore(media),
				async image => {
					try {
						image = await cardbookEncryptor.decryptImage(image);
						await cardbookIDBImage.addImage(media, cardbookRepository.cardbookPreferences.getName(image.dirPrefId), image, "unknown", "decryption");
					}
					catch(e) {
						await cardbookActions.fetchCryptoActivity("decryption");
						cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Decryption failed e : " + e, "Error");
					}
				},
				image => ("encrypted" in image),
				() => cardbookActions.finishCryptoActivityOK("decryption")
			);
		}
	},

	upgradeImages: async function() {
		var db = cardbookRepository.cardbookImageDatabase.db;
		for (let media of cardbookRepository.allColumns.media) {
			var imagesTransaction = db.transaction([media], "readonly");
			return cardbookIndexedDB.migrateItems(
				cardbookRepository.cardbookImageDatabase,
				imagesTransaction.objectStore(media),
				async image => {
					try {
						image = await cardbookEncryptor.decryptCard(image);
						await cardbookIDBImage.addImage(media, cardbookRepository.cardbookPreferences.getName(image.dirPrefId), image, "unknown", "encryption");
					}
					catch(e) {
						await cardbookActions.fetchCryptoActivity("encryption");
						cardbookRepository.cardbookLog.updateStatusProgressInformation("debug mode : Encryption failed e : " + e, "Error");
					}
				},
				image => ("encrypted" in image && image.encryptionVersion != cardbookEncryptor.VERSION),
				() => cardbookActions.finishCryptoActivityOK("encryption")
			);
		}
	}
};
