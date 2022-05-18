var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

function loadConvertionFuntions () {
	let menulist = document.getElementById('convertToMenulist');
	let menupopup = document.getElementById('convertToMenupopup');
	cardbookElementTools.loadConvertionFuntions(menupopup, menulist, window.arguments[0].convertion);
};
		
function onLoadDialog () {
	i18n.updateDocument({ extension: cardbookRepository.extension });
    document.getElementById('fieldLabel').value = window.arguments[0].label;
	loadConvertionFuntions();
};

function onAcceptDialog () {
	window.arguments[0].convertion = document.getElementById('convertToMenulist').value;
	window.arguments[0].convertionLabel = document.getElementById('convertToMenulist').label;
	window.arguments[0].typeAction = "SAVE";
	close();
};

function onCancelDialog () {
	window.arguments[0].typeAction="CANCEL";
	close();
};

document.addEventListener("DOMContentLoaded", onLoadDialog);
document.addEventListener("dialogaccept", onAcceptDialog);
document.addEventListener("dialogcancel", onCancelDialog);
