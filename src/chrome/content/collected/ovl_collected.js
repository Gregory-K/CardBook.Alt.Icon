if ("undefined" == typeof(ovl_collected)) {
	var { jsmime } = ChromeUtils.import("resource:///modules/jsmime.jsm");
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_collected = {
		
		addCollectedContact: async function (aIdentity, aEmailsCollections, aDisplayName, aEmail) {
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : start of emails identity : " + aIdentity);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : start of emails collection : " + aEmailsCollections.toSource());
			if (!aEmail) {
				return;
			} else if (aEmail.includes("{{") && aEmail.includes("}}")) {
				return;
			}
			if (aDisplayName) {
				if (aDisplayName.includes("{{") && aDisplayName.includes("}}")) {
					return;
				}
			}
			var myTopic = "outgoingEmailCollected";
			var myActionId = cardbookActions.startAction(myTopic);
			if (!cardbookRepository.isEmailRegistered(aEmail)) {
				for (var i = 0; i < aEmailsCollections.length; i++) {
					var dirPrefId = aEmailsCollections[i][2];
					// check for the address book
					let account = cardbookRepository.cardbookAccounts.filter(child => dirPrefId == child[4]);
					if (account.length == 0) {
						cardbookRepository.cardbookLog.updateStatusProgressInformation("Email collection : wrong dirPrefId : " + dirPrefId, "Error");
						continue;
					}
					if (!cardbookRepository.cardbookPreferences.getReadOnly(dirPrefId)) {
						if (aEmailsCollections[i][0] == "true") {
							if ((aIdentity == aEmailsCollections[i][1]) || ("allMailAccounts" == aEmailsCollections[i][1])) {
								var dirPrefIdName = cardbookRepository.cardbookPreferences.getName(dirPrefId);
								cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(dirPrefIdName + " : debug mode : trying to collect contact " + aDisplayName + " (" + aEmail + ")");
								await cardbookRepository.cardbookUtils.addCardFromDisplayAndEmail(dirPrefId, aDisplayName, aEmail, aEmailsCollections[i][3], myActionId);
							}
						}
					}
				}
			} else {
				// if the contact is already registered, let's have a look if it's not possible to collect some informations
				if (cardbookRepository.isEmailRegistered(aEmail) && aDisplayName) {
					var myCard = cardbookRepository.cardbookUtils.getCardFromEmail(aEmail);
					if (myCard.fn.toLowerCase() == aEmail.toLowerCase() && aDisplayName.toLowerCase() != aEmail.toLowerCase()) {
						var myNewCard = new cardbookCardParser();
						cardbookRepository.cardbookUtils.cloneCard(myCard, myNewCard);
						myNewCard.fn = aDisplayName;
						await cardbookRepository.saveCardFromUpdate(myCard, myNewCard, myActionId, true);
					}
				}
			}
			cardbookActions.endAction(myActionId);
		},
	
		collectToCardBook: async function () {
			var resultEmailsCollections = [];
			resultEmailsCollections = cardbookRepository.cardbookPreferences.getAllEmailsCollections();
			if (resultEmailsCollections && resultEmailsCollections.length != 0) {
				var myFields = gMsgCompose.compFields;
				for (let field of ["to", "cc", "bcc"]) {
					if (myFields[field]) {
						let addresses = MailServices.headerParser.parseEncodedHeaderW(myFields[field]);
						for (let address of addresses) {
							await ovl_collected.addCollectedContact(gMsgCompose.identity.key, resultEmailsCollections, address.name, address.email);
							cardbookIDBMailPop.updateMailPop(address.email);
						}
					}
				}
			} else {
				var myFields = gMsgCompose.compFields;
				for (let field of ["to", "cc", "bcc"]) {
					if (myFields[field]) {
						let addresses = MailServices.headerParser.parseEncodedHeaderW(myFields[field]);
						for (let address of addresses) {
							cardbookIDBMailPop.updateMailPop(address.email);
						}
					}
				}
			}
		}
	};
};
