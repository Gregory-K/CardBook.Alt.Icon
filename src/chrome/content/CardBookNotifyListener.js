notifyTools.enable();
var processDataDisplayId = {};

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/findDuplicates/cardbookDuplicate.js", this);

let id = notifyTools.registerListener(async (message) => {

	switch (message.query) {
		case "simpleMailRedirection.version":
			return simpleMailRedirection.version();
			break;
		case "simpleMailRedirection.lists":
			return simpleMailRedirection.lists(message.id);  //all lists if exists, else emails of list with id
			break;
		case "simpleMailRedirection.contacts":
			return simpleMailRedirection.contacts(message.search);
			break;
		case "simpleMailRedirection.openBook":
			let m3p = Services.wm.getMostRecentWindow("mail:3pane");
			if (m3p) {
				let tabmail = m3p.document.getElementById("tabmail");
				if (tabmail) {
					//m3p.focus();
					tabmail.openTab("cardbook", { title: cardbookRepository.extension.localeData.localizeMessage("cardbookTitle") });
				}
			}
			break;
		case "smartTemplates.getContactsFromMail":
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && account[5] && account[6] != "SEARCH") {
					let dirPrefId = account[4];
					if (message.dirPrefId) {
						if (dirPrefId != message.dirPrefId) {
							continue;
						}
					}
					if (cardbookRepository.cardbookCardEmails[dirPrefId]) {
						if (cardbookRepository.cardbookCardEmails[dirPrefId][message.mail]) {
							return cardbookRepository.cardbookCardEmails[dirPrefId][message.mail];
						}
					}
				}
			}
			return [];
		case "smartTemplates.getAccounts":
			return cardbookRepository.cardbookAccounts;
		case "cardbook.addToCollected":
			cardbookRepository.cardbookCollection.addCollectedContact(message.identityId, message.address);
			break;
		case "cardbook.addToPopularity":
			cardbookRepository.updateMailPop(message.address);
			break;
		case "cardbook.getvCards":
			let vCards = await cardbookRepository.cardbookAttachvCard.getvCards(message.identityId);
			return vCards;
			break;
		case "cardbook.identityChanged":
			cardbookRepository.cardbookUtils.notifyObservers("identityChanged", message.windowId);
			break;
		case "cardbook.openTab":
			cardbookRepository.cardbookUtils.notifyObservers("openTab");
			break;
		case "cardbook.getCalendars":
			let tmpArray = [];
			let cals = cal.manager.getCalendars();
			for (let calendar of cals) {
				tmpArray.push([calendar.name, calendar.id]);
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(tmpArray,0,1);
			return tmpArray;
			break;
		case "cardbook.getTranslatedField":
			return cardbookRepository.cardbookUtils.getTranslatedField(message.value, message.locale);
			break;
		case "cardbook.getAllAvailableColumns":
			return cardbookRepository.cardbookUtils.getAllAvailableColumns(message.mode);
			break;
		case "cardbook.disableShortSearch":
			cardbookRepository.cardbookCardShortSearch = {};
			break;
		case "cardbook.enableShortSearch":
			Services.tm.currentThread.dispatch({ run: async function() {
					let total = Object.keys(cardbookRepository.cardbookCards).length;
					await notifyTools.notifyBackground({query: "cardbook.conf.addProgressBar", type: "enableShortSearch", total: total});
					let count = 0;
					for (let j in cardbookRepository.cardbookCards) {
						let myCard = cardbookRepository.cardbookCards[j];
						cardbookRepository.addCardToShortSearch(myCard);
						count++;
						if (count % 100 == 0) {
							await notifyTools.notifyBackground({query: "cardbook.conf.addProgressBar", type: "enableShortSearch", done: count});
						}
					}
					await notifyTools.notifyBackground({query: "cardbook.conf.addProgressBar", type: "enableShortSearch", done: total});
				}}, Components.interfaces.nsIEventTarget.DISPATCH_NORMAL);
			break;
		case "cardbook.changePrefEmail":
			Services.tm.currentThread.dispatch({ run: async function() {
					let total = Object.keys(cardbookRepository.cardbookCards).length;
					await notifyTools.notifyBackground({query: "cardbook.conf.addProgressBar", type: "changePrefEmail", total: total});
					let count = 0;
					for (let j in cardbookRepository.cardbookCards) {
						let card = cardbookRepository.cardbookCards[j];
						if (!card.isAList) {
							let newEmails = cardbookRepository.cardbookUtils.getPrefAddressFromCard(card, "email", message.value);
							if (newEmails.join(',') != card.emails.join(',')) {
								let tmpCard = new cardbookCardParser();
								await cardbookRepository.cardbookUtils.cloneCard(card, tmpCard);
								await cardbookRepository.saveCardFromMove(card, tmpCard, null, false);
							}
						}
						count++;
						if (count % 100 == 0) {
							await notifyTools.notifyBackground({query: "cardbook.conf.addProgressBar", type: "changePrefEmail", done: count});
						}
					}
					await notifyTools.notifyBackground({query: "cardbook.conf.addProgressBar", type: "changePrefEmail", done: total});
				}}, Components.interfaces.nsIEventTarget.DISPATCH_NORMAL);
			break;
		case "cardbook.convertNodes":
			if (message.radioValue == "categories") {
				cardbookRepository.cardbookAccountsNodes[message.dirPrefId] = [];
			} else {
				Services.tm.currentThread.dispatch({ run: function() {
					for (let card of cardbookRepository.cardbookDisplayCards[message.dirPrefId].cards) {
						cardbookRepository.addCardToOrg(card, message.dirPrefId);
					}
				}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
			}
			break;
		case "cardbook.searchForWrongCards":
			try {
				cardbookRepository.cardbookPreferences.delBranch(cardbookRepository.cardbookPreferences.prefCardBookData + message.dirPrefId + "." + "dateFormat");
			} catch(e) {}
			let found = false;
			let version = cardbookRepository.cardbookPreferences.getVCardVersion(message.dirPrefId);
			for (let card of cardbookRepository.cardbookDisplayCards[message.dirPrefId].cards) {
				if (card.version != version) {
					found = true;
					break;
				}
			}
			return found;
		case "cardbook.getStringFromFormula":
			let formula = cardbookRepository.cardbookUtils.getStringFromFormula(message.fnFormula, message.fn);
			return formula;
		case "cardbook.convertVCards":
			Services.tm.currentThread.dispatch({ run: async function() {
				let convertTopic = "cardsConverted";
				let convertActionId = cardbookActions.startAction(convertTopic);
				let myTargetVersion = cardbookRepository.cardbookPreferences.getVCardVersion(message.dirPrefId);
				let myTargetName = cardbookRepository.cardbookPreferences.getName(message.dirPrefId);
				// the date format is no longer stored
				let myNewDateFormat = cardbookRepository.getDateFormat(message.dirPrefId, message.initialVCardVersion);
				let counter = 0;
		
				for (let card of cardbookRepository.cardbookDisplayCards[message.dirPrefId].cards) {
					let myTempCard = new cardbookCardParser();
					await cardbookRepository.cardbookUtils.cloneCard(card, myTempCard);
					if (cardbookRepository.cardbookUtils.convertVCard(myTempCard, myTargetName, myTargetVersion, myNewDateFormat, myNewDateFormat)) {
						await cardbookRepository.saveCardFromUpdate(card, myTempCard, convertActionId, false);
						counter++;
					}
				}
		
				cardbookRepository.writePossibleCustomFields();
				try {
					cardbookRepository.cardbookPreferences.delBranch(cardbookRepository.cardbookPreferences.prefCardBookData + message.dirPrefId + "." + "dateFormat");
				} catch(e) {}
				cardbookRepository.cardbookUtils.formatStringForOutput(convertTopic, [myTargetName, myTargetVersion, counter]);
				await cardbookActions.endAction(convertActionId);
			}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
			break;
		case "cardbook.formatData.getCards":
			let fieldType = "";
			if (message.fields != "tel" && message.fields != "email") {
				if (cardbookRepository.allColumns.personal.includes(message.fields) || cardbookRepository.allColumns.org.includes(message.fields) || cardbookRepository.adrElements.includes(message.fields)) {
					fieldType = "string";
				} else {
					let personalCB = cardbookRepository.customFields.personal.filter(x => x[0] == message.fields);
					let orgCB = cardbookRepository.customFields.org.filter(x => x[0] == message.fields);
					if (personalCB.length || orgCB.length) {
						fieldType = "custom";
					} else {
						let orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
						let orgStructureArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
						if (orgStructureArray.includes(message.fields.replace(/^org\./, ""))) {
							fieldType ="customOrg";
						}
					}
				}
			}
			let data = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[message.dirPrefId].cards));
			await notifyTools.notifyBackground({query: "cardbook.processData.toDo", winId: message.winId, displayId: message.displayId, toDo: data.length});
			let rowFormatDoneGet = 0;
			let lines = 0;
			for (let card of data) {
				if (processDataDisplayId[message.winId] != message.displayId) {
				 	return
				}
				let i = 0;
				switch(message.fields) {
					case "tel":
						let country = cardbookRepository.cardbookUtils.getCardRegion(card);
						for (let telLine of card.tel) {
							if (processDataDisplayId[message.winId] != message.displayId) {
								return
							}
							await notifyTools.notifyBackground({query: "cardbook.formatData.displayCardLineTels", winId: message.winId, displayId: message.displayId, record: [lines, card.cbid, card.fn, country.toLowerCase(), telLine[0][0], telLine[0][0], i]});
							lines++;
							i++;
						}
						rowFormatDoneGet++;
						await notifyTools.notifyBackground({query: "cardbook.processData.rowDone", winId: message.winId, displayId: message.displayId, rowDone: rowFormatDoneGet});
						break;
					case "email":
						for (let emailLine of card.email) {
							if (processDataDisplayId[message.winId] != message.displayId) {
								return
							}
							await notifyTools.notifyBackground({query: "cardbook.formatData.displayCardLineEmail", winId: message.winId, displayId: message.displayId, record: [lines, card.cbid, card.fn, emailLine[0][0], emailLine[0][0], i]});
							lines++;
							i++;
						}
						rowFormatDoneGet++;
						await notifyTools.notifyBackground({query: "cardbook.processData.rowDone", winId: message.winId, displayId: message.displayId, rowDone: rowFormatDoneGet});
						break;
					default:
						if (processDataDisplayId[message.winId] != message.displayId) {
							return
						}
						let field = message.fields;
						let value = "";
						if (fieldType == "string") {
							if (typeof card[field] !== 'undefined') {
								value = card[field];
							}
						} else if (fieldType == "custom") {
							let tmpArray = card.others.filter( x => x.startsWith(field + ":"));
							if (tmpArray.length) {
								let regexp = new RegExp("^" + field + ":");
								value = tmpArray[0].replace(regexp, "");
							}
						} else if (fieldType == "customOrg") {
							let orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
							let orgStructureArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
							let index = orgStructureArray.indexOf(field.replace(/^org\./, ""));
							let orgValue = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(card.org).split(";"));
							if (orgValue[index]) {
								value = orgValue[index];
							}
						}
						await notifyTools.notifyBackground({query: "cardbook.formatData.displayCardLineFields", winId: message.winId, displayId: message.displayId, record: [lines, card.cbid, card.fn, value, value]});
						lines++;
						rowFormatDoneGet++;
						await notifyTools.notifyBackground({query: "cardbook.processData.rowDone", winId: message.winId, displayId: message.displayId, rowDone: rowFormatDoneGet});
						break;
					}
			}
			data = null;
			await notifyTools.notifyBackground({query: "cardbook.processData.cardsLoaded", winId: message.winId, displayId: message.displayId, cardsLoaded: true});
			processDataDisplayId[message.winId] = null;
			break;
		case "cardbook.formatData.saveCards":
			let fieldTypeSave = "";
			if (message.fields != "tel" && message.fields != "email") {
				if (cardbookRepository.allColumns.personal.includes(message.fields) || cardbookRepository.allColumns.org.includes(message.fields) || cardbookRepository.adrElements.includes(message.fields)) {
					fieldTypeSave = "string";
				} else {
					let personalCB = cardbookRepository.customFields.personal.filter(x => x[0] == message.fields);
					let orgCB = cardbookRepository.customFields.org.filter(x => x[0] == message.fields);
					if (personalCB.length || orgCB.length) {
						fieldTypeSave = "custom";
					} else {
						let orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
						let orgStructureArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
						if (orgStructureArray.includes(message.fields.replace(/^org\./, ""))) {
							fieldTypeSave ="customOrg";
						}
					}
				}
			}
			let valueTypeName = cardbookRepository.extension.localeData.localizeMessage(`${message.fields}Label`);
			let dirPrefId = message.dirPrefId;
			let formatActionId = cardbookActions.startAction("cardsFormatted", [message.scopeName, valueTypeName], dirPrefId);
			let rowFormatDoneSave = 0;
			for (let id in message.results) {
				if (cardbookRepository.cardbookCards[id]) {
					rowFormatDoneSave++;
					await notifyTools.notifyBackground({query: "cardbook.processData.rowDone", winId: message.winId, displayId: message.displayId, rowDone: rowFormatDoneSave});
					let myCard = cardbookRepository.cardbookCards[id];
					if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					let myOutCard = new cardbookCardParser();
					await cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
					let deleted = 0;
					for (let line of message.results[id]) {
						let index = line[0] - deleted;
						let value = line[1];
						if (value) {
							if (message.fields == "tel" || message.fields == "email") {
								myOutCard[message.fields][index][0] = [value];
							} else {
								if (fieldTypeSave == "string") {
									myOutCard[message.fields] = value;
								} else if (fieldTypeSave == "custom") {
									myOutCard.others = myOutCard.others.filter(x => !x.startsWith(message.fields + ":"));
									myOutCard.others.push(message.fields + ":"+ value);
								} else if (fieldTypeSave == "customOrg") {
									let orgStructure = cardbookRepository.cardbookPrefs["orgStructure"];
									let orgStructureArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
									let index = orgStructureArray.indexOf(message.fields.replace(/^org\./, ""));
									let orgValue = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(myOutCard.org).split(";"));
									orgValue[index] = cardbookRepository.cardbookUtils.escapeStringSemiColon(value.trim());
									myOutCard.org = cardbookRepository.cardbookUtils.unescapeStringSemiColon(orgValue.join(";"));
								}
							}
						} else {
							if (message.fields == "tel" || message.fields == "email") {
								myOutCard[message.fields].splice(index, 1);
								deleted++;
							} else {
								if (fieldTypeSave == "string") {
									myOutCard[message.fields] = "";
								} else if (fieldTypeSave == "custom") {
									myOutCard.others = myOutCard.others.filter(x => !x.startsWith(message.fields + ":"));
								} else if (fieldTypeSave == "customOrg") {
								}
							}
						}
					}
					await cardbookRepository.saveCardFromUpdate(myCard, myOutCard, formatActionId, false);
				}
			}
			await notifyTools.notifyBackground({query: "cardbook.processData.cardsLoaded", winId: message.winId, displayId: message.displayId, cardsLoaded: true});
			await cardbookActions.endAction(formatActionId, true);
			break;
		case "cardbook.findDuplicates.getCards":
			let myCardArray = [];
			gResults = [];
			gResultsDirPrefId = [];
			if (message.dirPrefId) {
				for (let card of cardbookRepository.cardbookDisplayCards[message.dirPrefId].cards) {
					if (processDataDisplayId[message.winId] != message.displayId) {
						return
					}
					if (!card.isAList) {
						myCardArray.push([cardbookDuplicate.generateCardArray(card), card, true]);
					}
				}
			} else {
				for (let i in cardbookRepository.cardbookCards) {
					if (processDataDisplayId[message.winId] != message.displayId) {
						return
					}
					var myCard = cardbookRepository.cardbookCards[i];
					if (!myCard.isAList) {
						myCardArray.push([cardbookDuplicate.generateCardArray(myCard), myCard, true]);
					}
				}
			}
			await notifyTools.notifyBackground({query: "cardbook.processData.toDo", winId: message.winId, displayId: message.displayId, toDo: myCardArray.length});
			let rowDuplicateDoneGet = 0;
			for (var i = 0; i < myCardArray.length; i++) {
				rowDuplicateDoneGet++;
				await notifyTools.notifyBackground({query: "cardbook.processData.rowDone", winId: message.winId, displayId: message.displayId, rowDone: rowDuplicateDoneGet});
				if (processDataDisplayId[message.winId] != message.displayId) {
					return
				}
				if (myCardArray[i][2] === false) {
					continue
				}
				var myTmpResult = [myCardArray[i][1]];
				for (var j = i+1; j < myCardArray.length; j++) {
					if (processDataDisplayId[message.winId] != message.displayId) {
						return
					}
					let added = false;
					if (myCardArray[j][2] && cardbookDuplicate.compareCardArraySure(myCardArray[i][0].resultSure, myCardArray[j][0].resultSure)) {
						myTmpResult.push(myCardArray[j][1]);
						myCardArray[j][2] = false;
						added = true;
					} else if (myCardArray[j][2] && message.state == "more" && cardbookDuplicate.compareCardArrayTry(myCardArray[i][0].resultTry, myCardArray[j][0].resultTry)) {
						myTmpResult.push(myCardArray[j][1]);
						myCardArray[j][2] = false;
						added = true;
					}
					if (added && !gResultsDirPrefId.includes(myCardArray[i][1].dirPrefId)) {
						gResultsDirPrefId.push(myCardArray[i][1].dirPrefId)
					}
					if (added && !gResultsDirPrefId.includes(myCardArray[j][1].dirPrefId)) {
						gResultsDirPrefId.push(myCardArray[j][1].dirPrefId)
					}
				}
				if (myTmpResult.length > 1) {
					// necessary to sort for the excluded duplicates
					cardbookRepository.cardbookUtils.sortCardsTreeArrayByString(myTmpResult, "uid", 1);
					gResults.push(myTmpResult);
				}
			}
			await notifyTools.notifyBackground({query: "cardbook.findDuplicates.ABs", winId: message.winId, displayId: message.displayId, ABids: gResultsDirPrefId});
			await notifyTools.notifyBackground({query: "cardbook.findDuplicates.cards", winId: message.winId, displayId: message.displayId, cards: gResults});
			break;
		case "cardbook.findDuplicates.mergeOne":
			await cardbookDuplicate.mergeOne(message.record, message.sourceCat, message.targetCat, message.actionId);
			break;
		case "cardbook.findDuplicates.getDuplidateIndex":
			await cardbookIDBDuplicate.openDuplicateDB();
			let duplicate = await cardbookIDBDuplicate.loadDuplicate();
			return duplicate;
		case "cardbook.findDuplicates.addDuplidateIndex":
			let uid0 = message.uids[0];
			for (let i = 1; i < message.uids.length; i++) {
				await cardbookIDBDuplicate.addDuplicate(uid0, message.uids[i]);
			}
			break;
		case "cardbook.findDuplicates.deleteCardsAndValidate":
			var confirmTitle = cardbookRepository.extension.localeData.localizeMessage("confirmTitle");
			var cardsCount = message.cards.length;
			var confirmMsg = PluralForm.get(cardsCount, cardbookRepository.extension.localeData.localizeMessage("selectedCardsDeletionConfirmMessagePF", cardsCount));
			if (Services.prompt.confirm(message.window, confirmTitle, confirmMsg)) {
				var myTopic = "cardsDeleted";
				var myActionId = cardbookActions.startAction(myTopic, message.cards, null, message.cards.length);
				await cardbookRepository.cardbookUtils.bulkOperation(myActionId);
				cardbookRepository.currentAction[myActionId].totalCards = cardbookRepository.currentAction[myActionId].totalCards + message.cards.length;
				cardbookRepository.asyncDeleteCards(message.cards, myActionId);
				cardbookActions.endAsyncAction(myActionId);
				await notifyTools.notifyBackground({query: "cardbook.findDuplicates.finishDeleteAction", winId: info.winId, displayId: message.displayId, lineId: message.lineId});
			}
			break;
		case "cardbook.processData.setDisplayId":
			processDataDisplayId[message.winId] = message.displayId;
			break;
		case "cardbook.startAction":
			let actionId = cardbookActions.startAction(message.topic);
			return actionId
		case "cardbook.endAction":
			await cardbookActions.endAction(message.actionId);
			break;
		case "cardbook.getAdrElements":
				return cardbookRepository.adrElements;
		case "cardbook.getAllColumns":
			return cardbookRepository.allColumns;
		case "cardbook.getCustomFields":
			return cardbookRepository.customFields;
		case "cardbook.getNewFields":
			return cardbookRepository.newFields;
		case "cardbook.getMultilineFields":
			return cardbookRepository.multilineFields;
		case "cardbook.isMyAccountRemote":
			return cardbookRepository.cardbookUtils.isMyAccountRemote(message.type);
		case "cardbook.applyFormulaToAllAB":
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1]) {
					if ((account[4] == message.dirPrefId) || ("allAddressBooks" == message.dirPrefId)) {
						cardbookRepository.cardbookPreferences.setFnFormula(account[4], message.formula);
					}
				}
			}
			break;
		case "cardbook.removePeriodicSync":
			cardbookRepository.cardbookSynchronization.removePeriodicSync(message.dirPrefId, message.name);
			break;
		case "cardbook.addPeriodicSync":
			cardbookRepository.cardbookSynchronization.addPeriodicSync(message.dirPrefId, message.name, message.interval);
			break;
		case "cardbook.decryptDBs":
			await cardbookIndexedDB.decryptDBs();
			break;
		case "cardbook.encryptDBs":
			await cardbookIndexedDB.encryptDBs();
			break;
		case "cardbook.getEncryptorVersion":
			return String(cardbookEncryptor.VERSION);
		case "cardbook.getStatusInformation":
			return cardbookRepository.statusInformation;
		case "cardbook.flushStatusInformation":
			cardbookRepository.statusInformation = [];
			break;
		case "cardbook.setStatusInformation":
			while (cardbookRepository.statusInformation.length > message.value) {
				cardbookRepository.statusInformation.splice(0, 1);
			}
			break;
		case "cardbook.getCurrentActions":
			return cardbookRepository.currentAction;
		case "cardbook.notifyObserver":
			// bug : this command is run twice !
			Services.obs.notifyObservers(null, message.value, message.params);
			break;
		case "cardbook.convertDateToDateString":
			return cardbookRepository.cardbookDates.convertDateToDateString(message.date, message.version);
		case "cardbook.getFormattedDateForDateString":
			return cardbookRepository.cardbookDates.getFormattedDateForDateString(message.date, message.version, message.format);
		case "cardbook.getEditionFields":
			return cardbookRepository.cardbookUtils.getEditionFields();
		case "cardbook.setDefaultImppTypes":
			cardbookRepository.setDefaultImppTypes();
			break;
		case "cardbook.formatAddress":
			let formatAddress = cardbookRepository.cardbookUtils.formatAddress(message.address, message.addressFormula);
			return formatAddress;
		case "cardbook.getSupportedConnections":
			return cardbookRepository.supportedConnections;
		case "cardbook.getUUID":
			return cardbookRepository.cardbookUtils.getUUID();
		case "cardbook.getCardbookOAuthData":
			return cardbookRepository.cardbookOAuthData;
		case "cardbook.getCardbookComplexSearch":
			return cardbookRepository.cardbookComplexSearch;
		case "cardbook.getCardbookServerValidation":
			return cardbookRepository.cardbookServerValidation;
		case "cardbook.getCardbookServerDiscoveryRequest":
			return cardbookRepository.cardbookServerDiscoveryRequest;
		case "cardbook.getCardbookServerDiscoveryResponse":
			return cardbookRepository.cardbookServerDiscoveryResponse;
		case "cardbook.getCardbookServerDiscoveryError":
			return cardbookRepository.cardbookServerDiscoveryError;
		case "cardbook.getCardbookRefreshTokenRequest":
			return cardbookRepository.cardbookRefreshTokenRequest;
		case "cardbook.getCardbookRefreshTokenResponse":
			return cardbookRepository.cardbookRefreshTokenResponse;
		case "cardbook.getCardbookRefreshTokenError":
			return cardbookRepository.cardbookRefreshTokenError;
		case "cardbook.getSlashedUrl":
			return cardbookRepository.cardbookSynchronization.getSlashedUrl(message.url);
		case "cardbook.getWellKnownUrl":
			return cardbookRepository.cardbookSynchronization.getWellKnownUrl(message.url);
		case "cardbook.decodeURL":
			return cardbookRepository.cardbookUtils.decodeURL(message.url);
		case "cardbook.callDirPicker":
			var myWindowTitle = cardbookRepository.extension.localeData.localizeMessage(message.title);
			var nsIFilePicker = Components.interfaces.nsIFilePicker;
			var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
			fp.init(Services.wm.getMostRecentWindow(null), myWindowTitle, nsIFilePicker.modeGetFolder);
			fp.open(async rv => {
				if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
					await notifyTools.notifyBackground({query: "cardbook.callDirPickerDone", id: message.id,
											file: fp.file.path});
				}
			});
			break;
		case "cardbook.callFilePicker":
			var myWindowTitle = cardbookRepository.extension.localeData.localizeMessage(message.title);
			var nsIFilePicker = Components.interfaces.nsIFilePicker;
			var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
			if (message.mode === "SAVE") {
				fp.init(Services.wm.getMostRecentWindow(null), myWindowTitle, nsIFilePicker.modeSave);
			} else if (message.mode === "OPEN") {
				fp.init(Services.wm.getMostRecentWindow(null), myWindowTitle, nsIFilePicker.modeOpen);
			}
			if (message.type === "VCF") {
				fp.appendFilter("VCF File","*.vcf");
			} else if (message.type === "TPL") {
				fp.appendFilter("TPL File","*.tpl");
			} else if (message.type === "GPG") {
				fp.appendFilter("ASC File","*.asc");
				fp.appendFilter("PUB File","*.pub");
				fp.appendFilter("GPG File","*.gpg");
			} else if (message.type === "EXPORTFILE") {
				//bug 545091 on linux and macosx
				fp.defaultExtension = "vcf";
				fp.appendFilter("VCF File","*.vcf");
				fp.appendFilter("CSV File","*.csv");
			} else if (message.type === "IMAGES") {
				fp.appendFilters(nsIFilePicker.filterImages);
			}
			fp.appendFilters(fp.filterAll);
			if (message.defaultFileName) {
				fp.defaultString = message.defaultFileName;
			}
			if (message.defaultDir) {
				fp.displayDirectory = message.defaultDir;
			}
			fp.open(async rv => {
				if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
					if (message.result == "path") { 
						await notifyTools.notifyBackground({query: "cardbook.callFilePickerDone", id: message.id,
											file: fp.file.path});
					} else if (message.result == "content") {
						function callback(aContent) {
							notifyTools.notifyBackground({query: "cardbook.callFilePickerDone", id: message.id,
										file: aContent});
						}
						cardbookRepository.cardbookUtils.readContentFromFile(fp.file.path, callback, {});
					} else if (message.result == "write") {
						await cardbookRepository.cardbookUtils.writeContentToFile(fp.file.path, message.content, "UTF8");
					}
				}
			});
			break;
		case "cardbook.isFileAlreadyOpen":
			return cardbookRepository.cardbookUtils.isFileAlreadyOpen(message.path);
		case "cardbook.isDirectoryAlreadyOpen":
			return cardbookRepository.cardbookUtils.isDirectoryAlreadyOpen(message.path);
		case "cardbook.initMultipleOperations":
			cardbookRepository.cardbookSynchronization.initMultipleOperations(message.dirPrefId);
			break;
		case "cardbook.initDiscoveryOperations":
			cardbookRepository.cardbookSynchronization.initDiscoveryOperations(message.dirPrefId);
			break;
		case "cardbook.stopDiscoveryOperations":
			cardbookRepository.cardbookSynchronization.stopDiscoveryOperations(message.dirPrefId);
			break;
		case "cardbook.finishMultipleOperations":
			cardbookRepository.cardbookSynchronization.finishMultipleOperations(message.dirPrefId);
			break;
		case "cardbook.updateServerSyncRequest":
			cardbookRepository.cardbookServerSyncRequest[message.dirPrefId]++;
			break;
		case "cardbook.initServerValidation":
			cardbookRepository.cardbookServerValidation[message.dirPrefId] = {length: 0, user: message.user};
			break;
		case "cardbook.fromValidationToArray":
			return cardbookRepository.cardbookUtils.fromValidationToArray(message.dirPrefId, message.type);
		case "cardbook.requestNewRefreshTokenForGooglePeople":
			cardbookRepository.cardbookSynchronizationGoogle2.requestNewRefreshTokenForGooglePeople(message.connection, message.callback, message.followAction);
			break;
		case "cardbook.validateWithDiscovery":
			cardbookRepository.cardbookSynchronizationOffice365.validateWithDiscovery(message.connection)
			break;
		case "cardbook.validateWithoutDiscovery":
			cardbookRepository.cardbookSynchronization.validateWithoutDiscovery(message.connection,message.type, message.params);
			break;
		case "cardbook.discoverPhase1":
			cardbookRepository.cardbookSynchronization.discoverPhase1(message.connection,message.type, message.params);
			break;
		case "cardbook.updateStatusProgressInformation":
			cardbookRepository.cardbookLog.updateStatusProgressInformation(message.string, message.error);
			break;
		case "cardbook.getCardValueByField":
			return cardbookRepository.cardbookUtils.getCardValueByField(message.card, message.field, message.includePref);
		case "cardbook.getMembersFromCard":
			return cardbookRepository.cardbookUtils.getMembersFromCard(message.card)
		case "cardbook.getImage":
			let image = await cardbookIDBImage.getImage(message.field, message.dirName, message.cardId, message.cardName);
			return image
		case "cardbook.getCardParser":
			return new cardbookCardParser();
		case "cardbook.mergeCards.viewCardResult":
			if (message.hideCreate) {
				var myViewResultArgs = {cardIn: message.card, cardOut: {}, editionMode: "ViewResultHideCreate", cardEditionAction: "CANCEL"};
			} else {
				var myViewResultArgs = {cardIn: message.card, cardOut: {}, editionMode: "ViewResult", cardEditionAction: "CANCEL"};
			}
			var resultWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/cardEdition/wdw_cardEdition.xhtml", "", cardbookRepository.modalWindowParams, myViewResultArgs);
			await notifyTools.notifyBackground({query: "cardbook.mergeCards.closeViewCardResult", ids: message.ids, duplicateWinId: message.duplicateWinId, duplicateDisplayId: message.duplicateDisplayId, duplicateLineId: message.duplicateLineId, action: myViewResultArgs.cardEditionAction, actionId: message.actionId, cardOut: myViewResultArgs.cardOut});
			break;
		case "cardbook.mergeCards.mergeFinished":
			// source : MERGE, DUPLICATE, SYNC, IMPORT
			if (true) {
				let uid = message.ids.split(",")[0].split("::")[1];
				let dirPrefId = message.ids.split(",")[0].split("::")[0];
				if (message.action == "CANCEL") {
					if (cardbookRepository.cardbookServerSyncMerge[dirPrefId][uid]) {
						// remove the temporary card
						cardbookRepository.cardbookServerGetCardForMergeResponse[dirPrefId]++;
						if (cardbookRepository.cardbookServerSyncMerge[dirPrefId][uid].tempCard) {
							let tempCard = cardbookRepository.cardbookServerSyncMerge[dirPrefId][uid].tempCard;
							await cardbookRepository.removeCardFromRepository(tempCard, true);
							cardbookRepository.cardbookServerSyncMerge[dirPrefId][uid] = null;
						}
						cardbookRepository.cardbookServerCardSyncDone[dirPrefId]++;
					}
					return;
				}
				if (message.source != "SYNC") {
					var mergeActionId = message.actionId || cardbookActions.startAction("cardsMerged", null, null);
					switch (message.action) {
						case "CREATEANDREPLACE":
							let listOfCards = [];
							for (let cbid of message.ids.split(",")) {
								listOfCards.push(cardbookRepository.cardbookCards[cbid]);
							}
							await cardbookRepository.deleteCards(listOfCards, mergeActionId);
							if (message.actionId) {
								cardbookRepository.currentAction[mergeActionId].totalCards++;
							}
						case "CREATE":
							await cardbookRepository.saveCardFromUpdate({}, message.cardOut, mergeActionId, true);
							break;
					}
					if (!message.actionId) {
						await cardbookActions.endAction(mergeActionId);
					}
				}
				if (message.action == "CREATE" || message.action == "CREATEANDREPLACE") {
					if (message.source == "DUPLICATE") {
						await notifyTools.notifyBackground({query: "cardbook.findDuplicates.finishMergeAction", duplicateWinId: message.duplicateWinId, duplicateDisplayId: message.duplicateDisplayId, duplicateLineId: message.duplicateLineId});
					} else if (message.source == "SYNC" || message.source == "IMPORT") {
						cardbookRepository.cardbookServerGetCardForMergeResponse[dirPrefId]++;
						if (message.source == "SYNC") {
							message.cardOut.uid = uid;
							let etag = cardbookRepository.cardbookServerSyncMerge[dirPrefId][uid].etag;
							cardbookRepository.cardbookUtils.addEtag(message.cardOut, etag);
							cardbookRepository.cardbookUtils.setCalculatedFields(message.cardOut);
							cardbookRepository.cardbookServerUpdatedCardRequest[dirPrefId]++;
							let connection = cardbookRepository.cardbookServerSyncMerge[dirPrefId][uid].connection;
							let prefIdType = cardbookRepository.cardbookServerSyncMerge[dirPrefId][uid].prefIdType;
							let cacheCard = cardbookRepository.cardbookServerSyncMerge[dirPrefId][uid].cacheCard;
							if (prefIdType == "GOOGLE2") {
								cardbookRepository.cardbookSynchronizationGoogle2.serverUpdateCard(connection, message.cardOut);
							} else if (prefIdType == "OFFICE365") {
								cardbookRepository.cardbookSynchronizationOffice365.serverUpdateCard(connection, message.cardOut);
							} else {
								await cardbookRepository.cardbookSynchronization.serverUpdateCard(connection, cacheCard, message.cardOut, prefIdType);
							}
						} else if (message.source == "IMPORT") {
							cardbookRepository.cardbookServerCardSyncDone[dirPrefId]++;
						}
						// remove the temporary card
						let tempCard = cardbookRepository.cardbookServerSyncMerge[dirPrefId][uid].tempCard;
						await cardbookRepository.removeCardFromRepository(tempCard, true);
						cardbookRepository.cardbookServerSyncMerge[dirPrefId][uid] = null;
					}
				}
			}
			break;
		case "cardbook.formatStringForOutput":
			cardbookRepository.cardbookUtils.formatStringForOutput(message.string, message.values, message.error);
			break;
		case "cardbook.getCollectedStandardAB":
			// Thunderburd bug
			// return Services.prefs.getStringPref("ldap_2.servers.history.uid");
			var ABBundle = Services.strings.createBundle("chrome://messenger/locale/addressbook/addressBook.properties");
			return ABBundle.GetStringFromName("ldap_2.servers.history.description");
		case "cardbook.getRemoteStandardAB":
			let remoteAB = [];
			let prefs = Services.prefs.getChildList("ldap_2.servers");
			for (let pref of prefs) {
				if (pref.endsWith("carddav.url")) {
					let user = pref.replace("carddav.url", "carddav.username");
					let name = pref.replace("carddav.url", "description");
					let uid = pref.replace("carddav.url", "uid");
					remoteAB.push({"user": Services.prefs.getStringPref(user),
									"url": Services.prefs.getStringPref(pref), 
									"name": Services.prefs.getStringPref(name),
									"uid": Services.prefs.getStringPref(uid)});
				}
			}
			return remoteAB;
		case "cardbook.getFn":
			let fn = "";
			if (cardbookRepository.cardbookCards[message.id]) {
				fn = cardbookRepository.cardbookCards[message.id].fn;
			}
			return fn;
		case "cardbook.getCoreTypes":
			return cardbookRepository.cardbookCoreTypes;
		case "cardbook.getTypes":
			return cardbookRepository.cardbookTypes.getTypes(message.ABType, message.type, message.reset);
		case "cardbook.loadCustoms":
			cardbookRepository.loadCustoms();
			break;
		case "cardbook.getPassword":
			return cardbookRepository.cardbookPasswordManager.getPassword(message.user, message.url);
		case "cardbook.getDomainPassword":
			return cardbookRepository.cardbookPasswordManager.getDomainPassword(message.domain);
		case "cardbook.removePassword":
			cardbookRepository.cardbookPasswordManager.removePassword(message.user, message.url);
			break;
		case "cardbook.rememberPassword":
			cardbookRepository.cardbookPasswordManager.rememberPassword(message.user, message.url, message.pwd, message.save);
			break;
		case "cardbook.getCountries":
			let result = [];
			for (let code of cardbookRepository.countriesList) {
				let country = cardbookRepository.extension.localeData.localizeMessage("region-name-" + code);
				if (message.useCodeValues) {
					result.push([code.toUpperCase(), country]);
				} else {
					result.push([country, country]);
				}
			}
			return result;
		case "cardbook.getCards":
			let cardslist = [];
			for (let cbid of message.cbids) {
				let card = await cardbookIDBCard.getCard(cbid);
				cardslist.push(card);
			}
			return cardslist;
		case "cardbook.getAllURLsToDiscover":
			return cardbookRepository.cardbookSynchronization.getAllURLsToDiscover();
		case "cardbook.openExternalURL":
			cardbookRepository.cardbookUtils.openExternalURL(message.link);
			break;
		case "cardbook.promptConfirm":
			return Services.prompt.confirm(window, message.title, message.message);
			break;
		case "cardbook.pref.setLegacyPref":
			cardbookRepository.cardbookPrefs[message.key] = message.value;
			break;
		case "cardbook.pref.removeLegacyPrefs":
			for (let key of message.keys) {
				delete cardbookRepository.cardbookPrefs[key];
			}
			break;
		case "cardbook.getABs":
			let sortedAddressBooks = [];
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && (message.includeDisabled || account[5])
						&& (message.includeReadOnly || !account[7])
						&& (message.includeSearch || (account[6] !== "SEARCH"))) {
					if (message.exclRestrictionList && message.exclRestrictionList[account[4]]) {
						continue;
					}
					if (message.inclRestrictionList && message.inclRestrictionList.length > 0) {
						if (message.inclRestrictionList[account[4]]) {
							sortedAddressBooks.push([account[0], account[4], cardbookRepository.getABIconType(account[6])]);
						}
					} else {
						sortedAddressBooks.push([account[0], account[4], cardbookRepository.getABIconType(account[6])]);
					}
				}
			}
			if (!message.exclusive) {
				for (let addrbook of MailServices.ab.directories) {
					// remote LDAP directory
					if (addrbook.isRemote && addrbook.dirType === 0) {
						continue;
					}
					if (message.inclRestrictionList && message.inclRestrictionList.length > 0) {
						if (message.inclRestrictionList[addrbook.dirPrefId]) {
							sortedAddressBooks.push([addrbook.dirName, addrbook.dirPrefId, "standard-abook"]);
						}
					} else {
						sortedAddressBooks.push([addrbook.dirName, addrbook.dirPrefId, "standard-abook"]);
					}
				}
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(sortedAddressBooks,0,1);
			return sortedAddressBooks;
		case "cardbook.getCategories":
			let sortedCategories = [];
			if (cardbookRepository.cardbookAccountsCategories[message.defaultPrefId]) {
				for (let category of cardbookRepository.cardbookAccountsCategories[message.defaultPrefId]) {
					if (message.exclRestrictionList && message.exclRestrictionList[message.defaultPrefId] && message.exclRestrictionList[message.defaultPrefId][category]) {
						continue;
					}
					if (message.inclRestrictionList && message.inclRestrictionList[message.defaultPrefId]) {
						if (message.inclRestrictionList[message.defaultPrefId][category]) {
							sortedCategories.push([category, message.defaultPrefId+"::categories::"+category]);
						}
					} else {
						sortedCategories.push([category, message.defaultPrefId+"::categories::"+category]);
					}
				}
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(sortedCategories,0,1);
			return sortedCategories;
		case "cardbook.getContacts":
			let contacts = [];
			for (let card of cardbookRepository.cardbookDisplayCards[message.dirPrefId].cards) {
				contacts.push([card.fn, card.uid, card.isAList]);
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(contacts,0,1);
			return contacts;
		case "cardbook.getvCard":
			return cardbookRepository.cardbookUtils.getvCardForEmail(cardbookRepository.cardbookCards[message.dirPrefId+"::"+message.contactId]);
		case "cardbook.getNodesForCreation":
			let nodes = [];
			if (message.type == "categories") {
				if (message.dirPrefId) {
					nodes = nodes.concat(cardbookRepository.cardbookAccountsCategories[message.dirPrefId]);
				} else {
					let selectedDirPrefId = cardbookWindowUtils.getSelectedCardsDirPrefId();
					for (let dirPrefId of selectedDirPrefId) {
						nodes = nodes.concat(cardbookRepository.cardbookAccountsCategories[dirPrefId]);
					}
				}
				if (!nodes.includes(cardbookRepository.cardbookPrefs["uncategorizedCards"])) {
					nodes.push(cardbookRepository.cardbookPrefs["uncategorizedCards"]);
				}
				nodes = nodes.filter(child => child != message.name);
				nodes = cardbookRepository.arrayUnique(nodes);
				cardbookRepository.cardbookUtils.sortArrayByString(nodes, 1);
			} else {
				let parentList = cardbookRepository.cardbookAccountsNodes[message.dirPrefId].filter(child => cardbookRepository.getParentOrg(child.id) == cardbookRepository.getParentOrg(message.id));
				nodes = parentList.map(child => child.data).filter(child => child != message.name);
			}
			return nodes;
		case "cardbook.askUser.sendChoice":
			if (cardbookRepository.importConflictChoice[message.dirPrefId] &&
				cardbookRepository.importConflictChoice[message.dirPrefId][message.buttons] &&
				cardbookRepository.importConflictChoice[message.dirPrefId][message.buttons][message.message]) {
				if (message.confirm == true) {
					notifyTools.notifyBackground({query: "cardbook.askUser.importConflictChoicePersist", dirPrefId: message.dirPrefId, buttons: message.buttons});
					cardbookRepository.importConflictChoice[message.dirPrefId][message.buttons].result = message.result;
				} else {
					cardbookRepository.importConflictChoice[message.dirPrefId][message.buttons][message.message].result = message.result;
				}
			}
			break;
		}
});
