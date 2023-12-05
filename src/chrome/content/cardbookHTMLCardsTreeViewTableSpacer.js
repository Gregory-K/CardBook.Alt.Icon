/**
 * Simple tbody spacer used above and below the main tbody for space
 * allocation and ensuring the correct scrollable height.
 */
class CBTreeViewTableSpacer extends HTMLTableSectionElement {
	connectedCallback() {
		if (this.hasConnected) {
			return;
		}
		this.hasConnected = true;

		this.cell = document.createElement("td");
		const row = document.createElement("tr");
		row.appendChild(this.cell);
		this.appendChild(row);
	}

	/**
	 * Set the cell colspan to reflect the number of visible columns in order
	 * to generate a correct HTML markup.
	 *
	 * @param {int} count - The columns count.
	 */
	setColspan(count) {
		this.cell.setAttribute("colspan", count);
	}

	/**
	 * Set the height of the cell in order to occupy the empty area that will
	 * be filled by new rows on demand when needed.
	 *
	 * @param {int} val - The pixel height the row should occupy.
	 */
	setHeight(val) {
		this.cell.style.height = `${val}px`;
	}
}
customElements.define("cb-tree-view-table-spacer", CBTreeViewTableSpacer, {
	extends: "tbody",
});
