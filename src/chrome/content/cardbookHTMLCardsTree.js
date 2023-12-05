var { AppConstants } = ChromeUtils.importESModule("resource://gre/modules/AppConstants.sys.mjs");
var { UIDensity } = ChromeUtils.import("resource:///modules/UIDensity.jsm");

var { TreeSelection } = ChromeUtils.importESModule("chrome://cardbook/content/cardbookHTMLCardsTreeSelection.js");

Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookHTMLCardSearch.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookHTMLPaneSplitter.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookHTMLCardsTreeView.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookHTMLCardsTreeViewTable.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookHTMLCardsTreeViewTableHeader.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookHTMLCardsTreeViewTableHeaderCell.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookHTMLCardsTreeViewTableColumnPicker.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookHTMLCardsTreeViewTableBody.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookHTMLCardsTreeViewTableRow.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookHTMLCardsTreeViewTableSpacer.js", window, "UTF-8");

function ABView(selectedId, searchString, searchAll, sortColumn, sortDirection, finish) {
	this._tree = null;
	this._rowMap = [];
	this._persistOpenMap = [];
	
	this.searchString = cardbookRepository.makeSearchString(searchString);
	if (this.searchString) {
		this._searchesInProgress = 1;
		if (searchAll) {
			for (let i in cardbookRepository.cardbookCards) {
				let card = cardbookRepository.cardbookCards[i];
				if (cardbookRepository.getLongSearchString(card).indexOf(this.searchString) >= 0) {
					this._rowMap.push(new abViewCard(card));
				}
			}
		} else {
			for (let card of cardbookRepository.cardbookDisplayCards[selectedId].cards) {
				if (cardbookRepository.getLongSearchString(card).indexOf(this.searchString) >= 0) {
					this._rowMap.push(new abViewCard(card));
				}
			}
		}
		if (finish) {
			this._searchesInProgress = 0;
		}
	} else {
		for (let card of cardbookRepository.cardbookDisplayCards[selectedId].cards) {
			this._rowMap.push(new abViewCard(card));
		}
	}
	this.sortBy(sortColumn, sortDirection);
}
ABView.NOT_SEARCHING = 0;
ABView.SEARCHING = 1;
ABView.SEARCH_COMPLETE = 2;
ABView.prototype = {
	get rowCount() {
		return this._rowMap.length;
	},

	/**
	 * CSS files will cue off of these.  Note that we reach into the rowMap's
	 * items so that custom data-displays can define their own properties
	 */
	getCellProperties(aRow, aCol) {
		return this._rowMap[aRow].getProperties(aCol);
	},

	/**
	 * The actual text to display in the tree
	 */
	getCellText(aRow, aCol) {
		return this._rowMap[aRow].getText(aCol.id);
	},

	getCellValue(aRow, aCol) {
		return this._rowMap[aRow].getValue(aCol.id);
	},

	/**
	 * The jstv items take care of assigning this when building children lists
	 */
	getLevel(aIndex) {
		return this._rowMap[aIndex].level;
	},

	/**
	 * This is easy since the jstv items assigned the _parent property when making
	 * the child lists
	 */
	getParentIndex(aIndex) {
		return this._rowMap.indexOf(this._rowMap[aIndex]._parent);
	},

	/**
	 * This is duplicative for our normal jstv views, but custom data-displays may
	 * want to do something special here
	 */
	getRowProperties(aRow) {
		return this._rowMap[aRow].getProperties();
	},

	/**
	 * If an item in our list has the same level and parent as us, it's a sibling
	 */
	hasNextSibling(aIndex, aNextIndex) {
		const targetLevel = this._rowMap[aIndex].level;
		for (let i = aNextIndex + 1; i < this._rowMap.length; i++) {
			if (this._rowMap[i].level == targetLevel) {
				return true;
			}
			if (this._rowMap[i].level < targetLevel) {
				return false;
			}
		}
		return false;
	},

	/**
	 * If we have a child-list with at least one element, we are a container.
	 */
	isContainer(aIndex) {
		return this._rowMap[aIndex].children.length > 0;
	},

	isContainerEmpty(aIndex) {
		// If the container has no children, the container is empty.
		return !this._rowMap[aIndex].children.length;
	},

	/**
	 * Just look at the jstv item here
	 */
	isContainerOpen(aIndex) {
		return this._rowMap[aIndex].open;
	},

	isEditable(aRow, aCol) {
		// We don't support editing rows in the tree yet.
		return false;
	},

	isSeparator(aIndex) {
		// There are no separators in our trees
		return false;
	},

	isSorted() {
		// We do our own customized sorting
		return false;
	},

	setTree(aTree) {
		this._tree = aTree;
	},

	recursivelyAddToMap(aChild, aNewIndex) {
		// When we add sub-children, we're going to need to increase our index
		// for the next add item at our own level.
		const currentCount = this._rowMap.length;
		if (aChild.children.length && aChild.open) {
			for (const [i, child] of this._rowMap[aNewIndex].children.entries()) {
				const index = aNewIndex + i + 1;
				this._rowMap.splice(index, 0, child);
				aNewIndex += this.recursivelyAddToMap(child, index);
			}
		}
		return this._rowMap.length - currentCount;
	},

	/**
	 * Opens or closes a container with children.  The logic here is a bit hairy, so
	 * be very careful about changing anything.
	 */
	toggleOpenState(aIndex) {
		// Ok, this is a bit tricky.
		this._rowMap[aIndex]._open = !this._rowMap[aIndex].open;

		if (!this._rowMap[aIndex].open) {
			// We're closing the current container.  Remove the children

			// Note that we can't simply splice out children.length, because some of
			// them might have children too.  Find out how many items we're actually
			// going to splice
			const level = this._rowMap[aIndex].level;
			let row = aIndex + 1;
			while (row < this._rowMap.length && this._rowMap[row].level > level) {
				row++;
			}
			const count = row - aIndex - 1;
			this._rowMap.splice(aIndex + 1, count);

			// Remove us from the persist map
			const index = this._persistOpenMap.indexOf(this._rowMap[aIndex].id);
			if (index != -1) {
				this._persistOpenMap.splice(index, 1);
			}

			// Notify the tree of changes
			if (this._tree) {
				this._tree.rowCountChanged(aIndex + 1, -count);
			}
		} else {
			// We're opening the container.  Add the children to our map

			// Note that these children may have been open when we were last closed,
			// and if they are, we also have to add those grandchildren to the map
			const oldCount = this._rowMap.length;
			this.recursivelyAddToMap(this._rowMap[aIndex], aIndex);

			// Add this container to the persist map
			const id = this._rowMap[aIndex].id;
			if (!this._persistOpenMap.includes(id)) {
				this._persistOpenMap.push(id);
			}

			// Notify the tree of changes
			if (this._tree) {
				this._tree.rowCountChanged(aIndex + 1, this._rowMap.length - oldCount);
			}
		}

		// Invalidate the toggled row, so that the open/closed marker changes
		if (this._tree) {
			this._tree.invalidateRow(aIndex);
		}
	},

	// We don't implement any of these at the moment
	canDrop(aIndex, aOrientation) {},
	drop(aRow, aOrientation) {},
	selectionChanged() {},
	setCellText(aRow, aCol, aValue) {},
	setCellValue(aRow, aCol, aValue) {},
	getColumnProperties(aCol) {
		return "";
	},
	getImageSrc(aRow, aCol) {},
	getProgressMode(aRow, aCol) {},
	cycleCell(aRow, aCol) {},
	cycleHeader(aCol) {},

	_tree: null,

	/**
	 * An array of jstv items, where each item corresponds to a row in the tree
	 */
	_rowMap: null,

	/**
	 * This is a javascript map of which containers we had open, so that we can
	 * persist their state over-time.  It is designed to be used as a JSON object.
	 */
	_persistOpenMap: null,

	_restoreOpenStates() {
		// Note that as we iterate through here, .length may grow
		for (let i = 0; i < this._rowMap.length; i++) {
			if (this._persistOpenMap.includes(this._rowMap[i].id)) {
				this.toggleOpenState(i);
			}
		}
	},

	sortColumn: "",
	sortDirection: "",

	getCardFromRow(row) {
		return this._rowMap[row] ? this._rowMap[row].card : null;
	},

	getIndexForUID(uid) {
		return this._rowMap.findIndex(row => row.id == uid);
	},

	sortBy(sortColumn, sortDirection, resort) {
		let selectionExists = false;
		if (this._tree) {
			let { selectedIndices, currentIndex } = this._tree;
			selectionExists = selectedIndices.length;
			// Remember what was selected.
			for (let i = 0; i < this._rowMap.length; i++) {
				this._rowMap[i].wasSelected = selectedIndices.includes(i);
				this._rowMap[i].wasCurrent = currentIndex == i;
			}
		}

		// Do the sort.
		if (sortColumn == this.sortColumn && !resort) {
			if (sortDirection == this.sortDirection) {
				return;
			}
			this._rowMap.reverse();
		} else {
			this._rowMap.sort((a, b) => {
				let sortColumn1 = sortColumn;
				if (sortColumn1 == "name") {
					let aText = cardbookRepository.cardbookUtils.getName(a.card);
					let bText = cardbookRepository.cardbookUtils.getName(b.card);
					if (sortDirection == "descending") {
						return aText.localeCompare(bText);
					} else {
						return bText.localeCompare(aText);
					}
				} else if (sortColumn1 == "cardIcon") {
					let aText = a.card.isAList;
					let bText = b.card.isAList;
					if (sortDirection == "descending") {
						return (aText === bText) ? 0 : aText ? -1 : 1;
					} else {
						return (aText === bText) ? 0 : bText ? -1 : 1;
					}
				} else if (sortColumn1 == "gender") {
					let aText = cardbookRepository.cardbookGenderLookup[a.card.gender];
					let bText = cardbookRepository.cardbookGenderLookup[b.card.gender];
					if (sortDirection == "descending") {
						return aText.localeCompare(bText);
					} else {
						return bText.localeCompare(aText);
					}
				} else if (sortColumn1 == "bday" || sortColumn1 == "anniversary" || sortColumn1 == "deathdate" || sortColumn1 == "rev") {
					let aText = cardbookRepository.cardbookDates.getDateForCompare(a.card, sortColumn1);
					let bText = cardbookRepository.cardbookDates.getDateForCompare(b.card, sortColumn1);
					if (sortDirection == "descending") {
						return aText > bText;
					} else {
						return bText > aText;
					}
				} else {
					let aText = cardbookRepository.cardbookUtils.getCardValueByField(a.card, sortColumn1, false).join();
					let bText = cardbookRepository.cardbookUtils.getCardValueByField(b.card, sortColumn1, false).join();
					if (sortDirection == "descending") {
						return aText.localeCompare(bText);
					} else {
						return bText.localeCompare(aText);
					}
				}
			});
		}

		// Restore what was selected.
		if (this._tree) {
			this._tree.invalidate();
			if (selectionExists) {
				for (let i = 0; i < this._rowMap.length; i++) {
					this._tree.toggleSelectionAtIndex(i, this._rowMap[i].wasSelected, true);
				}
				// Can't do this until updating the selection is finished.
				for (let i = 0; i < this._rowMap.length; i++) {
					if (this._rowMap[i].wasCurrent) {
						this._tree.currentIndex = i;
						break;
					}
				}
				this.selectionChanged();
			}
		}
		this.sortColumn = sortColumn;
		this.sortDirection = sortDirection;

		// for next and previous in edition
		cardbookRepository.displayedIds = {};
		for (let index in this._rowMap) {
			cardbookRepository.displayedIds[index] = this._rowMap[index].card.cbid;
		}

	},

	get searchState() {
		if (this._searchesInProgress === undefined) {
			return ABView.NOT_SEARCHING;
		}
		return this._searchesInProgress ? ABView.SEARCHING : ABView.SEARCH_COMPLETE;
	},

	// nsITreeView
	selectionChanged() {},
	setTree(tree) {
		this._tree = tree;
	},
};

function abViewCard(card) {
	this.card = card;
	this._getTextCache = {};
}
abViewCard.prototype = {
	_getText(columnID) {
		try {
			if (columnID == "cardIcon") return "";
			else if (columnID == "name") return cardbookRepository.cardbookUtils.getName(this.card);
			else if (columnID == "gender") return cardbookRepository.cardbookGenderLookup[this.card.gender];
			else if (columnID == "bday") return cardbookRepository.cardbookDates.getFormattedDateForCard(this.card, columnID);
			else if (columnID == "anniversary") return cardbookRepository.cardbookDates.getFormattedDateForCard(this.card, columnID);
			else if (columnID == "deathdate") return cardbookRepository.cardbookDates.getFormattedDateForCard(this.card, columnID);
			else if (columnID == "rev") return cardbookRepository.cardbookDates.getFormattedDateForCard(this.card, columnID);
			else return cardbookRepository.cardbookUtils.getCardValueByField(this.card, columnID, false).join();
		} catch (ex) {
			return "";
		}
	},

	getText(columnID) {
		if (!(columnID in this._getTextCache)) {
			this._getTextCache[columnID] = this._getText(columnID)?.trim() ?? "";
		}
		return this._getTextCache[columnID];
	},

	get id() {
		return this.card.uid;
	},

	get open() {
		return false;
	},

	get level() {
		return 0;
	},

	get children() {
		return [];
	},

	getProperties() {
		return "";
	},
};

var cardbookHTMLCardsTree = {
	searchInput: null,
	searchAllInput: null,
	cardsList: null,
	dirPrefId: "",
	columns: [],

	init() {
		this.searchAllInput = document.getElementById("searchAllAB");
		this.searchAllInput.classList.add(cardbookRepository.cardbookPrefs["searchAllAB"]);

		this.searchInput = document.getElementById("cardbookSearchInput");
		this.sortContext = document.getElementById("sortTreeContextMenu");
		this.cardContext = document.getElementById("cardsTreeContextMenu");

		this.cardsList = document.getElementById("cardbookCardsTree");

		this.table = this.cardsList.table;
		this.table.editable = true;
		this.table.setPopupMenuTemplates([ "cardbookCardsTreeApplyViewMenu" ]);
		this.table.setBodyID("cardbookCardsTreeBody");
		this.cardsList.setAttribute("rows", "ab-table-card-row");

		let panesView = cardbookRepository.cardbookPrefs["panesView"];
		if (panesView == "modern") {
			this.setCardsTreeWidth();
		} else {
			this.setCardsTreeHeight();
		}

		this.setHeader();

		this.searchAllInput.addEventListener("click", this);
		this.searchInput.addEventListener("command", this);
		this.sortContext.addEventListener("command", this);
		this.table.addEventListener("columns-changed", this);
		this.table.addEventListener("sort-changed", this);
		this.table.addEventListener("column-resized", this);
		this.table.addEventListener("reorder-columns", this);
		this.table.addEventListener("restore-columns", this);
		this.cardsList.addEventListener("select", this);
		this.cardsList.addEventListener("keydown", this);
		this.cardsList.addEventListener("dblclick", this);
		this.cardsList.addEventListener("dragstart", this);
		this.cardsList.addEventListener("contextmenu", this);
		this.cardsList.addEventListener("rowcountchange", () => {
			if (document.activeElement == this.cardsList && this.cardsList.view.rowCount == 0) {
				this.searchInput.focus();
			}});
		this.cardContext.addEventListener("command", this);

		window.addEventListener("uidensitychange", () => this.densityChange());
		customElements.whenDefined("ab-table-card-row").then(() => this.densityChange());

		this.searchInput.focus();   
	},

	handleEvent(event) {
		switch (event.type) {
			case "command":
				this._onCommand(event);
				break;
			case "click":
				this._onClick(event);
				break;
			case "select":
				wdw_cardbook.selectCard(event);
				wdw_cardbook.windowControlShowing();
				break;
			case "keydown":
				this._onKeyDown(event);
				break;
			case "dblclick":
				wdw_cardbook.doubleClickCards(event);
				break;
			case "dragstart":
				wdw_cardbook.startDrag(event);
				break;
			case "contextmenu":
				this._onContextMenu(event);
				break;
			case "columns-changed":
				this._onColumnsChanged(event.detail);
				break;
			case "sort-changed":
				this._onSortChanged(event);
				break;
			case "column-resized":
				this._onColumnResized(event);
				break;
			case "reorder-columns":
				this._onReorderColumns(event.detail);
				break;
			case "restore-columns":
				this._onRestoreDefaultColumns();
				break;
		}
	},

	async _onCommand(event) {
		if (event.target == this.searchInput) {
			wdw_cardbook.onStartSearch();
			let ABType = cardbookRepository.cardbookPreferences.getType(this.dirPrefId);
			let remote = cardbookRepository.cardbookUtils.isMyAccountRemote(ABType);
			let cached = cardbookRepository.cardbookPreferences.getDBCached(this.dirPrefId);
			if (remote && !cached) {
				cardbookRepository.cardbookPreferences.setLastSearch(this.dirPrefId, this.searchInput.value);
				if (this.searchInput.value != "") {
					this.searchInput.value = cardbookRepository.cardbookPreferences.getLastSearch(this.dirPrefId);
					await wdw_cardbook.searchRemote();
				}
			}
			await this.displayBook();
		}
	},

	_onKeyDown(event) {
		if (event.altKey || event.shiftKey) {
			return;
		}
		let modifier = event.ctrlKey;
		let antiModifier = event.metaKey;
		if (AppConstants.platform == "macosx") {
			[modifier, antiModifier] = [antiModifier, modifier];
		}
		if (antiModifier) {
			return;
		}
		switch (event.key) {
			case "a":
				if (modifier) {
					this.cardsList.view.selection.selectAll();
					this.cardsList.dispatchEvent(new CustomEvent("select"));
					event.preventDefault();
				}
				break;
			case "Delete":
				if (!modifier) {
					wdw_cardbook.deleteKey();
					event.preventDefault();
				}
				break;
			case "Enter":
				if (!modifier) {
					wdw_cardbook.returnKey(event);
					event.preventDefault();
				}
				break;
		}
	},

	_onContextMenu(event) {
		let row;
		if (event.target == this.cardsList.table.body) {
			row = this.cardsList.getRowAtIndex(this.cardsList.currentIndex);
		} else {
			row = event.target.closest(`tr[is="ab-table-card-row"]`);
		}
		if (!row) {
			return;
		}
		if (!this.cardsList.selectedIndices.includes(row.index)) {
			this.cardsList.selectedIndex = row.index;
		}

		wdw_cardbook.cardsTreeContextShowing(event);

		if (event.type == "contextmenu" && event.button == 2) {
			// This is a right-click. Open where it happened.
			this.cardContext.openPopupAtScreen(event.screenX, event.screenY, true);
		} else {
			// This is a context menu key press. Open near the middle of the row.
			this.cardContext.openPopup(row, {triggerEvent: event, position: "overlap",x: row.clientWidth / 2, y: row.clientHeight / 2});
		}
		event.preventDefault();
	},

	async _onClick(event) {
		if (event.target == this.searchAllInput) {
			this.searchAllInput.classList.toggle("oneAB");
			this.searchAllInput.classList.toggle("allAB");
			let searchAll = this.searchAllInput.classList.contains("allAB") ? "allAB" : "oneAB";
			cardbookRepository.cardbookPreferences.setStringPref("searchAllAB", searchAll);
			await this.displayBook();
		}
	},

	confirmApplyAB(aEvent) {
		let destAB = aEvent.originalTarget.value;
		let destABName = aEvent.originalTarget.label;
		let title = cardbookRepository.extension.localeData.localizeMessage("columnPickerApplyCurrentViewToConfirmTitle");
		let msg = cardbookRepository.extension.localeData.localizeMessage("columnPickerApplyCurrentViewToConfirmMsg", [destABName]);
		let confirmed = Services.prompt.confirm(null, title, msg);
		if (!confirmed) {
			return;
		}

		let currentColumns = cardbookRepository.cardbookPreferences.getDisplayedColumns(this.dirPrefId);
		for (let account of cardbookRepository.cardbookAccounts) {
			if ((account[1] == destAB) || ("allAddressBooks" == destAB)) {
				cardbookRepository.cardbookPreferences.setDisplayedColumns(account[1], currentColumns);
			}
		}
	},

	_onRestoreDefaultColumns() {
		let defaultColumns = cardbookRepository.cardbookPreferences.getDisplayedColumns().split(",");
		defaultColumns = defaultColumns.map(x => x.split(":")[0]);
		for (let column of this.columns) {
			column.hidden = !defaultColumns.includes(column.id);
		}
		this.table.updateColumns(this.columns);
		this.cardsList.invalidate();
		this.table.setColumnsWidths();
	},

	_onColumnResized(event) {
		this.table.setColumnsWidths();
	},

	_onSortChanged(event) {
		const { sortColumn, sortDirection } = this.cardsList.view;
		const column = event.detail.column;
		this.sortRows(column, sortColumn == column && sortDirection == "ascending" ? "descending" : "ascending");
	},

	_onColumnsChanged(data) {
		let column = data.value;
		let checked = data.target.hasAttribute("checked");
		let visibleOrdinal = this.columns.filter(x => x.hidden === false).map(x => x.ordinal);
		let valuesVisibleOrdinal = Object.values(visibleOrdinal);
		let maxVisibleOrdinal = Math.max(...valuesVisibleOrdinal);

		for (let columnDef of this.columns) {
			if (columnDef.id == column) {
				columnDef.hidden = !checked;
				columnDef.ordinal = maxVisibleOrdinal++;
				break;
			}
		}
		this.table.updateColumns(this.columns);
		this.cardsList.invalidate();
		this.table.setColumnsWidths();
	},

	_onReorderColumns(data) {
		this.columns = data.columns;
		this.table.updateColumns(this.columns);
		this.cardsList.invalidate();
		this.table.setColumnsWidths();
	},

	setHeader() {
		this.columns = [];
		let savedColumns = {};
		let ordinal = 0;
		let displayedColumns = cardbookRepository.cardbookPreferences.getDisplayedColumns(this.dirPrefId);
		for (let col of displayedColumns.split(",")) {
			let colName = col.split(":")[0];
			let colWidth = typeof col.split(":")[1] !== 'undefined' ? col.split(":")[1] : 0;
			savedColumns[colName] = {};
			savedColumns[colName].width = colWidth;
			savedColumns[colName].ordinal = ordinal++;
		}
		let allColumns = cardbookRepository.cardbookUtils.getAllAvailableColumns("cardstree");
		for (let column of allColumns) {
			let col = {};
			col.id = column[0];
			col.hidden = typeof savedColumns[col.id] !== 'undefined' ? false : true;
			col.width = typeof savedColumns[col.id] !== 'undefined' ? savedColumns[col.id].width : 0;
			col.ordinal = typeof savedColumns[col.id] !== 'undefined' ? savedColumns[col.id].ordinal : allColumns.length + 1;
			col.label = column[1];
			this.columns.push(col);
		}
		this.columns.sort(function(a, b) {
			return a.ordinal-b.ordinal
		})
		this.table.setColumns(this.columns);
		this.table.restoreColumnsWidths(savedColumns);
	},

	async displayBook() {
		if (document.getElementById('cardbookAccountsTree').selectedRow) {
			let searchAll = false;
			let finishDisplay = true;
			this.dirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
			let id = document.getElementById('cardbookAccountsTree').selectedRow.id;
			let remote = cardbookRepository.cardbookUtils.isMyAccountRemote(cardbookRepository.cardbookPreferences.getType(this.dirPrefId));
			let cached = cardbookRepository.cardbookPreferences.getDBCached(this.dirPrefId);
			if (remote && !cached) {
				let syncing = cardbookRepository.cardbookUtils.isMyAccountSyncing(this.dirPrefId);
				if (cardbookRepository.cardbookDisplayCards[id].cards.length == 0 && !syncing) {
					this.searchInput.value = "";
					cardbookRepository.cardbookPreferences.setLastSearch(this.dirPrefId, "");
				} else {
					this.searchInput.value = cardbookRepository.cardbookPreferences.getLastSearch(this.dirPrefId);
				}
				this.searchInput.placeholder = cardbookRepository.extension.localeData.localizeMessage("searchRemoteLabel");
				this.searchAllInput.classList.remove("oneAB", "allAB");
				finishDisplay = !syncing;
			} else {
				this.searchAllInput.classList.add(cardbookRepository.cardbookPrefs["searchAllAB"]);
				searchAll = this.searchAllInput.classList.contains("allAB");
				let name = cardbookRepository.cardbookPreferences.getName(document.getElementById('cardbookAccountsTree').selectedRow.root);
				if (!searchAll) {
					this.searchInput.placeholder = cardbookRepository.extension.localeData.localizeMessage("searchinAB", [ name ]);
					this.searchAllInput.title = cardbookRepository.extension.localeData.localizeMessage("searchinAllAB");
				} else {
					this.searchInput.placeholder = cardbookRepository.extension.localeData.localizeMessage("searchinAllAB");
					this.searchAllInput.title = cardbookRepository.extension.localeData.localizeMessage("searchinAB", [ name ]);
				}
			}
			this.setHeader();
			let selectedCards = cardbookWindowUtils.getSelectedCards();
			let sortColumn = cardbookRepository.cardbookPreferences.getSortResource(this.dirPrefId);
			let sortDirection = cardbookRepository.cardbookPreferences.getSortDirection(this.dirPrefId);
			this.cardsList.view = new ABView(id, this.searchInput.value, searchAll, sortColumn, sortDirection, finishDisplay);
			this._updatePlaceholder();
			this.sortRows(sortColumn, sortDirection);
			cardbookWindowUtils.setSelectedCards(selectedCards);
			if (cardbookHTMLCardsTree.cardsList.view._rowMap.length == 1) {
				let card = cardbookHTMLCardsTree.cardsList.view._rowMap[0].card;
				await wdw_cardbook.displayCard(card);
			} else if (selectedCards.length == 1) {
				let card = selectedCards[0];
				let selectedCbid = card.cbid;
				let found = false;
				for (let index in cardbookHTMLCardsTree.cardsList.view._rowMap) {
					let cbid = cardbookHTMLCardsTree.cardsList.view._rowMap[index].card.cbid;
					if (cbid == selectedCbid) {
						found = true;
						break;
					}
				}
				if (found) {
					await wdw_cardbook.displayCard(card);
				} else {
					wdw_cardbook.clearCard();
				}
			} else {
				wdw_cardbook.clearCard();
			}
			wdw_cardbook.windowControlShowing();
		}
	},

	sortRows(column, direction) {
		// Uncheck the sort button menu item for the previously sorted column, if
		// there is one, then check the sort button menu item for the column to be
		// sorted.
		this.sortContext.querySelector(`[name="sort"][checked]`)?.removeAttribute("checked");
		this.sortContext.querySelector(`[name="sort"][value="${column} ${direction}"]`)?.setAttribute("checked", "true");

		// Unmark the header of previously sorted column, then mark the header of
		// the column to be sorted.
		this.table.querySelector(".sorting")?.classList.remove("sorting", "ascending", "descending");
		this.table.querySelector(`#${column} button`)?.classList.add("sorting", direction);
		if (this.cardsList.view.sortColumn == column && this.cardsList.view.sortDirection == direction) {
			return;
		}

		this.cardsList.view.sortBy(column, direction);

		cardbookRepository.cardbookPreferences.setSortResource(this.dirPrefId, column);
		cardbookRepository.cardbookPreferences.setSortDirection(this.dirPrefId, direction);
	},

	saveCardsTreeHeight: function () {
		cardbookRepository.cardbookPreferences.setStringPref("cardbookCardsTreeHeight", document.getElementById("rightPaneUpHbox1").getAttribute("height"));
	},

	setCardsTreeHeight: function (aValue) {
		if ("undefined" !== typeof(aValue) && aValue == "null") {
			document.getElementById("rightPaneUpHbox1").style.height = null;
			document.getElementById("rightPaneDownHbox2").style.height = null;
		} else {
			document.getElementById("rightPaneUpHbox1").style.height = cardbookRepository.cardbookPreferences.getStringPref("cardbookCardsTreeHeight")+"px";
		}
	},

	saveCardsTreeWidth: function () {
		cardbookRepository.cardbookPreferences.setStringPref("cardbookCardsTreeWidth", document.getElementById("rightPaneUpHbox1").getAttribute("width"));
	},

	setCardsTreeWidth: function (aValue) {
		if ("undefined" !== typeof(aValue) && aValue == "null") {
			document.getElementById("rightPaneUpHbox1").style.width = null;
			document.getElementById("rightPaneDownHbox2").style.width = null;
		} else {
			document.getElementById("rightPaneUpHbox1").style.width = cardbookRepository.cardbookPreferences.getStringPref("cardbookCardsTreeWidth")+"px";
		}
	},

	_updatePlaceholder() {
		let { searchState } = this.cardsList.view;
		let idsToShow = [];
		switch (searchState) {
			case ABView.SEARCHING:
				idsToShow = ["searchingABPlaceholder"];
				break;
		}
		this.cardsList.updatePlaceholders(idsToShow);
	},

	densityChange() {
		let tableRowClass = customElements.get("ab-table-card-row");
		switch (UIDensity.prefValue) {
			case UIDensity.MODE_COMPACT:
				tableRowClass.ROW_HEIGHT = 18;
				break;
			case UIDensity.MODE_TOUCH:
				tableRowClass.ROW_HEIGHT = 32;
				break;
			default:
				tableRowClass.ROW_HEIGHT = 22;
				break;
		}
		this.cardsList.invalidate();
	},
}
