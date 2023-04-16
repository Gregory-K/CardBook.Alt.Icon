import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";
import { cardbookHTMLUtils } from "../cardbookHTMLUtils.mjs";

var mode = "";
var columnSeparator = "";
var fields = "";
var includePref = false;
var lineHeader = false;
var filename = "";
var filepath = "";
var actionId = "";
var foundColumns = "";
var template = [];
var cardbookeditlists = {};
var blankColumn = "";
var nIntervId = "";
var gFilePickerId = "";

function getIndexFromName (aName) {
	let tmpArray = aName.split("_");
	return tmpArray[tmpArray.length - 1];
};

function getTableCurrentIndex (aTableName) {
	let selectedList = document.getElementById(aTableName).querySelectorAll("tr[rowSelected='true']");
	if (selectedList.length) {
		let tmpArray = selectedList[0].id.split("_");
		return tmpArray[tmpArray.length - 1];
	}
};

function upColumns () {
	let tableName = "addedColumnsTable";
	let currentIndex = getTableCurrentIndex(tableName);
	if (cardbookeditlists[tableName].length && currentIndex) {
		currentIndex = currentIndex*1;
		let temp = [ cardbookeditlists[tableName][currentIndex-1][0], cardbookeditlists[tableName][currentIndex-1][1] ];
		cardbookeditlists[tableName][currentIndex-1] = [ cardbookeditlists[tableName][currentIndex][0], cardbookeditlists[tableName][currentIndex][1] ];
		cardbookeditlists[tableName][currentIndex] = temp;
		displayListTables(tableName);
	}
};

function downColumns () {
	let tableName = "addedColumnsTable";
	let currentIndex = getTableCurrentIndex(tableName);
	if (cardbookeditlists[tableName].length && currentIndex) {
		currentIndex = currentIndex*1;
		let temp = [ cardbookeditlists[tableName][currentIndex+1][0], cardbookeditlists[tableName][currentIndex+1][1] ];
		cardbookeditlists[tableName][currentIndex+1] = [ cardbookeditlists[tableName][currentIndex][0], cardbookeditlists[tableName][currentIndex][1] ];
		cardbookeditlists[tableName][currentIndex] = temp;
		displayListTables(tableName);
	}
};

function clickTree (aEvent) {
	if (aEvent.target.tagName.toLowerCase() == "td") {
		let table = aEvent.target.closest("table");
		let tbody = aEvent.target.closest("tbody");
		let row = aEvent.target.closest("tr");
		if (aEvent.shiftKey) {
			let startIndex = getTableCurrentIndex(table.id) || 0;
			let endIndex = getIndexFromName(row.id);
			let i = 0;
			for (let child of tbody.childNodes) {
				if (i >= startIndex && i <= endIndex) {
					child.setAttribute("rowSelected", "true");
				} else {
					child.removeAttribute("rowSelected");
				}
				i++;
			}
		} else if (aEvent.ctrlKey) {
			if (row.hasAttribute("rowSelected")) {
				row.removeAttribute("rowSelected");
			} else {
				row.setAttribute("rowSelected", "true");
			}
		} else {
			for (let child of tbody.childNodes) {
				child.removeAttribute("rowSelected");
			}
			row.setAttribute("rowSelected", "true");
		}
		windowControlShowing();
	}
};

function keyDownTree (aEvent) {
	if (aEvent.ctrlKey && aEvent.key.toUpperCase() == "A") {
		let table = aEvent.target.closest("table");
		if (table) {
			let tbody = table.querySelector("tbody");
			for (let child of tbody.childNodes) {
				child.setAttribute("rowSelected", "true");
			}
			aEvent.preventDefault();
		}
	}	
};

function displayListTables (aTableName) {
	let headers = [];
	let data = cardbookeditlists[aTableName].map(x => [ x[1] ]);
	let dataParameters = [];
	let tableParameters = { "events": [ [ "click", clickTree ],
										[ "dblclick", modifyListsFromTable ],
										[ "keydown", keyDownTree ] ] };
	if (aTableName == "foundColumnsTable") {
		tableParameters = { "events": [ [ "click", clickTree ] ] };
    }
	let dataId = 0;
	let dragdrop = { "dragStart": startDrag, "drop": dragCards };
	cardbookHTMLTools.addTreeTable(aTableName, headers, data, dataParameters, null, tableParameters, null, dataId, dragdrop);
	windowControlShowing();
};

function getSelectedColumnsForList (aTableName) {
	let listOfSelected = [];
	let table = document.getElementById(aTableName);
	let selectedRows = table.querySelectorAll("tr[rowSelected='true']");
	for (let row of selectedRows) {
		let index = getIndexFromName(row.id);
		listOfSelected.push(index);
	}
	return listOfSelected;
};

function modifyListsFromTable(aEvent) {
	let table = aEvent.target.closest("table");
	modifyLists(table.id);
}

function modifyLists (aMenuOrTable) {
	let addedTablename = "addedColumnsTable";
	let availableTablename = "availableColumnsTable";
	let selectedIndexes = [];
	switch (aMenuOrTable) {
		case "availableColumnsTable":
		case "appendlistavailableColumnsButton":
			selectedIndexes = getSelectedColumnsForList(availableTablename);
			for (let selectedIndex of selectedIndexes) {
				cardbookeditlists[addedTablename] = cardbookeditlists[addedTablename].concat([cardbookeditlists[availableTablename][selectedIndex]]);
			}
			break;
		case "addedColumnsTable":
		case "deletelistaddedColumnsButton":
			selectedIndexes = getSelectedColumnsForList(addedTablename);
			for (let i = selectedIndexes.length-1; i >= 0; i--) {
				cardbookeditlists[addedTablename].splice(selectedIndexes[i], 1);
			}
			break;
		default:
			break;
	}
	displayListTables(addedTablename);
};

async function validateImportColumns () {
	if (cardbookeditlists.foundColumnsTable.length != cardbookeditlists.addedColumnsTable.length) {
		let confirmTitle = messenger.i18n.getMessage("confirmTitle");
		let confirmMsg = messenger.i18n.getMessage("missingColumnsConfirmMessage");
		let response = await messenger.runtime.sendMessage({query: "cardbook.promptConfirm", title: confirmTitle, message: confirmMsg});
		if (!response) {
			return false;
		}
		let missing = cardbookeditlists.foundColumnsTable.length - cardbookeditlists.addedColumnsTable.length;
		for (let i = 0; i < missing; i++) {
			cardbookeditlists.addedColumnsTable.push(["blank", blankColumn]);
		}
		let more = cardbookeditlists.addedColumnsTable.length - cardbookeditlists.foundColumnsTable.length;
		for (let i = 0; i < more; i++) {
			cardbookeditlists.addedColumnsTable.slice(cardbookeditlists.addedColumnsTable.length, 1);
		}
	}
	return true;
};

function loadFoundColumns () {
	if (foundColumns) {
		cardbookeditlists.foundColumnsTable = [];
		let separator = document.getElementById('fieldDelimiterTextBox').value;
		if (separator == "") {
			separator = ";";
		}
		let tmpArray = foundColumns.split(separator);
		for (let i = 0; i < tmpArray.length; i++) {
			cardbookeditlists.foundColumnsTable.push([i, tmpArray[i]]);
		}
		displayListTables("foundColumnsTable");
	}
};

function startDrag (aEvent) {
	try {
		var listOfUid = [];
		let table = aEvent.target.closest("table");
		let tablename = table.id;
		let selectedRows = table.querySelectorAll("tr[rowSelected='true']");
		for (let row of selectedRows) {
			let index = getIndexFromName(row.id);
			listOfUid.push(index + "::" + cardbookeditlists[tablename][index][0]);
		}
		aEvent.dataTransfer.setData("text/plain", listOfUid.join("@@@@@"));
	}
	catch (e) {
		console.debug("startDrag error : " + e, "Error");
	}
};

async function dragCards (aEvent) {
	let table;
	let rowIndex = -1;
	// outside the rows
	if (aEvent.target.tagName.toLowerCase() == "table") {
		table = aEvent.target;
	// in the rows
	} else {
		table = aEvent.target.closest("table");
		let row = aEvent.target.closest("tr");
		rowIndex = getIndexFromName(row.id);
	}
	let tablename = table.id;
	let data = aEvent.dataTransfer.getData("text/plain");
	let columns = data.split("@@@@@");

	if (tablename == "availableColumnsTable") {
		for (let i = columns.length-1; i >= 0; i--) {
			let tmpArray = columns[i].split("::");
			cardbookeditlists.addedColumnsTable.splice(tmpArray[0], 1);
		}
	} else if (tablename == "addedColumnsTable") {
		for (let column of columns) {
			let tmpArray = column.split("::");
			let value = tmpArray[1];
            let label = await messenger.runtime.sendMessage({query: "cardbook.getTranslatedField", value: value});
			if (rowIndex == -1) {
				cardbookeditlists.addedColumnsTable.push([value, label]);
			} else {
				cardbookeditlists.addedColumnsTable.splice(rowIndex, 0, [value, label]);
				rowIndex++;
			}
		}
	}
	displayListTables("addedColumnsTable");
};

function windowControlShowing () {
	let tableName = "addedColumnsTable";
	let btnDelete = document.getElementById("deletelistaddedColumnsButton");
	let btnUp = document.getElementById("upAddedColumnsButton");
	let btnDown = document.getElementById("downAddedColumnsButton");
	let currentIndex = getTableCurrentIndex(tableName);
	if (cardbookeditlists[tableName].length && currentIndex) {
		currentIndex = currentIndex*1;
		btnDelete.disabled = false;
		if (cardbookeditlists[tableName].length > 1) {
			if (currentIndex == 0) {
				btnUp.disabled = true;
			} else {
				btnUp.disabled = false;
			}
			if (currentIndex == cardbookeditlists[tableName].length-1) {
				btnDown.disabled = true;
			} else {
				btnDown.disabled = false;
			}
		} else {
			btnUp.disabled = true;
			btnDown.disabled = true;
		}
	} else {
		btnDelete.disabled = true;
		btnUp.disabled = true;
		btnDown.disabled = true;
	}
	tableName = "availableColumnsTable";
	let addDelete = document.getElementById("appendlistavailableColumnsButton");
	currentIndex = getTableCurrentIndex(tableName);
	if (cardbookeditlists[tableName].length && currentIndex) {
		addDelete.disabled = false;
	} else {
		addDelete.disabled = true;
	}
};

async function guess () {
	let oneFound = false;
	let result = [];
	// search with current locale
	for (let foundColumn of cardbookeditlists.foundColumnsTable) {
		foundColumn = foundColumn[1].replace(/^\"|\"$/g, "").replace(/^\'|\'$/g, "");
		let found = false;
		for (let availableColumn of cardbookeditlists.availableColumnsTable) {
			if (availableColumn[1].toLowerCase() == foundColumn.toLowerCase() || availableColumn[0].toLowerCase() == foundColumn.toLowerCase()) {
				result.push([availableColumn[0], availableColumn[1]]);
				found = true;
				oneFound = true;
				break;
			}
		}
		if (!found) {
			result.push(["blank", blankColumn]);
		}
	}
	if (!oneFound) {
		result = [];
		// search with en-US locale
		for (let foundColumn of cardbookeditlists.foundColumnsTable) {
			foundColumn = foundColumn[1].replace(/^\"|\"$/g, "").replace(/^\'|\'$/g, "");
			let found = false;
			for (let availableColumn of cardbookeditlists.availableColumnsTable) {
                let translatedColumn = await messenger.runtime.sendMessage({query: "cardbook.getTranslatedField", value: availableColumn[0], locale: "locale-US"});
				if (translatedColumn.toLowerCase() == foundColumn.toLowerCase()) {
					result.push([availableColumn[0], availableColumn[1]]);
					found = true;
					oneFound = true;
					break;
				}
			}
			if (!found) {
				result.push(["blank", blankColumn]);
			}
		}
	}
	if (oneFound) {
		cardbookeditlists.addedColumnsTable = result;
		displayListTables("addedColumnsTable");
	}
};

async function onLoadDialog () {
	let urlParams = new URLSearchParams(window.location.search);
	mode = urlParams.get("mode");
	columnSeparator = urlParams.get("columnSeparator");
	fields = urlParams.get("fields");
	includePref = urlParams.get("includePref");
	lineHeader = urlParams.get("lineHeader");
	filename = urlParams.get("filename");
	filepath = urlParams.get("filepath");
	actionId = urlParams.get("actionId");
	foundColumns = urlParams.get("foundColumns");

	i18n.updateDocument();
	cardbookHTMLRichContext.loadRichContext();
	document.title = messenger.i18n.getMessage(mode + "MappingTitle");
	document.getElementById('availableColumnsGroupboxLabel').textContent = messenger.i18n.getMessage(`${mode}availableColumnsGroupboxLabel`);
	document.getElementById('addedColumnsGroupboxLabel').textContent = messenger.i18n.getMessage(`${mode}addedColumnsGroupboxLabel`);

	cardbookeditlists.availableColumnsTable = [];
	cardbookeditlists.addedColumnsTable = [];
	gFilePickerId = await messenger.runtime.sendMessage({query: "cardbook.getUUID"});
	
	if (mode == "choice") {
		document.getElementById("foundColumnsVBox").classList.add("hidden");
		document.getElementById("fieldDelimiterLabel").classList.add("hidden");
		document.getElementById("fieldDelimiterTextBox").classList.add("hidden");
		document.getElementById("includePrefLabel").classList.add("hidden");
		document.getElementById("includePrefCheckBox").classList.add("hidden");
		document.getElementById("lineHeaderLabel").classList.add("hidden");
		document.getElementById("lineHeaderCheckBox").classList.add("hidden");
		document.getElementById("loadTemplateButton").classList.add("hidden");
		document.getElementById("saveTemplateButton").classList.add("hidden");
		document.getElementById("guesslistavailableColumnsButton").classList.add("hidden");
	} else if (mode == "export") {
		document.getElementById("foundColumnsVBox").classList.add("hidden");
		document.getElementById("lineHeaderLabel").classList.add("hidden");
		document.getElementById("lineHeaderCheckBox").classList.add("hidden");
		document.getElementById("guesslistavailableColumnsButton").classList.add("hidden");
		document.getElementById('fieldDelimiterTextBox').value = columnSeparator;
	} else if (mode == "import") {
		if (foundColumns) {
			document.getElementById('foundColumnsTable').classList.add("active");
			document.getElementById('foundColumnsGroupboxLabel').textContent = messenger.i18n.getMessage(mode + "foundColumnsGroupboxLabel");
		} else {
			document.getElementById("foundColumnsVBox").classList.add("hidden");
		}
		document.getElementById("includePrefLabel").classList.add("hidden");
		document.getElementById("includePrefCheckBox").classList.add("hidden");
		document.getElementById('lineHeaderCheckBox').checked = true;
		document.getElementById('fieldDelimiterTextBox').value = columnSeparator;
		blankColumn = messenger.i18n.getMessage("importBlankColumn");
		cardbookeditlists.availableColumnsTable.push(["blank", blankColumn]);
	}

	// input
	document.getElementById("fieldDelimiterTextBox").addEventListener("input", event => loadFoundColumns());
	// button
	document.getElementById("appendlistavailableColumnsButton").addEventListener("click", event => modifyLists("appendlistavailableColumnsButton"));
	document.getElementById("deletelistaddedColumnsButton").addEventListener("click", event => modifyLists("deletelistaddedColumnsButton"));
	document.getElementById("upAddedColumnsButton").addEventListener("click", event => upColumns());
	document.getElementById("downAddedColumnsButton").addEventListener("click", event => downColumns());
	document.getElementById("guesslistavailableColumnsButton").addEventListener("click", event => guess());
	document.getElementById('cancelButton').addEventListener("click", onCancelDialog);
	document.getElementById('validateButton').addEventListener("click", onAcceptDialog);
	document.getElementById('saveTemplateButton').addEventListener("click", saveTemplate);
	document.getElementById('loadTemplateButton').addEventListener("click", loadTemplate);

    if (mode == "choice") {
		fields = fields.split('|');
		for (let field of fields) {
			let label = await messenger.runtime.sendMessage({query: "cardbook.getTranslatedField", value: field});
			template.push([field, label]);
		}
		cardbookeditlists.addedColumnsTable = template;
		displayListTables("addedColumnsTable");
	}

    let columns = await messenger.runtime.sendMessage({query: "cardbook.getAllAvailableColumns", mode: mode});
	cardbookHTMLUtils.sortMultipleArrayByString(columns, 1, 1);
	cardbookeditlists.availableColumnsTable = cardbookeditlists.availableColumnsTable.concat(columns);
	displayListTables("availableColumnsTable");

	if (mode == "import") {
		loadFoundColumns();
	}
};

async function getTemplate (aFieldList) {
    let fields = aFieldList.split('|');
    let result = [];
    for (let field of fields) {
        let label = await messenger.runtime.sendMessage({query: "cardbook.getTranslatedField", value: field});
        result.push([field, label]);
    }
    return result;
};

function getDefaultTemplateName () {
	let defaultTemplateName = filename + ".tpl";
	if (filename.endsWith(".csv")) {
		defaultTemplateName = filename.replace(/\.csv$/, ".tpl");
	} else if (filename.includes(".")) {
		let tmpArray = filename.split(".");
		tmpArray.pop();
		defaultTemplateName = tmpArray.join(".") + ".tpl";
	}
	return defaultTemplateName;
};

async function loadTemplate () {
	await messenger.runtime.sendMessage({query: "cardbook.callFilePicker", id: gFilePickerId, result: "content", title: "fileSelectionTPLTitle", mode: "OPEN", type: "TPL", defaultFileName: getDefaultTemplateName()});
};

async function loadTemplateNext(aId, aContent) {
	if (aId != gFilePickerId) {
		return;
	}
	if (aContent) {
		cardbookeditlists.addedColumnsTable = await getTemplate(aContent);
		displayListTables("addedColumnsTable");
	}
}

async function saveTemplate () {
	let text = cardbookeditlists.addedColumnsTable.map(x => x[0]).join('|');
	await messenger.runtime.sendMessage({query: "cardbook.callFilePicker", id: gFilePickerId, result: "write", title: "fileCreationTPLTitle", mode: "SAVE", type: "TPL", defaultFileName: getDefaultTemplateName(), content: text});
};

async function onAcceptDialog () {
	if (mode == "import" && !validateImportColumns()) {
		return;
	}
	let urlParams = {};
	urlParams.mode = mode;
	urlParams.columnSeparator = document.getElementById('fieldDelimiterTextBox').value || ";";
	urlParams.includePref = document.getElementById('includePrefCheckBox').checked;
	urlParams.lineHeader = document.getElementById('lineHeaderCheckBox').checked;
	urlParams.actionId = actionId;
	urlParams.fields = cardbookeditlists.addedColumnsTable.map(x => x[0]).join("|");
	urlParams.labels = cardbookeditlists.addedColumnsTable.map(x => x[1]).join("|");
	urlParams.filename = filename;
	urlParams.filepath = filepath;
	if (mode == "choice") {
		await messenger.runtime.sendMessage({query: "cardbook.conf.saveAutocompleteRestrictSearchFields", urlParams: urlParams});
	} else if (mode == "export") {
		await messenger.runtime.sendMessage({query: "cardbook.notifyObserver", value: "cardbook.writeCardsToCSVFile", params: JSON.stringify(urlParams)});
	} else if (mode == "import") {
		await messenger.runtime.sendMessage({query: "cardbook.notifyObserver", value: "cardbook.loadCSVFile", params: JSON.stringify(urlParams)});
	}
	onCancelDialog();
};

async function onCancelDialog () {
	cardbookHTMLRichContext.closeWindow();
};

onLoadDialog();

messenger.runtime.onMessage.addListener( (info) => {
	switch (info.query) {
		case "cardbook.callFilePickerDone":
			loadTemplateNext(info.id, info.file);
			break;
	}
});
