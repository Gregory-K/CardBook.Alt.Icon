import { cardbookHTMLDates } from "./cardbookHTMLDates.mjs";
import { cardbookNewPreferences } from "./preferences/cardbookNewPreferences.mjs";

export var cardbookHTMLUtils = {
	sortArrayByString: function (aArray, aInvert) {
		function compare(a, b) { return a.localeCompare(b)*aInvert; };
		return aArray.sort(compare);
	},

	sortMultipleArrayByString: function (aArray, aIndex, aInvert) {
		function compare(a, b) { return a[aIndex].localeCompare(b[aIndex])*aInvert; };
		return aArray.sort(compare);
	},

	sortMultipleArrayByNumber: function (aArray, aIndex, aInvert) {
		function compare(a, b) { return (a[aIndex] - b[aIndex])*aInvert; };
		return aArray.sort(compare);
	},

	arrayUnique: function (array) {
		var a = array.concat();
		for (var i=0; i<a.length; ++i) {
			for (var j=i+1; j<a.length; ++j) {
				if (a[i] == a[j])
					a.splice(j--, 1);
			}
		}
		return a;
	},

	cleanArray: function (vArray) {
		var newArray = [];
		for(let i = 0; i<vArray.length; i++){
			if (vArray[i] && vArray[i] != ""){
				newArray.push(vArray[i].trim());
			}
		}
		return newArray;
	},

	escapeString: function (vString) {
		return vString.replace(/\\;/g,"@ESCAPEDSEMICOLON@").replace(/\\,/g,"@ESCAPEDCOMMA@");
	},

	escapeStringSemiColon: function (vString) {
		return vString.replace(/;/g,"@ESCAPEDSEMICOLON@");
	},

	unescapeStringSemiColon: function (vString) {
		return vString.replace(/@ESCAPEDSEMICOLON@/g,"\\;");
	},

	unescapeString: function (vString) {
		return vString.replace(/@ESCAPEDSEMICOLON@/g,";").replace(/\\;/g,";").replace(/@ESCAPEDCOMMA@/g,",").replace(/\\,/g,",");
	},

	unescapeArray: function (vArray) {
		for (let i = 0; i<vArray.length; i++){
			if (vArray[i] && vArray[i] != ""){
				vArray[i] = cardbookHTMLUtils.unescapeString(vArray[i]);
			}
		}
		return vArray;
	},

	getRadioNodes: function (aName) {
		let searchString = `input[type='radio'][name='${aName}']`;
		return document.querySelectorAll(searchString);
	},

	getRadioValue: function (aName) {
		for (let node of this.getRadioNodes(aName)) {
			if (node.checked) {
				return node.value;
			}
		}
		return null;
	},

	getPrefValue: async function (aName) {
		let value = await cardbookNewPreferences.getPrefs(aName);
		return Object.values(value)[0];
	},

	setPrefValue: async function (aName, aValue) {
		await cardbookNewPreferences.setPref(aName, aValue);
		await messenger.runtime.sendMessage({query: "cardbook.pref.setLegacyPref", key: aName, value: aValue});
	},

	delBranch: async function (aStartingPoint) {
		let keys = await cardbookNewPreferences.getBranchKeys(aStartingPoint);
		await cardbookNewPreferences.removePrefs(keys);
		await messenger.runtime.sendMessage({query: "cardbook.pref.removeLegacyPrefs", keys: keys})
	},

	randomChannel: function(brightness) {
		var r = 255-brightness;
		var n = 0|((Math.random() * r) + brightness);
		var s = n.toString(16);
		return (s.length==1) ? '0'+s : s;
	},

	randomColor: function(brightness) {
		return '#' + this.randomChannel(brightness) + this.randomChannel(brightness) + this.randomChannel(brightness);
	},

	convertField: function(aFunction, aValue) {
		switch(aFunction) {
			case "lowercase":
				return aValue.toLowerCase();
				break;
			case "uppercase":
				return aValue.toUpperCase();
				break;
			case "capitalization":
				return aValue.charAt(0).toUpperCase() + aValue.substr(1).toLowerCase();
				break;
		};
	},

	getTextColorFromBackgroundColor: function (aHexBackgroundColor) {
		function hexToRgb(aColor) {
			var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(aColor);
			return result ? {r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16)} : null;
		}

		var rgbColor = hexToRgb(aHexBackgroundColor);
		// http://www.w3.org/TR/AERT#color-contrast
		var o = Math.round(((parseInt(rgbColor.r) * 299) + (parseInt(rgbColor.g) * 587) + (parseInt(rgbColor.b) * 114)) / 1000);
		var fore = (o > 125) ? 'black' : 'white';
		return fore;
	},

	getTime: function() {
		var objToday = new Date();
		var year = objToday.getFullYear();
		var month = ("0" + (objToday.getMonth() + 1)).slice(-2);
		var day = ("0" + objToday.getDate()).slice(-2);
		var hour = ("0" + objToday.getHours()).slice(-2);
		var min = ("0" + objToday.getMinutes()).slice(-2);
		var sec = ("0" + objToday.getSeconds()).slice(-2);
		var msec = ("00" + objToday.getMilliseconds()).slice(-3);
		return year + "." + month + "." + day + " " + hour + ":" + min + ":" + sec + ":" + msec;
	},

	deleteCssAllRules: function (aStyleSheet) {
		// aStyleSheet.cssRules may not be available
		try {
			while(aStyleSheet.cssRules.length > 0) {
				aStyleSheet.deleteRule(0);
			}
		} catch(e) {}

	},

	createMarkerRule: function (aStyleSheet, aStyleSheetRuleName) {
		var ruleString = "." + aStyleSheetRuleName + " {}";
		var ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
	},

	getDateFormat: async function (aDirPrefId, aVersion) {
		let type = await cardbookNewPreferences.getType(aDirPrefId);
		if ( type == 'GOOGLE' || type == 'APPLE' || type == 'YAHOO') {
			return "YYYY-MM-DD";
		} else {
			return aVersion;
		}
	},

	addEventstoCard: function(aCard, aEventsArray, aPGNextNumber, aDateFormat) {
		var myEventsArray = [];
		for (var i = 0; i < aEventsArray.length; i++) {
			var myValue = cardbookHTMLDates.getVCardDateFromDateString(aEventsArray[i][0], aDateFormat);
			if (aEventsArray[i][2]) {
				myEventsArray.push("ITEM" + aPGNextNumber + ".X-ABDATE;TYPE=PREF:" + myValue);
			} else {
				myEventsArray.push("ITEM" + aPGNextNumber + ".X-ABDATE:" + myValue);
			}
			myEventsArray.push("ITEM" + aPGNextNumber + ".X-ABLABEL:" + aEventsArray[i][1]);
			aPGNextNumber++;
		}
		aCard.others = myEventsArray.concat(aCard.others);
	},

	getEventsFromCard: function(aCardNoteArray, aCardOthers) {
		var myResult = [];
		var myRemainingNote = [];
		var myRemainingOthers = [];
		var eventInNoteEventPrefix = messenger.i18n.getMessage("eventInNoteEventPrefix");
		var typesList = [ "Birthday" , eventInNoteEventPrefix ];
		for (var i = 0; i < aCardNoteArray.length; i++) {
			var found = false;
			for (var j in typesList) {
				var myType = typesList[j];
				// compatibility when not localized
				var EmptyParamRegExp1 = new RegExp("^" + myType + ":([^:]*):(.*)", "ig");
				if (aCardNoteArray[i].replace(EmptyParamRegExp1, "$1") != aCardNoteArray[i]) {
					var lNotesName = aCardNoteArray[i].replace(EmptyParamRegExp1, "$1").replace(/^\s+|\s+$/g,"");
					if (aCardNoteArray[i].replace(EmptyParamRegExp1, "$2") != aCardNoteArray[i]) {
						var lNotesDateFound = aCardNoteArray[i].replace(EmptyParamRegExp1, "$2").replace(/^\s+|\s+$/g,"");
						if (lNotesDateFound.endsWith(":PREF")) {
							myResult.push([lNotesDateFound.replace(":PREF", ""), lNotesName, true]);
						} else {
							myResult.push([lNotesDateFound, lNotesName, false]);
						}
						found = true;
						break;
					}
				}
			}
			if (!found) {
				myRemainingNote.push(aCardNoteArray[i]);
			}
		}
		while (myRemainingNote[0] == "") {
			myRemainingNote.shift();
		}
		// should parse this, may in wrong order, maybe in lowercase
		// ITEM1.X-ABDATE;TYPE=PREF:20200910
		// ITEM1.X-ABLABEL:fiesta
		var myPGToBeParsed = {};
		for (var i = 0; i < aCardOthers.length; i++) {
			var relative = []
			relative = aCardOthers[i].match(/^ITEM([0-9]*)\.(.*)\:(.*)/i);
			if (relative && relative[1] && relative[2] && relative[3]) {
				var myPGName = "ITEM" + relative[1];
				var relativeKey = relative[2].match(/^([^\;]*)/i);
				var key = relativeKey[1].toUpperCase();
				if (!myPGToBeParsed[myPGName]) {
					myPGToBeParsed[myPGName] = ["", "", "", ""];
				}
				if (relative[2].toUpperCase().startsWith("X-ABLABEL")) {
					myPGToBeParsed[myPGName][1] = relative[3];
				} else {
					myPGToBeParsed[myPGName][0] = relative[3];
					myPGToBeParsed[myPGName][2] = relative[2].replace(key, "");
					myPGToBeParsed[myPGName][3] = key;
				}
			} else {
				myRemainingOthers.push(aCardOthers[i]);
			}
		}
		for (var i in myPGToBeParsed) {
			if (myPGToBeParsed[i][3] == "X-ABDATE") {
				myResult.push([myPGToBeParsed[i][0], myPGToBeParsed[i][1], myPGToBeParsed[i][2]]);
			} else {
				if (myPGToBeParsed[i][2]) {
					myRemainingOthers.push(i + "." + myPGToBeParsed[i][3] + myPGToBeParsed[i][2] + ":" + myPGToBeParsed[i][0]);
				} else {
					myRemainingOthers.push(i + "." + myPGToBeParsed[i][3] + ":" + myPGToBeParsed[i][0]);
				}
				myRemainingOthers.push(i + ".X-ABLABEL:" + myPGToBeParsed[i][1]);
			}
		}
		return {result: myResult, remainingNote: myRemainingNote, remainingOthers: myRemainingOthers};
	},

	rebuildAllPGs: function (aCard) {
		let multilineFields = [ 'email', 'tel', 'adr', 'impp', 'url' ];
		let myPgNumber = 1;
		for (let field of multilineFields) {
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

	getABTypeFormat: function (aType) {
		switch(aType) {
			case "DIRECTORY":
			case "FILE":
			case "LOCALDB":
			case "CARDDAV":
			case "SEARCH":
				return "CARDDAV";
				break;
		};
		return aType;
	},

	getOnlyTypesFromTypes: function(aArray) {
		function deletePrefs(element) {
			return !(element.toUpperCase().replace(/TYPE=PREF/i,"PREF").replace(/PREF=[0-9]*/i,"PREF") == "PREF");
		}
		let result = [];
		for (let type of aArray) {
			var upperElement = type.toUpperCase();
			if (upperElement == "PREF" || upperElement == "TYPE=PREF") {
				continue;
			} else if (upperElement == "HOME" || upperElement == "FAX" || upperElement == "CELL" || upperElement == "WORK") {
				result.push(type);
			} else if (upperElement.replace(/^TYPE=/i,"") !== upperElement) {
				var tmpArray = type.replace(/^TYPE=/ig,"").split(",").filter(deletePrefs);
				for (var j = 0; j < tmpArray.length; j++) {
					if (tmpArray[j] == "VOICE" || tmpArray[j] == "INTERNET") {
						continue;
					}
					result.push(tmpArray[j]);
				}
			}
		}
		return result;
	},

	getPrefBooleanFromTypes: function(aArray) {
		if (aArray) {
			for (let type of aArray) {
				var upperElement = type.toUpperCase();
				if (upperElement === "PREF" || upperElement === "TYPE=PREF") {
					return true;
				} else if (upperElement.replace(/PREF=[0-9]*/i,"PREF") == "PREF") {
					return true;
				} else if (upperElement.replace(/^TYPE=/ig,"") !== upperElement) {
					var tmpArray = type.replace(/^TYPE=/ig,"").split(",");
					for (var j = 0; j < tmpArray.length; j++) {
						var upperElement1 = tmpArray[j].toUpperCase();
						if (upperElement1 === "PREF") {
							return true;
						} else if (upperElement1.replace(/PREF=[0-9]*/i,"PREF") == "PREF") {
							return true;
						}
					}
				}
			}
		}
		return false;
	},

	formatTelForSearching: function (aString) {
		// +33 6 45 44 42 25 should be equal to 06 45 44 42 25 should be equal to 00 33 6 45 44 42 25 should be equal to 0645444225
		return aString.replace(/^\+\d+\s+/g, "").replace(/^00\s+\d+\s+/g, "").replace(/\D/g, "").replace(/^0/g, "");
	},

	formatTypesForDisplay: function (aTypeList) {
		aTypeList = cardbookHTMLUtils.cleanArray(aTypeList);
		return cardbookHTMLUtils.sortArrayByString(aTypeList, 1).join("    ");
	},

	addMemberstoCard: async function(aCard, aMemberLines, aKindValue) {
		if (aCard.version == "4.0") {
			aCard.member = JSON.parse(JSON.stringify(aMemberLines));
			if (aKindValue) {
				aCard.kind = aKindValue;
			} else {
				aCard.kind = "group";
			}
		} else if (aCard.version == "3.0") {
			let kindCustom = await cardbookHTMLUtils.getPrefValue("kindCustom");
			let memberCustom = await cardbookHTMLUtils.getPrefValue("memberCustom");
			for (var i = 0; i < aCard.others.length; i++) {
				localDelim1 = aCard.others[i].indexOf(":",0);
				if (localDelim1 >= 0) {
					var header = aCard.others[i].substr(0, localDelim1).toUpperCase();
					var trailer = aCard.others[i].substr(localDelim1+1, aCard.others[i].length);
					if (header == kindCustom || header == memberCustom) {
						aCard.others.splice(i, 1);
						i--;
						continue;
					}
				}
			}
			for (var i = 0; i < aMemberLines.length; i++) {
				if (i === 0) {
					if (aKindValue) {
						aCard.others.push(kindCustom + ":" + aKindValue);
					} else {
						aCard.others.push(kindCustom + ":group");
					}
				}
				aCard.others.push(memberCustom + ":" + aMemberLines[i]);
			}
		}
	},

};
