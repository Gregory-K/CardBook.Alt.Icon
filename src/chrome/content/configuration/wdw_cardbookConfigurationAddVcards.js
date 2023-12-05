import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";

var enabled = true;
var id = "";
var emailAccountName = "";
var emailAccountId = "";
var addressBookId = "";
var contactName = "";
var contactId = "";
var fileName = "";

async function loadMailAccounts () {
	let mailAccountMenulist = document.getElementById('mailAccountMenulist');
	await cardbookHTMLTools.loadMailAccounts(mailAccountMenulist, emailAccountId, true);
};

async function loadAB () {
 	let ABList = document.getElementById('CardBookABMenulist');
	await cardbookHTMLTools.loadAddressBooks(ABList, addressBookId, true, false, true, false, false);
};

async function loadContacts () {
	let ABid = document.getElementById('CardBookABMenulist').value;
	let contactMenulist = document.getElementById('contactMenulist');
	await cardbookHTMLTools.loadContacts(contactMenulist, ABid, contactId);
	changeFileName();
	changeVCard();
};
		
function changeFileName () {
	let label = document.getElementById("contactMenulist").querySelector("option:checked").textContent;
	document.getElementById('filenameTextbox').value = label + ".vcf";
};
		
async function changeVCard () {
	let ABid = document.getElementById('CardBookABMenulist').value;
	let cId = document.getElementById('contactMenulist').value;
	let vCard = await messenger.runtime.sendMessage({query: "cardbook.getvCard", dirPrefId: ABid, contactId: cId});
	document.getElementById('VCardTextbox').value = vCard;
};
		
function checkRequired () {
	let btnSave = document.getElementById("validateButton");
	if (document.getElementById('filenameTextbox').value != "") {
		btnSave.disabled = false;
	} else {
		btnSave.disabled = true;
	}
};

async function onLoadDialog () {
	let urlParams = new URLSearchParams(window.location.search);
	enabled = urlParams.get("enabled");
	id = urlParams.get("id");
	emailAccountName = urlParams.get("emailAccountName");
	emailAccountId = urlParams.get("emailAccountId");
	addressBookId = urlParams.get("addressBookId");
	contactName = urlParams.get("contactName");
	contactId = urlParams.get("contactId");
	fileName = urlParams.get("fileName");

	i18n.updateDocument();
	cardbookHTMLRichContext.loadRichContext();

	// button
	document.getElementById('cancelButton').addEventListener("click", onCancelDialog);
	document.getElementById('validateButton').addEventListener("click", onAcceptDialog);
	// select
	document.getElementById("CardBookABMenulist").addEventListener("change", event => loadContacts());
	document.getElementById("contactMenulist").addEventListener("change", event => {
		changeFileName();
		changeVCard();
	});
	// input
	document.getElementById("filenameTextbox").addEventListener("input", event => checkRequired());

	await loadMailAccounts();
	await loadAB();
	await loadContacts();
	if (fileName != "") {
		document.getElementById('filenameTextbox').value = fileName;
	}

	checkRequired();
};

async function onAcceptDialog () {
	let urlParams = {};
	urlParams.id = id;
	urlParams.enabled = enabled;
	urlParams.emailAccountName = document.getElementById("mailAccountMenulist").querySelector("option:checked").textContent;
	urlParams.emailAccountId = document.getElementById('mailAccountMenulist').value;
	urlParams.addressBookId = document.getElementById('CardBookABMenulist').value;
	urlParams.fileName = document.getElementById('filenameTextbox').value;
	urlParams.contactName = document.getElementById("contactMenulist").querySelector("option:checked").textContent;
	urlParams.contactId = document.getElementById('contactMenulist').value;
	await messenger.runtime.sendMessage({query: "cardbook.conf.saveVCard", urlParams: urlParams});
	onCancelDialog();
};

async function onCancelDialog () {
	window.close();
};

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

await onLoadDialog();
