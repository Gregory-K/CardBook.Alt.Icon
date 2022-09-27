if ("undefined" == typeof(ovl_cardbookFindEmails)) {
	var { GlodaIndexer } = ChromeUtils.import("resource:///modules/gloda/GlodaIndexer.jsm");
	var { GlodaMsgSearcher } = ChromeUtils.import(  "resource:///modules/gloda/GlodaMsgSearcher.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_cardbookFindEmails = {

		findEmailsFromEmail: function(emailAddressNode) {
			let email = ovl_cardbookMailContacts.getEmailFromEmailAddressNode(emailAddressNode);
			ovl_cardbookFindEmails.findEmails(null, [email]);
		},

		findAllEmailsFromContact: function(emailAddressNode) {
			let email = ovl_cardbookMailContacts.getEmailFromEmailAddressNode(emailAddressNode);
			if (ovl_cardbookMailContacts) {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(email, ovl_cardbookMailContacts.getIdentityKey());
			} else {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(email);
			}
	
			if (isEmailRegistered) {
				var myCard = cardbookRepository.cardbookUtils.getCardFromEmail(email);
				ovl_cardbookFindEmails.findEmails([myCard], null);
			} else {
				ovl_cardbookFindEmails.findEmails(null, [email]);
			}	
		},

		findEmails: function (aListOfSelectedCard, aListOfSelectedEmails) {
			var listOfEmail = [];
			if (aListOfSelectedCard) {
				for (var i = 0; i < aListOfSelectedCard.length; i++) {
					if (!aListOfSelectedCard[i].isAList) {
						for (var j = 0; j < aListOfSelectedCard[i].email.length; j++) {
							listOfEmail.push(aListOfSelectedCard[i].email[j][0][0].toLowerCase());
						}
					} else {
						listOfEmail.push(aListOfSelectedCard[i].fn.replace('"', '\"'));
					}
				}
			} else if (aListOfSelectedEmails) {
				listOfEmail = JSON.parse(JSON.stringify(aListOfSelectedEmails));
			}
			
			var tabmail = document.getElementById("tabmail");
			if (!tabmail) {
				// Try opening new tabs in an existing 3pane window
				let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
				if (mail3PaneWindow) {
					tabmail = mail3PaneWindow.document.getElementById("tabmail");
					mail3PaneWindow.focus();
				}
			}
			// gloda is not defined when used from an independant window
			tabmail.openTab("glodaFacet", {searcher: new GlodaMsgSearcher(null, '"' + listOfEmail.join('" "') + '"', false)});
		}
	};
};
