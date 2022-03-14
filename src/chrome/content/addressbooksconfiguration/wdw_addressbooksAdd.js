if ("undefined" == typeof(wdw_addressbooksAdd)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ABAddNotification = {};
	XPCOMUtils.defineLazyGetter(ABAddNotification, "localPageURINotifications", () => {
		return new MozElements.NotificationBox(element => {
			element.setAttribute("flex", "1");
			document.getElementById("localPageURINotificationsHbox").append(element);
		});
	});
	XPCOMUtils.defineLazyGetter(ABAddNotification, "resultNotifications", () => {
		return new MozElements.NotificationBox(element => {
			element.setAttribute("flex", "1");
			document.getElementById("resultNotificationsHbox").append(element);
		});
	});

	var wdw_addressbooksAdd = {

		gRunningDirPrefId: [],
		gFile: {},
		gCardDAVURLs: [],
		// [ [ AB type, URL, username, AB name, vCard version, AB type action, source id, collected true|false] ]
		gAccountsFound: [],
		gFinishParams: [],
		gValidateURL: false,
		gValidateDescription: "Validation module",
		gSearchDefinition: {},
		gFirstFirstStepDone: false,
		
		lTimerRefreshTokenAll: {},
		lTimerDiscoveryAll: {},

		initSearchDefinition: function () {
			if (window.arguments[0].dirPrefId && cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId]) {
				wdw_addressbooksAdd.gSearchDefinition.searchAB = cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId].searchAB;
			} else {
				wdw_addressbooksAdd.gSearchDefinition.searchAB = true;
			}
			if (window.arguments[0].dirPrefId && cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId]) {
				wdw_addressbooksAdd.gSearchDefinition.matchAll = cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId].matchAll;
			} else {
				wdw_addressbooksAdd.gSearchDefinition.matchAll = true;
			}
			if (window.arguments[0].dirPrefId && cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId]) {
				wdw_addressbooksAdd.gSearchDefinition.rules = JSON.parse(JSON.stringify(cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId].rules));
			} else {
				wdw_addressbooksAdd.gSearchDefinition.rules = [{case: "", field: "", term: "", value: ""}];
			}
		},
		
		initWizardEvents: function () {
			document.addEventListener("wizardfinish", wdw_addressbooksAdd.closeWizard);
			document.addEventListener("wizardcancel", wdw_addressbooksAdd.cancelWizard);

			let welcomePage = document.getElementById("welcomePage");
			welcomePage.addEventListener("pageshow", wdw_addressbooksAdd.welcomePageShow);
			welcomePage.addEventListener("pageadvanced", wdw_addressbooksAdd.loadStandardAddressBooks);
			let initialPage = document.getElementById("initialPage");
			initialPage.addEventListener("pageshow", wdw_addressbooksAdd.initialPageShow);
			initialPage.addEventListener("pageadvanced", wdw_addressbooksAdd.initialPageAdvance);
			let localPage = document.getElementById("localPage");
			localPage.addEventListener("pageshow", wdw_addressbooksAdd.checkRequired);
			localPage.addEventListener("pageadvanced", wdw_addressbooksAdd.localPageAdvance);
			let remotePage = document.getElementById("remotePage");
			remotePage.addEventListener("pageshow", wdw_addressbooksAdd.remotePageShow);
			remotePage.addEventListener("pageadvanced", wdw_addressbooksAdd.remotePageAdvance);
			let searchPage = document.getElementById("searchPage");
			searchPage.addEventListener("pageshow", wdw_addressbooksAdd.checkSearch);
			searchPage.addEventListener("pageadvanced", wdw_addressbooksAdd.searchPageAdvance);
			let searchNamePage = document.getElementById("searchNamePage");
			searchNamePage.addEventListener("pageshow", wdw_addressbooksAdd.loadSearchName);
			searchNamePage.addEventListener("pageadvanced", wdw_addressbooksAdd.prepareSearchAddressbook);
			let findPage = document.getElementById("findPage");
			findPage.addEventListener("pageshow", wdw_addressbooksAdd.loadFinds);
			findPage.addEventListener("pageadvanced", wdw_addressbooksAdd.findAdvance);
			let namesPage = document.getElementById("namesPage");
			namesPage.addEventListener("pageshow", wdw_addressbooksAdd.loadNames);
			namesPage.addEventListener("pageadvanced", wdw_addressbooksAdd.namesAdvance);
			let finishFirstPage = document.getElementById("finishFirstPage");
			finishFirstPage.addEventListener("pageshow", wdw_addressbooksAdd.finishFirstPageShow);
			let finishPage = document.getElementById("finishPage");
			finishPage.addEventListener("pageshow", wdw_addressbooksAdd.finishPageShow);
		},
		
		loadWizard: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			wdw_addressbooksAdd.initWizardEvents();

			if (window.arguments[0].action == "first") {
				if (!cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive")) {
					document.getElementById('addressbook-wizard').goTo("welcomePage");
				} else {
					document.getElementById('addressbook-wizard').goTo("findPage");
				}
			} else if (window.arguments[0].action == "search") {
				wdw_addressbooksAdd.initSearchDefinition();
				document.getElementById('addressbook-wizard').goTo("searchPage");
			} else if (window.arguments[0].action == "discovery") {
				wdw_addressbooksAdd.gAccountsFound = window.arguments[0].accountsToAdd;
				document.getElementById('addressbook-wizard').goTo("namesPage");
			} else {
				document.getElementById('addressbook-wizard').goTo("initialPage");
			}
		},

		loadStandardAddressBooks: function () {
			var contactManager = MailServices.ab;
			var contacts = contactManager.directories;
			while ( contacts.hasMoreElements() ) {
				var contact = contacts.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
				if (contact.dirPrefId == "ldap_2.servers.history") {
					wdw_addressbooksAdd.gAccountsFound.push(["STANDARD", "", "", contact.dirName, cardbookRepository.supportedVersion, "", contact.dirPrefId, true]);
				} else {
					wdw_addressbooksAdd.gAccountsFound.push(["STANDARD", "", "", contact.dirName, cardbookRepository.supportedVersion, "", contact.dirPrefId, false]);
				}
			}
		},

		checkRequired: function () {
			var canAdvance = true;
			var curPage = document.getElementById('addressbook-wizard').currentPage;
			if (curPage) {
				let eList = curPage.getElementsByAttribute('required', 'true');
				for (let i = 0; i < eList.length && canAdvance; ++i) {
					canAdvance = (eList[i].value != "");
				}
				document.getElementById('addressbook-wizard').canAdvance = canAdvance;
			}
		},

		checkFindLinesRequired: function () {
			var canAdvance = false;
			var i = 0;
			while (true) {
				if (document.getElementById('findPageValidateButton' + i)) {
					if (document.getElementById('findPageValidateButton' + i).getAttribute('validated') == "true") {
						canAdvance = true;
						break;
					}
					i++;
				} else {
					break;
				}
			}
			document.getElementById('addressbook-wizard').canAdvance = canAdvance;
		},

		checkNamesLinesRequired: function () {
			var canAdvance = true;
			var oneChecked = false;
			var i = 0;
			while (true) {
				if (document.getElementById('namesCheckbox' + i)) {
					var aCheckbox = document.getElementById('namesCheckbox' + i);
					var aAddressbookName = document.getElementById('namesTextbox' + i);
					if (aCheckbox.checked) {
						oneChecked = true;
						 if (aAddressbookName.value == "") {
						 	 canAdvance = false;
						 	 break;
						 }
					}
					i++;
				} else {
					break;
				}
			}
			if (window.arguments[0].action == "first") {
				document.getElementById('addressbook-wizard').canAdvance = ((canAdvance && oneChecked) || !oneChecked);
			} else {
				document.getElementById('addressbook-wizard').canAdvance = (canAdvance && oneChecked);
			}
		},

		welcomePageShow: function () {
			document.getElementById('addressbook-wizard').canAdvance = true;
		},

		initialPageShow: function () {
			wdw_addressbooksAdd.gAccountsFound = [];
			wdw_addressbooksAdd.checkRequired();
		},

		initialPageAdvance: function () {
			var type = document.getElementById('addressbookType').value;
			var page = document.getElementsByAttribute('pageid', 'initialPage')[0];
			if (type == 'local') {
				page.next = 'localPage';
			} else if (type == 'remote') {
				page.next = 'remotePage';
			} else if (type == 'standard') {
				wdw_addressbooksAdd.loadStandardAddressBooks();
				page.next = 'namesPage';
			} else if (type == 'find') {
				page.next = 'findPage';
			} else if (type == 'search') {
				wdw_addressbooksAdd.initSearchDefinition();
				page.next = 'searchPage';
			}
		},

		localPageSelect: function () {
			document.getElementById('localPageURI').value = "";
			var type = document.getElementById('localPageType').value;
			if (type == "createDB") {
				document.getElementById('localPageURI').setAttribute('required', 'false');
				document.getElementById('localPageURILabel').setAttribute('disabled', 'true');
				document.getElementById('localPageURI').setAttribute('disabled', 'true');
				document.getElementById('localPageURIButton').setAttribute('disabled', 'true');
			} else {
				document.getElementById('localPageURI').setAttribute('required', 'true');
				document.getElementById('localPageURILabel').setAttribute('disabled', 'false');
				document.getElementById('localPageURI').setAttribute('disabled', 'false');
				document.getElementById('localPageURIButton').setAttribute('disabled', 'false');
			}
			wdw_addressbooksAdd.checkRequired();
		},

		localPageAdvance: function () {
			wdw_addressbooksAdd.gAccountsFound = [];
			var type = document.getElementById('localPageType').value;
			switch(type) {
				case "createDB":
					wdw_addressbooksAdd.gAccountsFound.push(["LOCALDB",
																"",
																"",
																"",
																cardbookRepository.supportedVersion,
																"",
																"",
																false]);
					break;
				case "createDirectory":
					wdw_addressbooksAdd.gAccountsFound.push(["DIRECTORY",
																"",
																"",
																wdw_addressbooksAdd.gFile.leafName,
																cardbookRepository.supportedVersion,
																"CREATEDIRECTORY",
																"",
																false]);
					break;
				case "createFile":
					wdw_addressbooksAdd.gAccountsFound.push(["FILE",
																"",
																"",
																wdw_addressbooksAdd.gFile.leafName,
																cardbookRepository.supportedVersion,
																"CREATEFILE",
																"",
																false]);
					break;
				case "openDirectory":
					wdw_addressbooksAdd.gAccountsFound.push(["DIRECTORY",
																"",
																"",
																wdw_addressbooksAdd.gFile.leafName,
																cardbookRepository.supportedVersion,
																"OPENDIRECTORY",
																"",
																false]);
					break;
				case "openFile":
					wdw_addressbooksAdd.gAccountsFound.push(["FILE",
																"",
																"",
																wdw_addressbooksAdd.gFile.leafName,
																cardbookRepository.supportedVersion,
																"OPENFILE",
																"",
																false]);
					break;
			}
		},

		searchFile: function () {
			cardbookNotifications.setNotification(ABAddNotification.localPageURINotifications, "OK");
			var type = document.getElementById('localPageType').value;
			switch(type) {
				case "createDirectory":
				case "openDirectory":
				case "standard":
					cardbookWindowUtils.callDirPicker("dirChooseTitle", wdw_addressbooksAdd.checkFile);
					break;
				case "createFile":
					cardbookWindowUtils.callFilePicker("fileCreationVCFTitle", "SAVE", "VCF", "", "", wdw_addressbooksAdd.checkFile);
					break;
				case "openFile":
					cardbookWindowUtils.callFilePicker("fileSelectionVCFTitle", "OPEN", "VCF", "", "", wdw_addressbooksAdd.checkFile);
					break;
			}
		},

		checkFile: function (aFile) {
			var myTextbox = document.getElementById('localPageURI');
			var type = document.getElementById('localPageType').value;
			if (aFile) {
				if (type == 'openFile' || type == 'createFile') {
					if (cardbookRepository.cardbookUtils.isFileAlreadyOpen(aFile.path)) {
						cardbookNotifications.setNotification(ABAddNotification.localPageURINotifications, "fileAlreadyOpen", [aFile.path]);
					} else {
						myTextbox.value = aFile.path;
						wdw_addressbooksAdd.gFile = aFile;
					}
				} else {
					if (cardbookRepository.cardbookUtils.isDirectoryAlreadyOpen(aFile.path)) {
						cardbookNotifications.setNotification(ABAddNotification.localPageURINotifications, "directoryAlreadyOpen", [aFile.path]);
					} else {
						myTextbox.value = aFile.path;
						wdw_addressbooksAdd.gFile = aFile;
					}
				}
			}
			wdw_addressbooksAdd.checkRequired();
		},

		checklocationNetwork: function () {
			let canValidate = true;
			let curPage = document.getElementById('addressbook-wizard').currentPage;
			if (curPage) {
				document.getElementById('addressbook-wizard').canAdvance = wdw_addressbooksAdd.gValidateURL;
				if (wdw_addressbooksAdd.gValidateURL) {
					document.getElementById('validateButton').disabled = wdw_addressbooksAdd.gValidateURL;
				} else {
					canValidate = wdw_addressbooksAdd.validateEmail();
					let eList = curPage.getElementsByAttribute('required', 'true');
					for (let i = 0; i < eList.length && canValidate; ++i) {
						canValidate = (eList[i].value != "");
					}
					document.getElementById('validateButton').disabled = !canValidate;
				}
			}
		},

		isValidAddress: function (aEmail) {
			return aEmail.includes("@", 1) && !aEmail.endsWith("@");;
		},

		validateEmail: function () {
			let canValidate = true;
			let type = document.getElementById('remotePageTypeMenulist').value;
			let username = document.getElementById('remotePageUsername').value;
			let myRemotePageUsernameInfo = document.getElementById("remotePageUsernameInfo");
			if (type == 'GOOGLE2' || type == 'GOOGLE3') {
				canValidate = wdw_addressbooksAdd.isValidAddress(username);
				if (canValidate) {
					myRemotePageUsernameInfo.classList.remove("icon-warning");
					myRemotePageUsernameInfo.removeAttribute('tooltiptext');
				} else {
					myRemotePageUsernameInfo.classList.add("icon-warning");
					myRemotePageUsernameInfo.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("ValidatingEmailFailedLabel"));
				}
			}
			return canValidate;
		},

		remotePageSelect: function () {
			wdw_addressbooksAdd.gValidateURL = false;
			document.getElementById('remotePageURI').value = "";
			document.getElementById('remotePageUsername').value = "";
			document.getElementById("remotePageUsernameInfo").classList.remove("icon-warning");
			document.getElementById("remotePageUsernameInfo").removeAttribute('tooltiptext');
			document.getElementById('remotePagePassword').value = "";
			
			let type = document.getElementById('remotePageTypeMenulist').value;
			let connection = cardbookRepository.supportedConnections.filter(connection => connection.id == type);
			if (type == 'GOOGLE2' || type == 'GOOGLE3') {
				document.getElementById('remotePageUriLabel').disabled=true;
				document.getElementById('remotePageURI').disabled=true;
				document.getElementById('remotePageURI').setAttribute('required', 'false');
				document.getElementById('remotePagePasswordLabel').disabled=true;
				document.getElementById('remotePagePassword').disabled=true;
				document.getElementById('remotePagePassword').setAttribute('required', 'false');
				document.getElementById('rememberPasswordCheckbox').disabled=true;
			} else if (type == 'APPLE' || type == 'YAHOO') {
				document.getElementById('remotePageUriLabel').disabled=true;
				if (connection[0].url) {
					document.getElementById('remotePageURI').value = connection[0].url;
					document.getElementById('remotePageURI').disabled=true;
				}
				document.getElementById('remotePageURI').setAttribute('required', 'false');
				document.getElementById('remotePagePasswordLabel').disabled=false;
				document.getElementById('remotePagePassword').disabled=false;
				document.getElementById('remotePagePassword').setAttribute('required', 'true');
				document.getElementById('rememberPasswordCheckbox').disabled=false;
			} else {
				document.getElementById('remotePageUriLabel').disabled=false;
				document.getElementById('remotePageURI').disabled=false;
				let connection = cardbookRepository.supportedConnections.filter(connection => connection.id == type);
				if (connection[0].url) {
					document.getElementById('remotePageURI').value = connection[0].url;
					document.getElementById('remotePageURI').disabled=true;
				}
				document.getElementById('remotePageURI').setAttribute('required', 'true');
				document.getElementById('remotePagePasswordLabel').disabled=false;
				document.getElementById('remotePagePassword').disabled=false;
				document.getElementById('remotePagePassword').setAttribute('required', 'true');
				document.getElementById('rememberPasswordCheckbox').disabled=false;
			}	
			wdw_addressbooksAdd.checklocationNetwork();
			if (connection[0].pwdapp && connection[0].pwdapp == "true") {
				cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "passwordApplicationRequiredLabel", null, "PRIORITY_INFO_MEDIUM");
			} else {
				cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "OK");
			}
		},

		remotePageTextboxInput: function () {
			wdw_addressbooksAdd.gValidateURL = false;
			wdw_addressbooksAdd.checklocationNetwork();
			cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "OK");
		},

		remotePageShow: function () {
			let pwdMgrBundle = Services.strings.createBundle("chrome://passwordmgr/locale/passwordmgr.properties");
			document.getElementById('rememberPasswordCheckbox').setAttribute('label', pwdMgrBundle.GetStringFromName("rememberPassword"));
			wdw_addressbooksAdd.gAccountsFound = [];
			let remotePageTypeMenulist = document.getElementById('remotePageTypeMenulist');
			let remotePageTypeMenupopup = document.getElementById('remotePageTypeMenupopup');
			cardbookElementTools.loadRemotePageTypes(remotePageTypeMenupopup, remotePageTypeMenulist, "GOOGLE2");
			wdw_addressbooksAdd.checklocationNetwork();
			wdw_addressbooksAdd.validateEmail();
			wdw_addressbooksAdd.remotePageSelect();
		},

		constructComplexSearch: function () {
			var ABList = document.getElementById('addressbookMenulist');
			var ABPopup = document.getElementById('addressbookMenupopup');
			cardbookElementTools.loadAddressBooks(ABPopup, ABList, wdw_addressbooksAdd.gSearchDefinition.searchAB, true, true, true, false, false);
			cardbookComplexSearch.loadMatchAll(wdw_addressbooksAdd.gSearchDefinition.matchAll);
			cardbookComplexSearch.constructDynamicRows("searchTerms", wdw_addressbooksAdd.gSearchDefinition.rules, "3.0");
			document.getElementById('searchTerms_0_valueBox').focus();
		},

		checkSearch: function () {
			wdw_addressbooksAdd.constructComplexSearch();
			document.getElementById('addressbook-wizard').canAdvance = false;
			function checkTerms() {
				if (cardbookComplexSearch.getSearch().rules.length) {
					document.getElementById('addressbook-wizard').canAdvance = true;
				} else {
					document.getElementById('addressbook-wizard').canAdvance = false;
				}
			};
			checkTerms();
			document.getElementById('searchTerms').addEventListener("input", checkTerms, false);
			document.getElementById('searchTerms').addEventListener("command", checkTerms, false);
			document.getElementById('searchTerms').addEventListener("click", checkTerms, false);
		},

		searchPageAdvance: function () {
			let mySearch = cardbookComplexSearch.getSearch();
			wdw_addressbooksAdd.gSearchDefinition.searchAB = mySearch.searchAB;
			wdw_addressbooksAdd.gSearchDefinition.matchAll = mySearch.matchAll;
			wdw_addressbooksAdd.gSearchDefinition.rules = JSON.parse(JSON.stringify(mySearch.rules));
		},

		showPassword1: function () {
			let myPasswordTextbox = document.getElementById("remotePagePassword");
			if (!myPasswordTextbox.value) {
				return;
			}

			let myPasswordTextboxInfo = document.getElementById("remotePagePasswordInfo");
			if (myPasswordTextbox.type == "password") {
				myPasswordTextbox.type = "text";
				myPasswordTextboxInfo.classList.add("icon-visible");
			} else {
				myPasswordTextbox.type = "password";
				myPasswordTextboxInfo.classList.remove("icon-visible");
			}
		},

		showPassword2: function (aCheckBox) {
			let myPasswordTextbox = document.getElementById(aCheckBox.id.replace("Checkbox", ""));
			if (!myPasswordTextbox.value) {
				return;
			}

			if (myPasswordTextbox.type == "password") {
				myPasswordTextbox.type = "text";
			} else {
				myPasswordTextbox.type = "password";
			}
		},

		validateURL: function () {
			document.getElementById('addressbook-wizard').canAdvance = false;
			document.getElementById('remotePageURI').value = cardbookRepository.cardbookUtils.decodeURL(document.getElementById('remotePageURI').value.trim());
			document.getElementById('validateButton').disabled = true;

			let dirPrefId = cardbookRepository.cardbookUtils.getUUID();
			let type = document.getElementById('remotePageTypeMenulist').value;
			let url = document.getElementById('remotePageURI').value;
			let username = document.getElementById('remotePageUsername').value;
			let password = document.getElementById('remotePagePassword').value;
			let validationButton = document.getElementById('validateButton');
			wdw_addressbooksAdd.launchRequests(dirPrefId, type, url, username, password, 
						document.getElementById("rememberPasswordCheckbox").checked, validationButton, ABAddNotification.resultNotifications);
		},

		validateFindLine: function (aRowId) {
			let dirPrefId = cardbookRepository.cardbookUtils.getUUID();
			document.getElementById('findPageValidateButton' + aRowId).setAttribute('dirPrefId', dirPrefId);
			let type = document.getElementById('findPageValidateButton' + aRowId).getAttribute('validationType');
			let url = document.getElementById('findPageURLTextbox' + aRowId).value;
			let username = document.getElementById('findUsernameTextbox' + aRowId).value;
			let password = "";
			if (document.getElementById('findPasswordTextbox' + aRowId)) {
				password = document.getElementById('findPasswordTextbox' + aRowId).value;
			}
			let validationButton = document.getElementById('findPageValidateButton' + aRowId);
			wdw_addressbooksAdd.launchRequests(dirPrefId, type, url, username, password, true, validationButton, null);
		},

		launchRequests: function (aDirPrefId, aType, aUrl, aUsername, aPassword, aKeepPassword, aValidationButton, aNotification) {
			let url;
			if (aType == 'GOOGLE2' || aType == 'GOOGLE3') {
				url = cardbookRepository.cardbookOAuthData[aType].ROOT_API;
			} else {
				url = aUrl.replace("%EMAILADDRESS%", aUsername);
				wdw_addressbooksAdd.gCardDAVURLs.push([cardbookRepository.cardbookSynchronization.getSlashedUrl(url), false]); // [url, discovery]
				wdw_addressbooksAdd.gCardDAVURLs.push([cardbookRepository.cardbookSynchronization.getSlashedUrl(url), true]);
				wdw_addressbooksAdd.gCardDAVURLs.push([cardbookRepository.cardbookSynchronization.getWellKnownUrl(url), true]);
			}
			
			if (aType == 'GOOGLE2' || aType == 'GOOGLE3') {
				if (aNotification) {
					cardbookNotifications.setNotification(aNotification, "Validating1Label", [url], "PRIORITY_INFO_MEDIUM");
				}
				cardbookRepository.cardbookSynchronization.initMultipleOperations(aDirPrefId);
				cardbookRepository.cardbookServerSyncRequest[aDirPrefId]++;
				let connection = {connUser: aUsername, connPrefId: aDirPrefId, connType: aType, connDescription: wdw_addressbooksAdd.gValidateDescription};
				cardbookRepository.cardbookSynchronizationGoogle2.requestNewRefreshTokenForGooglePeople(connection, null, aType, null);
				wdw_addressbooksAdd.waitForRefreshTokenFinished(aDirPrefId, aUsername, aType, aValidationButton, aNotification);
			} else {
				cardbookRepository.cardbookSynchronization.initDiscoveryOperations(aDirPrefId);
				wdw_addressbooksAdd.gRunningDirPrefId.push(aDirPrefId);
				// works because all URLs have the same root URL
				cardbookRepository.cardbookPasswordManager.rememberPassword(aUsername, wdw_addressbooksAdd.gCardDAVURLs[0][0], aPassword, aKeepPassword);
				wdw_addressbooksAdd.launchCardDAVRequest(aDirPrefId, aUsername, aType, aValidationButton, aNotification);
			}
		},

		launchCardDAVRequest: function (aDirPrefId, aUsername, aType, aValidationButton, aNotification) {
			if (wdw_addressbooksAdd.gCardDAVURLs.length > 0) {
				if (aNotification) {
					cardbookNotifications.setNotification(aNotification, "Validating1Label", [wdw_addressbooksAdd.gCardDAVURLs[0][0]], "PRIORITY_INFO_MEDIUM");
				}
				cardbookRepository.cardbookSynchronization.initMultipleOperations(aDirPrefId);
				cardbookRepository.cardbookServerValidation[aDirPrefId] = {length: 0, user: aUsername};
				cardbookRepository.cardbookServerSyncRequest[aDirPrefId]++;
				let connection = {connUser: aUsername, connPrefId: aDirPrefId, connUrl: wdw_addressbooksAdd.gCardDAVURLs[0][0], connDescription: wdw_addressbooksAdd.gValidateDescription};
				let params = {aPrefIdType: aType};
				if (wdw_addressbooksAdd.gCardDAVURLs[0][1]) {
					cardbookRepository.cardbookSynchronization.discoverPhase1(connection, "GETDISPLAYNAME", params);
				} else {
					cardbookRepository.cardbookSynchronization.validateWithoutDiscovery(connection, "GETDISPLAYNAME", params);
				}
				wdw_addressbooksAdd.waitForDiscoveryFinished(aDirPrefId, aUsername, aType, aValidationButton, aNotification);
			}
		},

		waitForDiscoveryFinished: function (aDirPrefId, aUsername, aType, aValidationButton, aNotification) {
			wdw_addressbooksAdd.lTimerDiscoveryAll[aDirPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerDiscovery = wdw_addressbooksAdd.lTimerDiscoveryAll[aDirPrefId];
			lTimerDiscovery.initWithCallback({ notify: function(lTimerDiscovery) {
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryRequest : ", cardbookRepository.cardbookServerDiscoveryRequest[aDirPrefId]);
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryResponse : ", cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId]);
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryError : ", cardbookRepository.cardbookServerDiscoveryError[aDirPrefId]);
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : cardbookRepository.cardbookServerValidation : ", cardbookRepository.cardbookServerValidation[aDirPrefId]);
						if (cardbookRepository.cardbookServerDiscoveryError[aDirPrefId] >= 1) {
							wdw_addressbooksAdd.gCardDAVURLs.shift();
							if (cardbookRepository.cardbookServerValidation[aDirPrefId] && cardbookRepository.cardbookServerValidation[aDirPrefId].length == 0) {
								cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
								if (wdw_addressbooksAdd.gCardDAVURLs.length == 0) {
									wdw_addressbooksAdd.setResultsFlags(0, aValidationButton, aNotification);
									wdw_addressbooksAdd.gValidateURL = false;
									wdw_addressbooksAdd.checklocationNetwork();
									lTimerDiscovery.cancel();
								} else {
									aValidationButton.disabled = true;
									lTimerDiscovery.cancel();
									wdw_addressbooksAdd.launchCardDAVRequest(aDirPrefId, aUsername, aType, aValidationButton, aNotification);
								}
							} else {
								cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
								wdw_addressbooksAdd.setResultsFlags(0, aValidationButton, aNotification);
								wdw_addressbooksAdd.gValidateURL = false;
								wdw_addressbooksAdd.checklocationNetwork();
								lTimerDiscovery.cancel();
							}
						} else if (cardbookRepository.cardbookServerDiscoveryRequest[aDirPrefId] !== cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId] || cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId] === 0) {
							wdw_addressbooksAdd.setResultsFlags(1, aValidationButton, aNotification);
						} else {
							wdw_addressbooksAdd.gCardDAVURLs.shift();
							if (cardbookRepository.cardbookServerValidation[aDirPrefId] && cardbookRepository.cardbookServerValidation[aDirPrefId].length == 0) {
								cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
								if (wdw_addressbooksAdd.gCardDAVURLs.length == 0) {
									wdw_addressbooksAdd.setResultsFlags(0, aValidationButton, aNotification);
									wdw_addressbooksAdd.gValidateURL = false;
									wdw_addressbooksAdd.checklocationNetwork();
									lTimerDiscovery.cancel();
								} else {
									aValidationButton.disabled = true;
									lTimerDiscovery.cancel();
									wdw_addressbooksAdd.launchCardDAVRequest(aDirPrefId, aUsername, aType, aValidationButton, aNotification);
								}
							} else {
								wdw_addressbooksAdd.gCardDAVURLs = [];
								wdw_addressbooksAdd.setResultsFlags(2, aValidationButton, aNotification);
								wdw_addressbooksAdd.gValidateURL = true;
								wdw_addressbooksAdd.checklocationNetwork();
								let accountsFound = cardbookRepository.cardbookUtils.fromValidationToArray(aDirPrefId, aType);
								wdw_addressbooksAdd.gAccountsFound = wdw_addressbooksAdd.gAccountsFound.concat(accountsFound);
								cardbookRepository.cardbookSynchronization.stopDiscoveryOperations(aDirPrefId);
								cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
								lTimerDiscovery.cancel();
							}
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		waitForRefreshTokenFinished: function (aDirPrefId, aUsername, aType, aValidationButton, aNotification) {
			wdw_addressbooksAdd.lTimerRefreshTokenAll[aDirPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			let lTimerRefreshToken = wdw_addressbooksAdd.lTimerRefreshTokenAll[aDirPrefId];
			lTimerRefreshToken.initWithCallback({ notify: function(lTimerRefreshToken) {
						if (cardbookRepository.cardbookRefreshTokenError[aDirPrefId] >= 1) {
							wdw_addressbooksAdd.setResultsFlags(0, aValidationButton, aNotification);
							wdw_addressbooksAdd.gValidateURL = false;
							wdw_addressbooksAdd.checklocationNetwork();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
							lTimerRefreshToken.cancel();
						} else if (cardbookRepository.cardbookRefreshTokenResponse[aDirPrefId] !== cardbookRepository.cardbookRefreshTokenRequest[aDirPrefId]) {
							wdw_addressbooksAdd.setResultsFlags(1, aValidationButton, aNotification);
						} else {
							wdw_addressbooksAdd.gAccountsFound.push([aType,
								cardbookRepository.cardbookOAuthData[aType].ROOT_API,
								aUsername,
								aUsername,
								cardbookRepository.cardbookOAuthData[aType].VCARD_VERSIONS,
								"",
								"",
								false]);
							wdw_addressbooksAdd.setResultsFlags(2, aValidationButton, aNotification);
							wdw_addressbooksAdd.gValidateURL = true;
							wdw_addressbooksAdd.checklocationNetwork();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
							lTimerRefreshToken.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		setResultsFlags: function (aStatus, aValidationButton, aNotification) {
			if (aStatus == 0) {
				if (aNotification) {
					cardbookNotifications.setNotification(aNotification, "ValidationFailedLabel");
				}
				aValidationButton.setAttribute('validated', 'false');
				aValidationButton.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("ValidationFailedLabel"));
			} else if (aStatus == 1) {
				if (aNotification && wdw_addressbooksAdd.gCardDAVURLs[0]) {
					cardbookNotifications.setNotification(aNotification, "Validating1Label", [wdw_addressbooksAdd.gCardDAVURLs[0][0]], "PRIORITY_INFO_MEDIUM");
				}
				aValidationButton.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("Validating2Label"));
			} else {
				if (aNotification) {
					cardbookNotifications.setNotification(aNotification, "OK");
				}
				aValidationButton.setAttribute('validated', 'true');
				aValidationButton.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("ValidationOKLabel"));
				aValidationButton.disabled = true;
			}
		},

		loadSearchName: function () {
			if (window.arguments[0].dirPrefId) {
				document.getElementById('searchNamePageName').value = cardbookRepository.cardbookPreferences.getName(window.arguments[0].dirPrefId);
			}
			wdw_addressbooksAdd.checkRequired();
		},

		deleteBoxes: function (aRowName, aHeaderRowName) {
			var aListRows = document.getElementById(aRowName);
			var childNodes = aListRows.childNodes;
			var toDelete = [];
			for (var i = 0; i < childNodes.length; i++) {
				var child = childNodes[i];
				if (child.getAttribute('id') != aHeaderRowName) {
					toDelete.push(child);
				}
			}
			for (var i = 0; i < toDelete.length; i++) {
				var oldChild = aListRows.removeChild(toDelete[i]);
			}
		},

		createBoxesForNames: function (aType, aURL, aName, aVersionList, aUsername, aActionType, aSourceDirPrefId, aSourceCollected) {
			var aListRows = document.getElementById('namesRows');
			var aId = aListRows.childNodes.length - 1;
			var aRow = cardbookElementTools.addGridRow(aListRows, 'namesRow' + aId, {flex: '1'});

			var aCheckbox = document.createXULElement('checkbox');
			aRow.appendChild(aCheckbox);
			aCheckbox.setAttribute('checked', true);
			aCheckbox.setAttribute('id', 'namesCheckbox' + aId);
			aCheckbox.setAttribute('validationType', aType);
			aCheckbox.setAttribute('username', aUsername);
			aCheckbox.setAttribute('actionType', aActionType);
			aCheckbox.setAttribute('sourceDirPrefId', aSourceDirPrefId);
			aCheckbox.setAttribute('sourceCollected', aSourceCollected.toString());
			aCheckbox.setAttribute("aria-labelledby", "namesPageSelectedLabel");
			aCheckbox.addEventListener("command", function() {
					var aTextBox = document.getElementById('namesTextbox' + this.id.replace("namesCheckbox",""));
					if (this.checked) {
						aTextBox.setAttribute('required', true);
					} else {
						aTextBox.setAttribute('required', false);
					}
					wdw_addressbooksAdd.checkNamesLinesRequired();
				}, false);

			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', 'namesTextbox' + aId);
			aTextbox.setAttribute("aria-labelledby", "namesPageNameLabel");
			aTextbox.setAttribute('required', true);
			aTextbox.value = aName;
			aTextbox.addEventListener("input", function() {
					wdw_addressbooksAdd.checkNamesLinesRequired();
				}, false);

			var aColorbox =  document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aColorbox);
			aColorbox.setAttribute('id', 'serverColorInput' + aId);
			aColorbox.setAttribute("aria-labelledby", "namesPageColorLabel");
			aColorbox.setAttribute('palettename', "standard");
			aColorbox.setAttribute('type', "color");
			aColorbox.value = cardbookRepository.cardbookUtils.randomColor(100);
			
			var aMenuList = document.createXULElement('menulist');
			aRow.appendChild(aMenuList);
			aMenuList.setAttribute('id', 'vCardVersionPageName' + aId);
			aMenuList.setAttribute("aria-labelledby", "namesPageVCardVersionLabel");
			var aMenuPopup = document.createXULElement('menupopup');
			aMenuList.appendChild(aMenuPopup);
			aMenuPopup.setAttribute('id', 'vCardVersionPageNameMenupopup' + aId);
			cardbookElementTools.loadVCardVersions(aMenuPopup.id, aMenuList.id, aVersionList);

			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', 'URLTextbox' + aId);
			aTextbox.setAttribute("aria-labelledby", "namesPageURLLabel");
			aTextbox.setAttribute('hidden', 'true');
			aTextbox.value = aURL;

			var aCheckbox1 = document.createXULElement('checkbox');
			aRow.appendChild(aCheckbox1);
			aCheckbox1.setAttribute('checked', true);
			aCheckbox1.setAttribute('id', 'DBCachedCheckbox' + aId);
			aCheckbox1.setAttribute("aria-labelledby", "namesPageDBCachedLabel");
			if (aType == "CARDDAV") {
				aCheckbox1.setAttribute('disabled', false);
			} else {
				aCheckbox1.setAttribute('disabled', true);
			}
		},

		loadNames: function () {
			wdw_addressbooksAdd.deleteBoxes('namesRows', 'namesHeadersRow');
			if (window.arguments[0].action == "discovery") {
				wdw_addressbooksAdd.setCanRewindFalse();
			}
			if (wdw_addressbooksAdd.gAccountsFound.length > 1) {
				document.getElementById('namesPageDescription').hidden = false;
			} else {
				document.getElementById('namesPageDescription').hidden = true;
			}
			for (let myAccountFound of wdw_addressbooksAdd.gAccountsFound) {
				wdw_addressbooksAdd.createBoxesForNames(myAccountFound[0], myAccountFound[1], myAccountFound[3],
													myAccountFound[4], myAccountFound[2], myAccountFound[5], myAccountFound[6], myAccountFound[7]);
			}
			wdw_addressbooksAdd.checkNamesLinesRequired();
		},

		namesAdvance: function () {
			var page = document.getElementsByAttribute('pageid', 'namesPage')[0];
			wdw_addressbooksAdd.prepareAddressbooks();
			if (window.arguments[0].action == "first" && !wdw_addressbooksAdd.gFirstFirstStepDone) {
				page.next = 'finishFirstPage';
			} else {
				page.next = 'finishPage';
			}
		},

		createBoxesForFinds: function (aConnectionId, aConnectionType, aUsername, aPassword, aVCardVersion, aUrl, aABName) {
			var aListRows = document.getElementById('findRows');
			var aId = aListRows.childNodes.length - 1;
			var aRow = cardbookElementTools.addGridRow(aListRows, 'findRows' + aId, {flex: '1'});
			
			var aButton = document.createXULElement('button');
			aRow.appendChild(aButton);
			aButton.setAttribute('id', 'findPageValidateButton' + aId);
			aButton.setAttribute("aria-labelledby", "findPageValidateLabel");
			aButton.setAttribute('flex', '1');
			aButton.setAttribute('validationId', aConnectionId);
			aButton.setAttribute('validationType', aConnectionType);
			aButton.setAttribute('validated', 'false');
			aButton.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("noValidatedEntryTooltip"));
			aButton.addEventListener("command", function() {
					var myId = this.id.replace("findPageValidateButton","");
					wdw_addressbooksAdd.validateFindLine(myId);
				}, false);

			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', 'findUsernameTextbox' + aId);
			aTextbox.setAttribute("aria-labelledby", "findPageUserLabel");
			aTextbox.setAttribute('required', true);
			aTextbox.setAttribute('disabled', true);
			aTextbox.value = aUsername;

			if (aPassword != null) {
				var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
				aRow.appendChild(aTextbox);
				aTextbox.setAttribute('id', 'findPasswordTextbox' + aId);
				aTextbox.setAttribute("aria-labelledby", "findPagePasswordLabel");
				aTextbox.setAttribute('type', 'password');
				aTextbox.setAttribute('required', true);
				aTextbox.value = aPassword;

				var aCheckbox = document.createXULElement('checkbox');
				aRow.appendChild(aCheckbox);
				aCheckbox.setAttribute('id', 'findPasswordTextbox' + aId + 'Checkbox');
				aCheckbox.setAttribute("aria-labelledby", "findPagePasswordShowLabel");
				aCheckbox.addEventListener("command", function() {
						wdw_addressbooksAdd.showPassword2(this);
					}, false);
			} else {
				var aHbox = document.createXULElement('hbox');
				aRow.appendChild(aHbox);
				aHbox.setAttribute('align', 'center');
				aHbox.setAttribute('flex', '1');
			}

			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', 'findPageVCardVersionsTextbox' + aId);
			aTextbox.setAttribute("aria-labelledby", "findPageVCardVersionsLabel");
			aTextbox.setAttribute('hidden', 'true');
			aTextbox.value = aVCardVersion;

			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', 'findPageURLTextbox' + aId);
			aTextbox.setAttribute("aria-labelledby", "findPageURLLabel");
			aTextbox.setAttribute('hidden', 'true');
			aTextbox.value = aUrl;

			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', 'findPageABNameTextbox' + aId);
			aTextbox.setAttribute("aria-labelledby", "findPageABNameLabel");
			aTextbox.setAttribute('hidden', 'true');
			aTextbox.value = aABName;

			var found = false;
			for (var i = 0; i < aListRows.childNodes.length; i++) {
				if (document.getElementById('findPasswordTextbox' + i)) {
					found = true;
					break;
				}
			}
			if (found) {
				document.getElementById('findPagePasswordLabel').removeAttribute('hidden');
				document.getElementById('findPagePasswordShowLabel').removeAttribute('hidden');
			} else {
				document.getElementById('findPagePasswordLabel').setAttribute('hidden', 'true');
				document.getElementById('findPagePasswordShowLabel').setAttribute('hidden', 'true');
			}
		},

		loadFinds: function () {
			wdw_addressbooksAdd.gAccountsFound = [];
			wdw_addressbooksAdd.deleteBoxes('findRows', 'findHeadersRow');
			if (window.arguments[0].action == "first") {
				wdw_addressbooksAdd.setCanRewindFalse();
			}

			// possibility at first use to set carddav accounts from the preferences
			var setupCardDAVAccounts = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.setupCardDAVAccounts");
			if (setupCardDAVAccounts != "") {
				var setupCardDAVAccountsArray = setupCardDAVAccounts.split(',');
				for (account of setupCardDAVAccountsArray) {
					var accountValue = account.split('::');
					var vCardVersion = accountValue[2] ? accountValue[2] : "";
					wdw_addressbooksAdd.createBoxesForFinds("CARDDAV", "CARDDAV", accountValue[0], "", vCardVersion, accountValue[1], "");
				}
			}
			var sortedEmailAccounts = [];
			for (let account of MailServices.accounts.accounts) {
				for (let identity of account.identities) {
					if (account.incomingServer.type == "pop3" || account.incomingServer.type == "imap") {
						sortedEmailAccounts.push(identity.email.toLowerCase());
					}
				}
			}
			cardbookRepository.cardbookUtils.sortArrayByString(sortedEmailAccounts,1);
			sortedEmailAccounts = cardbookRepository.arrayUnique(sortedEmailAccounts);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : sortedEmailAccounts : ", sortedEmailAccounts);

			for (let email of sortedEmailAccounts) {
				let found = false;
				// first OAuth 
				for (var j in cardbookRepository.cardbookOAuthData) {
					if (j == "GOOGLE" || j == "GOOGLE3"){
						continue;
					}
					if (cardbookRepository.cardbookOAuthData[j].EMAIL_TYPE && email.endsWith(cardbookRepository.cardbookOAuthData[j].EMAIL_TYPE)) {
						wdw_addressbooksAdd.createBoxesForFinds(j, j, email, null, cardbookRepository.cardbookOAuthData[j].VCARD_VERSIONS.toString(),
																	cardbookRepository.cardbookOAuthData[j].ROOT_API, email);
						found = true;
						break;
					}
				}
				// then CARDDAV
				if (!found) {
					let domain = email.split("@")[1];
					let domainShort = domain.split(".")[0];

					for (let connection of cardbookRepository.supportedConnections) {
						if (connection.id == "GOOGLE2" || connection.id == "GOOGLE3" || connection.id == "APPLE"){
							continue;
						}
						if (connection.id == domain.toUpperCase()){
							let password = "";
							let foundLogins = Services.logins.findLogins("smtp://smtp." + domain, "", "");
							if (foundLogins.length > 0) {
								password = foundLogins[0].password;
							}
							let url = connection.url.replace("%EMAILADDRESS%", email);
							wdw_addressbooksAdd.createBoxesForFinds(connection.id, connection.type, email, password, connection.vCard, url, email);
							found = true;
							break;
						} else if (connection.id == domainShort.toUpperCase()){
							let password = "";
							let foundLogins = Services.logins.findLogins("smtp://smtp." + domain, "", "");
							if (foundLogins.length > 0) {
								password = foundLogins[0].password;
							}
							let url = connection.url.replace("%EMAILADDRESS%", email);
							wdw_addressbooksAdd.createBoxesForFinds(connection.id, connection.type, email, password, connection.vCard, url, email);
							found = true;
							break;
						}
					}
				}
			}
			wdw_addressbooksAdd.setFindLinesHeader();
			wdw_addressbooksAdd.checkFindLinesRequired();
		},

		setFindLinesHeader: function () {
			if (document.getElementById('findRows').childNodes.length == 1) {
				document.getElementById('findHeadersRow').setAttribute('hidden', 'true');
				document.getElementById('findPageName1Description').removeAttribute('hidden');
				document.getElementById('findPageName2Description').setAttribute('hidden', 'true');
				document.getElementById('findPageName3Description').setAttribute('hidden', 'true');
			} else if (document.getElementById('findRows').childNodes.length == 2) {
				document.getElementById('findHeadersRow').removeAttribute('hidden');
				document.getElementById('findPageName1Description').setAttribute('hidden', 'true');
				document.getElementById('findPageName2Description').removeAttribute('hidden');
				document.getElementById('findPageName3Description').setAttribute('hidden', 'true');
			} else {
				document.getElementById('findHeadersRow').removeAttribute('hidden');
				document.getElementById('findPageName1Description').setAttribute('hidden', 'true');
				document.getElementById('findPageName2Description').setAttribute('hidden', 'true');
				document.getElementById('findPageName3Description').removeAttribute('hidden');
			}
		},

		finishFirstPageShow: function () {
			wdw_addressbooksAdd.prepareSearchAllContactsAddressbook();
			wdw_addressbooksAdd.createAddressbook();
			wdw_addressbooksAdd.gFirstFirstStepDone = true;
			wdw_addressbooksAdd.setCanRewindFalse();
			if (wdw_addressbooksAdd.gFinishParams.length > 1) {
				document.getElementById('finishFirstPage1Description').setAttribute('hidden', 'true');
				document.getElementById('finishFirstPage2Description').removeAttribute('hidden');
			} else {
				document.getElementById('finishFirstPage1Description').removeAttribute('hidden');
				document.getElementById('finishFirstPage2Description').setAttribute('hidden', 'true');
			}
		},

		finishPageShow: function () {
			wdw_addressbooksAdd.setCanRewindFalse();
			if (wdw_addressbooksAdd.gFinishParams.length > 1) {
				document.getElementById('finishPage1Description').setAttribute('hidden', 'true');
				document.getElementById('finishPage2Description').removeAttribute('hidden');
			} else {
				document.getElementById('finishPage1Description').removeAttribute('hidden');
				document.getElementById('finishPage2Description').setAttribute('hidden', 'true');
			}
		},

		prepareSearchAllContactsAddressbook: function () {
			var dirPrefId = cardbookRepository.cardbookUtils.getUUID();
			var myName = cardbookRepository.extension.localeData.localizeMessage("allContacts");
			wdw_addressbooksAdd.gFinishParams.push({type: "SEARCH", search: { searchAB: "allAddressBooks", matchAll: true, rules: [ { case: "dig", field: "version", term: "IsntEmpty", value: "" } ] },
														name: myName, username: "", color: "", vcard: "", enabled: true,
														dirPrefId: dirPrefId, DBcached: false, firstAction: false});
		},

		prepareSearchAddressbook: function () {
			var name = document.getElementById('searchNamePageName').value;
			if (window.arguments[0].dirPrefId) {
				var dirPrefId = window.arguments[0].dirPrefId;
				var enabled = cardbookRepository.cardbookPreferences.getEnabled(window.arguments[0].dirPrefId);
			} else {
				var dirPrefId = cardbookRepository.cardbookUtils.getUUID();
				var enabled = true;
			}
			wdw_addressbooksAdd.gFinishParams.push({type: "SEARCH", search: cardbookComplexSearch.getSearch(), name: name, username: "", color: "", vcard: "", enabled: enabled,
														dirPrefId: dirPrefId, DBcached: false, firstAction: false});
		},

		prepareAddressbooks: function () {
			wdw_addressbooksAdd.gFinishParams = [];
			var i = 0;
			while (true) {
				if (document.getElementById('namesCheckbox' + i)) {
					var aCheckbox = document.getElementById('namesCheckbox' + i);
					if (aCheckbox.checked) {
						var myType = aCheckbox.getAttribute('validationType');
						var aAddressbookId = cardbookRepository.cardbookUtils.getUUID();
						var aAddressbookName = document.getElementById('namesTextbox' + i).value;
						var aAddressbookColor = document.getElementById('serverColorInput' + i).value;
						var aAddressbookVCard = document.getElementById('vCardVersionPageName' + i).value;
						var aAddressbookDBCached = document.getElementById('DBCachedCheckbox' + i).checked;
						var aAddressbookURL = document.getElementById('URLTextbox' + i).value;
						var aAddressbookUsername = aCheckbox.getAttribute('username');
						var aAddressbookValidationType = aCheckbox.getAttribute('validationType');
						var aAddressbookActionType = aCheckbox.getAttribute('actionType');
						var aAddressbookSourceDirPrefId = aCheckbox.getAttribute('sourceDirPrefId');
						var aAddressbookSourceCollected = (aCheckbox.getAttribute('sourceCollected') == 'true');
						if (cardbookRepository.cardbookUtils.isMyAccountRemote(myType)) {
							// the discover should be redone at every sync
							if (myType == 'APPLE' || myType == 'YAHOO') {
								let connection = cardbookRepository.supportedConnections.filter(connection => connection.id == myType);
								aAddressbookURL = connection[0].url;
							}
							let aReadonly = false;
							if (myType == 'GOOGLE3') {
								aReadonly = true;
							}
							wdw_addressbooksAdd.gFinishParams.push({type: aAddressbookValidationType, url: aAddressbookURL, name: aAddressbookName, username: aAddressbookUsername, color: aAddressbookColor,
																	vcard: aAddressbookVCard, readonly: aReadonly, dirPrefId: aAddressbookId,
																	DBcached: aAddressbookDBCached, firstAction: false});
						} else if (myType == "LOCALDB") {
							wdw_addressbooksAdd.gFinishParams.push({type: aAddressbookValidationType, name: aAddressbookName, username: "", color: aAddressbookColor, vcard: aAddressbookVCard, readonly: false, dirPrefId: aAddressbookId,
																		DBcached: true, firstAction: false});
						} else if (myType == "FILE" || myType == "DIRECTORY") {
							wdw_addressbooksAdd.gFinishParams.push({type: aAddressbookValidationType, actionType: aAddressbookActionType, file: wdw_addressbooksAdd.gFile, name: aAddressbookName, username: "",
																	color: aAddressbookColor, vcard: aAddressbookVCard, readonly: false, dirPrefId: aAddressbookId, DBcached: false, firstAction: false});
						} else if (myType == "STANDARD") {
							if (window.arguments[0].action == "first") {
								var aFirstAction = true;
							} else {
								var aFirstAction = false;
							}
							wdw_addressbooksAdd.gFinishParams.push({type: "STANDARD", sourceDirPrefId: aAddressbookSourceDirPrefId,
																name: aAddressbookName, username: "", color: aAddressbookColor, vcard: aAddressbookVCard, readonly: false,
																dirPrefId: aAddressbookId, collected: aAddressbookSourceCollected,
																DBcached: true, firstAction: aFirstAction});
						}
					}
					i++;
				} else {
					break;
				}
			}
		},

		setCanRewindFalse: function () {
			document.getElementById('addressbook-wizard').canRewind = false;
		},

		createAddressbook: function () {
			for (var i = 0; i < wdw_addressbooksAdd.gFinishParams.length; i++) {
				var myAccount = wdw_addressbooksAdd.gFinishParams[i];
				if (window.arguments[0].action == "search" && window.arguments[0].dirPrefId) {
					wdw_cardbook.modifySearchAddressbook(myAccount.dirPrefId, myAccount.name, myAccount.color, myAccount.vcard, myAccount.readonly,
													false, myAccount.search);
				} else {
					if (myAccount.type === "SEARCH") {
						myAccount.search.dirPrefId = myAccount.dirPrefId;
						cardbookRepository.addSearch(myAccount.search);
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, "", myAccount.username, myAccount.color,
																	myAccount.enabled, true, myAccount.vcard, false, false,
																	myAccount.DBcached, false, "0", true);
						cardbookRepository.cardbookSynchronization.loadComplexSearchAccount(myAccount.dirPrefId, myAccount.search);
					} else  if (cardbookRepository.cardbookUtils.isMyAccountRemote(myAccount.type)) {
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, myAccount.url, myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, myAccount.urnuuid,
																	myAccount.DBcached, true, "60", true);
						cardbookRepository.cardbookSynchronization.syncAccount(myAccount.dirPrefId);
					} else if (myAccount.type === "STANDARD") {
						if (myAccount.collected) {
							cardbookRepository.addAccountToCollected(myAccount.dirPrefId);
						}
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, "LOCALDB", "", myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, false,
																	myAccount.DBcached, true, "60", true);
						cardbookRepository.cardbookSynchronization.initMultipleOperations(myAccount.dirPrefId);
						cardbookRepository.cardbookDBCardRequest[myAccount.dirPrefId]++;
						cardbookRepository.cardbookMigrate.importCards(myAccount.sourceDirPrefId, myAccount.dirPrefId, myAccount.name, myAccount.vcard);
						cardbookRepository.cardbookSynchronization.waitForLoadFinished(myAccount.dirPrefId, myAccount.name, false, true);
						// if the first proposed import of standard address books is finished OK
						// then set CardBook as exclusive
						if (myAccount.firstAction) {
							cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.exclusive", true);
						}
					} else if (myAccount.type === "LOCALDB") {
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, "", myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, false,
																	myAccount.DBcached, true, "60", true);
					} else if (myAccount.type === "FILE") {
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, myAccount.file.path, myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, false,
																	myAccount.DBcached, true, "60", true);
						cardbookRepository.cardbookSynchronization.initMultipleOperations(myAccount.dirPrefId);
						cardbookRepository.cardbookFileRequest[myAccount.dirPrefId]++;
						var myFile = myAccount.file;
						if (myAccount.actionType === "CREATEFILE") {
							if (myFile.exists()) {
								myFile.remove(true);
							}
							myFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
						}
						cardbookRepository.cardbookSynchronization.loadFile(myFile, myAccount.dirPrefId, myAccount.dirPrefId, "NOIMPORTFILE", "");
						cardbookRepository.cardbookSynchronization.waitForLoadFinished(myAccount.dirPrefId, myAccount.name, false, true);
					} else if (myAccount.type === "DIRECTORY") {
						var myDir = myAccount.file;
						if (myAccount.actionType === "CREATEDIRECTORY") {
							if (myDir.exists()) {
								var aListOfFileName = [];
								aListOfFileName = cardbookRepository.cardbookSynchronization.getFilesFromDir(myDir.path);
								if (aListOfFileName.length > 0) {
									var confirmTitle = cardbookRepository.extension.localeData.localizeMessage("confirmTitle");
									var confirmMsg = cardbookRepository.extension.localeData.localizeMessage("directoryDeletionConfirmMessage", [myDir.leafName]);
									if (Services.prompt.confirm(window, confirmTitle, confirmMsg)) {
										myDir.remove(true);
										try {
											myDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
										}
										catch (e) {
											cardbookRepository.cardbookLog.updateStatusProgressInformation("cannot create directory : " + myDir.path + " : error : " + e, "Error");
											return;
										}
									} else {
										return;
									}
								}
							} else {
								try {
									myDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
								}
								catch (e) {
									cardbookRepository.cardbookLog.updateStatusProgressInformation("cannot create directory : " + myDir.path + " : error : " + e, "Error");
									return;
								}
							}
						}
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, myDir.path, myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, false,
																	myAccount.DBcached, true, "60", true);
						cardbookRepository.cardbookSynchronization.initMultipleOperations(myAccount.dirPrefId);
						cardbookRepository.cardbookDirRequest[myAccount.dirPrefId]++;
						cardbookRepository.cardbookSynchronization.loadDir(myDir, myAccount.dirPrefId, myAccount.dirPrefId, "NOIMPORTDIR", "");
						cardbookRepository.cardbookSynchronization.waitForLoadFinished(myAccount.dirPrefId, myAccount.name, false, true);
					}
					cardbookRepository.cardbookUtils.formatStringForOutput("addressbookCreated", [myAccount.name]);
					cardbookActions.addActivity("addressbookCreated", [myAccount.name], "addItem");
					cardbookRepository.cardbookUtils.notifyObservers("addressbookCreated", myAccount.dirPrefId);
				}
			}
		},

		cancelWizard: function () {
			for (var dirPrefId of wdw_addressbooksAdd.gRunningDirPrefId) {
				cardbookRepository.cardbookPreferences.delBranch(dirPrefId);
				cardbookRepository.cardbookSynchronization.finishMultipleOperations(dirPrefId);
				cardbookRepository.cardbookSynchronization.stopDiscoveryOperations(dirPrefId);
			}
			for (var dirPrefId in wdw_addressbooksAdd.lTimerRefreshTokenAll) {
				try {
					wdw_addressbooksAdd.lTimerRefreshTokenAll[dirPrefId].cancel();
				} catch(e) {}
			}
			for (var dirPrefId in wdw_addressbooksAdd.lTimerDiscoveryAll) {
				try {
					wdw_addressbooksAdd.lTimerDiscoveryAll[dirPrefId].cancel();
				} catch(e) {}
			}
			document.getElementById('addressbook-wizard').canAdvance = false;
		},

		closeWizard: function () {
			wdw_addressbooksAdd.cancelWizard();
			wdw_addressbooksAdd.createAddressbook();
		}

	};

};
