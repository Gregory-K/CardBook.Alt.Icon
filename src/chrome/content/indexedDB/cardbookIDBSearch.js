var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookIDBSearch = {
	cardbookSearchDatabaseVersion: "8",
	cardbookSearchDatabaseName: "cardbookSearch",
	doUpgrade: false,

	// first step for getting the mail popularities
	openSearchDB: function() {
		// generic output when errors on DB
		cardbookRepository.cardbookSearchDatabase.onerror = function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("Search popularity Database error : " + e.value, "Error");
		};

		var request = indexedDB.open(cardbookIDBSearch.cardbookSearchDatabaseName, cardbookIDBSearch.cardbookSearchDatabaseVersion);
	
		request.onupgradeneeded = function(e) {
			var db = e.target.result;
			e.target.transaction.onerror = cardbookRepository.cardbookSearchDatabase.onerror;
			if (e.oldVersion < 1) {
				if (db.objectStoreNames.contains("search")) {
					db.deleteObjectStore("search");
				}
				let store = db.createObjectStore("search", {keyPath: "dirPrefId", autoIncrement: false});
			}
			if (e.oldVersion < 8) {
				cardbookIDBSearch.doUpgrade = true;
			}
		};

		// when success, call the observer for starting the load cache and maybe the sync
		request.onsuccess = async function(e) {
			cardbookRepository.cardbookSearchDatabase.db = e.target.result;

			if (cardbookIDBSearch.doUpgrade) {
				let db = cardbookRepository.cardbookSearchDatabase.db;
				let transaction = db.transaction(["search"], "readonly");
				let store = transaction.objectStore("search");
				let cursorRequest = store.getAll();
				cursorRequest.onsuccess = async function(e) {
					let results = e.target.result;
					if (results) {
						for (let result of results) {
							let newrules = [];
							for (let rule of result.rules) {
								if (rule.value) {
									newrules.push({case: rule.case, field: rule.field.replaceAll(".", "_"), term: rule.term, value: rule.value});
								} else {
									newrules.push({case: rule.case, field: rule.field.replaceAll(".", "_"), term: rule.term});
								}
							}
							await cardbookIDBSearch.removeSearch(result.dirPrefId);
							await cardbookIDBSearch.addSearch({dirPrefId: result.dirPrefId, searchAB: result.searchAB, matchAll: result.matchAll, rules: newrules});
						}
					}
					cardbookIDBSearch.doUpgrade = false;
					cardbookRepository.cardbookUtils.notifyObservers("searchDBOpen");
				};
				cursorRequest.onerror = cardbookRepository.cardbookSearchDatabase.onerror;
			} else {
				cardbookRepository.cardbookUtils.notifyObservers("searchDBOpen");
			}
		};
		
		// when error, call the observer for starting the load cache and maybe the sync
		request.onerror = function(e) {
			cardbookRepository.cardbookUtils.notifyObservers("searchDBOpen");
			cardbookRepository.cardbookSearchDatabase.onerror(e);
		};
	},

	// add or override the search to the cache
	addSearch: function(aSearch) {
		return new Promise( function(resolve, reject) {
			var db = cardbookRepository.cardbookSearchDatabase.db;
			var transaction = db.transaction(["search"], "readwrite");
			var store = transaction.objectStore("search");
			var cursorRequest = store.put(aSearch);

			cursorRequest.onsuccess = function(e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Search " + aSearch.dirPrefId + " written to searchDB");
				resolve();
			};

			cursorRequest.onerror = function(e) {
				cardbookRepository.cardbookSearchDatabase.onerror(e);
				resolve();
			};
		});
	},

	// delete the search
	removeSearch: function(aDirPrefId) {
		return new Promise( function(resolve, reject) {
			var db = cardbookRepository.cardbookSearchDatabase.db;
			var transaction = db.transaction(["search"], "readwrite");
			var store = transaction.objectStore("search");
			var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
			var cursorDelete = store.delete(keyRange);
			
			cursorDelete.onsuccess = async function(e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Search " + aDirPrefId + " deleted from searchDB");
				resolve();
			};
			cursorDelete.onerror = function(e) {
				cardbookRepository.cardbookSearchDatabase.onerror(e);
				resolve();
			};
		});
	},

	// once the DB is open, this is the second step 
	loadSearch: function(aDirPrefId, aCallBack) {
		var db = cardbookRepository.cardbookSearchDatabase.db;
		var transaction = db.transaction(["search"], "readonly");
		var store = transaction.objectStore("search");
		var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
		var cursorRequest = store.getAll(keyRange);
	
		cursorRequest.onsuccess = async function(e) {
			var result = e.target.result;
			if (result) {
				for (var search of result) {
					cardbookRepository.cardbookComplexSearch[aDirPrefId] = {}
					cardbookRepository.cardbookComplexSearch[aDirPrefId].searchAB = search.searchAB;
					cardbookRepository.cardbookComplexSearch[aDirPrefId].matchAll = search.matchAll;
					cardbookRepository.cardbookComplexSearch[aDirPrefId].rules = [];
					for (let rule of search.rules) {
						if (rule.value) {
							cardbookRepository.cardbookComplexSearch[aDirPrefId].rules.push({case: rule.case, field: rule.field, term: rule.term, value: rule.value});
						} else {
							cardbookRepository.cardbookComplexSearch[aDirPrefId].rules.push({case: rule.case, field: rule.field, term: rule.term, value: ""});
						}
					}
				}
			}
		};

		cursorRequest.onerror = cardbookRepository.cardbookSearchDatabase.onerror;

		transaction.oncomplete = function() {
			aCallBack(aDirPrefId);
		};
	}
};
