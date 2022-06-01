var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var ovl_cardbookComposeMsg = {
	origFunctions: {},

	GenericSendMessage: function() {
		if (gMsgCompose.compFields.deliveryFormat == Components.interfaces.nsIMsgCompSendFormat.Auto ||
			gMsgCompose.compFields.deliveryFormat == Components.interfaces.nsIMsgCompSendFormat.Unset) {
			let myFields = gMsgCompose.compFields;
			let allHtml = true;
			let allPlain = true;
			for (let field of ["to", "cc", "bcc"]) {
				if (myFields[field] && (allHtml || allPlain)) {
					let addresses = MailServices.headerParser.parseEncodedHeaderW(myFields[field]);
					for (let address of addresses) {
						if (allHtml || allPlain) {
							let card = cardbookRepository.cardbookUtils.getCardFromEmail(address.email);
							let format = cardbookRepository.cardbookUtils.getMailFormatFromCard(card);
							if (format == 2) {
								allPlain = false;
							} else if (format == 1) {
								allHtml = false;
							} else {
								allPlain = false;
								allHtml = false;
							}
						}
					}
				}
			}
			if (allPlain) {
				gMsgCompose.compFields.deliveryFormat = Components.interfaces.nsIMsgCompSendFormat.PlainText;
			}
			if (allHtml) {
				gMsgCompose.compFields.deliveryFormat = Components.interfaces.nsIMsgCompSendFormat.HTML;
			}
		}
	},

	newInCardBook: function() {
		try {
			let myNewCard = new cardbookCardParser();
			let dirPrefId = "";
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && account[5] && (account[6] != "SEARCH")) {
					dirPrefId = account[4];
					break;
				}
			}
			if (dirPrefId) {
				myNewCard.dirPrefId = dirPrefId;
				cardbookWindowUtils.openEditionWindow(myNewCard, "CreateContact");
			}
		}
		catch (e) {
			var errorTitle = "newInCardBook";
			Services.prompt.alert(null, errorTitle, e);
		}
	},

	setAB: function() {
		document.getElementById("tasksMenuAddressBook").removeAttribute("key");
		if (document.getElementById("key_addressbook")) {
			document.getElementById("key_addressbook").setAttribute("key", "");
		}
		var exclusive = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive");
		var myPopup = document.getElementById("menu_NewPopup");
		if (exclusive) {
			document.getElementById('tasksMenuAddressBook').setAttribute('hidden', 'true');
			// this menu has no id, so we have to do manually
			myPopup.lastChild.remove();
		} else {
			document.getElementById('tasksMenuAddressBook').removeAttribute('hidden');
		}

		var myMenuItem = document.createXULElement("menuitem");
		myMenuItem.setAttribute("id", "newCardBookCardFromMsgMenu");
		myMenuItem.addEventListener("command", function(aEvent) {
				ovl_cardbookComposeMsg.newInCardBook();
				aEvent.stopPropagation();
			}, false);
		myMenuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("newCardBookCardMenuLabel"));
		myMenuItem.setAttribute("accesskey", cardbookRepository.extension.localeData.localizeMessage("newCardBookCardMenuAccesskey"));
		myPopup.appendChild(myMenuItem);
	},

	unloadMsg: function () {
		cardBookComposeMsgObserver.unregister();

		// functions
		GenericSendMessage = ovl_cardbookComposeMsg.origFunctions.GenericSendMessage;
		setContactsSidebarVisibility = ovl_cardbookComposeMsg.origFunctions.setContactsSidebarVisibility;

		expandRecipients = ovl_list.origFunctions.expandRecipients;
		updateSendLock = ovl_list.origFunctions.updateSendLock;
		onRecipientsChanged = ovl_list.origFunctions.onRecipientsChanged;
	},

	loadMsg: function () {
		cardBookComposeMsgObserver.register();
		ovl_cardbookComposeMsg.setAB();
		setTimeout(function() {
			cardbookAutocomplete.setMsgCompletion();
			}, 50);
		setTimeout(function() {
			cardbookAutocomplete.loadCssRules();
			}, 500);
	}

};

// GenericSendMessage
(function() {
	// Keep a reference to the original function.
	ovl_cardbookComposeMsg.origFunctions.GenericSendMessage = GenericSendMessage;

	// Override a function.
	GenericSendMessage = function() {

		let myFields = gMsgCompose.compFields;
		if (myFields) {
			Recipients2CompFields(myFields);
			// for lists		
			expandRecipients();
			ovl_cardbookComposeMsg.GenericSendMessage();
		}
		var rv = ovl_cardbookComposeMsg.origFunctions.GenericSendMessage.apply(null, arguments);
		return rv;
	};
})();
