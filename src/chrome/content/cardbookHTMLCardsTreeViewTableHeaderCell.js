/**
 * Class to generated the TH elements for the TreeViewTableHeader.
 */
class CBTreeViewTableHeaderCell extends HTMLTableCellElement {
	/**
	 * The div needed to handle the header button in an absolute position.
	 * @type {HTMLElement}
	 */
	#container;

	/**
	 * The clickable button to change the sorting of the table.
	 * @type {HTMLButtonElement}
	 */
	#button;

	/**
	 * If this cell is resizable.
	 * @type {boolean}
	 */
	#resizable = true;

	/**
	 * If this cell can be clicked to affect the sorting order of the tree.
	 * @type {boolean}
	 */
	#sortable = true;

	connectedCallback() {
		if (this.hasConnected) {
			return;
		}
		this.hasConnected = true;

		this.setAttribute("is", "cb-tree-view-table-header-cell");
		this.draggable = true;

		this.#container = document.createElement("div");
		this.#container.classList.add("tree-table-cell", "tree-table-cell-container");

		this.#button = document.createElement("button");
		this.#container.appendChild(this.#button);
		this.appendChild(this.#container);
	}

	/**
	 * Set the proper data to the newly generated table header cell and create
	 * the needed child elements.
	 *
	 * @param {object} column - The column object with all the data to generate
	 *   the correct header cell.
	 */
	setColumn(column) {
		// Set a public ID so parent elements can loop through the available
		// columns after they're created.
		this.id = column.id;
		this.#button.id = `${column.id}Button`;

		// Add custom classes if needed.
		if (column.classes) {
			this.#button.classList.add(...column.classes);
		}

		this.#button.textContent = column.label;
		this.#button.title = cardbookRepository.extension.localeData.localizeMessage("columnsSortBy", [column.label]);

		// Add an image if this is a table header that needs to display an icon,
		// and set the column as icon.
		if (column.icon) {
			this.dataset.type = "icon";
			const img = document.createElement("img");
			img.src = "";
			img.alt = "";
			this.#button.appendChild(img);
		}

		this.resizable = column.resizable ?? true;

		this.hidden = column.hidden;

		this.#sortable = column.sortable ?? true;
		// Make the button clickable if the column can trigger a sorting of rows.
		if (this.#sortable) {
			this.#button.addEventListener("click", () => {
				this.dispatchEvent(new CustomEvent("sort-changed", {bubbles: true, detail: {column: column.id}}));
			});
		}

		this.#button.addEventListener("contextmenu", event => {
			event.stopPropagation();
			const table = this.closest("table");
			if (table.editable) {
				table.querySelector("#columnPickerMenuPopup").openPopup(event.target, { triggerEvent: event });
			}
		});

		// This is the column handling the thread toggling.
		if (column.thread) {
			this.#button.classList.add("tree-view-header-thread");
			this.#button.addEventListener("click", () => {
				this.dispatchEvent(new CustomEvent("thread-changed", {bubbles: true}));
			});
		}

		// This is the column handling bulk selection.
		if (column.select) {
			this.#button.classList.add("tree-view-header-select");
			this.#button.addEventListener("click", () => {this.closest("tree-view").toggleSelectAll();});
		}

		// This is the column handling delete actions.
		if (column.delete) {
			this.#button.classList.add("tree-view-header-delete");
		}
	}

	/**
	 * Set this table header as responsible for the sorting of rows.
	 *
	 * @param {string["ascending"|"descending"]} direction - The new sorting
	 *   direction.
	 */
	setSorting(direction) {
		this.#button.classList.add("sorting", direction);
	}

	/**
	 * If this current column can be resized.
	 *
	 * @type {boolean}
	 */
	set resizable(val) {
		this.#resizable = val;
		this.dataset.resizable = val;

		let splitter = this.querySelector("hr");
		// Add a splitter if we don't have one already.
		if (!splitter) {
			splitter = document.createElement("hr", { is: "cb-pane-splitter" });
			splitter.setAttribute("is", "cb-pane-splitter");
			this.appendChild(splitter);
			splitter.resizeDirection = "horizontal";
			splitter.resizeElement = this;
			splitter.id = `${this.id}Splitter`;
			// Emit a custom event after a resize action. Methods at implementation
			// level should listen to this event if the edited column size needs to
			// be stored or used.
			splitter.addEventListener("splitter-resized", () => {
				this.dispatchEvent(new CustomEvent("column-resized", {bubbles: true, detail: {splitter, column: this.id}}));
			});
		}

		this.style.setProperty("width", val ? `var(--${splitter.id}-width)` : null);
		// Disable the splitter if this is not a resizable column.
		splitter.isDisabled = !val;
	}

	get resizable() {
		return this.#resizable;
	}

	/**
	 * If the current column can trigger a sorting of rows.
	 *
	 * @type {boolean}
	 */
	set sortable(val) {
		this.#sortable = val;
		this.#button.disabled = !val;
	}

	get sortable() {
		return this.#sortable;
	}
}
customElements.define("cb-tree-view-table-header-cell", CBTreeViewTableHeaderCell, {
	extends: "th",
});
