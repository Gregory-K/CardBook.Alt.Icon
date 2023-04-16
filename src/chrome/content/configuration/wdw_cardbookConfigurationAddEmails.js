import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";

var enabled = true;
var id = "";
var emailAccountName = "";
var emailAccountId = "";
var addressBookName = "";
var addressBookId = "";
var categoryName = "";
var categoryId = "";
var includeName = "";
var includeCode = "";
var context = "";

function loadInclExcl () {
	let typeMenulist = document.getElementById('typeMenulist');
	cardbookHTMLTools.loadInclExcl(typeMenulist, includeCode);
};

async function loadMailAccounts () {
	let mailAccountMenulist = document.getElementById('mailAccountMenulist');
	await cardbookHTMLTools.loadMailAccounts(mailAccountMenulist, emailAccountId, true);
};

async function loadAB () {
	let aIncludeSearch = true;
	if (context === "EmailsCollection") {
		aIncludeSearch = false;
	}
 	let ABList = document.getElementById('CardBookABMenulist');
	await cardbookHTMLTools.loadAddressBooks(ABList, addressBookId, true, false, false, aIncludeSearch, false);
};

async function loadCategories () {
	var ABList = document.getElementById('CardBookABMenulist');
	if (ABList.value) {
		var ABDefaultValue = ABList.value;
	} else {
		var ABDefaultValue = 0;
	}
	let categoryList = document.getElementById('categoryMenulist');
	await cardbookHTMLTools.loadCategories(categoryList, ABDefaultValue, categoryId, false, false, false, true);
};

async function onLoadDialog () {
	let urlParams = new URLSearchParams(window.location.search);
	enabled = urlParams.get("enabled");
	id = urlParams.get("id");
	emailAccountName = urlParams.get("emailAccountName");
	emailAccountId = urlParams.get("emailAccountId");
	addressBookName = urlParams.get("addressBookName");
	addressBookId = urlParams.get("addressBookId");
	categoryName = urlParams.get("categoryName");
	categoryId = urlParams.get("categoryId");
	includeName = urlParams.get("includeName");
	includeCode = urlParams.get("includeCode");
	context = urlParams.get("context");

	i18n.updateDocument();
	cardbookHTMLRichContext.loadRichContext();
	document.title = messenger.i18n.getMessage(`wdw_cardbookConfigurationAddEmails${context}Title`);

	// button
	document.getElementById('cancelButton').addEventListener("click", onCancelDialog);
	document.getElementById('validateButton').addEventListener("click", onAcceptDialog);
	// select
	document.getElementById("CardBookABMenulist").addEventListener("change", event => loadCategories());

	if (context == "EmailsCollection") {
		document.getElementById('typeRow').style.display = "none";
	} else {
		loadInclExcl();
	}
	await loadMailAccounts();
	await loadAB();
	await loadCategories();
};

async function onAcceptDialog () {
	let urlParams = {};
	urlParams.id = id;
	urlParams.enabled = enabled;
	urlParams.context = context;
	urlParams.emailAccountName = document.getElementById("mailAccountMenulist").querySelector("option:checked").textContent;
	urlParams.emailAccountId = document.getElementById('mailAccountMenulist').value;
	urlParams.addressBookName = document.getElementById("CardBookABMenulist").querySelector("option:checked").textContent;
	urlParams.addressBookId = document.getElementById('CardBookABMenulist').value;
	urlParams.categoryName = document.getElementById("categoryMenulist").querySelector("option:checked").textContent;
	urlParams.categoryId = document.getElementById('categoryMenulist').value;
	if (context != "EmailsCollection") {
		urlParams.includeName = document.getElementById("typeMenulist").querySelector("option:checked").textContent;
		urlParams.includeCode = document.getElementById('typeMenulist').value;
	}
	await messenger.runtime.sendMessage({query: `cardbook.conf.save${context}`, urlParams: urlParams});
	onCancelDialog();
};

async function onCancelDialog () {
	cardbookHTMLRichContext.closeWindow();
};

await onLoadDialog();

