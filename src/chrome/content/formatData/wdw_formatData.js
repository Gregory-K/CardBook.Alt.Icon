if ("undefined" == typeof(wdw_formatData)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	XPCOMUtils.defineLazyModuleGetter(this, "PhoneNumber", "chrome://cardbook/content/formautofill/phonenumberutils/PhoneNumber.jsm");

	var wdw_formatData = {
		
        countries: [],
		resfreshTime: 200,
		toDo: 0,
		rowDone: 0,
		lines: 0,
		scopeName: "",
		cardsLoaded: false,
		abort: false,

		loadCountries: async function () {
			const loc = new Localization(["toolkit/intl/regionNames.ftl"]);
			for (let code of cardbookRepository.countriesList) {
				let country = await loc.formatValue("region-name-" + code);
				wdw_formatData.countries.push([code, country]);
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(wdw_formatData.countries,1,1);
		},

		getNewFormat: function (aId, aValue, aType, aParam) {
			switch(aType) {
				case "tel":
					let country = "";
					if (aParam && aParam.country) {
						country = aParam.country;
					} else {
						country = document.getElementById(aId + '.country.menulist').value;
					}
					let newTel = PhoneNumber.Parse(aValue, country);
					if (newTel && newTel.internationalFormat) {
						return newTel.internationalFormat;
					}
					break;
				case "email":
					var atPos = aValue.lastIndexOf("@");
					if (atPos > 0 && atPos + 1 < aValue.length) {
						return aValue.toLowerCase();
					}
					break;
			}
        },

		displayCardLineTels: async function (aCardLine) {
            // [index, aCard.cbid, aCard.fn, country, tel source, tel modified, index tel line]
			let table = document.getElementById('fieldsTable');
			let row = cardbookElementTools.addHTMLTR(table, `${aCardLine[0]}.row`, {"align": "center", "class": "rowCount"});
            let fnData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.fnData`);
            wdw_formatData.createLabel(fnData, `${aCardLine[0]}.fn`, aCardLine[2]);
            let valueData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.valueData`);
            wdw_formatData.createTextbox(valueData, `${aCardLine[0]}.value`, aCardLine[5], 'tel', {country: aCardLine[3]});
            let countryData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.countryData`);
            await wdw_formatData.createCountryList(countryData, `${aCardLine[0]}.country`, aCardLine[3]);
            let formatData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.formatData`);
            wdw_formatData.createFormatButton(formatData, `${aCardLine[0]}.format`);
            let undoData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.undoData`);
            wdw_formatData.createUndoButton(undoData, `${aCardLine[0]}.undo`);
            let cbidData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.cbidData`);
            wdw_formatData.createHiddenLabel(cbidData, `${aCardLine[0]}.cbid`, aCardLine[1]);
            let sourceValueData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.sourceValueData`);
            wdw_formatData.createHiddenLabel(sourceValueData, `${aCardLine[0]}.sourceValue`, aCardLine[4]);
            let indexData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.indexData`);
            wdw_formatData.createHiddenLabel(indexData, `${aCardLine[0]}.index`, aCardLine[6]);
        },

		loadCardTels: async function (aCard) {
			let country = await cardbookRepository.cardbookUtils.getCardRegion(aCard);
            let i = 0;
            for (let telLine of aCard.tel) {
				if (wdw_formatData.abort) {
					return
				}
				await wdw_formatData.displayCardLineTels([wdw_formatData.lines, aCard.cbid, aCard.fn, country.toLowerCase(), telLine[0][0], telLine[0][0], i]);
				wdw_formatData.lines++;
				i++;
		    }
			wdw_formatData.rowDone++;
        },

		displayCardLineEmail: function (aCardLine) {
            // [index, aCard.cbid, aCard.fn, email source, email modified, index email line]
			let table = document.getElementById('fieldsTable');
			let row = cardbookElementTools.addHTMLTR(table, `${aCardLine[0]}.row`, {"align": "center", "class": "rowCount"});
            let fnData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.fnData`);
            wdw_formatData.createLabel(fnData, `${aCardLine[0]}.fn`, aCardLine[2]);
            let valueData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.valueData`);
            wdw_formatData.createTextbox(valueData, `${aCardLine[0]}.value`, aCardLine[4], 'email');
            let formatData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.formatData`);
            wdw_formatData.createFormatButton(formatData, `${aCardLine[0]}.format`);
            let undoData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.undoData`);
            wdw_formatData.createUndoButton(undoData, `${aCardLine[0]}.undo`);
            let cbidData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.cbidData`);
            wdw_formatData.createHiddenLabel(cbidData, `${aCardLine[0]}.cbid`, aCardLine[1]);
            let sourceValueData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.sourceValueData`);
            wdw_formatData.createHiddenLabel(sourceValueData, `${aCardLine[0]}.sourceValue`, aCardLine[3]);
            let indexData = cardbookElementTools.addHTMLTD(row, `${aCardLine[0]}.indexData`);
            wdw_formatData.createHiddenLabel(indexData, `${aCardLine[0]}.index`, aCardLine[5]);
        },

		loadCardEmails: async function (aCard) {
			let i = 0;
			for (let emailLine of aCard.email) {
				if (wdw_formatData.abort) {
					return
				}
				wdw_formatData.displayCardLineEmail([wdw_formatData.lines, aCard.cbid, aCard.fn, emailLine[0][0], emailLine[0][0], i]);
				wdw_formatData.lines++;
				i++;
		    }
			wdw_formatData.rowDone++;
		},

		prepareVariables: function () {
			wdw_formatData.rowDone = 0;
			wdw_formatData.lines = 0;
			wdw_formatData.toDo = 0;
			wdw_formatData.cardsLoaded = false;
        },

		displayCards: function (aDirPrefId, aLoadFunction) {
            cardbookElementTools.deleteTableRows('fieldsTable');
			wdw_formatData.waitForDisplay();

			wdw_formatData.prepareVariables();
			Services.tm.currentThread.dispatch({ run: function() {
				if (aDirPrefId) {
					let data = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[aDirPrefId].cards));
					wdw_formatData.toDo = data.length;
					for (let card of data) {
						Services.tm.currentThread.dispatch({ run: async function() {
							if (wdw_formatData.abort) {
								return
							}
							await aLoadFunction(card);
						}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
					}
					data = null;
				} else {
					let data = JSON.parse(JSON.stringify(cardbookRepository.cardbookCards));
					for (let i in data) {
						wdw_formatData.toDo++;
					}
					for (let i in data) {
						Services.tm.currentThread.dispatch({ run: async function() {
							if (wdw_formatData.abort) {
								return
							}
							let card = data[i];
							await aLoadFunction(card);
						}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
					}
					data = null;
				}
				wdw_formatData.cardsLoaded = true;
			}}, Components.interfaces.nsIEventTarget.DISPATCH_NORMAL);
		},
		
		createTextbox: function (aTableData, aId, aValue, aType, aParam) {
			let aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aTableData.appendChild(aTextbox);
			aTextbox.setAttribute('id', aId);
			aTextbox.setAttribute('value', aValue);
			aTextbox.setAttribute('valuetype', aType);
			let validatedValue = wdw_formatData.getNewFormat(aId.replace(/.value$/, ""), aValue, aType, aParam);
			if (validatedValue && aValue == validatedValue) {
				aTextbox.setAttribute("class", "validated");
			}
			async function fireButton(event) {
				let id = this.id.replace(/.value$/, "");
				let valuetype = this.getAttribute('valuetype');
				let validatedValue = wdw_formatData.getNewFormat(id, this.value, valuetype);
                if (validatedValue && this.value == validatedValue) {
                    this.setAttribute("class", "validated");
                } else {
                    this.removeAttribute("class");
				}

				let undoButton = document.getElementById(id + '.undo');
                let sourceValue = document.getElementById(id + '.sourceValue');
				if (sourceValue.value != this.value) {
					undoButton.removeAttribute('disabled');
				} else {
					undoButton.setAttribute('disabled', 'true');
				}

            };
			aTextbox.addEventListener("input", fireButton, false);
            return aTextbox
		},

        createLabel: function (aParent, aId, aValue) {
			let aLabel = document.createXULElement('label');
			aParent.appendChild(aLabel);
			aLabel.setAttribute('id', aId);
			aLabel.setAttribute('value', aValue);
            return aLabel;
		},

        createHiddenLabel: function (aParent, aId, aValue) {
			let aLabel = wdw_formatData.createLabel(aParent, aId, aValue);
			aLabel.setAttribute('hidden', 'true');
            return aLabel;
		},

		createCountryList: async function (aTableData, aId, aValue) {
			let aMenulist = document.createXULElement('menulist');
			aTableData.appendChild(aMenulist);
			aMenulist.setAttribute('id', aId + '.menulist');
			aMenulist.setAttribute('sizetopopup', 'none');
			let aMenupopup = document.createXULElement('menupopup');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.setAttribute('id', aId + '.menupopup');

			const loc = new Localization(["toolkit/intl/regionNames.ftl"]);
			let value = await loc.formatValue("region-name-" + aValue);
			let menuItem = aMenulist.appendItem(value, aValue);
			aMenupopup.appendChild(menuItem);
			aMenulist.selectedIndex = 0;

			async function fireButton(event) {
				let menulist = document.getElementById(this.id.replace(/.menupopup$/, ".menulist"));
				let value = menulist.value;
				cardbookElementTools.deleteRows(this.id);
				let j = 0;
				var menuItemBlank = document.createXULElement("menuitem");
				menuItemBlank.setAttribute("label", "");
				menuItemBlank.setAttribute("value", "");
				this.appendChild(menuItemBlank);
				j++;
				let found = false;
				for (let i = 0; i < wdw_formatData.countries.length; i++) {
					var menuItem = document.createXULElement("menuitem");
					menuItem.setAttribute("label", wdw_formatData.countries[i][1]);
					menuItem.setAttribute("value", wdw_formatData.countries[i][0]);
					this.appendChild(menuItem);
					if (!found && value != "" && wdw_formatData.countries[i][0] == value) {
						defaultIndex=j;
						found=true;
					}
					j++;
				}
				if (found) {
					menulist.selectedIndex = defaultIndex;
				}
			};
			aMenupopup.addEventListener("popupshowing", fireButton, false);
            return aMenulist;
		},

		createFormatButton: function (aRow, aId) {
			let aButton = document.createXULElement('button');
			aRow.appendChild(aButton);
			aButton.setAttribute('id', aId);
			aButton.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("formatEditionLabel"));
			aButton.setAttribute('flex', '1');
			async function fireButton(event) {
				let id = this.id.replace(/.format$/, "");
                let textbox = document.getElementById(id + '.value');
                let sourceTextbox = document.getElementById(id + '.sourceValue');
				if (sourceTextbox.value != textbox.value) {
					return
				}

				let valuetype = textbox.getAttribute('valuetype');
				let validatedValue = wdw_formatData.getNewFormat(id, textbox.value, valuetype);
                if (validatedValue) {
                    textbox.value = validatedValue;
                    textbox.setAttribute("class", "validated");
					if (sourceTextbox.value == textbox.value) {
						return
					} 
					let undoButton = document.getElementById(id + '.undo');
					undoButton.removeAttribute('disabled');
                }
             };
			aButton.addEventListener("click", fireButton, false);
			aButton.addEventListener("input", fireButton, false);
            return aButton;
		},

		createUndoButton: function (aRow, aId) {
			let aButton = document.createXULElement('button');
			aRow.appendChild(aButton);
			aButton.setAttribute('id', aId);
			aButton.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("cardbookToolbarBackButtonLabel"));
			aButton.setAttribute('flex', '1');
			aButton.setAttribute('disabled', 'true');
			async function fireButton(event) {
				let id = this.id.replace(/.undo$/, "");
                let textbox = document.getElementById(id + '.value');
                let sourceTextbox = document.getElementById(id + '.sourceValue');
                textbox.value = sourceTextbox.value;
                textbox.dispatchEvent(new Event('input'));
				this.setAttribute('disabled', 'true');
            };
			aButton.addEventListener("click", fireButton, false);
			aButton.addEventListener("input", fireButton, false);
            return aButton;
		},

		actionAll: function (aAction) {
			let nodes = document.getElementById("fieldsTable").querySelectorAll(".rowCount");
            for (let node of nodes) {
				let id = node.id.replace(/.row$/, "");
				document.getElementById(id + "." + aAction).dispatchEvent(new Event('input'));
			}
		},

        save: async function () {
			let nodes = document.getElementById("fieldsTable").querySelectorAll(".rowCount");
			if (!nodes.length) {
				return
			}
			let valueType = document.getElementById("0.value").getAttribute("valuetype");
			let valueTypeName = cardbookRepository.extension.localeData.localizeMessage(`${valueType}Label`);
			let myTopic = "cardsFormatted";
			let dirPrefId = window.arguments[0].dirPrefId || null;
			let myActionId = cardbookActions.startAction(myTopic, [wdw_formatData.scopeName, valueTypeName], dirPrefId);
			wdw_formatData.waitForSave(myActionId);
			wdw_formatData.prepareVariables();
			let results = {};
            for (let node of nodes) {
				let id = node.id.replace(/.row$/, "");
				let cbid = document.getElementById(id + ".cbid").value;
				let value = document.getElementById(id + ".value").value;
				let sourceValue = document.getElementById(id + ".sourceValue").value;
				let index = document.getElementById(id + ".index").value;
				if (value != sourceValue) {
					if (!results[cbid]) {
						wdw_formatData.toDo++;
						results[cbid] = [];
					}
					results[cbid].push([index, value]);
				}
			}
			for (let id in results) {
				if (wdw_formatData.abort) {
					break;
				}
				if (cardbookRepository.cardbookCards[id]) {
					wdw_formatData.rowDone++;
					let myCard = cardbookRepository.cardbookCards[id];
					if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					let myOutCard = new cardbookCardParser();
					cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
					let deleted = 0;
					for (let line of results[id]) {
						let index = line[0] - deleted;
						let value = line[1];
						if (value) {
							myOutCard[valueType][index][0] = [value];
						} else {
							myOutCard[valueType].splice(index, 1);
							deleted++;
						}
					}
					await cardbookRepository.saveCardFromUpdate(myCard, myOutCard, myActionId, false);
				}
			}
			wdw_formatData.cardsLoaded = true;
		},
		
        showLabels: function () {
			for (let node of document.getElementById("cardbookContactButtonsBox").querySelectorAll("button")) {
				node.disabled = false;
			}
			if (wdw_formatData.lines == 0) {
				document.getElementById('noLinesFoundDescVbox').setAttribute("class", "flex-grow-y alignCenter");
				document.getElementById('noLinesFoundDesc').value = cardbookRepository.extension.localeData.localizeMessage("noDataAvailable");
				document.getElementById('recordsHbox').classList.add("hidden");
				document.getElementById('numberLinesFoundDesc').hidden = true;
			} else {
				document.getElementById('numberLinesFoundDesc').value = cardbookRepository.extension.localeData.localizeMessage("numberLines", [wdw_formatData.lines]);
				document.getElementById('numberLinesFoundDesc').hidden = false;
			}
		},

        showProgressBar: function () {
			document.getElementById('recordsHbox').classList.add("hidden");
			document.getElementById('formatAllVbox').setAttribute("class", "flex-grow-y alignCenter");
		},

        disableButtons: function () {
			document.getElementById('formatAllLabel').disabled =  true;
			document.getElementById('undoAllLabel').disabled =  true;
		},

        endWaitForDisplay: function () {
			document.getElementById('formatAllVbox').classList.add("hidden");
			document.getElementById('recordsHbox').classList.remove("hidden");
			wdw_formatData.showLabels();
		},

        waitForDisplay: function () {
			wdw_formatData.showProgressBar();
			let lTimerDisplay = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			lTimerDisplay.initWithCallback({ notify: function(lTimerDisplay) {
				let todo = wdw_formatData.toDo;
				let done = wdw_formatData.rowDone;
				if (wdw_formatData.abort) {
					lTimerDisplay.cancel();
				} else if (done == todo && todo != 0) {
					document.getElementById("formatAll-progressmeter").value = 100;
					wdw_formatData.endWaitForDisplay();
					lTimerDisplay.cancel();
				} else if (wdw_formatData.cardsLoaded && todo == 0) {
					wdw_formatData.endWaitForDisplay();
					lTimerDisplay.cancel();
				} else if (todo != 0) {
					let value = Math.round(done / todo * 100);
					document.getElementById("formatAll-progressmeter").value = value;
				}
			}
			}, wdw_formatData.resfreshTime, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

        endWaitForSave: async function (aTimer, aActionId) {
			aTimer.cancel();
			await cardbookActions.endAction(aActionId, true);
			wdw_formatData.cancel();
		},

		waitForSave: function (aActionId) {
			wdw_formatData.disableButtons();
			wdw_formatData.showProgressBar();
			let lTimerSave = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			lTimerSave.initWithCallback({ notify: async function(lTimerSave) {
				let todo = wdw_formatData.toDo;
				let done = wdw_formatData.rowDone;
				if (wdw_formatData.abort) {
					await wdw_formatData.endWaitForSave(lTimerSave, aActionId);
				} else if (done == todo && todo != 0) {
					document.getElementById("formatAll-progressmeter").value = 100;
					await wdw_formatData.endWaitForSave(lTimerSave, aActionId);
				} else if (wdw_formatData.cardsLoaded && todo == 0) {
					await wdw_formatData.endWaitForSave(lTimerSave, aActionId);
				} else if (todo != 0) {
					let value = Math.round(done / todo * 100);
					document.getElementById("formatAll-progressmeter").value = value;
				}
			}
			}, wdw_formatData.resfreshTime, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		load: async function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			if (window.arguments[0].dirPrefId) {
				wdw_formatData.scopeName = cardbookRepository.cardbookPreferences.getName(window.arguments[0].dirPrefId);
			} else {
				wdw_formatData.scopeName = cardbookRepository.extension.localeData.localizeMessage("allAddressBooks");
			}

			document.title = cardbookRepository.extension.localeData.localizeMessage("wdw_formatDataTitle", [wdw_formatData.scopeName]);

            await wdw_formatData.loadCountries();

			let nodeSelected = document.getElementById("cardbookContactButtonsBox").querySelectorAll("button[visuallyselected]");
			wdw_formatData.setData(nodeSelected[0]);
		},

		setData: async function (aButton) {
			for (let node of document.getElementById("cardbookContactButtonsBox").querySelectorAll("button")) {
				if (node.id == aButton.id) {
					aButton.setAttribute("visuallyselected", "true");
				} else {
					node.removeAttribute("visuallyselected");
					node.disabled = true;
				}
			}
			switch(aButton.id) {
				case "tel":
					wdw_formatData.displayCards(window.arguments[0].dirPrefId, wdw_formatData.loadCardTels);
					break;
				case "email":
					wdw_formatData.displayCards(window.arguments[0].dirPrefId, wdw_formatData.loadCardEmails);
					break;
			}
	},

		cancel: function () {
			wdw_formatData.abort = true;
			close();
		}

	};

};

document.addEventListener("DOMContentLoaded", wdw_formatData.load);
