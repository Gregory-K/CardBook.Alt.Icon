import { cardbookHTMLDates } from "./cardbookHTMLDates.mjs";
import { cardbookHTMLUtils } from "./cardbookHTMLUtils.mjs";
import { cardbookHTMLTools } from "./cardbookHTMLTools.mjs";

// test import { cardbookNewPreferences } from "./preferences/cardbookNewPreferences.mjs";

export var cardbookHTMLWindowUtils = {

	displayCard: async function (aCard, aReadOnly) {
		let dateFields = [ "bday", "anniversary", "deathdate", "rev" ];
		let fieldArray1 = [ "fn", "lastname", "firstname", "othername", "prefixname", "suffixname", "nickname",
							"birthplace", "deathplace", "mailer", "sortstring",
							"class1", "agent", "prodid", "uid", "version", "dirPrefId", "cardurl", "etag" ];
		let dateFormat = await cardbookHTMLUtils.getDateFormat(aCard.dirPrefId, aCard.version);
		for (let field of fieldArray1) {
			if (document.getElementById(`${field}InputText`)) {
				let inputText = document.getElementById(`${field}InputText`);
				let value = "";
				if (dateFields.includes(field)) {
					value = cardbookHTMLDates.getDateStringFromVCardDate(aCard[field], dateFormat);
				} else if (aCard[field]) {
					value = aCard[field];
				}
				if (cardbookHTMLUtils.newFields.includes(field)) {
					if (aCard.version == "4.0") {
						if (value) {
							inputText.value = value;
							if (aReadOnly) {
								inputText.classList.add("hidden");
							} else {
								inputText.classList.remove("hidden");
							}
						}
					} else {
						inputText.classList.add("hidden");
					}
				} else {
					if (value) {
						inputText.value = value;
						if (aReadOnly) {
							inputText.classList.add("hidden");
						} else {
							inputText.classList.remove("hidden");
						}
					}
				}
			}
			if (document.getElementById(`${field}InputLabel`)) {
				let inputLabel = document.getElementById(`${field}InputLabel`);
				let value = "";
				if (dateFields.includes(field)) {
					value = await cardbookHTMLDates.getFormattedDateForCard(aCard, field);
				} else if (aCard[field]) {
					value = aCard[field];
				}
				if (cardbookHTMLUtils.newFields.includes(field)) {
					if (aCard.version == "4.0") {
						if (value) {
							inputLabel.textContent = value;
							if (aReadOnly) {
								inputLabel.classList.remove("hidden");
							} else {
								inputLabel.classList.add("hidden");
							}
						}
					} else {
						inputLabel.classList.add("hidden");
					}
				} else {
					if (value) {
						inputLabel.textContent = value;
						if (aReadOnly) {
							inputLabel.classList.remove("hidden");
						} else {
							inputLabel.classList.add("hidden");
						}
					}
				}
			}
		}

		if (document.getElementById("genderMenulist")) {
			let inputMenulist = document.getElementById("genderMenulist");
			if (aCard.gender != "") {
				inputMenulist.value = aCard.gender;
				if (aReadOnly) {
					inputMenulist.classList.remove("hidden");
				} else {
					inputMenulist.classList.add("hidden");
				}
			} else {
				inputMenulist.classList.add("hidden");
			}
		}
		if (document.getElementById("genderInputLabel")) {
			let inputLabel = document.getElementById("genderInputLabel");
			if (aCard.gender != "") {
				let gender = aCard.gender.toLowerCase();
				inputLabel.value = messenger.i18n.getMessage(`types.gender.${gender}`)
				if (aReadOnly) {
					inputLabel.classList.remove("hidden");
				} else {
					inputLabel.classList.add("hidden");
				}
			} else {
				inputLabel.classList.add("hidden");
			}
		}

		if (document.getElementById("listGroupbox")) {
			let listbox = document.getElementById('listGroupbox');
			if (aCard.isAList) {
				listbox.classList.remove("hidden");
			} else {
				listbox.classList.add("hidden");
			}
		}

		if (aCard.isAList) {
			if (document.getElementById('PreferMailFormatGroupbox')) {
				document.getElementById('PreferMailFormatGroupbox').classList.add("hidden");
			}
		} else {
			if (document.getElementById('PreferMailFormatGroupbox')) {
				document.getElementById('PreferMailFormatGroupbox').classList.remove("hidden");
			}
			let mailFormat = cardbookHTMLUtils.getMailFormatFromCard(aCard);
			if (aReadOnly) {
				if (document.getElementById('preferMailFormatMenulist')) {
					document.getElementById('preferMailFormatMenulist').classList.add("hidden");
				}
				if (mailFormat == "1") {
					document.getElementById('preferMailFormatInputLabel').value = messenger.i18n.getMessage("PlainText.label");
				} else if (mailFormat == "2") {
					document.getElementById('preferMailFormatInputLabel').value = messenger.i18n.getMessage("HTML.label");
				} else {
					if (document.getElementById('PreferMailFormatGroupbox')) {
						document.getElementById('PreferMailFormatGroupbox').classList.add("hidden");
					}
				}
			} else {
				if (document.getElementById('preferMailFormatInputLabel')) {
					document.getElementById('preferMailFormatInputLabel').classList.add("hidden");
				}
				document.getElementById("preferMailFormatMenulist").value = mailFormat;
			}
		}

		let myRemainingOthers = [];
		myRemainingOthers = await cardbookHTMLWindowUtils.constructCustom(aReadOnly, 'personal', aCard.others);
		
		await cardbookHTMLWindowUtils.constructOrg(aReadOnly, aCard.org, aCard.title, aCard.role);
		myRemainingOthers = await cardbookHTMLWindowUtils.constructCustom(aReadOnly, 'org', myRemainingOthers);
		
		// test 
		// test let fieldArray3 = [ [ "photo", "URI" ], [ "logo", "URI" ], [ "sound", "URI" ] ];
		// test for (var field of fieldArray3) {
		// test 	if (document.getElementById(field[0] + field[1] + 'TextBox')) {
		// test 		document.getElementById(field[0] + field[1] + 'TextBox').value = aCard[field[0]][field[1]];
		// test 		if (aReadOnly) {
		// test 			document.getElementById(field[0] + field[1] + 'TextBox').setAttribute('readonly', 'true');
		// test 		} else {
		// test 			document.getElementById(field[0] + field[1] + 'TextBox').removeAttribute('readonly');
		// test 		}
		// test 	}
		// test }
		
		// test wdw_imageEdition.displayImageCard(aCard, !aReadOnly);
		// test pas utile cardbookWindowUtils.display40(aCard.version, aReadOnly);
		// test pas utile cardbookWindowUtils.displayDates(aCard.version, aReadOnly);

		/*
		var myNoteArray = aCard.note.split("\n");
		var myEvents = cardbookHTMLUtils.getEventsFromCard(myNoteArray, myRemainingOthers);
		if (aCard.isAList) {
			if (aReadOnly) {
				cardbookWindowUtils.loadStaticList(aCard);
			} else {
				wdw_cardEdition.displayLists(aCard);
			}
		} else {
			cardbookElementTools.deleteRowsAllTypes();
			for (let field of cardbookRepository.multilineFields) {
				if (aReadOnly) {
					if (aCard[field].length > 0) {
						cardbookWindowUtils.constructStaticRows(aCard.dirPrefId, field, aCard[field], aCard.version);
					}
				} else {
					if (field == "impp") {
						cardbookRepository.cardbookTypes.loadIMPPs(aCard[field]);
					}
					cardbookWindowUtils.constructDynamicRows(field, aCard[field], aCard.version);
				}
			}
			if (aReadOnly) {
				cardbookWindowUtils.constructStaticEventsRows(aCard.dirPrefId, myEvents.result, aCard.version);
			} else {
				cardbookWindowUtils.constructDynamicEventsRows(aCard.dirPrefId, "event", myEvents.result, aCard.version);
			}
			let field = [];
			if (Array.isArray(aCard.tz)) {
				field = aCard.tz;
			} else {
				field = [[aCard.tz]];
			}
			if (aReadOnly) {
				cardbookWindowUtils.constructStaticTzRows(field);
			} else {
				cardbookWindowUtils.constructDynamicTzRows("tz", field);
			}
		}
		
		document.getElementById('othersTextBox').value = myEvents.remainingOthers.join("\n");
		if (document.getElementById('othersTextBox')) {
			if (aReadOnly) {
				document.getElementById('othersTextBox').setAttribute('readonly', 'true');
			} else {
				document.getElementById('othersTextBox').removeAttribute('readonly');
			}
		}
		var panesView = cardbookRepository.cardbookPrefs["panesView"];
		if (document.getElementById('note' + panesView + 'TextBox')) {
			var myNoteBox = document.getElementById('note' + panesView + 'TextBox');
		} else if (document.getElementById('noteTextBox')) {
			var myNoteBox = document.getElementById('noteTextBox');
		}
		if (myNoteBox) {
			myNoteBox.value = myEvents.remainingNote.join("\n");
			if (aReadOnly) {
				myNoteBox.setAttribute('readonly', 'true');
			} else {
				myNoteBox.removeAttribute('readonly');
			}
		}
		cardbookWindowUtils.loadEmailProperties(aCard, aReadOnly);
		
		if (aReadOnly) {
			cardbookWindowUtils.constructStaticKeysRows(aCard.dirPrefId, aCard.key, aCard.version, aCard.fn, aCard.dirPrefId);
		} else {
			cardbookWindowUtils.constructDynamicKeysRows(aCard.dirPrefId, "key", aCard.key, aCard.version);
		}
		*/
	},

	constructCustom: async function (aReadOnly, aType, aOtherValue) {
		let othersTemp = JSON.parse(JSON.stringify(aOtherValue));
		let customFields = await messenger.runtime.sendMessage({query: "cardbook.getCustomFields"});
		let result = customFields[aType];
		for (let i = 0; i < result.length; i++) {
			let myCode = result[i][0];
			let myLabel = result[i][1];
			let myField = `customField${i}${aType}`;
			let myValue = "";
			let j;
			for (j = 0; j < othersTemp.length; j++) {
				let delim = othersTemp[j].indexOf(":", 0);
				let header = othersTemp[j].substr(0, delim);
				let value = othersTemp[j].substr(delim+1, othersTemp[j].length);
				let headerTmp = header.split(";");
				if (myCode == headerTmp[0]) {
					myValue = value;
					break;
				}
			}
			let dummy = othersTemp.splice(j,1);
			j--;
			let table = document.getElementById(aType + 'Table');
			if (aReadOnly) {
				if (myValue != "") {
					let currentRow = cardbookHTMLTools.addHTMLTR(table, myField + 'Row');
					let labelData = cardbookHTMLTools.addHTMLTD(currentRow, myField + 'Label' + '.1');
					cardbookHTMLTools.addHTMLLABEL(labelData, myField + 'Label', myLabel, {class: 'boldFont'});
					let textboxData = cardbookHTMLTools.addHTMLTD(currentRow, myField + 'TextBox' + '.2');
					let myTextbox = cardbookHTMLTools.addHTMLLABEL(textboxData, myField + 'TextBox', myValue, {"data-field-name": myCode, "data-field-label": myLabel});
				}
			} else {
				let currentRow = cardbookHTMLTools.addHTMLTR(table, myField + 'Row');
				let labelData = cardbookHTMLTools.addHTMLTD(currentRow, myField + 'Label' + '.1');
				cardbookHTMLTools.addHTMLLABEL(labelData, myField + 'Label', myLabel, {class: 'boldFont'});
				let textboxData = cardbookHTMLTools.addHTMLTD(currentRow, myField + 'TextBox' + '.2');
				let textbox = cardbookHTMLTools.addHTMLINPUT(textboxData, myField + 'TextBox', myValue, {"data-field-name": myCode});
				textbox.addEventListener("input", wdw_cardEdition.onInputField, false);
				cardbookHTMLTools.addProcessButton(textboxData, myCode + 'ProcessButton');
			}
		}
		return othersTemp;
	},

	constructOrg: async function (aReadOnly, aOrgValue, aTitleValue, aRoleValue) {
		let aOrigBox = document.getElementById('orgTable');
		let orgStructure = await cardbookHTMLUtils.getPrefValue("orgStructure");
		let currentRow;
		if (orgStructure != "") {
			let myOrgStructure = cardbookHTMLUtils.unescapeArray(cardbookHTMLUtils.escapeString(orgStructure).split(";"));
			let myOrgValue = cardbookHTMLUtils.unescapeArray(cardbookHTMLUtils.escapeString(aOrgValue).split(";"));
			for (let i = 0; i < myOrgStructure.length; i++) {
				let myValue = "";
				if (myOrgValue[i]) {
					myValue = myOrgValue[i];
				}
				if (aReadOnly) {
					if (myValue != "") {
						let currentRow = cardbookHTMLTools.addHTMLTR(aOrigBox, 'orgRow_' + i);
						let labelData = cardbookHTMLTools.addHTMLTD(currentRow, 'orgTextBox_' + i + '.1');
						cardbookHTMLTools.addHTMLLABEL(labelData, 'orgLabel_' + i, myOrgStructure[i], {class: 'boldFont'});
						let textboxData = cardbookHTMLTools.addHTMLTD(currentRow, 'orgTextBox_' + i + '.2');
						let myTextbox = cardbookHTMLTools.addHTMLLABEL(textboxData, 'orgTextBox_' + i, myValue, {"data-field-name": 'org_' + myOrgStructure[i], "data-field-label": myOrgStructure[i], allValue: myOrgValue.join("::")});
					}
				} else {
					let currentRow = cardbookHTMLTools.addHTMLTR(aOrigBox, 'orgRow_' + i);
					let labelData = cardbookHTMLTools.addHTMLTD(currentRow, 'orgTextBox_' + i + '.1');
					cardbookHTMLTools.addHTMLLABEL(labelData, 'orgLabel_' + i, myOrgStructure[i], {class: 'boldFont'});
					let textboxData = cardbookHTMLTools.addHTMLTD(currentRow, 'orgTextBox_' + i + '.2');
					let myTextBox = cardbookHTMLTools.addHTMLINPUT(textboxData, 'orgTextBox_' + i, myValue, {"data-field-name": 'org_' + myOrgStructure[i], type: 'autocomplete', autocompletesearch: 'form-history', autocompletesearchparam: 'orgTextBox_' + i, class:'padded'});
					myTextBox.addEventListener("input", wdw_cardEdition.onInputField, false);
					cardbookHTMLTools.addProcessButton(textboxData, 'org_' + myOrgStructure[i] + 'ProcessButton');
				}
			}
		} else {
			let myOrgValue = cardbookHTMLUtils.unescapeString(cardbookHTMLUtils.escapeString(aOrgValue));
			if (aReadOnly) {
				if (myOrgValue != "") {
					let currentRow = cardbookHTMLTools.addHTMLTR(aOrigBox, 'orgRow_0');
					let myLabel = messenger.i18n.getMessage("orgLabel");
					let labelData = cardbookHTMLTools.addHTMLTD(currentRow, 'orgTextBox_0' + '.1');
					cardbookHTMLTools.addHTMLLABEL(labelData, 'orgLabel', myLabel, {class: 'boldFont'});
					let textboxData = cardbookHTMLTools.addHTMLTD(currentRow, 'orgTextBox_0' + '.2');
					let myTextbox = cardbookHTMLTools.addHTMLLABEL(textboxData, 'orgTextBox_0', myOrgValue, {"data-field-name": 'org', "data-field-label": myLabel});
				}
			} else {
				let currentRow = cardbookHTMLTools.addHTMLTR(aOrigBox, 'orgRow_0');
				let labelData = cardbookHTMLTools.addHTMLTD(currentRow, 'orgLabel' + '.1');
				cardbookHTMLTools.addHTMLLABEL(labelData, 'orgLabel', messenger.i18n.getMessage("orgLabel"), {class: 'boldFont'});
				let textboxData = cardbookHTMLTools.addHTMLTD(currentRow, 'orgTextBox_0' + '.2');
				let myTextBox = cardbookHTMLTools.addHTMLINPUT(textboxData, 'orgTextBox_0', myOrgValue, {'data-field-name': 'org', type: 'autocomplete', autocompletesearch: 'form-history', autocompletesearchparam: 'orgTextBox_0', class:'padded'});
				myTextBox.addEventListener("input", wdw_cardEdition.onInputField, false);
				cardbookHTMLTools.addProcessButton(textboxData, 'orgProcessButton');
			}
		}
		if (aReadOnly) {
			if (aTitleValue != "") {
				let currentRow = cardbookHTMLTools.addHTMLTR(aOrigBox, 'titleRow');
				let myLabel = messenger.i18n.getMessage("titleLabel");
				let labelData = cardbookHTMLTools.addHTMLTD(currentRow, 'titleLabel' + '.1');
				cardbookHTMLTools.addHTMLLABEL(labelData, 'titleLabel', myLabel, {class: 'boldFont'});
				let textboxData = cardbookHTMLTools.addHTMLTD(currentRow, 'titleInputLabel' + '.2');
				let myTextbox = cardbookHTMLTools.addHTMLLABEL(textboxData, 'titleInputLabel', aTitleValue, {"data-field-name": 'title', "data-field-label": myLabel});
			}
			if (aRoleValue != "") {
				let currentRow = cardbookHTMLTools.addHTMLTR(aOrigBox, 'roleRow');
				let myLabel = messenger.i18n.getMessage("roleLabel");
				let labelData = cardbookHTMLTools.addHTMLTD(currentRow, 'roleLabel' + '.1');
				cardbookHTMLTools.addHTMLLABEL(labelData, 'roleLabel', myLabel, {class: 'boldFont'});
				let textboxData = cardbookHTMLTools.addHTMLTD(currentRow, 'roleInputLabel' + '.2');
				let myTextbox = cardbookHTMLTools.addHTMLLABEL(textboxData, 'roleInputLabel', aRoleValue, {"data-field-name": 'role', "data-field-label": myLabel});
			}
		} else {
			let titleRow = cardbookHTMLTools.addHTMLTR(aOrigBox, 'titleRow');
			let titleLabelData = cardbookHTMLTools.addHTMLTD(titleRow, 'titleLabel' + '.1');
			cardbookHTMLTools.addHTMLLABEL(titleLabelData, 'titleLabel', messenger.i18n.getMessage("titleLabel"), {class: 'boldFont'});
			let titleTextboxData = cardbookHTMLTools.addHTMLTD(titleRow, 'titleInputText' + '.2');
			let titleTextBox = cardbookHTMLTools.addHTMLINPUT(titleTextboxData, 'titleInputText', aTitleValue, {"data-field-name": 'title', type: 'autocomplete', autocompletesearch: 'form-history', autocompletesearchparam: 'titleTextBox', class:'padded'});
			titleTextBox.addEventListener("input", wdw_cardEdition.onInputField, false);
			cardbookHTMLTools.addProcessButton(titleTextboxData, 'titleProcessButton');
			titleTextBox.addEventListener("input", wdw_cardEdition.setDisplayName, false);
			let roleRow = cardbookHTMLTools.addHTMLTR(aOrigBox, 'roleRow');
			let roleLabelData = cardbookHTMLTools.addHTMLTD(roleRow, 'roleLabel' + '.1');
			cardbookHTMLTools.addHTMLLABEL(roleLabelData, 'roleLabel', messenger.i18n.getMessage("roleLabel"), {class: 'boldFont'});
			let roleTextboxData = cardbookHTMLTools.addHTMLTD(roleRow, 'roleInputText' + '.2');
			let roleTextBox = cardbookHTMLTools.addHTMLINPUT(roleTextboxData, 'roleInputText', aRoleValue, {"data-field-name": 'role', type: 'autocomplete', autocompletesearch: 'form-history', autocompletesearchparam: 'titleTextBox', class:'padded'});
			roleTextBox.addEventListener("input", wdw_cardEdition.onInputField, false);
			cardbookHTMLTools.addProcessButton(roleTextboxData, 'roleProcessButton');
		}
	},
};
