/**
 * The main <table> element containing the thead and the TreeViewTableBody
 * tbody. This class is used to expose all those methods and custom events
 * needed at the implementation level.
 */
class CBTreeViewTable extends HTMLTableElement {
	/**
	 * The array of objects containing the data to generate the needed columns.
	 * Keep this public so child elements can access it if needed.
	 * @type {Array}
	 */
	columns;
  
	/**
	 * The header row for the table.
	 *
	 * @type {TreeViewTableHeader}
	 */
	header;
  
	/**
	 * Array containing the IDs of templates holding menu items to dynamically add
	 * to the menupopup of the column picker.
	 * @type {Array}
	 */
	popupMenuTemplates = [];
  
	connectedCallback() {
	  if (this.hasConnected) {
		return;
	  }
	  this.hasConnected = true;
  
	  this.setAttribute("is", "cb-tree-view-table");
	  this.classList.add("tree-table");
  
	  // Use a fragment to append child elements to later add them all at once
	  // to the DOM. Performance is important.
	  const fragment = new DocumentFragment();
  
	  this.header = document.createElement("thead", {
		is: "cb-tree-view-table-header",
	  });
	  fragment.append(this.header);
  
	  this.spacerTop = document.createElement("tbody", {
		is: "cb-tree-view-table-spacer",
	  });
	  fragment.append(this.spacerTop);
  
	  this.body = document.createElement("tbody", {
		is: "cb-tree-view-table-body",
	  });
	  fragment.append(this.body);
  
	  this.spacerBottom = document.createElement("tbody", {
		is: "cb-tree-view-table-spacer",
	  });
	  fragment.append(this.spacerBottom);
  
	  this.append(fragment);
	}
  
	/**
	 * If set to TRUE before generating the columns, the table will
	 * automatically create a column picker in the table header.
	 *
	 * @type {boolean}
	 */
	set editable(val) {
	  this.dataset.editable = val;
	}
  
	get editable() {
	  return this.dataset.editable === "true";
	}
  
	/**
	 * Set the id attribute of the TreeViewTableBody for selection and styling
	 * purpose.
	 *
	 * @param {string} id - The string ID to set.
	 */
	setBodyID(id) {
	  this.body.id = id;
	}
  
	setPopupMenuTemplates(array) {
	  this.popupMenuTemplates = array;
	}
  
	/**
	 * Set the columns array of the table. This should only be used during
	 * initialization and any following change to the columns visibility should
	 * be handled via the updateColumns() method.
	 *
	 * @param {Array} columns - The array of columns to generate.
	 */
	setColumns(columns) {
	  this.columns = columns;
	  this.header.setColumns();
	  this.#updateView();
	}
  
	/**
	 * Update the currently visible columns.
	 *
	 * @param {Array} columns - The array of columns to update. It should match
	 * the original array set via the setColumn() method since this method will
	 * only update the column visibility without generating new elements.
	 */
	updateColumns(columns) {
	  this.columns = columns;
	  this.#updateView();
	}
  
	/**
	 * Store the newly resized column values in the xul store.
	 *
	 * @param {string} url - The document URL used to store the values.
	 * @param {DOMEvent} event - The dom event bubbling from the resized action.
	 */
	setColumnsWidths() {
		let dirPrefId = document.getElementById('cardbookAccountsTree').selectedRow.root;
		let columnsToSave = [];
		for (let col of this.columns.filter(c => !c.hidden)) {
		  let width = document.querySelector(`#${col.id}`)?.style.getPropertyValue(`--${col.id}Splitter-width`);
		  if (width) {
			columnsToSave.push(col.id + ":" + width.replace("px", ""));
		  } else if (col.width) {
			columnsToSave.push(col.id + ":" + col.width.replace("px", ""));
		  } else {
			columnsToSave.push(col.id);
		  }
		}
		cardbookRepository.cardbookPreferences.setDisplayedColumns(dirPrefId, columnsToSave.join(","));
	}
  
	/**
	 * Restore the previously saved widths of the various columns if we have
	 * any.
	 *
	 * @param {string} url - The document URL used to store the values.
	 */
	restoreColumnsWidths(savedColumns) {
	  for (let column in savedColumns) {
		if (savedColumns[column].width != 0) {
		  let width = savedColumns[column].width;
		  this.querySelector(`#${column}`)?.style.setProperty(
			`--${column}Splitter-width`,
			`${width}px`
		  );
		}
	  }
	}
  
	/**
	 * Update the visibility of the currently available columns.
	 */
	#updateView() {
	  let lastResizableColumn = this.columns.findLast(
		c => !c.hidden && (c.resizable ?? true)
	  );
  
	  for (let column of this.columns) {
		document.getElementById(column.id).hidden = column.hidden;
  
		// No need to update the splitter visibility if the column is
		// specifically not resizable.
		if (column.resizable === false) {
		  continue;
		}
  
		document.getElementById(column.id).resizable =
		  column != lastResizableColumn;
	  }
	}
  }
  customElements.define("cb-tree-view-table", CBTreeViewTable, { extends: "table" });
  