// setContactsSidebarVisibility
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

(function() {
	// Keep a reference to the original function.
	ovl_cardbookComposeMsg.origFunctions.setContactsSidebarVisibility = setContactsSidebarVisibility;

	// Override a function.
	setContactsSidebarVisibility = function (show, focus) {
		let contactsSplitter = document.getElementById("contactsSplitter");
		let sidebarAddrMenu = document.getElementById("menu_AddressSidebar");
		let contactsButton = document.getElementById("button-contacts");

	if (show) {
		contactsSplitter.expand();
		sidebarAddrMenu.setAttribute("checked", "true");
		if (contactsButton) {
			contactsButton.setAttribute("checked", "true");
		}

		let contactsBrowser = document.getElementById("contactsBrowser");
		if (contactsBrowser.getAttribute("src") != "chrome://cardbook/content/contactsSidebar/wdw_cardbookContactsSidebar.xhtml") {
			// Url not yet set, load contacts side bar and focus the search
			// input if applicable: We pass "?focus" as a URL querystring, then via
			// onload event of <window id="abContactsPanel">, in AbPanelLoad() of
			// abContactsPanel.js, we do the focusing first thing to avoid timing
			// issues when trying to focus from here while contacts side bar is still
			// loading.
			let url = "chrome://cardbook/content/contactsSidebar/wdw_cardbookContactsSidebar.xhtml";
			if (focus) {
			url += "?focus";
			}
			contactsBrowser.setAttribute("src", url);
		} else if (focus) {
			// Url already set, so we can focus immediately if applicable.
			focusContactsSidebarSearchInput();
		}
	} else {
		let contactsSidebar = document.getElementById("contactsSidebar");
		// Before closing, check if the focus was within the contacts sidebar.
		let sidebarFocussed = contactsSidebar.contains(document.activeElement);

		contactsSplitter.collapse();
		sidebarAddrMenu.removeAttribute("checked");
		if (contactsButton) {
			contactsButton.removeAttribute("checked");
		}

		// Don't change the focus unless it was within the contacts sidebar.
		if (!sidebarFocussed) {
			return;
		}
		// Else, we need to explicitly move the focus out of the contacts sidebar.
		// We choose the subject input if it is empty, otherwise the message body.
		if (!document.getElementById("msgSubject").value) {
			focusSubjectInput();
		} else {
			focusMsgBody();
		}
	}
	};
})();
