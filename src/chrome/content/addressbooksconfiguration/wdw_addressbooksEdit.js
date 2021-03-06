var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var initialVCardVersion = "";
var initialNodeType = "";

function convertNodes () {
	if (document.getElementById("nodeRadiogroup").value == "categories") {
		cardbookRepository.cardbookAccountsNodes[window.arguments[0].dirPrefId] = [];
	} else {
		Services.tm.currentThread.dispatch({ run: function() {
			for (let card of cardbookRepository.cardbookDisplayCards[window.arguments[0].dirPrefId].cards) {
				cardbookRepository.addCardToOrg(card, window.arguments[0].dirPrefId);
			}
		}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
	}
};

function convertVCards () {
	Services.tm.currentThread.dispatch({ run: async function() {
		let myTopic = "cardsConverted";
		let myActionId = cardbookActions.startAction(myTopic);
		let myTargetVersion = cardbookRepository.cardbookPreferences.getVCardVersion(window.arguments[0].dirPrefId);
		let myTargetName = cardbookRepository.cardbookPreferences.getName(window.arguments[0].dirPrefId);
		// the date format is no longer stored
		let myNewDateFormat = cardbookRepository.getDateFormat(window.arguments[0].dirPrefId, initialVCardVersion);
		let counter = 0;

		for (let card of cardbookRepository.cardbookDisplayCards[window.arguments[0].dirPrefId].cards) {
			let myTempCard = new cardbookCardParser();
			cardbookRepository.cardbookUtils.cloneCard(card, myTempCard);
			if (cardbookRepository.cardbookUtils.convertVCard(myTempCard, myTargetName, myTargetVersion, myNewDateFormat, myNewDateFormat)) {
				await cardbookRepository.saveCardFromUpdate(card, myTempCard, myActionId, false);
				counter++;
			}
		}

		cardbookRepository.writePossibleCustomFields();
		deleteOldDateFormat();
		document.getElementById("convertVCardsLabel").setAttribute('hidden', 'true');
		cardbookRepository.cardbookUtils.formatStringForOutput(myTopic, [myTargetName, myTargetVersion, counter]);
		await cardbookActions.endAction(myActionId);
	}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
};

function loadFnFormula () {
	document.getElementById("fnFormulaTextBox").value = cardbookRepository.cardbookPreferences.getFnFormula(window.arguments[0].dirPrefId);
	var orgStructure = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
	if (orgStructure != "") {
		var allOrg = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
	} else {
		var allOrg = [];
	}
	document.getElementById('formulaMemberLabel1').value = "{{1}} : " + cardbookRepository.extension.localeData.localizeMessage("prefixnameLabel");
	document.getElementById('formulaMemberLabel2').value = "{{2}} : " + cardbookRepository.extension.localeData.localizeMessage("firstnameLabel");
	document.getElementById('formulaMemberLabel3').value = "{{3}} : " + cardbookRepository.extension.localeData.localizeMessage("othernameLabel");
	document.getElementById('formulaMemberLabel4').value = "{{4}} : " + cardbookRepository.extension.localeData.localizeMessage("lastnameLabel");
	document.getElementById('formulaMemberLabel5').value = "{{5}} : " + cardbookRepository.extension.localeData.localizeMessage("suffixnameLabel");
	document.getElementById('formulaMemberLabel6').value = "{{6}} : " + cardbookRepository.extension.localeData.localizeMessage("nicknameLabel");
	document.getElementById('formulaSampleTextBox1').value = cardbookRepository.extension.localeData.localizeMessage("prefixnameLabel");
	document.getElementById('formulaSampleTextBox2').value = cardbookRepository.extension.localeData.localizeMessage("firstnameLabel");
	document.getElementById('formulaSampleTextBox3').value = cardbookRepository.extension.localeData.localizeMessage("othernameLabel");
	document.getElementById('formulaSampleTextBox4').value = cardbookRepository.extension.localeData.localizeMessage("lastnameLabel");
	document.getElementById('formulaSampleTextBox5').value = cardbookRepository.extension.localeData.localizeMessage("suffixnameLabel");
	document.getElementById('formulaSampleTextBox6').value = cardbookRepository.extension.localeData.localizeMessage("nicknameLabel");

	let count = 6;
	let table = document.getElementById('formulaSampleTable');
	if (allOrg.length == 0) {
		count++;
		let row = cardbookElementTools.addHTMLTR(table, 'formulaSampleTableRow.' + count);
		let labelData = cardbookElementTools.addHTMLTD(row, 'formulaSampleTableData.' + count + '.1');
		let label = cardbookElementTools.addLabel(labelData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + cardbookRepository.extension.localeData.localizeMessage("orgLabel"), null, {});
		let textboxData = cardbookElementTools.addHTMLTD(row, 'formulaSampleTableData.' + count + '.2', {class: "cardbook-td-input"});
		let textbox = cardbookElementTools.addHTMLINPUT(textboxData, 'formulaSampleTextBox' + count, cardbookRepository.extension.localeData.localizeMessage("orgLabel"), {});
		textbox.addEventListener("input", changeFnPreview);
	} else {
		for (let org of allOrg) {
			count++;
			let row = cardbookElementTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
			let labelData = cardbookElementTools.addHTMLTD(row, 'formulaSampleTableData.' + count + '.1');
			let label = cardbookElementTools.addLabel(labelData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + org, null, {});
			let textboxData = cardbookElementTools.addHTMLTD(row, 'formulaSampleTableData.' + count + '.2', {class: "cardbook-td-input"});
			let textbox = cardbookElementTools.addHTMLINPUT(textboxData, 'formulaSampleTextBox' + count, org, {});
			textbox.addEventListener("input", changeFnPreview);
		}
	}
	count++;
	let rowTitle = cardbookElementTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
	let labelTitleData = cardbookElementTools.addHTMLTD(rowTitle, 'formulaSampleTableData.' + count + '.1');
	let labelTitle = cardbookElementTools.addLabel(labelTitleData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + cardbookRepository.extension.localeData.localizeMessage("titleLabel"), null, {});
	let textboxTitleData = cardbookElementTools.addHTMLTD(rowTitle, 'formulaSampleTableData.' + count + '.2', {class: "cardbook-td-input"});
	let textboxTitle = cardbookElementTools.addHTMLINPUT(textboxTitleData, 'formulaSampleTextBox' + count, cardbookRepository.extension.localeData.localizeMessage("titleLabel"), {});
	textboxTitle.addEventListener("input", changeFnPreview);
	count++;
	let rowRole = cardbookElementTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
	let labelRoleData = cardbookElementTools.addHTMLTD(rowRole, 'formulaSampleTableData.' + count + '.1');
	let labelRole = cardbookElementTools.addLabel(labelRoleData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + cardbookRepository.extension.localeData.localizeMessage("roleLabel"), null, {});
	let textboxRoleData = cardbookElementTools.addHTMLTD(rowRole, 'formulaSampleTableData.' + count + '.2', {class: "cardbook-td-input"});
	let textboxRole = cardbookElementTools.addHTMLINPUT(textboxRoleData, 'formulaSampleTextBox' + count, cardbookRepository.extension.localeData.localizeMessage("roleLabel"), {});
	textboxRole.addEventListener("input", changeFnPreview);
	changeFnPreview();
};

function changeFnPreview () {
	let fnFormula = document.getElementById('fnFormulaTextBox').value.replace(/\\n/g, "\n").trim();
	let fn = [];
	let i = 1;
	while (true) {
		if (document.getElementById('formulaSampleTextBox' + i)) {
			fn.push(document.getElementById('formulaSampleTextBox' + i).value);
			i++;
		} else {
			break;
		}
	}
	document.getElementById('fnPreviewTextBox').value = cardbookRepository.cardbookUtils.getStringFromFormula(fnFormula, fn);
};

function populateApplyToAB () {
	let applyToABMenupopup = document.getElementById('applyToABMenupopup');
	let applyToABButton = document.getElementById('applyToABButton');
	cardbookElementTools.loadAddressBooks(applyToABMenupopup, applyToABButton, "", true, true, true, false, true);
};

function applyApplyToAB (aEvent) {
	if (aEvent.target && aEvent.target.value) {
		let myDirPrefId = aEvent.target.value;
		for (let account of cardbookRepository.cardbookAccounts) {
			if (account[1]) {
				if ((account[4] == myDirPrefId) || ("allAddressBooks" == myDirPrefId)) {
					cardbookRepository.cardbookPreferences.setFnFormula(account[4], document.getElementById('fnFormulaTextBox').value);
				}
			}
		}
	}
};

function resetFnFormula () {
	document.getElementById('fnFormulaTextBox').value = cardbookRepository.defaultFnFormula;
	changeFnPreview();
};

function showAutoSyncInterval () {
	if (document.getElementById('autoSyncCheckBox').checked && document.getElementById("AB-enabled-checkbox").checked) {
		document.getElementById('autoSyncInterval').disabled = false;
		document.getElementById('autoSyncIntervalTextBox').disabled = false;
	} else {
		document.getElementById('autoSyncInterval').disabled = true;
		document.getElementById('autoSyncIntervalTextBox').disabled = true;
	}
};

function setupEnabledCheckbox() {
	let isEnabled = document.getElementById("AB-enabled-checkbox").checked;
	let els = document.getElementsByAttribute("disable-with-AB", "true");
	for (let i = 0; i < els.length; i++) {
		els[i].disabled = !isEnabled || els[i].getAttribute("disable-capability") == "true";
	}
	if (cardbookRepository.cardbookPreferences.getType(window.arguments[0].dirPrefId) == "GOOGLE3") {
		document.getElementById('readonlyCheckBox').disabled = true;
	}
};

function onLoadDialog () {
	i18n.updateDocument({ extension: cardbookRepository.extension });
	initialVCardVersion = cardbookRepository.cardbookPreferences.getVCardVersion(window.arguments[0].dirPrefId)
	initialNodeType = cardbookRepository.cardbookPreferences.getNode(window.arguments[0].dirPrefId);

	document.getElementById("AB-enabled-checkbox").setAttribute('checked', cardbookRepository.cardbookPreferences.getEnabled(window.arguments[0].dirPrefId));

	document.getElementById("nameTextBox").value = cardbookRepository.cardbookPreferences.getName(window.arguments[0].dirPrefId);
	document.getElementById("nodeRadiogroup").value = initialNodeType;
	document.getElementById("colorInput").value = cardbookRepository.cardbookPreferences.getColor(window.arguments[0].dirPrefId);
	document.getElementById("typeTextBox").value = cardbookRepository.cardbookPreferences.getType(window.arguments[0].dirPrefId);
	
	document.getElementById("urlTextBox").value = cardbookRepository.cardbookPreferences.getUrl(window.arguments[0].dirPrefId);
	document.getElementById("usernameTextBox").value = cardbookRepository.cardbookPreferences.getUser(window.arguments[0].dirPrefId);
	document.getElementById("readonlyCheckBox").checked = cardbookRepository.cardbookPreferences.getReadOnly(window.arguments[0].dirPrefId);
	document.getElementById("vCardVersionTextBox").value = initialVCardVersion;

	document.getElementById("urnuuidCheckBox").checked = cardbookRepository.cardbookPreferences.getUrnuuid(window.arguments[0].dirPrefId);
	document.getElementById("DBCachedCheckBox").checked = cardbookRepository.cardbookPreferences.getDBCached(window.arguments[0].dirPrefId);

	if (cardbookRepository.cardbookUtils.isMyAccountRemote(document.getElementById("typeTextBox").value) && cardbookRepository.cardbookPreferences.getDBCached(window.arguments[0].dirPrefId)) {
		document.getElementById('syncTab').setAttribute("collapsed", false);
		document.getElementById("autoSyncCheckBox").setAttribute('checked', cardbookRepository.cardbookPreferences.getAutoSyncEnabled(window.arguments[0].dirPrefId));
		document.getElementById("autoSyncIntervalTextBox").value = cardbookRepository.cardbookPreferences.getAutoSyncInterval(window.arguments[0].dirPrefId);
	} else {
		document.getElementById('syncTab').setAttribute("collapsed", true);
	}

	setupEnabledCheckbox();
	showAutoSyncInterval();
	
	showPane('generalTabPanel');
	loadFnFormula();
	searchForWrongCards();
	populateApplyToAB();
};

function deleteOldDateFormat () {
	try {
		cardbookRepository.cardbookPreferences.delBranch(cardbookRepository.cardbookPreferences.prefCardBookData + window.arguments[0].dirPrefId + "." + "dateFormat");
	}
	catch(e) {}
};

function searchForWrongCards () {
	Services.tm.currentThread.dispatch({ run: function() {
		let myVersion = cardbookRepository.cardbookPreferences.getVCardVersion(window.arguments[0].dirPrefId);
		for (let card of cardbookRepository.cardbookDisplayCards[window.arguments[0].dirPrefId].cards) {
			if (card.version != myVersion) {
				document.getElementById("convertVCardsLabel").removeAttribute('hidden');
				break;
			}
		}
		deleteOldDateFormat();
	}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
};

function onAcceptDialog () {
	var myDirPrefId = window.arguments[0].dirPrefId;
	cardbookRepository.cardbookPreferences.setColor(myDirPrefId, document.getElementById('colorInput').value);
	cardbookRepository.cardbookPreferences.setAutoSyncEnabled(myDirPrefId, document.getElementById('autoSyncCheckBox').checked);
	cardbookRepository.cardbookPreferences.setAutoSyncInterval(myDirPrefId, document.getElementById('autoSyncIntervalTextBox').value);
	cardbookRepository.cardbookPreferences.setFnFormula(myDirPrefId, document.getElementById('fnFormulaTextBox').value);

	if (document.getElementById('autoSyncCheckBox').checked) {
		cardbookRepository.cardbookSynchronization.removePeriodicSync(myDirPrefId, document.getElementById('nameTextBox').value);
		cardbookRepository.cardbookSynchronization.addPeriodicSync(myDirPrefId, document.getElementById('nameTextBox').value, document.getElementById('autoSyncIntervalTextBox').value);
	} else {
		cardbookRepository.cardbookSynchronization.removePeriodicSync(myDirPrefId, document.getElementById('nameTextBox').value);
	}

	if (initialNodeType != document.getElementById('nodeRadiogroup').value) {
		cardbookRepository.cardbookPreferences.setNode(window.arguments[0].dirPrefId, document.getElementById("nodeRadiogroup").value);
		convertNodes();
	}

	window.arguments[0].serverCallback("SAVE", myDirPrefId, document.getElementById('nameTextBox').value,
										document.getElementById('readonlyCheckBox').checked, document.getElementById('AB-enabled-checkbox').checked);
	close();
};

function onCancelDialog () {
	window.arguments[0].serverCallback("CANCEL", window.arguments[0].dirPrefId);
	close();
};

function showPane (paneID) {
	if (!paneID) {
		return;
	}
	
	let pane = document.getElementById(paneID);
	if (!pane) {
		return;
	}
	
	let tabnodes = document.getElementById("rightPaneDownHbox1").querySelectorAll(".cardbookTab");
	for (let node of tabnodes) {
		if (node.id != paneID) {
			node.setAttribute("hidden", "true");
			document.getElementById(node.id.replace("Panel", "")).removeAttribute("visuallyselected");
		} else {
			document.getElementById(node.id.replace("Panel", "")).setAttribute("visuallyselected", "true");
			node.removeAttribute("hidden");
		}
	}
};

document.addEventListener("DOMContentLoaded", onLoadDialog);
document.addEventListener("dialogaccept", onAcceptDialog);
document.addEventListener("dialogcancel", onCancelDialog);
