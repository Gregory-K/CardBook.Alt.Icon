if ("undefined" == typeof(ovl_cardbookFindEvents)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_cardbookFindEvents = {

		findEventsFromEmail: function(emailAddressNode) {
			let email = ovl_cardbookAboutMessage.getEmailFromEmailAddressNode(emailAddressNode);
			let displayname = ovl_cardbookAboutMessage.getEmailFromEmailAddressNode(emailAddressNode);
			ovl_cardbookFindEvents.findEvents(null, [email], displayname);
		},

		findAllEventsFromContact: function(emailAddressNode) {
			let email = ovl_cardbookAboutMessage.getEmailFromEmailAddressNode(emailAddressNode);
			let displayname = ovl_cardbookAboutMessage.getEmailFromEmailAddressNode(emailAddressNode);
			if (ovl_cardbookAboutMessage) {
				var isEmailRegistered = cardbookRepository.isEmailRegistered(email, ovl_cardbookAboutMessage.getIdentityKey());
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

		findEvents: async function (aCard, aListOfSelectedEmails, aDisplayName) {
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


			let url = "chrome/content/lightning/wdw_cardbookEventContacts.html";
			let params = new URLSearchParams();
			params.set("displayName", aDisplayName);
			params.set("listOfEmail", listOfEmail.join(","));
			let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
													url: `${url}?${params.toString()}`,
													type: "popup"});
		}
	};
};
