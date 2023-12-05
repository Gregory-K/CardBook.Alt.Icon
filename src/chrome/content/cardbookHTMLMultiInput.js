class CBMultiInput extends HTMLElement {
	static observedAttributes = ["loaded"];

	constructor() {
		super();
		// This is a hack :^(.
		// ::slotted(input)::-webkit-calendar-picker-indicator doesn't work in any browser.
		// ::slotted() with ::after doesn't work in Safari.
		this.innerHTML +=
			`<style>
				multi-input input::-webkit-calendar-picker-indicator {
					display: none;
				}
				/* NB use of pointer-events to only allow events from the × icon */
				multi-input div.item::after {
					color: black;
					content: '×';
					cursor: pointer;
					font-size: 18px;
					pointer-events: auto;
					position: absolute;
					right: 5px;
					top: -1px;
				}

			</style>`;

		this._shadowRoot = this.attachShadow({mode: 'open'});
		this._shadowRoot.innerHTML =
			`<style>
				:host {
					border: var(--multi-input-border, 1px solid #ddd);
					display: block;
					overflow: hidden;
					padding: 5px;
				}
				/* NB use of pointer-events to only allow events from the × icon */
				::slotted(div.item) {
					background-color: var(--multi-input-item-bg-color, #dedede);
					border: var(--multi-input-item-border, 1px solid #ccc);
					border-radius: 2px;
					color: #222;
					display: inline-block;
					font-size: var(--multi-input-item-font-size, 14px);
					margin: 5px;
					padding: 2px 25px 2px 5px;
					pointer-events: none;
					position: relative;
					top: -1px;
				}
				/* NB pointer-events: none above */
				::slotted(div.item:hover) {
					background-color: #eee;
					color: black;
				}
				::slotted(input) {
					border: none;
					font-size: var(--multi-input-input-font-size, 14px);
					outline: none;
					padding: 10px 10px 10px 5px; 
				}
			</style>
			<slot></slot>`;

		this._loadOptions();

		this._input = this.querySelector('input');
		this._input.onblur = this._handleBlur.bind(this);
		this._input.oninput = this._handleInput.bind(this);
		this._input.onkeydown = (event) => {
			this._handleKeydown(event);
		};
	}

	attributeChangedCallback(attrName, oldValue, newValue) {
		this._loadOptions();
	}

	_loadOptions() {
		this._datalist = this.querySelector('datalist');
		this._allowedValues = [];
		for (const option of this._datalist.options) {
			if (option.hasAttribute("checked")) {
				this._addItem(option.value);
			} else {
				this._allowedValues.push(option.value.toLowerCase());
			}
		}
	}

	// Called by _handleKeydown() when the value of the input is an allowed value.
	_addItem(value) {
		this._input.value = '';
		let existingItems = Array.from(this.querySelectorAll("div.item")).filter(item => item.textContent == value);
		if (existingItems.length) {
			return
		}
		const item = document.createElement('div');
		item.classList.add('item');
		item.textContent = value;
		this.insertBefore(item, this._input);
		item.onclick = () => {
			this._deleteItem(item);
		};

		// Remove value from datalist options and from _allowedValues array.
		// Value is added back if an item is deleted (see _deleteItem()).
		for (const option of this._datalist.options) {
			if (option.value.toLowerCase() === value.toLowerCase()) {
				option.remove();
			};
		}
		this._allowedValues = this._allowedValues.filter((item) => item.toLowerCase() !== value.toLowerCase());
	}

	// Called when the × icon is tapped/clicked or
	// by _handleKeydown() when Backspace is entered.
	_deleteItem(item) {
		const value = item.textContent;
		item.remove();
		// If duplicates aren't allowed, value is removed (in _addItem())
		// as a datalist option and from the _allowedValues array.
		// So — need to add it back here.
		const option = document.createElement('option');
		option.value = value;
		// Insert as first option seems reasonable...
		this._datalist.insertBefore(option, this._datalist.firstChild);
		this._allowedValues.push(value.toLowerCase());
	}

	// Avoid stray text remaining in the input element that's not in a div.item.
	_handleBlur() {
		this._input.value = '';
	}

	// Avoid stray text remaining in the input element that's not in a div.item.
	_getPossiblesLength(input) {
		let possibles = Object.values(this._datalist.options);
		possibles = possibles.map(entry => entry.value.toLowerCase());
		possibles = possibles.filter(item => item.includes(input.toLowerCase()));
		return possibles.length;
	}

	// Called when input text changes,
	// either by entering text or selecting a datalist option.
	_handleInput() {
		// Add a div.item, but only if the current value
		// of the input is an allowed value
		const value = this._input.value;
		if (this._getPossiblesLength(value) == 1) {
			this._addItem(value);
		}
	}

	// Called when text is entered or keys pressed in the input element.
	_handleKeydown(event) {
		const itemToDelete = event.target.previousElementSibling;
		const value = this._input.value;
		// On Backspace, delete the div.item to the left of the input
		if (value ==='' && event.key === 'Backspace' && itemToDelete) {
			this._deleteItem(itemToDelete);
			// Add a div.item, but only if the current value
			// of the input is an allowed value
		} else if (this._getPossiblesLength(value) == 1) {
			this._addItem(value);
		} else if (value != '' && event.key === 'Enter') {
			this._addItem(value);
		}
	}

	// Public method for getting item values as an array.
	getValues() {
		const values = [];
		const items = this.querySelectorAll('.item');
		for (const item of items) {
			values.push(item.textContent);
		}
		return values;
	}
}

customElements.define('cb-multi-input', CBMultiInput);
