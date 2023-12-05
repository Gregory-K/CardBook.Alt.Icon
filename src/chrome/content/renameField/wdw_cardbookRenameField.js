import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
import { cardbookHTMLNotification } from "../cardbookHTMLNotification.mjs";
import { cardbookHTMLUtils } from "../cardbookHTMLUtils.mjs";

var context = "";
var id = "";
var name = "";
var type = "";
var color = "";
var showColor = "false";
var mailpop = "";
var validationList = [];
var dirPrefId = "";

function validate () {
	let btnSave = document.getElementById("validateButton");
	let notificationMessage = document.getElementById("notificationMessage");
    let value = document.getElementById('nameTextBox').value;
	if (!value) {
		btnSave.disabled = true;
		return false;
	} else {
		var myValidationList = JSON.parse(JSON.stringify(validationList));
		function filterOriginal(element) {
			return (element.toUpperCase() != value.toUpperCase());
		}
		myValidationList = myValidationList.filter(filterOriginal);
		if (myValidationList.length != validationList.length) {
            cardbookHTMLNotification.setNotification(notificationMessage, "warning", "valueAlreadyExists", [value]);
			btnSave.disabled = true;
			return false;
		}
		if (context == "CreateCat" || context == "EditCat") {
			let limit = 100000;
			let field = messenger.i18n.getMessage("popularityLabel");
			let data = document.getElementById("mailPopTextBox").value.trim() * 1;
			if (data && (data > limit)) {
                cardbookHTMLNotification.setNotification(notificationMessage, "warning", "validateIntegerMsg", [field, limit, data]);
				btnSave.disabled = true;
				return false;
			}
		}
		cardbookHTMLNotification.setNotification(notificationMessage, "OK");
		btnSave.disabled = false;
		return true;
	}
};

async function onLoadDialog () {
	let urlParams = new URLSearchParams(window.location.search);
	context = urlParams.get("context");
	id = urlParams.get("id");
	type = urlParams.get("type");
	name = urlParams.get("name");
	color = urlParams.get("color");
	showColor = urlParams.get("showColor");
	mailpop = urlParams.get("mailpop") || 0;
	dirPrefId = urlParams.get("dirPrefId");

    i18n.updateDocument();
    cardbookHTMLRichContext.loadRichContext();

	// input
	document.getElementById("mailPopTextBox").addEventListener("input", event => validate());
	document.getElementById("nameTextBox").addEventListener("input", event => validate());
	// button
	document.getElementById('cancelButton').addEventListener("click", onCancelDialog);
	document.getElementById('validateButton').addEventListener("click", onAcceptDialog);

    document.title = messenger.i18n.getMessage("wdw_cardbookRenameField" + context + "Title");
	if (context == "EditNode") {
        let orgStructure = await cardbookHTMLUtils.getPrefValue("orgStructure");
        if (orgStructure != "") {
			let tmpArray = cardbookHTMLUtils.unescapeArray(cardbookHTMLUtils.escapeString(orgStructure).split(";"));
			let idArray = id.split("::");
			document.getElementById('nameLabel').textContent = messenger.i18n.getMessage("wdw_cardbookRenameField" + context + "Label", [tmpArray[idArray.length - 3]]);
		} else {
			document.getElementById('nameLabel').textContent = messenger.i18n.getMessage("orgNodeLabel");
		}
	} else {
		document.getElementById('nameLabel').textContent = messenger.i18n.getMessage("wdw_cardbookRenameField" + context + "Label");
	}

	if (showColor == "true") {
		document.getElementById('useColorCheck').checked = color ? true : false;
		document.getElementById('colorInput').value = color;
	} else {
		document.getElementById('useColorCheck').checked = false;
		document.getElementById('colorRow').classList.add("hidden");
	}
	if (context == "CreateCat" || context == "EditCat") {
        document.getElementById('mailPopTextBox').value = mailpop;
	} else {
		document.getElementById('mailPopRow').classList.add("hidden");
	}
	validationList = await messenger.runtime.sendMessage({query: "cardbook.getNodesForCreation", type: type, name: name, id: id, dirPrefId: dirPrefId});	
	document.getElementById('nameTextBox').value = name;
	document.getElementById('nameTextBox').focus();
};

async function onAcceptDialog (aEvent) {
	if (validate()) {
		let urlParams = {};
		urlParams.dirPrefId = dirPrefId;
		urlParams.type = type;
		urlParams.id = id;
		urlParams.oldName = name;
		urlParams.name = document.getElementById('nameTextBox').value.trim();
		if (!document.getElementById('colorRow').classList.contains("hidden")) {
			urlParams.oldColor = color;
			urlParams.color = document.getElementById('useColorCheck').checked ? document.getElementById('colorInput').value : '';
		}
		if (!document.getElementById('mailPopRow').classList.contains("hidden")) {
			urlParams.oldMailpop = mailpop;
			urlParams.mailpop = document.getElementById('mailPopTextBox').value.trim() || 0;
		}
		if (context.toLowerCase().startsWith("create")) {
			await messenger.runtime.sendMessage({query: "cardbook.notifyObserver", value: "cardbook.createCategory", params: JSON.stringify(urlParams)});
		} else if (context.toLowerCase().startsWith("edit")) {
			await messenger.runtime.sendMessage({query: "cardbook.notifyObserver", value: "cardbook.modifyNode", params: JSON.stringify(urlParams)});
		}
		onCancelDialog();
	}
	document.getElementById("validateButton").disabled = false;
};

function onCancelDialog () {
    cardbookHTMLRichContext.closeWindow();
};

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

await onLoadDialog();