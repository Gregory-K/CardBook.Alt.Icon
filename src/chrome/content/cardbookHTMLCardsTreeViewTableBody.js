/**
 * A more powerful list designed to be used with a view (nsITreeView or
 * whatever replaces it in time) and be scalable to a very large number of
 * items if necessary. Multiple selections are possible and changes in the
 * connected view are cause updates to the list (provided `rowCountChanged`/
 * `invalidate` are called as appropriate).
 *
 * Rows are provided by a custom element that inherits from
 * TreeViewTableRow below. Set the name of the custom element as the "rows"
 * attribute.
 *
 * Include tree-listbox.css for appropriate styling.
 */
class TreeViewTableBody extends HTMLTableSectionElement {
	connectedCallback() {
		if (this.hasConnected) {
			return;
		}
		this.hasConnected = true;

		this.tabIndex = 0;
		this.setAttribute("is", "cb-tree-view-table-body");
		this.setAttribute("role", "tree");
		this.setAttribute("aria-multiselectable", "true");

		let treeView = this.closest("tree-view");
		this.addEventListener("keyup", treeView);
		this.addEventListener("click", treeView);
		this.addEventListener("keydown", treeView);

		if (treeView.dataset.labelId) {
			this.setAttribute("aria-labelledby", treeView.dataset.labelId);
		}
	}
}
customElements.define("cb-tree-view-table-body", TreeViewTableBody, {
	extends: "tbody",
});

