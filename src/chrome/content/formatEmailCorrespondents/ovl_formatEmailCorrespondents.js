if ("undefined" == typeof(ovl_formatEmailCorrespondents)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { DisplayNameUtils } = ChromeUtils.import("resource:///modules/DisplayNameUtils.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_formatEmailCorrespondents = {
		origFunctions: {},

		getIdentityForEmail: function(aEmail) {
			let emailAddress = aEmail.toLowerCase();
			for (let identity of MailServices.accounts.allIdentities) {
				if (!identity.email) {
					continue;
				}
				if (emailAddress == identity.email.toLowerCase()) {
					return identity;
				}
			}
			return null;
		},
		
		getCardBookDisplayNameFromEmail: function(aEmail, aDefaultDisplay) {
			var found = false;
			var myResult = "";
			if (aEmail) {
				var myTestString = aEmail.toLowerCase();
				if (cardbookRepository.cardbookPreferDisplayNameIndex[myTestString]) {
					myResult = aDefaultDisplay;
					found = true;
				} else {
					for (let account of cardbookRepository.cardbookAccounts) {
						if (account[1] && account[5] && account[6] != "SEARCH") {
							var myDirPrefId = account[4];
							if (cardbookRepository.cardbookCardEmails[myDirPrefId]) {
								if (cardbookRepository.cardbookCardEmails[myDirPrefId][myTestString]) {
									myResult = cardbookRepository.cardbookCardEmails[myDirPrefId][myTestString][0].fn;
									found = true;
									break;
								}
							}
						}
					}
				}
				if (found) {
					if (myResult) {
						return {found: found, result: myResult};
					} else {
						return {found: found, result: aEmail};
					}
				} else {
					if (aDefaultDisplay) {
						return {found: found, result: aDefaultDisplay};
					} else {
						return {found: found, result: aEmail};
					}
				}
			} else {
				return {found: found, result: aDefaultDisplay};
			}
		},

		getDisplayNameColumn: function(aEmails, aContext) {
			let showCondensedAddresses = cardbookRepository.cardbookPreferences.getBoolPref("mail.showCondensedAddresses");
			let exclusive = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive");
			let results = [];
			let myCardBookResult = {};
			let addresses = MailServices.headerParser.parseEncodedHeaderW(aEmails);
			for (let address of addresses) {
				if (showCondensedAddresses) {
					myCardBookResult = ovl_formatEmailCorrespondents.getCardBookDisplayNameFromEmail(address.email, address.name);
					if (exclusive) {
						if (!myCardBookResult.found) {
							let identity = ovl_formatEmailCorrespondents.getIdentityForEmail(address.email);
							if (identity && identity.fullName) {
								results.push(identity.fullName);
							} else {
								if (address.name) {
									results.push(address.name);
								} else {
									results.push(address.email);
								}
							}
						} else {
							results.push(myCardBookResult.result);
						}
					} else {
						if (!myCardBookResult.found) {
							var card = DisplayNameUtils.getCardForEmail(address.email).card;
							var displayName = null;
							if (card) {
								if (card.getProperty("PreferDisplayName", "1") == "1") {
									displayName = card.displayName;
								}
							}
							if (displayName) {
								results.push(displayName);
							} else {
								let identity = ovl_formatEmailCorrespondents.getIdentityForEmail(address.email);
								if (identity && identity.fullName) {
									results.push(identity.fullName);
								} else {
									if (address.name) {
										results.push(address.name);
									} else {
										results.push(address.email);
									}
								}
							}
						} else {
							results.push(myCardBookResult.result);
						}
					}
				} else {
					if (address.name) {
						results.push(address.name);
					} else {
						results.push(address.email);
					}
				}
			}
			return results.join(", ");
		}
	};
};

function cardbookSenderHandler() {
};

cardbookSenderHandler.prototype = {
	getCellText: function(row, col) {
		//get the message's header so that we can extract the date field
		if (gDBView.isContainer(row) && gDBView.viewFlags & Components.interfaces.nsMsgViewFlagsType.kGroupBySort) {
			return "";
		} else {
			var hdr = gDBView.getMsgHdrAt(row);
			return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("sender"), "from");
		}
	},
	getSortStringForRow: function(hdr) {return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("sender"), "from");},
	isString:            function() {return true;},
	getCellProperties:   function(row, col, props){},
	getRowProperties:    function(row, props){},
	getImageSrc:         function(row, col) {return null;},
	getSortLongForRow:   function(hdr) {return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("sender"), "from");}
};

function cardbookRecipientsHandler() {
};

cardbookRecipientsHandler.prototype = {
	getCellText: function(row, col) {
		//get the message's header so that we can extract the date field
		if (gDBView.isContainer(row) && gDBView.viewFlags & Components.interfaces.nsMsgViewFlagsType.kGroupBySort) {
			return "";
		} else {
			var hdr = gDBView.getMsgHdrAt(row);
			return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("recipients"), "to");
		}
	},
	getSortStringForRow: function(hdr) {return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("recipients"), "to");},
	isString:            function() {return true;},
	getCellProperties:   function(row, col, props){},
	getRowProperties:    function(row, props){},
	getImageSrc:         function(row, col) {return null;},
	getSortLongForRow:   function(hdr) {return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("recipients"), "to");}
};

function cardbookCorrespondentHandler() {
};

cardbookCorrespondentHandler.prototype = {
	getCellText: function(row, col) {
		//get the message's header so that we can extract the date field
		if (gDBView.isContainer(row) && gDBView.viewFlags & Components.interfaces.nsMsgViewFlagsType.kGroupBySort) {
			return "";
		} else {
			var hdr = gDBView.getMsgHdrAt(row);
			if (cardbookRepository.isOutgoingMail(hdr)) {
				return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("recipients"), "to");
			} else {
				return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("sender"), "from");
			}
		}
	},
	getSortStringForRow: function(hdr) {
		var hdr = gDBView.getMsgHdrAt(row);
		if (cardbookRepository.isOutgoingMail(hdr)) {
			return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("recipients"), "to");
		} else {
			return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("sender"), "from");
		}
	},
	isString:            function() {return true;},
	getCellProperties:   function(row, col, props){
		var hdr = gDBView.getMsgHdrAt(row);
		if (cardbookRepository.isOutgoingMail(hdr)) {
			return "outgoing";
		} else {
			return "incoming";
		}
	},
	getRowProperties:    function(row, props){},
	getImageSrc:         function(row, col) {return null;},
	getSortLongForRow:   function(hdr) {
		var hdr = gDBView.getMsgHdrAt(row);
		if (cardbookRepository.isOutgoingMail(hdr)) {
			return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("recipients"), "to");
		} else {
			return ovl_formatEmailCorrespondents.getDisplayNameColumn(hdr.getStringProperty("sender"), "from");
		}
	}
};

var myFormatObserver = {
	register: function() {
		Services.obs.addObserver(this, "MsgCreateDBView", false);
	},
	
	unregister: function() {
		try {
			gDBView.removeColumnHandler("senderCol");
		} catch(e) {}
		try {
			gDBView.removeColumnHandler("recipientCol");
		} catch(e) {}
		try {
			gDBView.removeColumnHandler("correspondentCol");
		} catch(e) {}
		Services.obs.removeObserver(this, "MsgCreateDBView");
	},
	
	observe: function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "MsgCreateDBView":
				if (gDBView) {
					gDBView.addColumnHandler("senderCol", new cardbookSenderHandler());
					gDBView.addColumnHandler("recipientCol", new cardbookRecipientsHandler());
					gDBView.addColumnHandler("correspondentCol", new cardbookCorrespondentHandler());
				}
				break;
		}
	}
};
myFormatObserver.register();

// DisplayNameUtils.formatDisplayName
(function() {
	// for the standalone window, does not exist
	if ("undefined" != typeof(DisplayNameUtils.formatDisplayName)) {
		// Keep a reference to the original function.
		ovl_formatEmailCorrespondents.origFunctions.formatDisplayName = DisplayNameUtils.formatDisplayName;
		
		// Override a function.
		DisplayNameUtils.formatDisplayName = function() {
			
			var exclusive = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive");
			var myCardBookResult = {};
			myCardBookResult = ovl_formatEmailCorrespondents.getCardBookDisplayNameFromEmail(arguments[0], arguments[1]);
			if (myCardBookResult.found) {
				return myCardBookResult.result;
			} else {
				if (exclusive) {
					let displayName = null;
					var identity = ovl_formatEmailCorrespondents.getIdentityForEmail(arguments[0]);
					var gMessengerBundle = Services.strings.createBundle("chrome://messenger/locale/messenger.properties");
					if (identity) {
						try {
							displayName = gMessengerBundle.GetStringFromName("header" + aContext + "FieldMe");
						} catch (e) {
							displayName = gMessengerBundle.GetStringFromName("headertoFieldMe");
						}
					
						if (MailServices.accounts.allIdentities.length > 1) {
							displayName = MailServices.headerParser.makeMailboxObject(displayName, identity.email).toString();
						}
					}
					return displayName;
				} else {
					return ovl_formatEmailCorrespondents.origFunctions.formatDisplayName.apply(null, arguments);
				}
			}
		};
	}
})();

// DisplayNameUtils.getCardForEmail
(function() {
	// for the standalone window, does not exist
	if ("undefined" != typeof(DisplayNameUtils.getCardForEmail)) {
		// Keep a reference to the original function.
		ovl_formatEmailCorrespondents.origFunctions.getCardForEmail = DisplayNameUtils.getCardForEmail;
		
		// Override a function.
		DisplayNameUtils.getCardForEmail = function() {
			// let exclusive = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive");
			// let standardRV = ovl_formatEmailCorrespondents.origFunctions.getCardForEmail.apply(null, arguments);
			// let card = cardbookRepository.cardbookUtils.getCardFromEmail(arguments[0]);
			// if (exclusive) {
			// 	if (card) {
			// 		return  { book: null, card: card };
			// 	} else {
			// 		return { book: null, card: null };
			// 	}
			// } else {
			// 	if (card) {
			// 		return  { book: null, card: card };
			// 	} else {
			// 		return ovl_formatEmailCorrespondents.origFunctions.getCardForEmail.apply(null, arguments);
			// 	}
			// }
			let standardRV = ovl_formatEmailCorrespondents.origFunctions.getCardForEmail.apply(null, arguments);
			let card = cardbookRepository.cardbookUtils.getCardFromEmail(arguments[0]);
			if (card) {
				return  { book: standardRV.book, card: card, standardCard: standardRV.card};
			} else {
				return standardRV;
			}
		};
	}
})();
