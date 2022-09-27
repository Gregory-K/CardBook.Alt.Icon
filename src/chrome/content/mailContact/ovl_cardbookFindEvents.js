if ("undefined" == typeof(ovl_cardbookFindEvents)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_cardbookFindEvents = {

		findEventsFromEmail: function(emailAddressNode) {
			let email = ovl_cardbookMailContacts.getEmailFromEmailAddressNode(emailAddressNode);
			let displayname = ovl_cardbookMailContacts.getEmailFromEmailAddressNode(emailAddressNode);
			ovl_cardbookFindEvents.findEvents(null, [email], displayname);
		},

		findAllEventsFromContact: function(emailAddressNode) {
			let email = ovl_cardbookMailContacts.getEmailFromEmailAddressNode(emailAddressNode);
			let displayname = ovl_cardbookMailContacts.getEmailFromEmailAddressNode(emailAddressNode);
			if (ovl_cardbookMailContacts) {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(email, ovl_cardbookMailContacts.getIdentityKey());
			} else {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(email);
			}
	
			if (isEmailRegistered) {
				let card = cardbookRepository.cardbookUtils.getCardFromEmail(email);
				ovl_cardbookFindEvents.findEvents(card, null, card.fn);
			} else {
				ovl_cardbookFindEvents.findEvents(null, [email], displayname);
			}	
		},

		findEvents: function (aCard, aListOfSelectedEmails, aDisplayName) {
			var listOfEmail = [];
			if (aCard) {
				if (!aCard.isAList) {
					for (var j = 0; j < aCard.email.length; j++) {
						listOfEmail.push(aCard.email[j][0][0].toLowerCase());
					}
				} else {
					listOfEmail.push(aCard.fn.replace('"', '\"'));
				}
			} else if (aListOfSelectedEmails) {
				listOfEmail = JSON.parse(JSON.stringify(aListOfSelectedEmails));
			}
			var myArgs = {listOfEmail: listOfEmail, displayName: aDisplayName};
			var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/lightning/wdw_cardbookEventContacts.xhtml", "", cardbookRepository.windowParams, myArgs);
		}
	};
};
