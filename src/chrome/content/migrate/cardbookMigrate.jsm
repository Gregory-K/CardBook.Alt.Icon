var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
var { VCardUtils } = ChromeUtils.import("resource:///modules/VCardUtils.jsm");

try {
	// import categories
	let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
	loader.loadSubScript("chrome://sendtocategory/content/category_tools.js");
} catch (e) {}
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookCardParser.js", this);

var EXPORTED_SYMBOLS = ["cardbookMigrate"];
var cardbookMigrate = {

	allLists : {},

	translateStandardCards: async function (aDirPrefIdTarget, aDirPrefIdTargetName, aABCard, aVersion, aDateFormat) {
		try {
			let vCard = aABCard.getProperty("_vCard", "");
			if (!vCard) {
				return
			}
			let myCard = new cardbookCardParser(vCard, "", "", aDirPrefIdTarget);
			myCard.dirPrefId = aDirPrefIdTarget;
			
			let photoName = aABCard.getProperty("PhotoName", "");
			let file = Services.dirsvc.get("ProfD", Components.interfaces.nsIFile);
			file.append("Photos");
			file.append(photoName);
			if (file.exists()) {
				let photoURI = Services.io.newFileURI(file).spec;
				try {
					let [ base64, extension ] = await cardbookRepository.cardbookUtils.getImageFromURI(myCard.dirPrefId, myCard.fn, "import standard AB", photoURI);
					if (base64) {
						myCard.photo.value = base64;
						myCard.photo.extension = extension || cardbookRepository.cardbookUtils.getFileExtension(photoURI);
					}
				} catch (e) {}
			}
			
			// import categories
			try {
				let catsArray = [];
				catsArray = jbCatMan.getCategoriesfromCard(aABCard);
				let finalcatArray = [];
				for (let cat of catsArray) {
					finalcatArray = finalcatArray.concat(cat.split(" / "));
				}
				cardbookRepository.cardbookUtils.sortArrayByString(finalcatArray,1);
				finalcatArray = cardbookRepository.arrayUnique(finalcatArray);
				myCard.categories = JSON.parse(JSON.stringify(finalcatArray));
			} catch (e) {}
			
			await cardbookRepository.saveCardFromUpdate({}, myCard, "", true);

			let preferDisplayName = aABCard.getProperty("PreferDisplayName", "");
			for (let emailLine of myCard.email) {
				let email = emailLine[0][0];
				if (preferDisplayName == "1") {
					cardbookIDBPrefDispName.removePrefDispName(email);
				} else {
					cardbookIDBPrefDispName.addPrefDispName({email: email});
				}
			}

			let email = aABCard.getProperty("PrimaryEmail", "").toLowerCase();
			let emailValue = parseInt(aABCard.getProperty("PopularityIndex", "0"));
			if (email != "" && emailValue != "0" && emailValue != " ") {
				cardbookRepository.addMailPop(email, emailValue);
			}

			cardbookRepository.cardbookServerCardSyncDone[aDirPrefIdTarget]++;
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookMigrate.translateStandardCards error : " + e, "Error");
			cardbookRepository.cardbookServerCardSyncError[aDirPrefIdTarget]++;
			cardbookRepository.cardbookServerCardSyncDone[aDirPrefIdTarget]++;
		}
	},

	getSolvedListNumber: function (aDirPrefIdTarget) {
		var result = 0;
		for (let i in cardbookMigrate.allLists[aDirPrefIdTarget]) {
			if (cardbookMigrate.allLists[aDirPrefIdTarget][i].solved) {
				result++;
			}
		}
		return result;
	},

	mayTheListBeResolved: function (aDirPrefIdTarget, aABList) {
		try {
			for (let card of aABList.childCards) {
				var myABCard = card.QueryInterface(Components.interfaces.nsIAbCard);
				var myEmail = myABCard.primaryEmail;
				var myName = myABCard.getProperty("DisplayName","");
				if ((myName == myEmail) && cardbookMigrate.allLists[aDirPrefIdTarget][myName]) {
					if (!cardbookMigrate.allLists[aDirPrefIdTarget][myName].solved) {
						return false;
					}
				}
			}
			return true
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookMigrate.mayTheListBeResolved error : " + e, "Error");
			return false;
		}
	},

	translateStandardLists: async function (aDirPrefIdTarget, aDirPrefIdTargetName, aVersion) {
		try {
			var myBeforeNumber = cardbookMigrate.getSolvedListNumber(aDirPrefIdTarget);
			var myAfterNumber = 0;
			var myCondition = true;
			// loop until all lists may be solved
			while (myCondition) {
				for (listName in cardbookMigrate.allLists[aDirPrefIdTarget]) {
					if (!cardbookMigrate.allLists[aDirPrefIdTarget][listName].solved && cardbookMigrate.mayTheListBeResolved(aDirPrefIdTarget, cardbookMigrate.allLists[aDirPrefIdTarget][listName].list)) {
						var myList = cardbookMigrate.allLists[aDirPrefIdTarget][listName].list;
						var myCard = new cardbookCardParser();
						myCard.dirPrefId = aDirPrefIdTarget;
						myCard.version = aVersion;
						var myMap = [ ["dirName", "fn"], ["listNickName", "nickname"], ["description", "note"] ];
						for (var i = 0; i < myMap.length; i++) {
							myCard[myMap[i][1]] = myList[myMap[i][0]];
						}
						var myTargetMembers = [];
						for (let card of myList.childCards) {
							var myABCard = card.QueryInterface(Components.interfaces.nsIAbCard);
							var myEmail = myABCard.primaryEmail;
							var myLowerEmail = myEmail.toLowerCase();
							var myName = myABCard.getProperty("DisplayName","");
							try {
								// within a standard list all members are simple cards… weird…
								if ((myName == myEmail) && cardbookMigrate.allLists[aDirPrefIdTarget][myName] && cardbookMigrate.allLists[aDirPrefIdTarget][myName].solved) {
									myTargetMembers.push("urn:uuid:" + cardbookMigrate.allLists[aDirPrefIdTarget][myName].uid);
								} else if (cardbookRepository.cardbookCardEmails[aDirPrefIdTarget][myLowerEmail]) {
									var myTargetCard = cardbookRepository.cardbookCardEmails[aDirPrefIdTarget][myLowerEmail][0];
									myTargetMembers.push("urn:uuid:" + myTargetCard.uid);
								}
							}
							catch (e) {}
						}

						cardbookRepository.cardbookUtils.addMemberstoCard(myCard, myTargetMembers, "group");
						
						await cardbookRepository.saveCardFromUpdate({}, myCard, "", true);
						cardbookRepository.cardbookServerCardSyncDone[aDirPrefIdTarget]++;

						cardbookMigrate.allLists[aDirPrefIdTarget][listName].solved = true;
						cardbookMigrate.allLists[aDirPrefIdTarget][listName].uid = myCard.uid;
					}
				}
				myAfterNumber = cardbookMigrate.getSolvedListNumber(aDirPrefIdTarget);
				myCondition = (myBeforeNumber != myAfterNumber);
				myBeforeNumber = myAfterNumber;
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookMigrate.translateStandardLists error : " + e, "Error");
			cardbookRepository.cardbookServerCardSyncError[aDirPrefIdTarget]++;
			cardbookRepository.cardbookServerCardSyncDone[aDirPrefIdTarget]++;
		}
	},

	getNotNullFn: function (aCard, aABCard) {
		try {
			if (aCard.fn != "") {
				return;
			}
			if (aCard.org != "") {
				aCard.fn = aCard.org;
				return;
			}
			if (aCard.lastname != "") {
				aCard.fn = aCard.lastname;
				return;
			}
			if (aCard.firstname != "") {
				aCard.fn = aCard.firstname;
				return;
			}
			var myEmail = aABCard.getProperty("PrimaryEmail", "");
			if (myEmail != "") {
				var myTmpArray = myEmail.split("@");
				aCard.fn = myTmpArray[0].replace(/\./g, " ");
				return;
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookMigrate.getNotNullFn error : " + e, "Error");
		}
	},

	importCards: async function (aDirPrefIdSource, aDirPrefIdTarget, aDirPrefIdTargetName, aVersion) {
		for (let addrbook of MailServices.ab.directories) {
			if (addrbook.dirPrefId == aDirPrefIdSource) {
				cardbookMigrate.allLists[aDirPrefIdTarget] = {};
				for (let myABCard of addrbook.childCards) {					
					if (!myABCard.isMailList) {
						cardbookRepository.cardbookServerCardSyncTotal[aDirPrefIdTarget]++;
						let myDateFormat = cardbookRepository.getDateFormat(aDirPrefIdTarget, aVersion);
						await cardbookMigrate.translateStandardCards(aDirPrefIdTarget, aDirPrefIdTargetName, myABCard, aVersion, myDateFormat);
					} else {
						let myABList = MailServices.ab.getDirectory(myABCard.mailListURI);
						cardbookMigrate.allLists[aDirPrefIdTarget][myABList.dirName] = {};
						cardbookMigrate.allLists[aDirPrefIdTarget][myABList.dirName].solved = false;
						cardbookMigrate.allLists[aDirPrefIdTarget][myABList.dirName].list = myABList;
						cardbookRepository.cardbookServerCardSyncTotal[aDirPrefIdTarget]++;
					}
				}
				await cardbookMigrate.translateStandardLists(aDirPrefIdTarget, aDirPrefIdTargetName, aVersion);
				break;
			}
		}
		cardbookRepository.writePossibleCustomFields();
		cardbookRepository.cardbookDBCardResponse[aDirPrefIdTarget]++;
	}
	
};

