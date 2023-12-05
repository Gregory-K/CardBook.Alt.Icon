import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";
import { cardbookHTMLUtils } from "../cardbookHTMLUtils.mjs";
import { cardbookHTMLComplexSearch } from "../complexSearch/cardbookHTMLComplexSearch.mjs";
import { cardbookHTMLNotification } from "../cardbookHTMLNotification.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
import { cardbookNewPreferences } from "../preferences/cardbookNewPreferences.mjs";

// initial --> local --> names --> finish
// initial --> remote --> names --> finish
// initial --> names --> finish (import standard AB)
// initial --> search --> searchName --> finish
// search --> searchName --> finish
// welcome --> names --> finish
// names --> finish (discovery)
var pageMap = { "welcomePage": {"backPage": null, "nextPage": "namesPage", 
					onpageshow: [welcomePageShow],
					nextAction: [welcomePageAdvance]},
				"initialPage": {"backPage": null, "nextPage": "localPage",
					onpageshow: [initialPageShow],
					nextAction: [initialPageAdvance]},
				"localPage": {"backPage": null, "nextPage": "namesPage",
					onpageshow: [localPageSelect],
					nextAction: [localPageAdvance]},
				"remotePage": {"backPage": null, "nextPage": "namesPage",
					onpageshow: [remotePageShow]},
				"searchPage": {"backPage": null, "nextPage": "searchNamePage",
					onpageshow: [checkSearch],
					nextAction: [searchPageAdvance]},
				"searchNamePage": {"backPage": null, "nextPage": "finishPage",
					onpageshow: [loadSearchName],
					nextAction: [prepareSearchAddressbook]},
				"namesPage": {"backPage": null, "nextPage": "finishPage",
					onpageshow: [loadNames],
					nextAction: [prepareAddressbooks]},
				"finishPage": {"backPage": null, "nextPage": "null",
					onpageshow: [finishPageShow],
					nextAction: [finishWizard]}};
var pageHandlers = {"extra2": null, "accept": null};

var dirPrefId = "";
var action = "";
var accountsToAdd = [];
var supportedVersion = [];
var supportedConnections = [];
var cardbookOAuthData = {};
var cardbookComplexSearch = {};

var gRunningDirPrefId = [];
var gFilepath = "";
var gFilename = "";
var gCardDAVURLs = {};
// [ [ AB type, URL, username, AB name, vCard version, AB type action, source id, collected true|false] ]
var gAccountsFound = [];
var gFinishParams = [];
var gValidateURL = false;
var gValidateDescription = "Validation module";
var gSearchDefinition = {};
var gFilePickerId = "";

var lTimerRefreshTokenAll = {};
var lTimerDiscoveryAll = {};

function initSearchDefinition () {
	if (dirPrefId && cardbookComplexSearch[dirPrefId]) {
		gSearchDefinition.searchAB = cardbookComplexSearch[dirPrefId].searchAB;
	} else {
		gSearchDefinition.searchAB = "allAddressBooks";
	}
	if (dirPrefId && cardbookComplexSearch[dirPrefId]) {
		gSearchDefinition.matchAll = cardbookComplexSearch[dirPrefId].matchAll;
	} else {
		gSearchDefinition.matchAll = true;
	}
	if (dirPrefId && cardbookComplexSearch[dirPrefId]) {
		gSearchDefinition.rules = JSON.parse(JSON.stringify(cardbookComplexSearch[dirPrefId].rules));
	} else {
		gSearchDefinition.rules = [{case: "", field: "", term: "", value: ""}];
	}
};

async function onLoadDialog () {
	let urlParams = new URLSearchParams(window.location.search);
	dirPrefId = urlParams.get("dirPrefId");
	action = urlParams.get("action");
	accountsToAdd = JSON.parse(urlParams.get("accountsToAdd"));

	i18n.updateDocument();
	cardbookHTMLRichContext.loadRichContext();

	supportedVersion = await cardbookHTMLUtils.getPrefValue("supportedVersion");
	supportedConnections = await messenger.runtime.sendMessage({query: "cardbook.getSupportedConnections"});
	cardbookOAuthData = await messenger.runtime.sendMessage({query: "cardbook.getCardbookOAuthData"});
	cardbookComplexSearch = await messenger.runtime.sendMessage({query: "cardbook.getCardbookComplexSearch"});
	gFilePickerId = await messenger.runtime.sendMessage({query: "cardbook.getUUID"});

	// radio
	let localPageTypeRadiogroup = cardbookHTMLUtils.getRadioNodes("localPageType");
	for (let node of localPageTypeRadiogroup) {
		node.addEventListener("change", event => localPageSelect());
	}
	// select
	document.getElementById("remotePageTypeMenulist").addEventListener("change", event => remotePageSelect());
	// button
	document.getElementById("back").addEventListener("click", event => showPreviousPage(event));
	document.getElementById("cancel").addEventListener("click", event => cancelWizard(event));
	document.getElementById("next").addEventListener("click", event => showNextPage(event));
	document.getElementById("localPageURIButton").addEventListener("click", event => searchFile());
	document.getElementById("validateButton").addEventListener("click", event => validateURL());
	document.getElementById("validateGoogleButton").addEventListener("click", event => validateURL());
	// input
	document.getElementById("searchNamePageName").addEventListener("input", event => checkRequired());
	document.getElementById("localPageURI").addEventListener("input", event => localPageURIInput());
	document.getElementById("remotePageURI").addEventListener("input", event => remotePageInput());
	document.getElementById("remotePageUsername").addEventListener("input", event => remotePageInput());
	document.getElementById("remotePagePassword").addEventListener("input", event => remotePageInput());
	// image
	document.getElementById("remotePagePasswordInfo").addEventListener("click", event => showPassword1());

	if (action == "first") {
		await showPage("welcomePage");
	} else if (action == "search") {
		initSearchDefinition();
		await showPage("searchPage");
	} else if (action == "discovery") {
		gAccountsFound = accountsToAdd;
		await showPage("namesPage");
	} else {
		await showPage("initialPage");
	}
};

async function loadLocalStandardAB () {
	let remoteAB = await messenger.runtime.sendMessage({query: "cardbook.getRemoteStandardAB"});
	let LDAPAB = await messenger.runtime.sendMessage({query: "cardbook.getLDAPStandardAB"});
	let remoteUid = Array.from(remoteAB, row => row.uid);
	let collectedAB = await messenger.runtime.sendMessage({query: "cardbook.getCollectedStandardAB"});
	for (let addrbook of await browser.addressBooks.list()) {
		if (remoteUid.includes(addrbook.id)) {
			continue
		} else if (LDAPAB.includes(addrbook.id)) {
			continue
		}
		let collected = addrbook.name == collectedAB;
		gAccountsFound.push(["STANDARD", "", "", addrbook.name, supportedVersion, "", addrbook.id, collected, false]);
	}
};

function getCurrentPage () {
	let page = document.querySelector(".tab-container section[class~='active']");
	return page.id;
};

function getRequiredElements (aPageID) {
	let elements = document.getElementById(aPageID).querySelectorAll("[required]:not([disabled]");
	return elements;
};

async function showPreviousPage (aEvent) {
	let currentPage = getCurrentPage();
	if (pageMap[currentPage]["previousAction"]) {
		await pageMap[currentPage]["previousAction"].apply();
	}
	aEvent.preventDefault();
	aEvent.stopPropagation();
	if (pageMap[currentPage]["backPage"] != "null") {
		let previousPage = pageMap[currentPage]["backPage"];
		await showPage(previousPage);
	}
};

async function showNextPage (aEvent) {
	let currentPage = getCurrentPage();
	if (pageMap[currentPage]["nextAction"]) {
		for (let func of pageMap[currentPage]["nextAction"]) {
			await func.apply();
		}
	}
	aEvent.preventDefault();
	aEvent.stopPropagation();
	if (pageMap[currentPage]["nextPage"] != "null") {
		let nextPage = pageMap[currentPage]["nextPage"];
		pageMap[nextPage]["backPage"] = currentPage;
		await showPage(nextPage);
	}
};

async function showPage (paneID) {
	if (!paneID) {
		return;
	}
	let page = document.getElementById(paneID);
	if (!page) {
		return;
	}

	for (let node of document.querySelectorAll(".tab-container section")) {
		if (node.id == paneID) {
			node.classList.add("active");
		} else {
			node.classList.remove("active");
		}
	}
	// action
	if (pageMap[paneID].onpageshow) {
		for (let func of pageMap[paneID].onpageshow) {
			await func.apply();
		}
	}
};

function checkRequired () {
	let canAdvance = true;
	let currentPage = getCurrentPage();
	if (currentPage) {
		let eList = getRequiredElements(currentPage);
		for (let i = 0; i < eList.length && canAdvance; ++i) {
			canAdvance = (eList[i].value != "");
		}
		let nextButton = document.getElementById('next');
		if (canAdvance) {
			nextButton.disabled = false;
		} else {
			nextButton.disabled = true;
		}
	}
};

function checkNamesLinesRequired () {
	let nextButton = document.getElementById('next');
	let canAdvance = true;
	let oneChecked = false;
	let i = 0;
	while (true) {
		if (document.getElementById(`namesCheckbox${i}`)) {
			let aCheckbox = document.getElementById(`namesCheckbox${i}`);
			let aAddressbookName = document.getElementById(`namesTextbox${i}`);
			oneChecked = oneChecked || aCheckbox.checked;
			if (aCheckbox.checked) {
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
	if (canAdvance && oneChecked) {
		nextButton.disabled = false;
	} else {
		nextButton.disabled = true;
	}
};

function welcomePageShow () {
	checkRequired();
};

function initialPageShow () {
	gAccountsFound = [];
	checkRequired();
};

async function welcomePageAdvance () {
	gAccountsFound = [];
	let notificationMessage = document.getElementById("findPageNotificationsMessage");
	cardbookHTMLNotification.setNotification(notificationMessage, "OK");
	await loadRemoteStandardAB();
	await loadLocalStandardAB();
	setCanRewindFalse();
};

async function initialPageAdvance () {
	let currentPage = getCurrentPage();
	let type = cardbookHTMLUtils.getRadioValue("addressbookType");
	let nextPage = "";
	if (type == 'local') {
		nextPage = 'localPage';
	} else if (type == 'remote') {
		nextPage = 'remotePage';
	} else if (type == 'standard') {
		gAccountsFound = [];
		let notificationMessage = document.getElementById("findPageNotificationsMessage");
		cardbookHTMLNotification.setNotification(notificationMessage, "OK");
		await loadRemoteStandardAB();
		await loadLocalStandardAB();
		nextPage = 'namesPage';
	} else if (type == 'search') {
		initSearchDefinition();
		nextPage = 'searchPage';
	}
	pageMap[currentPage]["nextPage"] = nextPage;
};

function localPageSelect () {
	let notificationMessage = document.getElementById("localPageURINotificationsMessage");
	cardbookHTMLNotification.setNotification(notificationMessage, "OK");
	document.getElementById('localPageURI').value = "";
	let localPageType = cardbookHTMLUtils.getRadioValue("localPageType");
	if (localPageType == "createDB") {
		document.getElementById('localPageURI').removeAttribute('required');
		cardbookHTMLTools.disableNode(document.getElementById('localPageURIhBox'), true);
	} else {
		document.getElementById('localPageURI').setAttribute('required', 'true');
		cardbookHTMLTools.disableNode(document.getElementById('localPageURIhBox'), false);
	}
	checkRequired();
};

async function localPageURIInput () {
	let nextButton = document.getElementById('next');
	let value = document.getElementById('localPageURI').value;
	let check = await checkFile(value);
	if (check) {
		nextButton.disabled = false;
	} else {
		nextButton.disabled = true;
	}
};

function localPageAdvance () {
	cardbookHTMLTools.deleteTableRows('findTable', 'findHeadersRow');
	gAccountsFound = [];
	let localPageType = cardbookHTMLUtils.getRadioValue("localPageType");
	switch(localPageType) {
		case "createDB":
			gAccountsFound.push(["LOCALDB",
														"",
														"",
														"",
														supportedVersion,
														"",
														"",
														false,
														false]);
			break;
		case "createDirectory":
			gAccountsFound.push(["DIRECTORY",
														"",
														"",
														gFilename,
														supportedVersion,
														"CREATEDIRECTORY",
														"",
														false,
														false]);
			break;
		case "createFile":
			gAccountsFound.push(["FILE",
														"",
														"",
														gFilename,
														supportedVersion,
														"CREATEFILE",
														"",
														false,
														false]);
			break;
		case "openDirectory":
			gAccountsFound.push(["DIRECTORY",
														"",
														"",
														gFilename,
														supportedVersion,
														"OPENDIRECTORY",
														"",
														false,
														false]);
			break;
		case "openFile":
			gAccountsFound.push(["FILE",
														"",
														"",
														gFilename,
														supportedVersion,
														"OPENFILE",
														"",
														false,
														false]);
			break;
	}
};

async function searchFile () {
	let notificationMessage = document.getElementById("localPageURINotificationsMessage");
	cardbookHTMLNotification.setNotification(notificationMessage, "OK");
	let localPageType = cardbookHTMLUtils.getRadioValue("localPageType");
	switch(localPageType) {
		case "createDirectory":
		case "openDirectory":
			messenger.runtime.sendMessage({query: "cardbook.callDirPicker", id: gFilePickerId, title: "dirChooseTitle"});
			break;
		case "createFile":
			messenger.runtime.sendMessage({query: "cardbook.callFilePicker", id: gFilePickerId, result: "path", title: "fileCreationVCFTitle", mode: "SAVE", type: "VCF"});
			break;
		case "openFile":
			messenger.runtime.sendMessage({query: "cardbook.callFilePicker", id: gFilePickerId, result: "path", title: "fileSelectionVCFTitle", mode: "OPEN", type: "VCF"});
			break;
	}
};

async function setFile (aId, aFilepath) {
	if (aId != gFilePickerId) {
		return;
	}
	let fileTextBox = document.getElementById('localPageURI');
	let check = await checkFile(aFilepath);
	if (check) {
		fileTextBox.value = aFilepath;
		gFilepath = aFilepath;
		gFilename = aFilepath.split('\\').pop().split('/').pop();
	} else {
		fileTextBox.value = "";
	}
	checkRequired();
};

async function checkFile (aFilePath) {
	let notificationMessage = document.getElementById("localPageURINotificationsMessage");
	let type = cardbookHTMLUtils.getRadioValue("localPageType");
	if (type == 'openFile' || type == 'createFile') {
		let isOpen = await messenger.runtime.sendMessage({query: "cardbook.isFileAlreadyOpen", path: aFilePath});
		if (isOpen) {
			cardbookHTMLNotification.setNotification(notificationMessage, "warning", "fileAlreadyOpen", [aFilePath]);
			return false;
		}
	} else if (type == 'openDirectory' || type == 'createDirectory') {
		let isOpen = await messenger.runtime.sendMessage({query: "cardbook.isDirectoryAlreadyOpen", path: aFilePath});
		if (isOpen) {
			cardbookHTMLNotification.setNotification(notificationMessage, "warning", "directoryAlreadyOpen", [aFilePath]);
			return false;
		}
	}
	cardbookHTMLNotification.setNotification(notificationMessage, "OK");
	return true;
};

function checklocationNetwork () {
	let nextButton = document.getElementById('next');
	let canValidate = true;
	let currentPage = getCurrentPage();
	if (currentPage) {
		if (gValidateURL) {
			nextButton.disabled = false;
		} else {
			nextButton.disabled = true;
		}
		if (gValidateURL) {
			document.getElementById('validateButton').disabled = gValidateURL;
		} else {
			canValidate = validateEmail() && validateURI();
			let eList = getRequiredElements(currentPage);
			for (let i = 0; i < eList.length && canValidate; ++i) {
				canValidate = (eList[i].value != "");
			}
			document.getElementById('validateButton').disabled = !canValidate;
		}
	}
};

function isValidAddress (aEmail) {
	return aEmail.includes("@", 1) && !aEmail.endsWith("@") && !aEmail.includes("'") && !aEmail.includes('"');
};

function validateEmail () {
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
		canValidate = isValidAddress(username);
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
};

function isValidURL (aURL) {
	return aURL.startsWith("https://") || aURL.startsWith("http://");
};

function validateURI () {
	let canValidate = true;
	let URI = document.getElementById("remotePageURI").value;
	let remotePageURIInfo = document.getElementById("remotePageURIInfo");
	let remotePageURIWarning = document.getElementById("remotePageURIWarning");
	remotePageURIWarning.setAttribute("hidden", "true");
	remotePageURIInfo.removeAttribute("hidden");
	canValidate = isValidURL(URI);
	if (URI && !canValidate) {
		remotePageURIWarning.removeAttribute("hidden");
		remotePageURIInfo.setAttribute("hidden", "true");
	} else {
		remotePageURIWarning.setAttribute("hidden", "true");
		remotePageURIInfo.removeAttribute("hidden");
	}
	return canValidate;
};

function remotePageSelect () {
	gValidateURL = false;
	document.getElementById('remotePageURI').value = "";
	document.getElementById('remotePageUsername').value = "";
	document.getElementById('remotePagePassword').value = "";
	
	let type = document.getElementById('remotePageTypeMenulist').value;
	let connection = supportedConnections.filter(connection => connection.id == type);
	document.getElementById('validateButton').hidden=false;
	document.getElementById('validateGoogleButton').hidden=true;
	if (type == 'GOOGLE2' || type == 'GOOGLE3') {
		document.getElementById('remotePageUriLabel').classList.add("disabled");
		document.getElementById('remotePageURI').disabled=true;
		document.getElementById('remotePageURI').removeAttribute('required');
		document.getElementById('remotePageURI').value = cardbookOAuthData[type].ROOT_API;
		document.getElementById('remotePagePasswordLabel').classList.add("disabled");
		document.getElementById('remotePagePassword').disabled=true;
		document.getElementById('rememberPasswordCheckbox').disabled=true;
		document.getElementById('rememberPasswordCheckboxLabel').classList.add("disabled");
		rememberPasswordCheckboxLabel
	} else {
		if (connection[0].url.length) {
			document.getElementById('remotePageUriLabel').classList.add("disabled");
			document.getElementById('remotePageURI').disabled=true;
			document.getElementById('remotePageURI').value = connection[0].url.join("|");
		} else {
			document.getElementById('remotePageUriLabel').classList.remove("disabled");
			document.getElementById('remotePageURI').disabled=false;
		}
		document.getElementById('remotePageURI').setAttribute('required', 'true');
		document.getElementById('remotePagePasswordLabel').classList.remove("disabled");
		document.getElementById('remotePagePassword').disabled=false;
		document.getElementById('rememberPasswordCheckbox').disabled=false;
		document.getElementById('rememberPasswordCheckboxLabel').classList.remove("disabled");
	}
	checklocationNetwork();
	
	let notificationMessage = document.getElementById("resultNotificationsMessage");
	if (connection[0].pwdapp && connection[0].pwdapp == "true") {
		cardbookHTMLNotification.setNotification(notificationMessage, "info", "passwordApplicationRequiredLabel");
	} else {
		cardbookHTMLNotification.setNotification(notificationMessage, "OK");
	}
};

function remotePageInput () {
	gValidateURL = false;
	checklocationNetwork();
	let notificationMessage = document.getElementById("resultNotificationsMessage");
	cardbookHTMLNotification.setNotification(notificationMessage, "OK");
	document.getElementById('validateButton').setAttribute('validated', 'false');
	document.getElementById('validateButton').textContent = messenger.i18n.getMessage("remotePage.validatebutton.label");
};

function remotePageShow () {
	gAccountsFound = [];
	let sortedConnections = [];
	for (let connection of supportedConnections) {
		sortedConnections.push([connection.id, connection.type, connection.url.join("|")]);
	}
	cardbookHTMLUtils.sortMultipleArrayByString(sortedConnections,0,1);
	let remotePageTypeMenulist = document.getElementById('remotePageTypeMenulist');
	cardbookHTMLTools.loadRemotePageTypes(remotePageTypeMenulist, "GOOGLE2", sortedConnections);
	checklocationNetwork();
	remotePageSelect();
	validateURI();
	validateEmail();
};

async function constructComplexSearch () {
	let ABList = document.getElementById('addressbookMenulist');
	await cardbookHTMLTools.loadAddressBooks(ABList, gSearchDefinition.searchAB, true, true, true, false, false);
	cardbookHTMLComplexSearch.loadMatchAll(gSearchDefinition.matchAll);
	await cardbookHTMLComplexSearch.constructDynamicRows("searchTerms", gSearchDefinition.rules, "3.0");
	document.getElementById('searchTerms_0_valueBox').focus();
};

async function checkSearch () {
	await constructComplexSearch();
	let nextButton = document.getElementById('next');
	nextButton.disabled = true;
	function checkTerms() {
		if (cardbookHTMLComplexSearch.getSearch().rules.length) {
			nextButton.disabled = false;
		} else {
			nextButton.disabled = true;
		}
	};
	checkTerms();
	document.getElementById(`searchTermsGroupbox`).addEventListener("input", checkTerms, false);
};

function searchPageAdvance () {
	let mySearch = cardbookHTMLComplexSearch.getSearch();
	gSearchDefinition.searchAB = mySearch.searchAB;
	gSearchDefinition.matchAll = mySearch.matchAll;
	gSearchDefinition.rules = JSON.parse(JSON.stringify(mySearch.rules));
};

function showPassword1 () {
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
};

function showPassword2 (aEvent) {
	let myPasswordTextbox = document.getElementById(aEvent.target.id.replace("Image", "Textbox"));
	let myPasswordImage = document.getElementById(aEvent.target.id);
	if (!myPasswordTextbox.value) {
		return;
	}

	if (myPasswordTextbox.type == "password") {
		myPasswordTextbox.type = "text";
		myPasswordImage.src = "chrome://messenger/skin/icons/visible.svg";
	} else {
		myPasswordTextbox.type = "password";
		myPasswordImage.src = "chrome://messenger/skin/icons/hidden.svg";
	}
};

async function validateURL () {
	let nextButton = document.getElementById('next');
	nextButton.disabled = true;
	let url = document.getElementById('remotePageURI').value.trim();
	url = await messenger.runtime.sendMessage({query: "cardbook.decodeURL", url: url});
	document.getElementById('remotePageURI').value = url;
	document.getElementById('validateButton').disabled = true;
	let id = await messenger.runtime.sendMessage({query: "cardbook.getUUID"});
	let type = document.getElementById('remotePageTypeMenulist').value;
	let username = document.getElementById('remotePageUsername').value;
	let password = document.getElementById('remotePagePassword').value;
	let validationButton = document.getElementById('validateButton');
	let notificationMessage = document.getElementById("resultNotificationsMessage");
	if (!navigator.onLine) {
		cardbookHTMLNotification.setNotification(notificationMessage, "warning", "ValidationFailedOffLine");
	} else {
		launchRequests(id, type, url, username, password, 
				document.getElementById("rememberPasswordCheckbox").checked, validationButton, notificationMessage);
	}
};

async function validateFindLine (aRowId) {
	let type = document.getElementById(`findPageValidateButton${aRowId}`).getAttribute('validationType');
	let id = document.getElementById(`findPageValidateButton${aRowId}`).getAttribute('dirPrefId');
	let url = document.getElementById(`findPageURLTextbox${aRowId}`).value;
	let username = document.getElementById(`findUsernameTextbox${aRowId}`).value;
	let password = "";
	if (document.getElementById(`findPasswordTextbox${aRowId}`)) {
		password = document.getElementById(`findPasswordTextbox${aRowId}`).value;
	}
	let validationButton = document.getElementById(`findPageValidateButton${aRowId}`);
	let notificationMessage = document.getElementById("findPageNotificationsMessage");
	if (!navigator.onLine) {
		cardbookHTMLNotification.setNotification(notificationMessage, "warning", "ValidationFailedOffLine");
	} else {
		launchRequests(id, type, url, username, password, true, validationButton, notificationMessage);
	}
};

async function launchRequests (aDirPrefId, aType, aUrl, aUsername, aPassword, aKeepPassword, aValidationButton, aNotification) {
	let url;
	if (aType == 'GOOGLE2' || aType == 'GOOGLE3') {
		url = cardbookOAuthData[aType].ROOT_API;
	} else if (aType == 'EWS' || aType == 'OFFICE365' || aType == 'HOTMAIL' || aType == 'OUTLOOK') {
		gCardDAVURLs[aDirPrefId] = [];
		url = aUrl;
	} else {
		gCardDAVURLs[aDirPrefId] = [];
		let urls = aUrl.split("|");
		for (let url of urls) {
			url = url.replace("%EMAILADDRESS%", aUsername);
			let url1 = await messenger.runtime.sendMessage({query: "cardbook.getSlashedUrl", url: url});
			gCardDAVURLs[aDirPrefId].push([url1, false]); // [url, discovery]
			gCardDAVURLs[aDirPrefId].push([url1, true]);
			let url2 = await messenger.runtime.sendMessage({query: "cardbook.getWellKnownUrl", url: url});
			gCardDAVURLs[aDirPrefId].push([url2, true]);
		}
	}
	if (aType == 'GOOGLE2' || aType == 'GOOGLE3') {
		if (aNotification) {
			cardbookHTMLNotification.setNotification(aNotification, "info", "Validating1Label", [url]);
		}
		await messenger.runtime.sendMessage({query: "cardbook.initMultipleOperations", dirPrefId: aDirPrefId});
		await messenger.runtime.sendMessage({query: "cardbook.updateServerSyncRequest", dirPrefId: aDirPrefId});
		let connection = {connUser: aUsername, connPrefId: aDirPrefId, connType: aType, connDescription: gValidateDescription};
		await messenger.runtime.sendMessage({query: "cardbook.requestNewRefreshTokenForGooglePeople", connection: connection});
		waitForRefreshTokenFinished(aDirPrefId, aUsername, aType, aValidationButton, aNotification);
	} else if (aType == 'EWS' || aType == 'OFFICE365' || aType == 'HOTMAIL' || aType == 'OUTLOOK') {
		if (aNotification) {
			cardbookHTMLNotification.setNotification(aNotification, "info", "Validating1Label", [url]);
		}
		await messenger.runtime.sendMessage({query: "cardbook.initMultipleOperations", dirPrefId: aDirPrefId});
		await messenger.runtime.sendMessage({query: "cardbook.initServerValidation", dirPrefId: aDirPrefId, user: aUsername});
		await messenger.runtime.sendMessage({query: "cardbook.updateServerSyncRequest", dirPrefId: aDirPrefId});
		let connection = {connUser: aUsername, connPrefId: aDirPrefId, connUrl: url, connType: aType, connDescription: gValidateDescription};
		await messenger.runtime.sendMessage({query: "cardbook.rememberPassword", user: aUsername, url: url, pwd: aPassword, save: aKeepPassword});
		await messenger.runtime.sendMessage({query: "cardbook.validateWithDiscovery", connection: connection});
		waitForDiscoveryFinished(aDirPrefId, aUsername, aType, aValidationButton, aNotification);
	} else {
		await messenger.runtime.sendMessage({query: "cardbook.initDiscoveryOperations", dirPrefId: aDirPrefId});
		gRunningDirPrefId.push(aDirPrefId);
		// works because all URLs have the same root URL
		await messenger.runtime.sendMessage({query: "cardbook.rememberPassword", user: aUsername, url: gCardDAVURLs[aDirPrefId][0][0], pwd: aPassword, save: aKeepPassword});
		await launchCardDAVRequest(aDirPrefId, aUsername, aType, aValidationButton, aNotification);
	}
};

async function launchCardDAVRequest (aDirPrefId, aUsername, aType, aValidationButton, aNotification) {
	if (gCardDAVURLs[aDirPrefId].length > 0) {
		if (aNotification) {
			cardbookHTMLNotification.setNotification(aNotification, "info", "Validating1Label", [gCardDAVURLs[aDirPrefId][0][0]]);
		}
		await messenger.runtime.sendMessage({query: "cardbook.initMultipleOperations", dirPrefId: aDirPrefId});
		await messenger.runtime.sendMessage({query: "cardbook.initServerValidation", dirPrefId: aDirPrefId, user: aUsername});
		await messenger.runtime.sendMessage({query: "cardbook.updateServerSyncRequest", dirPrefId: aDirPrefId});
		let connection = {connUser: aUsername, connPrefId: aDirPrefId, connUrl: gCardDAVURLs[aDirPrefId][0][0], connDescription: gValidateDescription};
		let params = {aPrefIdType: aType};
		if (gCardDAVURLs[aDirPrefId][0][1]) {
			await messenger.runtime.sendMessage({query: "cardbook.discoverPhase1", connection: connection, type:"GETDISPLAYNAME", params: params});
		} else {
			await messenger.runtime.sendMessage({query: "cardbook.validateWithoutDiscovery", connection: connection, type:"GETDISPLAYNAME", params: params});
		}
		waitForDiscoveryFinished(aDirPrefId, aUsername, aType, aValidationButton, aNotification);
	}
};

function waitForDiscoveryFinished (aDirPrefId, aUsername, aType, aValidationButton, aNotification) {
	lTimerDiscoveryAll[aDirPrefId] = setInterval(async function() {
				let cardbookServerValidation = await messenger.runtime.sendMessage({query: "cardbook.getCardbookServerValidation"});
				let cardbookServerDiscoveryRequest = await messenger.runtime.sendMessage({query: "cardbook.getCardbookServerDiscoveryRequest"});
				let cardbookServerDiscoveryResponse = await messenger.runtime.sendMessage({query: "cardbook.getCardbookServerDiscoveryResponse"});
				let cardbookServerDiscoveryError = await messenger.runtime.sendMessage({query: "cardbook.getCardbookServerDiscoveryError"});
				await messenger.runtime.sendMessage({query: "cardbook.updateStatusProgressInformation", string: `${gValidateDescription} : debug mode : cardbookServerDiscoveryRequest : ${cardbookServerDiscoveryRequest[aDirPrefId]}`});
				await messenger.runtime.sendMessage({query: "cardbook.updateStatusProgressInformation", string: `${gValidateDescription} : debug mode : cardbookServerDiscoveryResponse : ${cardbookServerDiscoveryResponse[aDirPrefId]}`});
				await messenger.runtime.sendMessage({query: "cardbook.updateStatusProgressInformation", string: `${gValidateDescription} : debug mode : cardbookServerDiscoveryError : ${cardbookServerDiscoveryError[aDirPrefId]}`});
				await messenger.runtime.sendMessage({query: "cardbook.updateStatusProgressInformation", string: `${gValidateDescription} : debug mode : cardbookServerValidation : ${cardbookServerValidation[aDirPrefId]}`});
				if (cardbookServerDiscoveryError[aDirPrefId] >= 1) {
					if (cardbookServerValidation[aDirPrefId] && cardbookServerValidation[aDirPrefId].length == 0) {
						gCardDAVURLs[aDirPrefId].shift();
						await messenger.runtime.sendMessage({query: "cardbook.finishMultipleOperations", dirPrefId: aDirPrefId});
						if (gCardDAVURLs[aDirPrefId].length == 0) {
							setResultsFlags(aDirPrefId, 0, aValidationButton, aNotification);
							gValidateURL = false;
							hideFindLine(false, aDirPrefId);
							clearInterval(lTimerDiscoveryAll[aDirPrefId]);
						} else {
							aValidationButton.disabled = true;
							clearInterval(lTimerDiscoveryAll[aDirPrefId]);
							await launchCardDAVRequest(aDirPrefId, aUsername, aType, aValidationButton, aNotification);
						}
					} else {
						await messenger.runtime.sendMessage({query: "cardbook.finishMultipleOperations", dirPrefId: aDirPrefId});
						setResultsFlags(aDirPrefId, 0, aValidationButton, aNotification);
						gValidateURL = false;
						hideFindLine(false, aDirPrefId);
						checklocationNetwork();
						clearInterval(lTimerDiscoveryAll[aDirPrefId]);
					}
				} else if (cardbookServerDiscoveryRequest[aDirPrefId] !== cardbookServerDiscoveryResponse[aDirPrefId] || cardbookServerDiscoveryResponse[aDirPrefId] === 0) {
					setResultsFlags(aDirPrefId, 1, aValidationButton, aNotification);
				} else {
					if (cardbookServerValidation[aDirPrefId] && cardbookServerValidation[aDirPrefId].length == 0) {
						gCardDAVURLs[aDirPrefId].shift();
						await messenger.runtime.sendMessage({query: "cardbook.finishMultipleOperations", dirPrefId: aDirPrefId});
						if (gCardDAVURLs[aDirPrefId].length == 0) {
							setResultsFlags(aDirPrefId, 0, aValidationButton, aNotification);
							gValidateURL = false;
							hideFindLine(false, aDirPrefId);
							clearInterval(lTimerDiscoveryAll[aDirPrefId]);
						} else {
							aValidationButton.disabled = true;
							clearInterval(lTimerDiscoveryAll[aDirPrefId]);
							await launchCardDAVRequest(aDirPrefId, aUsername, aType, aValidationButton, aNotification);
						}
					} else {
						gCardDAVURLs = {};
						setResultsFlags(aDirPrefId, 2, aValidationButton, aNotification);
						gValidateURL = true;
						let accountsFound = await messenger.runtime.sendMessage({query: "cardbook.fromValidationToArray", dirPrefId: aDirPrefId, type: aType});
						gAccountsFound = gAccountsFound.concat(accountsFound);
						hideFindLine(true, aDirPrefId);
						await messenger.runtime.sendMessage({query: "cardbook.stopDiscoveryOperations", dirPrefId: aDirPrefId});
						await messenger.runtime.sendMessage({query: "cardbook.finishMultipleOperations", dirPrefId: aDirPrefId});
						clearInterval(lTimerDiscoveryAll[aDirPrefId]);
					}
				}
			}, 1000);
};

function waitForRefreshTokenFinished (aDirPrefId, aUsername, aType, aValidationButton, aNotification) {
	lTimerRefreshTokenAll[aDirPrefId] = setInterval(async function() {
				let cardbookRefreshTokenRequest = await messenger.runtime.sendMessage({query: "cardbook.getCardbookRefreshTokenRequest"});
				let cardbookRefreshTokenResponse = await messenger.runtime.sendMessage({query: "cardbook.getCardbookRefreshTokenResponse"});
				let cardbookRefreshTokenError = await messenger.runtime.sendMessage({query: "cardbook.getCardbookRefreshTokenError"});
				if (cardbookRefreshTokenError[aDirPrefId] >= 1) {
					setResultsFlags(aDirPrefId, 0, aValidationButton, aNotification);
					gValidateURL = false;
					hideFindLine(false, aDirPrefId);
					await messenger.runtime.sendMessage({query: "cardbook.finishMultipleOperations", dirPrefId: aDirPrefId});
					clearInterval(lTimerRefreshTokenAll[aDirPrefId]);
				} else if (cardbookRefreshTokenResponse[aDirPrefId] !== cardbookRefreshTokenRequest[aDirPrefId]) {
					setResultsFlags(aDirPrefId, 1, aValidationButton, aNotification);
				} else {
					gAccountsFound.push([aType,
						cardbookOAuthData[aType].ROOT_API,
						aUsername,
						aUsername,
						cardbookOAuthData[aType].VCARD_VERSIONS,
						"",
						"",
						false,
						false]);
					gValidateURL = true;
					hideFindLine(true, aDirPrefId);
					setResultsFlags(aDirPrefId, 2, aValidationButton, aNotification);
					await messenger.runtime.sendMessage({query: "cardbook.finishMultipleOperations", dirPrefId: aDirPrefId});
					clearInterval(lTimerRefreshTokenAll[aDirPrefId]);
				}
			}, 1000);
};

function setResultsFlags (aDirPrefId, aStatus, aValidationButton, aNotification) {
	if (aStatus == 0) {
		if (aNotification) {
			cardbookHTMLNotification.setNotification(aNotification, "warning", "ValidationFailedLabel");
		}
		aValidationButton.setAttribute('validated', 'false');
		aValidationButton.textContent = messenger.i18n.getMessage("ValidationFailedLabel");
		aValidationButton.disabled = false;
	} else if (aStatus == 1) {
		if (aNotification && gCardDAVURLs[aDirPrefId] && gCardDAVURLs[aDirPrefId][0]) {
			cardbookHTMLNotification.setNotification(aNotification, "info", "Validating1Label", [gCardDAVURLs[aDirPrefId][0][0]]);
		}
		aValidationButton.textContent = messenger.i18n.getMessage("Validating2Label");
	} else {
		if (aNotification) {
			cardbookHTMLNotification.setNotification(aNotification, "OK");
		}
		aValidationButton.setAttribute('validated', 'true');
		aValidationButton.textContent = messenger.i18n.getMessage("ValidationOKLabel");
		aValidationButton.disabled = true;
	}
};

async function loadSearchName () {
	if (dirPrefId) {
		let name = await cardbookNewPreferences.getName(dirPrefId);
		document.getElementById('searchNamePageName').value = name;
	}
	checkRequired();
};

function createBoxesForNames (aType, aURL, aName, aVersionList, aUsername, aActionType, aSourceDirPrefId, aSourceCollected, aReadOnly) {
	let table = document.getElementById('namesTable');
	let aId = table.rows.length - 1;
	let aRow = cardbookHTMLTools.addHTMLTR(table, `namesRow${aId}`, {"class": "hcentered"});

	let checkboxData = cardbookHTMLTools.addHTMLTD(aRow, `namesTableData.${aId}.1`);
	let checkbox = cardbookHTMLTools.addHTMLINPUT(checkboxData, `namesCheckbox${aId}`, null, 
						{ "type": "checkbox", "validationType": aType, "username": aUsername, "actionType": aActionType,
						"sourceDirPrefId": aSourceDirPrefId, "sourceCollected": aSourceCollected.toString(), "readOnly": aReadOnly.toString()});
	checkbox.checked = true;
	checkbox.addEventListener("input", function() {
			let textbox = document.getElementById('namesTextbox' + this.id.replace("namesCheckbox",""));
			if (this.checked) {
				textbox.setAttribute('required', true);
			} else {
				textbox.setAttribute('required', false);
			}
			checkNamesLinesRequired();
		}, false);

	let nameData = cardbookHTMLTools.addHTMLTD(aRow, `namesTableData.${aId}.2`);
	let nameTextbox = cardbookHTMLTools.addHTMLINPUT(nameData, `namesTextbox${aId}`, aName, {"type": "text", "required": "true"});
	nameTextbox.addEventListener("input", function() {
			checkNamesLinesRequired();
		}, false);

	let colorData = cardbookHTMLTools.addHTMLTD(aRow, `namesTableData.${aId}.3`);
	let colorbox = cardbookHTMLTools.addHTMLINPUT(colorData, `serverColorInput${aId}`, cardbookHTMLUtils.randomColor(100),
					 {"type": "color", "title": messenger.i18n.getMessage("colorAccountsTooltip")});
	
	let menuData = cardbookHTMLTools.addHTMLTD(aRow, `namesTableData.${aId}.4`);
	let menuList = cardbookHTMLTools.addHTMLSELECT(menuData, `vCardVersionPageName${aId}`, "", {"type": "color"});
	cardbookHTMLTools.loadVCardVersions(menuList, aVersionList, supportedVersion);

	let URLData = cardbookHTMLTools.addHTMLTD(aRow, `namesTableData.${aId}.5`);
	let URLTextbox = cardbookHTMLTools.addHTMLINPUT(URLData, `URLTextbox${aId}`, aURL, {"hidden": true});

	let checkbox1Data = cardbookHTMLTools.addHTMLTD(aRow, `namesTableData.${aId}.6`);
	let checkbox1 = cardbookHTMLTools.addHTMLINPUT(checkbox1Data, `DBCachedCheckbox${aId}`, null, { "type": "checkbox", "checked": "true"});
	if (aType == "CARDDAV") {
		checkbox1.setAttribute('enabled', false);
	} else {
		checkbox1.setAttribute('disabled', true);
	}
};


function hideFindLine (aValidation, aDirPrefId) {
	if (getCurrentPage() == "namesPage") {
		if (aValidation) {
			let table = document.getElementById('findTable');
			let findRows = table.querySelectorAll("tr[dirPrefId=\"" + aDirPrefId + "\"]");
			for (let row of findRows) {
				row.classList.add("hidden");
			}
			loadNames();
		}
	} else {
		checklocationNetwork();
	}
};

function loadNames () {
	cardbookHTMLTools.deleteTableRows('namesTable', 'namesTableRow');
	if (action == "discovery") {
		setCanRewindFalse();
	}
	if (gAccountsFound.length > 1) {
		document.getElementById('namesPageDescription').classList.remove("hidden");
	} else {
		document.getElementById('namesPageDescription').classList.add("hidden");
	}
	for (let accountFound of gAccountsFound) {
		createBoxesForNames(accountFound[0], accountFound[1], accountFound[3],
											accountFound[4], accountFound[2], accountFound[5], accountFound[6],
											accountFound[7], accountFound[8]);
	}
	let table = document.getElementById('findTable');
	let remainingRows = table.querySelectorAll("tr:not(.hidden)");
	if (remainingRows.length == 1) {
		document.getElementById('findHeadersRow').classList.add("hidden");
		for (let node of document.getElementById('findPageNameDescription').querySelectorAll("label")) {
			node.classList.add("hidden");
		}
	}
	checkNamesLinesRequired();
};

async function createBoxesForFinds (aConnectionType, aUsername, aPassword, aVCardVersion, aUrl, aABName) {
	let table = document.getElementById('findTable');
	let aId = table.rows.length - 1;
	let dirPrefId = await messenger.runtime.sendMessage({query: "cardbook.getUUID"});

	let aRow = cardbookHTMLTools.addHTMLTR(table, `findTable.${aId}`, {"dirPrefId": dirPrefId, "class": "hcentered"});
	
	let buttonData = cardbookHTMLTools.addHTMLTD(aRow, `findTableData.${aId}.1`);
	let button = cardbookHTMLTools.addHTMLBUTTON(buttonData, `findPageValidateButton${aId}`, messenger.i18n.getMessage("noValidatedEntryTooltip"), 
						{ "dirPrefId": dirPrefId, "validationType": aConnectionType, "validated": "false"});
	button.addEventListener("click", function() {
			var myId = this.id.replace("findPageValidateButton","");
			validateFindLine(myId);
		}, false);

	let ABnameData = cardbookHTMLTools.addHTMLTD(aRow, `findTableData.${aId}.2`);
	let ABnameTextbox = cardbookHTMLTools.addHTMLLABEL(ABnameData, `findABnameTextbox${aId}`, aABName, {"type": "text", "class": "disabled"});

	let usernameData = cardbookHTMLTools.addHTMLTD(aRow, `findTableData.${aId}.3`);
	let usernameTextbox = cardbookHTMLTools.addHTMLINPUT(usernameData, `findUsernameTextbox${aId}`, aUsername, {"type": "text", "required": "true"});

	let paswordData = cardbookHTMLTools.addHTMLTD(aRow, `findTableData.${aId}.4`, {"class": "hbox"});
	if (aPassword != null) {
		let passwordTextbox = cardbookHTMLTools.addHTMLINPUT(paswordData, `findPasswordTextbox${aId}`, aPassword, {"required": "true", "type": "password"});
		let passwordImage = cardbookHTMLTools.addHTMLIMAGE(paswordData, `findPasswordImage${aId}`, {"title": messenger.i18n.getMessage("showHidePassword"),
								 "class": "form-icon", "src": "chrome://messenger/skin/icons/hidden.svg"});
		passwordImage.addEventListener("click", event => showPassword2(event));
	}

	let versionData = cardbookHTMLTools.addHTMLTD(aRow, `findTableData.${aId}.5`);
	let versionTextbox = cardbookHTMLTools.addHTMLINPUT(versionData, `findPageVCardVersionsTextbox${aId}`, aVCardVersion, {"hidden": "true"});

	let URLData = cardbookHTMLTools.addHTMLTD(aRow, `findTableData.${aId}.6`);
	let URLTextbox = cardbookHTMLTools.addHTMLINPUT(URLData, `findPageURLTextbox${aId}`, aUrl, {"hidden": "true"});

	let ABNameData = cardbookHTMLTools.addHTMLTD(aRow, `findTableData.${aId}.7`);
	let ABNameTextbox = cardbookHTMLTools.addHTMLINPUT(ABNameData, `findPageABNameTextbox${aId}`, aABName, {"hidden": "true"});

	var found = false;
	for (var i = 0; i < table.rows.length; i++) {
		if (document.getElementById(`findPasswordTextbox${i}`)) {
			found = true;
			break;
		}
	}
	if (found) {
		document.getElementById('findPagePasswordLabel').removeAttribute('hidden');
	} else {
		document.getElementById('findPagePasswordLabel').setAttribute('hidden', 'true');
	}
};

async function loadRemoteStandardAB () {
	cardbookHTMLTools.deleteTableRows('findTable', 'findHeadersRow');
	// possibility at first use to set carddav accounts from the preferences
	var setupCardDAVAccounts = await cardbookHTMLUtils.getPrefValue("setupCardDAVAccounts");
	if (setupCardDAVAccounts != "") {
		var setupCardDAVAccountsArray = setupCardDAVAccounts.split(',');
		for (account of setupCardDAVAccountsArray) {
			var accountValue = account.split('::');
			var vCardVersion = accountValue[2] ? accountValue[2] : "";
			await createBoxesForFinds("CARDDAV", accountValue[0], "", vCardVersion, accountValue[1], "");
		}
	}

	// get remote address book from email accounts
	var sortedEmailAccounts = [];
	for (let account of await browser.accounts.list()) {
		if (account.type == "pop3" || account.type == "imap") {
			for (let identity of account.identities) {
				if (account.type == "pop3" || account.type == "imap") {
					sortedEmailAccounts.push(identity.email.toLowerCase());
				}
			}
		}
	}
	cardbookHTMLUtils.sortArrayByString(sortedEmailAccounts,1);
	sortedEmailAccounts = cardbookHTMLUtils.arrayUnique(sortedEmailAccounts);
	await messenger.runtime.sendMessage({query: "cardbook.updateStatusProgressInformation", string: `${gValidateDescription} : debug mode : sortedEmailAccounts : ${sortedEmailAccounts}`});

	for (let email of sortedEmailAccounts) {
		let found = false;
		// first OAuth 
		for (var j in cardbookOAuthData) {
			if (j == "GOOGLE3"){
				continue;
			}
			if (cardbookOAuthData[j].EMAIL_TYPE && email.endsWith(cardbookOAuthData[j].EMAIL_TYPE)) {
				await createBoxesForFinds(j, email, null, cardbookOAuthData[j].VCARD_VERSIONS.toString(),
															cardbookOAuthData[j].ROOT_API, email);
				found = true;
				break;
			}
		}
		let domain = email.split("@")[1];
		let domainShort = domain.split(".")[0];
		// then MICROSOFT and CARDDAV
		if (!found) {
			let connections = supportedConnections.filter(connection => connection.id == domainShort.toUpperCase());
			if (connections.length) {
				let connection = connections[0];
				let password = await messenger.runtime.sendMessage({query: "cardbook.getDomainPassword", domain: domain});
				let url = connection.url.join("|").replace("%EMAILADDRESS%", email);
				await createBoxesForFinds(connection.type, email, password, connection.vCard, url, email);
			} else {
				connections = supportedConnections.filter(connection => connection.id == domain.toUpperCase());
				if (connections.length) {
					let connection = connections[0];
					let password = await messenger.runtime.sendMessage({query: "cardbook.getDomainPassword", domain: domain});
					let url = connection.url.join("|").replace("%EMAILADDRESS%", email);
					await createBoxesForFinds(connection.type, email, password, connection.vCard, url, email);
				}
			}
		}
	}

	// get remote address book from standard address books
	for (let AB of await messenger.runtime.sendMessage({query: "cardbook.getRemoteStandardAB"})) {
		if (sortedEmailAccounts.includes(AB.user) && AB.url.startsWith("https://www.googleapis.com")) {
			continue;
		}
		let pwd = await messenger.runtime.sendMessage({query: "cardbook.getPassword", user: AB.user, url: AB.url});
		await createBoxesForFinds("CARDDAV", AB.user, pwd, "", AB.url, AB.name);
	}

	setFindLinesHeader();
};

function setFindLinesHeader () {
	if (document.getElementById('findTable').rows.length == 1) {
		document.getElementById('findHeadersRow').classList.add("hidden");
		document.getElementById('findPageName1Description').classList.remove("hidden");
		document.getElementById('findPageName2Description').classList.add("hidden");
		document.getElementById('findPageName3Description').classList.add("hidden");
	} else if (document.getElementById('findTable').rows.length == 2) {
		document.getElementById('findHeadersRow').classList.remove("hidden");
		document.getElementById('findPageName1Description').classList.add("hidden");
		document.getElementById('findPageName2Description').classList.remove("hidden");
		document.getElementById('findPageName3Description').classList.add("hidden");
	} else {
		document.getElementById('findHeadersRow').classList.remove("hidden");
		document.getElementById('findPageName1Description').classList.add("hidden");
		document.getElementById('findPageName2Description').classList.add("hidden");
		document.getElementById('findPageName3Description').classList.remove("hidden");
	}
};

async function finishPageShow () {
	await prepareSearchAllContactsAddressbook();
	setCanRewindFalse();
	document.getElementById('next').textContent = messenger.i18n.getMessage("wizard.create.label");
	if (gFinishParams.length > 1) {
		document.getElementById('finishPage1Description').classList.add("hidden");
		document.getElementById('finishPage2Description').classList.remove("hidden");
	} else {
		document.getElementById('finishPage1Description').classList.remove("hidden");
		document.getElementById('finishPage2Description').classList.add("hidden");
	}
};

async function prepareSearchAllContactsAddressbook () {
	if (action == "first") {
		let id = await messenger.runtime.sendMessage({query: "cardbook.getUUID"});
		let name = messenger.i18n.getMessage("allContacts");
		gFinishParams.push({type: "SEARCH", search: { searchAB: "allAddressBooks", matchAll: true, rules: [ { case: "dig", field: "version", term: "IsntEmpty", value: "" } ] },
													name: name, username: "", color: "", vcard: "", enabled: true,
													dirPrefId: id, DBcached: false, firstAction: false});
	}
};

async function prepareSearchAddressbook () {
	var name = document.getElementById('searchNamePageName').value;
	var id = dirPrefId;
	if (dirPrefId) {
		var enabled = await cardbookNewPreferences.getEnabled(dirPrefId);
	} else {
		id = await messenger.runtime.sendMessage({query: "cardbook.getUUID"});
		var enabled = true;
	}
	gFinishParams.push({type: "SEARCH", search: cardbookHTMLComplexSearch.getSearch(), name: name, username: "", color: "", vcard: "", enabled: enabled,
												dirPrefId: id, DBcached: false, firstAction: false});
};

async function prepareAddressbooks () {
	gFinishParams = [];
	var i = 0;
	while (true) {
		if (document.getElementById(`namesCheckbox${i}`)) {
			var aCheckbox = document.getElementById(`namesCheckbox${i}`);
			if (aCheckbox.checked) {
				var myType = aCheckbox.getAttribute('validationType');
				var aAddressbookId = await messenger.runtime.sendMessage({query: "cardbook.getUUID"});
				var aAddressbookName = document.getElementById(`namesTextbox${i}`).value;
				var aAddressbookColor = document.getElementById(`serverColorInput${i}`).value;
				var aAddressbookVCard = document.getElementById(`vCardVersionPageName${i}`).value;
				var aAddressbookDBCached = document.getElementById(`DBCachedCheckbox${i}`).checked;
				var aAddressbookURL = document.getElementById(`URLTextbox${i}`).value;
				var aAddressbookUsername = aCheckbox.getAttribute('username');
				var aAddressbookValidationType = aCheckbox.getAttribute('validationType');
				var aAddressbookActionType = aCheckbox.getAttribute('actionType');
				var aAddressbookSourceDirPrefId = aCheckbox.getAttribute('sourceDirPrefId');
				var aAddressbookSourceCollected = (aCheckbox.getAttribute('sourceCollected') == 'true');
				var aAddressbookReadOnly = (aCheckbox.getAttribute('readOnly') == 'true');

				let isRemote = await messenger.runtime.sendMessage({query: "cardbook.isMyAccountRemote", type: myType});	
				if (isRemote) {
					// the discover should be redone at every sync
					if (myType == 'APPLE' || myType == 'YAHOO') {
						let connection = supportedConnections.filter(connection => connection.id == myType);
						aAddressbookURL = connection[0].url[0];
					}
					if (myType == 'GOOGLE3' || aAddressbookUsername == "") {
						aAddressbookReadOnly = true;
					}
					gFinishParams.push({type: aAddressbookValidationType, url: aAddressbookURL, name: aAddressbookName, username: aAddressbookUsername, color: aAddressbookColor,
															vcard: aAddressbookVCard, readonly: aAddressbookReadOnly, dirPrefId: aAddressbookId, sourceDirPrefId: aAddressbookSourceDirPrefId,
															DBcached: aAddressbookDBCached, firstAction: false});
				} else if (myType == "LOCALDB") {
					gFinishParams.push({type: aAddressbookValidationType, name: aAddressbookName, username: "", color: aAddressbookColor, vcard: aAddressbookVCard, readonly: aAddressbookReadOnly, dirPrefId: aAddressbookId,
																DBcached: true, firstAction: false});
				} else if (myType == "FILE" || myType == "DIRECTORY") {
					gFinishParams.push({type: aAddressbookValidationType, actionType: aAddressbookActionType, filepath: gFilepath, name: aAddressbookName, username: "",
															color: aAddressbookColor, vcard: aAddressbookVCard, readonly: aAddressbookReadOnly, dirPrefId: aAddressbookId, DBcached: false, firstAction: false});
				} else if (myType == "STANDARD") {
					if (action == "first") {
						var aFirstAction = true;
					} else {
						var aFirstAction = false;
					}
					gFinishParams.push({type: "STANDARD", sourceDirPrefId: aAddressbookSourceDirPrefId,
														name: aAddressbookName, username: "", color: aAddressbookColor, vcard: aAddressbookVCard, readonly: aAddressbookReadOnly,
														dirPrefId: aAddressbookId, collected: aAddressbookSourceCollected,
														DBcached: true, firstAction: aFirstAction});
				}
			}
			i++;
		} else {
			break;
		}
	}
};

function setCanRewindFalse () {
	let backButton = document.getElementById('back');
	backButton.hidden = true;
};

async function createAddressbook () {
	for (let account of gFinishParams) {
		if (action == "search" && dirPrefId) {
			account.urnuuid = false;
			await messenger.runtime.sendMessage({query: "cardbook.notifyObserver", value: "cardbook.AB.saveSearchAB", params: JSON.stringify(account)});
		} else {
			await messenger.runtime.sendMessage({query: "cardbook.notifyObserver", value: "cardbook.AB.saveNewAB", params: JSON.stringify(account)});
		}
	}
};

async function cancelWizard () {
	for (var dirPrefId of gRunningDirPrefId) {
		await messenger.runtime.sendMessage({query: "cardbook.finishMultipleOperations", dirPrefId: dirPrefId});
		await messenger.runtime.sendMessage({query: "cardbook.stopDiscoveryOperations", dirPrefId: dirPrefId});
	}
	for (var dirPrefId in lTimerRefreshTokenAll) {
		try {
			clearInterval(lTimerRefreshTokenAll[dirPrefId]);
		} catch(e) {}
	}
	for (var dirPrefId in lTimerDiscoveryAll) {
		try {
			clearInterval(lTimerDiscoveryAll[dirPrefId]);
		} catch(e) {}
	}
	cardbookHTMLRichContext.closeWindow();
};

async function finishWizard () {
	await createAddressbook();
	await cancelWizard();
};

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

await onLoadDialog();

messenger.runtime.onMessage.addListener( (info) => {
	switch (info.query) {
		case "cardbook.callFilePickerDone":
		case "cardbook.callDirPickerDone":
			setFile(info.id, info.file);
			break;
	}
});
