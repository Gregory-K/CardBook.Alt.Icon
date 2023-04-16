import { cardbookNewPreferences } from "../preferences/cardbookNewPreferences.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
import { cardbookHTMLUtils } from "../cardbookHTMLUtils.mjs";
import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";

var dirPrefId = "";
var initialVCardVersion = "";
var initialNodeType = "";

async function convertVCards () {
	await messenger.runtime.sendMessage({query: "cardbook.convertVCards", dirPrefId: dirPrefId, initialVCardVersion: initialVCardVersion});
	document.getElementById("convertVCardsLabel").classList.add("hidden");
};

async function loadFnFormula () {
	document.getElementById("fnFormulaTextBox").value = await cardbookNewPreferences.getFnFormula(dirPrefId);
	let orgStructure = await cardbookHTMLUtils.getPrefValue("orgStructure");
	if (orgStructure != "") {
		var allOrg = cardbookHTMLUtils.unescapeArray(cardbookHTMLUtils.escapeString(orgStructure).split(";"));
	} else {
		var allOrg = [];
	}
	document.getElementById('formulaMemberLabel1').textContent = "{{1}} : " + messenger.i18n.getMessage("prefixnameLabel");
	document.getElementById('formulaMemberLabel2').textContent = "{{2}} : " + messenger.i18n.getMessage("firstnameLabel");
	document.getElementById('formulaMemberLabel3').textContent = "{{3}} : " + messenger.i18n.getMessage("othernameLabel");
	document.getElementById('formulaMemberLabel4').textContent = "{{4}} : " + messenger.i18n.getMessage("lastnameLabel");
	document.getElementById('formulaMemberLabel5').textContent = "{{5}} : " + messenger.i18n.getMessage("suffixnameLabel");
	document.getElementById('formulaMemberLabel6').textContent = "{{6}} : " + messenger.i18n.getMessage("nicknameLabel");
	document.getElementById('formulaSampleTextBox1').value = messenger.i18n.getMessage("prefixnameLabel");
	document.getElementById('formulaSampleTextBox2').value = messenger.i18n.getMessage("firstnameLabel");
	document.getElementById('formulaSampleTextBox3').value = messenger.i18n.getMessage("othernameLabel");
	document.getElementById('formulaSampleTextBox4').value = messenger.i18n.getMessage("lastnameLabel");
	document.getElementById('formulaSampleTextBox5').value = messenger.i18n.getMessage("suffixnameLabel");
	document.getElementById('formulaSampleTextBox6').value = messenger.i18n.getMessage("nicknameLabel");

	let count = 6;
	let table = document.getElementById('formulaSampleTable');
	if (allOrg.length == 0) {
		count++;
		let row = cardbookHTMLTools.addHTMLTR(table, 'formulaSampleTableRow.' + count);
		let labelData = cardbookHTMLTools.addHTMLTD(row, 'formulaSampleTableData.' + count + '.1');
		let label = cardbookHTMLTools.addHTMLLABEL(labelData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + messenger.i18n.getMessage("orgLabel"), {});
		let textboxData = cardbookHTMLTools.addHTMLTD(row, 'formulaSampleTableData.' + count + '.2', {class: "cardbook-td-input"});
		let textbox = cardbookHTMLTools.addHTMLINPUT(textboxData, 'formulaSampleTextBox' + count, messenger.i18n.getMessage("orgLabel"), {});
		textbox.addEventListener("input", changeFnPreview);
	} else {
		for (let org of allOrg) {
			count++;
			let row = cardbookHTMLTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
			let labelData = cardbookHTMLTools.addHTMLTD(row, 'formulaSampleTableData.' + count + '.1');
			let label = cardbookHTMLTools.addHTMLLABEL(labelData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + org, {});
			let textboxData = cardbookHTMLTools.addHTMLTD(row, 'formulaSampleTableData.' + count + '.2', {class: "cardbook-td-input"});
			let textbox = cardbookHTMLTools.addHTMLINPUT(textboxData, 'formulaSampleTextBox' + count, org, {});
			textbox.addEventListener("input", changeFnPreview);
		}
	}
	count++;
	let rowTitle = cardbookHTMLTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
	let labelTitleData = cardbookHTMLTools.addHTMLTD(rowTitle, 'formulaSampleTableData.' + count + '.1');
	let labelTitle = cardbookHTMLTools.addHTMLLABEL(labelTitleData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + messenger.i18n.getMessage("titleLabel"), {});
	let textboxTitleData = cardbookHTMLTools.addHTMLTD(rowTitle, 'formulaSampleTableData.' + count + '.2', {class: "cardbook-td-input"});
	let textboxTitle = cardbookHTMLTools.addHTMLINPUT(textboxTitleData, 'formulaSampleTextBox' + count, messenger.i18n.getMessage("titleLabel"), {});
	textboxTitle.addEventListener("input", changeFnPreview);
	count++;
	let rowRole = cardbookHTMLTools.addHTMLTR(table, 'formulaSampleTextRow' + count);
	let labelRoleData = cardbookHTMLTools.addHTMLTD(rowRole, 'formulaSampleTableData.' + count + '.1');
	let labelRole = cardbookHTMLTools.addHTMLLABEL(labelRoleData, 'formulaMemberLabel' + count, "{{" + count + "}} : " + messenger.i18n.getMessage("roleLabel"), {});
	let textboxRoleData = cardbookHTMLTools.addHTMLTD(rowRole, 'formulaSampleTableData.' + count + '.2', {class: "cardbook-td-input"});
	let textboxRole = cardbookHTMLTools.addHTMLINPUT(textboxRoleData, 'formulaSampleTextBox' + count, messenger.i18n.getMessage("roleLabel"), {});
	textboxRole.addEventListener("input", changeFnPreview);
	await changeFnPreview();
};

async function changeFnPreview () {
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
	document.getElementById('fnPreviewTextBox').value = await messenger.runtime.sendMessage({query: "cardbook.getStringFromFormula", fnFormula: fnFormula, fn: fn});
};

function populateApplyToAB () {
    let ABList = document.getElementById('applyToABMenulist');
	cardbookHTMLTools.loadAddressBooks(ABList, "", true, true, true, false, true);
};

async function applyApplyToAB (aEvent) {
	if (aEvent.target && aEvent.target.value) {
		let dirPrefId = aEvent.target.value;
		let formula = document.getElementById('fnFormulaTextBox').value;
		await messenger.runtime.sendMessage({query: "cardbook.applyFormulaToAllAB", dirPrefId: dirPrefId, formula: formula});
	}
};

async function resetFnFormula () {
	document.getElementById('fnFormulaTextBox').value = await cardbookNewPreferences.getDefaultFnFormula();
	await changeFnPreview();
};

function showAutoSyncInterval () {
	if (document.getElementById('autoSyncCheckBox').checked && document.getElementById("AB-enabled-checkbox").checked) {
		document.getElementById('autoSyncInterval').classList.remove("disabled");
		document.getElementById('autoSyncIntervalTextBox').disabled = false;
	} else {
		document.getElementById('autoSyncInterval').classList.add("disabled");
		document.getElementById('autoSyncIntervalTextBox').disabled = true;
	}
};

async function setupEnabledCheckbox() {
	let isEnabled = document.getElementById("AB-enabled-checkbox").checked;
	let nodes = document.querySelectorAll("[disable-with-AB='true']");
	for (let node of nodes) {
		let disabled = !isEnabled || node.getAttribute("disable-capability") == "true";
		if (node.tagName.toLowerCase() == "label") {
			if (disabled) {
				node.classList.add("disabled");
			} else {
				node.classList.remove("disabled");
			}
		} else {
			node.disabled = disabled;
		}
	}
	let type = await cardbookNewPreferences.getType(dirPrefId);
	if (type == "GOOGLE3") {
		document.getElementById('readonlyLabel').classList.add("disabled");
		document.getElementById('readonlyCheckBox').disabled = true;
	}
};

async function onLoadDialog () {
	let urlParams = new URLSearchParams(window.location.search);
	dirPrefId = urlParams.get("dirPrefId");

	i18n.updateDocument();
	cardbookHTMLRichContext.loadRichContext();

    // checkbox
    document.getElementById("AB-enabled-checkbox").addEventListener("input", event => setupEnabledCheckbox());
    document.getElementById("autoSyncCheckBox").addEventListener("input", event => showAutoSyncInterval());
	// input
	document.getElementById("fnFormulaTextBox").addEventListener("input", event => changeFnPreview());
	document.getElementById("formulaSampleTextBox1").addEventListener("input", event => changeFnPreview());
	document.getElementById("formulaSampleTextBox2").addEventListener("input", event => changeFnPreview());
	document.getElementById("formulaSampleTextBox3").addEventListener("input", event => changeFnPreview());
	document.getElementById("formulaSampleTextBox4").addEventListener("input", event => changeFnPreview());
	document.getElementById("formulaSampleTextBox5").addEventListener("input", event => changeFnPreview());
	document.getElementById("formulaSampleTextBox6").addEventListener("input", event => changeFnPreview());
	// button
	document.getElementById('generalTab').addEventListener("click", event => showPane('generalTabPanel'));
	document.getElementById('syncTab').addEventListener("click", event => showPane('syncTabPanel'));
	document.getElementById('miscTab').addEventListener("click", event => showPane('miscTabPanel'));
	document.getElementById('convertVCardsLabel').addEventListener("click", event => convertVCards());
	document.getElementById('resetFnFormulaButton').addEventListener("click", event => resetFnFormula());
	document.getElementById('cancelButton').addEventListener("click", onCancelDialog);
	document.getElementById('validateButton').addEventListener("click", onAcceptDialog);
	// select
	document.getElementById('applyToABMenulist').addEventListener("change", event => applyApplyToAB(event));

    initialVCardVersion = await cardbookNewPreferences.getVCardVersion(dirPrefId);
	initialNodeType = await cardbookNewPreferences.getNode(dirPrefId);

	document.getElementById("AB-enabled-checkbox").checked = await cardbookNewPreferences.getEnabled(dirPrefId);
	document.getElementById("nameTextBox").value = await cardbookNewPreferences.getName(dirPrefId);

	let useColorRadiogroup = cardbookHTMLUtils.getRadioNodes("nodeRadiogroup");
	for (let node of useColorRadiogroup) {
		node.checked = (node.value == initialNodeType);
	}

	document.getElementById("colorInput").value = await cardbookNewPreferences.getColor(dirPrefId);
	document.getElementById("typeTextBox").textContent = await cardbookNewPreferences.getType(dirPrefId);

	document.getElementById("urlTextBox").textContent = await cardbookNewPreferences.getUrl(dirPrefId);
	document.getElementById("usernameTextBox").textContent = await cardbookNewPreferences.getUser(dirPrefId);
	document.getElementById("readonlyCheckBox").checked = await cardbookNewPreferences.getReadOnly(dirPrefId);
	document.getElementById("vCardVersionTextBox").textContent = initialVCardVersion;

	document.getElementById("urnuuidCheckBox").checked = await cardbookNewPreferences.getUrnuuid(dirPrefId);
	document.getElementById("DBCachedCheckBox").checked = await cardbookNewPreferences.getDBCached(dirPrefId);

	let isRemote = await messenger.runtime.sendMessage({query: "cardbook.isMyAccountRemote", type: document.getElementById("typeTextBox").textContent});	
	if (isRemote && document.getElementById("DBCachedCheckBox").checked) {
		document.getElementById('syncTab').classList.remove("hidden");
		document.getElementById("autoSyncCheckBox").checked =  await cardbookNewPreferences.getAutoSyncEnabled(dirPrefId);
		document.getElementById("autoSyncIntervalTextBox").value = await cardbookNewPreferences.getAutoSyncInterval(dirPrefId);
	} else {
		document.getElementById('syncTab').classList.add("hidden");
	}

	setupEnabledCheckbox();
	showAutoSyncInterval();
	
	showPane('generalTabPanel');
	await loadFnFormula();

	let found = await messenger.runtime.sendMessage({query: "cardbook.searchForWrongCards", dirPrefId: dirPrefId});
	if (found) {
		document.getElementById("convertVCardsLabel").classList.remove("hidden");
	}
	populateApplyToAB();
};

async function onAcceptDialog () {
	let prop = cardbookNewPreferences.prefCardBookData + dirPrefId + ".";
	let interval = document.getElementById('autoSyncIntervalTextBox').value;
	let name = document.getElementById('nameTextBox').value;

	await cardbookHTMLUtils.setPrefValue(prop + "color", document.getElementById('colorInput').value);
	await cardbookHTMLUtils.setPrefValue(prop + "autoSyncEnabled", document.getElementById('autoSyncCheckBox').checked);
	await cardbookHTMLUtils.setPrefValue(prop + "autoSyncInterval", interval);
	await cardbookHTMLUtils.setPrefValue(prop + "fnFormula", document.getElementById('fnFormulaTextBox').value);
	
	await messenger.runtime.sendMessage({query: "cardbook.removePeriodicSync", dirPrefId: dirPrefId, name: name});
	if (document.getElementById('autoSyncCheckBox').checked) {
		await messenger.runtime.sendMessage({query: "cardbook.addPeriodicSync", dirPrefId: dirPrefId, name: name, interval: interval});
	}

	let radioValue = cardbookHTMLUtils.getRadioValue("nodeRadiogroup");
	if (initialNodeType != radioValue) {
		await cardbookHTMLUtils.setPrefValue(prop + "node", radioValue);
		await messenger.runtime.sendMessage({query: "cardbook.convertNodes", dirPrefId: dirPrefId, radioValue: radioValue});
	}

	let urlParams = {};
	urlParams.dirPrefId = dirPrefId;
	urlParams.name = document.getElementById('nameTextBox').value.trim();
	urlParams.readonly = document.getElementById('readonlyCheckBox').checked;
	urlParams.enabled = document.getElementById('AB-enabled-checkbox').checked;
	await messenger.runtime.sendMessage({query: "cardbook.notifyObserver", value: "cardbook.AB.saveEditAB", params: JSON.stringify(urlParams)});
	cardbookHTMLRichContext.closeWindow();
};

async function onCancelDialog () {
	cardbookHTMLRichContext.closeWindow();
};

function showPane (paneID) {
	if (!paneID) {
		return;
	}

	let pane = document.getElementById(paneID);
	if (!pane) {
		return;
	}

	for (let node of document.querySelectorAll(".tab-container section")) {
		if (node.id == paneID) {
			document.getElementById(node.id.replace("Panel", "")).setAttribute("visuallyselected", "true");
			node.classList.add("active");
		} else {
			document.getElementById(node.id.replace("Panel", "")).removeAttribute("visuallyselected");
			node.classList.remove("active");
		}
	}
};

await onLoadDialog();

