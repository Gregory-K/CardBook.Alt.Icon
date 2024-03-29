var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/cardbookWebDAV.js", this);

var EXPORTED_SYMBOLS = ["cardbookUtils"];
var cardbookUtils = {
	
	formatTelForSearching: function (aString) {
		// +33 6 45 44 42 25 should be equal to 06 45 44 42 25 should be equal to 00 33 6 45 44 42 25 should be equal to 0645444225
		return aString.replace(/^\+\d+\s+/g, "").replace(/^00\s+\d+\s+/g, "").replace(/\D/g, "").replace(/^0/g, "");
	},

	formatTelForOpenning: function (aString) {
		return aString.replace(/\s*/g, "").replace(/-*/g, "").replace(/\.*/g, "");
	},

	formatIMPPForOpenning: function (aString) {
		return aString.replace(/\s*/g, "");
	},

	formatExtension: function (aExtension, aVersion) {
		switch (aExtension) {
			case "pgp":
			case "pub":
				aExtension = "pgp";
				break;
			case "JPG":
			case "jpg":
				aExtension = "jpeg";
				break;
			case "TIF":
			case "tif":
				aExtension = "tiff";
				break;
			case "":
				aExtension = "jpeg";
		}
		if (aVersion == "4.0") {
			aExtension = aExtension.toLowerCase();
		} else {
			aExtension = aExtension.toUpperCase();
		}
		return aExtension;
	},

	cleanCategories: function (aCategoryList) {
		function filterCategories(element) {
			return (element != cardbookRepository.cardbookPrefs["uncategorizedCards"]);
		}
		return cardbookRepository.arrayUnique(aCategoryList.filter(filterCategories));
	},

	formatCategoryForCss: function (aCategory) {
		return aCategory.replace(/[!\"#$%&'\(\)\*\+,\.\/:;<=>\?\@\[\\\]\^`\{\|\}~ ]/g, '_');
	},

	formatTypesForDisplay: function (aTypeList) {
		aTypeList = cardbookUtils.cleanArray(aTypeList);
		return cardbookUtils.sortArrayByString(aTypeList,1).join("    ");
	},

	// aTypesList should be escaped
	// TYPE="WORK,VOICE" would be splitted into TYPE=WORK,TYPE=HOME
	// the duplicate types would also be removed
	formatTypes: function (aTypesList) {
		var result = [];
		for (var i = 0; i < aTypesList.length; i++) {
			var myTempString = aTypesList[i].replace(/\"/g,"");
			if ((myTempString.indexOf(",") != -1) && (myTempString.indexOf("TYPE=",0) == 0)) {
				var myTempArray = myTempString.replace(/^TYPE=/, "").split(",");
				for (var j = 0; j < myTempArray.length; j++) {
					result.push("TYPE=" + myTempArray[j]);
				}
			} else if (myTempString && myTempString != "") {
				result.push(myTempString);
			}
		}
		return cardbookRepository.arrayUnique(result);
	},

	formatAddress: function(aAddress, aAdrFormula) {
		let result =  "";
		let defaultAdrFormula = cardbookRepository.extension.localeData.localizeMessage("addressFormatFormula");
		let myAdrFormula = aAdrFormula ||
							cardbookRepository.cardbookPrefs["adrFormula"] ||
							defaultAdrFormula;
		let addressArray = JSON.parse(JSON.stringify(aAddress));
		// maybe a country code (Google uses them)
		let lcRegionCode = addressArray[6].toLowerCase();
		if (cardbookRepository.countriesList.includes(lcRegionCode)) {
			addressArray[6] = cardbookRepository.extension.localeData.localizeMessage("region-name-" + lcRegionCode);
		}
		result = cardbookUtils.getStringFromFormula(myAdrFormula, addressArray);
		var re = /[\n\u0085\u2028\u2029]|\r\n?/;
		var myAdrResultArray = result.split(re);
		return cardbookUtils.cleanArray(myAdrResultArray).join("\n");
	},

	getCountryCodeFromCountryName: function (aName) {
		for (let code of cardbookRepository.countriesList) {
			let locName = cardbookRepository.extension.localeData.localizeMessage("region-name-" + code);
			if (locName.toLowerCase() == aName.toLowerCase()) {
				return code.toUpperCase();
			}
		}
		return aName;
	},

	getCardRegion: function (aCard) {
		let i = 0;
		while (true) {
			if (aCard.adr[i] && aCard.adr[i][0]) {
				var country = aCard.adr[i][0][6].toUpperCase();
				if (country != "") {
					let lcRegionCode = country.toLowerCase();
					// maybe a country code
					if (cardbookRepository.countriesList.includes(lcRegionCode)) {
						return country;
					}
					// let's try to find a known country
					for (let code of cardbookRepository.countriesList) {
						let locName = cardbookRepository.extension.localeData.localizeMessage("region-name-" + code);
						if (lcRegionCode == locName.toLowerCase()) {
							return code.toUpperCase();
						}
					}
				}
				i++;
			} else {
				return cardbookRepository.cardbookPrefs["defaultRegion"];
			}
		}
		return "";
	},

	sumElements: function (aObject) {
		var sum = 0;
		for (var i in aObject) {
			sum = sum + aObject[i];
		}
		return sum;
	},
	
	getName: function (aCard) {
		let showNameAs = cardbookRepository.cardbookPrefs["showNameAs"];
		if (aCard.isAList || showNameAs == "DSP") {
			return aCard.fn;
		}
		if (aCard.lastname != "" && aCard.firstname != "") {
			let result = "";
			if (showNameAs == "LF") {
				result = aCard.lastname + " " + aCard.firstname;
			} else if (showNameAs == "FL") {
				result = aCard.firstname + " " + aCard.lastname;
			} else if (showNameAs == "LFCOMMA") {
				result = aCard.lastname + ", " + aCard.firstname;
			}
			return result.trim();
		} else {
			return aCard.fn;
		}
	},

	getCardFromEmail: function(aEmail, aDirPrefId) {
		var myTestString = aEmail.toLowerCase();
		if (aDirPrefId) {
			if (cardbookRepository.cardbookCardEmails[aDirPrefId]) {
				if (cardbookRepository.cardbookCardEmails[aDirPrefId][myTestString]) {
					return cardbookRepository.cardbookCardEmails[aDirPrefId][myTestString][0];
				}
			}
		} else {
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[2] && (account[3] != "SEARCH")) {
					var myDirPrefId = account[1];
					if (cardbookRepository.cardbookCardEmails[myDirPrefId]) {
						if (cardbookRepository.cardbookCardEmails[myDirPrefId][myTestString]) {
							return cardbookRepository.cardbookCardEmails[myDirPrefId][myTestString][0];
						}
					}
				}
			}
		}
	},

	sortCardsTreeArrayByString: function (aArray, aIndex, aInvert) {
		function compare1(a, b) { return a[aIndex].localeCompare(b[aIndex])*aInvert; };
		function compare2(a, b) { return a.localeCompare(b)*aInvert; };
		function compare3(a, b) { return cardbookUtils.getName(a).localeCompare(cardbookUtils.getName(b))*aInvert; };
		function compare4(a, b) { return ((a.isAList === b.isAList)? 0 : a.isAList? -1 : 1)*aInvert; };
		function compare5(a, b) {
			let aValue = cardbookUtils.getCardValueByField(a, aIndex, false);
			let bValue = cardbookUtils.getCardValueByField(b, aIndex, false);
			return aValue.join().localeCompare(bValue.join())*aInvert;
		};
		function compare6(a, b) { return cardbookRepository.cardbookGenderLookup[a.gender].localeCompare(cardbookRepository.cardbookGenderLookup[b.gender])*aInvert; };
		function compare7(a, b) { return (cardbookRepository.cardbookDates.getDateForCompare(a, aIndex)*aInvert > cardbookRepository.cardbookDates.getDateForCompare(b, aIndex)*aInvert); };
		function compare8(a, b) { return (cardbookUtils.getCardValueByField(a, aIndex, false)[0] - cardbookUtils.getCardValueByField(b, aIndex, false)[0])*aInvert; };
		if (aIndex != -1) {
			if (aIndex == "name") {
				return aArray.sort(compare3);
			} else if (aIndex == "cardIcon") {
				return aArray.sort(compare4);
			} else if (aIndex == "gender") {
				return aArray.sort(compare6);
			} else if (aIndex == "bday" || aIndex == "anniversary" || aIndex == "deathdate" || aIndex == "rev") {
				return aArray.sort(compare7);
			} else if (aIndex.startsWith("X-") || aIndex == "ABName") {
				return aArray.sort(compare5);
			} else if (aIndex == "age") {
				return aArray.sort(compare8);
			} else {
				return aArray.sort(compare5);
			}
		} else {
			return aArray.sort(compare2);
		}
	},

	sortMultipleArrayByString: function (aArray, aIndex, aInvert) {
		function compare(a, b) { return a[aIndex].localeCompare(b[aIndex])*aInvert; };
		return aArray.sort(compare);
	},

	sortArrayByString: function (aArray, aInvert) {
		function compare(a, b) { return a.localeCompare(b)*aInvert; };
		return aArray.sort(compare);
	},

	sortMultipleArrayByNumber: function (aArray, aIndex, aInvert) {
		function compare(a, b) { return (a[aIndex] - b[aIndex])*aInvert; };
		return aArray.sort(compare);
	},

	compareArray: function (aArray1, aArray2) {
		return aArray1.length === aArray2.length && aArray1.every(function(value, index) {
			return value === aArray2[index];
		});
	},

	splitLine: function (vString) {
		var lLineLength = 75;
		var lResult = "";
		while (vString.length) {
			if (lResult == "") {
				lResult = vString.substr(0, lLineLength);
				vString = vString.substr(lLineLength);
			} else {
				lResult = lResult + "\r\n " + vString.substr(0, lLineLength - 1);
				vString = vString.substr(lLineLength - 1);
			}
		}
		return lResult;
	},

	undefinedToBlank: function (vString1) {
		if (vString1) {
			return vString1;
		} else {
			return "";
		}
	},

	notNull: function (vArray1, vArray2) {
		var vString1 = vArray1.join("");
		if (vString1) {
			return vArray1;
		} else {
			return vArray2;
		}
	},

	appendArrayToVcardData: function (aInitialValue, aField, aVersion, aArray) {
		var aResultValue = aInitialValue;
		for (let i = 0; i < aArray.length; i++) {
			if (aArray[i][2]) {
				if (cardbookUtils.getPrefBooleanFromTypes(aArray[i][1])) {
					if (aVersion == "4.0") {
						var myPrefValue = cardbookUtils.getPrefValueFromTypes(aArray[i][1], aVersion);
						if (myPrefValue != "") {
							var lString = "PREF=" + myPrefValue + ":";
						} else {
							var lString = "PREF=1:";
						}
					} else {
						var lString = "TYPE=PREF:";
					}
				} else {
					var lString = "";
				}
				aResultValue = this.appendToVcardData1(aResultValue, aArray[i][2] + "." + aField, false, lString + this.escapeArrays2(aArray[i][0]).join(";"));
				for (let j = 0; j < aArray[i][3].length; j++) {
					let tmpArray = aArray[i][3][j].split(":");
					aResultValue = this.appendToVcardData1(aResultValue, aArray[i][2] + "." + tmpArray[0], false, tmpArray[1]);
				}
			} else {
				var lString = "";
				if (cardbookUtils.getPrefBooleanFromTypes(aArray[i][1])) {
					if (aVersion == "4.0") {
						lString = "PREF=1;";
					} else {
						lString = "TYPE=PREF;";
					}
				}
				var myInputTypes = cardbookUtils.getOnlyTypesFromTypes(aArray[i][1]);
				for (let j = 0; j < myInputTypes.length; j++) {
					lString = lString + "TYPE=" + myInputTypes[j] + ";";
				}
				if (lString != "") {
					lString = lString.slice(0, -1);
					lString = lString + ":";
				}
				aResultValue = this.appendToVcardData1(aResultValue, aField, false, lString + this.escapeArrays2(aArray[i][0]).join(";"));
			}
		}
		return aResultValue;
	},

	appendToVcardData1: function (vString1, vString2, vBool1, vString3) {
		var lResult = "";
		if (vBool1) {
			lResult = vString1 + vString2 + "\r\n";
		} else {
			if (vString3) {
				if (vString2) {
					var lString4 = vString3.toUpperCase();
					if (lString4.indexOf("TYPE=") != -1 || lString4.indexOf("PREF") != -1) {
						lResult = vString1 + this.splitLine(vString2 + ";" + vString3) + "\r\n";
					} else {
						lResult = vString1 + this.splitLine(vString2 + ":" + vString3) + "\r\n";
					}
				} else {
					lResult = vString1 + this.splitLine(vString3) + "\r\n";
				}
			} else {
				lResult = vString1;
			}
		}
		return lResult;
	},

	appendToVcardData2: function (vString1, vString2, vBool1, vString3) {
		var lResult = "";
		if (vBool1) {
			lResult = vString1 + vString2 + "\r\n";
		} else {
			if (vString3) {
				if (vString2) {
					lResult = vString1 + this.splitLine(vString2 + ":" + vString3) + "\r\n";
				} else {
					lResult = vString1 + this.splitLine(vString3) + "\r\n";
				}
			} else {
				lResult = vString1;
			}
		}
		return lResult;
	},

	// for media
	appendToVcardData3: function (vString1, vString2, vArray) {
		var lResult = vString1;
		for (let line of vArray) {
			lResult = lResult + this.splitLine(vString2 + line) + "\r\n";
		}
		return lResult;
	},

	// for geo and tz
	// GEO;VALUE=FLOAT:90.000;91.000
	appendToVcardData4: function (vString1, vString2, vArray) {
		if (vArray == "" || (Array.isArray(vArray) && vArray.length == 1 && vArray[0] == "")) {
			return vString1;
		}
		let lResult = vString1;
		for (let arrayLine of vArray) {
			if (Array.isArray(arrayLine)) {
				let line = vString2;
				if (arrayLine[1].length) {
					line = line + ";" + arrayLine[1].join(";");
				}
				line = line + ":" + arrayLine[0].join(";");
				lResult = lResult + this.splitLine(line) + "\r\n";
			} else {
				let line = vString2 + ":" + arrayLine;
				lResult = lResult + this.splitLine(line) + "\r\n";
			}
		}
		return lResult;
	},

	escapeString: function (vString) {
		return vString.replace(/\\;/g,"@ESCAPEDSEMICOLON@").replace(/\\,/g,"@ESCAPEDCOMMA@");
	},

	escapeString1: function (vString) {
		return vString.replace(/\\\(/g,"@ESCAPEDLEFTPARENTHESIS@").replace(/\\\)/g,"@ESCAPEDRIGHTPARENTHESIS@").replace(/\\\|/g,"@ESCAPEDPIPE@"); 
	},

	escapeArray2: function (vArray) {
		var result = []
		for (let i = 0; i<vArray.length; i++){
			if (vArray[i] && vArray[i] != ""){
				result[i] = vArray[i].replace(/\(/g,"@ESCAPEDLEFTPARENTHESIS@").replace(/\)/g,"@ESCAPEDRIGHTPARENTHESIS@").replace(/\|/g,"@ESCAPEDPIPE@");
			} else {
				result[i] = "";
			}
		}
		return result;
	},

	escapeArray: function (vArray) {
		for (let i = 0; i<vArray.length; i++){
			if (vArray[i] && vArray[i] != ""){
				vArray[i] = vArray[i].replace(/\\;/g,"@ESCAPEDSEMICOLON@").replace(/\\,/g,"@ESCAPEDCOMMA@");
			}
		}
		return vArray;
	},

	replaceArrayComma: function (vArray) {
		var vArrayNew = [];
		vArrayNew = JSON.parse(JSON.stringify(vArray));
		for (let i = 0; i<vArrayNew.length; i++){
			if (vArrayNew[i] && vArrayNew[i] != ""){
				vArrayNew[i] = vArrayNew[i].replace(/\\n/g,"\n").replace(/,/g,"\n");
			}
		}
		return vArrayNew;
	},

	escapeArrayComma: function (vArray) {
		var vArrayNew = [];
		vArrayNew = JSON.parse(JSON.stringify(vArray));
		for (let i = 0; i<vArrayNew.length; i++){
			if (vArrayNew[i] && vArrayNew[i] != ""){
				vArrayNew[i] = vArrayNew[i].replace(/,/g,"@ESCAPEDCOMMA@").replace(/;/g,"@ESCAPEDSEMICOLON@");
			}
		}
		return vArrayNew;
	},

	unescapeArrayComma: function (vArray) {
		var vArrayNew = [];
		vArrayNew = JSON.parse(JSON.stringify(vArray));
		for (let i = 0; i<vArrayNew.length; i++){
			if (vArrayNew[i] && vArrayNew[i] != ""){
				vArrayNew[i] = vArrayNew[i].replace(/@ESCAPEDCOMMA@/g,"\\,").replace(/@ESCAPEDSEMICOLON@/g,"\\;");
			}
		}
		return vArrayNew;
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

	unescapeString1: function (vString) {
		return vString.replace(/@ESCAPEDLEFTPARENTHESIS@/g,"(").replace(/@ESCAPEDRIGHTPARENTHESIS@/g,")").replace(/@ESCAPEDPIPE@/g,"|");
	},

	unescapeArray: function (vArray) {
		for (let i = 0; i<vArray.length; i++){
			if (vArray[i] && vArray[i] != ""){
				vArray[i] = cardbookUtils.unescapeString(vArray[i]);
			}
		}
		return vArray;
	},

	escapeStrings: function (vString) {
		return vString.replace(/;/g,"\\;").replace(/,/g,"\\,").split("\n").join("\\n");
	},

	escapeArrays2: function (vArray) {
		var vArrayNew = [];
		vArrayNew = JSON.parse(JSON.stringify(vArray));
		for (let i = 0; i<vArrayNew.length; i++){
			if (vArrayNew[i] && vArrayNew[i] != ""){
				vArrayNew[i] = this.escapeStrings(vArrayNew[i]);
			}
		}
		return vArrayNew;
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
	
	cleanArrayWithoutTrim: function (vArray) {
		var newArray = [];
		for(let i = 0; i<vArray.length; i++){
			if (vArray[i] && vArray[i] != ""){
				newArray.push(vArray[i]);
			}
		}
		return newArray;
	},
	
	parseArray: function (vArray) {
		var lTemp = "";
		for (let vArrayIndex = 0; vArrayIndex < vArray.length; vArrayIndex++) {
			if (vArrayIndex === 0) {
				lTemp = this.cleanArray(vArray[vArrayIndex]).join(" ");
			} else {
				lTemp = lTemp + "\n" + this.cleanArray(vArray[vArrayIndex]).join(" ");
			}
		}
		return lTemp;
	},
	
	cardToVcardData: async function (vCard, aMediaFromDB = true) {
		if (vCard.uid == "") {
			return "";
		}
		var vCardData = "";
		vCardData = this.appendToVcardData2(vCardData,"BEGIN:VCARD",true,"");
		vCardData = this.appendToVcardData2(vCardData,"VERSION",false,vCard.version);
		vCardData = this.appendToVcardData2(vCardData,"PRODID",false,vCard.prodid);
		vCardData = this.appendToVcardData2(vCardData,"UID",false,vCard.uid);
		vCardData = this.appendToVcardData2(vCardData,"CATEGORIES",false,this.unescapeArrayComma(this.escapeArrayComma(vCard.categories)).join(","));
		// FN required
		if (vCard.fn == "") {
			vCardData = vCardData + "FN:" + "\r\n";
		} else {
			vCardData = this.appendToVcardData2(vCardData,"FN",false,this.escapeStrings(vCard.fn));
		}
		// N required in 3.0
		if (vCard.version == "3.0") {
			vCardData = this.appendToVcardData2(vCardData,"N",false,this.escapeStrings(vCard.lastname) + ";" + this.escapeStrings(vCard.firstname) + ";" +
													this.escapeStrings(vCard.othername) + ";" + this.escapeStrings(vCard.prefixname) + ";" + this.escapeStrings(vCard.suffixname));
		} else if (!(vCard.lastname == "" && vCard.firstname == "" && vCard.othername == "" && vCard.prefixname == "" && vCard.suffixname == "")) {
			vCardData = this.appendToVcardData2(vCardData,"N",false,this.escapeStrings(vCard.lastname) + ";" + this.escapeStrings(vCard.firstname) + ";" +
													this.escapeStrings(vCard.othername) + ";" + this.escapeStrings(vCard.prefixname) + ";" + this.escapeStrings(vCard.suffixname));
		}
		vCardData = this.appendToVcardData2(vCardData,"NICKNAME",false,this.escapeStrings(vCard.nickname));
		vCardData = this.appendToVcardData2(vCardData,"SORT-STRING",false,vCard.sortstring);
		vCardData = this.appendToVcardData2(vCardData,"BDAY",false,vCard.bday);
		vCardData = this.appendToVcardData2(vCardData,"GENDER",false,vCard.gender);
		vCardData = this.appendToVcardData2(vCardData,"BIRTHPLACE",false,vCard.birthplace);
		vCardData = this.appendToVcardData2(vCardData,"ANNIVERSARY",false,vCard.anniversary);
		vCardData = this.appendToVcardData2(vCardData,"DEATHDATE",false,vCard.deathdate);
		vCardData = this.appendToVcardData2(vCardData,"DEATHPLACE",false,vCard.deathplace);
		vCardData = this.appendToVcardData2(vCardData,"TITLE",false,this.escapeStrings(vCard.title));
		vCardData = this.appendToVcardData2(vCardData,"ROLE",false,this.escapeStrings(vCard.role));
		vCardData = this.appendToVcardData2(vCardData,"ORG",false,vCard.org.replace(/,/g,"\\,"));

		vCardData = this.appendArrayToVcardData(vCardData, "EMAIL", vCard.version, vCard.email);
		vCardData = this.appendArrayToVcardData(vCardData, "TEL", vCard.version, vCard.tel);
		vCardData = this.appendArrayToVcardData(vCardData, "ADR", vCard.version, vCard.adr);
		vCardData = this.appendArrayToVcardData(vCardData, "IMPP", vCard.version, vCard.impp);
		vCardData = this.appendArrayToVcardData(vCardData, "URL", vCard.version, vCard.url);

		vCardData = this.appendToVcardData2(vCardData,"NOTE",false,this.escapeStrings(vCard.note));
		// old values
		if (Array.isArray(vCard.geo)) {
			vCardData = this.appendToVcardData4(vCardData, "GEO", vCard.geo);
		} else {
			vCardData = this.appendToVcardData4(vCardData, "GEO", [vCard.geo]);
		}
		vCardData = this.appendToVcardData2(vCardData,"MAILER",false,vCard.mailer);
		
		if (vCard.version == "4.0") {
			vCardData = this.appendToVcardData2(vCardData,"KIND",false,vCard.kind);
			for (let i = 0; i < vCard.member.length; i++) {
				vCardData = this.appendToVcardData2(vCardData,"MEMBER",false,vCard.member[i]);
			}
		}

		vCardData = this.appendToVcardData2(vCardData,"CLASS",false,vCard.class1);
		vCardData = this.appendToVcardData2(vCardData,"REV",false,vCard.rev);
		vCardData = this.appendToVcardData2(vCardData,"AGENT",false,vCard.agent);
		// old values
		if (Array.isArray(vCard.tz)) {
			vCardData = this.appendToVcardData4(vCardData, "TZ", vCard.tz);
		} else {
			vCardData = this.appendToVcardData4(vCardData, "TZ", [vCard.tz]);
		}
		vCardData = this.appendToVcardData3(vCardData,"KEY",cardbookUtils.getKeyContentForCard(vCard));

		for (let media of cardbookRepository.allColumns.media) {
			// always convert
			let content = await cardbookUtils.cacheGetMediaCard(vCard, media, aMediaFromDB);
			if (content.length) {
				vCardData = this.appendToVcardData3(vCardData, media.toUpperCase(), content);
			}
		}

		for (let i = 0; i < vCard.others.length; i++) {
			vCardData = this.appendToVcardData2(vCardData,"",false,vCard.others[i]);
		}

		vCardData = this.appendToVcardData2(vCardData,"END:VCARD",true,"");
		return vCardData;
	},

	getvCardForEmail: async function(aCard) {
		var myTempCard = new cardbookCardParser();
		await cardbookUtils.cloneCard(aCard, myTempCard);
		myTempCard.rev = "";
		var cardContent = await cardbookUtils.cardToVcardData(myTempCard);
		myTempCard = null;
		return cardContent;
	},

	getvCardForServer: async function(aCard) {
		return await cardbookUtils.cardToVcardData(aCard);
	},

	addCardFromDisplayAndEmail: async function (aDirPrefId, aDisplayName, aEmail, aCategory, aActionId) {
		if (!aDisplayName) {
			if (!aEmail) {
				return;
			} else {
				aDisplayName = aEmail;
			}
		}
		var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aDirPrefId);
		var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
		var myDirPrefIdVCard = cardbookRepository.cardbookPreferences.getVCardVersion(aDirPrefId);
		var myDirPrefIdReadOnly = cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId);
		if (!myDirPrefIdReadOnly) {
			var myNewCard = new cardbookCardParser();
			myNewCard.dirPrefId = aDirPrefId;
			myNewCard.version = myDirPrefIdVCard;
			myNewCard.fn = aDisplayName;
			if (myNewCard.fn == "") {
				myNewCard.fn = aEmail.substr(0, aEmail.indexOf("@")).replace("."," ").replace("_"," ");
			}
			var myDisplayNameArray = aDisplayName.split(" ");
			if (myDisplayNameArray.length > 1) {
				myNewCard.lastname = myDisplayNameArray[myDisplayNameArray.length - 1];
				var removed = myDisplayNameArray.splice(myDisplayNameArray.length - 1, 1);
				myNewCard.firstname = myDisplayNameArray.join(" ");
			}
			myNewCard.email = [ [ [aEmail], [] ,"", [] ] ];
			if (aCategory) {
				cardbookRepository.addCategoryToCard(myNewCard, aCategory);
			}
			await cardbookRepository.saveCardFromUpdate({}, myNewCard, aActionId, true);
		} else {
			cardbookUtils.formatStringForOutput("addressbookReadOnly", [myDirPrefIdName]);
		}
	},

	getImageFromURI: function (aDirPrefId, aCardName, aDirname, aImageURI) {
		return new Promise((resolve, reject) => {
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGettingImage", [aDirname, aCardName]);
			let xhr = new XMLHttpRequest();
			xhr.responseType = "arraybuffer";
			xhr.onload = function () {
				if (xhr.status === 200) {
					let extension = cardbookRepository.cardbookUtils.getFileExtension(aImageURI);
					if (extension == "" && xhr.channel && xhr.channel.contentType) {
						extension = xhr.channel.contentType.replace(/^image\//, "").toLowerCase();
					}
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetImageOK", [aDirname, aCardName]);
					let uInt8Array = new Uint8Array(this.response);
					let i = uInt8Array.length;
					let binaryString = new Array(i);
					while (i--) {
						binaryString[i] = String.fromCharCode(uInt8Array[i]);
					}
					let data = binaryString.join('');
					let base64 = btoa(data);
					resolve([base64, extension]);
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetImageFailed", [aDirname, aCardName, aImageURI, xhr.status]);
					reject();
				}
			};
			xhr.onerror = function () {
				cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetImageFailed", [aDirname, aCardName, aImageURI, xhr.status]);
				reject();
			};
			xhr.ontimeout = function () {
				cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetImageFailed", [aDirname, aCardName, aImageURI, xhr.status]);
				reject();
			};
			xhr.open("GET", aImageURI, true);
			xhr.send();
		});
	},

	getKeyContentForCard: function(aCard) {
		try {
			let result = [];
			for (let keyType of aCard.key) {
				let pref = cardbookUtils.getPrefBooleanFromTypes(keyType.types);
				if (keyType.URI) {
					if (aCard.version === "4.0") {
						if (pref) {
							result.push(";PREF=1;VALUE=URI:" + keyType.URI);
						} else {
							result.push(";VALUE=URI:" + keyType.URI);
						}
					} else {
						if (pref) {
							result.push(";TYPE=PREF;VALUE=URI:" + keyType.URI);
						} else {
							result.push(";VALUE=URI:" + keyType.URI);
						}
					}
				} else if (keyType.value) {
					if (aCard.version === "4.0") {
						if (pref) {
							result.push(":pref=1;data:application/pgp-keys;base64," + keyType.value);
						} else {
							result.push(":base64," + keyType.value);
						}
					} else if (aCard.version === "3.0") {
						if (pref) {
							result.push(";TYPE=PREF;ENCODING=B:" + keyType.value);
						} else {
							result.push(";ENCODING=B:" + keyType.value);
						}
					}
				}
			}
			return result;
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookUtils.getKeyContentForCard error : " + e, "Error");
		}
	},

	getDisplayedName: function(aCard, aDirPrefId, aNewN, aNewOrg) {
		aCard.fn = cardbookUtils.getDisplayedNameFromFormula(aDirPrefId, aNewN, aNewOrg);
		if (aCard.fn == "") {
			cardbookUtils.getDisplayedNameFromRest(aCard);
		}
	},

	getDisplayedNameFromRest: function(aCard) {
		for (let field of cardbookRepository.multilineFields) {
			if (aCard[field][0]) {
				aCard.fn = aCard[field][0][0][0];
				if (aCard.fn != "") {
					return;
				}
			}
		}
		var fieldsList = [ 'personal', 'org' ];
		for (var i in fieldsList) {
			for (var j in cardbookRepository.allColumns[fieldsList[i]]) {
				if (aCard[cardbookRepository.allColumns[fieldsList[i]][j]] && aCard[cardbookRepository.allColumns[fieldsList[i]][j]] != "") {
					aCard.fn = aCard[cardbookRepository.allColumns[fieldsList[i]][j]];
					return;
				}
			}
		}
	},

	getFnDataForFormula: function(aNewN, aNewOrg) {
		let orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
		let myOrg = aNewOrg[0];
		let myOrgArray = [];
		if (typeof(orgStructure) !== "undefined") {
			myOrgArray = cardbookUtils.unescapeArray(cardbookUtils.escapeString(myOrg).split(";"));
			let myOrgStructureArray = cardbookUtils.unescapeArray(cardbookUtils.escapeString(orgStructure).split(";"));
			for (let i = myOrgArray.length; i < myOrgStructureArray.length; i++) {
				myOrgArray.push("");
			}
		} else {
			myOrgArray = [cardbookUtils.unescapeString(cardbookUtils.escapeString(myOrg))];
		}
		let fnData = [];
		fnData = fnData.concat(aNewN);
		fnData = fnData.concat(myOrgArray);
		fnData = fnData.concat(aNewOrg[1]);
		fnData = fnData.concat(aNewOrg[2]);
		return fnData;
	},

	getDisplayedNameFromFormula: function(aDirPrefId, aNewN, aNewOrg) {
		var result =  "";
		var myFnFormula = cardbookRepository.cardbookPreferences.getFnFormula(aDirPrefId);
		let data = cardbookUtils.getFnDataForFormula(aNewN, aNewOrg);
		result = cardbookUtils.getStringFromFormula(myFnFormula, data);
		return result.trim();
	},

	getStringFromFormula: function(aFormula, aArray) {
		let myEscapedFormula = cardbookUtils.escapeString1(aFormula);
		let myEscapedArray = cardbookUtils.escapeArray2(aArray);
		for (let i = 1; i < myEscapedArray.length+1; i++) {
			if (myEscapedFormula.indexOf("{{" + i + "}}") >= 0) {
				let variableRegExp = new RegExp("\\{\\{" + i + "\\}\\}", "g");
				myEscapedFormula = myEscapedFormula.replace(variableRegExp, myEscapedArray[i-1]);
			}
		}
		let blockRegExp = new RegExp("\\([^\\(\\)]*\\)", "g");
		let maxLoopNumber = 1;
		while (maxLoopNumber < 10) {
			let blocks = myEscapedFormula.match(blockRegExp);
			if (blocks) {
				for (let block of blocks) {
					var blockArray = block.replace("(", "").replace(")", "").split('|');
					if (blockArray.length == 1) {
						myEscapedFormula = myEscapedFormula.replace(block, blockArray[0]);
					} else if (blockArray.length == 2) {
						if (blockArray[0].trim()) {
							myEscapedFormula = myEscapedFormula.replace(block, blockArray[0]);
						} else {
							myEscapedFormula = myEscapedFormula.replace(block, blockArray[1]);
						}
					} else if (blockArray.length == 3) {
						if (blockArray[0].toUpperCase() == blockArray[1].toUpperCase()) {
							myEscapedFormula = myEscapedFormula.replace(block, blockArray[2]);
						}
					} else {
						if ("*" == blockArray[1]) {
							if (blockArray[0].toUpperCase().includes(blockArray[2].toUpperCase())) {
								myEscapedFormula = myEscapedFormula.replace(block, blockArray[3]);
							} else if (blockArray[4]) {
								myEscapedFormula = myEscapedFormula.replace(block, blockArray[4]);
							}
						} else if ("^" == blockArray[1]) {
							if (blockArray[0].toUpperCase().startsWith(blockArray[2].toUpperCase())) {
								myEscapedFormula = myEscapedFormula.replace(block, blockArray[3]);
							} else if (blockArray[4]) {
								myEscapedFormula = myEscapedFormula.replace(block, blockArray[4]);
							}
						} else if ("$" == blockArray[1]) {
							if (blockArray[0].toUpperCase().endsWith(blockArray[2].toUpperCase())) {
								myEscapedFormula = myEscapedFormula.replace(block, blockArray[3]);
							} else if (blockArray[4]) {
								myEscapedFormula = myEscapedFormula.replace(block, blockArray[4]);
							}
						} else  {
							if (blockArray[0].toUpperCase() == blockArray[1].toUpperCase()) {
								myEscapedFormula = myEscapedFormula.replace(block, blockArray[2]);
							} else {
								myEscapedFormula = myEscapedFormula.replace(block, blockArray[3]);
							}
						}
					}
				}
			} else {
				break;
			}
			maxLoopNumber++;
		}
		return cardbookUtils.unescapeString1(myEscapedFormula);
	},

	setCalculatedFieldsWithoutRev: function(aCard) {
		aCard.isAList = cardbookUtils.isMyCardAList(aCard);
		if (!aCard.isAList) {
			aCard.emails = cardbookUtils.getPrefAddressFromCard(aCard, "email", cardbookRepository.cardbookPrefs["preferEmailPref"]);
		}
		if (aCard.dirPrefId != "" && aCard.uid != "") {
			aCard.cbid = aCard.dirPrefId + "::" + aCard.uid;
		}
		if (aCard.prodid == "") {
			aCard.prodid = cardbookRepository.prodid;
		}
	},

	setCalculatedFields: function(aCard) {
		cardbookUtils.setCalculatedFieldsWithoutRev(aCard);
		cardbookUtils.updateRev(aCard);
	},

	convertVCard: function (aCard, aTargetName, aTargetVersion, aDateFormatSource, aDateFormatTarget) {
		var converted = false;
		// basic fields
		if (aCard.version != aTargetVersion) {
			converted = true;
			aCard.version = aTargetVersion;
			for (let newField of cardbookRepository.newFields) {
				let oldField = 'X-' + newField.toUpperCase();
				if (aTargetVersion == "3.0") {
					if (aCard[newField] != "") {
						aCard.others.push(oldField + ":" + aCard[newField]);
						if (!cardbookRepository.possibleCustomFields[oldField].add && !cardbookRepository.possibleCustomFields[oldField].added) {
							cardbookRepository.possibleCustomFields[oldField].add = true;
						}
						aCard[newField] = "";
					}
				} else if (aTargetVersion == "4.0") {
					for (let k = 0; k < aCard.others.length; k++) {
						if (aCard.others[k].startsWith(oldField + ":")) {
							let newFieldRegExp = new RegExp("^" + oldField + ":");
							aCard[newField] = aCard.others[k].replace(newFieldRegExp, "");
							aCard.others.splice(k,1);
							break;
						}
					}
				}
			}

			// lists
			let kindCustom = cardbookRepository.cardbookPrefs["kindCustom"];
			let memberCustom = cardbookRepository.cardbookPrefs["memberCustom"];
			if (aCard.isAList) {
				if (aTargetVersion == "3.0") {
					cardbookUtils.addMemberstoCard(aCard, aCard.member, aCard.kind);
					aCard.member = "";
					aCard.kind = "";
				} else if (aTargetVersion == "4.0") {
					let myMembers = [];
					let myGroup = "";
					for (let j = 0; j < aCard.others.length; j++) {
						if (aCard.others[j].startsWith(memberCustom + ":")) {
							let myFieldRegExp = new RegExp("^" + memberCustom + ":");
							myMembers.push(aCard.others[j].replace(myFieldRegExp, ""));
							aCard.others.splice(j,1);
							j--;
						} else if (aCard.others[j].startsWith(kindCustom + ":")) {
							let myFieldRegExp = new RegExp("^" + kindCustom + ":");
							myGroup = aCard.others[j].replace(myFieldRegExp, "");
							aCard.others.splice(j,1);
							j--;
						}
					}
					cardbookUtils.addMemberstoCard(aCard, myMembers, myGroup);
				}
			}
		}
		// date fields
		if (aDateFormatSource != aDateFormatTarget) {
			if (cardbookRepository.cardbookDates.convertCardDate(aCard, aTargetName, aDateFormatSource, aDateFormatTarget)) {
				converted = true;
			}
		}
		return converted;
	},

	cloneCategory: function(sourceCategory, targetCategory) {
		targetCategory.dirPrefId = sourceCategory.dirPrefId;
		targetCategory.href = sourceCategory.href;
		targetCategory.etag = sourceCategory.etag;
		targetCategory.cbid = sourceCategory.cbid;
		targetCategory.uid = sourceCategory.uid;
		targetCategory.name = sourceCategory.name;
		targetCategory.updated = sourceCategory.updated;
		targetCategory.created = sourceCategory.created;
		targetCategory.deleted = sourceCategory.deleted;
	},

	cloneCard: async function(sourceCard, targetCard) {
		targetCard.dirPrefId = sourceCard.dirPrefId;
		targetCard.cardurl = sourceCard.cardurl;
		targetCard.etag = sourceCard.etag;

		targetCard.lastname = sourceCard.lastname;
		targetCard.firstname = sourceCard.firstname;
		targetCard.othername = sourceCard.othername;
		targetCard.prefixname = sourceCard.prefixname;
		targetCard.suffixname = sourceCard.suffixname;
		targetCard.fn = sourceCard.fn;
		targetCard.nickname = sourceCard.nickname;
		targetCard.bday = sourceCard.bday;
		targetCard.gender = sourceCard.gender;
		targetCard.birthplace = sourceCard.birthplace;
		targetCard.anniversary = sourceCard.anniversary;
		targetCard.deathdate = sourceCard.deathdate;
		targetCard.deathplace = sourceCard.deathplace;

		targetCard.adr = JSON.parse(JSON.stringify(sourceCard.adr));
		targetCard.tel = JSON.parse(JSON.stringify(sourceCard.tel));
		targetCard.email = JSON.parse(JSON.stringify(sourceCard.email));
		targetCard.emails = JSON.parse(JSON.stringify(sourceCard.emails));
		targetCard.url = JSON.parse(JSON.stringify(sourceCard.url));
		targetCard.impp = JSON.parse(JSON.stringify(sourceCard.impp));
		targetCard.categories = JSON.parse(JSON.stringify(sourceCard.categories));

		targetCard.mailer = sourceCard.mailer;
		targetCard.tz = JSON.parse(JSON.stringify(sourceCard.tz));
		targetCard.geo = JSON.parse(JSON.stringify(sourceCard.geo));
		targetCard.title = sourceCard.title;
		targetCard.role = sourceCard.role;
		targetCard.agent = sourceCard.agent;
		targetCard.org = sourceCard.org;
		targetCard.note = sourceCard.note;
		targetCard.prodid = sourceCard.prodid;
		targetCard.sortstring = sourceCard.sortstring;
		targetCard.uid = sourceCard.uid;

		targetCard.member = JSON.parse(JSON.stringify(sourceCard.member));
		targetCard.kind = sourceCard.kind;

		await cardbookRepository.cardbookUtils.changeMediaFromFileToContent(sourceCard);
		for (let media of cardbookRepository.allColumns.media) {
			targetCard[media] = JSON.parse(JSON.stringify(sourceCard[media]));
		}

		targetCard.version = sourceCard.version;
		targetCard.class1 = sourceCard.class1;
		targetCard.key = sourceCard.key;

		targetCard.updated = sourceCard.updated;
		targetCard.created = sourceCard.created;
		targetCard.deleted = sourceCard.deleted;

		targetCard.others = JSON.parse(JSON.stringify(sourceCard.others));
		
		targetCard.isAList = sourceCard.isAList;
		targetCard.cbid = sourceCard.cbid;
		targetCard.prodid = sourceCard.prodid;
		targetCard.rev = sourceCard.rev;
	},

	// not possible to include prefs for ADR field
	getCardValueByField: function(aCard, aField, aIncludePref) {
		var result = [];
		if (aField.indexOf("_") > 0) {
			var myFieldArray = aField.split("_");
			var myField = myFieldArray[0];
			var myPosition = myFieldArray[1];
			if (myField == "org") {
				var orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
				if (orgStructure != "") {
					var myOrgValue = cardbookUtils.unescapeArray(cardbookUtils.escapeString(aCard[myField]).split(";"));
					result.push(myOrgValue[myPosition]);
				} else {
					result.push(aCard[myField]);
				}
			// adr_all, adr_5_all, adr_adr_privé, adr_5_adr_privé
			} else if (myField == "adr") {
				var myFieldArray = aField.split("_");
				var myField = myFieldArray[0];
				if (aCard[myField].length) {
					if (["0", "1", "2", "3", "4", "5", "6"].includes(myFieldArray[1])) {
						let subField = parseInt(myFieldArray[1]);
						let type = myFieldArray.slice(2).join("_");
						if (type == "all") {
							if (aCard[myField]) {
								for (var i = 0; i < aCard[myField].length; i++) {
									if (aCard[myField][i][0][subField]) {
										result.push(aCard[myField][i][0][subField]);
									}
								}
							}
						} else if (type == "notype") {
							if (aCard[myField]) {
								for (var i = 0; i < aCard[myField].length; i++) {
									let emptyType = aCard[myField][i][1].length == 0 || aCard[myField][i][1][0] == "";
									if (emptyType && aCard[myField][i][3].length == 0 && aCard[myField][i][2] == "") {
										if (aCard[myField][i][0][subField]) {
											result.push(aCard[myField][i][0][subField]);
										}
									}
								}
							}
						} else {
							for (var i = 0; i < aCard[myField].length; i++) {
								let found = false;
								if (aCard[myField][i][0][subField]) {
									if (aCard[myField][i][3].length != 0 && aCard[myField][i][2] != "") {
										for (var j = 0; j < aCard[myField][i][3].length; j++) {
											let tmpArray = aCard[myField][i][3][j].split(":");
											if (tmpArray[0] == "X-ABLABEL" && tmpArray[1].replaceAll(" ", "_") == type) {
												found = true;
												break;
											}
										}
									}
									if (found) {
										if (aIncludePref && cardbookUtils.getPrefBooleanFromTypes(aCard[myField][i][1])) {
											result.push(cardbookRepository.prefCSVPrefix + aCard[myField][i][0][subField]);
										} else {
											result.push(aCard[myField][i][0][subField]);
										}
									} else {
										var ABType = cardbookRepository.cardbookPreferences.getType(aCard.dirPrefId);
										var ABTypeFormat = cardbookRepository.getABTypeFormat(ABType);
										var myInputTypes = cardbookUtils.getOnlyTypesFromTypes(aCard[myField][i][1]);
										if (cardbookRepository.cardbookTypes.isMyCodePresent(myField, type, ABTypeFormat, myInputTypes)) {
											if (aIncludePref && cardbookUtils.getPrefBooleanFromTypes(aCard[myField][i][1])) {
												result.push(cardbookRepository.prefCSVPrefix + aCard[myField][i][0][subField]);
											} else {
												result.push(aCard[myField][i][0][subField]);
											}
										}
									}
								}
							}
						}
					} else {
						let type = myFieldArray.slice(1).join("_");
						if (type == "all") {
							if (aCard[myField]) {
								for (var i = 0; i < aCard[myField].length; i++) {
									let address = cardbookRepository.cardbookUtils.formatAddress(aCard[myField][i][0]);
									if (address) {
										result.push(address);
									}
								}
							}
						} else if (type == "notype") {
							if (aCard[myField]) {
								for (var i = 0; i < aCard[myField].length; i++) {
									let emptyType = aCard[myField][i][1].length == 0 || aCard[myField][i][1][0] == "";
									if (emptyType && aCard[myField][i][3].length == 0 && aCard[myField][i][2] == "") {
										let address = cardbookRepository.cardbookUtils.formatAddress(aCard[myField][i][0]);
										if (address) {
											result.push(address);
										}
									}
								}
							}
						} else {
							for (var i = 0; i < aCard[myField].length; i++) {
								let found = false;
								let address = cardbookRepository.cardbookUtils.formatAddress(aCard[myField][i][0]);
								if (address) {
									if (aCard[myField][i][3].length != 0 && aCard[myField][i][2] != "") {
										for (var j = 0; j < aCard[myField][i][3].length; j++) {
											let tmpArray = aCard[myField][i][3][j].split(":");
											if (tmpArray[0] == "X-ABLABEL" && tmpArray[1].replaceAll(" ", "_") == type) {
												found = true;
												break;
											}
										}
									}
									if (found) {
										if (aIncludePref && cardbookUtils.getPrefBooleanFromTypes(aCard[myField][i][1])) {
											result.push(cardbookRepository.prefCSVPrefix + address);
										} else {
											result.push(address);
										}
									} else {
										var ABType = cardbookRepository.cardbookPreferences.getType(aCard.dirPrefId);
										var ABTypeFormat = cardbookRepository.getABTypeFormat(ABType);
										var myInputTypes = cardbookUtils.getOnlyTypesFromTypes(aCard[myField][i][1]);
										if (cardbookRepository.cardbookTypes.isMyCodePresent(myField, type, ABTypeFormat, myInputTypes)) {
											if (aIncludePref && cardbookUtils.getPrefBooleanFromTypes(aCard[myField][i][1])) {
												result.push(cardbookRepository.prefCSVPrefix + address);
											} else {
												result.push(address);
											}
										}
									}
								}
							}
						}
					}
				}
			} else {
				var myType = myFieldArray.slice(2).join("_");
				if (myType == "all") {
					if (aCard[myField]) {
						for (var i = 0; i < aCard[myField].length; i++) {
							if (aCard[myField][i][0][myPosition] != "") {
								result.push(aCard[myField][i][0][myPosition]);
							}
						}
					}
				} else if (myType == "array") {
					if (aCard[myField].length != 0) {
						result = result.concat(aCard[myField]);
					}
				} else {
					if (aCard[myField]) {
						var ABType = cardbookRepository.cardbookPreferences.getType(aCard.dirPrefId);
						var ABTypeFormat = cardbookRepository.getABTypeFormat(ABType);
						for (var i = 0; i < aCard[myField].length; i++) {
							if (myType == "notype") {
								let emptyType = aCard[myField][i][1].length == 0 || aCard[myField][i][1][0] == "";
								if (emptyType && aCard[myField][i][3].length == 0 && aCard[myField][i][2] == "") {
									result.push(aCard[myField][i][0][myPosition]);
								}
							} else {
								let found = false;
								if (aCard[myField][i][3].length != 0 && aCard[myField][i][2] != "") {
									for (var j = 0; j < aCard[myField][i][3].length; j++) {
										let tmpArray = aCard[myField][i][3][j].split(":");
										if (tmpArray[0] == "X-ABLABEL" && tmpArray[1].replaceAll(" ", "_") == myType) {
											found = true;
											break;
										}
									}
								}
								if (found) {
									if (aIncludePref && cardbookUtils.getPrefBooleanFromTypes(aCard[myField][i][1])) {
										result.push(cardbookRepository.prefCSVPrefix + aCard[myField][i][0][myPosition]);
									} else {
										result.push(aCard[myField][i][0][myPosition]);
									}
								} else {
									var myInputTypes = cardbookUtils.getOnlyTypesFromTypes(aCard[myField][i][1]);
									if (cardbookRepository.cardbookTypes.isMyCodePresent(myField, myType, ABTypeFormat, myInputTypes)) {
										if (aIncludePref && cardbookUtils.getPrefBooleanFromTypes(aCard[myField][i][1])) {
											result.push(cardbookRepository.prefCSVPrefix + aCard[myField][i][0][myPosition]);
										} else {
											result.push(aCard[myField][i][0][myPosition]);
										}
									}
								}
							}
						}
					}
				}
			}
		} else if (aField == "age") {
			result.push(cardbookRepository.cardbookDates.getAge(aCard));
		} else if (aField == "ABName") {
			result.push(cardbookRepository.cardbookPreferences.getName(aCard.dirPrefId));
		} else {
			if (aCard[aField]) {
				result.push(aCard[aField]);
			} else {
				for (var i = 0; i < aCard.others.length; i++) {
					let delim = aCard.others[i].indexOf(":", 0);
					let header = aCard.others[i].substr(0, delim);
					let value = aCard.others[i].substr(delim+1, aCard.others[i].length);
					let headerTmp = header.split(";");
					if (aField == headerTmp[0]) {
						result.push(value);
						break;
					}
				}
			}
		}
		return result;
	},

	setCardValueByField: function(aCard, aField, aValue) {
		aValue = aValue.replace(/^\"|\"$/g, "").trim();
		if (aValue == "") {
			return;
		} else if (aField == "blank") {
			return;
		} else if (aField.indexOf("_") > 0) {
			var myFieldArray = aField.split("_");
			var myField = myFieldArray[0];
			var myPosition = myFieldArray[1];
			var myType = myFieldArray.slice(2).join("_");
			if (aCard[myField]) {
				// adr may only have one value and one type
				if (myField == "adr") {
					var myType2 = "";
					if (myType != "notype") {
						for (var j = 0; j < cardbookRepository.cardbookCoreTypes["CARDDAV"][myField].length; j++) {
							if (cardbookRepository.cardbookCoreTypes["CARDDAV"][myField][j][0] == myType) {
								var myCode = cardbookRepository.cardbookCoreTypes["CARDDAV"][myField][j][1].split(";");
								myType2 = myCode[0];
								break;
							}
						}
					}
					var found = false;
					for (var i = 0; i < aCard[myField].length; i++) {
						var myTypes = cardbookUtils.getOnlyTypesFromTypes(aCard[myField][i][1]);
						if (myTypes.length == 0 && myType == "notype") {
							aCard[myField][i][0][myPosition] = aValue;
							found = true;
							break;
						} else {
							for (var j = 0; j < myTypes.length; j++) {
								if (myType2.toLowerCase() == myTypes[j].toLowerCase()) {
									aCard[myField][i][0][myPosition] = aValue;
									found = true;
									break;
								}
							}
						}
					}
					if (!found) {
						if (myType != "notype") {
							aCard[myField].push([ ["", "", "", "", "", "", ""], ["TYPE=" + myType2], "", [] ]);
						} else {
							aCard[myField].push([ ["", "", "", "", "", "", ""], [], "", [] ]);
						}
						aCard[myField][i][0][myPosition] = aValue;
					} else {
						// now merge the types if possible
						var valueArray = [];
						for (var i = 0; i < aCard[myField].length; i++) {
							valueArray.push([i, aCard[myField][i][0].join()]);
						}
						var found = false;
						if (valueArray.length > 1) {
							for (var i = 0; i < valueArray.length; i++) {
								for (var j = i+1; j < valueArray.length; j++) {
									if (valueArray[i][1] == valueArray[j][1]) {
										aCard[myField][valueArray[i][0]][1] = aCard[myField][valueArray[i][0]][1].concat(aCard[myField][valueArray[j][0]][1]);
										aCard[myField][valueArray[i][0]][1] = cardbookRepository.arrayUnique(aCard[myField][valueArray[i][0]][1]);
										valueArray.splice(j, 1);
										aCard[myField].splice(j, 1);
										j--;
									}
								}
							}
						}
						
					}
				} else if (myField == "categories") {
					aCard[myField] = cardbookUtils.unescapeArray(cardbookUtils.escapeString(aValue).split(","));
				// these fields may have multiples values and multiples types
				} else {
					var re = /[\n\u0085\u2028\u2029]|\r\n?/;
					var aValueArray = aValue.split(re);
					for (var i = 0; i < aValueArray.length; i++) {
						var myPref = false;
						if (aValueArray[i].slice(0, 2) == cardbookRepository.prefCSVPrefix) {
							aValueArray[i] = aValueArray[i].slice(2);
							myPref = true;
						}
						if (myType == "notype" || myType == "all") {
							if (myPref) {
								aCard[myField].push([ [aValueArray[i]], ["TYPE=PREF"], "", [] ]);
							} else {
								aCard[myField].push([ [aValueArray[i]], [], "", [] ]);
							}
						} else {
							var myType2 = "";
							for (var j = 0; j < cardbookRepository.cardbookCoreTypes["CARDDAV"][myField].length; j++) {
								if (cardbookRepository.cardbookCoreTypes["CARDDAV"][myField][j][0] == myType) {
									var myCode = cardbookRepository.cardbookCoreTypes["CARDDAV"][myField][j][1].split(";");
									myType2 = myCode[0];
									break;
								}
							}
							if (myType2 != "") {
								if (myPref) {
									aCard[myField].push([ [aValueArray[i]], ["TYPE=PREF", "TYPE=" + myType2], "", [] ]);
								} else {
									aCard[myField].push([ [aValueArray[i]], ["TYPE=" + myType2], "", [] ]);
								}
							} else {
								let PGNextNumber = cardbookRepository.cardbookTypes.rebuildAllPGs(aCard);
								myType = myType.replaceAll("_", " ");
								if (myPref) {
									aCard[myField].push([ [aValueArray[i]], ["TYPE=PREF"], "ITEM" + PGNextNumber, ["X-ABLABEL:" + myType] ]);
								} else {
									aCard[myField].push([ [aValueArray[i]], [], "ITEM" + PGNextNumber, ["X-ABLABEL:" + myType] ]);
								}
							}
						}
					}
				}
			}
		} else {
			var found = false;
			for (var i in cardbookRepository.customFields) {
				for (var j = 0; j < cardbookRepository.customFields[i].length; j++) {
					if (cardbookRepository.customFields[i][j][0] == aField) {
						aCard.others.push(aField + ":" + aValue);
						found = true;
						break;
					}
				}
			}
			if (!found) {
				aCard[aField] = aValue;
			}
		}
	},

	getPrefBooleanFromTypes: function(aArray) {
		if (aArray) {
			for (var i = 0; i < aArray.length; i++) {
				var upperElement = aArray[i].toUpperCase();
				if (upperElement === "PREF" || upperElement === "TYPE=PREF") {
					return true;
				} else if (upperElement.replace(/PREF=[0-9]*/i,"PREF") == "PREF") {
					return true;
				} else if (upperElement.replace(/^TYPE=/ig,"") !== upperElement) {
					var tmpArray = aArray[i].replace(/^TYPE=/ig,"").split(",");
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

	getPrefValueFromTypes: function(aArray, aVersion) {
		if (aVersion == "3.0") {
			return "";
		} else if (cardbookUtils.getPrefBooleanFromTypes(aArray)) {
			for (var i = 0; i < aArray.length; i++) {
				var upperElement = aArray[i].toUpperCase();
				if (upperElement === "PREF" || upperElement === "TYPE=PREF") {
					continue;
				} else if (upperElement.replace(/PREF=[0-9]*/i,"PREF") == "PREF") {
					return upperElement.replace(/PREF=/i,"");
				} else if (upperElement.replace(/^TYPE=/i,"") !== upperElement) {
					var tmpArray = aArray[i].replace(/^TYPE=/ig,"").split(",");
					for (var j = 0; j < tmpArray.length; j++) {
						var upperElement1 = tmpArray[j].toUpperCase();
						if (upperElement1 === "PREF") {
							continue;
						} else if (upperElement1.replace(/PREF=[0-9]*/i,"PREF") == "PREF") {
							return upperElement1.replace(/PREF=/i,"");
						}
					}
				}
			}
		}
		return "";
	},

	getOnlyTypesFromTypes: function(aArray) {
		function deletePrefs(element) {
			return !(element.toUpperCase().replace(/TYPE=PREF/i,"PREF").replace(/PREF=[0-9]*/i,"PREF") == "PREF");
		}
		var result = [];
		for (var i = 0; i < aArray.length; i++) {
			var upperElement = aArray[i].toUpperCase();
			if (upperElement == "PREF" || upperElement == "TYPE=PREF") {
				continue;
			} else if (upperElement == "HOME" || upperElement == "FAX" || upperElement == "CELL" || upperElement == "WORK") {
				result.push(aArray[i]);
			} else if (upperElement.replace(/^TYPE=/i,"") !== upperElement) {
				var tmpArray = aArray[i].replace(/^TYPE=/ig,"").split(",").filter(deletePrefs);
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

	getNotTypesFromTypes: function(aArray) {
		var result = [];
		for (var i = 0; i < aArray.length; i++) {
			var upperElement = aArray[i].toUpperCase();
			if (upperElement === "PREF" || upperElement === "TYPE=PREF") {
				continue;
			} else if (upperElement === "HOME" || upperElement === "FAX" || upperElement === "CELL" || upperElement === "WORK") {
				continue;
			} else if (upperElement.replace(/PREF=[0-9]*/i,"PREF") == "PREF") {
				continue;
			} else if (upperElement.replace(/^TYPE=/i,"") === upperElement) {
				result.push(aArray[i]);
			}
		}
		return result.join(",");
	},

	addEventstoCard: function(aCard, aEventsArray, aPGNextNumber, aDateFormat) {
		var myEventsArray = [];
		for (var i = 0; i < aEventsArray.length; i++) {
			var myValue = cardbookRepository.cardbookDates.getVCardDateFromDateString(aEventsArray[i][0], aDateFormat);
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
		var eventInNoteEventPrefix = cardbookRepository.extension.localeData.localizeMessage("eventInNoteEventPrefix");
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

	getTranslatedField: function (aField, aLocale) {
		for (var i in cardbookRepository.allColumns) {
			for (var j = 0; j < cardbookRepository.allColumns[i].length; j++) {
				if (i != "arrayColumns" && i != "categories") {
					if (cardbookRepository.allColumns[i][j] == aField) {
						return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns[i][j] + "Label");
					}
				} else if (i == "categories") {
					if (cardbookRepository.allColumns[i][j] + "_0_array" == aField) {
						return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns[i][j] + "Label");
					}
				}
			}
		}
		for (var i in cardbookRepository.customFields) {
			for (var j = 0; j < cardbookRepository.customFields[i].length; j++) {
				if (cardbookRepository.customFields[i][j][0] == aField) {
					return cardbookRepository.customFields[i][j][1];
				}
			}
		}
		for (var i = 0; i < cardbookRepository.allColumns.arrayColumns.length; i++) {
			if (cardbookRepository.allColumns.arrayColumns[i][0] + "_all" == aField) {
				return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][0] + "Label");
			} else if (cardbookRepository.allColumns.arrayColumns[i][0] + "_notype" == aField) {
				return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][0] + "Label") + " (" + cardbookRepository.extension.localeData.localizeMessage("importNoTypeLabel") + ")";
			}
			for (var k = 0; k < cardbookRepository.allColumns.arrayColumns[i][1].length; k++) {
				if (cardbookRepository.allColumns.arrayColumns[i][0] + "_" + k + "_all" == aField) {
					return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][1][k] + "Label");
				} else if (cardbookRepository.allColumns.arrayColumns[i][0] + "_" + k + "_notype" == aField) {
					return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][1][k] + "Label") + " (" + cardbookRepository.extension.localeData.localizeMessage("importNoTypeLabel") + ")";
				}
			}
		}
		for (var i = 0; i < cardbookRepository.allColumns.arrayColumns.length; i++) {
			var myPrefTypes = cardbookRepository.cardbookTypes.getTypesFromDirPrefId(cardbookRepository.allColumns.arrayColumns[i][0]);
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(myPrefTypes,0,1)
			for (var j = 0; j < myPrefTypes.length; j++) {
				//test
				let typeCode = myPrefTypes[j][1].replaceAll(" ", "_");
				if (cardbookRepository.allColumns.arrayColumns[i][0] + "_" + typeCode == aField) {
					return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][0] + "Label") + " (" + myPrefTypes[j][0] + ")";
				}
				for (var k = 0; k < cardbookRepository.allColumns.arrayColumns[i][1].length; k++) {
					if (cardbookRepository.allColumns.arrayColumns[i][0] + "_" + k + "_" + typeCode == aField) {
						return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][1][k] + "Label") + " (" + myPrefTypes[j][0] + ")";
					}
				}
			}
		}
		if ("blank" == aField) {
			return cardbookRepository.extension.localeData.localizeMessage("importBlankColumn");
		} else if (aField.startsWith("org_")) {
			let index = aField.replace(/^org_/, "");
			let orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
			let orgStructureArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
			return orgStructureArray[index];
		}
		return aField;
	},

	getEditionFieldsList: function() {
		let tmpArray = [];
		tmpArray.push([cardbookRepository.extension.localeData.localizeMessage("addressbookHeader"), "addressbook"]);
		tmpArray.push([cardbookRepository.extension.localeData.localizeMessage("categoriesHeader"), "categories"]);
		tmpArray.push([cardbookRepository.extension.localeData.localizeMessage("fnLabel"), "fn"]);
		tmpArray.push([cardbookRepository.extension.localeData.localizeMessage("noteLabel"), "note"]);

		for (let field of cardbookRepository.allColumns.personal) {
			if (cardbookRepository.newFields.includes(field)) {
				tmpArray.push([cardbookRepository.extension.localeData.localizeMessage(field + ".conf.label"), field]);
			} else {
				tmpArray.push([cardbookRepository.extension.localeData.localizeMessage(field + "Label"), field]);
			}
		}
		for (let field of cardbookRepository.multilineFields) {
			tmpArray.push([cardbookRepository.extension.localeData.localizeMessage(field + "GroupboxLabel"), field]);
		}
		for (let field of ["event", "tz"]) {
			tmpArray.push([cardbookRepository.extension.localeData.localizeMessage(field + "GroupboxLabel"), field]);
		}
		for (let field of cardbookRepository.allColumns.org) {
			tmpArray.push([cardbookRepository.extension.localeData.localizeMessage(field + "Label"), field]);
		}
		for (let field of cardbookRepository.adrElements) {
			tmpArray.push([cardbookRepository.extension.localeData.localizeMessage(field + "Label"), field]);
		}
		for (let type of ["personal", "org"]) {
			for (let field of cardbookRepository.customFields[type]) {
				tmpArray.push([field[1], field[0]]);
			}
		}
		let orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
		if (orgStructure) {
			let myOrgStructure = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
			for (let field of myOrgStructure) {
				tmpArray.push([field, "org_" + field]);
			}
		}
		tmpArray.push([cardbookRepository.extension.localeData.localizeMessage("listsTabLabel"), "list"]);
		tmpArray.push([cardbookRepository.extension.localeData.localizeMessage("keyTabLabel"), "key"]);
		cardbookRepository.cardbookUtils.sortMultipleArrayByString(tmpArray,0,1);
		return tmpArray;
	},

	getEditionFields: function() {
		let prefFields = [];
		prefFields = cardbookRepository.cardbookPreferences.getEditionFields();
		let editionFields = [];
		editionFields = cardbookRepository.cardbookUtils.getEditionFieldsList();
		let result = [];
		for (let field of editionFields) {
			let fieldLabel = field[0];
			let fieldCode = field[1];
			if (prefFields == "allFields") {
				result.push([true, fieldLabel, fieldCode, "", ""]);
			} else {
				if (prefFields[fieldCode]) {
					if (prefFields[fieldCode].function != "" && prefFields[fieldCode].function != null) {
						let convertFuntion = prefFields[fieldCode].function;
						let convertLabel = cardbookRepository.extension.localeData.localizeMessage(`${convertFuntion}Label`);
						result.push([prefFields[fieldCode].displayed, fieldLabel, fieldCode, convertLabel, convertFuntion]);
					} else {
						result.push([prefFields[fieldCode].displayed, fieldLabel,fieldCode, "", ""]);
					}
				} else {
					result.push([false, fieldLabel, fieldCode, "", ""]);
				}
			}
		}
		return result;
	},

	setEditionFields: function(aEditionFields) {
		let result = {};
		for (let field of aEditionFields) {
			if (field[0] == "allFields") {
				result = "allFields";
				break;
			} else {
				result[field[2]] = { displayed: field[0], function: field[4] };
			}
		}
		cardbookRepository.cardbookPreferences.setEditionFields(JSON.stringify(result));
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

	getDataForUpdatingFile: async function(aList) {
		var dataForExport = "";
		var k = 0;
		for (var i = 0; i < aList.length; i++) {
			if (k === 0) {
				dataForExport = await cardbookUtils.cardToVcardData(aList[i]);
				k = 1;
			} else {
				dataForExport = dataForExport + "\r\n" + await cardbookUtils.cardToVcardData(aList[i]);
			}
		}
		return dataForExport;
	},

	getNodeName: function(aAccountId) {
		var tmpArray = aAccountId.split("::");
		return tmpArray[tmpArray.length - 1];
	},

	getAccountId: function(aPrefId) {
		var result = aPrefId.split("::");
		if (result) {
			return result[0];
		} else {
			return aPrefId;
		}
	},

	getPositionOfAccountId: function(aAccountId) {
		for (var i = 0; i < cardbookHTMLDirTree.visibleData.length; i++) {
			if (cardbookHTMLDirTree.visibleData[i][1] == aAccountId) {
				return i;
			}
		}
		
		return -1;
	},

	getPositionOfCardId: function(aAccountId, aCardId) {
		for (let card of cardbookRepository.cardbookDisplayCards[aAccountId].cards) {
			if (card.uid == aCardId) {
				return i;
			}
		}
		return -1;
	},

	getAvailableAccountNumber: function() {
		var result = 0;
		for (let account of cardbookRepository.cardbookAccounts) {
			if (account[2] && account[3] != "SEARCH") {
				result++;
			}
		}
		return result;
	},

	getFirstAvailableAccount: function() {
		for (let account of cardbookRepository.cardbookAccounts) {
			if (account[2] && account[3] != "SEARCH") {
				return account[1];
			}
		}
		return "-1";
	},

	isFileAlreadyOpen: function(aAccountPath) {
		for (let account of cardbookRepository.cardbookAccounts) {
			if (account[2] && account[3] == "FILE") {
				if (cardbookRepository.cardbookPreferences.getUrl(account[1]) == aAccountPath) {
					return true;
				}
			}
		}
		return false;
	},

	isDirectoryAlreadyOpen: function(aAccountPath) {
		for (let account of cardbookRepository.cardbookAccounts) {
			if (account[2] && account[3] == "DIRECTORY") {
				if (cardbookRepository.cardbookPreferences.getUrl(account[1]) == aAccountPath) {
					return true;
				}
			}
		}
		return false;
	},

	isToggleOpen: function(aPrefId) {
		for (let account of cardbookRepository.cardbookAccounts) {
			if (account[1] == aPrefId) {
				if (account[0]) {
					return true;
				} else {
					return false;
				}
			}
		}
		return false;
	},

	addTagCreated: function(aCard) {
		cardbookUtils.nullifyTagModification(aCard);
		aCard.created = true;
	},

	addTagUpdated: function(aCard) {
		cardbookUtils.nullifyTagModification(aCard);
		aCard.updated = true;
	},

	addTagDeleted: function(aCard) {
		cardbookUtils.nullifyTagModification(aCard);
		aCard.deleted = true;
	},

	nullifyTagModification: function(aCard) {
		aCard.created = false;
		aCard.updated = false;
		aCard.deleted = false;
	},

	updateRev: function(aCard) {
		let sysdate = cardbookRepository.cardbookDates.getDateUTC();
		if (aCard.version == "4.0") {
			aCard.rev = sysdate.year + sysdate.month + sysdate.day + "T" + sysdate.hour + sysdate.min + sysdate.sec + "Z";
		} else {
			aCard.rev = sysdate.year + "-" + sysdate.month + "-" + sysdate.day + "T" + sysdate.hour + ":" + sysdate.min + ":" + sysdate.sec + "Z";
		}
	},

	addEtag: function(aCard, aEtag) {
		if (aEtag) {
			cardbookUtils.nullifyEtag(aCard);
			aCard.etag = aEtag;
		}
	},

	nullifyEtag: function(aCard) {
		aCard.etag = "";
	},

	prepareCardForCreation: function(aCard, aPrefType, aUrl) {
		aUrl = cardbookRepository.cardbookSynchronization.getSlashedUrl(aUrl);
		aCard.cardurl = aUrl + aCard.uid + ".vcf";
	},

	getFileExtension: function (aFile) {
		var myFileArray = aFile.split("/");
		var myFileArray1 = myFileArray[myFileArray.length-1].split("\\");
		return cardbookUtils.getFileNameExtension(myFileArray1[myFileArray1.length-1]);
	},

	getFileNameExtension: function (aFileName) {
		let myFileArray = aFileName.split(".");
		let myExtension = "";
		if (myFileArray.length != 1) {
			myExtension = myFileArray[myFileArray.length - 1];
		}
		return myExtension;
	},

	cleanEtag: function (aEtag) {
		if (aEtag) {
			if (aEtag.startsWith("https://") || aEtag.startsWith("http://") ) {
				// for open-exchange
				var myEtagArray = aEtag.split("/");
				aEtag = myEtagArray[myEtagArray.length - 1];
				aEtag = aEtag.replace(/(.*)_([^_]*)/, "$2");
			}
			return aEtag;
		}
		return "";
	},

	getPrefNameFromPrefId: function(aPrefId) {
		return cardbookRepository.cardbookPreferences.getName(aPrefId);
	},

	getFormattedFileName: function(aName) {
		return aName.replace(/([\\\/\:\*\?\"\<\>\|]+)/g, '-');
	},

	getFileNameForCard: function(aDirName, aName, aExtension) {
		try {
			let file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
			file.initWithPath(aDirName);
			file.append(cardbookUtils.getFormattedFileName(aName) + aExtension);
			file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
			return file.leafName;
		}
		catch (e) {
			return "";
		}
	},

	getFileNameForCard2: function(aCard, aListOfNames, aExtension) {
		let i = 1;
		let name = cardbookUtils.getFormattedFileName(aCard.fn) + aExtension;
		while (aListOfNames.includes(name) && i < 100) {
			name = cardbookUtils.getFormattedFileName(aCard.fn) + i + aExtension;
			i++;
		}
		return name;
	},

	getFileNameFromUrl: function(aUrl) {
		let cleanUrl = cardbookRepository.cardbookSynchronization.getSlashedUrl(aUrl).slice(0, -1);
		let keyArray = cleanUrl.split("/");
		let key = decodeURIComponent(keyArray[keyArray.length - 1]).replace(/^urn:uuid:/i, "");
		return cardbookUtils.getFormattedFileName(key);
	},

	setCacheURIFromCard: function(aCard, aPrefIdType) {
		if (aCard.cacheuri != "") {
			return;
		} else if (aPrefIdType === "DIRECTORY") {
			let myDirPrefIdUrl = cardbookRepository.cardbookPreferences.getUrl(aCard.dirPrefId);
			aCard.cacheuri = cardbookUtils.getFileNameForCard(myDirPrefIdUrl, aCard.fn, ".vcf");
		} else {
			if (aCard.cardurl) {
				if (aPrefIdType == "OFFICE365") {
					aCard.cacheuri = aCard.uid;
				} else {
					aCard.cacheuri = cardbookUtils.getFileNameFromUrl(aCard.cardurl);
				}
			} else {
				if (aPrefIdType == "GOOGLE2" || aPrefIdType == "GOOGLE3") {
					aCard.cacheuri = cardbookUtils.getFileNameFromUrl(aCard.uid);
				} else if (aPrefIdType == "OFFICE365") {
					aCard.cacheuri = aCard.uid;
				} else {
					aCard.cacheuri = cardbookUtils.getFileNameFromUrl(aCard.uid) + ".vcf";
				}
			}
		}
	},

	setCacheURIFromValue: function(aCard, aValue) {
		if (aCard.cacheuri != "") {
			return;
		} else if (aValue) {
			aCard.cacheuri = aValue;
		}
	},

	getPrefAddressFromCard: function (aCard, aType, aAddressPref) {
		var listOfAddress = [];
		if (aCard) {
			var notfoundOnePrefAddress = true;
			var listOfPrefAddress = [];
			var myPrefValue;
			var myOldPrefValue = 0;
			for (var j = 0; j < aCard[aType].length; j++) {
				var addressText = aCard[aType][j][0][0];
				if (aAddressPref) {
					for (var k = 0; k < aCard[aType][j][1].length; k++) {
						if (aCard[aType][j][1][k].toUpperCase().indexOf("PREF") >= 0) {
							if (aCard[aType][j][1][k].toUpperCase().indexOf("PREF=") >= 0) {
								myPrefValue = aCard[aType][j][1][k].toUpperCase().replace("PREF=","");
							} else {
								myPrefValue = 1;
							}
							if (myPrefValue == myOldPrefValue || myOldPrefValue === 0) {
								listOfPrefAddress.push(addressText);
								myOldPrefValue = myPrefValue;
							} else if (myPrefValue < myOldPrefValue) {
								listOfPrefAddress = [];
								listOfPrefAddress.push(addressText);
								myOldPrefValue = myPrefValue;
							}
							notfoundOnePrefAddress = false;
						}
					}
				} else {
					listOfAddress.push(addressText);
					notfoundOnePrefAddress = false;
				}
			}
			if (notfoundOnePrefAddress) {
				for (var j = 0; j < aCard[aType].length; j++) {
					listOfAddress.push(aCard[aType][j][0][0]);
				}
			} else {
				for (var j = 0; j < listOfPrefAddress.length; j++) {
					listOfAddress.push(listOfPrefAddress[j]);
				}
			}
		}
		return listOfAddress;
	},

	getEmailsFromCard: function (aCard, aEmailPref) {
		var listOfEmail = [];
		if (aCard) {
			var notfoundOnePrefEmail = true;
			var listOfPrefEmail = [];
			var myPrefValue;
			var myOldPrefValue = 0;
			for (var j = 0; j < aCard.email.length; j++) {
				var emailText = aCard.email[j][0][0];
				if (aEmailPref) {
					for (var k = 0; k < aCard.email[j][1].length; k++) {
						if (aCard.email[j][1][k].toUpperCase().indexOf("PREF") >= 0) {
							if (aCard.email[j][1][k].toUpperCase().indexOf("PREF=") >= 0) {
								myPrefValue = aCard.email[j][1][k].toUpperCase().replace("PREF=","");
							} else {
								myPrefValue = 1;
							}
							if (myPrefValue == myOldPrefValue || myOldPrefValue === 0) {
								listOfPrefEmail.push(emailText);
								myOldPrefValue = myPrefValue;
							} else if (myPrefValue < myOldPrefValue) {
								listOfPrefEmail = [];
								listOfPrefEmail.push(emailText);
								myOldPrefValue = myPrefValue;
							}
							notfoundOnePrefEmail = false;
						}
					}
				} else {
					listOfEmail.push(emailText);
					notfoundOnePrefEmail = false;
				}
			}
			if (notfoundOnePrefEmail) {
				for (var j = 0; j < aCard.email.length; j++) {
					var email = aCard.email[j][0][0];
					listOfEmail.push(email);
				}
			} else {
				for (var j = 0; j < listOfPrefEmail.length; j++) {
					listOfEmail.push(listOfPrefEmail[j]);
				}
			}
		}
		return listOfEmail;
	},

	getUidsFromList: function (aList) {
		var uidResult = [];
		var recursiveList = [];
		
		function _verifyRecursivity(aList1) {
			for (let list of recursiveList) {
				if (list == aList1.cbid) {
					cardbookUtils.formatStringForOutput("errorInfiniteLoopRecursion", [recursiveList.toSource()], "Warning");
					return false;
				}
			}
			recursiveList.push(aList1.cbid);
			return true;
		};
				
		function _getEmails(aCard) {
			if (aCard.isAList) {
				if (_verifyRecursivity(aCard)) {
					_convert(aCard);
				}
			} else {
				uidResult.push(aCard.cbid);
			}
		};
				
		function _convert(aList) {
			recursiveList.push(aList.cbid);
			let myMembers = cardbookRepository.cardbookUtils.getMembersFromCard(aList);
			for (let card of myMembers.uids) {
				_getEmails(card);
			}
		};
		_convert(aList);
		return uidResult;
	},

	// 2 : HTML, 1 : PlainText, 0 : Unknown
	getMailFormatFromCard: function (aCard) {
		if (aCard) {
			for (let other of aCard.others) {
				let localDelim1 = other.indexOf(":",0);
				if (localDelim1 >= 0) {
					let header = other.substr(0,localDelim1).toUpperCase();
					let trailer = other.substr(localDelim1+1, other.length).toUpperCase();
					if (header == cardbookRepository.defaultEmailFormat) {
						if (trailer == "TRUE") {
							return 2;
						} else if (trailer == "FALSE") {
							return 1;
						}
						break;
					}
				}
			}
		}
		return 0;
	},

	getMembersFromCard: function (aCard) {
		let result = { mails: [], uids: [], kind: "" };
		if (aCard.version == "4.0") {
			result.kind = aCard.kind;
			for (let member of aCard.member) {
				if (member.startsWith("mailto:")) {
					result.mails.push(member.replace("mailto:", ""));
				} else {
					let uid = member.replace("urn:uuid:", "");
					if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+uid]) {
						result.uids.push(cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+uid]);
					}
				}
			}
		} else if (aCard.version == "3.0") {
			var kindCustom = cardbookRepository.cardbookPrefs["kindCustom"];
			var memberCustom = cardbookRepository.cardbookPrefs["memberCustom"];
			result.kind = aCard.kind;
			for (let other of aCard.others) {
				var localDelim1 = other.indexOf(":",0);
				if (localDelim1 >= 0) {
					var header = other.substr(0,localDelim1).toUpperCase();
					var trailer = other.substr(localDelim1+1,other.length);
					if (header == kindCustom) {
						result.kind = trailer;
					} else if (header == memberCustom) {
						if (trailer.startsWith("mailto:")) {
							result.mails.push(trailer.replace("mailto:", ""));
						} else {
							let uid = trailer.replace("urn:uuid:", "");
							if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+uid]) {
								result.uids.push(cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+uid]);
							}
						}
					}
				}
			}
		}
		return result;
	},

	addMemberstoCard: function(aCard, aMemberLines, aKindValue) {
		if (aCard.version == "4.0") {
			aCard.member = JSON.parse(JSON.stringify(aMemberLines));
			if (aKindValue) {
				aCard.kind = aKindValue;
			} else {
				aCard.kind = "group";
			}
		} else if (aCard.version == "3.0") {
			var kindCustom = cardbookRepository.cardbookPrefs["kindCustom"];
			var memberCustom = cardbookRepository.cardbookPrefs["memberCustom"];
			for (var i = 0; i < aCard.others.length; i++) {
				localDelim1 = aCard.others[i].indexOf(":",0);
				if (localDelim1 >= 0) {
					var header = aCard.others[i].substr(0,localDelim1).toUpperCase();
					var trailer = aCard.others[i].substr(localDelim1+1,aCard.others[i].length);
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

	getMimeEmailsFromCards: function (aListOfCards, aOnlyEmail) {
		if (aOnlyEmail) {
			var useOnlyEmail = aOnlyEmail;
		} else {
			var useOnlyEmail = cardbookRepository.cardbookPrefs["useOnlyEmail"];
		}
		var result = [];
		for (var i = 0; i < aListOfCards.length; i++) {
			for (var j = 0; j < aListOfCards[i].emails.length; j++) {
				if (useOnlyEmail) {
					result.push(aListOfCards[i].emails[j]);
				} else {
					result.push(MailServices.headerParser.makeMimeAddress(aListOfCards[i].fn, aListOfCards[i].emails[j]));
				}
			}
		}
		return result;
	},

	getMimeEmailsFromCardsAndLists: function (aListOfCards, aOnlyEmail) {
		if (aOnlyEmail) {
			var useOnlyEmail = aOnlyEmail;
		} else {
			var useOnlyEmail = cardbookRepository.cardbookPrefs["useOnlyEmail"];
		}
		var result = {};
		result.emptyResults = [];
		result.notEmptyResults = [];
		for (let card of aListOfCards) {
			if (card.isAList) {
				var myConversion = new cardbookListConversion(card.fn + " <" + card.fn + ">");
				myConversion.emailResult = cardbookRepository.arrayUnique(myConversion.emailResult).join(", ");
				result.notEmptyResults = result.notEmptyResults.concat(myConversion.emailResult);
			} else {
				if (card.emails.length == 0) {
					result.emptyResults.push(card.fn);
				} else {
					for (let email of card.emails) {
						if (useOnlyEmail) {
							result.notEmptyResults.push(email);
						} else {
							result.notEmptyResults.push(MailServices.headerParser.makeMimeAddress(card.fn, email));
						}
					}
				}
			}
		}
		return result;
	},

	getAddressesFromCards: function (aListOfCards) {
		var listOfAddresses= [];
		if (aListOfCards) {
			for (var i = 0; i < aListOfCards.length; i++) {
				for (var j = 0; j < aListOfCards[i].adr.length; j++) {
					var adress = aListOfCards[i].adr[j][0];
					listOfAddresses.push(adress);
				}
			}
		}
		return listOfAddresses;
	},

	getURLsFromCards: function (aListOfCards) {
		var listOfURLs= [];
		if (aListOfCards) {
			for (var i = 0; i < aListOfCards.length; i++) {
				for (var j = 0; j < aListOfCards[i].url.length; j++) {
					var url = aListOfCards[i].url[j][0];
					listOfURLs.push(url);
				}
			}
		}
		return listOfURLs;
	},

	openExternalURL: function (aUrl) {
		var uri = Services.io.newURI(aUrl, null, null);
		var externalProtocolService = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);
		externalProtocolService.loadURI(uri, null);
	},

	isMyCardAList: function (aCard) {
		if (aCard.version == "4.0") {
			return (aCard.kind.toLowerCase() == 'group');
		} else if (aCard.version == "3.0") {
			var kindCustom = cardbookRepository.cardbookPrefs["kindCustom"];
			for (var i = 0; i < aCard.others.length; i++) {
				var localDelim1 = aCard.others[i].indexOf(":",0);
				if (localDelim1 >= 0) {
					var header = aCard.others[i].substr(0,localDelim1);
					if (header == kindCustom) {
						var trailer = aCard.others[i].substr(localDelim1+1,aCard.others[i].length);
						return (trailer.toLowerCase() == 'group');
					}
				}
			}
		}
		return false;
	},
	
	// aMode : export|import|search|cardstree
	getAllAvailableColumns: function (aMode) {
		var result = [];
		for (var i in cardbookRepository.allColumns) {
			for (var j = 0; j < cardbookRepository.allColumns[i].length; j++) {
				if (!["arrayColumns", "categories", "calculated", "technicalForTree", "media"].includes(i)) {
					result.push([cardbookRepository.allColumns[i][j], cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns[i][j] + "Label")]);
				} else if (i == "calculated" && aMode == "search") {
					result.push([cardbookRepository.allColumns[i][j], cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns[i][j] + "Label")]);
				} else if (i == "calculated" && aMode == "cardstree") {
					result.push([cardbookRepository.allColumns[i][j], cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns[i][j] + "Label")]);
				} else if (i == "technicalForTree" && aMode == "cardstree") {
					result.push([cardbookRepository.allColumns[i][j], cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns[i][j] + "Label")]);
				} else if (i == "categories") {
					result.push([cardbookRepository.allColumns[i][j] + "_0_array", cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns[i][j] + "Label")]);
				}
			}
		}
		for (var i in cardbookRepository.customFields) {
			for (var j = 0; j < cardbookRepository.customFields[i].length; j++) {
				result.push([cardbookRepository.customFields[i][j][0], cardbookRepository.customFields[i][j][1]]);
			}
		}
		let orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
		if (orgStructure != "") {
			let orgArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
			for (let i = 0; i < orgArray.length; i++) {
				result.push(["org_" + i, orgArray[i]]);
			}
		}
		for (var i = 0; i < cardbookRepository.allColumns.arrayColumns.length; i++) {
			for (var k = 0; k < cardbookRepository.allColumns.arrayColumns[i][1].length; k++) {
				result.push([cardbookRepository.allColumns.arrayColumns[i][0] + "_" + k + "_all",
											cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][1][k] + "Label")]);
			}
			if (aMode != "import") {
				if (cardbookRepository.allColumns.arrayColumns[i][1].length > 1) {
					result.push([cardbookRepository.allColumns.arrayColumns[i][0] + "_all",
												cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][0] + "Label")]);
				}
			}
			for (var k = 0; k < cardbookRepository.allColumns.arrayColumns[i][1].length; k++) {
				result.push([cardbookRepository.allColumns.arrayColumns[i][0] + "_" + k + "_notype",
											cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][1][k] + "Label") + " (" + cardbookRepository.extension.localeData.localizeMessage("importNoTypeLabel") + ")"]);
			}
			if (aMode != "import") {
				if (cardbookRepository.allColumns.arrayColumns[i][1].length > 1) {
					result.push([cardbookRepository.allColumns.arrayColumns[i][0] + "_notype",
												cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][0] + "Label") + " (" + cardbookRepository.extension.localeData.localizeMessage("importNoTypeLabel") + ")"]);
				}
			}
			var myPrefTypes = cardbookRepository.cardbookTypes.getTypesFromDirPrefId(cardbookRepository.allColumns.arrayColumns[i][0]);
			cardbookUtils.sortMultipleArrayByString(myPrefTypes,0,1)
			for (var j = 0; j < myPrefTypes.length; j++) {
				let typeCode = myPrefTypes[j][1].replaceAll(" ", "_");
				for (var k = 0; k < cardbookRepository.allColumns.arrayColumns[i][1].length; k++) {
					result.push([cardbookRepository.allColumns.arrayColumns[i][0] + "_" + k + "_" + typeCode,
												cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][1][k] + "Label") + " (" + myPrefTypes[j][0] + ")"]);
				}
				if (aMode != "import") {
					if (cardbookRepository.allColumns.arrayColumns[i][1].length > 1) {
						result.push([cardbookRepository.allColumns.arrayColumns[i][0] + "_" + typeCode,
													cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][0] + "Label") + " (" + myPrefTypes[j][0] + ")"]);
					}
				}
			}
		}
		return result;
	},

	CSVToArray: function (aContent, aDelimiter) {
		var result = [];
		var re = /[\n\u0085\u2028\u2029]|\r\n?/;
		var aContentArray = aContent.split(re);
		while (aContentArray[aContentArray.length - 1] == "") {
			aContentArray.pop();
		}
		if (aDelimiter) {
			var myDelimiter = aDelimiter;
		} else {
			var myDelimiter = ";";
		}
		// first part for the splitted lines
		var myNewContent = [];
		for (var i = 0; i < aContentArray.length; i++) {
			var myCurrentContent = aContentArray[i].replace(/\\\"/g,"@ESCAPEDDOUBLEQUOTES@").replace(/\\\,/g,"@ESCAPEDCOMMA@").replace(/\\\;/g,"@ESCAPEDSEMICOLON@");
			while (true) {
				var countDoublequotes = (myCurrentContent.match(/\"/g) || []).length;
				if ((countDoublequotes % 2) === 0) {
					myNewContent.push(myCurrentContent);
					break;
				} else {
					i++;
					myCurrentContent = myCurrentContent + "\r\n" + aContentArray[i].replace(/\\\"/g,"@ESCAPEDDOUBLEQUOTES@").replace(/\\\,/g,"@ESCAPEDCOMMA@").replace(/\\\;/g,"@ESCAPEDSEMICOLON@");
				}
			}
		}
		// second part for the splitted fields
		for (var i = 0; i < myNewContent.length; i++) {
			var tmpResult = [];
			var tmpArray = myNewContent[i].split(myDelimiter);
			for (var j = 0; j < tmpArray.length; j++) {
				var myCurrentContent = tmpArray[j];
				while (true) {
					if ((myCurrentContent[0] == '"')) {
						var countDoublequotes = (myCurrentContent.match(/\"/g) || []).length;
						if ((countDoublequotes % 2) === 0) {
							tmpResult = tmpResult.concat(myCurrentContent.replace(/@ESCAPEDDOUBLEQUOTES@/g , '\"').replace(/@ESCAPEDCOMMA@/g , "\,").replace(/@ESCAPEDSEMICOLON@/g , "\;"));
							break;
						} else {
							j++;
							myCurrentContent = myCurrentContent + myDelimiter + tmpArray[j];
						}
					} else {
						tmpResult = tmpResult.concat(myCurrentContent.replace(/@ESCAPEDDOUBLEQUOTES@/g , '\"').replace(/@ESCAPEDCOMMA@/g , "\,").replace(/@ESCAPEDSEMICOLON@/g , "\;"));
						break;
					}
				}
			}
			result.push(tmpResult);
		}
		return {result: result, delimiter: myDelimiter};
	},

	isThereNetworkAccountToSync: function() {
		for (let account of cardbookRepository.cardbookAccounts) {
			if (account[2] && cardbookUtils.isMyAccountRemote(account[3])) {
				return true;
			}
		}
		return false;
	},

	isMyAccountSyncing: function (aPrefId) {
		if (cardbookRepository.cardbookSyncMode[aPrefId] && cardbookRepository.cardbookSyncMode[aPrefId] == 1) {
				return true;
		}
		return false;
	},
	
	isMyAccountRemote: function (aType) {
		switch(aType) {
			case "STANDARD":
			case "DIRECTORY":
			case "FILE":
			case "LOCALDB":
			case "SEARCH":
				return false;
				break;
		};
		return true;
	},
	
	isMyAccountLocal: function (aType) {
		return !cardbookUtils.isMyAccountRemote(aType);
	},
	
	setCardUUID: function (aCard) {
		var result = cardbookUtils.getUUID();
		if (aCard.dirPrefId) {
			if (cardbookRepository.cardbookPreferences.getUrnuuid(aCard.dirPrefId)) {
				aCard.uid = "urn:uuid:" + result;
			} else {
				aCard.uid = result;
			}
		} else {
			aCard.uid = result;
		}
		aCard.cbid = aCard.dirPrefId + "::" + aCard.uid;
	},

	getUUID: function () {
		var uuidGen = Components.classes["@mozilla.org/uuid-generator;1"].getService(Components.interfaces.nsIUUIDGenerator);
		return uuidGen.generateUUID().toString().replace(/[{}]/g, '');
	},

	decodeURL: function (aURL) {
		var relative = aURL.match("(https?)(://[^/]*)/([^#?]*)");
		if (relative && relative[3]) {
			var relativeHrefArray = [];
			relativeHrefArray = relative[3].split("/");
			for (var i = 0; i < relativeHrefArray.length; i++) {
				relativeHrefArray[i] = decodeURIComponent(relativeHrefArray[i]);
			}
			return relative[1] + relative[2] + "/" + relativeHrefArray.join("/");
		} else {
			return aURL;
		}
	},

	fromValidationToArray: function (aDirPrefId, aType) {
		var aTargetArray = [];
		for (var url in cardbookRepository.cardbookServerValidation[aDirPrefId]) {
			if (url == "length" || url == "user") {
				continue;
			}
			if (cardbookRepository.cardbookServerValidation[aDirPrefId][url].forget) {
				continue;
			}
			let version = [];
			let connection = cardbookRepository.supportedConnections.filter(connection => connection.id == aType);
			if (connection[0].vCard) {
				version = JSON.parse(JSON.stringify(connection[0].vCard));
			} else if (cardbookRepository.cardbookServerValidation[aDirPrefId][url].version && 
							cardbookRepository.cardbookServerValidation[aDirPrefId][url].version.length > 0) {
				version = cardbookRepository.cardbookServerValidation[aDirPrefId][url].version;
			} else {
				version = JSON.parse(JSON.stringify(cardbookRepository.cardbookPrefs["supportedVersion"]));
			}
			let type = connection[0].type;
			let id = "";
			let serverUrl = url;
			if (cardbookRepository.cardbookServerValidation[aDirPrefId][url].id) {
				id = cardbookRepository.cardbookServerValidation[aDirPrefId][url].id;
				serverUrl = cardbookRepository.cardbookServerValidation[aDirPrefId][url].url;
			}

			let displayname = cardbookRepository.cardbookServerValidation[aDirPrefId][url].displayName || cardbookRepository.cardbookServerValidation[aDirPrefId].user;
			let readOnly = cardbookRepository.cardbookServerValidation[aDirPrefId][url].readOnly || false;

			aTargetArray.push([type, serverUrl, cardbookRepository.cardbookServerValidation[aDirPrefId].user, displayname,
								version, "", id, false, readOnly]);
		}
		return aTargetArray;
	},

	cacheGetMediaCard: async function(aCard, aType, aMediaFromDB = true) {
		return new Promise( async function(resolve, reject) {
			var result = [];
			if (aCard[aType].value) {
				if (aCard.version === "4.0") {
					if (aCard[aType].extension != "") {
						let myExtension = cardbookRepository.cardbookUtils.formatExtension(aCard[aType].extension, aCard[aType].version);
						result.push(":data:image/" + myExtension + ";base64," + aCard[aType].value);
					} else {
						result.push(":base64," + aCard[aType].value);
					}
				} else if (aCard.version === "3.0") {
					if (aCard[aType].extension != "") {
						let myExtension = cardbookRepository.cardbookUtils.formatExtension(aCard[aType].extension, aCard[aType].version);
						result.push(";ENCODING=B;TYPE=" + myExtension + ":" + aCard[aType].value);
					} else {
						result.push(";ENCODING=B:" + aCard[aType].value);
					}
				}
			} else if (aMediaFromDB) {
				let dirname = cardbookRepository.cardbookPreferences.getName(aCard.dirPrefId);
				let image = await cardbookIDBImage.getImage(aType, dirname, aCard.cbid, aCard.fn);
				if (image && image.content && image.extension) {
					let extension = image.extension || aCard[aType].extension;
					if (aCard.version === "4.0") {
						if (extension) {
							let extension1 = cardbookRepository.cardbookUtils.formatExtension(extension, aCard.version);
							result.push(":data:image/" + extension1 + ";base64," + image.content);
						} else {
							result.push(":base64," + image.content);
						}
					} else if (aCard.version === "3.0") {
						if (extension) {
							let extension1 = cardbookRepository.cardbookUtils.formatExtension(extension, aCard.version);
							result.push(";ENCODING=B;TYPE=" + extension1 + ":" + image.content);
						} else {
							result.push(";ENCODING=B:" + image.content);
						}
					}
				}
			}
			resolve(result);
		});
	},

	cachePutMediaCard: async function(aCard, aField) {
		try {
			var myPrefName = cardbookUtils.getPrefNameFromPrefId(aCard.dirPrefId);
			if (aCard[aField].value != "") {
				await cardbookIDBImage.addImage( aField, myPrefName, 
											{cbid: aCard.dirPrefId+"::"+aCard.uid, dirPrefId: aCard.dirPrefId, extension: aCard[aField].extension, content: aCard[aField].value},
											aCard.fn);
				aCard[aField].value = "";
			} else if (aCard[aField].localURI) {
				let imageFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
				imageFile.initWithPath(aCard[aField].localURI.replace("file://", ""));
				if (imageFile.exists() && imageFile.isFile()) {
					let [ base64, extension ] = await cardbookRepository.cardbookUtils.getImageFromURI(aCard.dirPrefId, aCard.fn, myPrefName, "file://" + imageFile.path);
					let filenameArray = imageFile.leafName.split(".");
					let extension1 = extension || filenameArray[filenameArray.length-1];
					await cardbookIDBImage.addImage( aField, myPrefName,
												{cbid: aCard.dirPrefId+"::"+aCard.uid, dirPrefId: aCard.dirPrefId, extension: extension1, content: base64},
												aCard.fn);
					aCard[aField].localURI = "";
				} else {
					aCard[aField].localURI = "";
				}
			} else if (aCard[aField].URI != "") {
				let [ base64, extension ] = await cardbookRepository.cardbookUtils.getImageFromURI(aCard.dirPrefId, aCard.fn, myPrefName, aCard[aField].URI);
				let filenameArray = aCard[aField].URI.split(".");
				let extension1 = extension || filenameArray[filenameArray.length-1];
				await cardbookIDBImage.addImage( aField, myPrefName,
											{cbid: aCard.dirPrefId+"::"+aCard.uid, dirPrefId: aCard.dirPrefId, extension: extension1, content: base64},
											aCard.fn);
			}
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookUtils.cachePutMediaCard error : " + e, "Error");
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookUtils.cachePutMediaCard aCard : " + aCard.toSource(), "Error");
		}
	},

	changeMediaFromFileToContent: async function (aCard) {
		try {
			let dirname = cardbookRepository.cardbookPreferences.getName(aCard.dirPrefId);
			for (let media of cardbookRepository.allColumns.media) {
				if (aCard[media].value == "") {
					if (aCard[media].URI && aCard[media].URI != "") {
						let [ base64, extension ]  = await cardbookRepository.cardbookUtils.getImageFromURI(aCard.dirPrefId, aCard.fn, dirname, aCard[media].URI);
						let filenameArray = aCard[media].URI.split(".");
						let uid = filenameArray[0];
						let extension1 = extension || filenameArray[filenameArray.length-1];
						aCard[media].value = base64;
						aCard[media].extension = extension1;
					} else {
						await cardbookIDBImage.getImage(media, dirname, aCard.cbid, aCard.fn)
							.then( image => {
								if (image && image.content && image.extension) {
									aCard[media].value = image.content;
								}
							})
							.catch( () => {} );
					}
				}
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookUtils.changeMediaFromFileToContent error : " + e, "Error");
		}
	},

	writeContentToFile: async function (aFileName, aContent, aConvertion, aActionId, aCount) {
		try {
			let win = Services.wm.getMostRecentWindow("mail:3pane", true);
			if (aConvertion == "UTF8") {
				await win.IOUtils.writeUTF8(aFileName, aContent);
			} else {
				let len = aContent.length;
				let bytes = new Uint8Array(len);
				for (let i = 0; i < len; i++) {
					bytes[i] = aContent.charCodeAt(i);
				}
				await win.IOUtils.write(aFileName, new Uint8Array(bytes.buffer));
			}
			if (aActionId && aCount && cardbookRepository.currentAction[aActionId]) {
				cardbookRepository.currentAction[aActionId].doneCards += aCount;
			}
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : file rewritten : " + aFileName);
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookUtils.writeContentToFile error : filename : " + aFileName + ", error : " + e, "Error");
		}
	},

	readContentFromFile: async function (aFilePath, aCallback, aParams) {
		try {
			let win = Services.wm.getMostRecentWindow("mail:3pane", true);
			let result = await win.IOUtils.readUTF8(aFilePath);
			await aCallback(result, aParams);
		} catch(e) {
			if (aParams.showError) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookUtils.readContentFromFile error : filename : " + aFilePath, "Error");
			}
			aCallback("", aParams);
		};
	},

	notifyObservers: function (aTopic, aParam) {
		if (aTopic) {
			let message = `cardbook.${aTopic}`;
			if (aTopic.startsWith("cardbook.")) {
				message = aTopic;
			}
			Services.obs.notifyObservers(null, message, aParam);
		}
	},

	bulkOperation: async function (aActionId) {
		if (aActionId && cardbookRepository.currentAction[aActionId] && cardbookRepository.currentAction[aActionId].totalEstimatedCards) {
			if (cardbookRepository.currentAction[aActionId].totalEstimatedCards < 10) {
				return;
			}
		}
		let url = "chrome/content/bulkOperation/wdw_bulkOperation.html";
		let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
														url: url,
														type: "popup"});
	},

	cleanRefreshToken: function (aString) {
		let cleanArray = [];
		for (let param of aString.split("&")) {
			if (param.startsWith("refresh_token=")) {
				cleanArray.push("refresh_token=*****");
			} else {
				cleanArray.push(param);
			}
		}
		return cleanArray.join('&');
	},

	cleanWebObject: function (aObject) {
		var cleanObjectArray = [];
		for (var key in aObject) {
			if (key == "access_token" || key == "refresh_token") {
				cleanObjectArray.push(key + ': "*****"');
			} else if (key == "Authorization") {
				cleanObjectArray.push(key + ': "' + aObject[key].replace(/^Basic (.*)/, 'Basic ').replace(/^Digest (.*)/, 'Digest ') + '"*****"');
			} else {
				cleanObjectArray.push(key + ': "' + aObject[key] + '"');
			}
		}
		return cleanObjectArray.join(', ');
	},

	formatStringForOutput: function(aStringCode, aValuesArray, aErrorCode) {
		if (aValuesArray) {
			if (aErrorCode) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation(cardbookRepository.extension.localeData.localizeMessage(aStringCode, aValuesArray), aErrorCode);
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformation(cardbookRepository.extension.localeData.localizeMessage(aStringCode, aValuesArray));
			}
		} else {
			if (aErrorCode) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation(cardbookRepository.extension.localeData.localizeMessage(aStringCode), aErrorCode);
			} else {
				cardbookRepository.cardbookLog.updateStatusProgressInformation(cardbookRepository.extension.localeData.localizeMessage(aStringCode));
			}
		}
	}

};
