import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
import { cardbookHTMLUtils } from "../cardbookHTMLUtils.mjs";
import { cardbookNewPreferences } from "../preferences/cardbookNewPreferences.mjs";
import { PhoneNumber } from "../formautofill/phonenumberutils/PhoneNumber.mjs";

if ("undefined" == typeof(wdw_formatData)) {

	var wdw_formatData = {
		
        dirPrefId: "",
        allColumns: {},
        adrElements: [],
        allCustomFields: {},
        countries: [],
		resfreshTime: 200,
		toDo: 0,
		rowDone: 0,
		scopeName: "",
		cardsLoaded: false,
		winId: 0,
		displayId: 0,

		loadCountries: async function () {
            wdw_formatData.countries = await messenger.runtime.sendMessage({query: "cardbook.getCountries", useCodeValues: true});
            cardbookHTMLUtils.sortMultipleArrayByString(wdw_formatData.countries,1,1);
		},

		getNewFormat: function (aId, aValue, aType, aParam) {
			switch(aType) {
				case "tel":
					let country = "";
					if (aParam && aParam.country) {
						country = aParam.country;
					} else if (document.getElementById(aId + '.country')) {
					 	country = document.getElementById(aId + '.country').value;
					}
					let newTel = PhoneNumber.Parse(aValue, country.toUpperCase());
					if (newTel && newTel.internationalFormat) {
						return newTel.internationalFormat;
					}
					break;
				case "email":
					aValue = aValue.toLowerCase();
					aValue = aValue.replace("'", "").replace('"', "");
					let atPos = aValue.lastIndexOf("@");
					if (atPos > 0 && atPos + 1 < aValue.length) {
						return aValue;
					}
					break;
			}
        },

		displayCardLineFields: function (aCardLine) {
            // [index, aCard.cbid, aCard.fn, field source, field modified]
			let table = document.getElementById('fieldsTable');
			let row = cardbookHTMLTools.addHTMLTR(table, `${aCardLine[0]}.row`);
            let fnData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.fnData`);
            cardbookHTMLTools.addHTMLLABEL(fnData, `${aCardLine[0]}.fn`, aCardLine[2]);
            let valueData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.valueData`);
            wdw_formatData.createTextbox(valueData, `${aCardLine[0]}.value`, aCardLine[4], 'fields', {'valuetype': 'fields'});
            let formatData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.formatData`);
            wdw_formatData.createFormatFieldButton(formatData, `${aCardLine[0]}.format`);
            let undoData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.undoData`);
            wdw_formatData.createUndoButton(undoData, `${aCardLine[0]}.undo`);
            let cbidData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.cbidData`);
            cardbookHTMLTools.addHTMLLABEL(cbidData, `${aCardLine[0]}.cbid`, aCardLine[1], {class: "hidden"});
            let sourceValueData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.sourceValueData`);
            cardbookHTMLTools.addHTMLLABEL(sourceValueData, `${aCardLine[0]}.sourceValue`, aCardLine[3], {class: "hidden"});
        },

		displayCardLineTels: function (aCardLine) {
            // [index, aCard.cbid, aCard.fn, country, tel source, tel modified, index tel line]
			let table = document.getElementById('fieldsTable');
			let row = cardbookHTMLTools.addHTMLTR(table, `${aCardLine[0]}.row`);
            let fnData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.fnData`);
            cardbookHTMLTools.addHTMLLABEL(fnData, `${aCardLine[0]}.fn`, aCardLine[2]);
            let valueData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.valueData`);
            wdw_formatData.createTextbox(valueData, `${aCardLine[0]}.value`, aCardLine[5], 'tel', {country: aCardLine[3].toUpperCase(), 'valuetype': 'tel'});
            let countryData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.countryData`);
            wdw_formatData.createCountryList(countryData, `${aCardLine[0]}.country`, aCardLine[3].toUpperCase());
            let formatData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.formatData`);
            wdw_formatData.createFormatButton(formatData, `${aCardLine[0]}.format`);
            let undoData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.undoData`);
            wdw_formatData.createUndoButton(undoData, `${aCardLine[0]}.undo`);
            let cbidData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.cbidData`);
            cardbookHTMLTools.addHTMLLABEL(cbidData, `${aCardLine[0]}.cbid`, aCardLine[1], {class: "hidden"});
            let sourceValueData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.sourceValueData`);
            cardbookHTMLTools.addHTMLLABEL(sourceValueData, `${aCardLine[0]}.sourceValue`, aCardLine[4], {class: "hidden"});
            let indexData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.indexData`);
            cardbookHTMLTools.addHTMLLABEL(indexData, `${aCardLine[0]}.index`, aCardLine[6], {class: "hidden"});
        },

		displayCardLineEmail: function (aCardLine) {
            // [index, aCard.cbid, aCard.fn, email source, email modified, index email line]
			let table = document.getElementById('fieldsTable');
			let row = cardbookHTMLTools.addHTMLTR(table, `${aCardLine[0]}.row`);
            let fnData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.fnData`);
            cardbookHTMLTools.addHTMLLABEL(fnData, `${aCardLine[0]}.fn`, aCardLine[2]);
            let valueData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.valueData`);
            wdw_formatData.createTextbox(valueData, `${aCardLine[0]}.value`, aCardLine[4], 'email', {'valuetype': 'email'});
            let formatData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.formatData`);
            wdw_formatData.createFormatButton(formatData, `${aCardLine[0]}.format`);
            let undoData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.undoData`);
            wdw_formatData.createUndoButton(undoData, `${aCardLine[0]}.undo`);
            let cbidData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.cbidData`);
            cardbookHTMLTools.addHTMLLABEL(cbidData, `${aCardLine[0]}.cbid`, aCardLine[1], {class: "hidden"});
            let sourceValueData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.sourceValueData`);
            cardbookHTMLTools.addHTMLLABEL(sourceValueData, `${aCardLine[0]}.sourceValue`, aCardLine[3], {class: "hidden"});
            let indexData = cardbookHTMLTools.addHTMLTD(row, `${aCardLine[0]}.indexData`);
            cardbookHTMLTools.addHTMLLABEL(indexData, `${aCardLine[0]}.index`, aCardLine[5], {class: "hidden"});
        },

		prepareVariables: async function () {
			let win = await messenger.windows.getCurrent();
			wdw_formatData.winId = win.id;
			wdw_formatData.displayId++;
			await messenger.runtime.sendMessage({query: "cardbook.processData.setDisplayId", winId: wdw_formatData.winId, displayId: wdw_formatData.displayId});
			wdw_formatData.rowDone = 0;
			wdw_formatData.toDo = 0;
			wdw_formatData.cardsLoaded = false;
        },

		displayCards: async function (aFields) {
            cardbookHTMLTools.deleteTableRows('fieldsTable');
			wdw_formatData.waitForDisplay();

			await wdw_formatData.prepareVariables();
			await messenger.runtime.sendMessage({query: "cardbook.formatData.getCards", dirPrefId: wdw_formatData.dirPrefId, fields: aFields, winId: wdw_formatData.winId, displayId: wdw_formatData.displayId});
		},
		
		createTextbox: function (aTableData, aId, aValue, aType, aParam) {
            let aTextbox = cardbookHTMLTools.addHTMLINPUT(aTableData, aId, aValue, aParam);
			let validatedValue = "";
			if (aType == "fields") {
				if (aValue) {
					let convertFunction = document.getElementById('convertFuntionMenulist').value;
					validatedValue = cardbookHTMLUtils.convertField(convertFunction, aValue);
				}
			} else {
				validatedValue = wdw_formatData.getNewFormat(aId.replace(/.value$/, ""), aValue, aType, aParam);
			}
			if (validatedValue && aValue == validatedValue) {
				aTextbox.setAttribute("class", "validated");
			}
			async function fireButton(event) {
				let id = this.id.replace(/.value$/, "");
				let valuetype = this.getAttribute('valuetype');
				let validatedValue = "";
				if (valuetype == "fields") {
					let convertFunction = document.getElementById('convertFuntionMenulist').value;
					validatedValue = cardbookHTMLUtils.convertField(convertFunction, this.value);
				} else {
					let country = this.getAttribute('country');
					validatedValue = wdw_formatData.getNewFormat(id, this.value, valuetype, {"country": country});
				}
				if (validatedValue && this.value == validatedValue) {
                    this.setAttribute("class", "validated");
                } else {
                    this.removeAttribute("class");
				}

				let undoButton = document.getElementById(id + '.undo');
                let sourceValue = document.getElementById(id + '.sourceValue');
				if (sourceValue.textContent != this.value) {
					undoButton.disabled = false;
				} else {
					undoButton.disabled = true;
				}

            };
			aTextbox.addEventListener("input", fireButton, false);
            return aTextbox
		},

		createCountryList: function (aTableData, aId, aValue) {
			let aMenulist = cardbookHTMLTools.addHTMLSELECT(aTableData, aId, "");
			let label = "";
			if (aValue) {
				label = messenger.i18n.getMessage("region-name-" + aValue);
			}
            let option = cardbookHTMLTools.addHTMLOPTION(aMenulist, "menulist_option_0", aValue, label, {"selected": true});

			async function clickCountry(event) {
				let menulistValue = this.value;
				cardbookHTMLTools.deleteRows(this.id);
				let option = cardbookHTMLTools.addHTMLOPTION(this, `${this.id}_option_empty`, "", "");
				let i = 0;
				for (let [value, label] of wdw_formatData.countries) {
					let option = cardbookHTMLTools.addHTMLOPTION(this, `${this.id}_option_${i}`, value, label);
					if (value == menulistValue) {
						option.selected = true;
					}
					i++;
				}
			};
			aMenulist.addEventListener("click", clickCountry, false);

			async function changeCountry(event) {
				let textboxId = this.id.replace(".country", ".value");
				document.getElementById(textboxId).setAttribute("country", this.value);
			};
			aMenulist.addEventListener("change", changeCountry, false);
			return aMenulist;
		},

		createConvertFunctionList: async function (aParent) {
			let aMenulist = cardbookHTMLTools.addHTMLSELECT(aParent, 'convertFuntionMenulist', "");
			cardbookHTMLTools.loadConvertionFuntions(aMenulist, "lowercase", false);

			async function changeConvertion(event) {
				let nodes = document.getElementById("fieldsTable").querySelectorAll("tr:not(.hidden)");
				for (let node of nodes) {
					let id = node.id.replace(".row", ".value");
					document.getElementById(id).dispatchEvent(new Event('input'));
				}
			};
			aMenulist.addEventListener("change", changeConvertion, false);

			return aMenulist;
		},

		createFieldsList: async function (aParent) {
			let disabledFields = [ "addressbook", "categories", "fn",  "key", "gender", "bday", "anniversary", "deathdate", "country", "email", "tel", "adr", "impp", "url", "event", "note", "street", "list"];
            let editionFields = await messenger.runtime.sendMessage({query: "cardbook.getEditionFields"});
			editionFields = editionFields.filter(x => !disabledFields.includes(x[2]));

			let aMenulist = cardbookHTMLTools.addHTMLSELECT(aParent, 'fieldMenulist');
			let i = 0;
			for (let editionField of editionFields) {
				let option = cardbookHTMLTools.addHTMLOPTION(aMenulist, `fieldMenulist_option_${i}`, editionField[2], editionField[1]);
				i++;
			}

			async function fireHidingButton(event) {
				let field = "";
				if (document.getElementById('fieldMenulist')) {
					field = document.getElementById('fieldMenulist').value;
				}
				await wdw_formatData.displayCards(field);
			};
			aMenulist.addEventListener("change", fireHidingButton, false);
			return aMenulist;
		},

		createFormatFieldButton: function (aRow, aId) {
			let aButton = cardbookHTMLTools.addHTMLBUTTON(aRow, aId, messenger.i18n.getMessage("formatEditionLabel"));
			async function fireButton(event) {
				let id = this.id.replace(/.format$/, "");
                let textbox = document.getElementById(id + '.value');
                let sourceTextbox = document.getElementById(id + '.sourceValue');
				if (!textbox.value) {
					return
				}

				let convertFunction = document.getElementById('convertFuntionMenulist').value;
				let validatedValue = cardbookHTMLUtils.convertField(convertFunction, textbox.value);
                if (validatedValue) {
                    textbox.value = validatedValue;
                    textbox.setAttribute("class", "validated");
					if (sourceTextbox.textContent == textbox.value) {
						return
					} 
					let undoButton = document.getElementById(id + '.undo');
					undoButton.disabled = false;
                }
             };
			aButton.addEventListener("click", fireButton, false);
			aButton.addEventListener("input", fireButton, false);
            return aButton;
		},

		createFormatButton: function (aRow, aId) {
			let aButton = cardbookHTMLTools.addHTMLBUTTON(aRow, aId, messenger.i18n.getMessage("formatEditionLabel"));
			async function fireButton(event) {
				let id = this.id.replace(/.format$/, "");
                let textbox = document.getElementById(id + '.value');
                let sourceTextbox = document.getElementById(id + '.sourceValue');
				let valuetype = textbox.getAttribute('valuetype');
				let country = textbox.getAttribute('country');
				let validatedValue = wdw_formatData.getNewFormat(id, textbox.value, valuetype, {"country": country});
                if (validatedValue) {
                    textbox.value = validatedValue;
                    textbox.setAttribute("class", "validated");
					if (sourceTextbox.textContent == textbox.value) {
						return
					} 
					let undoButton = document.getElementById(id + '.undo');
					undoButton.disabled = false;
                }
             };
			aButton.addEventListener("click", fireButton, false);
			aButton.addEventListener("input", fireButton, false);
            return aButton;
		},

		createUndoButton: function (aRow, aId) {
			let aButton = cardbookHTMLTools.addHTMLBUTTON(aRow, aId, messenger.i18n.getMessage("cardbookToolbarBackButtonLabel"), {"disabled": "true"});
			async function fireButton(event) {
				let id = this.id.replace(/.undo$/, "");
                let textbox = document.getElementById(id + '.value');
                let sourceTextbox = document.getElementById(id + '.sourceValue');
				if (textbox.value != sourceTextbox.textContent) {
					textbox.value = sourceTextbox.textContent;
					textbox.removeAttribute("class");
					this.disabled = true;
				}
            };
			aButton.addEventListener("click", fireButton, false);
			aButton.addEventListener("input", fireButton, false);
            return aButton;
		},

		actionAll: function (aAction) {
			let nodes = document.getElementById("fieldsTable").querySelectorAll("tr:not(.hidden)");
			for (let node of nodes) {
				let id = node.id.replace(/.row$/, "");
				document.getElementById(id + "." + aAction).dispatchEvent(new Event('input'));
			}
		},

        save: async function () {
			let nodes = document.getElementById("fieldsTable").querySelectorAll("tr:not(.hidden)");
			if (!nodes.length) {
				return
			}
			let valueType = document.getElementById("0.value").getAttribute("valuetype");

			// for field tab
			let field = valueType;
			if (valueType == "fields") {
				field = document.getElementById('fieldMenulist').value;
			}

			wdw_formatData.waitForSave();
			await wdw_formatData.prepareVariables();
			let results = {};
            for (let node of nodes) {
				let id = node.id.replace(/.row$/, "");
				let cbid = document.getElementById(id + ".cbid").textContent;
				let value = document.getElementById(id + ".value").value;
				let sourceValue = document.getElementById(id + ".sourceValue").textContent;
				let index = 0
				if (document.getElementById(id + ".index")) {
					index = document.getElementById(id + ".index").textContent;
				}
				if (value != sourceValue) {
					if (!results[cbid]) {
						wdw_formatData.toDo++;
						results[cbid] = [];
					}
					results[cbid].push([index, value]);
				}
			}
			await messenger.runtime.sendMessage({query: "cardbook.formatData.saveCards", results: results,
												scopeName: wdw_formatData.scopeName, dirPrefId: wdw_formatData.dirPrefId, fields: field, winId: wdw_formatData.winId, displayId: wdw_formatData.displayId});
		},
		
        showLabels: function () {
			for (let node of document.getElementById("cardbookFormatButtonsBox").querySelectorAll("button")) {
				node.disabled = false;
			}
			let nodes = document.getElementById("fieldsTable").querySelectorAll("tr:not(.hidden)");
			if (nodes.length == 0) {
				document.getElementById('noLinesFoundDescVbox').classList.remove("hidden");
				document.getElementById('noLinesFoundDesc').textContent = messenger.i18n.getMessage("noDataAvailable");
				document.getElementById('recordsHbox').classList.add("hidden");
				document.getElementById('numberLinesFoundDesc').classList.add("hidden");
			} else {
				document.getElementById('noLinesFoundDescVbox').classList.add("hidden");
				document.getElementById('numberLinesFoundDesc').textContent = messenger.i18n.getMessage("numberLines", [nodes.length]);
				document.getElementById('numberLinesFoundDesc').classList.remove("hidden");
			}
		},

        showProgressBar: function () {
			document.getElementById('progressBox').classList.remove("hidden");
			document.getElementById('recordsHbox').classList.add("hidden");
			document.getElementById('numberLinesFoundDesc').classList.add("hidden");
		},

        disableButtons: function () {
			document.getElementById('formatAllLabel').disabled =  true;
			document.getElementById('undoAllLabel').disabled =  true;
		},

        endWaitForDisplay: function () {
			document.getElementById('progressBox').classList.add("hidden");
			document.getElementById('recordsHbox').classList.remove("hidden");
			wdw_formatData.showLabels();
		},

        waitForDisplay: function () {
			wdw_formatData.showProgressBar();
			let lTimerDisplay = setInterval( async function() {
				let todo = wdw_formatData.toDo;
				let done = wdw_formatData.rowDone;
				if (done == todo && todo != 0) {
					document.getElementById("data-progressmeter").value = 100;
					wdw_formatData.endWaitForDisplay();
					clearInterval(lTimerDisplay);
				} else if (wdw_formatData.cardsLoaded && todo == 0) {
					wdw_formatData.endWaitForDisplay();
					clearInterval(lTimerDisplay);
				} else if (todo != 0) {
					let value = Math.round(done / todo * 100);
					document.getElementById("data-progressmeter").value = value;
				}
			}, wdw_formatData.resfreshTime);
		},

        endWaitForSave: async function (aTimer) {
			clearInterval(aTimer);
			await wdw_formatData.cancel();
		},

		waitForSave: function () {
			wdw_formatData.disableButtons();
			wdw_formatData.showProgressBar();
			var lTimerSave = setInterval(async function() {
				let todo = wdw_formatData.toDo;
				let done = wdw_formatData.rowDone;
				if (done == todo && todo != 0) {
					document.getElementById("data-progressmeter").value = 100;
					await wdw_formatData.endWaitForSave(lTimerSave);
				} else if (wdw_formatData.cardsLoaded && todo == 0) {
					await wdw_formatData.endWaitForSave(lTimerSave);
				} else if (todo != 0) {
					let value = Math.round(done / todo * 100);
					document.getElementById("data-progressmeter").value = value;
				}
			}, wdw_formatData.resfreshTime);
		},

		load: async function () {
            let urlParams = new URLSearchParams(window.location.search);
            wdw_formatData.dirPrefId = urlParams.get("dirPrefId");
        
			i18n.updateDocument();
			cardbookHTMLRichContext.loadRichContext();
			if (wdw_formatData.dirPrefId) {
				wdw_formatData.scopeName = await cardbookNewPreferences.getName(wdw_formatData.dirPrefId);
			} else {
				wdw_formatData.scopeName = messenger.i18n.getMessage("allAddressBooks");
			}
			document.title = messenger.i18n.getMessage("wdw_formatDataTitle", [wdw_formatData.scopeName]);

            // button
        	document.getElementById("email").addEventListener("click", event => wdw_formatData.setData("email"));
        	document.getElementById("tel").addEventListener("click", event => wdw_formatData.setData("tel"));
        	document.getElementById("fields").addEventListener("click", event => wdw_formatData.setData("fields"));
        	document.getElementById("formatAllLabel").addEventListener("click", event => wdw_formatData.actionAll('format'));
        	document.getElementById("undoAllLabel").addEventListener("click", event => wdw_formatData.actionAll('undo'));
        	document.getElementById("cancelEditionLabel").addEventListener("click", event => wdw_formatData.cancel());
        	document.getElementById("saveEditionLabel").addEventListener("click", event => wdw_formatData.save());

            await wdw_formatData.loadCountries();

			let nodeSelected = document.getElementById("cardbookFormatButtonsBox").querySelectorAll("button[visuallyselected]");
			wdw_formatData.setData(nodeSelected[0].id);
		},

		setData: async function (aButtonId) {
			for (let node of document.getElementById("cardbookFormatButtonsBox").querySelectorAll("button")) {
				if (node.id == aButtonId) {
					document.getElementById(aButtonId).setAttribute("visuallyselected", "true");
				} else {
					node.removeAttribute("visuallyselected");
				}
			}
            cardbookHTMLTools.deleteRows('fieldsBox');
			let fieldsBox = document.getElementById('fieldsBox');
			switch(aButtonId) {
				case "tel":
					fieldsBox.classList.add("hidden");
					await wdw_formatData.displayCards(aButtonId);
					break;
				case "email":
					fieldsBox.classList.add("hidden");
					await wdw_formatData.displayCards(aButtonId);
					break;
				case "fields":
					fieldsBox.classList.remove("hidden");
                    wdw_formatData.allColumns = await messenger.runtime.sendMessage({query: "cardbook.getAllColumns"});
                    wdw_formatData.adrElements = await messenger.runtime.sendMessage({query: "cardbook.getAdrElements"});
                    wdw_formatData.allCustomFields = await cardbookNewPreferences.getAllCustomFields();
					await wdw_formatData.createFieldsList(fieldsBox);
					wdw_formatData.createConvertFunctionList(fieldsBox);
					let field = "";
					if (document.getElementById('fieldMenulist')) {
						field = document.getElementById('fieldMenulist').value;
					}
					await wdw_formatData.displayCards(field);
					break;
				}
		},

		cancel: async function () {
			cardbookHTMLRichContext.closeWindow();
		}

	};

};

messenger.runtime.onMessage.addListener( (info) => {
	switch (info.query) {
		case "cardbook.processData.cardsLoaded":
			if (wdw_formatData.winId == info.winId && wdw_formatData.displayId == info.displayId) {
				wdw_formatData.cardsLoaded = info.cardsLoaded;
			}
			break;
		case "cardbook.processData.toDo":
			if (wdw_formatData.winId == info.winId && wdw_formatData.displayId == info.displayId) {
				wdw_formatData.toDo = info.toDo;
			}
			break;
		case "cardbook.processData.rowDone":
			if (wdw_formatData.winId == info.winId && wdw_formatData.displayId == info.displayId) {
				wdw_formatData.rowDone = info.rowDone;
			}
			break;
		case "cardbook.formatData.displayCardLineTels":
			if (wdw_formatData.winId == info.winId && wdw_formatData.displayId == info.displayId) {
				wdw_formatData.displayCardLineTels(info.record);
			}
			break;
		case "cardbook.formatData.displayCardLineEmail":
			if (wdw_formatData.winId == info.winId && wdw_formatData.displayId == info.displayId) {
				wdw_formatData.displayCardLineEmail(info.record);
			}
			break;
		case "cardbook.formatData.displayCardLineFields":
			if (wdw_formatData.winId == info.winId && wdw_formatData.displayId == info.displayId) {
				wdw_formatData.displayCardLineFields(info.record);
			}
			break;
		}
});

wdw_formatData.load();
