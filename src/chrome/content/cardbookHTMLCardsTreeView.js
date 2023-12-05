var { AppConstants } = ChromeUtils.importESModule("resource://gre/modules/AppConstants.sys.mjs");
var accelKeyName = AppConstants.platform == "macosx" ? "metaKey" : "ctrlKey";
var otherKeyName = AppConstants.platform == "macosx" ? "ctrlKey" : "metaKey";

class CBTreeView extends HTMLElement {
	static observedAttributes = ["rows"];

	/**
	 * The number of rows on either side to keep of the visible area to keep in
	 * memory in order to avoid visible blank spaces while the user scrolls.
	 *
	 * This member is visible for testing and should not be used outside of this
	 * class in production code.
	 *
	 * @type {integer}
	 */
	_toleranceSize = 0;

	/**
	 * Set the size of the tolerance buffer based on the number of rows which can
	 * be visible at once.
	 */
	#calculateToleranceBufferSize() {
		this._toleranceSize = this.#calculateVisibleRowCount() * 2;
	}

	/**
	 * Index of the first row that exists in the DOM. Includes rows in the
	 * tolerance buffer if they have been added.
	 *
	 * @type {integer}
	 */
	#firstBufferRowIndex = 0;

	/**
	 * Index of the last row that exists in the DOM. Includes rows in the
	 * tolerance buffer if they have been added.
	 *
	 * @type {integer}
	 */
	#lastBufferRowIndex = 0;

	/**
	 * Index of the first visible row.
	 *
	 * @type {integer}
	 */
	#firstVisibleRowIndex = 0;

	/**
	 * Index of the last visible row.
	 *
	 * @type {integer}
	 */
	#lastVisibleRowIndex = 0;

	/**
	 * Row indices mapped to the row elements that exist in the DOM.
	 *
	 * @type {Map<integer, HTMLTableRowElement>}
	 */
	_rows = new Map();

	/**
	 * The current view.
	 *
	 * @type {nsITreeView}
	 */
	_view = null;

	/**
	 * The current selection.
	 *
	 * @type {nsITreeSelection}
	 */
	_selection = null;

	/**
	 * The function storing the timeout callback for the delayed select feature in
	 * order to clear it when not needed.
	 *
	 * @type {integer}
	 */
	_selectTimeout = null;

	/**
	 * A handle to the callback to fill the buffer when we aren't busy painting.
	 *
	 * @type {number}
	 */
	#bufferFillIdleCallbackHandle = null;

	/**
	 * The virtualized table containing our rows.
	 *
	 * @type {TreeViewTable}
	 */
	table = null;

	/**
	 * An event to fire to indicate the work of filling the buffer is complete.
	 * This will fire once both visible and tolerance rows are ready. It will also
	 * fire if no change to the buffer is required.
	 *
	 * This member is visible in order to provide a reliable indicator to tests
	 * that all expected rows should be in place. It should not be used in
	 * production code.
	 *
	 * @type {Event}
	 */
	_rowBufferReadyEvent = null;

	/**
	 * Fire the provided event, if any, in order to indicate that any necessary
	 * buffer modification work is complete, including if no work is necessary.
	 */
	#dispatchRowBufferReadyEvent() {
		// Don't fire if we're currently waiting on buffer fills; let the callback
		// do that when it's finished.
		if (this._rowBufferReadyEvent && !this.#bufferFillIdleCallbackHandle) {
			this.dispatchEvent(this._rowBufferReadyEvent);
		}
	}

	/**
	 * Determine the height of the visible row area, excluding any chrome which
	 * covers elements.
	 *
	 * WARNING: This may cause synchronous reflow if used after modifying the DOM.
	 *
	 * @returns {integer} - The height of the area into which visible rows are
	 *   rendered.
	 */
	#calculateVisibleHeight() {
		// Account for the table header height in a sticky position above the body.
		return this.clientHeight - this.table.header.clientHeight;
	}

	/**
	 * Determine how many rows are visible in the client presently.
	 *
	 * WARNING: This may cause synchronous reflow if used after modifying the DOM.
	 *
	 * @returns {integer} - The number of visible or partly-visible rows.
	 */
	#calculateVisibleRowCount() {
		return Math.ceil(this.#calculateVisibleHeight() / this._rowElementClass.ROW_HEIGHT);
	}

	connectedCallback() {
		if (this.hasConnected) {
			return;
		}
		this.hasConnected = true;

		// Prevent this element from being part of the roving tab focus since we
		// handle that independently for the TreeViewTableBody and we don't want any
		// interference from this.
		this.tabIndex = -1;
		this.classList.add("tree-view-scrollable-container");

		this.table = document.createElement("table", { is: "cb-tree-view-table" });
		this.appendChild(this.table);

		this.placeholder = this.querySelector(`slot[name="placeholders"]`);
		this.addEventListener("scroll", this);

		let lastHeight = 0;
		this.resizeObserver = new ResizeObserver(entries => {
			// The width of the table isn't important to virtualizing the table. Skip
			// updating if the height hasn't changed.
			if (this.clientHeight == lastHeight) {
				this.#dispatchRowBufferReadyEvent();
				return;
			}

			if (!this._rowElementClass) {
				this.#dispatchRowBufferReadyEvent();
				return;
			}

			// The number of rows in the tolerance buffer is based on the number of
			// rows which can be visible. Update it.
			this.#calculateToleranceBufferSize();

			// There's not much point in reducing the number of rows on resize. Scroll
			// height remains the same and we can retain the extra rows in the buffer.
			if (this.clientHeight > lastHeight) {
				this._ensureVisibleRowsAreDisplayed();
			} else {
				this.#dispatchRowBufferReadyEvent();
			}

			lastHeight = this.clientHeight;
		});
		this.resizeObserver.observe(this);
	}

	disconnectedCallback() {
		this.#resetRowBuffer();
		this.resizeObserver.disconnect();
	}

	attributeChangedCallback(attrName, oldValue, newValue) {
		this._rowElementName = newValue || "cb-tree-view-table-row";
		this._rowElementClass = customElements.get(this._rowElementName);

		this.#calculateToleranceBufferSize();

		if (this._view) {
			this.invalidate();
		}
	}

	handleEvent(event) {
		switch (event.type) {
			case "keyup": {
				if (["Tab", "F6"].includes(event.key) && this.currentIndex == -1 && this._view?.rowCount) {
					let selectionChanged = false;
					if (this.selectedIndex == -1) {
						this._selection.select(0);
						selectionChanged = true;
					}
					this.currentIndex = this.selectedIndex;
					if (selectionChanged) {
						this.onSelectionChanged();
					}
				}
				break;
			}
			case "click": {
				if (event.button !== 0) {
					return;
				}

				let row = event.target.closest(`tr[is="${this._rowElementName}"]`);
				if (!row) {
					return;
				}

				let index = row.index;

				if (event.target.classList.contains("tree-button-thread")) {
					if (this._view.isContainerOpen(index)) {
						let children = 0;
						for (let i = index + 1; i < this._view.rowCount && this._view.getLevel(i) > 0; i++) {
							children++;
						}
						this._selectRange(index, index + children, event[accelKeyName]);
					} else {
						let addedRows = this.expandRowAtIndex(index);
						this._selectRange(index, index + addedRows, event[accelKeyName]);
					}
					this.table.body.focus();
					return;
				}

				if (this._view.isContainer(index) && event.target.closest(".twisty")) {
					if (this._view.isContainerOpen(index)) {
						this.collapseRowAtIndex(index);
					} else {
						let addedRows = this.expandRowAtIndex(index);
						this.scrollToIndex(index + Math.min(addedRows, this.#calculateVisibleRowCount() - 1));
					}
					this.table.body.focus();
					return;
				}

				// Handle the click as a CTRL extension if it happens on the checkbox
				// image inside the selection column.
				if (event.target.classList.contains("tree-view-row-select-checkbox")) {
					if (event.shiftKey) {
						this._selectRange(-1, index, event[accelKeyName]);
					} else {
						this._toggleSelected(index);
					}
					this.table.body.focus();
					return;
				}

				if (event[accelKeyName] && !event.shiftKey) {
					this._toggleSelected(index);
				} else if (event.shiftKey) {
					this._selectRange(-1, index, event[accelKeyName]);
				} else {
					this._selectSingle(index);
				}

				this.table.body.focus();
				break;
			}
			case "keydown": {
				if (event.altKey || event[otherKeyName]) {
					return;
				}

				let currentIndex = this.currentIndex == -1 ? 0 : this.currentIndex;
				let newIndex;
				switch (event.key) {
					case "ArrowUp":
						newIndex = currentIndex - 1;
						break;
					case "ArrowDown":
						newIndex = currentIndex + 1;
						break;
					case "ArrowLeft":
					case "ArrowRight": {
						event.preventDefault();
						if (this.currentIndex == -1) {
							return;
						}
						let isArrowRight = event.key == "ArrowRight";
						let isRTL = this.matches(":dir(rtl)");
						if (isArrowRight == isRTL) {
							// Collapse action.
							let currentLevel = this._view.getLevel(this.currentIndex);
							if (this._view.isContainerOpen(this.currentIndex)) {
								this.collapseRowAtIndex(this.currentIndex);
								return;
							} else if (currentLevel == 0) {
								return;
							}

							let parentIndex = this._view.getParentIndex(this.currentIndex);
							if (parentIndex != -1) {
								newIndex = parentIndex;
							}
						} else if (this._view.isContainer(this.currentIndex)) {
							// Expand action.
							if (!this._view.isContainerOpen(this.currentIndex)) {
								let addedRows = this.expandRowAtIndex(this.currentIndex);
								this.scrollToIndex(
								this.currentIndex +
								Math.min(addedRows, this.#calculateVisibleRowCount() - 1)
								);
							} else {
								newIndex = this.currentIndex + 1;
							}
						}
						if (newIndex != undefined) {
							this._selectSingle(newIndex);
						}
						return;
					}
					case "Home":
						newIndex = 0;
						break;
					case "End":
						newIndex = this._view.rowCount - 1;
						break;
					case "PageUp":
						newIndex = Math.max(0, currentIndex - this.#calculateVisibleRowCount());
						break;
					case "PageDown":
						newIndex = Math.min(this._view.rowCount - 1, currentIndex + this.#calculateVisibleRowCount());
						break;
				}

				if (newIndex != undefined) {
					newIndex = this._clampIndex(newIndex);
					if (newIndex != null) {
						if (event[accelKeyName] && !event.shiftKey) {
							// Change focus, but not selection.
							this.currentIndex = newIndex;
						} else if (event.shiftKey) {
							this._selectRange(-1, newIndex, event[accelKeyName]);
						} else {
							this._selectSingle(newIndex, true);
						}
					}
					event.preventDefault();
					return;
				}

				// Space bar keystroke selection toggling.
				if (event.key == " " && this.currentIndex != -1) {
					// Don't do anything if we're on macOS and the target row is already
					// selected.
					if (AppConstants.platform == "macosx" && this._selection.isSelected(this.currentIndex)) {
						return;
					}

					// Handle the macOS exception of toggling the selection with only
					// the space bar since CMD+Space is captured by the OS.
					if (event[accelKeyName] || AppConstants.platform == "macosx") {
						this._toggleSelected(this.currentIndex);
						event.preventDefault();
					} else if (!this._selection.isSelected(this.currentIndex)) {
						// The target row is not currently selected.
						this._selectSingle(this.currentIndex, true);
						event.preventDefault();
					}
				}
				break;
			}
			case "scroll":
				this._ensureVisibleRowsAreDisplayed();
				break;
		}
	}

	/**
	* The current view for this list.
	*
	* @type {nsITreeView}
	*/
	get view() {
		return this._view;
	}

	set view(view) {
		this._selection = null;
		if (this._view) {
			this._view.setTree(null);
			this._view.selection = null;
		}
		if (this._selection) {
			this._selection.view = null;
		}

		this._view = view;
		if (view) {
			try {
				this._selection = new TreeSelection();
				this._selection.tree = this;
				this._selection.view = view;

				view.selection = this._selection;
				view.setTree(this);
			} catch (ex) {
				// This isn't a XULTreeElement, and we can't make it one, so if the
				// `setTree` call crosses XPCOM, an exception will be thrown.
				if (ex.result != Cr.NS_ERROR_XPC_BAD_CONVERT_JS) {
					throw ex;
				}
			}
		}

		// Clear the height of the top spacer to avoid confusing
		// `_ensureVisibleRowsAreDisplayed`.
		this.table.spacerTop.setHeight(0);
		this.invalidate();

		this.dispatchEvent(new CustomEvent("viewchange"));
	}

	/**
	* Set the colspan of the spacer row cells.
	*
	* @param {int} count - The amount of visible columns.
	*/
	setSpacersColspan(count) {
		// Add an extra column if the table is editable to account for the column
		// picker column.
		if (this.parentNode.editable) {
			count++;
		}
		this.table.spacerTop.setColspan(count);
		this.table.spacerBottom.setColspan(count);
	}

	/**
	* Clear all rows from the buffer, empty the table body, and reset spacers.
	*/
	#resetRowBuffer() {
		this.#cancelToleranceFillCallback();
		this.table.body.replaceChildren();
		this._rows.clear();
		this.#firstBufferRowIndex = 0;
		this.#lastBufferRowIndex = 0;
		this.#firstVisibleRowIndex = 0;

		// Set the height of the bottom spacer to account for the now-missing rows.
		// We want to ensure that the overall scroll height does not decrease.
		// Otherwise, we may lose our scroll position and cause unnecessary
		// scrolling. However, we don't always want to change the height of the top
		// spacer for the same reason.
		let rowCount = this._view?.rowCount ?? 0;
		this.table.spacerBottom.setHeight(rowCount * this._rowElementClass.ROW_HEIGHT);
	}

	/**
	* Clear all rows from the list and create them again.
	*/
	invalidate() {
		this.#resetRowBuffer();
		this._ensureVisibleRowsAreDisplayed();
	}

	/**
	* Perform the actions necessary to invalidate the specified row. Implemented
	* separately to allow {@link invalidateRange} to handle testing event fires
	* on its own.
	*
	* @param {integer} index
	*/
	#doInvalidateRow(index) {
		let row = this.getRowAtIndex(index);
		if (row) {
			if (index >= this._view.rowCount) {
				row.remove();
				this._rows.delete(index);
			} else {
				row.index = index;
				row.selected = this._selection.isSelected(index);
			}
		} else if (index >= this.#firstBufferRowIndex && index <= this.#lastBufferRowIndex) {
			this._addRowAtIndex(index);
		}
	}

	/**
	* Invalidate the rows between `startIndex` and `endIndex`.
	*
	* @param {integer} startIndex
	* @param {integer} endIndex
	*/
	invalidateRange(startIndex, endIndex) {
		for (let index = Math.max(startIndex, this.#firstBufferRowIndex), last = Math.min(endIndex, this.#lastBufferRowIndex); index <= last; index++) {
			this.#doInvalidateRow(index);
		}
		this._ensureVisibleRowsAreDisplayed();
	}

	/**
	* Invalidate the row at `index` in place. If `index` refers to a row that
	* should exist but doesn't (because the row count increased), adds a row.
	* If `index` refers to a row that does exist but shouldn't (because the
	* row count decreased), removes it.
	*
	* @param {integer} index
	*/
	invalidateRow(index) {
		this.#doInvalidateRow(index);
		this.#dispatchRowBufferReadyEvent();
	}

	/**
	* A contiguous range, inclusive of both extremes.
	*
	* @typedef InclusiveRange
	* @property {integer} first - The inclusive start of the range.
	* @property {integer} last - The inclusive end of the range.
	*/

	/**
	* Calculate the range of rows we wish to have in a filled tolerance buffer
	* based on a given range of visible rows.
	*
	* @param {integer} firstVisibleRow - The first visible row in the range.
	* @param {integer} lastVisibleRow - The last visible row in the range.
	* @param {integer} dataRowCount - The total number of available rows in the
	*   source data.
	* @returns {InclusiveRange} - The full range of the desired buffer.
	*/
	#calculateDesiredBufferRange(firstVisibleRow, lastVisibleRow, dataRowCount) {
		const desiredRowRange = {};

		desiredRowRange.first = Math.max(firstVisibleRow - this._toleranceSize, 0);
		desiredRowRange.last = Math.min(lastVisibleRow + this._toleranceSize, dataRowCount - 1);

		return desiredRowRange;
	}

	#createToleranceFillCallback() {
		this.#bufferFillIdleCallbackHandle = requestIdleCallback(deadline => this.#fillToleranceBuffer(deadline));
	}

	#cancelToleranceFillCallback() {
		cancelIdleCallback(this.#bufferFillIdleCallbackHandle);
		this.#bufferFillIdleCallbackHandle = null;
	}

	/**
	* Fill the buffer with tolerance rows above and below the visible rows.
	*
	* As fetching data and modifying the DOM is expensive, this is intended to be
	* run within an idle callback and includes management of the idle callback
	* handle and creation of further callbacks if work is not completed.
	*
	* @param {IdleDeadline} deadline - A deadline object for fetching the
	*   remaining time in the idle tick.
	*/
	#fillToleranceBuffer(deadline) {
		this.#bufferFillIdleCallbackHandle = null;

		const rowCount = this._view?.rowCount ?? 0;
		if (!rowCount) {
			return;
		}

		const bufferRange = this.#calculateDesiredBufferRange(this.#firstVisibleRowIndex, this.#lastVisibleRowIndex, rowCount);

		// Set the amount of time to leave in the deadline to fill another row. In
		// order to cooperatively schedule work, we shouldn't overrun the time
		// allotted for the idle tick. This value should be set such that it leaves
		// enough time to perform another row fill and adjust the relevant spacer
		// while doing the maximal amount of work per callback.
		const MS_TO_LEAVE_PER_FILL = 1.25;

		// Fill in the beginning of the buffer.
		if (bufferRange.first < this.#firstBufferRowIndex) {
			for (let i = this.#firstBufferRowIndex - 1;
				i >= bufferRange.first && deadline.timeRemaining() > MS_TO_LEAVE_PER_FILL;
				i--) {
				this._addRowAtIndex(i, this.table.body.firstElementChild);

				// Update as we go in case we need to wait for the next idle.
				this.#firstBufferRowIndex = i;
			}

			// Adjust the height of the top spacer to account for the new rows we've
			// added.
			this.table.spacerTop.setHeight(this.#firstBufferRowIndex * this._rowElementClass.ROW_HEIGHT);

			// If we haven't completed the work of filling the tolerance buffer,
			// schedule a new job to do so.
			if (this.#firstBufferRowIndex != bufferRange.first) {
				this.#createToleranceFillCallback();
				return;
			}
		}

		// Fill in the end of the buffer.
		if (bufferRange.last > this.#lastBufferRowIndex) {
			for (let i = this.#lastBufferRowIndex + 1;
				i <= bufferRange.last && deadline.timeRemaining() > MS_TO_LEAVE_PER_FILL;
				i++) {
				this._addRowAtIndex(i);

				// Update as we go in case we need to wait for the next idle.
				this.#lastBufferRowIndex = i;
			}

			// Adjust the height of the bottom spacer to account for the new rows
			// we've added.
			this.table.spacerBottom.setHeight((rowCount - 1 - this.#lastBufferRowIndex) * this._rowElementClass.ROW_HEIGHT);

			// If we haven't completed the work of filling the tolerance buffer,
			// schedule a new job to do so.
			if (this.#lastBufferRowIndex != bufferRange.last) {
				this.#createToleranceFillCallback();
				return;
			}
		}

		// Notify tests that we have finished work.
		this.#dispatchRowBufferReadyEvent();
	}

	/**
	* The calculated ranges which determine the shape of the row buffer at
	* various stages of processing.
	*
	* @typedef RowBufferRanges
	* @property {InclusiveRange} visibleRows - The range of rows which should be
	*   displayed to the user.
	* @property {integer?} pruneBefore - The index of the row before which any
	*   additional rows should be discarded.
	* @property {integer?} pruneAfter - The index of the row after which any
	*   additional rows should be discarded.
	* @property {InclusiveRange} finalizedRows - The range of rows which should
	*   exist in the row buffer after any additions and removals have been made.
	*/

	/**
	* Calculate the values necessary for building the list of visible rows and
	* retaining any rows in the buffer which fall inside the desired tolerance
	* and form a contiguous range with the visible rows.
	*
	* WARNING: This function makes calculations based on existing DOM dimensions.
	* Do not use it after you have modified the DOM.
	*
	* @returns {RowBufferRanges}
	*/
	#calculateRowBufferRanges(dataRowCount) {
		/** @type {RowBufferRanges} */
		const ranges = {visibleRows: {}, pruneBefore: null, pruneAfter: null, finalizedRows: {}};

		// We adjust the row buffer in several stages. First, we'll use the new
		// scroll position to determine the boundaries of the buffer. Then, we'll
		// create and add any new rows which are necessary to fit the new
		// boundaries. Next, we prune rows added in previous scrolls which now fall
		// outside the boundaries. Finally, we recalculate the height of the spacers
		// which position the visible rows within the rendered area.
		ranges.visibleRows.first = Math.max(Math.floor(this.scrollTop / this._rowElementClass.ROW_HEIGHT), 0);

		const lastPossibleVisibleRow = Math.ceil((this.scrollTop + this.#calculateVisibleHeight()) / this._rowElementClass.ROW_HEIGHT);

		ranges.visibleRows.last = Math.min(lastPossibleVisibleRow, dataRowCount) - 1;

		// Determine the number of rows desired in the tolerance buffer in order to
		// determine whether there are any that we can save.
		const desiredRowRange = this.#calculateDesiredBufferRange(ranges.visibleRows.first, ranges.visibleRows.last, dataRowCount);

		// Determine which rows are no longer wanted in the buffer. If we've
		// scrolled past the previous visible rows, it's possible that the tolerance
		// buffer will still contain some rows we'd like to have in the buffer. Note
		// that we insist on a contiguous range of rows in the buffer to simplify
		// determining which rows exist and appropriately spacing the viewport.
		if (this.#lastBufferRowIndex < ranges.visibleRows.first) {
			// There is a discontiguity between the visible rows and anything that's
			// in the buffer. Prune everything before the visible rows.
			ranges.pruneBefore = ranges.visibleRows.first;
			ranges.finalizedRows.first = ranges.visibleRows.first;
		} else if (this.#firstBufferRowIndex < desiredRowRange.first) {
			// The range of rows in the buffer overlaps the start of the visible rows,
			// but there are rows outside of the desired buffer as well. Prune them.
			ranges.pruneBefore = desiredRowRange.first;
			ranges.finalizedRows.first = desiredRowRange.first;
		} else {
			// Determine the beginning of the finalized buffer based on whether the
			// buffer contains rows before the start of the visible rows.
			ranges.finalizedRows.first = Math.min(ranges.visibleRows.first, this.#firstBufferRowIndex);
		}

		if (this.#firstBufferRowIndex > ranges.visibleRows.last) {
			// There is a discontiguity between the visible rows and anything that's
			// in the buffer. Prune everything after the visible rows.
			ranges.pruneAfter = ranges.visibleRows.last;
			ranges.finalizedRows.last = ranges.visibleRows.last;
		} else if (this.#lastBufferRowIndex > desiredRowRange.last) {
			// The range of rows in the buffer overlaps the end of the visible rows,
			// but there are rows outside of the desired buffer as well. Prune them.
			ranges.pruneAfter = desiredRowRange.last;
			ranges.finalizedRows.last = desiredRowRange.last;
		} else {
			// Determine the end of the finalized buffer based on whether the buffer
			// contains rows after the end of the visible rows.
			ranges.finalizedRows.last = Math.max(ranges.visibleRows.last, this.#lastBufferRowIndex);
		}

		return ranges;
	}

	/**
	* Display the table rows which should be shown in the visible area and
	* request filling of the tolerance buffer when idle.
	*/
	_ensureVisibleRowsAreDisplayed() {
		let rowCount = this._view?.rowCount ?? 0;
		this.placeholder?.classList.toggle("show", !rowCount);

		if (!rowCount || this.#calculateVisibleRowCount() == 0) {
			return;
		}

		if (this.scrollTop > rowCount * this._rowElementClass.ROW_HEIGHT) {
			// Beyond the end of the list. We're about to scroll anyway, so clear
			// everything out and wait for it to happen. Don't call `invalidate` here,
			// or you'll end up in an infinite loop.
			this.table.spacerTop.setHeight(0);
			this.#resetRowBuffer();
			return;
		}

		const ranges = this.#calculateRowBufferRanges(rowCount);

		// *WARNING: Do not request any DOM dimensions after this point. Modifying
		// the DOM will invalidate existing calculations and any additional requests
		// will cause synchronous reflow.

		// Add a row if the table is empty. Either we're initializing or have
		// invalidated the tree, and the next two steps pass over row zero if there
		// are no rows already in the buffer.
		if (this.#lastBufferRowIndex == 0 && this.table.body.childElementCount == 0 && ranges.visibleRows.first == 0) {
			this._addRowAtIndex(0);
		}

		// Expand the row buffer to include newly-visible rows which weren't already
		// visible or preloaded in the tolerance buffer.

		const earliestMissingEndRowIdx = Math.max(this.#lastBufferRowIndex + 1, ranges.visibleRows.first);
		for (let i = earliestMissingEndRowIdx; i <= ranges.visibleRows.last; i++) {
			// We are missing rows at the end of the buffer. Either the last row of
			// the existing buffer lies within the range of visible rows and we begin
			// there, or the entire range of visible rows occurs after the end of the
			// buffer and we fill in from the start.
			this._addRowAtIndex(i);
		}

		const latestMissingStartRowIdx = Math.min(this.#firstBufferRowIndex - 1, ranges.visibleRows.last);
		for (let i = latestMissingStartRowIdx; i >= ranges.visibleRows.first; i--) {
			// We are missing rows at the start of the buffer. We'll add them working
			// backwards so that we can prepend. Either the first row of the existing
			// buffer lies within the range of visible rows and we begin there, or the
			// entire range of visible rows occurs before the end of the buffer and we
			// fill in from the end.
			this._addRowAtIndex(i, this.table.body.firstElementChild);
		}

		// Prune the buffer of any rows outside of our desired buffer range.
		if (ranges.pruneBefore !== null) {
			const pruneBeforeRow = this.getRowAtIndex(ranges.pruneBefore);
			let rowToPrune = pruneBeforeRow.previousElementSibling;
			while (rowToPrune) {
				rowToPrune.remove();
				this._rows.delete(rowToPrune.index);
				rowToPrune = pruneBeforeRow.previousElementSibling;
			}
		}

		if (ranges.pruneAfter !== null) {
			const pruneAfterRow = this.getRowAtIndex(ranges.pruneAfter);
			let rowToPrune = pruneAfterRow.nextElementSibling;
			while (rowToPrune) {
				rowToPrune.remove();
				this._rows.delete(rowToPrune.index);
				rowToPrune = pruneAfterRow.nextElementSibling;
			}
		}

		// Set the indices of the new first and last rows in the DOM. They may come
		// from the tolerance buffer if we haven't exhausted it.
		this.#firstBufferRowIndex = ranges.finalizedRows.first;
		this.#lastBufferRowIndex = ranges.finalizedRows.last;

		this.#firstVisibleRowIndex = ranges.visibleRows.first;
		this.#lastVisibleRowIndex = ranges.visibleRows.last;

		// Adjust the height of the spacers to ensure that visible rows fall within
		// the visible space and the overall scroll height is correct.
		this.table.spacerTop.setHeight(this.#firstBufferRowIndex * this._rowElementClass.ROW_HEIGHT);

		this.table.spacerBottom.setHeight((rowCount - this.#lastBufferRowIndex - 1) * this._rowElementClass.ROW_HEIGHT);

		// The row buffer ideally contains some tolerance on either end to avoid
		// creating rows and fetching data for them during short scrolls. However,
		// actually creating those rows can be expensive, and during a long scroll
		// we may throw them away very quickly. To save the expense, only fill the
		// buffer while idle.

		// Don't schedule a new buffer fill callback if we already have one.
		if (!this.#bufferFillIdleCallbackHandle) {
			this.#createToleranceFillCallback();
		}
	}

	/**
	* Index of the first visible or partly visible row.
	*
	* @returns {integer}
	*/
	getFirstVisibleIndex() {
		return this.#firstVisibleRowIndex;
	}

	/**
	* Index of the last visible or partly visible row.
	*
	* @returns {integer}
	*/
	getLastVisibleIndex() {
		return this.#lastVisibleRowIndex;
	}

	/**
	* Ensures that the row at `index` is on the screen.
	*
	* @param {integer} index
	*/
	scrollToIndex(index, instant = false) {
		const rowCount = this._view.rowCount;
		if (rowCount == 0) {
			// If there are no rows, make sure we're scrolled to the top.
			this.scrollTo({ top: 0, behavior: "instant" });
			return;
		}
		if (index < 0 || index >= rowCount) {
			// Bad index. Report, and do nothing.
			console.error(`<${this.localName} id="${this.id}"> tried to scroll to a row that doesn't exist: ${index}`);
			return;
		}

		const topOfRow = this._rowElementClass.ROW_HEIGHT * index;
		let scrollTop = this.scrollTop;
		const visibleHeight = this.#calculateVisibleHeight();
		const behavior = instant ? "instant" : "auto";

		// Scroll up to the row.
		if (topOfRow < scrollTop) {
			this.scrollTo({ top: topOfRow, behavior });
			return;
		}

		// Scroll down to the row.
		const bottomOfRow = topOfRow + this._rowElementClass.ROW_HEIGHT;
		if (bottomOfRow > scrollTop + visibleHeight) {
			this.scrollTo({ top: bottomOfRow - visibleHeight, behavior });
			return;
		}

		// Call `scrollTo` even if the row is in view, to stop any earlier smooth
		// scrolling that might be happening.
		this.scrollTo({ top: this.scrollTop, behavior });
	}

	/**
	* Updates the list to reflect added or removed rows.
	*
	* @param {integer} index - The position in the existing list where rows were
	*   added or removed.
	* @param {integer} delta - The change in number of rows; positive if rows
	*   were added and negative if rows were removed.
	*/
	rowCountChanged(index, delta) {
		if (!this._selection) {
			return;
		}

		this._selection.adjustSelection(index, delta);
		this._updateCurrentIndexClasses();
		this.dispatchEvent(new CustomEvent("rowcountchange"));
	}

	/**
	* Clamps `index` to a value between 0 and `rowCount - 1`.
	*
	* @param {integer} index
	* @returns {integer}
	*/
	_clampIndex(index) {
		if (!this._view.rowCount) {
			return null;
		}
		if (index < 0) {
			return 0;
		}
		if (index >= this._view.rowCount) {
			return this._view.rowCount - 1;
		}
		return index;
	}

	/**
	* Creates a new row element and adds it to the DOM.
	*
	* @param {integer} index
	*/
	_addRowAtIndex(index, before = null) {
		let row = document.createElement("tr", { is: this._rowElementName });
		row.setAttribute("is", this._rowElementName);
		this.table.body.insertBefore(row, before);
		row.setAttribute("aria-setsize", this._view.rowCount);
		row.style.height = `${this._rowElementClass.ROW_HEIGHT}px`;
		row.index = index;
		if (this._selection?.isSelected(index)) {
			row.selected = true;
		}
		if (this.currentIndex === index) {
			row.classList.add("current");
			this.table.body.setAttribute("aria-activedescendant", row.id);
		}
		this._rows.set(index, row);
	}

	/**
	* Returns the row element at `index` or null if `index` is out of range.
	*
	* @param {integer} index
	* @returns {HTMLTableRowElement}
	*/
	getRowAtIndex(index) {
		return this._rows.get(index) ?? null;
	}

	/**
	* Collapses the row at `index` if it can be collapsed. If the selected
	* row is a descendant of the collapsing row, selection is moved to the
	* collapsing row.
	*
	* @param {integer} index
	*/
	collapseRowAtIndex(index) {
		if (!this._view.isContainerOpen(index)) {
			return;
		}

		// If the selected row is going to be collapsed, move the selection.
		let selectedIndex = this.selectedIndex;
		while (selectedIndex > index) {
			selectedIndex = this._view.getParentIndex(selectedIndex);
			if (selectedIndex == index) {
				this.selectedIndex = index;
				break;
			}
		}

		// Check if the view calls rowCountChanged. If it didn't, we'll have to
		// call it. This can happen if the view has no reference to the tree.
		let rowCountDidChange = false;
		let rowCountChangeListener = () => {rowCountDidChange = true;};

		let countBefore = this._view.rowCount;
		this.addEventListener("rowcountchange", rowCountChangeListener);
		this._view.toggleOpenState(index);
		this.removeEventListener("rowcountchange", rowCountChangeListener);
		let countAdded = this._view.rowCount - countBefore;

		// Call rowCountChanged, if it hasn't already happened.
		if (countAdded && !rowCountDidChange) {
			this.invalidateRow(index);
			this.rowCountChanged(index + 1, countAdded);
		}

		this.dispatchEvent(new CustomEvent("collapsed", { bubbles: true, detail: index }));
	}

	/**
	* Expands the row at `index` if it can be expanded.
	*
	* @param {integer} index
	* @returns {integer} - the number of rows that were added
	*/
	expandRowAtIndex(index) {
		if (!this._view.isContainer(index) || this._view.isContainerOpen(index)) {
			return 0;
		}

		// Check if the view calls rowCountChanged. If it didn't, we'll have to
		// call it. This can happen if the view has no reference to the tree.
		let rowCountDidChange = false;
		let rowCountChangeListener = () => {rowCountDidChange = true;};

		let countBefore = this._view.rowCount;
		this.addEventListener("rowcountchange", rowCountChangeListener);
		this._view.toggleOpenState(index);
		this.removeEventListener("rowcountchange", rowCountChangeListener);
		let countAdded = this._view.rowCount - countBefore;

		// Call rowCountChanged, if it hasn't already happened.
		if (countAdded && !rowCountDidChange) {
			this.invalidateRow(index);
			this.rowCountChanged(index + 1, countAdded);
		}

		this.dispatchEvent(new CustomEvent("expanded", { bubbles: true, detail: index }));

		return countAdded;
	}

	/**
	* In a selection, index of the most-recently-selected row.
	*
	* @type {integer}
	*/
	get currentIndex() {
		return this._selection ? this._selection.currentIndex : -1;
	}

	set currentIndex(index) {
		if (!this._view) {
			return;
		}

		this._selection.currentIndex = index;
		this._updateCurrentIndexClasses();
		if (index >= 0 && index < this._view.rowCount) {
			this.scrollToIndex(index);
		}
	}

	/**
	* Set the "current" class on the right row, and remove it from all other rows.
	*/
	_updateCurrentIndexClasses() {
		let index = this.currentIndex;

		for (let row of this.querySelectorAll(`tr[is="${this._rowElementName}"].current`)) {
			row.classList.remove("current");
		}

		if (!this._view || index < 0 || index > this._view.rowCount - 1) {
			this.table.body.removeAttribute("aria-activedescendant");
			return;
		}

		let row = this.getRowAtIndex(index);
		if (row) {
			// We need to clear the attribute in order to let screen readers know that
			// a new message has been selected even if the ID is identical. For
			// example when we delete the first message with ID 0, the next message
			// becomes ID 0 itself. Therefore the attribute wouldn't trigger the screen
			// reader to announce the new message without being cleared first.
			this.table.body.removeAttribute("aria-activedescendant");
			row.classList.add("current");
			this.table.body.setAttribute("aria-activedescendant", row.id);
		}
	}

	/**
	* Select and focus the given index.
	*
	* @param {integer} index - The index to select.
	* @param {boolean} [delaySelect=false] - If the selection should be delayed.
	*/
	_selectSingle(index, delaySelect = false) {
		let changeSelection =
		this._selection.count != 1 || !this._selection.isSelected(index);
		// Update the TreeSelection selection to trigger a tree invalidate().
		if (changeSelection) {
			this._selection.select(index);
		}
		this.currentIndex = index;
		if (changeSelection) {
			this.onSelectionChanged(delaySelect);
		}
	}

	/**
	* Start or extend a range selection to the given index and focus it.
	*
	* @param {number} start - Start index of selection. -1 for current index.
	* @param {number} end - End index of selection.
	* @param {boolean} extend[false] - If the new selection range should extend
	*   the current selection.
	*/
	_selectRange(start, end, extend = false) {
		this._selection.rangedSelect(start, end, extend);
		this.currentIndex = start == -1 ? end : start;
		this.onSelectionChanged();
	}

	/**
	* Toggle the selection state at the given index and focus it.
	*
	* @param {integer} index - The index to toggle.
	*/
	_toggleSelected(index) {
		this._selection.toggleSelect(index);
		// We hack the internals of the TreeSelection to clear the
		// shiftSelectPivot.
		this._selection._shiftSelectPivot = null;
		this.currentIndex = index;
		this.onSelectionChanged();
	}

	/**
	* Select all rows.
	*/
	selectAll() {
		this._selection.selectAll();
		this.onSelectionChanged();
	}

	/**
	* Toggle between selecting all rows or none, depending on the current
	* selection state.
	*/
	toggleSelectAll() {
		if (!this.selectedIndices.length) {
			const index = this._view.rowCount - 1;
			this._selection.selectAll();
			this.currentIndex = index;
		} else {
			this._selection.clearSelection();
		}
		// Make sure the body is focused when the selection is changed as
		// clicking on the "select all" header button steals the focus.
		this.focus();

		this.onSelectionChanged();
	}

	/**
	* In a selection, index of the most-recently-selected row.
	*
	* @type {integer}
	*/
	get selectedIndex() {
		if (!this._selection?.count) {
			return -1;
		}

		let min = {};
		this._selection.getRangeAt(0, min, {});
		return min.value;
	}

	set selectedIndex(index) {
		this._selectSingle(index);
	}

	/**
	* An array of the indices of all selected rows.
	*
	* @type {integer[]}
	*/
	get selectedIndices() {
		let indices = [];
		let rangeCount = this._selection?.getRangeCount();

		for (let range = 0; range < rangeCount; range++) {
			let min = {};
			let max = {};
			this._selection.getRangeAt(range, min, max);

			if (min.value == -1) {
				continue;
			}

			for (let index = min.value; index <= max.value; index++) {
				indices.push(index);
			}
		}

		return indices;
	}

	set selectedIndices(indices) {
		this.setSelectedIndices(indices);
	}

	/**
	* An array of the indices of all selected rows.
	*
	* @param {integer[]} indices
	* @param {boolean} suppressEvent - Prevent a "select" event firing.
	*/
	setSelectedIndices(indices, suppressEvent) {
		this._selection.clearSelection();
		for (let index of indices) {
			this._selection.toggleSelect(index);
		}
		this.onSelectionChanged(false, suppressEvent);
	}

	/**
	* Changes the selection state of the row at `index`.
	*
	* @param {integer} index
	* @param {boolean?} selected - if set, set the selection state to this
	*   value, otherwise toggle the current state
	* @param {boolean?} suppressEvent - prevent a "select" event firing
	* @returns {boolean} - if the index is now selected
	*/
	toggleSelectionAtIndex(index, selected, suppressEvent) {
		let wasSelected = this._selection.isSelected(index);
		if (selected === undefined) {
			selected = !wasSelected;
		}

		if (selected != wasSelected) {
			this._selection.toggleSelect(index);
			this.onSelectionChanged(false, suppressEvent);
		}

		return selected;
	}

	/**
	* Loop through all available child elements of the placeholder slot and
	* show those that are needed.
	* @param {array} idsToShow - Array of ids to show.
	*/
	updatePlaceholders(idsToShow) {
		for (let element of this.placeholder.children) {
			element.hidden = !idsToShow.includes(element.id);
		}
	}

	/**
	* Update the classes on the table element to reflect the current selection
	* state, and dispatch an event to allow implementations to handle the
	* change in the selection state.
	*
	* @param {boolean} [delaySelect=false] - If the selection should be delayed.
	* @param {boolean} [suppressEvent=false] - Prevent a "select" event firing.
	*/
	onSelectionChanged(delaySelect = false, suppressEvent = false) {
		const selectedCount = this._selection.count;
		const allSelected = selectedCount == this._view.rowCount;

		this.table.classList.toggle("all-selected", allSelected);
		this.table.classList.toggle("some-selected", !allSelected && selectedCount);
		this.table.classList.toggle("multi-selected", selectedCount > 1);

		/*
		const selectButton = this.table.querySelector(".tree-view-header-select");
		// Some implementations might not use a select header.
		if (selectButton) {
			// Only mark the `select` button as "checked" if all rows are selected.
			selectButton.toggleAttribute("aria-checked", allSelected);
			// The default action for the header button is to deselect all messages
			// if even one message is currently selected.
			document.l10n.setAttributes(selectButton, selectedCount  ? "threadpane-column-header-deselect-all"
						: "threadpane-column-header-select-all");
		}
		*/

		if (suppressEvent) {
			return;
		}

		// No need to handle a delayed select if not required.
		if (!delaySelect) {
			// Clear the timeout in case something was still running.
			if (this._selectTimeout) {
				window.clearTimeout(this._selectTimeout);
			}
			this.dispatchEvent(new CustomEvent("select", { bubbles: true }));
			return;
		}

		let delay = this.dataset.selectDelay || 50;
		if (delay != -1) {
			if (this._selectTimeout) {
				window.clearTimeout(this._selectTimeout);
			}
			this._selectTimeout = window.setTimeout(() => {
				this.dispatchEvent(new CustomEvent("select", { bubbles: true }));
				this._selectTimeout = null;
				}, delay);
		}
	}
}
customElements.define("tree-view", CBTreeView);
