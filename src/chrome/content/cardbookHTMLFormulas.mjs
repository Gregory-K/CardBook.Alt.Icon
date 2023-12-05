import { cardbookHTMLUtils } from "./cardbookHTMLUtils.mjs";
import { cardbookNewPreferences } from "./preferences/cardbookNewPreferences.mjs";

export var cardbookHTMLFormulas = {
	getDisplayedName: async function(aCard, aDirPrefId, aNewN, aNewOrg) {
		aCard.fn = await cardbookHTMLFormulas.getDisplayedNameFromFormula(aDirPrefId, aNewN, aNewOrg);
		if (aCard.fn == "") {
			await cardbookHTMLFormulas.getDisplayedNameFromRest(aCard);
		}
	},

	getDisplayedNameFromRest: async function(aCard) {
		for (let field of cardbookHTMLUtils.multilineFields) {
			if (aCard[field][0]) {
				aCard.fn = aCard[field][0][0][0];
				if (aCard.fn != "") {
					return;
				}
			}
		}
		let fieldsList = [ 'personal', 'org' ];
		let allColumns = await messenger.runtime.sendMessage({query: "cardbook.getAllColumns"});
		for (let i in fieldsList) {
			for (let j in allColumns[fieldsList[i]]) {
				if (aCard[allColumns[fieldsList[i]][j]] && aCard[allColumns[fieldsList[i]][j]] != "") {
					aCard.fn = aCard[allColumns[fieldsList[i]][j]];
					return;
				}
			}
		}
	},

	getFnDataForFormula: async function(aNewN, aNewOrg) {
		let orgStructure = await cardbookHTMLUtils.getPrefValue("orgStructure");
		let myOrg = aNewOrg[0];
		let myOrgArray = [];
		if (typeof(orgStructure) !== "undefined") {
			myOrgArray = cardbookHTMLUtils.unescapeArray(cardbookHTMLUtils.escapeString(myOrg).split(";"));
			let myOrgStructureArray = cardbookHTMLUtils.unescapeArray(cardbookHTMLUtils.escapeString(orgStructure).split(";"));
			for (let i = myOrgArray.length; i < myOrgStructureArray.length; i++) {
				myOrgArray.push("");
			}
		} else {
			myOrgArray = [cardbookHTMLUtils.unescapeString(cardbookHTMLUtils.escapeString(myOrg))];
		}
		let fnData = [];
		fnData = fnData.concat(aNewN);
		fnData = fnData.concat(myOrgArray);
		fnData = fnData.concat(aNewOrg[1]);
		fnData = fnData.concat(aNewOrg[2]);
		return fnData;
	},

	getDisplayedNameFromFormula: async function(aDirPrefId, aNewN, aNewOrg) {
		var result =  "";
		var myFnFormula = await cardbookNewPreferences.getFnFormula(aDirPrefId);
		let data = await cardbookHTMLFormulas.getFnDataForFormula(aNewN, aNewOrg);
		result = cardbookHTMLFormulas.getStringFromFormula(myFnFormula, data);
		return result.trim();
	},

	getStringFromFormula: function(aFormula, aArray) {
		let myEscapedFormula = cardbookHTMLUtils.escapeString1(aFormula);
		let myEscapedArray = cardbookHTMLUtils.escapeArray2(aArray);
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
		return cardbookHTMLUtils.unescapeString1(myEscapedFormula);
	},
};
