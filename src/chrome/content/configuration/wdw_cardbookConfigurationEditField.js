import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";

var enabled = false;
var label = "";
var field = "";
var convertionLabel = "";
var convertion = "";

function loadConvertionFuntions () {
	let convertToMenulist = document.getElementById('convertToMenulist');
	cardbookHTMLTools.loadConvertionFuntions(convertToMenulist, convertion);
};
		
async function onLoadDialog () {
	let urlParams = new URLSearchParams(window.location.search);
	enabled = urlParams.get("enabled");
	label = urlParams.get("label");
	field = urlParams.get("field");
	convertionLabel = urlParams.get("convertionLabel");
	convertion = urlParams.get("convertion") || "capitalization";

	i18n.updateDocument();
	cardbookHTMLRichContext.loadRichContext();

	// button
	document.getElementById('cancelButton').addEventListener("click", onCancelDialog);
	document.getElementById('validateButton').addEventListener("click", onAcceptDialog);

	loadConvertionFuntions();
    document.getElementById('fieldLabel').textContent = label;
};

async function onAcceptDialog () {
	let urlParams = {};
	urlParams.enabled = enabled;
	urlParams.label = label;
	urlParams.field = field;
	urlParams.convertion = document.getElementById('convertToMenulist').value;
	urlParams.convertionLabel = document.getElementById("convertToMenulist").querySelector("option:checked").textContent;
	await messenger.runtime.sendMessage({query: "cardbook.conf.saveField", urlParams: urlParams});
	onCancelDialog();
};

async function onCancelDialog () {
	window.close();
};

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

await onLoadDialog();