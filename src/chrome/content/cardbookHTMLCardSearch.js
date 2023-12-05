class CbCardSearchInput extends HTMLInputElement {
	connectedCallback() {
		if (this.hasConnected) {
			return;
		}
		this.hasConnected = true;

		this._fireCommand = this._fireCommand.bind(this);

		this.addEventListener("input", this);
		this.addEventListener("keypress", this);
	}

	handleEvent(event) {
		switch (event.type) {
			case "input":
				this._onInput(event);
				break;
			case "keypress":
				this._onKeyPress(event);
				break;
		}
	}

	_onInput() {
		if (this._timer) {
			clearTimeout(this._timer);
		}
		this._timer = setTimeout(this._fireCommand, 500, this);
	}

	_onKeyPress(event) {
		switch (event.key) {
			case "Escape":
				if (this._clearSearch()) {
					event.preventDefault();
					event.stopPropagation();
				}
				break;
			case "Return":
				this._enterSearch();
				event.preventDefault();
				event.stopPropagation();
				break;
		}
	}

	_fireCommand() {
		if (this._timer) {
			clearTimeout(this._timer);
		}
		this._timer = null;
		this.dispatchEvent(new CustomEvent("command"));
	}

	_enterSearch() {
		this._fireCommand();
	}

	_clearSearch() {
		if (this.value) {
			this.value = "";
			this._fireCommand();
			return true;
		}
		return false;
	}
}
customElements.define("ab-card-search-input", CbCardSearchInput, {
	extends: "input",
});

