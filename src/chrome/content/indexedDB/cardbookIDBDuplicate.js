var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookIDBDuplicate = {
	cardbookDuplicateDatabaseVersion: "9",
	cardbookDuplicateDatabaseName: "cardbookDuplicate",
    doUpgrade: false,

	// first step for getting the mail popularities
	openDuplicateDB: async function() {
		// generic output when errors on DB
		cardbookRepository.cardbookDuplicateDatabase.onerror = function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("Duplicate Database error : " + e.value, "Error");
		};

        let result = new Promise( function(resolve, reject) {
            var request = indexedDB.open(cardbookIDBDuplicate.cardbookDuplicateDatabaseName, cardbookIDBDuplicate.cardbookDuplicateDatabaseVersion);
	
            request.onupgradeneeded = function(e) {
                var db = e.target.result;
                e.target.transaction.onerror = cardbookRepository.cardbookDuplicateDatabase.onerror;
                if (e.oldVersion < 9) {
                    if (db.objectStoreNames.contains("duplicate")) {
                        db.deleteObjectStore("duplicate");
                    }
                    let store = db.createObjectStore("duplicate", {keyPath: "duplicateId", autoIncrement: false});
                    cardbookIDBDuplicate.doUpgrade = true;
                }
            };

            // when success, call the observer for starting the load cache and maybe the sync
            request.onsuccess = async function(e) {
                cardbookRepository.cardbookDuplicateDatabase.db = e.target.result;
                if (cardbookIDBDuplicate.doUpgrade) {
                    let cacheDir = cardbookRepository.getLocalDirectory();
                    cacheDir.append(cardbookRepository.cardbookDuplicateFile);
                    let win = Services.wm.getMostRecentWindow("mail:3pane", true);
                    let content = await win.IOUtils.readUTF8(cacheDir.path);
                    if (content) {
                        let re = /[\n\u0085\u2028\u2029]|\r\n?/;
                        let fileContentArray = content.split(re);
                        for (let line of fileContentArray) {
                            let lineArray = line.split("::");
                            let id1 = lineArray[0];
                            let id2 = lineArray[1];
                            if (id1 && id2) {
                                cardbookIDBDuplicate.addDuplicate(id1, id2);
                            }
                        }
                    }
                    cardbookIDBDuplicate.doUpgrade = false;
                }
                resolve();
            };
            
            // when error, call the observer for starting the load cache and maybe the sync
            request.onerror = function(e) {
                cardbookRepository.cardbookDuplicateDatabase.onerror(e);
                reject();
            };
        });
        let dummy = await result;
	},

	// add or override the duplicate to the cache
	addDuplicate: async function(aId1, aId2) {
        let load = new Promise( function(resolve, reject) {
            let duplicate = {"duplicateId": aId1+"::"+aId2, "cbid1": aId1, "cbid2": aId2};
            var db = cardbookRepository.cardbookDuplicateDatabase.db;
            var transaction = db.transaction(["duplicate"], "readwrite");
            var store = transaction.objectStore("duplicate");
            var cursorRequest = store.put(duplicate);

            cursorRequest.onsuccess = function(e) {
                cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Duplicate " + duplicate.cbid1 + "::" + duplicate.cbid2 + " written to duplicateDB");
                resolve();
            };

			cursorRequest.onerror = function(e) {
				reject();
				cardbookRepository.cardbookDuplicateDatabase.onerror(e);
			};
        });
        let duplicate = await load;
        return duplicate;
    },

	// delete the duplicate
	removeDuplicate: async function(aId1) {
        let deleteDup = new Promise( function(resolve, reject) {
            var db = cardbookRepository.cardbookDuplicateDatabase.db;
            var transaction = db.transaction(["duplicate"], "readwrite");
            var store = transaction.objectStore("duplicate");
            var cursorRequest = store.delete(aId1);
        
            cursorRequest.onsuccess = async function(e) {
                resolve();
            };
			cursorRequest.onerror = function(e) {
				reject();
				cardbookRepository.cardbookDuplicateDatabase.onerror(e);
			};
        });
        await deleteDup;
	},

	// delete the duplicates
	removeDuplicates: async function(aCbid) {
        let deleteDups = new Promise( function(resolve, reject) {
            var db = cardbookRepository.cardbookDuplicateDatabase.db;
            var transaction = db.transaction(["duplicate"], "readonly");
            var store = transaction.objectStore("duplicate");
            var cursorRequest = store.getAll();
        
            cursorRequest.onsuccess = async function(e) {
                let results = {};
                var result = e.target.result;
                if (result) {
                    for (let duplicate of result) {
                        if (duplicate.cbid1 == aCbid || duplicate.cbid2 == aCbid) {
                            await cardbookIDBDuplicate.removeDuplicate(duplicate.duplicateId);
                        }
                    }
                }
                resolve();
            };
			cursorRequest.onerror = function(e) {
				reject();
				cardbookRepository.cardbookDuplicateDatabase.onerror(e);
			};
        });
        await deleteDups;
	},

	loadDuplicate: async function() {
        let load = new Promise( function(resolve, reject) {
            var db = cardbookRepository.cardbookDuplicateDatabase.db;
            var transaction = db.transaction(["duplicate"], "readonly");
            var store = transaction.objectStore("duplicate");
            var cursorRequest = store.getAll();
        
            cursorRequest.onsuccess = async function(e) {
                let results = {};
                var result = e.target.result;
                if (result) {
                    for (let duplicate of result) {
                        let cbid1 = duplicate.cbid1;
                        let cbid2 = duplicate.cbid2;
                        if (cbid1 > cbid2) {
                            if (!results[cbid1]) {
                                results[cbid1] = [];
                            }
                            results[cbid1].push(cbid2);
                        } else {
                            if (!results[cbid2]) {
                                results[cbid2] = [];
                            }
                            results[cbid2].push(cbid1);
                        }
                    }
                }
                resolve(results);
            };
			cursorRequest.onerror = function(e) {
				reject();
				cardbookRepository.cardbookDuplicateDatabase.onerror(e);
			};
        });
        let duplicate = await load;
        return duplicate;
	}
};
