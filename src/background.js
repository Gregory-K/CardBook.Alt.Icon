import { cardbookNewPreferences } from "./chrome/content/preferences/cardbookNewPreferences.mjs";
// to be deleted when the beforeunload event would be OK
async function main() {
	messenger.NotifyTools.onNotifyBackground.addListener(async (info) => {
		switch (info.query) {
			case "cardbook.getAttachmentContent": {
					let tabs = await browser.tabs.query({type: "mail"});
					let displayedMessage = await browser.messageDisplay.getDisplayedMessage(tabs[0].id);
					let attachments = await browser.messages.listAttachments(displayedMessage.id);
					let file = await browser.messages.getAttachmentFile(displayedMessage.id, info.attachmentId);
					let content = await file.text();
					return content;
				}
			case "cardbook.clipboardSetText":
				await navigator.clipboard.writeText(info.text);
				break;
			case "cardbook.clipboardSetImage":
				// info.type is png, jpg, etc...
				// setImageData only accepts png and jpeg
				let imageType = (info.type.toLowerCase() == "jpg") ? "jpeg" : info.type.toLowerCase();
				const byteCharacters = atob(info.b64);
				const byteNumbers = new Uint8Array(byteCharacters.length);
				for (let i = 0; i < byteCharacters.length; i++) {
					byteNumbers[i] = byteCharacters.charCodeAt(i);
				}
				await browser.clipboard.setImageData(byteNumbers.buffer, imageType);
				// does not work
				// const byteCharacters = atob(info.b64);
				// const byteNumbers = new Array(byteCharacters.length);
				// for (let i = 0; i < byteCharacters.length; i++) {
				// 	byteNumbers[i] = byteCharacters.charCodeAt(i);
				// }
				// const byteArray = new Uint8Array(byteNumbers);
				// const blob = new Blob([byteArray], {type: info.type});
				// let data = [new ClipboardItem({ [info.type]: blob })];
				// await navigator.clipboard.write(data);
				break;
			case "cardbook.sharevCards":
				let tab1 = await messenger.compose.beginNew();
				for (let vCard of info.vCards) {
					let blob = new Blob([vCard.vCard], {type: "text;charset=utf-8"});
					let file = new File([blob], vCard.filename);
					await messenger.compose.addAttachment(tab1.id, {file: file, name: vCard.filename});
				}
				break;
			case "cardbook.emailCards":
				let tab2 = await messenger.compose.beginNew();
				let composeDetails = {};
				for (let compField of info.compFields) {
					composeDetails[compField.field] = compField.value;
				}
				messenger.compose.setComposeDetails(tab2.id, composeDetails);
				break;
			case "cardbook.conf.addProgressBar":
				await messenger.runtime.sendMessage({query: info.query, type: info.type, total: info.total, done: info.done});
				break;
			case "cardbook.openCBTab":
				break;
			case "cardbook.pref.initPrefs":
				await cardbookNewPreferences.initPrefs();
				break;
			case "cardbook.pref.getAllPrefs":
				let allPrefs = await cardbookNewPreferences.getAllPrefs();
				return allPrefs;
				break;
			case "cardbook.pref.getPrefs":
				let prefs = await cardbookNewPreferences.getPrefs(info.keys);
				return prefs;
				break;
			case "cardbook.pref.removePrefs":
				await cardbookNewPreferences.removePrefs(info.keys);
				break;
			case "cardbook.pref.setPref":
				await cardbookNewPreferences.setPref(info.key, info.value);
				break;
			case "cardbook.pref.migrateClear":
				try {
					await cardbookNewPreferences.clear();
					return "OK";
				} catch {return "KO"};
				break;
			case "cardbook.pref.migrateString":
				try {
					await cardbookNewPreferences.setPref(info.key, info.value);
					return "OK";
				} catch {return "KO"};
				break;
			case "cardbook.displayEvents":
				await messenger.runtime.sendMessage({query: info.query});
				break;
			case "cardbook.getGoogleRedirectURI":
				let redirectURI = await browser.identity.getRedirectURL();
				let hostname = (new URL(redirectURI)).hostname;
				let redirectId = hostname.split(".")[0];
				return "http://127.0.0.1/mozoauth2/" + redirectId;
			case "cardbook.getRefreshToken":
				return new Promise(async (resolve, reject) => {
					function validateState(url) {
						if (url) {
							let searchParams = url.replace(info.redirectURL, "");
							let urlParams = new URLSearchParams(searchParams);
							let code = urlParams.get("code");
							resolve(code);
						} else {
							resolve("");
						}
					}
					let authorizingURL = await browser.identity.launchWebAuthFlow({interactive: true, url: info.url}, validateState);
				});
			case "cardbook.processData.cardsLoaded":
				await messenger.runtime.sendMessage({query: info.query, winId: info.winId, displayId: info.displayId, cardsLoaded: info.cardsLoaded});
				break;
			case "cardbook.processData.toDo":
				await messenger.runtime.sendMessage({query: info.query, winId: info.winId, displayId: info.displayId, toDo: info.toDo});
				break;
			case "cardbook.processData.rowDone":
				await messenger.runtime.sendMessage({query: info.query, winId: info.winId, displayId: info.displayId, rowDone: info.rowDone});
				break;
			case "cardbook.formatData.displayCardLineTels":
				await messenger.runtime.sendMessage({query: info.query, winId: info.winId, displayId: info.displayId, record: info.record});
				break;
			case "cardbook.formatData.displayCardLineEmail":
				await messenger.runtime.sendMessage({query: info.query, winId: info.winId, displayId: info.displayId, record: info.record});
				break;
			case "cardbook.formatData.displayCardLineFields":
				await messenger.runtime.sendMessage({query: info.query, winId: info.winId, displayId: info.displayId, record: info.record});
				break;
			case "cardbook.findDuplicates.ABs":
				await messenger.runtime.sendMessage({query: info.query, winId: info.winId, displayId: info.displayId, ABids: info.ABids});
				break;
			case "cardbook.findDuplicates.cards":
				await messenger.runtime.sendMessage({query: info.query, winId: info.winId, displayId: info.displayId, cards: info.cards});
				break;
			case "cardbook.findDuplicates.finishMergeAction":
				await messenger.runtime.sendMessage({query: info.query, duplicateWinId: info.duplicateWinId, duplicateDisplayId: info.duplicateDisplayId, duplicateLineId: info.duplicateLineId});
				break;
			case "cardbook.findDuplicates.finishDeleteAction":
				await messenger.runtime.sendMessage({query: info.query, winId: info.winId, displayId: info.displayId, lineId: info.lineId});
				break;
			case "cardbook.mergeCards.closeViewCardResult":
				await messenger.runtime.sendMessage({query: info.query, ids: info.ids, action: info.action, actionId: info.actionId, duplicateWinId: info.duplicateWinId, duplicateDisplayId: info.duplicateDisplayId, duplicateLineId: info.duplicateLineId, cardOut: info.cardOut});
				break;
			case "cardbook.callFilePickerDone":
				await messenger.runtime.sendMessage({query: info.query, id: info.id, file: info.file});
				break;
			case "cardbook.callDirPickerDone":
				await messenger.runtime.sendMessage({query: info.query, id: info.id, file: info.file});
				break;
			case "cardbook.askUser.importConflictChoicePersist":
				await messenger.runtime.sendMessage({query: info.query, dirPrefId: info.dirPrefId, buttons: info.buttons});
				break;
			case "cardbook.openWindow":
				let url = browser.runtime.getURL(info.url) + "*";
				let tabs = await browser.tabs.query({url});
				if (tabs.length) {
					await browser.windows.update(tabs[0].windowId, {focused: true});
					return tabs[0].windowId;
				} else {
					let state = {};
					try {
						let winPath = info.url.split("?")[0];
						let winName = winPath.split("/").pop();
						let prefName = `window.${winName}.state`;
						let pref = await cardbookNewPreferences.getPrefs([prefName]);
						state = Object.values(pref)[0];
					} catch(e) {}
					let winParams = { ...state, type: info.type, url: info.url, allowScriptsToClose: true};
					let win = await browser.windows.create(winParams);
					return win.id;
				}
			case "cardbook.openTab": {
				let url = browser.runtime.getURL(info.url);
				let tabs = await browser.tabs.query({url});
				if (tabs.length) {
					await browser.tabs.update(tabs[0].id, {active: true});
					return tabs[0].id;
				} else {
					let tabParams = {url: url};
					let tab = await browser.tabs.create(tabParams);
					return tab.id;
				}
			}
		}
	});

	messenger.runtime.onMessage.addListener(async (info) => {
		switch (info.query) {
			case "cardbook.pref.setPref":
				await cardbookNewPreferences.setPref(info.key, info.state);
				break;
			case "cardbook.pref.setLegacyPref":
				await messenger.NotifyTools.notifyExperiment({query: info.query, key: info.key, value: info.value});
				break;
			case "cardbook.pref.removeLegacyPrefs":
				await messenger.NotifyTools.notifyExperiment({query: info.query, keys: info.keys});
				break;
			case "cardbook.openExternalURL":
				await messenger.NotifyTools.notifyExperiment({query: info.query, link: info.link});
				break;
			case "cardbook.promptConfirm":
				await messenger.NotifyTools.notifyExperiment({query: info.query, window: info.window, title: info.title, message: info.message});
				break;
			case "cardbook.promptAlert":
				await messenger.NotifyTools.notifyExperiment({query: info.query, window: info.window, title: info.title, message: info.message});
				break;
			case "cardbook.emailCards":
				let tab2 = await messenger.compose.beginNew();
				let composeDetails = {};
				for (let compField of info.compFields) {
					composeDetails[compField.field] = compField.value;
				}
				messenger.compose.setComposeDetails(tab2.id, composeDetails);
				break;
			case "cardbook.getTranslatedField":
				let translatedFields = await messenger.NotifyTools.notifyExperiment({query: info.query, value: info.value, locale: info.locale});
				return translatedFields;
			case "cardbook.getCardFromEmail":
				let card = await messenger.NotifyTools.notifyExperiment({query: info.query, email: info.email, dirPrefId: info.dirPrefId});
				return card;
			case "cardbook.getCardRegion":
				let region = await messenger.NotifyTools.notifyExperiment({query: info.query, card: info.card});
				return region;
			case "cardbook.getNextAndPreviousCard": {
				let cards = await messenger.NotifyTools.notifyExperiment({query: info.query, cbid: info.cbid});
				return cards;
			}
			case "cardbook.getAllAvailableColumns":
				let columns = await messenger.NotifyTools.notifyExperiment({query: info.query, mode: info.mode});
				return columns;
			case "cardbook.pref.preferencesChanged":
				await messenger.NotifyTools.notifyExperiment({query: "cardbook.notifyObserver", value: info.query});
				break;
			case "cardbook.notifyObserver":
				await messenger.NotifyTools.notifyExperiment({query: info.query, value: info.value, params: info.params});
				break;
			case "cardbook.formatAddress":
				let data = await messenger.NotifyTools.notifyExperiment({query: info.query, address: info.address, addressFormula: info.addressFormula});
				return data;
			case "cardbook.getSupportedConnections":
				let supportedConnections = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return supportedConnections;
			case "cardbook.getUUID":
				let uuid = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return uuid;
				case "cardbook.getCardbookOAuthData":
				let oauthdata = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return oauthdata;
			case "cardbook.getCardbookComplexSearch":
				let cardbookComplexSearch = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return cardbookComplexSearch;
			case "cardbook.getCardbookServerValidation":
				let cardbookServerValidation = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return cardbookServerValidation;
			case "cardbook.getCardbookServerDiscoveryRequest":
				let cardbookServerDiscoveryRequest = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return cardbookServerDiscoveryRequest;
			case "cardbook.getCardbookServerDiscoveryResponse":
				let cardbookServerDiscoveryResponse = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return cardbookServerDiscoveryResponse;
			case "cardbook.getCardbookServerDiscoveryError":
				let cardbookServerDiscoveryError = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return cardbookServerDiscoveryError;
			case "cardbook.getCardbookRefreshTokenRequest":
				let cardbookRefreshTokenRequest = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return cardbookRefreshTokenRequest;
			case "cardbook.getCardbookRefreshTokenResponse":
				let cardbookRefreshTokenResponse = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return cardbookRefreshTokenResponse;
			case "cardbook.getCardbookRefreshTokenError":
				let cardbookRefreshTokenError = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return cardbookRefreshTokenError;
			case "cardbook.getSlashedUrl":
				let slashedUrl = await messenger.NotifyTools.notifyExperiment({query: info.query, url: info.url});
				return slashedUrl;
			case "cardbook.getWellKnownUrl":
				let wellKnownUrl = await messenger.NotifyTools.notifyExperiment({query: info.query, url: info.url});
				return wellKnownUrl;
			case "cardbook.decodeURL":
				let decodedURL = await messenger.NotifyTools.notifyExperiment({query: info.query, url: info.url});
				return decodedURL;
			case "cardbook.callDirPicker":
				messenger.NotifyTools.notifyExperiment({query: info.query, id: info.id, title: info.title});
				break;
			case "cardbook.callFilePicker":
				messenger.NotifyTools.notifyExperiment({query: info.query, id: info.id, result: info.result, title: info.title, mode: info.mode, type: info.type, defaultFileName: info.defaultFileName, content: info.content});
				break;
			case "cardbook.isFileAlreadyOpen":
			case "cardbook.isDirectoryAlreadyOpen":
				let isAlreadyOpen = await messenger.NotifyTools.notifyExperiment({query: info.query, path: info.path});
				return isAlreadyOpen;
			case "cardbook.initMultipleOperations":
			case "cardbook.finishMultipleOperations":
			case "cardbook.initDiscoveryOperations":
			case "cardbook.stopDiscoveryOperations":
			case "cardbook.updateServerSyncRequest":
				await messenger.NotifyTools.notifyExperiment({query: info.query, dirPrefId: info.dirPrefId});
				break;
			case "cardbook.initServerValidation":
				await messenger.NotifyTools.notifyExperiment({query: info.query, dirPrefId: info.dirPrefId, user: info.user});
				break;
			case "cardbook.fromValidationToArray":
				let accounts = await messenger.NotifyTools.notifyExperiment({query: info.query, dirPrefId: info.dirPrefId, type: info.type});
				return accounts;
			case "cardbook.requestNewRefreshTokenForGooglePeople":
				await messenger.NotifyTools.notifyExperiment({query: info.query, connection: info.connection, callback: info.callback, followAction: info.followAction});
				break;
			case "cardbook.validateWithDiscovery":
				await messenger.NotifyTools.notifyExperiment({query: info.query, connection: info.connection});
				break;
			case "cardbook.validateWithoutDiscovery":
				await messenger.NotifyTools.notifyExperiment({query: info.query, connection: info.connection, type: info.type, params: info.params});
				break;
			case "cardbook.discoverPhase1":
				await messenger.NotifyTools.notifyExperiment({query: info.query, connection: info.connection, type: info.type, params: info.params});
				break;
			case "cardbook.updateStatusProgressInformation":
				await messenger.NotifyTools.notifyExperiment({query: info.query, string: info.string, error: info.error});
				break;
			case "cardbook.getCardValueByField":
				let cardValue = await messenger.NotifyTools.notifyExperiment({query: info.query, card: info.card, field: info.field, includePref: info.includePref});
				return cardValue;
			case "cardbook.setCardValueByField": {
				let card = await messenger.NotifyTools.notifyExperiment({query: info.query, card: info.card, field: info.field, value: info.value});
				return card;
			}
			case "cardbook.getMembersFromCard":
				let members = await messenger.NotifyTools.notifyExperiment({query: info.query, card: info.card});
				return members;
			case "cardbook.getImage":
				let image = await messenger.NotifyTools.notifyExperiment({query: info.query, field: info.field, dirName: info.dirName, cardId: info.cardId, cardName: info.cardName});
				return image;
			case "cardbook.getCardParser":
				let newCard = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return newCard;
			case "cardbook.mergeCards.viewCardResult":
				await messenger.NotifyTools.notifyExperiment({query: info.query, source: info.source, ids: info.ids, duplicateWinId: info.duplicateWinId, duplicateDisplayId: info.duplicateDisplayId, duplicateLineId: info.duplicateLineId, actionId: info.actionId, card: info.card, hideCreate: info.hideCreate});
				break;
			case "cardbook.mergeCards.mergeFinished":
				await messenger.NotifyTools.notifyExperiment({query: info.query, source: info.source, ids: info.ids, duplicateWinId: info.duplicateWinId, duplicateDisplayId: info.duplicateDisplayId, duplicateLineId: info.duplicateLineId, action: info.action, actionId: info.actionId, cardOut: info.cardOut, mergeId: info.mergeId});
				break;
			case "cardbook.formatStringForOutput":
				await messenger.NotifyTools.notifyExperiment({query: info.query, string: info.string, values: info.values, error: info.error});
				break;
			case "cardbook.getCollectedStandardAB":
				let collectedAB = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return collectedAB;
			case "cardbook.getLDAPStandardAB":
				let localAB = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return localAB;
			case "cardbook.getRemoteStandardAB":
				let remoteAB = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return remoteAB;
			case "cardbook.getFn":
				let fn = await messenger.NotifyTools.notifyExperiment({query: info.query, id: info.id});
				return fn;
			case "cardbook.getTypes":
				let types = await messenger.NotifyTools.notifyExperiment({query: info.query, ABType: info.ABType, type: info.type, reset: info.reset});
				return types;
			case "cardbook.getPassword":
				let pwd = await messenger.NotifyTools.notifyExperiment({query: info.query, user: info.user, url: info.url});
				return pwd;
			case "cardbook.getDomainPassword":
				let domain = await messenger.NotifyTools.notifyExperiment({query: info.query, domain: info.domain});
				return domain;
			case "cardbook.removePassword":
				await messenger.NotifyTools.notifyExperiment({query: info.query, user: info.user, url: info.url});
				break;
			case "cardbook.rememberPassword":
				await messenger.NotifyTools.notifyExperiment({query: info.query, user: info.user, url: info.url, pwd: info.pwd, save: info.save});
				break;
			case "cardbook.getCountries":
				let countries = await messenger.NotifyTools.notifyExperiment({query: info.query, useCodeValues: info.useCodeValues});
				return countries;
			case "cardbook.getCards":
				let cards = await messenger.NotifyTools.notifyExperiment({query: info.query, cbids: info.cbids});
				return cards;
			case "cardbook.openTemplate":
				await messenger.NotifyTools.notifyExperiment({query: info.query, content: info.content});
				break;
			case "cardbook.getEditionFields":
				let editionFields = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return editionFields;
			case "cardbook.getAllURLsToDiscover":
				let urls = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return urls;
			case "cardbook.syncWithLightning":
				await messenger.NotifyTools.notifyExperiment({query: info.query});
				break;
			case "cardbook.getBirthdaysListLength":
				let birthdaysListLength = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return birthdaysListLength;
			case "cardbook.getCalendarsListLength":
				let calendarsListLength = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return calendarsListLength;
			case "cardbook.getBirthdaySyncResult":
				let birthdaysSyncResult = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return birthdaysSyncResult;
			case "cardbook.getEvents":
				let events = await messenger.NotifyTools.notifyExperiment({query: info.query, emails: info.emails, column: info.column, order: info.order});
				return events;
			case "cardbook.editEvent":
				await messenger.NotifyTools.notifyExperiment({query: info.query, eventId: info.eventId, calendarId: info.calendarId});
				break;
			case "cardbook.createEvent":
				await messenger.NotifyTools.notifyExperiment({query: info.query, emails: info.emails, displayName: info.displayName});
				break;
			case "cardbook.getCalendars":
				let calendars = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return calendars;
			case "cardbook.getBirthdays":
				let birthdays = await messenger.NotifyTools.notifyExperiment({query: info.query, days: info.days});
				return birthdays;
			case "cardbook.getCoreTypes":
				let coreTypes = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return coreTypes;
			case "cardbook.getABs":
				let ABs = await messenger.NotifyTools.notifyExperiment({query: info.query, exclusive: info.exclusive, includeReadOnly: info.includeReadOnly,
																			includeSearch: info.includeSearch,
																			includeDisabled: info.includeDisabled,
																			exclRestrictionList: info.exclRestrictionList,
																			inclRestrictionList: info.inclRestrictionList});
				return ABs;
			case "cardbook.getCategories":
				let categories = await messenger.NotifyTools.notifyExperiment({query: info.query, defaultPrefId: info.defaultPrefId,
																				inclRestrictionList: info.inclRestrictionList,
																				exclRestrictionList: info.exclRestrictionList});
				return categories;
			case "cardbook.getContacts":
				let contacts = await messenger.NotifyTools.notifyExperiment({query: info.query, dirPrefId: info.dirPrefId});
				return contacts;
			case "cardbook.changePrefEmail":
				await messenger.NotifyTools.notifyExperiment({query: info.query, value: info.value});
				break;
			case "cardbook.decryptDBs":
			case "cardbook.encryptDBs":
				await messenger.NotifyTools.notifyExperiment({query: info.query});
				break;
			case "cardbook.getEncryptorVersion":
				let version = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return version;
			case "cardbook.getGoogleOAuthURLForGooglePeople":
				let oauthURL = await messenger.NotifyTools.notifyExperiment({query: info.query, email: info.email, type: info.type});
				return oauthURL;
			case "cardbook.getvCard":
				let vCard = await messenger.NotifyTools.notifyExperiment({query: info.query, dirPrefId: info.dirPrefId, contactId: info.contactId});
				return vCard;
			case "cardbook.searchForWrongCards":
				let found = messenger.NotifyTools.notifyExperiment({query: info.query, dirPrefId: info.dirPrefId});
				return found;
			case "cardbook.cloneCard":
				let cardOut = await messenger.NotifyTools.notifyExperiment({query: info.query, cardIn: info.cardIn, cardOut: info.cardOut});
				return cardOut;
			case "cardbook.cardbookPreferDisplayNameIndex":
				let index = await messenger.NotifyTools.notifyExperiment({query: info.query, email: info.email});
				return index;
			case "cardbook.cardToVcardData": {
				let vCard = await messenger.NotifyTools.notifyExperiment({query: info.query, card: info.card});
				return vCard
			}
			case "cardbook.writePossibleCustomFields":
				await messenger.NotifyTools.notifyExperiment({query: info.query});
				break;
			case "cardbook.getPossibleCustomFields":
				let possibleCustomFields = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return possibleCustomFields;
			case "cardbook.getCardParser":
				let cardParser = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return cardParser;
			case "cardbook.convertVCards":
				await messenger.NotifyTools.notifyExperiment({query: info.query, dirPrefId: info.dirPrefId, initialVCardVersion: info.initialVCardVersion});
				break;
			case "cardbook.formatData.getCards":
				await messenger.NotifyTools.notifyExperiment({query: info.query, dirPrefId: info.dirPrefId, fields: info.fields, winId: info.winId, displayId: info.displayId});
				break;
			case "cardbook.formatData.saveCards":
				await messenger.NotifyTools.notifyExperiment({query: info.query, results: info.results, dirPrefId: info.dirPrefId, fields: info.fields, winId: info.winId, displayId: info.displayId, scopeName: info.scopeName});
				break;
			case "cardbook.findDuplicates.getCards":
				await messenger.NotifyTools.notifyExperiment({query: info.query, dirPrefId: info.dirPrefId, state: info.state, winId: info.winId, displayId: info.displayId});
				break;
			case "cardbook.findDuplicates.mergeOne":
				await messenger.NotifyTools.notifyExperiment({query: info.query, record: info.record, actionId: info.actionId, sourceCat: info.sourceCat, targetCat: info.targetCat});
				break;
			case "cardbook.findDuplicates.getDuplidateIndex":
				let duplicate = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return duplicate;
			case "cardbook.findDuplicates.addDuplidateIndex":
				await messenger.NotifyTools.notifyExperiment({query: info.query, uids: info.uids});
				break;
			case "cardbook.findDuplicates.deleteCardsAndValidate":
				await messenger.NotifyTools.notifyExperiment({query: info.query, winId: info.winId, displayId: info.displayId, lineId: info.lineId, cards: info.cards});
				break;
			case "cardbook.processData.setDisplayId":
				await messenger.NotifyTools.notifyExperiment({query: info.query, winId: info.winId, displayId: info.displayId});
				break;
			case "cardbook.startAction":
				let actionId = await messenger.NotifyTools.notifyExperiment({query: info.query, topic: info.topic});
				return actionId;
			case "cardbook.endAction":
				await messenger.NotifyTools.notifyExperiment({query: info.query, actionId: info.actionId});
				break;
			case "cardbook.getAdrElements":
				let adrElements = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return adrElements;
			case "cardbook.getAllColumns":
				let allColumns = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return allColumns;
			case "cardbook.getCustomFields":
				let customFields = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return customFields;
			case "cardbook.getMultilineFields":
				let multilineFields = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return multilineFields;
			case "cardbook.isMyAccountRemote":
				let remote = await messenger.NotifyTools.notifyExperiment({query: info.query, type: info.type});
				return remote;
			case "cardbook.applyFormulaToAllAB":
				await messenger.NotifyTools.notifyExperiment({query: info.query, formula: info.formula});
				break;
			case "cardbook.removePeriodicSync":
				await messenger.NotifyTools.notifyExperiment({query: info.query, dirPrefId: info.dirPrefId, name: info.name});
				break;
			case "cardbook.addPeriodicSync":
				await messenger.NotifyTools.notifyExperiment({query: info.query, dirPrefId: info.dirPrefId, name: info.name, interval: info.interval});
				break;
			case "cardbook.getStatusInformation":
				let statusInformation = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return statusInformation;
			case "cardbook.flushStatusInformation":
				await messenger.NotifyTools.notifyExperiment({query: info.query});
				break;
			case "cardbook.setStatusInformation":
				await messenger.NotifyTools.notifyExperiment({query: info.query, value: info.value});
				break;
			case "cardbook.getCurrentActions":
				let actions = await messenger.NotifyTools.notifyExperiment({query: info.query});
				return actions;
			case "cardbook.disableShortSearch":
			case "cardbook.enableShortSearch":
			case "cardbook.setDefaultImppTypes":
			case "cardbook.loadCustoms":
				await messenger.NotifyTools.notifyExperiment({query: info.query});
				break;
			case "cardbook.getNodesForCreation":
				let cats = await messenger.NotifyTools.notifyExperiment({query: info.query, type: info.type, name: info.name, id: info.id, dirPrefId: info.dirPrefId});
				return cats;
			case "cardbook.askUser.sendChoice":
				await messenger.NotifyTools.notifyExperiment({query: info.query, dirPrefId: info.dirPrefId, buttons: info.buttons, message: info.message, result: info.result, confirm: info.confirm});
				break;
			case "cardbook.openWindow":
				let url = browser.runtime.getURL(info.url) + "*";
				let tabs = await browser.tabs.query({url});
				if (tabs.length) {
					await browser.windows.update(tabs[0].windowId, {focused:true});
					return tabs[0].windowId;
				} else {
					let state = {};
					try {
						let winPath = info.url.split("?")[0];
						let winName = winPath.split("/").pop();
						let prefName = `window.${winName}.state`;
						let pref = await cardbookNewPreferences.getPrefs([prefName]);
						state = Object.values(pref)[0];
					} catch(e) {}
					let winParams = { ...state, type: info.type, url: info.url, allowScriptsToClose: true};
					let win = await browser.windows.create(winParams);
					return win.id;
				}
			}
	});

	// init WindowListener
	messenger.WindowListener.registerChromeUrl([ ["content", "cardbook", "chrome/content/"] ]);
	
	// register a script which is called upon add-on unload (to unload any JSM loaded via overlays)
	messenger.WindowListener.registerShutdownScript("chrome://cardbook/content/scripts/unload.js");
	
	// master password
	await messenger.WindowListener.waitForMasterPassword();
	
	// startup
	messenger.WindowListener.registerStartupScript("chrome://cardbook/content/cardbookInit.js");
	
	// support for customizing toolbars
	messenger.WindowListener.registerWindow("chrome://messenger/content/customizeToolbar.xhtml", "chrome://cardbook/content/customizeToolbar/wl_customizeToolbar.js");

	// about message (contextual menus)
	messenger.WindowListener.registerWindow("about:message", "chrome://cardbook/content/wl_cardbookAboutMessage.js");
	
	// about 3 panes (quick filter bar)
	messenger.WindowListener.registerWindow("about:3pane", "chrome://cardbook/content/wl_cardbookAbout3Pane.js");
	
	// support for CardBook, yellow stars, creation from emails, formatting email fields
	messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome://cardbook/content/wl_cardbookMessenger.js");

	// support for the message window
	messenger.WindowListener.registerWindow("chrome://messenger/content/messageWindow.xhtml", "chrome://cardbook/content/wl_cardbookMessenger.js");
	
	// support for Lightning attendees
	messenger.WindowListener.registerWindow("chrome://calendar/content/calendar-event-dialog-attendees.xhtml", "chrome://cardbook/content/lightning/wl_lightningAttendees.js");
	
	// support for Contacts sidebar
	// support for attaching a vCard
	// support for attaching lists
	// support for CardBook menu in composition window
	messenger.WindowListener.registerWindow("chrome://messenger/content/messengercompose/messengercompose.xhtml", "chrome://cardbook/content/composeMsg/wl_composeMsg.js");
	
	// // support for filter messages
	messenger.DomContentScript.registerWindow("chrome://messenger/content/FilterEditor.xhtml", "chrome://cardbook/content/filters/cardbookFilterAction.js");
	messenger.DomContentScript.registerWindow("chrome://messenger/content/SearchDialog.xhtml", "chrome://cardbook/content/filters/cardbookFilterAction.js");
	messenger.DomContentScript.registerWindow("chrome://messenger/content/mailViewSetup.xhtml", "chrome://cardbook/content/filters/cardbookFilterAction.js");
	messenger.DomContentScript.registerWindow("chrome://messenger/content/virtualFolderProperties.xhtml", "chrome://cardbook/content/filters/cardbookFilterAction.js");

	messenger.WindowListener.startListening();

	async function externalListener(message, sender, sendResponse) {
		if (message?.query) {
			switch (message.query) {
				// mailmerge@example.net
				case "mailmerge.getAddressBooks":
				case "mailmerge.getContacts":
					let mailmergeData = await messenger.NotifyTools.notifyExperiment(message);
					return mailmergeData;
				// simplemailredirection@ggbs.de
				case "simpleMailRedirection.version":
				case "simpleMailRedirection.getAddressBooks":
				case "simpleMailRedirection.lists":
				case "simpleMailRedirection.contacts":
				case "simpleMailRedirection.openBook":
					let simpleMailRedirectionData = await messenger.NotifyTools.notifyExperiment(message);
					return simpleMailRedirectionData;
				// smarttemplate4@thunderbird.extension
				case "smartTemplates.getContactsFromMail":
				case "smartTemplates.getAccounts":
					let smartTemplatesData = await messenger.NotifyTools.notifyExperiment(message);
					return smartTemplatesData;
			}
			return {};
		}
	}
	messenger.runtime.onMessageExternal.addListener(externalListener);

	messenger.compose.onBeforeSend.addListener(async (tab, details) => {
		for (let field of ["to", "cc", "bcc"]) {
			if (details[field].length) {
				for (let address of details[field]) {
					await messenger.NotifyTools.notifyExperiment({query: "cardbook.addToCollected", identityId: details.identityId, address: address});
					await messenger.NotifyTools.notifyExperiment({query: "cardbook.addToPopularity", address: address});
				}
			}
		}

		await messenger.NotifyTools.notifyExperiment({query: "cardbook.getvCards", identityId: details.identityId})
		.then( async (vCards) => {
			if (vCards) {
				for (let vCard of vCards) {
					let blob = new Blob([vCard.vCard], {type: "text;charset=utf-8"});
					let file = new File([blob], vCard.filename);
					await messenger.compose.addAttachment(tab.id, {file: file, name: vCard.filename});
				}
			}
		});
	});

	messenger.compose.onIdentityChanged.addListener(async (tab, identityId) => {
		messenger.NotifyTools.notifyExperiment({query: "cardbook.identityChanged", windowId: tab.windowId, identityId: identityId});
	});

	browser.browserAction.onClicked.addListener(() => {
		messenger.NotifyTools.notifyExperiment({query: "cardbook.openCBTab"});
	});

	browser.composeAction.onClicked.addListener(() => {
		messenger.NotifyTools.notifyExperiment({query: "cardbook.openCBTab"});
	});

	messenger.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
		function addSubMenus(aMenuId, aABs) {
			for (let account of aABs) {
				let menuProps = {
					onclick: async (event) => {
						let subMenuId = event.menuItemId;
						let parentMenuId = event.parentMenuItemId;
						let dirPrefId = subMenuId.replace(`${parentMenuId}-`, "")
						if (event.linkUrl && event.linkUrl.includes("mailto:")) {
							let email = event.linkUrl.replace("mailto:", "");
							await messenger.NotifyTools.notifyExperiment({query: "cardbook.addEmail", dirPrefId: dirPrefId, email: email, fn: event.linkText});
						} else if (event.attachments) {
							for (let attachment of event.attachments) {
								await messenger.NotifyTools.notifyExperiment({query: "cardbook.addAttachments", attachment: attachment, dirPrefId: dirPrefId});
							}
						}
					},
					enabled: true,
					id: `${aMenuId}-${account[1]}`,
					parentId: aMenuId,
					title: account[0]
				}
				messenger.menus.create(menuProps);
			}
		}

		let tabs = await browser.tabs.query({type: "mail"});
		let displayedMessage = await browser.messageDisplay.getDisplayedMessage(tabs[0].id);
		let accountId = displayedMessage.folder.accountId;
		let accounts = await messenger.accounts.list();
		let identity = accounts.filter(x => x.id == accountId)[0].identities[0]?.email;
		let ABsWithIdentity = await messenger.NotifyTools.notifyExperiment({query: "cardbook.getABsWithIdentity", identity: identity});

		let menuId = "addToCardBookMenu";
		let menuAttId = "addAttToCardBookMenu";
		let menuAllAttId = "addAllAttToCardBookMenu";
		messenger.menus.remove(menuId);
		messenger.menus.remove(menuAttId);
		messenger.menus.remove(menuAllAttId);
		if (!ABsWithIdentity.length) {
			return;
		}

		// add contacts for links
		let menuLabel = messenger.i18n.getMessage("addToCardBookMenuLabel");
		let menuProps = {
			contexts: ["link"],
			icons: "chrome/content/skin/cardbook.svg",
			enabled: true,
			id: menuId,
			title: menuLabel
		}
		messenger.menus.create(menuProps);
		addSubMenus(menuId, ABsWithIdentity);

		// add attachment import
		let attachments = await browser.messages.listAttachments(displayedMessage.id);
		let interestingAtt = attachments.some(x => {
			let extension = x.name.split(".").pop();
			return (extension.toLowerCase() == "vcf")
		});
		if (!interestingAtt) {
			return;
		}

		let menuAttLabel = messenger.i18n.getMessage("addAttachementToCardBookMenuLabel");
		let menuAttProps = {
			contexts: ["message_attachments"],
			icons: "chrome/content/skin/cardbook.svg",
			enabled: true,
			id: menuAttId,
			title: menuAttLabel
		}
		messenger.menus.create(menuAttProps);
		addSubMenus(menuAttId, ABsWithIdentity);

		let menuAllAttLabel = messenger.i18n.getMessage("addAllAttachementsToCardBookMenuLabel");
		let menuAllAttProps = {
			contexts: ["all_message_attachments"],
			icons: "chrome/content/skin/cardbook.svg",
			enabled: true,
			id: menuAllAttId,
			title: menuAllAttLabel
		}
		messenger.menus.create(menuAllAttProps);
		addSubMenus(menuAllAttId, ABsWithIdentity);
	});

	/*messenger.addressBooks.provider.onSearchRequest.addListener(
		async (node, searchString, query) => {
			return {
				isCompleteResult: true,
				// Return an array of ContactProperties as results.
				results: await messenger.NotifyTools.notifyExperiment({query: "cardbook.provider", searchString: searchString})
			};
		},
		{
			addressBookName: "CardBook",
			isSecure: true,
		}
	);*/

};

main();
