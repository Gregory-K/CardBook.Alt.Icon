export var cardbookHTMLRichContext = {

	saveWindowSize: async function() {
		let win = await messenger.windows.getCurrent();
		let state = {"top": win.top, "left": win.left, "width": win.width, "height": win.height};
		let winName = window.location.pathname.split("/").pop();
		let prefName = `window.${winName}.state`
		await messenger.runtime.sendMessage({query: "cardbook.pref.setPref", key: prefName, state: state});
		await messenger.runtime.sendMessage({query: "cardbook.pref.setLegacyPref", key: prefName, state: state});
	},

	closeWindow: async function() {
		await cardbookHTMLRichContext.saveWindowSize();
		messenger.menus.removeAll();
		let win = await messenger.windows.getCurrent();
		messenger.windows.remove(win.id);
	},

	loadRichContext: async function() {
		let lastContextElement;
		let tab = await messenger.tabs.getCurrent();

		document.addEventListener("contextmenu", async (event) => {
			lastContextElement = event.target;
			browser.menus.overrideContext({context: "tab", tabId: tab.id});
			browser.menus.removeAll();

			let properties = { contexts: ["tab"], enabled: true, visible: true, viewTypes: ["tab", "popup"]};

			let copyTitle = messenger.i18n.getMessage("copy");
			let copyProperties = { ...properties, id: "cardbookCopyMenuId", title: copyTitle};
			await browser.menus.create(copyProperties);

			let pasteTitle = messenger.i18n.getMessage("paste");
			let pasteProperties = { ...properties, id: "cardbookPasteMenuId", title: pasteTitle};
			await browser.menus.create(pasteProperties);

			let upperTitle = messenger.i18n.getMessage("toUpperCase");
			let upperProperties = { ...properties, id: "cardbookUppercaseMenuId", title: upperTitle};
			await browser.menus.create(upperProperties);

			let lowerTitle = messenger.i18n.getMessage("toLowerCase");
			let lowerProperties = { ...properties, id: "cardbookLowercaseMenuId", title: lowerTitle};
			await browser.menus.create(lowerProperties);
		});

		document.addEventListener("keyup", async (event) => {
			if (event.key == "Escape") {
				cardbookHTMLRichContext.closeWindow();
			}
		});

		messenger.menus.onClicked.addListener(async (info, tab) => {
			if (info.menuItemId == "cardbookUppercaseMenuId") {
				let result = "";
				let value = lastContextElement.value;
				if (lastContextElement.selectionStart == lastContextElement.selectionEnd) {
					result = value.toUpperCase();
				} else {
					for (var i = 0; i < value.length; i++) {
						if (i >= lastContextElement.selectionStart && i < lastContextElement.selectionEnd) {
							result = result + value[i].toUpperCase();
						} else {
							result = result + value[i];
						}
					}
				}
				lastContextElement.value = result;
				lastContextElement.dispatchEvent(new Event('input'));
			} else if (info.menuItemId == "cardbookLowercaseMenuId") {
				let result = "";
				let value = lastContextElement.value;
				if (lastContextElement.selectionStart == lastContextElement.selectionEnd) {
					result = value.toLowerCase();
				} else {
					for (var i = 0; i < value.length; i++) {
						if (i >= lastContextElement.selectionStart && i < lastContextElement.selectionEnd) {
							result = result + value[i].toLowerCase();
						} else {
							result = result + value[i];
						}
					}
				}
				lastContextElement.value = result;
				lastContextElement.dispatchEvent(new Event('input'));
			} else if (info.menuItemId == "cardbookCopyMenuId") {
				let result = "";
				let value = lastContextElement.value;
				if (lastContextElement.selectionStart == lastContextElement.selectionEnd) {
					result = value;
				} else {
					for (var i = 0; i < value.length; i++) {
						if (i >= lastContextElement.selectionStart && i < lastContextElement.selectionEnd) {
							result = result + value[i];
						}
					}
				}
				await navigator.clipboard.writeText(result);
				lastContextElement.dispatchEvent(new Event('input'));
			} else if (info.menuItemId == "cardbookPasteMenuId") {
				let text = await navigator.clipboard.readText();
				let result = "";
				let value = lastContextElement.value;
				result = value.slice(0, lastContextElement.selectionStart) + text + value.slice(lastContextElement.selectionEnd);
				lastContextElement.value = result;
				lastContextElement.dispatchEvent(new Event('input'));
			}

		});
	},
};
