import { cardbookHTMLUtils } from "../cardbookHTMLUtils.mjs";
import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";

export var cardbookHTMLComplexSearch = {
    loadMatchAll: function (aValue) {
		if (aValue == true) {
			document.getElementById("booleanAndInput").checked = true;
			document.getElementById("booleanOrInput").checked = false;
		} else {
			document.getElementById("booleanAndInput").checked = false;
			document.getElementById("booleanOrInput").checked = true;
		}
	},

	getAllArray: function (aType) {
		let i = 0;
		let myResult = [];
		while (true) {
			if (document.getElementById(`${aType}_${i}_hbox`)) {
				let mySearchCase = document.getElementById(`${aType}_${i}_menulistCase`).value;
				let mySearchObj = document.getElementById(`${aType}_${i}_menulistObj`).value;
				let mySearchTerm = document.getElementById(`${aType}_${i}_menulistTerm`).value;
				let mySearchValue = document.getElementById(`${aType}_${i}_valueBox`).value;
				myResult.push({case: mySearchCase, field: mySearchObj, term: mySearchTerm, value: mySearchValue});
				i++;
			} else {
				break;
			}
		}
		return myResult;
	},

	deleteRowsType: function (aType) {
		cardbookHTMLTools.deleteRows(`${aType}Groupbox`);
	},

	disableButtons: function (aType, aIndex) {
		if (aIndex == 0) {
			if (document.getElementById(`${aType}_${aIndex}_valueBox`).value == "") {
				if (document.getElementById(`${aType}_${aIndex}_menulistTerm`).value == "IsntEmpty" ||
						document.getElementById(`${aType}_${aIndex}_menulistTerm`).value == "IsEmpty") {
					document.getElementById(`${aType}_${aIndex}_addButton`).disabled = false;
					document.getElementById(`${aType}_${aIndex}_removeButton`).disabled = false;
				} else {
					document.getElementById(`${aType}_${aIndex}_addButton`).disabled = true;
					document.getElementById(`${aType}_${aIndex}_removeButton`).disabled = true;
				}
			} else {
				document.getElementById(`${aType}_${aIndex}_addButton`).disabled = false;
				document.getElementById(`${aType}_${aIndex}_removeButton`).disabled = false;
			}
		} else {
			document.getElementById(`${aType}_0_removeButton`).disabled = false;
			for (var i = 0; i < aIndex; i++) {
				document.getElementById(`${aType}_${i}_addButton`).disabled = true;
				document.getElementById(`${aType}_${i}_downButton`).disabled = false;
			}
		}
		document.getElementById(`${aType}_${aIndex }_downButton`).disabled = true;
		document.getElementById(`${aType}_0_upButton`).disabled = true;
	},

	showOrHideForEmpty: function (aId) {
		let myIdArray = aId.split('_');
		if (document.getElementById(aId).value == "IsEmpty" || document.getElementById(aId).value == "IsntEmpty") {
			document.getElementById(`${myIdArray[0]}_${myIdArray[1]}_valueBox`).hidden = true;
			document.getElementById(`${myIdArray[0]}_${myIdArray[1]}_menulistCase`).hidden = true;
		} else {
			document.getElementById(`${myIdArray[0]}_${myIdArray[1]}_valueBox`).hidden = false;
			document.getElementById(`${myIdArray[0]}_${myIdArray[1]}_menulistCase`).hidden = false;
		}
	},

	loadDynamicTypes: async function (aType, aIndex, aArray) {
		let aOrigBox = document.getElementById(`${aType}Groupbox`);
		
		if (aIndex == 0) {
			cardbookHTMLTools.addHTMLH2LABEL(aOrigBox, `${aType}_label`, messenger.i18n.getMessage(`${aType}GroupboxLabel`), {});
		}
		
		let aHBox = cardbookHTMLTools.addHTMLDIV(aOrigBox, `${aType}_${aIndex}_hbox`, {class: "hbox hcentered"});

		cardbookHTMLTools.addMenuCaselist(aHBox, aType, aIndex, aArray.case, {});

		let columns = await messenger.runtime.sendMessage({query: "cardbook.getAllAvailableColumns", mode: "search"});
		cardbookHTMLUtils.sortMultipleArrayByString(columns, 1, 1);
		cardbookHTMLTools.addMenuObjlist(aHBox, aType, aIndex, columns, aArray.field, {});
		let selectTerm = cardbookHTMLTools.addMenuTermlist(aHBox, aType, aIndex, aArray.term, {});

        function fireMenuTerm(event) {
            if (document.getElementById(this.id).disabled) {
                return;
            }
            cardbookHTMLComplexSearch.showOrHideForEmpty(this.id);
            let myIdArray = this.id.split('_');
            cardbookHTMLComplexSearch.disableButtons(myIdArray[0], myIdArray[1]);
        };
        selectTerm.addEventListener("change", fireMenuTerm, false);

		let inputValue = cardbookHTMLTools.addHTMLINPUT(aHBox, `${aType}_${aIndex}_valueBox`, aArray.value, {"type": "text"});
		inputValue.addEventListener("input", cardbookHTMLTools.checkEditButton, false);

		function fireUpButton(event) {
			if (document.getElementById(this.id).disabled) {
				return;
			}
			let myAllValuesArray = cardbookHTMLComplexSearch.getAllArray(aType);
			if (myAllValuesArray.length <= 1) {
				return;
			}
			let temp = myAllValuesArray[aIndex*1-1];
			myAllValuesArray[aIndex*1-1] = myAllValuesArray[aIndex];
			myAllValuesArray[aIndex] = temp;
			cardbookHTMLComplexSearch.deleteRowsType(aType);
			cardbookHTMLComplexSearch.constructDynamicRows(aType, myAllValuesArray);
		};
		let inputUp = cardbookHTMLTools.addHTMLBUTTON(aHBox, `${aType}_${aIndex}_upButton`, "",
					{"title": messenger.i18n.getMessage("upEntryTooltip"), "class": "small-button cardbookUp"});
		let inputUpImg = cardbookHTMLTools.addHTMLIMAGE(inputUp, `${aType}_${aIndex}_upButtonImage`, { "src": "../skin/small-icons/arrow-up.svg" } );
		inputUp.addEventListener("click", fireUpButton, false);

		
		function fireDownButton(event) {
			if (document.getElementById(this.id).disabled) {
				return;
			}
			let myAllValuesArray = cardbookHTMLComplexSearch.getAllArray(aType);
			if (myAllValuesArray.length <= 1) {
				return;
			}
			let temp = myAllValuesArray[aIndex*1+1];
			myAllValuesArray[aIndex*1+1] = myAllValuesArray[aIndex];
			myAllValuesArray[aIndex] = temp;
			cardbookHTMLComplexSearch.deleteRowsType(aType);
			cardbookHTMLComplexSearch.constructDynamicRows(aType, myAllValuesArray);
		};
		let inputDown = cardbookHTMLTools.addHTMLBUTTON(aHBox, `${aType}_${aIndex}_downButton`, "",
						{"title": messenger.i18n.getMessage("downEntryTooltip"), "class": "small-button cardbookDown"});
		let inputDownImg = cardbookHTMLTools.addHTMLIMAGE(inputDown, `${aType}_${aIndex}_downButtonImage`, { "src": "../skin/small-icons/arrow-down.svg" } );
		inputDown.addEventListener("click", fireDownButton, false);

		function fireRemoveButton(event) {
			if (document.getElementById(this.id).disabled) {
				return;
			}
			let myAllValuesArray = cardbookHTMLComplexSearch.getAllArray(aType);
			cardbookHTMLComplexSearch.deleteRowsType(aType);
			if (myAllValuesArray.length == 0) {
				cardbookHTMLComplexSearch.constructDynamicRows(aType, myAllValuesArray);
			} else {
				let removed = myAllValuesArray.splice(aIndex, 1);
				cardbookHTMLComplexSearch.constructDynamicRows(aType, myAllValuesArray);
			}
		};
		let removeDown = cardbookHTMLTools.addHTMLBUTTON(aHBox, `${aType}_${aIndex}_removeButton`, "",
						{"title": messenger.i18n.getMessage("removeEntryTooltip"), "class": "small-button cardbookDelete"});
		let inputRemoveImg = cardbookHTMLTools.addHTMLIMAGE(removeDown, `${aType}_${aIndex}_removeButtonImage`, { "src": "../skin/small-icons/delete.svg" } );
		removeDown.addEventListener("click", fireRemoveButton, false);
		
		async function fireAddButton(event) {
			if (document.getElementById(this.id).disabled) {
				return;
			}
			let myValue = document.getElementById(`${aType}_${aIndex}_valueBox`).value;
			let myTerm = document.getElementById(`${aType}_${aIndex}_menulistTerm`).value;
			if (myValue == "" && myTerm !== "IsEmpty" && myTerm !== "IsntEmpty") {
				return;
			}
			let myNextIndex = 1+ 1*aIndex;
			await cardbookHTMLComplexSearch.loadDynamicTypes(aType, myNextIndex, {case: "", field: "", term: "", value: ""});
		};
		let addDown = cardbookHTMLTools.addHTMLBUTTON(aHBox, `${aType}_${aIndex}_addButton`, "",
					{"title": messenger.i18n.getMessage("addEntryTooltip"), "class": "small-button cardbookAdd"});
		let inputAddImg = cardbookHTMLTools.addHTMLIMAGE(addDown, `${aType}_${aIndex}_addButtonImage`, { "src": "../skin/small-icons/add.svg" } );
		addDown.addEventListener("click", fireAddButton, false);

		cardbookHTMLComplexSearch.showOrHideForEmpty(`${aType}_${aIndex}_menulistTerm`);
		cardbookHTMLComplexSearch.disableButtons(aType, aIndex);
		document.getElementById(`${aType}Groupbox`).dispatchEvent(new Event('input'));
	},

	constructDynamicRows: async function (aType, aArray) {
		cardbookHTMLComplexSearch.deleteRowsType(aType);
		for (var i = 0; i < aArray.length; i++) {
			await cardbookHTMLComplexSearch.loadDynamicTypes(aType, i, aArray[i]);
		}
		if (aArray.length == 0) {
			await cardbookHTMLComplexSearch.loadDynamicTypes(aType, 0, {case: "", field: "", term: "", value: ""});
		}
	},

	getSearch: function () {
		let result = {};
		result.searchAB = document.getElementById('addressbookMenulist').value;
		result.matchAll = cardbookHTMLUtils.getRadioValue("booleanAndGroup") == "and" ? true : false;

		result.rules = [];
		let allRules = cardbookHTMLComplexSearch.getAllArray("searchTerms");
		for (let rule of allRules) {
			if (rule.term == "IsEmpty" || rule.term == "IsntEmpty" || rule.value) {
				result.rules.push({ case: rule.case, field: rule.field, term: rule.term, value: rule.value });
			}
		}
		return result;
	}

};
