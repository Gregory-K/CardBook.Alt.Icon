import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
import { cardbookHTMLUtils } from "../cardbookHTMLUtils.mjs";
import { cardbookHTMLTypes } from "../cardbookHTMLTypes.mjs";
import { cardbookNewPreferences } from "../preferences/cardbookNewPreferences.mjs";

if ("undefined" == typeof(wdw_mergeCards)) {
	var wdw_mergeCards = {
		arrayField: {},
		version: "",
        hideCreate: false,
		mode: "CONTACT",
		source: "",
        ids: "",
		mergeId: "",
        actionId: 0,
		duplicateWinId: "",
		duplicateDisplayId: "",
        duplicateLineId: "",
        cardsIn: [],
        allColumns: {},
        customFields: {},
        newFields: [],
        multilineFields: [],
            
		setReadOnly: function (aElement, aSelected, aDisabled) {
			if (aSelected) {
				if (aDisabled) {
					aElement.setAttribute('readonly', 'true');
				} else {
					aElement.removeAttribute('readonly');
				}
			} else {
				aElement.setAttribute('readonly', 'true');
			}
        },

        createCheckBox1: function (aRow, aName, aValue) {
            let checkboxData = cardbookHTMLTools.addHTMLTD(aRow, `${aName}.1`);
           	let aCheckbox = cardbookHTMLTools.addHTMLINPUT(checkboxData, aName, null, { "type": "checkbox" });
			aCheckbox.checked = aValue;

            aCheckbox.addEventListener("click", function() {
				let field = this.id.replace(/Checkbox.*/,"");
				let number = this.id.replace(/.*Checkbox/,"");
				if (this.checked) {
					for (let j = 0; j < wdw_mergeCards.cardsIn.length; j++) {
						if (j != number) {
							if (document.getElementById(`${field}Checkbox${j}`)) {
								let aCheckbox = document.getElementById(`${field}Checkbox${j}`);
								aCheckbox.checked = false;
							}
						}
					}
				}
				for (let j = 0; j < wdw_mergeCards.cardsIn.length; j++) {
					if (document.getElementById(`${field}Textbox${j}`)) {
						let aTextbox = document.getElementById(`${field}Textbox${j}`);
						if (j != number) {
							aTextbox.setAttribute('mergeSelected', 'false');
							aTextbox.setAttribute('readonly', 'true');
						} else {
							if (this.checked) {
								aTextbox.setAttribute('mergeSelected', 'true');
								aTextbox.removeAttribute('readonly');
							} else {
								aTextbox.setAttribute('mergeSelected', 'false');
								aTextbox.setAttribute('readonly', 'true');
							}
						}
					}
				}
			}, false);
		},

		createCheckBox2: function (aRow, aName, aValue) {
			let checkboxData = cardbookHTMLTools.addHTMLTD(aRow, `${aName}.1`);
            let aCheckbox = cardbookHTMLTools.addHTMLINPUT(checkboxData, aName, null, { "type": "checkbox" });
			aCheckbox.checked = aValue;

            aCheckbox.addEventListener("click", function() {
				let field = this.id.replace(/Checkbox.*/,"");
				if (document.getElementById(`${field}Textbox0`)) {
					let aTextbox = document.getElementById(`${field}Textbox0`);
					if (this.checked) {
						aTextbox.setAttribute('mergeSelected', 'true');
					} else {
						aTextbox.setAttribute('mergeSelected', 'false');
					}
				}
				if (document.getElementById(field + 'Textbox1')) {
					let aTextbox = document.getElementById(field + 'Textbox1');
					if (this.checked) {
						aTextbox.setAttribute('mergeSelected', 'true');
					} else {
						aTextbox.setAttribute('mergeSelected', 'false');
					}
				}
			}, false);
		},

		createCheckBox3: function (aRow, aName, aValue) {
			let checkboxData = cardbookHTMLTools.addHTMLTD(aRow, `${aName}.1`);
            let aCheckbox = cardbookHTMLTools.addHTMLINPUT(checkboxData, aName, null, { "type": "checkbox" });
			aCheckbox.checked = aValue;

            aCheckbox.addEventListener("click", async function() {
				let field = this.id.replace(/Checkbox.*/,"");
				let number = this.id.replace(/.*Checkbox/,"");
				if (this.checked) {
					for (let j = 0; j < wdw_mergeCards.cardsIn.length; j++) {
						if (j != number) {
							if (document.getElementById(`${field}Checkbox${j}`)) {
								let aCheckbox = document.getElementById(`${field}Checkbox${j}`);
								aCheckbox.checked = false;
							}
						}
					}
				}
				for (let j = 0; j < wdw_mergeCards.cardsIn.length; j++) {
					if (document.getElementById(`${field}Textbox${j}`)) {
						let aTextbox = document.getElementById(`${field}Textbox${j}`);
						if (j != number) {
							aTextbox.setAttribute('mergeSelected', 'false');
							aTextbox.setAttribute('readonly', 'true');
						} else {
							if (this.checked) {
								aTextbox.setAttribute('mergeSelected', 'true');
								aTextbox.removeAttribute('readonly');
							} else {
								aTextbox.setAttribute('mergeSelected', 'false');
								aTextbox.setAttribute('readonly', 'true');
							}
						}
					}
				}
				await wdw_mergeCards.setAddressBookProperties(wdw_mergeCards.cardsIn[number][field]);
			}, false);
		},

		createTextBox: function (aRow, aName, aValue, aSelected, aDisabled, aArrayValue) {
			let textboxData = cardbookHTMLTools.addHTMLTD(aRow, `${aName}.1`);
            let textbox = cardbookHTMLTools.addHTMLINPUT(textboxData, aName, aValue, {"mergeSelected": aSelected});
			if (aArrayValue) {
				let field = aName.replace(/Textbox.*/,"");
				wdw_mergeCards.arrayField[field] = aArrayValue;
			}
            wdw_mergeCards.setReadOnly(textbox, aSelected, aDisabled);
		},

		createMultilineTextBox: function (aRow, aName, aValue, aSelected, aDisabled, aLength) {
			let textboxData = cardbookHTMLTools.addHTMLTD(aRow, `${aName}.1`);
            let textarea = cardbookHTMLTools.addHTMLTEXTAREA(textboxData, aName, aValue, {multiline: "true", rows: aLength, mergeSelected: aSelected});
            wdw_mergeCards.setReadOnly(textarea, aSelected, aDisabled);
		},

		createImageBox: function (aRow, aName, aValue, aExtension, aSelected) {
			let imageData = cardbookHTMLTools.addHTMLTD(aRow, `${aName}.1`);
			let aVbox = wdw_mergeCards.createVbox(imageData, false);
			aVbox.setAttribute("width", "170px");
			let aHbox = wdw_mergeCards.createHbox(aVbox, false);
			aHbox.setAttribute("height", "170px");

            let aImageForSizing = cardbookHTMLTools.addHTMLIMAGE(aHbox, `${aName}ForSizing`, { "class": "hidden" } );
            let aImage = cardbookHTMLTools.addHTMLIMAGE(aHbox, `${aName}Displayed`);
			wdw_mergeCards.arrayField[aName] = {};
			wdw_mergeCards.arrayField[aName].value = aValue;
			wdw_mergeCards.arrayField[aName].extension = aExtension;

			aImage.src = "";
			aImageForSizing.src = "";
			aImageForSizing.addEventListener("load", function() {
				let myImageWidth = 170;
				let myImageHeight = 170;
				let widthFound = 0;
				let heightFound = 0;
				if (this.width >= this.height) {
					widthFound = myImageWidth + "px" ;
					heightFound = Math.round(this.height * myImageWidth / this.width) + "px" ;
				} else {
					widthFound = Math.round(this.width * myImageHeight / this.height) + "px" ;
					heightFound = myImageHeight + "px" ;
				}
				let field = this.id.replace(/ForSizing.*/,"");
				let myImage = document.getElementById(field + "Displayed");
				myImage.setAttribute("width", widthFound);
				myImage.setAttribute("height", heightFound);
				myImage.setAttribute("src", this.src);
			}, false);
			aImageForSizing.src = 'data:image/' + aExtension + ';base64,' + aValue;
		},

		createLabel: function (aRow, aName, aValue) {
			let labelData = cardbookHTMLTools.addHTMLTD(aRow, `${aName}.1`);
            let aLabel = cardbookHTMLTools.addHTMLLABEL(labelData, aName, messenger.i18n.getMessage(aValue));
		},

		createCustomLabel: function (aRow, aName, aValue) {
			let labelData = cardbookHTMLTools.addHTMLTD(aRow, `${aName}.1`);
            let aLabel = cardbookHTMLTools.addHTMLLABEL(labelData, aName, aValue);
		},

		createHbox: function (aParent, aAddTableData) {
			let aHbox ;
			if (aAddTableData && aAddTableData == true) {
				let boxData = cardbookHTMLTools.addHTMLTD(aParent);
				aHbox = cardbookHTMLTools.addHTMLDIV(boxData, null, {"class": "hbox"});
			} else {
				aHbox = cardbookHTMLTools.addHTMLDIV(aParent, null, {"class": "hbox"});
			}
			return aHbox
		},

		createVbox: function (aParent, aAddTableData) {
			let aVbox ;
			if (aAddTableData && aAddTableData == true) {
				let boxData = cardbookHTMLTools.addHTMLTD(aParent);
				aVbox = cardbookHTMLTools.addHTMLDIV(boxData, null, {"class": "vbox"});
			} else {
				aVbox = cardbookHTMLTools.addHTMLDIV(aParent, null, {"class": "vbox"});
			}
			return aVbox
		},

		createAddressbook: async function (aParent, aListOfCards) {
			let dirPrefId = "";
			let multiples = false;
			for (let i = 0; i < aListOfCards.length; i++) {
				if (dirPrefId == "") {
					dirPrefId = aListOfCards[i].dirPrefId;
				} else if (dirPrefId != aListOfCards[i].dirPrefId) {
					multiples = true;
					break;
				}
			}
			if (multiples) {
				let row = cardbookHTMLTools.addHTMLTR(aParent, 'ABNameRow')
				wdw_mergeCards.createLabel(row, 'ABNameLabel', 'ABNameLabel');
				var selected = true;
				for (let j = 0; j < aListOfCards.length; j++) {
					wdw_mergeCards.createCheckBox3(row, `dirPrefIdCheckbox${j}`, selected);
                    let name = await cardbookNewPreferences.getName(aListOfCards[j]['dirPrefId']);
					wdw_mergeCards.createTextBox(row, `dirPrefIdTextbox${j}`, name, selected, true);
					if (selected) {
						await wdw_mergeCards.setAddressBookProperties(aListOfCards[j]['dirPrefId']);
					}
					selected = false;
				}
			} else {
				await wdw_mergeCards.setAddressBookProperties(dirPrefId);
			}
		},

		setAddressBookProperties: async function (aDirPrefId) {
			await wdw_mergeCards.setReadOnlyMode(aDirPrefId);
			await wdw_mergeCards.setVersion(aDirPrefId);
		},

		setReadOnlyMode: async function (aDirPrefId) {
			if (await cardbookNewPreferences.getReadOnly(aDirPrefId)) {
				document.getElementById('viewResultEditionLabel').disabled=true;
				document.getElementById('createEditionLabel').disabled=true;
				document.getElementById('createAndReplaceEditionLabel').disabled=true;
			} else {
				document.getElementById('viewResultEditionLabel').disabled=false;
				document.getElementById('createEditionLabel').disabled=false;
				document.getElementById('createAndReplaceEditionLabel').disabled=false;
			}
		},

		setVersion: async function (aDirPrefId) {
			wdw_mergeCards.version = await cardbookNewPreferences.getVCardVersion(aDirPrefId);
		},

		addRowFromArray: function (aListOfCards, aField) {
			for (let i = 0; i < aListOfCards.length; i++) {
				if (aListOfCards[i][aField]) {
					return true;
				}
			}
			return false;
		},

		addRowCustomFromArray: function (aListOfCards, aField) {
			for (let i = 0; i < aListOfCards.length; i++) {
				for (let j = 0; j < aListOfCards[i].others.length; j++) {
					var othersTempArray = aListOfCards[i].others[j].split(":");
					if (aField == othersTempArray[0]) {
						return true;
					}
				}
			}
			return false;
		},

		addRowFromPhoto: async function (aListOfCards, aField) {
			let result = false;
			for (let card of aListOfCards) {
				if (card[aField].value != "") {
					return true;
				} else {
					let dirname = await cardbookNewPreferences.getName(card.dirPrefId);
					let image = await messenger.runtime.sendMessage({query: "cardbook.getImage", field: aField, dirName: dirname, cardId: card.cbid, cardName: card.fn});
					if (image && image.content && image.extension) {
						return true;
					}
				}
			}
			return result;
		},

		load: async function () {
			let urlParams = new URLSearchParams(window.location.search);
            wdw_mergeCards.hideCreate = (urlParams.get("hideCreate") === "true");
            wdw_mergeCards.source = urlParams.get("source");
            wdw_mergeCards.mode = urlParams.get("mode");
            wdw_mergeCards.ids = urlParams.get("ids");
            wdw_mergeCards.actionId = urlParams.get("actionId");
            wdw_mergeCards.mergeId = urlParams.get("mergeId");
			
            wdw_mergeCards.duplicateWinId = urlParams.get("duplicateWinId");
            wdw_mergeCards.duplicateDisplayId = urlParams.get("duplicateDisplayId");
            wdw_mergeCards.duplicateLineId = urlParams.get("duplicateLineId");
            wdw_mergeCards.cardsIn = await messenger.runtime.sendMessage({query: "cardbook.getCards", cbids: wdw_mergeCards.ids.split(",")});
			i18n.updateDocument();
			cardbookHTMLRichContext.loadRichContext();

            document.getElementById('createEditionLabel').hidden = wdw_mergeCards.hideCreate;
            wdw_mergeCards.allColumns = await messenger.runtime.sendMessage({query: "cardbook.getAllColumns"});
            wdw_mergeCards.customFields = await messenger.runtime.sendMessage({query: "cardbook.getCustomFields"});
            wdw_mergeCards.newFields = await messenger.runtime.sendMessage({query: "cardbook.getNewFields"});
            wdw_mergeCards.multilineFields = await messenger.runtime.sendMessage({query: "cardbook.getMultilineFields"});
    
            // button
        	document.getElementById("viewResultEditionLabel").addEventListener("click", event => wdw_mergeCards.viewResult());
        	document.getElementById("createEditionLabel").addEventListener("click", event => wdw_mergeCards.create());
        	document.getElementById("createAndReplaceEditionLabel").addEventListener("click", event => wdw_mergeCards.createAndReplace());
        	document.getElementById("cancelEditionLabel").addEventListener("click", event => wdw_mergeCards.cancel());

            let listOfCards = wdw_mergeCards.cardsIn;
			let table = document.getElementById('fieldsTable');
			await wdw_mergeCards.createAddressbook(table, listOfCards);
			for (let i of [ 'photo' ]) {
				if (await wdw_mergeCards.addRowFromPhoto(listOfCards, i)) {
                    let aRow = cardbookHTMLTools.addHTMLTR(table, `${i}Row`)
					wdw_mergeCards.createLabel(aRow, `${i}Label`, `${i}Label`);
					let selected = true;
					for (let j = 0; j < listOfCards.length; j++) {
						let dirname = await cardbookNewPreferences.getName(listOfCards[j].dirPrefId);
						if (listOfCards[j][i].value != "") {
							wdw_mergeCards.createCheckBox1(aRow, `${i}Checkbox${j}`, selected);
							wdw_mergeCards.createImageBox(aRow, `${i}Textbox${j}`, listOfCards[j][i].value, listOfCards[j][i].extension, selected, false);
							selected = false;
						} else {
							let image = await messenger.runtime.sendMessage({query: "cardbook.getImage", field: i, dirName: dirname, cardId: listOfCards[j].cbid, cardName: listOfCards[j].fn});
							if (image && image.content && image.extension) {
								wdw_mergeCards.createCheckBox1(aRow, `${i}Checkbox${j}`, selected);
								wdw_mergeCards.createImageBox(aRow, `${i}Textbox${j}`, image.content, image.extension, selected, false);
								selected = false;
							} else {
								wdw_mergeCards.createHbox(aRow, true);
								wdw_mergeCards.createHbox(aRow, true);
							}
						}
					}
				}
			}
			var fields = wdw_mergeCards.allColumns.display.concat(wdw_mergeCards.allColumns.personal);
			fields = fields.concat(wdw_mergeCards.allColumns.org);
			for (let i of fields) {
				if (wdw_mergeCards.addRowFromArray(listOfCards, i)) {
                    let aRow = cardbookHTMLTools.addHTMLTR(table, `${i}Row`)
					wdw_mergeCards.createLabel(aRow, `${i}Label`, `${i}Label`);
					var selected = true;
					for (let j = 0; j < listOfCards.length; j++) {
						if (listOfCards[j][i]) {
							wdw_mergeCards.createCheckBox1(aRow, `${i}Checkbox${j}`, selected);
							wdw_mergeCards.createTextBox(aRow, `${i}Textbox${j}`, listOfCards[j][i], selected, false);
							selected = false;
						} else {
							wdw_mergeCards.createHbox(aRow, true);
							wdw_mergeCards.createHbox(aRow, true);
						}
					}
				}
			}
			for (let i in wdw_mergeCards.customFields) {
				for (let j = 0; j < wdw_mergeCards.customFields[i].length; j++) {
					if (wdw_mergeCards.addRowCustomFromArray(listOfCards, wdw_mergeCards.customFields[i][j][0])) {
						var prefixRow = i + wdw_mergeCards.customFields[i][j][2];
                        let aRow = cardbookHTMLTools.addHTMLTR(table, `${prefixRow}Row`)
						wdw_mergeCards.createCustomLabel(aRow, `${prefixRow}Label`, wdw_mergeCards.customFields[i][j][1]);
						var selected = true;
						for (let k = 0; k < listOfCards.length; k++) {
							let values = await messenger.runtime.sendMessage({query: "cardbook.getCardValueByField", card: listOfCards[k], field: wdw_mergeCards.customFields[i][j][0], includePref: false});
							let customValue = values[0];
							if (customValue) {
								wdw_mergeCards.createCheckBox1(aRow, `${prefixRow}Checkbox${k}`, selected);
								wdw_mergeCards.createTextBox(aRow, `${prefixRow}Textbox${k}`, customValue, selected, false);
								selected = false;
							} else {
								wdw_mergeCards.createHbox(aRow, true);
								wdw_mergeCards.createHbox(aRow, true);
							}
						}
					}
				}
			}
			for (let i of wdw_mergeCards.allColumns.categories) {
				if (wdw_mergeCards.addRowFromArray(listOfCards, i)) {
					var length = 0
					for (let j = 0; j < listOfCards.length; j++) {
						if (length < listOfCards[j][i].length) {
							length = listOfCards[j][i].length;
						}
					}
					var arrayOfValues = [];
					for (let j = 0; j < length; j++) {
                        let aRow = cardbookHTMLTools.addHTMLTR(table, `${i}Row${j}`)
						wdw_mergeCards.createLabel(aRow, `${i}Label${j}`, `${i}Label`);
						for (let k = 0; k < listOfCards.length; k++) {
							if (listOfCards[k][i][j]) {
								arrayOfValues.push(listOfCards[k][i][j]);
								var length1 = arrayOfValues.length;
								arrayOfValues = cardbookHTMLUtils.arrayUnique(arrayOfValues);
								var length2 = arrayOfValues.length;
								if (length1 != length2) {
									var selected = false;
								} else {
									var selected = true;
								}
								wdw_mergeCards.createCheckBox2(aRow, `${i}_${j}_${k}_Checkbox0`, selected);
								wdw_mergeCards.createTextBox(aRow, `${i}_${j}_${k}_Textbox0`, listOfCards[k][i][j], selected, true, listOfCards[k][i][j]);
							} else {
								wdw_mergeCards.createHbox(aRow, true);
								wdw_mergeCards.createHbox(aRow, true);
							}
						}
					}
				}
			}
			if (wdw_mergeCards.mode == "CONTACT") {
				for (let i of wdw_mergeCards.multilineFields) {
					if (wdw_mergeCards.addRowFromArray(listOfCards, i)) {
						var length = 0
						for (let j = 0; j < listOfCards.length; j++) {
							if (length < listOfCards[j][i].length) {
								length = listOfCards[j][i].length;
							}
						}
						var arrayOfValues = [];
						for (let j = 0; j < length; j++) {
                            let aRow = cardbookHTMLTools.addHTMLTR(table, `${i}Row${j}`)
							wdw_mergeCards.createLabel(aRow, `${i}Label${j}`, `${i}Label`);
							for (let k = 0; k < listOfCards.length; k++) {
								if (listOfCards[k][i][j]) {
									if (i == "tel") {
										arrayOfValues.push(cardbookHTMLUtils.formatTelForSearching(listOfCards[k][i][j][0][0]));
									} else {
										arrayOfValues.push(listOfCards[k][i][j][0].join(","));
									}
									var length1 = arrayOfValues.length;
									arrayOfValues = cardbookHTMLUtils.arrayUnique(arrayOfValues);
									var length2 = arrayOfValues.length;
									if (length1 != length2) {
										var selected = false;
									} else {
										var selected = true;
									}
									wdw_mergeCards.createCheckBox2(aRow, `${i}_${j}_${k}_Checkbox0`, selected);
									var aHbox = wdw_mergeCards.createHbox(aRow, true);
									
									var aCardValue = listOfCards[k][i][j][0];
									var aInputTypes = listOfCards[k][i][j][1];
									var aPgType = listOfCards[k][i][j][3];
									var aPgName = listOfCards[k][i][j][2];
									var myInputTypes = [];
									myInputTypes = cardbookHTMLUtils.getOnlyTypesFromTypes(aInputTypes);

                                    let aPrefImage = cardbookHTMLTools.addHTMLIMAGE(aHbox, `${i}_${j}_${k}_PrefImage`);
									if (cardbookHTMLUtils.getPrefBooleanFromTypes(aInputTypes)) {
										aPrefImage.setAttribute('class', 'cardbookPrefStarClass');
										aPrefImage.setAttribute('haspref', 'true');
									} else {
										aPrefImage.setAttribute('class', 'cardbookNoPrefStarClass');
										aPrefImage.removeAttribute('haspref');
									}
									var myDisplayedTypes = [];
									if (aPgType.length != 0 && aPgName != "") {
										let found = false;
										for (let l = 0; l < aPgType.length; l++) {
											let tmpArray = aPgType[l].split(":");
											if (tmpArray[0] == "X-ABLABEL") {
												myDisplayedTypes.push(tmpArray[1]);
												found = true;
												break;
											}
										}
										if (!found) {
											myDisplayedTypes.push(await cardbookHTMLTypes.whichLabelTypeShouldBeChecked(i, listOfCards[k].dirPrefId, myInputTypes));
										}
									} else {
										myDisplayedTypes.push(await cardbookHTMLTypes.whichLabelTypeShouldBeChecked(i, listOfCards[k].dirPrefId, myInputTypes));
									}
									if (i == "impp") {
										var serviceCode = cardbookHTMLTypes.getIMPPCode(aInputTypes);
										var serviceProtocol = cardbookHTMLTypes.getIMPPProtocol(aCardValue);
										var myValue = aCardValue.join(" ");
										if (serviceCode != "") {
											var serviceLine = [];
											serviceLine = await cardbookHTMLTypes.getIMPPLineForCode(serviceCode)
											if (serviceLine[0]) {
												myDisplayedTypes = myDisplayedTypes.concat(serviceLine[1]);
												wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox0`, cardbookHTMLUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
												var myRegexp = new RegExp("^" + serviceLine[2] + ":");
												myValue = myValue.replace(myRegexp, "");
												wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox1`, myValue, selected, true, listOfCards[k][i][j]);
											} else {
												myDisplayedTypes = myDisplayedTypes.concat(serviceCode);
												wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox0`, cardbookHTMLUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
												wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox1`, myValue, selected, true, listOfCards[k][i][j]);
											}
										} else if (serviceProtocol != "") {
											var serviceLine = [];
											serviceLine = await cardbookHTMLTypes.getIMPPLineForProtocol(serviceProtocol)
											if (serviceLine[0]) {
												myDisplayedTypes = myDisplayedTypes.concat(serviceLine[1]);
												wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox0`, cardbookHTMLUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
												var myRegexp = new RegExp("^" + serviceLine[2] + ":");
												myValue = myValue.replace(myRegexp, "");
												wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox1`, myValue, selected, true, listOfCards[k][i][j]);
											} else {
												myDisplayedTypes = myDisplayedTypes.concat(serviceCode);
												wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox0`, cardbookHTMLUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
												wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox1`, myValue, selected, true, listOfCards[k][i][j]);
											}
										} else {
											wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox0`, cardbookHTMLUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
											wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox1`, myValue, selected, true, listOfCards[k][i][j]);
										}
									} else {
										wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox0`, cardbookHTMLUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
										if (i == "adr") {
											var re = /[\n\u0085\u2028\u2029]|\r\n?/;
                                            var myAdrResult = await messenger.runtime.sendMessage({query: "cardbook.formatAddress", address: aCardValue});
											var myAdrResultArray = myAdrResult.split(re);
											wdw_mergeCards.createMultilineTextBox(aHbox, `${i}_${j}_${k}_Textbox1`, myAdrResult, selected, true, myAdrResultArray.length);
										} else {
											wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox1`, cardbookHTMLUtils.cleanArray(aCardValue).join(" "), selected, true);
										}
									}
								} else {
									wdw_mergeCards.createHbox(aRow, true);
									wdw_mergeCards.createHbox(aRow, true);
								}
							}
						}
					}
				}
				for (let i of [ 'event' ]) {
					var length = 0
					var arrayOfValues = [];
					var processedValues = [];
					for (let card of listOfCards) {
						var myEvents = cardbookHTMLUtils.getEventsFromCard(card.note.split("\n"), card.others);
						if (length < myEvents.result.length) {
							length = myEvents.result.length;
						}
						arrayOfValues.push(myEvents.result);
					}
					for (let j = 0; j < length; j++) {
                        let aRow = cardbookHTMLTools.addHTMLTR(table, `${i}Row${j}`)
						wdw_mergeCards.createLabel(aRow, `${i}Label${j}`, `${i}Label`);
						for (let k = 0; k < listOfCards.length; k++) {
							if (arrayOfValues[k][j]) {
								processedValues.push(arrayOfValues[k][j].join(","));
								var length1 = processedValues.length;
								processedValues = cardbookHTMLUtils.arrayUnique(processedValues);
								var length2 = processedValues.length;
								if (length1 != length2) {
									var selected = false;
								} else {
									var selected = true;
								}
								wdw_mergeCards.createCheckBox2(aRow, `${i}_${j}_${k}_Checkbox0`, selected);
								var aHbox = wdw_mergeCards.createHbox(aRow, true);
                                let aPrefImage = cardbookHTMLTools.addHTMLIMAGE(aHbox, `${i}_${j}_${k}_PrefImage`);
								if (arrayOfValues[k][j][2] && cardbookHTMLUtils.getPrefBooleanFromTypes(arrayOfValues[k][j][2].split(";"))) {
									aPrefImage.setAttribute('class', 'cardbookPrefStarClass');
									aPrefImage.setAttribute('haspref', 'true');
								} else {
									aPrefImage.setAttribute('class', 'cardbookNoPrefStarClass');
									aPrefImage.removeAttribute('haspref');
								}
								wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox0`, arrayOfValues[k][j][0], selected, true);
								wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox1`, arrayOfValues[k][j][1], selected, true);
							} else {
								wdw_mergeCards.createHbox(aRow, true);
								wdw_mergeCards.createHbox(aRow, true);
							}
						}
					}
				}
			} else {
				for (let i of [ 'email' ]) {
					var length = 0
					var arrayOfValues = [];
					var processedValues = [];
					for (let card of listOfCards) {
						let members = await messenger.runtime.sendMessage({query: "cardbook.getMembersFromCard", card: card});
						var myMails = members.mails;
						if (length < myMails.length) {
							length = myMails.length;
						}
						arrayOfValues.push(myMails);
					}
					for (let j = 0; j < length; j++) {
                        let aRow = cardbookHTMLTools.addHTMLTR(table, `${i}Row${j}`)
						wdw_mergeCards.createLabel(aRow, `${i}Label${j}`, `${i}Label`);
						for (let k = 0; k < listOfCards.length; k++) {
							if (arrayOfValues[k][j]) {
								processedValues.push(arrayOfValues[k][j]);
								var length1 = processedValues.length;
								processedValues = cardbookHTMLUtils.arrayUnique(processedValues);
								var length2 = processedValues.length;
								if (length1 != length2) {
									var selected = false;
								} else {
									var selected = true;
								}
								wdw_mergeCards.createCheckBox2(aRow, `${i}_${j}_${k}_Checkbox0`, selected);
								var aHbox = wdw_mergeCards.createHbox(aRow);
								wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox0`, arrayOfValues[k][j], selected, true);
							} else {
								wdw_mergeCards.createHbox(aRow, true);
								wdw_mergeCards.createHbox(aRow, true);
							}
						}
					}
				}
				for (let i of [ 'contact' ]) {
					var length = 0
					var arrayOfValues = [];
					var processedValues = [];
					for (let card of listOfCards) {
						let members = await messenger.runtime.sendMessage({query: "cardbook.getMembersFromCard", card: card});
						var myContacts = members.uids;
						if (length < myContacts.length) {
							length = myContacts.length;
						}
						arrayOfValues.push(myContacts);
					}
					for (let j = 0; j < length; j++) {
                        let aRow = cardbookHTMLTools.addHTMLTR(table, `${i}Row${j}`)
						wdw_mergeCards.createLabel(aRow, `${i}Label${j}`, `${i}Label`);
						for (let k = 0; k < listOfCards.length; k++) {
							if (arrayOfValues[k][j]) {
								processedValues.push(arrayOfValues[k][j].cbid);
								var length1 = processedValues.length;
								processedValues = cardbookHTMLUtils.arrayUnique(processedValues);
								var length2 = processedValues.length;
								if (length1 != length2) {
									var selected = false;
								} else {
									var selected = true;
								}
								wdw_mergeCards.createCheckBox2(aRow, `${i}_${j}_${k}_Checkbox0`, selected);
								var aHbox = wdw_mergeCards.createHbox(aRow);
								wdw_mergeCards.createTextBox(aHbox, `${i}_${j}_${k}_Textbox0`, arrayOfValues[k][j].fn, selected, true);
							} else {
								wdw_mergeCards.createHbox(aRow, true);
								wdw_mergeCards.createHbox(aRow, true);
							}
						}
					}
				}
			}
			for (let i of wdw_mergeCards.allColumns.note) {
				if (wdw_mergeCards.addRowFromArray(listOfCards, i)) {
                    let aRow = cardbookHTMLTools.addHTMLTR(table, 'noteRow')
					wdw_mergeCards.createLabel(aRow, `${i}Label`, `${i}Label`);
					var selected = true;
					for (let j = 0; j < listOfCards.length; j++) {
						if (listOfCards[j][i]) {
							wdw_mergeCards.createCheckBox1(aRow, `${i}Checkbox${j}`, selected);
							var re = /[\n\u0085\u2028\u2029]|\r\n?/;
							var myNoteResultArray = listOfCards[j][i].split(re);
							wdw_mergeCards.createMultilineTextBox(aRow, `${i}Textbox${j}`, listOfCards[j][i], selected, true, myNoteResultArray.length);
							selected = false;
						} else {
							wdw_mergeCards.createHbox(aRow, true);
							wdw_mergeCards.createHbox(aRow, true);
						}
					}
				}
			}
		},

		calculateResult: async function (aCard) {
			let listOfCards = wdw_mergeCards.cardsIn;
			aCard.etag = "0";
			aCard.version = wdw_mergeCards.version;
			aCard.dirPrefId = listOfCards[0].dirPrefId;
			for (let i of [ 'dirPrefId' ]) {
				for (let j = 0; j < listOfCards.length; j++) {
					if (document.getElementById(`${i}Checkbox${j}`)) {
						var myCheckBox = document.getElementById(`${i}Checkbox${j}`);
						if (myCheckBox.checked) {
							aCard[i] = listOfCards[j][i];
						}
					}
				}
			}
			var fields = wdw_mergeCards.allColumns.display.concat(wdw_mergeCards.allColumns.personal);
			fields = fields.concat(wdw_mergeCards.allColumns.org);
			fields = fields.concat(wdw_mergeCards.allColumns.note);
			for (let i of fields) {
				for (let j = 0; j < listOfCards.length; j++) {
					if ((wdw_mergeCards.version == "4.0" && wdw_mergeCards.newFields.includes(i)) || (!wdw_mergeCards.newFields.includes(i))){
						if (document.getElementById(`${i}Checkbox${j}`)) {
							var myCheckBox = document.getElementById(`${i}Checkbox${j}`);
							if (myCheckBox.checked) {
								aCard[i] = document.getElementById(`${i}Textbox${j}`).value;
							}
						}
					}
				}
			}
			for (let i in wdw_mergeCards.customFields) {
				for (let j = 0; j < wdw_mergeCards.customFields[i].length; j++) {
					var prefixRow = i + wdw_mergeCards.customFields[i][j][2];
					for (let k = 0; k < listOfCards.length; k++) {
						if (document.getElementById(`${prefixRow}Checkbox${k}`)) {
							var myCheckBox = document.getElementById(`${prefixRow}Checkbox${k}`);
							if (myCheckBox.checked) {
								aCard.others.push(wdw_mergeCards.customFields[i][j][0] + ":" + document.getElementById(`${prefixRow}Textbox${k}`).value);
							}
						}
					}
				}
			}
			if (wdw_mergeCards.mode == "CONTACT") {
				var multilineFields = wdw_mergeCards.multilineFields.concat(wdw_mergeCards.allColumns.categories);
				for (let i of multilineFields) {
					var length = 0
					for (let j = 0; j < listOfCards.length; j++) {
						if (length < listOfCards[j][i].length) {
							length = listOfCards[j][i].length;
						}
					}
					for (let j = 0; j < length; j++) {
						for (let k = 0; k < listOfCards.length; k++) {
							if (document.getElementById(`${i}_${j}_${k}_Checkbox0`)) {
								var myCheckBox = document.getElementById(`${i}_${j}_${k}_Checkbox0`);
								if (myCheckBox.checked) {
									aCard[i].push(listOfCards[k][i][j]);
								}
							}
						}
					}
					aCard[i] = cardbookHTMLUtils.arrayUnique(aCard[i]);
				}
				var dateFormat = await cardbookHTMLUtils.getDateFormat(aCard.dirPrefId, aCard.version);
				for (let i of [ 'event' ]) {
					var length = 0
					var arrayOfValues = [];
					for (let card of listOfCards) {
						var myEvents = cardbookHTMLUtils.getEventsFromCard(card.note.split("\n"), card.others);
						if (length < myEvents.result.length) {
							length = myEvents.result.length;
						}
						arrayOfValues.push(myEvents.result);
					}
					for (let j = 0; j < length; j++) {
						for (let k = 0; k < listOfCards.length; k++) {
							if (document.getElementById(`${i}_${j}_${k}_Checkbox0`)) {
								var myCheckBox = document.getElementById(`${i}_${j}_${k}_Checkbox0`);
								if (myCheckBox.checked) {
									var myPGNextNumber = cardbookHTMLUtils.rebuildAllPGs(aCard);
									cardbookHTMLUtils.addEventstoCard(aCard, [arrayOfValues[k][j]], myPGNextNumber, dateFormat);
								}
							}
						}
					}
				}
			} else {
				aCard.isAList = true;
				var multilineFields = wdw_mergeCards.allColumns.categories;
				for (let i of multilineFields) {
					var length = 0
					for (let j = 0; j < listOfCards.length; j++) {
						if (length < listOfCards[j][i].length) {
							length = listOfCards[j][i].length;
						}
					}
					for (let j = 0; j < length; j++) {
						for (let k = 0; k < listOfCards.length; k++) {
							if (document.getElementById(`${i}_${j}_${k}_Checkbox0`)) {
								var myCheckBox = document.getElementById(`${i}_${j}_${k}_Checkbox0`);
								if (myCheckBox.checked) {
									aCard[i].push(listOfCards[k][i][j]);
								}
							}
						}
					}
					aCard[i] = cardbookHTMLUtils.arrayUnique(aCard[i]);
				}
				let myMembers = [];
				for (let i of [ 'email' ]) {
					var length = 0
					var arrayOfValues = [];
					for (let card of listOfCards) {
						let members = await messenger.runtime.sendMessage({query: "cardbook.getMembersFromCard", card: card});
						var myMails = members.mails;
						if (length < myMails.length) {
							length = myMails.length;
						}
						arrayOfValues.push(myMails);
					}
					for (let j = 0; j < length; j++) {
						for (let k = 0; k < listOfCards.length; k++) {
							if (document.getElementById(`${i}_${j}_${k}_Checkbox0`)) {
								var myCheckBox = document.getElementById(`${i}_${j}_${k}_Checkbox0`);
								if (myCheckBox.checked) {
									myMembers.push("mailto:" + arrayOfValues[k][j]);
								}
							}
						}
					}
				}
				for (let i of [ 'contact' ]) {
					var length = 0
					var arrayOfValues = [];
					for (let card of listOfCards) {
						let members = await messenger.runtime.sendMessage({query: "cardbook.getMembersFromCard", card: card});
						var myContacts = members.uids;
						if (length < myContacts.length) {
							length = myContacts.length;
						}
						arrayOfValues.push(myContacts);
					}
					for (let j = 0; j < length; j++) {
						for (let k = 0; k < listOfCards.length; k++) {
							if (document.getElementById(`${i}_${j}_${k}_Checkbox0`)) {
								var myCheckBox = document.getElementById(`${i}_${j}_${k}_Checkbox0`);
								if (myCheckBox.checked) {
									myMembers.push("urn:uuid:" + arrayOfValues[k][j].uid);
								}
							}
						}
					}
				}
				await cardbookHTMLUtils.addMemberstoCard(aCard, myMembers);
			}
			for (let i of [ 'photo' ]) {
				for (let j = 0; j < listOfCards.length; j++) {
					if (document.getElementById(`${i}Checkbox${j}`)) {
						var myCheckBox = document.getElementById(`${i}Checkbox${j}`);
						if (myCheckBox.checked) {
							aCard[i].value = wdw_mergeCards.arrayField[`${i}Textbox${j}`].value;
							aCard[i].extension = wdw_mergeCards.arrayField[`${i}Textbox${j}`].extension;
						}
					}
				}
			}
		},

		viewResult: async function () {
			var myOutCard = await messenger.runtime.sendMessage({query: "cardbook.getCardParser"});
			await wdw_mergeCards.calculateResult(myOutCard);
			await messenger.runtime.sendMessage({query: "cardbook.mergeCards.viewCardResult", source: wdw_mergeCards.source, ids: wdw_mergeCards.ids, duplicateWinId: wdw_mergeCards.duplicateWinId, duplicateDisplayId: wdw_mergeCards.duplicateDisplayId, duplicateLineId: wdw_mergeCards.duplicateLineId, actionId: wdw_mergeCards.actionId, card: myOutCard, hideCreate: wdw_mergeCards.hideCreate});
		},

		create: async function () {
			await wdw_mergeCards.save("CREATE");
		},

		createAndReplace: async function () {
			await wdw_mergeCards.save("CREATEANDREPLACE");
		},

		cancel: async function () {
			await wdw_mergeCards.save("CANCEL");
		},

		save: async function (aAction) {
			var myOutCard = await messenger.runtime.sendMessage({query: "cardbook.getCardParser"});
			await wdw_mergeCards.calculateResult(myOutCard);
			await messenger.runtime.sendMessage({query: "cardbook.mergeCards.mergeFinished", source: wdw_mergeCards.source,
								ids: wdw_mergeCards.ids, duplicateWinId: wdw_mergeCards.duplicateWinId,
								duplicateDisplayId: wdw_mergeCards.duplicateDisplayId,
								duplicateLineId: wdw_mergeCards.duplicateLineId, action: aAction, actionId: wdw_mergeCards.actionId,
								cardOut: myOutCard, mergeId: wdw_mergeCards.mergeId});
			cardbookHTMLRichContext.closeWindow();
		}
	};
};

messenger.runtime.onMessage.addListener( (info) => {
	switch (info.query) {
		case "cardbook.mergeCards.closeViewCardResult":
			if (wdw_mergeCards.ids == info.ids) {
				let promise = new Promise( async (resolve, reject) => {
					await messenger.runtime.sendMessage({query: "cardbook.mergeCards.mergeFinished", source: wdw_mergeCards.source,
										ids: info.ids, duplicateWinId: wdw_mergeCards.duplicateWinId,
										duplicateDisplayId: wdw_mergeCards.duplicateDisplayId,
										duplicateLineId: wdw_mergeCards.duplicateLineId, action: info.action, actionId: info.actionId,
										cardOut: info.cardOut, mergeId: wdw_mergeCards.mergeId});
					resolve();
				});
				promise.then(e => {
					cardbookHTMLRichContext.closeWindow();
				});
			}
			break;
		}
});

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

// run when clicking on the cross button or with the escape key
// Big issue here : 
// does not guarantee its full execution. 
// After the first await is hit, the event is considered "done" and the window may close.
// should be fixed when the migration process to html will be complete
window.addEventListener("beforeunload", async function() {
	let aAction = "CANCEL";
	let myOutCard = await messenger.runtime.sendMessage({query: "cardbook.getCardParser"});
	await wdw_mergeCards.calculateResult(myOutCard);
	await messenger.runtime.sendMessage({query: "cardbook.mergeCards.mergeFinished", source: wdw_mergeCards.source, 
						ids: wdw_mergeCards.ids, duplicateWinId: wdw_mergeCards.duplicateWinId,
						duplicateDisplayId: wdw_mergeCards.duplicateDisplayId, duplicateLineId: wdw_mergeCards.duplicateLineId,
						action: aAction, actionId: wdw_mergeCards.actionId, cardOut: myOutCard,
						mergeId: wdw_mergeCards.mergeId});
});

await wdw_mergeCards.load();
