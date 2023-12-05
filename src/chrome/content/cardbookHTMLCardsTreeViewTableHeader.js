const ANIMATION_DURATION_MS = 200;
const reducedMotionMedia = matchMedia("(prefers-reduced-motion)");

/**
 * Class used to generate the thead of the TreeViewTable. This class will take
 * care of handling columns sizing and sorting order, with bubbling events to
 * allow listening for those changes on the implementation level.
 */
class CBTreeViewTableHeader extends HTMLTableSectionElement {
	/**
	 * An array of all table header cells that can be reordered.
	 *
	 * @returns {HTMLTableCellElement[]}
	 */
	get #orderableChildren() {
		return [...this.querySelectorAll("th[draggable]:not([hidden])")];
	}

	/**
	 * Used to simulate a change in the order. The element remains in the same
	 * DOM position.
	 *
	 * @param {HTMLTableRowElement} element - The row to animate.
	 * @param {number} to - The new Y position of the element after animation.
	 */
	static _transitionTranslation(element, to) {
		if (!reducedMotionMedia.matches) {
			element.style.transition = `transform ${ANIMATION_DURATION_MS}ms ease`;
		}
		element.style.transform = to ? `translateX(${to}px)` : null;
	}

	connectedCallback() {
		if (this.hasConnected) {
			return;
		}
		this.hasConnected = true;

		this.setAttribute("is", "cb-tree-view-table-header");
		this.classList.add("tree-table-header");
		this.row = document.createElement("tr");
		this.appendChild(this.row);

		this.addEventListener("keypress", this);
		this.addEventListener("dragstart", this);
		this.addEventListener("dragover", this);
		this.addEventListener("dragend", this);
		this.addEventListener("drop", this);
	}

	handleEvent(event) {
		switch (event.type) {
			case "keypress":
				this.#onKeyPress(event);
				break;
			case "dragstart":
				this.#onDragStart(event);
				break;
			case "dragover":
				this.#onDragOver(event);
				break;
			case "dragend":
				this.#onDragEnd();
				break;
			case "drop":
				this.#onDrop(event);
				break;
		}
	}

	#onKeyPress(event) {
		if (!event.altKey || !["ArrowRight", "ArrowLeft"].includes(event.key)) {
			this.triggerTableHeaderRovingTab(event);
			return;
		}

		let column = event.target.closest(`th[is="cb-tree-view-table-header-cell"]`);
		if (!column) {
			return;
		}

		let visibleColumns = this.parentNode.columns.filter(c => !c.hidden);
		let forward = event.key == (document.dir === "rtl" ? "ArrowLeft" : "ArrowRight");

		// Bail out if the user is trying to shift backward the first column, or
		// shift forward the last column.
		if ((!forward && visibleColumns.at(0)?.id == column.id) ||
			(forward && visibleColumns.at(-1)?.id == column.id)) {
			return;
		}

		event.preventDefault();
		this.dispatchEvent(new CustomEvent("shift-column", { bubbles: true, detail: { column: column.id, forward}}));
	}

	#onDragStart(event) {
		if (!event.target.closest("th[draggable]")) {
			// This shouldn't be necessary, but is?!
			event.preventDefault();
			return;
		}

		const orderable = this.#orderableChildren;
		if (orderable.length < 2) {
			return;
		}

		const headerCell = orderable.find(th => th.contains(event.target));
		const rect = headerCell.getBoundingClientRect();

		this._dragInfo = {
			cell: headerCell,
			// How far can we move `headerCell` horizontally.
			min: orderable.at(0).getBoundingClientRect().left - rect.left,
			max: orderable.at(-1).getBoundingClientRect().right - rect.right,
			// Where is the drag event starting.
			startX: event.clientX,
			offsetX: event.clientX - rect.left};

		headerCell.classList.add("column-dragging");
		// Prevent `headerCell` being used as the drag image. We don't
		// really want any drag image, but there's no way to not have one.
		event.dataTransfer.setDragImage(document.createElement("img"), 0, 0);
	}

	#onDragOver(event) {
		if (!this._dragInfo) {
			return;
		}

		const { cell, min, max, startX, offsetX } = this._dragInfo;
		// Move `cell` with the mouse pointer.
		let dragX = Math.min(max, Math.max(min, event.clientX - startX));
		cell.style.transform = `translateX(${dragX}px)`;

		let thisRect = this.getBoundingClientRect();

		// How much space is there before the `cell`? We'll see how many cells fit
		// in the space and put the `cell` in after them.
		let spaceBefore = Math.max(0, event.clientX + this.scrollLeft - offsetX - thisRect.left);
		// The width of all cells seen in the loop so far.
		let totalWidth = 0;
		// If we've looped past the cell being dragged.
		let afterDraggedTh = false;
		// The cell before where a drop would take place. If null, drop would
		// happen at the start of the table header.
		let header = null;

		for (let headerCell of this.#orderableChildren) {
			if (headerCell == cell) {
				afterDraggedTh = true;
				continue;
			}

			let rect = headerCell.getBoundingClientRect();
			let enoughSpace = spaceBefore > totalWidth + rect.width / 2;

			let multiplier = 0;
			if (enoughSpace) {
				if (afterDraggedTh) {
					multiplier = -1;
				}
				header = headerCell;
			} else if (!afterDraggedTh) {
				multiplier = 1;
			}
			CBTreeViewTableHeader._transitionTranslation(headerCell, multiplier * cell.clientWidth);

			totalWidth += rect.width;
		}

		this._dragInfo.dropTarget = header;

		event.preventDefault();
	}

	#onDragEnd() {
		if (!this._dragInfo) {
			return;
		}

		this._dragInfo.cell.classList.remove("column-dragging");
		delete this._dragInfo;

		for (let headerCell of this.#orderableChildren) {
			headerCell.style.transform = null;
			headerCell.style.transition = null;
		}
	}

	#onDrop(event) {
		if (!this._dragInfo) {
			return;
		}

		let { cell, startX, dropTarget } = this._dragInfo;

		let newColumns = this.parentNode.columns.map(column => ({ ...column }));

		const draggedColumn = newColumns.find(c => c.id == cell.id);
		const initialPosition = newColumns.indexOf(draggedColumn);

		let targetCell;
		let newPosition;
		if (!dropTarget) {
			// Get the first visible cell.
			targetCell = this.querySelector("th:not([hidden])");
			newPosition = newColumns.indexOf(newColumns.find(c => c.id == targetCell.id));
		} else {
			// Get the next non hidden sibling.
			targetCell = dropTarget.nextElementSibling;
			while (targetCell.hidden) {
				targetCell = targetCell.nextElementSibling;
			}
			newPosition = newColumns.indexOf(newColumns.find(c => c.id == targetCell.id));
		}

		// Reduce the new position index if we're moving forward in order to get the
		// accurate index position of the column we're taking the position of.
		if (event.clientX > startX) {
			newPosition -= 1;
		}

		newColumns.splice(newPosition, 0, newColumns.splice(initialPosition, 1)[0]);

		// Update the ordinal of the columns to reflect the new positions.
		newColumns.forEach((column, index) => {column.ordinal = index;});

		this.querySelector("tr").insertBefore(cell, targetCell);

		this.dispatchEvent(new CustomEvent("reorder-columns", {bubbles: true, detail: { columns: newColumns}}));
		event.preventDefault();
	}

	/**
	 * Create all the table header cells based on the currently set columns.
	 */
	setColumns() {
		this.row.replaceChildren();

		for (let column of this.parentNode.columns) {
			/** @type {TreeViewTableHeaderCell} */
			let cell = document.createElement("th", {is: "cb-tree-view-table-header-cell"});
			this.row.appendChild(cell);
			cell.setColumn(column);
		}

		// Create a column picker if the table is editable.
		if (this.parentNode.editable) {
			const picker = document.createElement("th", {is: "cb-tree-view-table-column-picker"});
			this.row.appendChild(picker);
		}

		this.updateRovingTab();
	}

	/**
	 * Get all currently visible columns of the table header.
	 *
	 * @returns {Array} An array of buttons.
	 */
	get headerColumns() {
		return this.row.querySelectorAll(`th:not([hidden]) button`);
	}

	/**
	 * Update the `tabindex` attribute of the currently visible columns.
	 */
	updateRovingTab() {
		for (let button of this.headerColumns) {
			button.tabIndex = -1;
		}
		// Allow focus on the first available button.
		this.headerColumns[0].tabIndex = 0;
	}

	/**
	 * Handles the keypress event on the table header.
	 *
	 * @param {Event} event - The keypress DOMEvent.
	 */
	triggerTableHeaderRovingTab(event) {
		if (!["ArrowRight", "ArrowLeft"].includes(event.key)) {
			return;
		}

		const headerColumns = [...this.headerColumns];
		let focusableButton = headerColumns.find(b => b.tabIndex != -1);
		let elementIndex = headerColumns.indexOf(focusableButton);

		// Find the adjacent focusable element based on the pressed key.
		let isRTL = document.dir == "rtl";
		if ((isRTL && event.key == "ArrowLeft") || (!isRTL && event.key == "ArrowRight")) {
			elementIndex++;
			if (elementIndex > headerColumns.length - 1) {
				elementIndex = 0;
			}
		} else if ((!isRTL && event.key == "ArrowLeft") || (isRTL && event.key == "ArrowRight")) {
			elementIndex--;
			if (elementIndex == -1) {
				elementIndex = headerColumns.length - 1;
			}
		}

		// Move the focus to a new column and update the tabindex attribute.
		let newFocusableButton = headerColumns[elementIndex];
		if (newFocusableButton) {
			focusableButton.tabIndex = -1;
			newFocusableButton.tabIndex = 0;
			newFocusableButton.focus();
		}
	}
}
customElements.define("cb-tree-view-table-header", CBTreeViewTableHeader, {
	extends: "thead",
});
