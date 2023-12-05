import { cardbookHTMLUtils } from "./cardbookHTMLUtils.mjs";
import { cardbookNewPreferences } from "./preferences/cardbookNewPreferences.mjs";

export var cardbookHTMLTypes = {
	
	allIMPPs: [],
    multilineFields: [ 'email', 'tel', 'adr', 'impp', 'url' ],
	cardbookCoreTypes: { "GOOGLE2": { "adr" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"] ],
										"email" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"] ],
										"tel" : [ ["hometype", "home"], ["worktype", "work"], ["celltype", "mobile"], ["pagertype", "pager"], ["workfaxtype", "workFax"], ["homefaxtype", "homeFax"], ["othertype", "other"], ["maintype", "main"] ],
 										"url" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"], ["blogtype", "blog"], ["homepagetype", "homePage"], ["profiletype", "profile"] ],
										"impp" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"] ],
										"addnew" : true },
						"GOOGLE3": { "adr" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"] ],
										"email" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"] ],
										"tel" : [ ["hometype", "home"], ["worktype", "work"], ["celltype", "mobile"], ["pagertype", "pager"], ["workfaxtype", "workFax"], ["homefaxtype", "homeFax"], ["othertype", "other"], ["maintype", "main"] ],
 										"url" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"], ["blogtype", "blog"], ["homepagetype", "homePage"], ["profiletype", "profile"] ],
										"impp" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"] ],
										"addnew" : true },
						"APPLE": { "adr" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"email" : [ ["hometype", "HOME;HOME,INTERNET"], ["worktype", "WORK;WORK,INTERNET"], ["othertype", "OTHER;OTHER,INTERNET"] ],
									"tel" : [ ["hometype", "HOME;HOME,VOICE"], ["worktype", "WORK;WORK,VOICE"], ["celltype", "CELL;CELL,VOICE"], ["faxtype", "FAX;FAX,VOICE"], ["pagertype", "PAGER"],
												["workfaxtype", "FAX,WORK;FAX,WORK,VOICE"], ["homefaxtype", "FAX,HOME;FAX,HOME,VOICE"],
												["othertype", "OTHER;OTHER,VOICE"], ["maintype", "MAIN"], ["iphonetype", "CELL,IPHONE;CELL,IPHONE,VOICE"] ],
									"url" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["othertype", "OTHER"] ],
									"impp" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"addnew" : true },
						"YAHOO": { "adr" : [ ["hometype", "HOME;HOME,POSTAL,PARCEL,WORK"], ["worktype", "WORK;WORK,POSTAL,PARCEL"] ],
									"email" : [ ["hometype", "HOME;HOME,INTERNET"], ["worktype", "WORK;WORK,INTERNET"] ],
									"tel" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["faxtype", "FAX"], ["celltype", "CELL"] ],
									"url" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"impp" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"addnew" : false },
						"OFFICE365": { "adr" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["othertype", "OTHER"] ],
									"email" : [ ],
									"tel" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["faxtype", "FAX"], ["celltype", "CELL"], ["workfaxtype", "FAX,WORK"],
												["homefaxtype", "FAX,HOME"], ["otherfaxtype", "FAX,OTHER"], ["othertype", "OTHER"], ["assistanttype", "ASSISTANT"],
												["callbacktype", "CALLBACK"], ["carphonetype", "CARPHONE"], ["pagertype", "PAGER"], ["radiotype", "RADIO"],
												["telextype", "TELEX"], ["ttytype", "TTY"], ],
									"url" : [ ],
									"impp" : [ ],
									"addnew" : false },
						"CARDDAV": { "adr" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"email" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["othertype", "OTHER"] ],
									"tel" : [ ["hometype", "HOME;HOME,VOICE"], ["worktype", "WORK;WORK,VOICE"], ["celltype", "CELL;CELL,IPHONE;CELL,VOICE"], ["faxtype", "FAX;FAX,VOICE"], ["pagertype", "PAGER"], ["workfaxtype", "FAX,WORK;FAX,WORK,VOICE"], ["homefaxtype", "FAX,HOME;FAX,HOME,VOICE"],
												["othertype", "OTHER;OTHER,VOICE"], ["maintype", "MAIN"] ],
									"url" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["othertype", "OTHER"] ],
									"impp" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"addnew" : true } },
	
	rebuildAllPGs: function (aCard) {
		let myPgNumber = 1;
		for (let field of cardbookHTMLTypes.multilineFields) {
			for (var j = 0; j < aCard[field].length; j++) {
				let myTempString = aCard[field][j][2];
				if (myTempString.startsWith("ITEM")) {
					aCard[field][j][2] = "ITEM" + myPgNumber;
					myPgNumber++;
				}
			}
		}
		let myNewOthers = [];
		let myPGMap = {};
		for (var j = 0; j < aCard.others.length; j++) {
			let myTempString = aCard.others[j];
			var relative = []
			relative = myTempString.match(/^ITEM([0-9]*)\.(.*)/i);
			if (relative && relative[1] && relative[2]) {
				if (myPGMap[relative[1]]) {
					myNewOthers.push("ITEM" + myPGMap[relative[1]] + "." + relative[2]);
				} else {
					myNewOthers.push("ITEM" + myPgNumber + "." + relative[2]);
					myPGMap[relative[1]] = myPgNumber;
					myPgNumber++;
				}
			} else {
				myNewOthers.push(aCard.others[j]);
			}
		}
		aCard.others = JSON.parse(JSON.stringify(myNewOthers));
		return myPgNumber;
	},

	whichCodeTypeShouldBeChecked: async function (aType, aDirPrefId, aSourceArray, aSourceList) {
		if (aSourceArray.length == 0) {
			return {result: "", isAPg: false, isAlreadyThere: false};
		} else {
			var ABType = await cardbookNewPreferences.getType(aDirPrefId);
			var ABTypeFormat = cardbookHTMLUtils.getABTypeFormat(ABType);
			var match = false;
			for (var i = 0; i < cardbookHTMLTypes.cardbookCoreTypes[ABTypeFormat][aType].length && !match; i++) {
				var code = cardbookHTMLTypes.cardbookCoreTypes[ABTypeFormat][aType][i][0];
				var types = cardbookHTMLTypes.cardbookCoreTypes[ABTypeFormat][aType][i][1];
				var possibilities = types.split(";").map(value => value.toUpperCase());
				for (var j = 0; j < possibilities.length && !match; j++) {
					var possibility = possibilities[j].split(",");
					for (var k = 0; k < aSourceArray.length; k++) {
						if (possibility.indexOf(aSourceArray[k].toUpperCase()) == -1) {
							break;
						} else if (possibility.indexOf(aSourceArray[k].toUpperCase()) != -1 && k == aSourceArray.length - 1 ) {
							// here we are sure that aSourceArray in included in possibility
							if (aSourceArray.length == possibility.length) {
								match = true;
								if (cardbookHTMLTypes.cardbookCoreTypes[ABTypeFormat][aType][i][2] && cardbookHTMLTypes.cardbookCoreTypes[ABTypeFormat][aType][i][2] == "PG") {
									return {result: code, isAPg: true, isAlreadyThere: true};
								} else {
									return {result: code, isAPg: false};
								}
							}
						}
					}
				}
			}
			// the strange string may already be in the basic translated strings
			for (var i = 0; i < aSourceList.length; i++) {
				for (var j = 0; j < aSourceArray.length; j++) {
					if (aSourceArray[j].toUpperCase() == aSourceList[i][0].toUpperCase()) {
						return {result: aSourceList[i][1], isAPg: false};
					}
				}
			}
			return {result: aSourceArray[0], isAPg: true, isAlreadyThere: false};
		}
	},

	whichLabelTypeShouldBeChecked: async function (aType, aDirPrefId, aSourceArray) {
		if (aSourceArray.length == 0) {
			return "";
		} else {
            var ABType = await cardbookNewPreferences.getType(aDirPrefId);
			var ABTypeFormat = cardbookHTMLUtils.getABTypeFormat(ABType);
			var match = false;
			for (var i = 0; i < cardbookHTMLTypes.cardbookCoreTypes[ABTypeFormat][aType].length && !match; i++) {
				var code = cardbookHTMLTypes.cardbookCoreTypes[ABTypeFormat][aType][i][0];
				var types = cardbookHTMLTypes.cardbookCoreTypes[ABTypeFormat][aType][i][1];
				var possibilities = types.split(";").map(value => value.toUpperCase());
				for (var j = 0; j < possibilities.length && !match; j++) {
					var possibility = possibilities[j].split(",");
					for (var k = 0; k < aSourceArray.length; k++) {
						if (possibility.indexOf(aSourceArray[k].toUpperCase()) == -1) {
							break;
						} else if (possibility.indexOf(aSourceArray[k].toUpperCase()) != -1 && k == aSourceArray.length - 1 ) {
							// here we are sure that aSourceArray in included in possibility
							if (aSourceArray.length == possibility.length) {
								match = true;
								return await cardbookHTMLTypes.getTypeLabelFromTypeCode(ABTypeFormat, aType, code);
							}
						}
					}
				}
			}
			return aSourceArray[0];
		}
	},

	isMyCodePresent: function (aType, aCode, aABTypeFormat, aSourceArray) {
		var match = false;
		for (var i = 0; i < cardbookHTMLTypes.cardbookCoreTypes[aABTypeFormat][aType].length && !match; i++) {
			var code = cardbookHTMLTypes.cardbookCoreTypes[aABTypeFormat][aType][i][0];
			if (code.toUpperCase() != aCode.toUpperCase()) {
				continue;
			}
			var types = cardbookHTMLTypes.cardbookCoreTypes[aABTypeFormat][aType][i][1];
			var possibilities = types.split(";").map(value => value.toUpperCase());
			for (var j = 0; j < possibilities.length && !match; j++) {
				var possibility = possibilities[j].split(",");
				for (var k = 0; k < aSourceArray.length; k++) {
					if (possibility.indexOf(aSourceArray[k].toUpperCase()) == -1) {
						break;
					} else if (possibility.indexOf(aSourceArray[k].toUpperCase()) != -1 && k == aSourceArray.length - 1 ) {
						// here we are sure that aSourceArray in included in possibility
						if (aSourceArray.length == possibility.length) {
							return true;
						}
					}
				}
			}
		}
		return false;
	},

	getTypeLabelFromTypeCode: async function (aABType, aType, aTypeCode) {
		var prefResult = await cardbookHTMLUtils.getPrefValue[cardbookNewPreferences.prefCardBookCustomTypes + aABType + "." + aType + "." + aTypeCode + ".value"];
		if (prefResult) {
			return prefResult;
		} else {
			return messenger.i18n.getMessage(aTypeCode);
		}
	},

	getTypeDisabledFromTypeCode: async function (aABType, aType, aTypeCode) {
		return await cardbookHTMLUtils.getPrefValue[cardbookNewPreferences.prefCardBookCustomTypes + aABType + "." + aType + "." + aTypeCode + ".disabled"] ?? false;
	},

	getTypes: async function (aABType, aType, aResetToCore) {
		var result = [];
		for (let k = 0; k < cardbookHTMLTypes.cardbookCoreTypes[aABType][aType].length; k++) {
			var myCoreCodeType = cardbookHTMLTypes.cardbookCoreTypes[aABType][aType][k][0];
			var myDisabled = await cardbookHTMLTypes.getTypeDisabledFromTypeCode(aABType, aType, myCoreCodeType);
			if (!myDisabled || aResetToCore) {
				var myLabel = await cardbookHTMLTypes.getTypeLabelFromTypeCode(aABType, aType, myCoreCodeType);
				result.push([myLabel, myCoreCodeType]);
			}
		}
		if (!aResetToCore) {
			var tmpArray = [];
			for (const [key, value] of await cardbookNewPreferences.getBranch(`customTypes.${aABType}.${aType}`)) {
				if (key.endsWith(".value")) {
					tmpArray.push(key.replace("customTypes." + aABType + "." + aType + ".", "").replace(".value", ""));
				}
			}

			for (let k = 0; k < tmpArray.length; k++) {
				var myCustomType = tmpArray[k];
				var isItACore = false;
				for (let l = 0; l < cardbookHTMLTypes.cardbookCoreTypes[aABType][aType].length; l++) {
					var myCoreCodeType = cardbookHTMLTypes.cardbookCoreTypes[aABType][aType][l][0];
					if (myCustomType == myCoreCodeType) {
						isItACore = true;
						break;
					}
				}
				if (!isItACore) {
					result.push([myCustomType, myCustomType]);
				}
			}
		}
		return result;
	},

	getTypesFromDirPrefId: async function (aType, aDirPrefId) {
		var result = [];
		if (aDirPrefId) {
            var myABType = await cardbookNewPreferences.getType(aDirPrefId);
			var myABTypeFormat = cardbookHTMLUtils.getABTypeFormat(myABType);
		} else {
			var myABTypeFormat = "CARDDAV";
		}
		result = await cardbookHTMLTypes.getTypes(myABTypeFormat, aType, false);
		return result;
	},

	getCodeType: async function (aType, aDirPrefId, aLine) {
		let myInputTypes = [];
		myInputTypes = cardbookHTMLTypes.getOnlyTypesFromTypes(aLine);
		let sourceList = await cardbookHTMLTypes.getTypesFromDirPrefId(aType, aDirPrefId);
		cardbookHTMLUtils.sortMultipleArrayByString(sourceList, 0, 1);
		return await cardbookHTMLTypes.whichCodeTypeShouldBeChecked(aType, aDirPrefId, myInputTypes, sourceList);
	},

	getIMPPLineForCode: async function (aCode) {
		var serviceLine = [];
		var myPrefResults = [];
		myPrefResults = await cardbookNewPreferences.getAllIMPPs();
		for (var i = 0; i < myPrefResults.length; i++) {
			if (aCode.toLowerCase() == myPrefResults[i][0].toLowerCase()) {
				serviceLine = [myPrefResults[i][0], myPrefResults[i][1], myPrefResults[i][2]];
				break;
			}
		}
		return serviceLine;
	},

	getIMPPLineForProtocol: async function (aProtocol) {
		var serviceLine = [];
		var myPrefResults = [];
		myPrefResults = await cardbookNewPreferences.getAllIMPPs();
		for (var i = 0; i < myPrefResults.length; i++) {
			if (aProtocol.toLowerCase() == myPrefResults[i][2].toLowerCase()) {
				serviceLine = [myPrefResults[i][0], myPrefResults[i][1], myPrefResults[i][2]];
				break;
			}
		}
		return serviceLine;
	},

	getIMPPCode: function (aInputTypes) {
		var serviceCode = "";
		for (var j = 0; j < aInputTypes.length; j++) {
			serviceCode = aInputTypes[j].replace(/^X-SERVICE-TYPE=/i, "");
			if (serviceCode != aInputTypes[j]) {
				break;
			} else {
				serviceCode = "";
			}
		}
		return serviceCode;
	},

	getIMPPProtocol: function (aCardValue) {
		var serviceProtocol = "";
		if (aCardValue[0].indexOf(":") >= 0) {
			serviceProtocol = aCardValue[0].split(":")[0];
		}
		return serviceProtocol;
	},

	loadIMPPs: async function (aArray) {
		var myPrefResults = [];
		myPrefResults = await cardbookNewPreferences.getAllIMPPs();
		var serviceCode = "";
		var serviceProtocol = "";
		for (var i = 0; i < aArray.length; i++) {
			serviceCode = cardbookHTMLTypes.getIMPPCode(aArray[i][1]);
			serviceProtocol = cardbookHTMLTypes.getIMPPProtocol(aArray[i][0]);
			if (serviceCode != "" || serviceProtocol != "") {
				var found = false;
				for (var j = 0; j < myPrefResults.length; j++) {
					if (serviceCode != "") {
						if (myPrefResults[j][0].toLowerCase() == serviceCode.toLowerCase()) {
							found = true;
							break;
						}
					} else if (serviceProtocol != "") {
						if (myPrefResults[j][2].toLowerCase() == serviceProtocol.toLowerCase()) {
							found = true;
							break;
						}
					}
				}
				if (!found) {
					if (serviceCode == "") {
						myPrefResults.push([serviceProtocol, serviceProtocol, serviceProtocol]);
					} else if (serviceProtocol == "") {
						myPrefResults.push([serviceCode, serviceCode, serviceCode]);
					} else {
						myPrefResults.push([serviceCode, serviceCode, serviceProtocol]);
					}
				}
			}
		}
		cardbookHTMLTypes.allIMPPs = JSON.parse(JSON.stringify(myPrefResults));
	}
};
