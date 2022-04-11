if ("undefined" == typeof(ovl_cardbookFindEvents)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_cardbookFindEvents = {

		findEventsFromEmail: function(emailAddressNode) {
			var myEmailNode = emailAddressNode.closest("mail-emailaddress");
			var myEmail = myEmailNode.getAttribute('emailAddress');
			if (ovl_cardbookMailContacts) {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(myEmail, ovl_cardbookMailContacts.getIdentityKey());
			} else {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(myEmail);
			}
			if (isEmailRegistered) {
				var myCard = cardbookRepository.cardbookUtils.getCardFromEmail(myEmail);
				ovl_cardbookFindEvents.findEvents(null, [myEmail], myCard.fn);
			} else {
				var myDisplayName = myEmailNode.getAttribute('displayName');
				ovl_cardbookFindEvents.findEvents(null, [myEmail], myDisplayName);
			}
		},

		findAllEventsFromContact: function(emailAddressNode) {
			var myEmailNode = emailAddressNode.closest("mail-emailaddress");
			var myEmail = myEmailNode.getAttribute('emailAddress');
			if (ovl_cardbookMailContacts) {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(myEmail, ovl_cardbookMailContacts.getIdentityKey());
			} else {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(myEmail);
			}
	
			if (isEmailRegistered) {
				var myCard = cardbookRepository.cardbookUtils.getCardFromEmail(myEmail);
				ovl_cardbookFindEvents.findEvents(myCard, null, myCard.fn);
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
