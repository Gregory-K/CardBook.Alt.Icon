/**
 * Base class for rows in a TreeViewTableBody. Rows have a fixed height and
 * their position on screen is managed by the owning list.
 *
 * Sub-classes should override ROW_HEIGHT, styles, and fragment to suit the
 * intended layout. The index getter/setter should be overridden to fill the
 * layout with values.
 */
class CBTreeViewTableRow extends HTMLTableRowElement {
	/**
	 * Fixed height of this row. Rows in the list will be spaced this far
	 * apart. This value must not change at runtime.
	 *
	 * @type {integer}
	 */
	static ROW_HEIGHT = 50;

	connectedCallback() {
		if (this.hasConnected) {
			return;
		}
		this.hasConnected = true;

		this.tabIndex = -1;
		this.list = this.closest("tree-view");
		this.view = this.list.view;
		this.setAttribute("aria-selected", !!this.selected);
	}

	/**
	 * The 0-based position of this row in the list. Override this setter to
	 * fill layout based on values from the list's view. Always call back to
	 * this class's getter/setter when inheriting.
	 *
	 * @type {integer}
	 */
	get index() {
		return this._index;
	}

	set index(index) {
		this.setAttribute("role",
				this.list.table.body.getAttribute("role") === "tree" ? "treeitem": "option");
		this.setAttribute("aria-posinset", index + 1);
		this.id = `${this.list.id}-row${index}`;

		const isGroup = this.view.isContainer(index);
		this.classList.toggle("children", isGroup);

		const isGroupOpen = this.view.isContainerOpen(index);
		if (isGroup) {
			this.setAttribute("aria-expanded", isGroupOpen);
		} else {
			this.removeAttribute("aria-expanded");
		}
		this.classList.toggle("collapsed", !isGroupOpen);
		this._index = index;

		let table = this.closest("table");
		for (let column of table.columns) {
			let cell = this.querySelector(`.${column.id.toLowerCase()}-column`);
			// No need to do anything if this cell doesn't exist. This can happen
			// for non-table layouts.
			if (!cell) {
				continue;
			}

			// Always clear the colspan when updating the columns.
			cell.removeAttribute("colspan");

			// No need to do anything if this column is hidden.
			if (cell.hidden) {
				continue;
			}

			/*
			// Handle the special case for the selectable checkbox column.
			if (column.select) {
				let img = cell.firstElementChild;
				if (!img) {
					cell.classList.add("tree-view-row-select");
					img = document.createElement("img");
					img.src = "";
					img.tabIndex = -1;
					img.classList.add("tree-view-row-select-checkbox");
					cell.replaceChildren(img);
				}
				document.l10n.setAttributes(img,
					this.list._selection.isSelected(index) ? "tree-list-view-row-deselect" : "tree-list-view-row-select");
				continue;
			}
			*/

			// No need to do anything if an earlier call to this function already
			// added the cell contents.
			if (cell.firstElementChild) {
				continue;
			}
		}

		// Account for the column picker in the last visible column if the table
		// if editable.
		if (table.editable) {
			let last = table.columns.filter(c => !c.hidden).pop();
			this.querySelector(`.${last.id.toLowerCase()}-column`)?.setAttribute("colspan", "2");
		}
	}

	/**
	 * Tracks the selection state of the current row.
	 *
	 * @type {boolean}
	 */
	get selected() {
		return this.classList.contains("selected");
	}

	set selected(selected) {
		this.setAttribute("aria-selected", !!selected);
		this.classList.toggle("selected", !!selected);
	}
}
customElements.define("cb-tree-view-table-row", CBTreeViewTableRow, {
	extends: "tr",
});

customElements.whenDefined("cb-tree-view-table-row").then(() => {
	/**
	* A row in the table list of cards.
	*
	* @augments {TreeViewTableRow}
	*/
	class CBTableCardRow extends customElements.get("cb-tree-view-table-row") {
		static ROW_HEIGHT = 22;

		connectedCallback() {
			if (this.hasConnected) {
				return;
			}

			super.connectedCallback();

			this.setAttribute("draggable", "true");

			for (let column of cardbookHTMLCardsTree.columns) {
				this.appendChild(document.createElement("td")).classList.add(`${column.id.toLowerCase()}-column`);
			}
		}

		get index() {
			return super.index;
		}

		/**
		* Override the row setter to generate the layout.
		*
		* @note This element could be recycled, make sure you set or clear all
		* properties.
		*/
		set index(index) {
			super.index = index;

			let card = this.view.getCardFromRow(index);
			this.classList.toggle("MailList", card.isAList);
			this.classList.toggle("Changed", card.updated || card.created);
			if (document.getElementById("searchAllAB").classList.contains("allAB") || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
				let colorStyle = "color_" + card.dirPrefId;
				if (card.categories.length > 0) {
					for (let category in cardbookRepository.cardbookNodeColors) {
						if (card.categories.includes(category)) {
							colorStyle = "color_category_" + cardbookRepository.cardbookUtils.formatCategoryForCss(category);
							break;
						}
					}
				} else {
					if (cardbookRepository.cardbookNodeColors[cardbookRepository.cardbookPrefs["uncategorizedCards"]]) {
						colorStyle = "color_category_" + cardbookRepository.cardbookUtils.formatCategoryForCss(cardbookRepository.cardbookPrefs["uncategorizedCards"]);
					} else {
						colorStyle = "color_" + card.dirPrefId;
					}
				}
				this.classList.add(colorStyle);
			}

			for (let column of cardbookHTMLCardsTree.columns) {
				let cell = this.querySelector(`.${column.id.toLowerCase()}-column`);
				if (!column.hidden) {
					cell.textContent = this.view.getCellText(index, { id: column.id });
					continue;
				}
				cell.hidden = true;
			}

			this.setAttribute("aria-label", this.firstElementChild.textContent);
		}
	}
	customElements.define("ab-table-card-row", CBTableCardRow, {
		extends: "tr",
	});
});

