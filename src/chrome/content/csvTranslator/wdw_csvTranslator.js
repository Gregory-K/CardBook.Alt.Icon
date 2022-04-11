var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	
var cardbookeditlists = {};
var blankColumn = "";
var nIntervId = "";

function getIndexFromName (aName) {
	let tmpArray = aName.split("_");
	return tmpArray[tmpArray.length - 1];
};

function getTableCurrentIndex (aTableName) {
	let selectedList = document.getElementById(aTableName).querySelectorAll("tr[rowSelected='true']");
	if (selectedList.length) {
		return getIndexFromName(selectedList[0].id);
	}
};

function getSelectedLines (aTableName) {
	let listOfSelected = [];
	let table = document.getElementById(aTableName);
	let selectedRows = table.querySelectorAll("tr[rowSelected='true']");
	for (let row of selectedRows) {
		let index = getIndexFromName(row.id);
		listOfSelected.push(cardbookeditlists[aTableName][index][0]);
	}
	return listOfSelected;
};

function setSelectedLines (aTableName, aIndex) {
	let table = document.getElementById(aTableName);
	let selectedRow = table.querySelector("tr:nth-of-type(" + aIndex + ")");
	selectedRow.setAttribute("rowSelected", "true");
};

function upColumns () {
	let tableName = "addedColumnsTable";
	let listOfSelected = [];
	listOfSelected = getSelectedLines(tableName);
	if (cardbookeditlists[tableName][0][0] == listOfSelected[0]) {
		return
	}
	for (let selected of listOfSelected) {
		let index = -1;
		for (let i = 0; i < cardbookeditlists[tableName].length; i++) {
			if (cardbookeditlists[tableName][i][0] == selected) {
				index = i;
				break;
			}
		}
		if (index != -1) {
			let temp = cardbookeditlists[tableName][index-1];
			cardbookeditlists[tableName][index-1] = cardbookeditlists[tableName][index];
			cardbookeditlists[tableName][index] = temp;
		}

	}
	displayListTables(tableName);
	for (let selected of listOfSelected) {
		let index = -1;
		for (let i = 0; i < cardbookeditlists[tableName].length; i++) {
			if (cardbookeditlists[tableName][i][0] == selected) {
				index = i;
				break;
			}
		}
		if (index != -1) {
			let rowIndex = index + +1;
			setSelectedLines(tableName, rowIndex);
		}
	}
};

function downColumns () {
	let tableName = "addedColumnsTable";
	let listOfSelected = [];
	listOfSelected = getSelectedLines(tableName);
	if (cardbookeditlists[tableName][cardbookeditlists[tableName].length - 1][0] == listOfSelected[listOfSelected.length - 1]) {
		return
	}
	for (let i = listOfSelected.length-1; i >= 0; i--) {
		let selected = listOfSelected[i];
		let index = -1;
		for (let j = 0; i < cardbookeditlists[tableName].length; j++) {
			if (cardbookeditlists[tableName][j][0] == selected) {
				index =j;
				break;
			}
		}
		if (index != -1) {
			let temp = cardbookeditlists[tableName][index+1];
			cardbookeditlists[tableName][index+1] = cardbookeditlists[tableName][index];
			cardbookeditlists[tableName][index] = temp;
		}

	}
	displayListTables(tableName);
	for (let selected of listOfSelected) {
		let index = -1;
		for (let i = 0; i < cardbookeditlists[tableName].length; i++) {
			if (cardbookeditlists[tableName][i][0] == selected) {
				index = i;
				break;
			}
		}
		if (index != -1) {
			let rowIndex = index + +1;
			setSelectedLines(tableName, rowIndex);
		}
	}
};

function clickTree (aEvent) {
	if (aEvent.target.tagName == "html:td") {
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
	let focusedElement = document.commandDispatcher.focusedElement; 
	if (aEvent.ctrlKey && aEvent.key.toUpperCase() == "A" && focusedElement) {
		let table = aEvent.target.closest("table");
		if (table) {
			let tbody = table.querySelector("tbody");
			for (let child of tbody.childNodes) {
				child.setAttribute("rowSelected", "true");
			}
		}
	}	
};

function displayListTables (aTableName) {
	cardbookElementTools.deleteRows(aTableName);
	let headers = [];
	let data = cardbookeditlists[aTableName].map(x => [ x[1] ]);
	let dataParameters = [];
	cardbookElementTools.addTreeTable(aTableName, headers, data, dataParameters);
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

function modifyLists (aMenuOrTable) {
	let addedTablename = "addedColumnsTable";
	let availableTablename = "availableColumnsTable";
	let selectedIndexes = [];
	switch (aMenuOrTable.id) {
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

function validateImportColumns () {
	if (cardbookeditlists.foundColumnsTable.length != cardbookeditlists.addedColumnsTable.length) {
		let confirmTitle = cardbookRepository.extension.localeData.localizeMessage("confirmTitle");
		let confirmMsg = cardbookRepository.extension.localeData.localizeMessage("missingColumnsConfirmMessage");
		if (!Services.prompt.confirm(window, confirmTitle, confirmMsg)) {
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
	cardbookeditlists.foundColumnsTable = [];
	let separator = document.getElementById('fieldDelimiterTextBox').value;
	if (separator == "") {
		separator = ";";
	}
	let tmpArray = window.arguments[0].headers.split(separator);
	for (let i = 0; i < tmpArray.length; i++) {
		cardbookeditlists.foundColumnsTable.push([i, tmpArray[i]]);
	}
	displayListTables("foundColumnsTable");
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
		cardbookRepository.cardbookLog.updateStatusProgressInformation("startDrag error : " + e, "Error");
	}
};

function dragCards (aEvent) {
	let table;
	let rowIndex = -1;
	// outside the rows
	if (aEvent.target.tagName == "table") {
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
			if (rowIndex == -1) {
				cardbookeditlists.addedColumnsTable.push([value, cardbookRepository.cardbookUtils.getTranslatedField(value)]);
			} else {
				cardbookeditlists.addedColumnsTable.splice(rowIndex, 0, [value, cardbookRepository.cardbookUtils.getTranslatedField(value)]);
				rowIndex++;
			}
		}
	}
	displayListTables("addedColumnsTable");
};

function windowControlShowing () {
	let listOfSelected = getSelectedLines("addedColumnsTable");
	if (listOfSelected.length > 0) {
		document.getElementById('deletelistaddedColumnsButton').disabled = false;
		document.getElementById('upAddedColumnsButton').disabled = false;
		document.getElementById('downAddedColumnsButton').disabled = false;
	} else {
		document.getElementById('deletelistaddedColumnsButton').disabled = true;
		document.getElementById('upAddedColumnsButton').disabled = true;
		document.getElementById('downAddedColumnsButton').disabled = true;
	}
	listOfSelected = getSelectedLines("availableColumnsTable");
	if (listOfSelected.length > 0) {
		document.getElementById('appendlistavailableColumnsButton').disabled = false;
	} else {
		document.getElementById('appendlistavailableColumnsButton').disabled = true;
	}
};

function guess () {
	let oneFound = false;
	let result = [];
	// search with current locale
	for (let foundColumn of cardbookeditlists.foundColumnsTable) {
		foundColumn = foundColumn[1].replace(/^\"|\"$/g, "").replace(/^\'|\'$/g, "");
		let found = false;
		for (let availableColumn of cardbookeditlists.availableColumnsTable) {
			if (availableColumn[1].toLowerCase() == foundColumn.toLowerCase()) {
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
				let translatedColumn = cardbookRepository.cardbookUtils.getTranslatedField(availableColumn[0], "locale-US");
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

function onLoadDialog () {
	i18n.updateDocument({ extension: cardbookRepository.extension });

	window.arguments[0].action = "CANCEL";
	document.title = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].mode + "MappingTitle");
	document.querySelector("dialog").getButton("extra1").label = cardbookRepository.extension.localeData.localizeMessage("saveTemplateLabel");
	document.querySelector("dialog").getButton("extra2").label = cardbookRepository.extension.localeData.localizeMessage("loadTemplateLabel");
	document.getElementById('availableColumnsGroupboxLabel').value = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].mode + "availableColumnsGroupboxLabel");
	document.getElementById('addedColumnsGroupboxLabel').value = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].mode + "addedColumnsGroupboxLabel");
	
	cardbookeditlists.availableColumnsTable = [];
	cardbookeditlists.addedColumnsTable = [];
	
	document.getElementById('fieldDelimiterLabel').value = cardbookRepository.extension.localeData.localizeMessage("fieldDelimiterLabel");
	document.getElementById('includePrefLabel').value = cardbookRepository.extension.localeData.localizeMessage("includePrefLabel");
	document.getElementById('lineHeaderLabel').value = cardbookRepository.extension.localeData.localizeMessage("lineHeaderLabel");

	if (window.arguments[0].mode == "choice") {
		document.getElementById('foundColumnsVBox').hidden = true;
		document.getElementById('fieldDelimiterLabel').hidden = true;
		document.getElementById('fieldDelimiterTextBox').hidden = true;
		document.getElementById('includePrefLabel').hidden = true;
		document.getElementById('includePrefCheckBox').hidden = true;
		document.getElementById('lineHeaderLabel').hidden = true;
		document.getElementById('lineHeaderCheckBox').hidden = true;
		document.querySelector("dialog").getButton("extra1").hidden = true;
		document.querySelector("dialog").getButton("extra2").hidden = true;
		document.getElementById('guesslistavailableColumnsButton').hidden = true;
	} else if (window.arguments[0].mode == "export") {
		document.getElementById('foundColumnsVBox').hidden = true;
		document.getElementById('lineHeaderLabel').hidden = true;
		document.getElementById('lineHeaderCheckBox').hidden = true;
		document.getElementById('fieldDelimiterTextBox').value = window.arguments[0].columnSeparator;
		document.getElementById('guesslistavailableColumnsButton').hidden = true;
	} else if (window.arguments[0].mode == "import") {
		document.getElementById('foundColumnsGroupboxLabel').value = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].mode + "foundColumnsGroupboxLabel");
		document.getElementById('includePrefLabel').hidden = true;
		document.getElementById('includePrefCheckBox').hidden = true;
		document.getElementById('lineHeaderCheckBox').setAttribute('checked', true);
		document.getElementById('fieldDelimiterTextBox').value = window.arguments[0].columnSeparator;
		blankColumn = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].mode + "blankColumn");
		cardbookeditlists.availableColumnsTable.push(["blank", blankColumn]);
	}
	
	cardbookeditlists.addedColumnsTable = window.arguments[0].template;
	displayListTables("addedColumnsTable");

	cardbookeditlists.availableColumnsTable = cardbookeditlists.availableColumnsTable.concat(cardbookRepository.cardbookUtils.getAllAvailableColumns(window.arguments[0].mode));
	displayListTables("availableColumnsTable");

	if (window.arguments[0].mode == "import") {
		loadFoundColumns();
	}
};

function onAcceptDialog () {
	window.arguments[0].template = cardbookeditlists.addedColumnsTable;
	window.arguments[0].columnSeparator = document.getElementById('fieldDelimiterTextBox').value;
	window.arguments[0].includePref = document.getElementById('includePrefCheckBox').checked;
	window.arguments[0].lineHeader = document.getElementById('lineHeaderCheckBox').checked;
	if (window.arguments[0].columnSeparator == "") {
		window.arguments[0].columnSeparator = ";";
	}
	window.arguments[0].action = "SAVE";
	if (window.arguments[0].mode == "import") {
		if (!validateImportColumns()) {
			return;
		}
	}
	onCancelDialog();
};

function getDefaultTemplateName () {
	let filename = window.arguments[0].file.leafName;
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

function loadTemplate () {
	cardbookWindowUtils.callFilePicker("fileSelectionTPLTitle", "OPEN", "TPL", getDefaultTemplateName(), "", loadTemplateNext);
};

function loadTemplateNext (aFile) {
	try {
		if (aFile) {
			cardbookRepository.cardbookUtils.readContentFromFile(aFile.path, loadTemplateNext2, {});
		}
	}
	catch (e) {
		cardbookRepository.cardbookLog.updateStatusProgressInformation("loadTemplateNext error : " + e, "Error");
	}
};

function loadTemplateNext2 (aContent, aParams) {
	try {
		if (aContent) {
			cardbookeditlists.addedColumnsTable = cardbookRepository.cardbookUtils.getTemplate(aContent);
			displayListTables("addedColumnsTable");
		}
	}
	catch (e) {
		cardbookRepository.cardbookLog.updateStatusProgressInformation("loadTemplateNext2 error : " + e, "Error");
	}
};

function saveTemplate () {
	cardbookWindowUtils.callFilePicker("fileCreationTPLTitle", "SAVE", "TPL", getDefaultTemplateName(), "", saveTemplateNext);
};

async function saveTemplateNext (aFile) {
	try {
		if (!(aFile.exists())) {
			aFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
		}

		var result = [];
		for (let addedColumn of cardbookeditlists.addedColumnsTable) {
			result.push(addedColumn[0]);
		}

		await cardbookRepository.cardbookUtils.writeContentToFile(aFile.path, result.join('|'), "UTF8");
	}
	catch (e) {
		cardbookRepository.cardbookLog.updateStatusProgressInformation("saveTemplateNext error : " + e, "Error");
	}
};

function onCancelDialog () {
	if (window.arguments[0].actionCallback) {
		window.arguments[0].actionCallback(window.arguments[0].file, window.arguments[0].selectedCards,
											window.arguments[0].actionId, window.arguments[0].template,
											window.arguments[0].columnSeparator, window.arguments[0].includePref,
											window.arguments[0].action, window.arguments[0].headers, window.arguments[0].lineHeader,
											window.arguments[0].params);
	}
	close();
};

document.addEventListener("dialogaccept", onAcceptDialog);
document.addEventListener("dialogcancel", onCancelDialog);
document.addEventListener("dialogextra1", saveTemplate);
document.addEventListener("dialogextra2", loadTemplate);
