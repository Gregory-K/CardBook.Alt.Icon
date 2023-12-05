if (!customElements.get("cb-tree-listbox")) {
    class cardbookTreeListbox extends HTMLUListElement {
        // Animation variables for expanding and collapsing child lists.
        ANIMATION_DURATION_MS = 200;
        ANIMATION_EASING = "ease";
        reducedMotionMedia = matchMedia("(prefers-reduced-motion)");

        /**
         * Provides keyboard and mouse interaction to a (possibly nested) list.
         * It is intended for lists with a small number (up to 1000?) of items.
         * Only one item can be selected at a time. Maintenance of the items in the
         * list is not managed here. Styling of the list is not managed here.
         *
         * The following class names apply to list items:
         * - selected: Indicates the currently selected list item.
         * - children: If the list item has descendants.
         * - collapsed: If the list item's descendants are hidden.
         *
         * List items can provide their own twisty element, which will operate when
         * clicked on if given the class name "twisty".
         *
         * This class fires "collapsed", "expanded" and "select" events.
         */
        /**
         * The selected and focused item, or null if there is none.
         *
         * @type {?HTMLLIElement}
         */
        _selectedRow = null;

        connectedCallback() {
            if (this.hasConnected) {
                return;
            }
            this.hasConnected = true;
            this.setAttribute("is", "cb-tree-listbox");
            switch (this.getAttribute("role")) {
                case "tree":
                    this.isTree = true;
                    break;
                case "listbox":
                    this.isTree = false;
                    break;
                default:
                    throw new RangeError(`Unsupported role ${this.getAttribute("role")}`);
            }
            this.tabIndex = 0;
            this.domChanged();
            this._initRows();
            let rows = this.rows;
            if (!this.selectedRow && rows.length) {
                this.selectedRow = rows[0];
            }
            this.addEventListener("click", this);
            this.addEventListener("keydown", this);
            this._mutationObserver.observe(this, {
                subtree: true,
                childList: true,
            });
        }

        handleEvent(event) {
            switch (event.type) {
                case "click":
                    this._onClick(event);
                    break;
                case "keydown":
                    this._onKeyDown(event);
                    break;
            }
        }

        _onClick(event) {
            if (event.button !== 0) {
                return;
            }
            let row = event.target.closest("li:not(.unselectable)");
            if (!row) {
                return;
            }
            if (row.classList.contains("children") && (event.target.closest(".twisty") || event.detail == 2)) {
                if (row.classList.contains("collapsed")) {
                    this.expandRow(row);
                } else {
                    this.collapseRow(row);
                }
                return;
            }
            this.selectedRow = row;
            // if (document.activeElement != this) {
            //     // Overflowing elements with tabindex=-1 steal focus. Grab it back.
            //     this.focus();
            // }
        }

        _onKeyDown(event) {
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
                return;
            }

            switch (event.key) {
                case "ArrowUp":
                    this.selectedIndex = this._clampIndex(this.selectedIndex - 1);
                    break;
                case "ArrowDown":
                    this.selectedIndex = this._clampIndex(this.selectedIndex + 1);
                    break;
                case "Home":
                    this.selectedIndex = 0;
                    break;
                case "End":
                    this.selectedIndex = this.rowCount - 1;
                    break;
                case "PageUp": {
                    if (!this.selectedRow) {
                        break;
                    }
                    // Get the top of the selected row, and remove the page height.
                    let selectedBox = this.selectedRow.getBoundingClientRect();
                    let y = selectedBox.top - this.clientHeight;

                    // Find the last row below there.
                    let rows = this.rows;
                    let i = this.selectedIndex - 1;
                    while (i > 0 && rows[i].getBoundingClientRect().top >= y) {
                        i--;
                    }
                    this.selectedIndex = i;
                    break;
                    }
                case "PageDown": {
                    if (!this.selectedRow) {
                        break;
                    }
                    // Get the top of the selected row, and add the page height.
                    let selectedBox = this.selectedRow.getBoundingClientRect();
                    let y = selectedBox.top + this.clientHeight;
                    // Find the last row below there.
                    let rows = this.rows;
                    let i = rows.length - 1;
                    while (i > this.selectedIndex && rows[i].getBoundingClientRect().top >= y) {
                        i--;
                    }
                    this.selectedIndex = i;
                    break;
                }
                case "ArrowLeft":
                case "ArrowRight": {
                    let selected = this.selectedRow;
                    if (!selected) {
                        break;
                    }
                    let isArrowRight = event.key == "ArrowRight";
                    let isRTL = this.matches(":dir(rtl)");
                    if (isArrowRight == isRTL) {
                        let parent = selected.parentNode.closest(".children:not(.unselectable)");
                        if (parent && (!selected.classList.contains("children") ||
                            selected.classList.contains("collapsed"))) {
                            this.selectedRow = parent;
                            break;
                        }
                        if (selected.classList.contains("children")) {
                            this.collapseRow(selected);
                        }
                    } else if (selected.classList.contains("children")) {
                        if (selected.classList.contains("collapsed")) {
                            this.expandRow(selected);
                        } else {
                            this.selectedRow = selected.querySelector("li");
                        }
                    }
                    break;
                }
                default:
                    return;
            }
            event.preventDefault();
        }

        /**
        * Data for the rows in the DOM.
        *
        * @typedef {object} TreeRowData
        * @property {HTMLLIElement} row - The row item.
        * @property {HTMLLIElement[]} ancestors - The ancestors of the row,
        *   ordered closest to furthest away.
        */

        /**
        * Data for all items beneath this node, including collapsed items,
        * ordered as they are in the DOM.
        *
        * @type {TreeRowData[]}
        */
        _rowsData = [];

        /**
        * Call whenever the tree nodes or ordering changes. This should only be
        * called externally if the mutation observer has been dis-connected and
        * re-connected.
        */
        domChanged() {
            this._rowsData = Array.from(this.querySelectorAll("li"), row => {
                let ancestors = [];
                for (
                    let parentRow = row.parentNode.closest("li");
                    this.contains(parentRow);
                    parentRow = parentRow.parentNode.closest("li")
                    ) {
                    ancestors.push(parentRow);
                }
                return { row, ancestors };
            });
        }

        _mutationObserver = new MutationObserver(mutations => {
            for (let mutation of mutations) {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType != Node.ELEMENT_NODE || !node.matches("li")) {
                        continue;
                    }
                    // No item can already be selected on addition.
                    node.classList.remove("selected");
                }
            }
            let oldRowsData = this._rowsData;
            this.domChanged();
            this._initRows();
            let newRows = this.rows;
            if (!newRows.length) {
                this.selectedRow = null;
                return;
            }
            if (!this.selectedRow) {
                // TODO: This should only really happen on "focus".
                this.selectedRow = newRows[0];
                return;
            }
            if (newRows.includes(this.selectedRow)) {
                // Selected row is still visible.
                return;
            }
            let oldSelectedIndex = oldRowsData.findIndex(entry => entry.row == this.selectedRow);
            if (oldSelectedIndex < 0) {
                // Unexpected, the selectedRow was not in our _rowsData list.
                this.selectedRow = newRows[0];
                return;
            }
            // Find the closest ancestor that is still shown.
            let existingAncestor = oldRowsData[oldSelectedIndex].ancestors.find(row => newRows.includes(row));
            if (existingAncestor) {
                // We search as if the existingAncestor is the full list. This keeps
                // the selection within the ancestor, or moves it to the ancestor if
                // no child is found.
                // NOTE: Includes existingAncestor itself, so should be non-empty.
                newRows = newRows.filter(row => existingAncestor.contains(row));
            }
            // We have lost the selectedRow, so we select a new row.  We want to try
            // and find the element that exists both in the new rows and in the old
            // rows, that directly preceded the previously selected row. We then
            // want to select the next visible row that follows this found element
            // in the new rows.
            // If rows were replaced with new rows, this will select the first of
            // the new rows.
            // If rows were simply removed, this will select the next row that was
            // not removed.
            let beforeIndex = -1;
            for (let i = oldSelectedIndex; i >= 0; i--) {
                beforeIndex = this._rowsData.findIndex(entry => entry.row == oldRowsData[i].row);
                if (beforeIndex >= 0) {
                    break;
                }
            }
            // Start from just after the found item, or 0 if none were found
            // (beforeIndex == -1), find the next visible item. Otherwise we default
            // to selecting the last row.
            let selectRow = newRows[newRows.length - 1];
            for (let i = beforeIndex + 1; i < this._rowsData.length; i++) {
                if (newRows.includes(this._rowsData[i].row)) {
                    selectRow = this._rowsData[i].row;
                    break;
                }
            }
            this.selectedRow = selectRow;
        });

        /**
        * Set the role attribute and classes for all descendants of the widget.
        */
        _initRows() {
            let descendantItems = this.querySelectorAll("li");
            let descendantLists = this.querySelectorAll("ol, ul");
            for (let i = 0; i < descendantItems.length; i++) {
                let row = descendantItems[i];
                row.setAttribute("role", this.isTree ? "treeitem" : "option");
                if (i + 1 < descendantItems.length && row.contains(descendantItems[i + 1])) {
                    row.classList.add("children");
                    if (this.isTree) {
                        row.setAttribute("aria-expanded", !row.classList.contains("collapsed"));
                    }
                } else {
                    row.classList.remove("children");
                    row.classList.remove("collapsed");
                    row.removeAttribute("aria-expanded");
                }
                row.setAttribute("aria-selected", row.classList.contains("selected"));
            }
            if (this.isTree) {
                for (let list of descendantLists) {
                    list.setAttribute("role", "group");
                }
            }
            for (let childList of this.querySelectorAll("li.collapsed > :is(ol, ul)")) {
                childList.style.height = "0";
            }
        }

        /**
        * Every visible row. Rows with collapsed ancestors are not included.
        *
        * @type {HTMLLIElement[]}
        */
        get rows() {
            return [...this.querySelectorAll("li:not(.unselectable)")].filter(row => {
                let collapsed = row.parentNode.closest("li.collapsed");
                if (collapsed && this.contains(collapsed)) {
                    return false;
                }
                return true;
            });
        }

        /**
        * The number of visible rows.
        *
        * @type {integer}
        */
        get rowCount() {
            return this.rows.length;
        }

        /**
        * Clamps `index` to a value between 0 and `rowCount - 1`.
        *
        * @param {integer} index
        * @returns {integer}
        */
        _clampIndex(index) {
            if (index >= this.rowCount) {
                return this.rowCount - 1;
            }
            if (index < 0) {
                return 0;
            }
            return index;
        }

        /**
        * Ensures that the row at `index` is on the screen.
        *
        * @param {integer} index
        */
        scrollToIndex(index) {
            this.getRowAtIndex(index)?.scrollIntoView({ block: "nearest" });
        }

        /**
        * Returns the row element at `index` or null if `index` is out of range.
        *
        * @param {integer} index
        * @returns {HTMLLIElement?}
        */
        getRowAtIndex(index) {
            return this.rows[index];
        }

        /**
        * The index of the selected row. If there are no rows, the value is -1.
        * Otherwise, should always have a value between 0 and `rowCount - 1`.
        * It is set to 0 in `connectedCallback` if there are rows.
        *
        * @type {integer}
        */
        get selectedIndex() {
            return this.rows.findIndex(row => row == this.selectedRow);
        }

        set selectedIndex(index) {
            index = this._clampIndex(index);
            this.selectedRow = this.getRowAtIndex(index);
        }

        /**
        * The selected and focused item, or null if there is none.
        *
        * @type {?HTMLLIElement}
        */
        get selectedRow() {
            return this._selectedRow;
        }

        set selectedRow(row) {
            if (row == this._selectedRow) {
                // this.dispatchEvent(new CustomEvent("select"));
                return;
            }
            if (this._selectedRow) {
                this._selectedRow.classList.remove("selected");
                this._selectedRow.setAttribute("aria-selected", "false");
            }
            this._selectedRow = row ?? null;
            if (row) {
                row.classList.add("selected");
                row.setAttribute("aria-selected", "true");
                this.setAttribute("aria-activedescendant", row.id);
                // better without, pb at startup
                // row.firstElementChild.scrollIntoView();
            } else {
                this.removeAttribute("aria-activedescendant");
            }
            this.dispatchEvent(new CustomEvent("select"));
        }

        /**
        * Collapses the row at `index` if it can be collapsed. If the selected
        * row is a descendant of the collapsing row, selection is moved to the
        * collapsing row.
        *
        * @param {integer} index
        */
        collapseRowAtIndex(index) {
            this.collapseRow(this.getRowAtIndex(index));
        }

        /**
        * Expands the row at `index` if it can be expanded.
        *
        * @param {integer} index
        */
        expandRowAtIndex(index) {
            this.expandRow(this.getRowAtIndex(index));
        }

        /**
        * Collapses the row if it can be collapsed. If the selected row is a
        * descendant of the collapsing row, selection is moved to the collapsing
        * row.
        *
        * @param {HTMLLIElement} row - The row to collapse.
        */
        collapseRow(row) {
            if (row.classList.contains("children") && !row.classList.contains("collapsed")) {
                if (row.contains(this.selectedRow)) {
                    this.selectedRow = row;
                }
                row.classList.add("collapsed");
                if (this.isTree) {
                    row.setAttribute("aria-expanded", "false");
                }
                row.dispatchEvent(new CustomEvent("collapsed", { bubbles: true }));
                this._animateCollapseRow(row);
            }
        }

        /**
        * Expands the row if it can be expanded.
        *
        * @param {HTMLLIElement} row - The row to expand.
        */
        expandRow(row) {
            if (row.classList.contains("children") && row.classList.contains("collapsed")) {
                row.classList.remove("collapsed");
                if (this.isTree) {
                    row.setAttribute("aria-expanded", "true");
                }
                row.dispatchEvent(new CustomEvent("expanded", { bubbles: true }));
                this._animateExpandRow(row);
            }
        }

        /**
        * Animate the collapsing of a row containing child items.
        *
        * @param {HTMLLIElement} row - The parent row element.
        */
        _animateCollapseRow(row) {
            let childList = row.querySelector("ol, ul");
            if (this.reducedMotionMedia.matches) {
                if (childList) {
                    childList.style.height = "0";
                }
                return;
            }
            let childListHeight = childList.scrollHeight;
            let animation = childList.animate([{ height: `${childListHeight}px` }, { height: "0" }],
                                        {duration: this.ANIMATION_DURATION_MS, easing: this.ANIMATION_EASING, fill: "both"});
            animation.onfinish = () => {
                childList.style.height = "0";
                animation.cancel();
            };
        }

        /**
        * Animate the revealing of a row containing child items.
        *
        * @param {HTMLLIElement} row - The parent row element.
        */
        _animateExpandRow(row) {
            let childList = row.querySelector("ol, ul");
            if (this.reducedMotionMedia.matches) {
                if (childList) {
                    childList.style.height = null;
                }
                return;
            }
            let childListHeight = childList.scrollHeight;
            let animation = childList.animate([{ height: "0" }, { height: `${childListHeight}px` }],
                                        {duration: this.ANIMATION_DURATION_MS, easing: this.ANIMATION_EASING, fill: "both"});
            animation.onfinish = () => {
                childList.style.height = null;
                animation.cancel();
            };
        }
    };
    customElements.define("cb-tree-listbox", cardbookTreeListbox, { extends: "ul" });
}

if (!customElements.get("cb-tree-list-row")) {
	class cardbookDirTreeRow extends HTMLLIElement {
        depth;
        nameLabel;
        icon;
        childList;

        constructor() {
            super();
            this.setAttribute("is", "cb-tree-list-row");
            this.append(document.getElementById("cardbookAccountsTemplate").content.cloneNode(true));
            this.nameLabel = this.querySelector(".name");
            this.icon = this.querySelector(".icon");
            this.statusIcon = this.querySelector(".statusIcon");
            this.childList = this.querySelector("ul");
        }

        connectedCallback() {
            let parent = this.parentNode.closest(`li[is="cb-tree-list-row"]`);
            this.depth = parent ? parent.depth + 1 : 1;
            this.childList.style.setProperty("--depth", this.depth);
            this.setAttribute("draggable", "true");
        }

        get id() {
            return this.getAttribute("id");
        }
        
        set id(value) {
            this.setAttribute("id", value);
        }

        get name() {
            return this.nameLabel.textContent;
        }
        
        set name(value) {
            if (this.name != value) {
                this.nameLabel.textContent = value;
            }
        }

        get enabled() {
            return this.getAttribute("enabled");
        }
        
        set enabled(value) {
            this.setAttribute("enabled", value);
        }

        get nodetype() {
            return this.getAttribute("type");
        }
        
        set nodetype(value) {
            this.setAttribute("type", value);
        }

        get root() {
            return this.getAttribute("root");
        }
        
        set root(value) {
            this.setAttribute("root", value);
        }

        get icontype() {
            return this.getAttribute("icontype");
        }
        
        set icontype(value) {
            this.setAttribute("icontype", value);
        }

        get statustype() {
            this.getAttribute("statustype");
        }

        set statustype(value) {
            this.setAttribute("statustype", value);
        }

        set statustypeTitle(value) {
            this.statusIcon.setAttribute("title", value);
        }

        set color(value) {
            this.icon.style.setProperty("--icon-color", value);
        }
	}
    customElements.define("cb-tree-list-row", cardbookDirTreeRow, { extends: "li" });
}

var cardbookHTMLDirTree = {
	COL_NAME: 0,
	COL_ID: 1,
	COL_ENABLED: 2,
	COL_TYPE: 3,
	COL_READONLY: 4,
	COL_ROOT: 5,
    visibleData: [],

    init() {
        this.dirContext = document.getElementById("accountsOrCatsTreeContextMenu");
        this.dirContext.addEventListener("command", this);
        cardbookHTMLDirTree.setAccountsTreeWidth();
    },

    saveAccountsTreeWidth: function () {
        cardbookRepository.cardbookPreferences.setStringPref("cardbookAccountsTreeWidth", document.getElementById("leftPaneVbox1").getAttribute("width"));
    },

    setAccountsTreeWidth: function () {
        document.getElementById("leftPaneVbox1").style.width = cardbookRepository.cardbookPreferences.getStringPref("cardbookAccountsTreeWidth")+"px";
    },

    addListenersForAccounts() {
        let cardbookAccountsTree = document.getElementById('cardbookAccountsTree');
        cardbookAccountsTree.addEventListener("contextmenu", wdw_cardbook.handleAccountsEvents);
        cardbookAccountsTree.addEventListener("collapsed", wdw_cardbook.handleAccountsEvents);
        cardbookAccountsTree.addEventListener("expanded", wdw_cardbook.handleAccountsEvents);
        cardbookAccountsTree.addEventListener("dragstart", wdw_cardbook.handleAccountsEvents);
        cardbookAccountsTree.addEventListener("dragover", wdw_cardbook.handleAccountsEvents);
        cardbookAccountsTree.addEventListener("drop", wdw_cardbook.handleAccountsEvents);
        cardbookAccountsTree.addEventListener("select", wdw_cardbook.handleAccountsEvents);
    },

    removeListenersForAccounts() {
        let cardbookAccountsTree = document.getElementById('cardbookAccountsTree');
        cardbookAccountsTree.removeEventListener("contextmenu", wdw_cardbook.handleAccountsEvents);
        cardbookAccountsTree.removeEventListener("collapsed", wdw_cardbook.handleAccountsEvents);
        cardbookAccountsTree.removeEventListener("expanded", wdw_cardbook.handleAccountsEvents);
        cardbookAccountsTree.removeEventListener("dragstart", wdw_cardbook.handleAccountsEvents);
        cardbookAccountsTree.removeEventListener("dragover", wdw_cardbook.handleAccountsEvents);
        cardbookAccountsTree.removeEventListener("drop", wdw_cardbook.handleAccountsEvents);
        cardbookAccountsTree.removeEventListener("select", wdw_cardbook.handleAccountsEvents);
    },

    setSelectedAccount: function (aAccountId) {
        if (document.getElementById('cardbookAccountsTree').querySelector("li[id=\"" + aAccountId + "\"]")) {
            document.getElementById('cardbookAccountsTree').selectedRow = document.getElementById('cardbookAccountsTree').querySelector("li[id=\"" + aAccountId + "\"]");

        }
    },

    setSyncingIcon: function (aAccountId) {
        if (document.getElementById('cardbookAccountsTree').querySelector("li[id=\"" + aAccountId + "\"]")) {
            document.getElementById('cardbookAccountsTree').querySelector("li[id=\"" + aAccountId + "\"]").statustype = "syncing";
        }
    },

    getAccountsData() {
        cardbookHTMLDirTree.visibleData = [];
		if (document.getElementById('accountsOrCatsTreeMenulist')) {
			var accountsShown = document.getElementById('accountsOrCatsTreeMenulist').value;
		} else {
			var accountsShown = cardbookRepository.cardbookPrefs["accountsShown"];
		}
		let accounts = JSON.parse(JSON.stringify(cardbookRepository.cardbookAccounts));
		switch(accountsShown) {
			case "enabled":
				accounts = accounts.filter(child => child[cardbookHTMLDirTree.COL_ENABLED]);
				break;
			case "disabled":
				accounts = accounts.filter(child => (!child[cardbookHTMLDirTree.COL_ENABLED]));
				break;
			case "local":
				accounts = accounts.filter(child => child[cardbookHTMLDirTree.COL_TYPE] == "LOCALDB" || child[cardbookHTMLDirTree.COL_TYPE] == "FILE" || child[cardbookHTMLDirTree.COL_TYPE] == "DIRECTORY");
				break;
			case "remote":
				accounts = accounts.filter(child => cardbookRepository.cardbookUtils.isMyAccountRemote(child[cardbookHTMLDirTree.COL_TYPE]));
				break;
			case "search":
				accounts = accounts.filter(child => child[cardbookHTMLDirTree.COL_TYPE] == "SEARCH");
				break;
		};
        for (let account of accounts) {
            cardbookHTMLDirTree.visibleData.push(account);
            let accountId = account[cardbookHTMLDirTree.COL_ID];
            if (cardbookRepository.cardbookPreferences.getNode(accountId) != "org") {
                for (let category of cardbookRepository.cardbookAccountsCategories[accountId]) {
                    cardbookHTMLDirTree.visibleData.push([ category, accountId+"::categories::"+category, true, "categories", false, accountId ]);
                }
            } else {
                for (let node of cardbookRepository.cardbookAccountsNodes[accountId]) {
                    cardbookHTMLDirTree.visibleData.push([ node.name, node.id, true, "org", false, accountId ]);
                }
            }
        }
        return cardbookHTMLDirTree.visibleData;
    },

    createRow(node) {
        let row = document.createElementNS("http://www.w3.org/1999/xhtml", `html:li`, { is: "cb-tree-list-row" });
        row.name = node[cardbookHTMLDirTree.COL_NAME];
        row.id = node[cardbookHTMLDirTree.COL_ID];
        row.enabled = node[cardbookHTMLDirTree.COL_ENABLED];
        row.nodetype = node[cardbookHTMLDirTree.COL_TYPE];
        row.icontype = cardbookRepository.getABIconType(node[cardbookHTMLDirTree.COL_TYPE]);
        row.root = node[cardbookHTMLDirTree.COL_ROOT];

        if (cardbookRepository.cardbookPrefs["useColor"] != "nothing") {
            if (row.root == row.id) {
                row.color = cardbookRepository.cardbookPreferences.getColor(node[cardbookHTMLDirTree.COL_ROOT]);
            } else {
                if (cardbookRepository.cardbookNodeColors[row.name]) {
                    row.color = cardbookRepository.cardbookNodeColors[row.name];
                }
            }
        }
        if (row.nodetype != "categories" && row.nodetype != "org" && row.enabled === "true") {
            let statustype = cardbookRepository.getABStatusType(node[cardbookHTMLDirTree.COL_ROOT]);
            row.statustype = statustype;
            switch (statustype) {
                case "syncing":
                case "readonly":
                    row.statustypeTitle = cardbookRepository.extension.localeData.localizeMessage(`${statustype}Label`);
                    break;
                case "syncfailed":
                    let lastsync = cardbookRepository.cardbookPreferences.getLastSync(node[cardbookHTMLDirTree.COL_ROOT]);
                    if (lastsync) {
                        let date = cardbookRepository.cardbookDates.getCorrectDatetime(lastsync);
                        let lastsyncFormatted = cardbookRepository.cardbookDates.getFormattedDateTimeForDateTimeString(date, "2");
                        row.statustypeTitle = cardbookRepository.extension.localeData.localizeMessage("syncFailedLastSync", [ lastsyncFormatted ]);
                    } else {
                        row.statustypeTitle = cardbookRepository.extension.localeData.localizeMessage("syncFailedNeverSynced");
                    }
                    break;
                }
        }

        if (row.nodetype == "categories") {
            document.querySelector("li[id=\"" + row.root + "\"]").querySelector("ul").appendChild(row);
        } else if (row.nodetype == "org") {
            let tempArray = row.id.split("::");
            if (tempArray.length == 3) {
                document.querySelector("li[id=\"" + row.root + "\"]").querySelector("ul").appendChild(row);
            } else {
                tempArray.pop();
                let parent = tempArray.join("::");
                document.querySelector("li[id=\"" + parent + "\"]").querySelector("ul").appendChild(row);
            }
        } else if (row.root == row.id) {
            document.getElementById("cardbookAccountsTree").querySelector("ul").appendChild(row);
        }

        if (cardbookRepository.cardbookPreferences.getExpanded(node[cardbookHTMLDirTree.COL_ID])) {
            row.classList.remove("collapsed");
        } else {
            row.classList.add("collapsed");
        }

        return row;
    },
}
