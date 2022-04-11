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
		
		lTimerRefreshTokenAll : {},
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
			document.addEventListener("cancel", wdw_addressbooksAdd.cancelWizard);
			document.addEventListener("dialogextra2", wdw_addressbooksAdd.showPreviousPage);
			document.addEventListener("dialogaccept", wdw_addressbooksAdd.showNextPage);
		},
		
		loadWizard: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			wdw_addressbooksAdd.initWizardEvents();

			if (window.arguments[0].action == "first") {
				wdw_addressbooksAdd.showPage("welcomePage");
			} else if (window.arguments[0].action == "search") {
				wdw_addressbooksAdd.initSearchDefinition();
				wdw_addressbooksAdd.showPage("searchPage");
			} else if (window.arguments[0].action == "discovery") {
				wdw_addressbooksAdd.gAccountsFound = window.arguments[0].accountsToAdd;
				wdw_addressbooksAdd.showPage("namesPage");
			} else {
				wdw_addressbooksAdd.showPage("initialPage");
			}
		},

		loadStandardAddressBooks: function () {
			for (let addrbook of MailServices.ab.directories) {
				if (addrbook.dirPrefId == "ldap_2.servers.history") {
					wdw_addressbooksAdd.gAccountsFound.push(["STANDARD", "", "", addrbook.dirName, cardbookRepository.supportedVersion, "", addrbook.dirPrefId, true]);
				} else {
					wdw_addressbooksAdd.gAccountsFound.push(["STANDARD", "", "", addrbook.dirName, cardbookRepository.supportedVersion, "", addrbook.dirPrefId, false]);
				}
			}
		},

		getCurrentPage: function () {
			let page = document.getElementById("addressbook-creation-dialog").querySelector(".cardbook-page:not([hidden])");
			return page.id;
		},

		getRequiredElements: function (aPageID) {
			let elements = document.getElementById(aPageID).querySelectorAll("[required]:not([disabled]");
			return elements;
		},

		showPreviousPage: function (aEvent) {
			let currentPage = wdw_addressbooksAdd.getCurrentPage();
			if (pageMap[currentPage]["previousAction"]) {
				pageMap[currentPage]["previousAction"].apply();
			}
			aEvent.preventDefault();
			aEvent.stopPropagation();
			if (pageMap[currentPage]["extra2Page"] != "null") {
				let previousPage = pageMap[currentPage]["extra2Page"];
				wdw_addressbooksAdd.showPage(previousPage);
			}
		},

		showNextPage: function (aEvent) {
			let currentPage = wdw_addressbooksAdd.getCurrentPage();
			if (pageMap[currentPage]["nextAction"]) {
				pageMap[currentPage]["nextAction"].apply();
			}
			aEvent.preventDefault();
			aEvent.stopPropagation();
			if (pageMap[currentPage]["acceptPage"] != "null") {
				let nextPage = pageMap[currentPage]["acceptPage"];
				pageMap[nextPage]["extra2Page"] = currentPage;
				wdw_addressbooksAdd.showPage(nextPage);
			}
		},

		showPage: function (pageID) {
			if (!pageID) {
				return;
			}
			let page = document.getElementById(pageID);
			if (!page) {
				return;
			}
			// show correct node
			let nodes = document.getElementById("addressbook-creation-dialog").querySelectorAll(".cardbook-page");
			for (let node of nodes) {
				if (node.id == pageID) {
					node.hidden = false;
				} else {
					node.hidden = true;
				}
			}
			// update buttons
			for (let buttonName in pageHandlers) {
				// labels
				let dialog = document.getElementById("addressbook-creation-dialog");
				let button = dialog.getButton(buttonName);
				if (pageMap[pageID][buttonName + "Page"]) {
					let label = page.getAttribute("buttonlabel" + buttonName);
					button.setAttribute("label", label);
					button.hidden = false;
				} else {
					button.hidden = true;
				}
			}
			// action
			if (pageMap[pageID].onpageshow) {
				pageMap[pageID].onpageshow.apply();
			}
		},

		checkRequired: function () {
			let canAdvance = true;
			let dialog = document.getElementById("addressbook-creation-dialog");
			let currentPage = wdw_addressbooksAdd.getCurrentPage();
			if (currentPage) {
				let eList = wdw_addressbooksAdd.getRequiredElements(currentPage);
				for (let i = 0; i < eList.length && canAdvance; ++i) {
					canAdvance = (eList[i].value != "");
				}
				if (canAdvance) {
					dialog.removeAttribute("buttondisabledaccept");
				} else {
					dialog.setAttribute("buttondisabledaccept", "true");
				}
			}
		},

		checkFindLinesRequired: function () {
			let canAdvance = false;
			let i = 0;
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
			let dialog = document.getElementById("addressbook-creation-dialog");
			if (canAdvance) {
				dialog.removeAttribute("buttondisabledaccept");
			} else {
				dialog.setAttribute("buttondisabledaccept", "true");
			}
		},

		checkNamesLinesRequired: function () {
			let dialog = document.getElementById("addressbook-creation-dialog");
			let canAdvance = true;
			let oneChecked = false;
			let i = 0;
			while (true) {
				if (document.getElementById('namesCheckbox' + i)) {
					let aCheckbox = document.getElementById('namesCheckbox' + i);
					let aAddressbookName = document.getElementById('namesTextbox' + i);
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
				if ((canAdvance && oneChecked) || !oneChecked) {
					dialog.removeAttribute("buttondisabledaccept");
				} else {
					dialog.setAttribute("buttondisabledaccept", "true");
				}
			} else {
				if (canAdvance && oneChecked) {
					dialog.removeAttribute("buttondisabledaccept");
				} else {
					dialog.setAttribute("buttondisabledaccept", "true");
				}
			}
		},

		welcomePageShow: function () {
			wdw_addressbooksAdd.checkRequired();
		},

		initialPageShow: function () {
			wdw_addressbooksAdd.gAccountsFound = [];
			wdw_addressbooksAdd.checkRequired();
		},

		initialPageAdvance: function () {
			let currentPage = wdw_addressbooksAdd.getCurrentPage();
			let type = document.getElementById('addressbookType').value;
			let nextPage = "";
			if (type == 'local') {
				nextPage = 'localPage';
			} else if (type == 'remote') {
				nextPage = 'remotePage';
			} else if (type == 'standard') {
				wdw_addressbooksAdd.loadStandardAddressBooks();
				nextPage = 'namesPage';
			} else if (type == 'find') {
				nextPage = 'findPage';
			} else if (type == 'search') {
				wdw_addressbooksAdd.initSearchDefinition();
				nextPage = 'searchPage';
			}
			pageMap[currentPage]["acceptPage"] = nextPage;
		},

		localPageSelect: function () {
			cardbookNotifications.setNotification(ABAddNotification.localPageURINotifications, "OK");
			document.getElementById('localPageURI').value = "";
			var type = document.getElementById('localPageType').value;
			if (type == "createDB") {
				document.getElementById('localPageURI').removeAttribute('required');
				document.getElementById('localPageURILabel').setAttribute('disabled', 'true');
				document.getElementById('localPageURI').setAttribute('disabled', 'true');
				document.getElementById('localPageURIButton').setAttribute('disabled', 'true');
			} else {
				document.getElementById('localPageURI').setAttribute('required', 'true');
				document.getElementById('localPageURILabel').removeAttribute('disabled');
				document.getElementById('localPageURI').removeAttribute('disabled');
				document.getElementById('localPageURIButton').removeAttribute('disabled');
			}
			wdw_addressbooksAdd.checkRequired();
		},

		localPageURIInput: function () {
			let dialog = document.getElementById("addressbook-creation-dialog");
			let value = document.getElementById('localPageURI').value;
			if (wdw_addressbooksAdd.checkFile(value)) {
				dialog.removeAttribute("buttondisabledaccept");
			} else {
				dialog.setAttribute("buttondisabledaccept", "true");
			}
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
					cardbookWindowUtils.callDirPicker("dirChooseTitle", wdw_addressbooksAdd.setFile);
					break;
				case "createFile":
					cardbookWindowUtils.callFilePicker("fileCreationVCFTitle", "SAVE", "VCF", "", "", wdw_addressbooksAdd.setFile);
					break;
				case "openFile":
					cardbookWindowUtils.callFilePicker("fileSelectionVCFTitle", "OPEN", "VCF", "", "", wdw_addressbooksAdd.setFile);
					break;
			}
		},

		setFile: function (aFile) {
			var fileTextBox = document.getElementById('localPageURI');
			if (wdw_addressbooksAdd.checkFile(aFile.path)) {
				fileTextBox.value = aFile.path;
				wdw_addressbooksAdd.gFile = aFile;
			} else {
				fileTextBox.value = "";
			}
			wdw_addressbooksAdd.checkRequired();
		},

		checkFile: function (aFilePath) {
			var type = document.getElementById('localPageType').value;
			if (type == 'openFile' || type == 'createFile') {
				if (cardbookRepository.cardbookUtils.isFileAlreadyOpen(aFilePath)) {
					cardbookNotifications.setNotification(ABAddNotification.localPageURINotifications, "fileAlreadyOpen", [aFilePath]);
					return false;
				}
			} else if (type == 'openDirectory' || type == 'createDirectory') {
				if (cardbookRepository.cardbookUtils.isDirectoryAlreadyOpen(aFilePath)) {
					cardbookNotifications.setNotification(ABAddNotification.localPageURINotifications, "directoryAlreadyOpen", [aFilePath]);
					return false;
				}
			}
			try {
				let file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
				file.initWithPath(aFilePath);
			} catch {
				cardbookNotifications.setNotification(ABAddNotification.localPageURINotifications, "fileNotFound", [aFilePath]);
				return false;
			}
			cardbookNotifications.setNotification(ABAddNotification.localPageURINotifications, "OK");
			return true;
		},

		checklocationNetwork: function () {
			let dialog = document.getElementById("addressbook-creation-dialog");
			let canValidate = true;
			let currentPage = wdw_addressbooksAdd.getCurrentPage();
			if (currentPage) {
				if (wdw_addressbooksAdd.gValidateURL) {
					dialog.removeAttribute("buttondisabledaccept");
				} else {
					dialog.setAttribute("buttondisabledaccept", "true");
				}
				if (wdw_addressbooksAdd.gValidateURL) {
					document.getElementById('validateButton').disabled = wdw_addressbooksAdd.gValidateURL;
				} else {
					canValidate = wdw_addressbooksAdd.validateEmail() && wdw_addressbooksAdd.validateURI();
					let eList = wdw_addressbooksAdd.getRequiredElements(currentPage);
					for (let i = 0; i < eList.length && canValidate; ++i) {
						canValidate = (eList[i].value != "");
					}
					document.getElementById('validateButton').disabled = !canValidate;
				}
			}
		},

		isValidAddress: function (aEmail) {
			return aEmail.includes("@", 1) && !aEmail.endsWith("@");
		},

		validateEmail: function () {
			let canValidate = true;
			let type = document.getElementById('remotePageTypeMenulist').value;
			let username = document.getElementById('remotePageUsername').value;
			let remotePageUsernameLogin = document.getElementById("remotePageUsernameLogin");
			let remotePageUsernameEmail = document.getElementById("remotePageUsernameEmail");
			let myRemotePageUsernameWarning = document.getElementById("remotePageUsernameWarning");
			let remotePageURIInfo = document.getElementById("remotePageURIInfo");
			myRemotePageUsernameWarning.setAttribute("hidden", "true");
			remotePageUsernameLogin.removeAttribute("hidden");
			remotePageUsernameEmail.setAttribute("hidden", "true");
			remotePageURIInfo.setAttribute("hidden", "true");
			if (type == 'GOOGLE2' || type == 'GOOGLE3') {
				canValidate = wdw_addressbooksAdd.isValidAddress(username);
				remotePageUsernameLogin.setAttribute("hidden", "true");
				if (username && !canValidate) {
					myRemotePageUsernameWarning.removeAttribute("hidden");
					remotePageUsernameEmail.setAttribute("hidden", "true");
				} else {
					myRemotePageUsernameWarning.setAttribute("hidden", "true");
					remotePageUsernameEmail.removeAttribute("hidden");
				}
			}
			return canValidate;
		},

		isValidURL: function (aURL) {
			return aURL.startsWith("https://") || aURL.startsWith("http://");
		},

		validateURI: function () {
			let canValidate = true;
			let URI = document.getElementById("remotePageURI").value;
			let remotePageURIInfo = document.getElementById("remotePageURIInfo");
			let remotePageURIWarning = document.getElementById("remotePageURIWarning");
			remotePageURIWarning.setAttribute("hidden", "true");
			remotePageURIInfo.removeAttribute("hidden");
			canValidate = wdw_addressbooksAdd.isValidURL(URI);
			if (URI && !canValidate) {
				remotePageURIWarning.removeAttribute("hidden");
				remotePageURIInfo.setAttribute("hidden", "true");
			} else {
				remotePageURIWarning.setAttribute("hidden", "true");
				remotePageURIInfo.removeAttribute("hidden");
			}
			return canValidate;
		},

		remotePageSelect: function () {
			wdw_addressbooksAdd.gValidateURL = false;
			document.getElementById('remotePageURI').value = "";
			document.getElementById('remotePageUsername').value = "";
			document.getElementById('remotePagePassword').value = "";
			
			let type = document.getElementById('remotePageTypeMenulist').value;
			let connection = cardbookRepository.supportedConnections.filter(connection => connection.id == type);
			document.getElementById('validateButton').hidden=false;
			document.getElementById('validateGoogleButton').hidden=true;
			if (type == 'GOOGLE2' || type == 'GOOGLE3') {
				document.getElementById('remotePageUriLabel').disabled=true;
				document.getElementById('remotePageURI').disabled=true;
				document.getElementById('remotePageURI').setAttribute('required', 'false');
				document.getElementById('remotePageURI').value = cardbookRepository.cardbookOAuthData[type].ROOT_API;
				document.getElementById('remotePagePasswordLabel').disabled=true;
				document.getElementById('remotePagePassword').disabled=true;
				document.getElementById('rememberPasswordCheckbox').disabled=true;
			} else {
				if (connection[0].url) {
					document.getElementById('remotePageUriLabel').disabled=true;
					document.getElementById('remotePageURI').disabled=true;
					document.getElementById('remotePageURI').value = connection[0].url;
				} else {
					document.getElementById('remotePageUriLabel').disabled=false;
					document.getElementById('remotePageURI').disabled=false;
				}
				document.getElementById('remotePageURI').setAttribute('required', 'true');
				document.getElementById('remotePagePasswordLabel').disabled=false;
				document.getElementById('remotePagePassword').disabled=false;
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
			document.getElementById('validateButton').setAttribute('validated', 'false');
			document.getElementById('validateButton').setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("remotePage.validatebutton.label"));
		},

		remotePageShow: function () {
			wdw_addressbooksAdd.gAccountsFound = [];
			let remotePageTypeMenulist = document.getElementById('remotePageTypeMenulist');
			let remotePageTypeMenupopup = document.getElementById('remotePageTypeMenupopup');
			cardbookElementTools.loadRemotePageTypes(remotePageTypeMenupopup, remotePageTypeMenulist, "GOOGLE2");
			wdw_addressbooksAdd.checklocationNetwork();
			wdw_addressbooksAdd.remotePageSelect();
			wdw_addressbooksAdd.validateURI();
			wdw_addressbooksAdd.validateEmail();
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
			let dialog = document.getElementById("addressbook-creation-dialog");
			dialog.setAttribute("buttondisabledaccept", "true");
			function checkTerms() {
				if (cardbookComplexSearch.getSearch().rules.length) {
					dialog.removeAttribute("buttondisabledaccept");
				} else {
					dialog.setAttribute("buttondisabledaccept", "true");
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
				myPasswordTextboxInfo.src = "chrome://messenger/skin/icons/visible.svg";
			} else {
				myPasswordTextbox.type = "password";
				myPasswordTextboxInfo.src = "chrome://messenger/skin/icons/hidden.svg";
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
			let dialog = document.getElementById("addressbook-creation-dialog");
			dialog.setAttribute("buttondisabledaccept", "true");
			document.getElementById('remotePageURI').value = cardbookRepository.cardbookUtils.decodeURL(document.getElementById('remotePageURI').value.trim());
			document.getElementById('validateButton').disabled = true;

			let dirPrefId = cardbookRepository.cardbookUtils.getUUID();
			let type = document.getElementById('remotePageTypeMenulist').value;
			let url = document.getElementById('remotePageURI').value;
			let username = document.getElementById('remotePageUsername').value;
			let password = document.getElementById('remotePagePassword').value;
			let validationButton = document.getElementById('validateButton');
			if (Services.io.offline) {
				cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "ValidationFailedOffLine");
			} else {
				wdw_addressbooksAdd.launchRequests(dirPrefId, type, url, username, password, 
						document.getElementById("rememberPasswordCheckbox").checked, validationButton, ABAddNotification.resultNotifications);
			}
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
			if (Services.io.offline) {
				cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "ValidationFailedOffLine");
			} else {
				wdw_addressbooksAdd.launchRequests(dirPrefId, type, url, username, password, true, validationButton, null);
			}
		},

		launchRequests: function (aDirPrefId, aType, aUrl, aUsername, aPassword, aKeepPassword, aValidationButton, aNotification) {
			let url;
			if (aType == 'GOOGLE2' || aType == 'GOOGLE3') {
				url = cardbookRepository.cardbookOAuthData[aType].ROOT_API;
			} else if (aType == 'EWS' || aType == 'OFFICE365' || aType == 'HOTMAIL' || aType == 'OUTLOOK') {
				url = aUrl;
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
			} else if (aType == 'EWS' || aType == 'OFFICE365' || aType == 'HOTMAIL' || aType == 'OUTLOOK') {
				if (aNotification) {
					cardbookNotifications.setNotification(aNotification, "Validating1Label", [url], "PRIORITY_INFO_MEDIUM");
				}
				cardbookRepository.cardbookSynchronization.initMultipleOperations(aDirPrefId);
				cardbookRepository.cardbookServerValidation[aDirPrefId] = {length: 0, user: aUsername};
				cardbookRepository.cardbookServerSyncRequest[aDirPrefId]++;
				let connection = {connUser: aUsername, connPrefId: aDirPrefId, connUrl: url, connType: aType, connDescription: wdw_addressbooksAdd.gValidateDescription};
				cardbookRepository.cardbookPasswordManager.rememberPassword(aUsername, url, aPassword, aKeepPassword);
				cardbookRepository.cardbookSynchronizationOffice365.validateWithDiscovery(connection);
				wdw_addressbooksAdd.waitForDiscoveryFinished(aDirPrefId, aUsername, aType, aValidationButton, aNotification);
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

		createBoxesForNames: function (aType, aURL, aName, aVersionList, aUsername, aActionType, aSourceDirPrefId, aSourceCollected) {
			let table = document.getElementById('namesTable');
			let aId = table.rows.length - 1;
			let aRow = cardbookElementTools.addHTMLTR(table, 'namesRow' + aId);

			let checkboxData = cardbookElementTools.addHTMLTD(aRow, 'namesTableData.' + aId + '.1');
			let checkbox = document.createXULElement('checkbox');
			checkboxData.appendChild(checkbox);
			checkbox.setAttribute('checked', true);
			checkbox.setAttribute('id', 'namesCheckbox' + aId);
			checkbox.setAttribute('validationType', aType);
			checkbox.setAttribute('username', aUsername);
			checkbox.setAttribute('actionType', aActionType);
			checkbox.setAttribute('sourceDirPrefId', aSourceDirPrefId);
			checkbox.setAttribute('sourceCollected', aSourceCollected.toString());
			checkbox.setAttribute("aria-labelledby", "namesPageSelectedLabel");
			checkbox.addEventListener("command", function() {
					let textbox = document.getElementById('namesTextbox' + this.id.replace("namesCheckbox",""));
					if (this.checked) {
						textbox.setAttribute('required', true);
					} else {
						textbox.setAttribute('required', false);
					}
					wdw_addressbooksAdd.checkNamesLinesRequired();
				}, false);

			let nameData = cardbookElementTools.addHTMLTD(aRow, 'namesTableData.' + aId + '.2');
			let nameTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			nameData.appendChild(nameTextbox);
			nameTextbox.setAttribute('id', 'namesTextbox' + aId);
			nameTextbox.setAttribute("aria-labelledby", "namesPageNameLabel");
			nameTextbox.setAttribute('required', true);
			nameTextbox.value = aName;
			nameTextbox.addEventListener("input", function() {
					wdw_addressbooksAdd.checkNamesLinesRequired();
				}, false);

			let colorData = cardbookElementTools.addHTMLTD(aRow, 'namesTableData.' + aId + '.3');
			let colorbox =  document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			colorData.appendChild(colorbox);
			colorbox.setAttribute('id', 'serverColorInput' + aId);
			colorbox.setAttribute("aria-labelledby", "namesPageColorLabel");
			colorbox.setAttribute('palettename', "standard");
			colorbox.setAttribute('type', "color");
			colorbox.value = cardbookRepository.cardbookUtils.randomColor(100);
			
			let menuData = cardbookElementTools.addHTMLTD(aRow, 'namesTableData.' + aId + '.4');
			let menuList = document.createXULElement('menulist');
			menuData.appendChild(menuList);
			menuList.setAttribute('id', 'vCardVersionPageName' + aId);
			menuList.setAttribute("aria-labelledby", "namesPageVCardVersionLabel");
			let menuPopup = document.createXULElement('menupopup');
			menuList.appendChild(menuPopup);
			menuPopup.setAttribute('id', 'vCardVersionPageNameMenupopup' + aId);
			cardbookElementTools.loadVCardVersions(menuPopup.id, menuList.id, aVersionList);

			let URLData = cardbookElementTools.addHTMLTD(aRow, 'namesTableData.' + aId + '.5');
			let URLTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			URLData.appendChild(URLTextbox);
			URLTextbox.setAttribute('id', 'URLTextbox' + aId);
			URLTextbox.setAttribute("aria-labelledby", "namesPageURLLabel");
			URLTextbox.setAttribute('hidden', 'true');
			URLTextbox.value = aURL;

			let checkbox1Data = cardbookElementTools.addHTMLTD(aRow, 'namesTableData.' + aId + '.6');
			let checkbox1 = document.createXULElement('checkbox');
			checkbox1Data.appendChild(checkbox1);
			checkbox1.setAttribute('checked', true);
			checkbox1.setAttribute('id', 'DBCachedCheckbox' + aId);
			checkbox1.setAttribute("aria-labelledby", "namesPageDBCachedLabel");
			if (aType == "CARDDAV") {
				checkbox1.setAttribute('disabled', false);
			} else {
				checkbox1.setAttribute('disabled', true);
			}
		},

		loadNames: function () {
			cardbookElementTools.deleteTableRows('namesTable', 'namesTableRow');
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
			wdw_addressbooksAdd.prepareAddressbooks();
			if (window.arguments[0].action == "first" && !wdw_addressbooksAdd.gFirstFirstStepDone) {
				pageMap["namesPage"]["acceptPage"] = 'finishFirstPage';
			} else {
				pageMap["namesPage"]["acceptPage"] = 'finishPage';
			}
		},

		createBoxesForFinds: function (aConnectionId, aConnectionType, aUsername, aPassword, aVCardVersion, aUrl, aABName) {
			let table = document.getElementById('findTable');
			let aId = table.rows.length - 1;
			let aRow = cardbookElementTools.addHTMLTR(table, 'findTable.' + aId);
			
			let buttonData = cardbookElementTools.addHTMLTD(aRow, 'findTableData.' + aId + '.1');
			let button = document.createXULElement('button');
			buttonData.appendChild(button);
			button.setAttribute('id', 'findPageValidateButton' + aId);
			button.setAttribute("aria-labelledby", "findPageValidateLabel");
			button.setAttribute('flex', '1');
			button.setAttribute('validationId', aConnectionId);
			button.setAttribute('validationType', aConnectionType);
			button.setAttribute('validated', 'false');
			button.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("noValidatedEntryTooltip"));
			button.addEventListener("command", function() {
					var myId = this.id.replace("findPageValidateButton","");
					wdw_addressbooksAdd.validateFindLine(myId);
				}, false);

			let usernameData = cardbookElementTools.addHTMLTD(aRow, 'findTableData.' + aId + '.2');
			let usernameTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			usernameData.appendChild(usernameTextbox);
			usernameTextbox.setAttribute('id', 'findUsernameTextbox' + aId);
			usernameTextbox.setAttribute("aria-labelledby", "findPageUserLabel");
			usernameTextbox.setAttribute('required', true);
			usernameTextbox.setAttribute('disabled', true);
			usernameTextbox.setAttribute('type', 'text');
			usernameTextbox.setAttribute('class', 'cardbook-large-column');
			usernameTextbox.value = aUsername;

			let paswordData = cardbookElementTools.addHTMLTD(aRow, 'findTableData.' + aId + '.3');
			let checkboxData = cardbookElementTools.addHTMLTD(aRow, 'findTableData.' + aId + '.4');
			if (aPassword != null) {
				let passwordTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
				paswordData.appendChild(passwordTextbox);
				passwordTextbox.setAttribute('id', 'findPasswordTextbox' + aId);
				passwordTextbox.setAttribute("aria-labelledby", "findPagePasswordLabel");
				passwordTextbox.setAttribute('type', 'password');
				passwordTextbox.setAttribute('required', true);
				passwordTextbox.value = aPassword;

				let passwordCheckbox = document.createXULElement('checkbox');
				checkboxData.appendChild(passwordCheckbox);
				passwordCheckbox.setAttribute('id', 'findPasswordTextbox' + aId + 'Checkbox');
				passwordCheckbox.setAttribute("aria-labelledby", "findPagePasswordShowLabel");
				passwordCheckbox.addEventListener("command", function() {
						wdw_addressbooksAdd.showPassword2(this);
					}, false);
			}

			let versionData = cardbookElementTools.addHTMLTD(aRow, 'findTableData.' + aId + '.5');
			let versionTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			versionData.appendChild(versionTextbox);
			versionTextbox.setAttribute('id', 'findPageVCardVersionsTextbox' + aId);
			versionTextbox.setAttribute("aria-labelledby", "findPageVCardVersionsLabel");
			versionTextbox.setAttribute('hidden', 'true');
			versionTextbox.value = aVCardVersion;

			let URLData = cardbookElementTools.addHTMLTD(aRow, 'findTableData.' + aId + '.6');
			let URLTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			URLData.appendChild(URLTextbox);
			URLTextbox.setAttribute('id', 'findPageURLTextbox' + aId);
			URLTextbox.setAttribute("aria-labelledby", "findPageURLLabel");
			URLTextbox.setAttribute('hidden', 'true');
			URLTextbox.value = aUrl;

			let ABNameData = cardbookElementTools.addHTMLTD(aRow, 'findTableData.' + aId + '.7');
			let ABNameTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			ABNameData.appendChild(ABNameTextbox);
			ABNameTextbox.setAttribute('id', 'findPageABNameTextbox' + aId);
			ABNameTextbox.setAttribute("aria-labelledby", "findPageABNameLabel");
			ABNameTextbox.setAttribute('hidden', 'true');
			ABNameTextbox.value = aABName;

			var found = false;
			for (var i = 0; i < table.rows.length; i++) {
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
			cardbookElementTools.deleteTableRows('findTable', 'findHeadersRow');
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
				let domain = email.split("@")[1];
				let domainShort = domain.split(".")[0];
				// then MICROSOFT and CARDDAV
				if (!found) {
					let connections = cardbookRepository.supportedConnections.filter(connection => connection.id == domainShort.toUpperCase());
					if (connections.length) {
						let connection = connections[0];
						let password = cardbookRepository.cardbookPasswordManager.getDomainPassword(domain);
						let url = connection.url.replace("%EMAILADDRESS%", email);
						wdw_addressbooksAdd.createBoxesForFinds(connection.id, connection.type, email, password, connection.vCard, url, email);
					} else {
						connections = cardbookRepository.supportedConnections.filter(connection => connection.id == domain.toUpperCase());
						if (connections.length) {
							let connection = connections[0];
							let password = cardbookRepository.cardbookPasswordManager.getDomainPassword(domain);
							let url = connection.url.replace("%EMAILADDRESS%", email);
							wdw_addressbooksAdd.createBoxesForFinds(connection.id, connection.type, email, password, connection.vCard, url, email);
						}
					}
				}
			}
			wdw_addressbooksAdd.setFindLinesHeader();
			wdw_addressbooksAdd.checkFindLinesRequired();
		},

		setFindLinesHeader: function () {
			if (document.getElementById('findTable').rows.length == 1) {
				document.getElementById('findHeadersRow').setAttribute('hidden', 'true');
				document.getElementById('findPageName1Description').removeAttribute('hidden');
				document.getElementById('findPageName2Description').setAttribute('hidden', 'true');
				document.getElementById('findPageName3Description').setAttribute('hidden', 'true');
			} else if (document.getElementById('findTable').rows.length == 2) {
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
							if (myType == 'GOOGLE3' || aAddressbookUsername == "") {
								aReadonly = true;
							}
							wdw_addressbooksAdd.gFinishParams.push({type: aAddressbookValidationType, url: aAddressbookURL, name: aAddressbookName, username: aAddressbookUsername, color: aAddressbookColor,
																	vcard: aAddressbookVCard, readonly: aReadonly, dirPrefId: aAddressbookId, sourceDirPrefId: aAddressbookSourceDirPrefId,
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
			let dialog = document.getElementById("addressbook-creation-dialog");
			let button = dialog.getButton("extra2");
			button.hidden = true;
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
																	"", myAccount.DBcached, false, "0", true);
						cardbookRepository.cardbookSynchronization.loadComplexSearchAccount(myAccount.dirPrefId, myAccount.search);
					} else  if (cardbookRepository.cardbookUtils.isMyAccountRemote(myAccount.type)) {
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, myAccount.url, myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, myAccount.urnuuid,
																	myAccount.sourceDirPrefId, myAccount.DBcached, true, "60", true);
						cardbookRepository.cardbookSynchronization.syncAccount(myAccount.dirPrefId);
					} else if (myAccount.type === "STANDARD") {
						if (myAccount.collected) {
							cardbookRepository.addAccountToCollected(myAccount.dirPrefId);
						}
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, "LOCALDB", "", myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, false,
																	"", myAccount.DBcached, true, "60", true);
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
																	"", myAccount.DBcached, true, "60", true);
					} else if (myAccount.type === "FILE") {
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, myAccount.file.path, myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, false,
																	"", myAccount.DBcached, true, "60", true);
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
																	"", myAccount.DBcached, true, "60", true);
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
				cardbookRepository.cardbookPreferences.delAccount(dirPrefId);
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
			let dialog = document.getElementById("addressbook-creation-dialog");
			dialog.setAttribute("buttondisabledaccept", "true");
			window.close();
		},

		closeWizard: function () {
			wdw_addressbooksAdd.cancelWizard();
			wdw_addressbooksAdd.createAddressbook();
		}

	};

	// initial --> local --> names --> finish
	// initial --> remote --> names --> finish
	// initial --> names --> finish (import standard AB)
	// initial --> search --> searchName --> finish
	// initial --> find --> names --> finish
	// search --> searchName --> finish
	// welcome --> names --> finishFirst --> find --> names --> finish
	// names --> finish (discovery)
	var pageMap = { "welcomePage": {"extra2Page": null, "acceptPage": "namesPage", 
						onpageshow: wdw_addressbooksAdd.welcomePageShow,
						nextAction: wdw_addressbooksAdd.loadStandardAddressBooks},
					"initialPage": {"extra2Page": null, "acceptPage": "localPage",
						onpageshow: wdw_addressbooksAdd.initialPageShow,
						nextAction: wdw_addressbooksAdd.initialPageAdvance},
					"localPage": {"extra2Page": null, "acceptPage": "namesPage",
						onpageshow: wdw_addressbooksAdd.checkRequired,
						nextAction: wdw_addressbooksAdd.localPageAdvance},
					"remotePage": {"extra2Page": null, "acceptPage": "namesPage",
						onpageshow: wdw_addressbooksAdd.remotePageShow},
					"searchPage": {"extra2Page": null, "acceptPage": "searchNamePage",
						onpageshow: wdw_addressbooksAdd.checkSearch,
						nextAction: wdw_addressbooksAdd.searchPageAdvance},
					"searchNamePage": {"extra2Page": null, "acceptPage": "finishPage",
						onpageshow: wdw_addressbooksAdd.loadSearchName,
						nextAction: wdw_addressbooksAdd.prepareSearchAddressbook},
					"findPage": {"extra2Page": null, "acceptPage": "namesPage",
						onpageshow: wdw_addressbooksAdd.loadFinds},
					"namesPage": {"extra2Page": null, "acceptPage": "finishPage",
						onpageshow: wdw_addressbooksAdd.loadNames,
						nextAction: wdw_addressbooksAdd.namesAdvance},
					"finishFirstPage": {"extra2Page": null, "acceptPage": "findPage",
						onpageshow: wdw_addressbooksAdd.finishFirstPageShow},
					"finishPage": {"extra2Page": null, "acceptPage": "null",
						onpageshow: wdw_addressbooksAdd.finishPageShow,
						nextAction: wdw_addressbooksAdd.closeWizard}};
	var pageHandlers = {"extra2": null, "accept": null};
};
