/**
 * Class used to generate a column picker used for the TreeViewTableHeader in
 * case the visibility of the columns of a table can be changed.
 *
 * Include treeView.ftl for strings.
 */
class CBTreeViewTableColumnPicker extends HTMLTableCellElement {
	/**
	 * The clickable button triggering the picker context menu.
	 * @type {HTMLButtonElement}
	 */
	#button;

	/**
	 * The menupopup allowing users to show and hide columns.
	 * @type {XULElement}
	 */
	#context;

	connectedCallback() {
		if (this.hasConnected) {
			return;
		}
		this.hasConnected = true;

		this.setAttribute("is", "cb-tree-view-table-column-picker");
		this.classList.add("tree-table-cell-container");

		this.#button = document.createElement("button");
		this.#button.title = cardbookRepository.extension.localeData.localizeMessage("columnPickerTitle");
		this.#button.classList.add("button-flat", "button-column-picker");
		this.appendChild(this.#button);

		const img = document.createElement("img");
		img.src = "";
		img.alt = "";
		this.#button.appendChild(img);

		this.#context = document.createXULElement("menupopup");
		this.#context.id = "columnPickerMenuPopup";
		this.#context.setAttribute("position", "bottomleft topleft");
		this.appendChild(this.#context);
		this.#context.addEventListener("popupshowing", event => {
			// Bail out if we're opening a submenu.
			if (event.target.id != this.#context.id) {
				return;
			}

			while (this.#context.hasChildNodes()) {
					this.#context.lastChild.remove();
			}
			this.#initPopup();

			let columns = this.closest("table").columns;
			for (let column of columns) {
				let item = this.#context.querySelector(`[value="${column.id}"]`);
				if (!item) {
					continue;
				}

				if (!column.hidden) {
					item.setAttribute("checked", "true");
					continue;
				}

				item.removeAttribute("checked");
			}

			let applyToABMenupopup = this.#context.querySelector(".applyToABMenupopup");
			let applyToABMenulist = this.#context.querySelector(".applyToABMenu");
			cardbookElementTools.loadAddressBooks(applyToABMenupopup, applyToABMenulist, "", true, true, true, true, true);
		});

		this.#button.addEventListener("click", event => {
			this.#context.openPopup(event.target, { triggerEvent: event });
		});
	}

	/**
	 * Add all toggable columns to the context menu popup of the picker button.
	 */
	#initPopup() {
		let table = this.closest("table");
		let columns = table.columns;
		columns.sort(function(a, b){ return a.label.localeCompare(b.label) })
		columns.sort(function(a, b){ return a.ordinal-b.ordinal })
		let items = new DocumentFragment();
		for (let column of columns) {
			// Skip those columns we don't want to allow hiding.
			if (column.picker === false) {
				continue;
			}

			let menuitem = document.createXULElement("menuitem");
			items.append(menuitem);
			menuitem.setAttribute("type", "checkbox");
			menuitem.setAttribute("name", "toggle");
			menuitem.setAttribute("value", column.id);
			menuitem.setAttribute("label", column.label);
			menuitem.setAttribute("closemenu", "none");

			menuitem.addEventListener("command", () => {
				this.dispatchEvent(new CustomEvent("columns-changed", {bubbles: true, detail: {target: menuitem,value: column.id}}));
			});
		}

		items.append(document.createXULElement("menuseparator"));
		let restoreItem = document.createXULElement("menuitem");
		restoreItem.id = "restoreColumnOrder";
		restoreItem.label = cardbookRepository.extension.localeData.localizeMessage("columnPickerRestoreColumnOrder");
		restoreItem.addEventListener("command", () => {
			this.dispatchEvent(new CustomEvent("restore-columns", {bubbles: true}));
		});
		items.append(restoreItem);

		for (const templateID of table.popupMenuTemplates) {
			items.append(document.getElementById(templateID).content.cloneNode(true));
		}

		this.#context.replaceChildren(items);
	}
}
customElements.define("cb-tree-view-table-column-picker", CBTreeViewTableColumnPicker,{ extends: "th" });
