import { cardbookHTMLNotification } from "../cardbookHTMLNotification.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";

var id = "";
var type = "";
var code = "";
var label = "";
var validationList = [];
var notAllowedCustoms = [ 'X-ABDATE', 'X-ABLABEL', 'X-CATEGORIES', 'X-MOZILLA-HTML' ];

function customFieldCheck () {
	let textbox = document.getElementById('customFieldCodeTextBox');
	let value = textbox.value.trim();
	if (value == "") {
		textbox.value = "X-";
	} else {
		textbox.value = value.toUpperCase();
	}
};

function validateCustomValues () {
	let value = document.getElementById('customFieldCodeTextBox').value;
	let newValidationList = JSON.parse(JSON.stringify(validationList));
	function filterOriginal(element) {
		return (element.toUpperCase() != value.toUpperCase());
	}
	newValidationList = newValidationList.filter(filterOriginal);
	let notificationMessage = document.getElementById("notificationMessage");
	if (newValidationList.length != validationList.length) {
		cardbookHTMLNotification.setNotification(notificationMessage, "warning", "customFieldsErrorUNIQUE");
		return false;
	} else if (value.toUpperCase() !== value) {
		cardbookHTMLNotification.setNotification(notificationMessage, "warning", "customFieldsErrorUPPERCASE", [value]);
		return false;
	} else if (!(value.toUpperCase().startsWith("X-"))) {
		cardbookHTMLNotification.setNotification(notificationMessage, "warning", "customFieldsErrorX", [value]);
		return false;
	} else if (notAllowedCustoms.indexOf(value.toUpperCase()) != -1) {
		cardbookHTMLNotification.setNotification(notificationMessage, "warning", "customFieldsErrorFIELD", [value]);
		return false;
	} else if (value.includes(":") || value.includes(",") || value.includes(";") || value.includes(".")) {
		cardbookHTMLNotification.setNotification(notificationMessage, "warning", "customFieldsErrorCHAR", [value]);
		return false;
	} else {
		cardbookHTMLNotification.setNotification(notificationMessage, "OK");
		return true;
	}
};

function validate () {
	let fieldCode = document.getElementById("customFieldCodeTextBox").value;
	let fieldLabel = document.getElementById("customFieldLabelTextBox").value;
	let btnSave = document.getElementById("validateButton");
	if (fieldCode != "" && fieldLabel != "") {
		let validation = validateCustomValues();
		btnSave.disabled = !validation;
		return validation;
	} else {
		btnSave.disabled = true;
		cardbookHTMLNotification.setNotification(notificationMessage, "OK");
		return false;
	}
};

function onLoadDialog () {
	let urlParams = new URLSearchParams(window.location.search);
	id = urlParams.get("id");
	type = urlParams.get("type");
	code = urlParams.get("code");
	label = urlParams.get("label");
	validationList = urlParams.get("validationList").split(",");

	i18n.updateDocument();
	cardbookHTMLRichContext.loadRichContext();

	// input
	document.getElementById("customFieldCodeTextBox").addEventListener("input", event => {
		customFieldCheck();
		validate();
	});
	document.getElementById("customFieldLabelTextBox").addEventListener("input", event => validate());
	// button
	document.getElementById('cancelButton').addEventListener("click", onCancelDialog);
	document.getElementById('validateButton').addEventListener("click", onAcceptDialog);

	document.getElementById('customFieldCodeTextBox').value = code;
	document.getElementById('customFieldLabelTextBox').value = label;
	document.getElementById('customFieldCodeTextBox').focus();
	customFieldCheck();
	validate();
};

async function onAcceptDialog (aEvent) {
	if (validate()) {
		let urlParams = {};
		urlParams.id = id;
		urlParams.type = type;
		urlParams.code = document.getElementById('customFieldCodeTextBox').value.trim();
		urlParams.label = document.getElementById('customFieldLabelTextBox').value.trim();
		await messenger.runtime.sendMessage({query: "cardbook.conf.saveCustomFields", urlParams: urlParams});
		onCancelDialog();
	}
};

async function onCancelDialog () {
	window.close();
};

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

onLoadDialog();
