import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";

var id = "";
var type = "";
var code = "";
var label = "";
var protocol = "";

function checkRequired () {
	let btnSave = document.getElementById("validateButton");
	if (document.getElementById('IMPPCodeTextBox').value != "" && document.getElementById('IMPPLabelTextBox').value != "" && document.getElementById('IMPPProtocolTextBox').value != "") {
		btnSave.disabled = false;
	} else {
		btnSave.disabled = true;
	}
};

async function onLoadDialog () {
	let urlParams = new URLSearchParams(window.location.search);
	id = urlParams.get("id");
	type = urlParams.get("type");
	code = urlParams.get("code");
	label = urlParams.get("label");
	protocol = urlParams.get("protocol");

	i18n.updateDocument();
	cardbookHTMLRichContext.loadRichContext();

	// input
	document.getElementById("IMPPCodeTextBox").addEventListener("input", event => checkRequired() );
	document.getElementById("IMPPLabelTextBox").addEventListener("input", event => checkRequired());
	document.getElementById("IMPPProtocolTextBox").addEventListener("input", event => checkRequired());
	// button
	document.getElementById('cancelButton').addEventListener("click", onCancelDialog);
	document.getElementById('validateButton').addEventListener("click", onAcceptDialog);

	document.getElementById('IMPPCodeTextBox').value = code;
	document.getElementById('IMPPLabelTextBox').value = label;
	document.getElementById('IMPPProtocolTextBox').value = protocol;
	checkRequired();
};

async function onAcceptDialog (aEvent) {
	let urlParams = {};
	urlParams.id = id;
	urlParams.type = type;
	urlParams.code = document.getElementById('IMPPCodeTextBox').value.replace(/:/g, "").trim();
	urlParams.label = document.getElementById('IMPPLabelTextBox').value.replace(/:/g, "").trim();
	urlParams.protocol = document.getElementById('IMPPProtocolTextBox').value.replace(/:/g, "").trim();
	await messenger.runtime.sendMessage({query: "cardbook.conf.saveIMPPs", urlParams: urlParams});
	onCancelDialog();
};

async function onCancelDialog () {
	cardbookHTMLRichContext.closeWindow();
};

await onLoadDialog();


// to do cardbookRichContext