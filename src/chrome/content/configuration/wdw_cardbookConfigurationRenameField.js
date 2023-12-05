import { cardbookHTMLNotification } from "../cardbookHTMLNotification.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";

var id = "";
var ABType = "";
var type = "";
var value = "";
var valueType = "";
var context = "";
var validationList = [];
	
function validate () {
	let notificationMessage = document.getElementById("notificationMessage");
	let value = document.getElementById('typeTextBox').value;
	if (!value) {
		document.getElementById("validateButton").disabled = true;
		return false;
	} else {
		var myValidationList = JSON.parse(JSON.stringify(validationList));
		function filterOriginal(element) {
			return (element.toUpperCase() != value.toUpperCase());
		}
		myValidationList = myValidationList.filter(filterOriginal);
		if (myValidationList.length != validationList.length) {
			cardbookHTMLNotification.setNotification(notificationMessage, "warning", "valueAlreadyExists", [value]);
			document.getElementById("validateButton").disabled = true;
			return false;
		} else if (value.includes(":") || value.includes(",") || value.includes(";") || value.includes(".")) {
			cardbookHTMLNotification.setNotification(notificationMessage, "warning", "customFieldsErrorCHAR", [value]);
			document.getElementById("validateButton").disabled = true;
			return false;
		}
		cardbookHTMLNotification.setNotification(notificationMessage, "OK");
		document.getElementById("validateButton").disabled = false;
		return true;
	}
};

async function onLoadDialog () {
	let urlParams = new URLSearchParams(window.location.search);
	id = urlParams.get("id");
	ABType = urlParams.get("ABType");
	type = urlParams.get("type");
	value = urlParams.get("value");
	valueType = urlParams.get("valueType");
	context = urlParams.get("context");
	validationList = urlParams.get("validationList").split(",");
	
	i18n.updateDocument();
	cardbookHTMLRichContext.loadRichContext();
	document.title = messenger.i18n.getMessage(`wdw_cardbookRenameField${context}Title`);

	// input
	document.getElementById("typeTextBox").addEventListener("input", event => validate());
	// button
	document.getElementById('cancelButton').addEventListener("click", onCancelDialog);
	document.getElementById('validateButton').addEventListener("click", onAcceptDialog);

	document.getElementById('typeLabel').textContent = messenger.i18n.getMessage(`wdw_cardbookRenameField${context}Label`);

	document.getElementById('typeTextBox').value = value;
	document.getElementById('typeTextBox').focus();
	cardbookHTMLNotification.setNotification(notificationMessage, "OK");
};

async function onAcceptDialog () {
	if (validate()) {
		let urlParams = {};
		urlParams.value = document.getElementById('typeTextBox').value.trim();
		urlParams.id = id;
		urlParams.ABType = ABType;
		urlParams.type = type;
		urlParams.valueType = valueType;
		urlParams.id = id;
		switch (context) {
			case "AddType":
			case "EditType":
				await messenger.runtime.sendMessage({query: "cardbook.conf.saveType", urlParams: urlParams});
				break;
			case "Org":
				await messenger.runtime.sendMessage({query: "cardbook.conf.saveOrg", urlParams: urlParams});
				break;
		}
		onCancelDialog();
	}
	document.getElementById("validateButton").disabled = false;
};

async function onCancelDialog () {
	window.close();
};

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

await onLoadDialog();
