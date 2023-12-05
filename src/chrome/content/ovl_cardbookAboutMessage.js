if ("undefined" == typeof(ovl_cardbookAboutMessage)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { DisplayNameUtils } = ChromeUtils.import("resource:///modules/DisplayNameUtils.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_cardbookAboutMessage = {
		knownContacts: false,
		origFunctions: {},

		load: function() {
			cardbookAboutMessageObserver.register();
		},

		unload: function() {
			cardbookAboutMessageObserver.unregister();
			customElements.get("header-recipient").prototype.addToAddressBook = ovl_cardbookAboutMessage.origFunctions.addToAddressBook;
			customElements.get("header-recipient").prototype._updateAvatar = ovl_cardbookAboutMessage.origFunctions._updateAvatar;
			gMessageHeader.openEmailAddressPopup = ovl_cardbookAboutMessage.origFunctions.openEmailAddressPopup;
			gMessageHeader.showContactEdit = ovl_cardbookAboutMessage.origFunctions.showContactEdit;
			gMessageHeader.editContact = ovl_cardbookAboutMessage.origFunctions.editContact;
			gMessageHeader.addContact = ovl_cardbookAboutMessage.origFunctions.addContact;
			DisplayNameUtils.formatDisplayName = ovl_formatEmailCorrespondents.origFunctions.formatDisplayName;
			DisplayNameUtils.getCardForEmail = ovl_formatEmailCorrespondents.origFunctions.getCardForEmail;
		},

		getDisplayNameFromEmailAddressNode: function(emailAddressNode) {
			let fullAddress = "";
			if (emailAddressNode && emailAddressNode.email && emailAddressNode.email.title) {
				fullAddress = emailAddressNode.email.title;
			} else if (emailAddressNode && emailAddressNode.email && emailAddressNode.email.textContent) {
				fullAddress = emailAddressNode.email.textContent;
			}
			let address = MailServices.headerParser.parseEncodedHeaderW(fullAddress)[0];
			return address.name;
		},

		getEmailFromEmailAddressNode: function(emailAddressNode) {
			let fullAddress = "";
			if (emailAddressNode && emailAddressNode.email && emailAddressNode.email.title) {
				fullAddress = emailAddressNode.email.title;
			} else if (emailAddressNode && emailAddressNode.email && emailAddressNode.email.textContent) {
				fullAddress = emailAddressNode.email.textContent;
			}
			let address = MailServices.headerParser.parseEncodedHeaderW(fullAddress)[0];
			if (address.email.includes("@")) {
				return address.email.toLowerCase();
			}
			return "";
		},

		getIdentityKey: function() {
			var result = "";
			if (gFolder) {
				try {
					result = MailServices.accounts.getFirstIdentityForServer(gFolder.server).email;
				} catch(e) {}
			}
			return result;
		},

		addToCardBookMenuSubMenu: function(aMenuName, aCallbackFunction) {
			cardbookWindowUtils.addToCardBookMenuSubMenu(aMenuName, ovl_cardbookAboutMessage.getIdentityKey(), aCallbackFunction, {"emailHeaderNode" : "true"});
		},

		addToCardBook: function(aDirPrefId, aEmailAddress, aDisplayName) {
			try {
				let myNewCard = new cardbookCardParser();
				myNewCard.dirPrefId = aDirPrefId;
				myNewCard.email.push([[aEmailAddress], [], "", []]);
				myNewCard.fn = aDisplayName;
				if (myNewCard.fn == "") {
					myNewCard.fn = aEmailAddress.substr(0, aEmailAddress.indexOf("@")).replace("."," ").replace("_"," ");
				}
				let myDisplayNameArray = myNewCard.fn.split(" ");
				if (myDisplayNameArray.length > 1) {
					myNewCard.lastname = myDisplayNameArray[myDisplayNameArray.length - 1];
					let removed = myDisplayNameArray.splice(myDisplayNameArray.length - 1, 1);
					myNewCard.firstname = myDisplayNameArray.join(" ");
				}
				cardbookWindowUtils.openEditionWindow(myNewCard, "AddEmail");
			}
			catch (e) {
				var errorTitle = "addToCardBook";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		editOrViewContact: async function(aCard) {
			let myOutCard = new cardbookCardParser();
			await cardbookRepository.cardbookUtils.cloneCard(aCard, myOutCard);
			let type = "Contact";
			if (myOutCard.isAList) {
				type = "List";
			}
			if (cardbookRepository.cardbookPreferences.getReadOnly(myOutCard.dirPrefId)) {
				cardbookWindowUtils.openEditionWindow(myOutCard, "View" + type);
			} else {
				cardbookWindowUtils.openEditionWindow(myOutCard, "Edit" + type);
			}
		},

		deleteContact: async function(aCard) {
			await wdw_cardbook.deleteCardsAndValidate([aCard]);
		},

		hideOldAddressbook: function (aExclusive) {
			if (aExclusive) {
				document.getElementById("addToAddressBookItem").setAttribute("hidden", true);
				document.getElementById("editContactItem").setAttribute("hidden", true);
				document.getElementById("viewContactItem").setAttribute("hidden", true);
				document.getElementById("editCardBookSeparator").setAttribute("hidden", true);
			} else {
				document.getElementById("editCardBookSeparator").removeAttribute("hidden");
			}
		},
		
		hideOrShowLightningEntries: function () {
			document.getElementById("findEventsFromEmailMessenger").removeAttribute('hidden');
			if (ovl_cardbookAboutMessage.knownContacts) {
				document.getElementById("findAllEventsFromContactMessenger").removeAttribute('hidden');
			}
		},
		
		hideOrShowNewAddressbook: function (aValue) {
			ovl_cardbookAboutMessage.knownContacts = aValue;
			if (aValue) {
				document.getElementById("addToCardBookMenu").setAttribute("hidden", true);
				document.getElementById("editInCardBookMenu").removeAttribute('hidden');
				document.getElementById("deleteInCardBookMenu").removeAttribute('hidden');
				document.getElementById("findAllEmailsFromContactMessenger").removeAttribute('hidden');
			} else {
				var count = 0;
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[2] && (account[3] != "SEARCH") && !account[4]) {
						count++;
					}
				}
				if (count !== 0) {
					document.getElementById("addToCardBookMenu").removeAttribute('hidden');
				} else {
					document.getElementById("addToCardBookMenu").setAttribute("hidden", true);
				}
				document.getElementById("editInCardBookMenu").setAttribute("hidden", true);
				document.getElementById("deleteInCardBookMenu").setAttribute("hidden", true);
				document.getElementById("findAllEmailsFromContactMessenger").setAttribute("hidden", true);
			}

			document.getElementById("findEventsFromEmailMessenger").setAttribute("hidden", true);
			document.getElementById("findAllEventsFromContactMessenger").setAttribute("hidden", true);
			ovl_cardbookAboutMessage.hideOrShowLightningEntries();
		}
	};
};

(function() {
	// Keep a reference to the original function.
	ovl_cardbookAboutMessage.origFunctions.addToAddressBook = customElements.get("header-recipient").prototype.addToAddressBook;
	
	// Override a function.
	// addToAddressBook
	customElements.get("header-recipient").prototype.addToAddressBook = function() {
		let account = cardbookRepository.cardbookUtils.getFirstAvailableAccount();
		if (account != "-1") {
			ovl_cardbookAboutMessage.addToCardBook(account, this.emailAddress, this.displayName);
		} else {
			ovl_cardbookAboutMessage.origFunctions.addToAddressBook.apply(null, arguments);
		}
	};
})();

(function() {
	// Keep a reference to the original function.
	ovl_cardbookAboutMessage.origFunctions._updateAvatar = customElements.get("header-recipient").prototype._updateAvatar;
	
	// Override a function.
	// _updateAvatar
	customElements.get("header-recipient").prototype._updateAvatar = async function() {
		// update blue icons node for the from node
		// change in Thunderbird 102.3.0
		if ("undefined" == typeof(DisplayNameUtils.getCardForEmail)) {
			let cardDetails = ovl_formatEmailCorrespondents.getCardForEmail(this.emailAddress);
			this.cardDetails = cardDetails;
			let exclusive = cardbookRepository.cardbookPrefs["exclusive"];
			let hasCard = (this.cardDetails.card && this.cardDetails.card.cbid) || (!exclusive && this.cardDetails.card) ;
			this.abIndicator.classList.toggle("in-address-book", hasCard);
		}

		this.avatar.replaceChildren();

		if (!this.cardDetails.card) {
			this._createAvatarPlaceholder();
		} else {
			// We have a card, so let's try to fetch the image.
			let card = this.cardDetails.card;
			if (card.cbid) {
				let image = await cardbookIDBImage.getImage("photo", "", card.cbid, card.fn);
				if (image && image.content && image.extension) {
					let file = Services.dirsvc.get("ProfD", Components.interfaces.nsIFile);
					file.append("Photos");
					file.append(card.uid + "." + image.extension);
					await cardbookRepository.cardbookUtils.writeContentToFile(file.path, atob(image.content), "NOUTF8");
					var photoURL = Services.io.newFileURI(file).spec;
				} else {
					var photoURL = "";
				}
			} else {
				var photoURL = card.photoURL;
			}
			if (photoURL) {
				let img = document.createElement("img");
					document.l10n.setAttributes(img, "message-header-recipient-avatar", {
					address: this.emailAddress,
					});
				// TODO: We should fetch a dynamically generated smaller version of the
				// uploaded picture to avoid loading large images that will only be used
				// in smaller format.
				img.src = photoURL;
				this.avatar.appendChild(img);
				this.avatar.classList.add("has-avatar");
			} else {
				this._createAvatarPlaceholder();
			}
		}

		function colorAvatars() {
			let nodes = document.getElementById("msgHeaderView").querySelectorAll(".header-recipient");
			let exclusive = cardbookRepository.cardbookPrefs["exclusive"];
			for (let node of nodes) {
				if (node.getAttribute("data-header-name") != "from") {
					let cardDetails = ovl_formatEmailCorrespondents.getCardForEmail(node.emailAddress);
					node.cardDetails = cardDetails;
					let hasCard = (node.cardDetails.card && node.cardDetails.card.cbid) || (!exclusive && node.cardDetails.card);
					node.abIndicator.classList.toggle("in-address-book", hasCard);
				}
			}
		}

		// update blue icons node for others nodes
		// change in Thunderbird 102.3.0
		if ("undefined" == typeof(DisplayNameUtils.getCardForEmail)) {
			setTimeout(function(){ 
				colorAvatars();

				// update the MORE button
				let button = document.querySelector("button.show-more-recipients");
				if (button) {
					button.addEventListener("click", event => {
						colorAvatars();
					});
				}
			}, 200);
		}
	};
})();

(function() {
	// Keep a reference to the original function.
	ovl_cardbookAboutMessage.origFunctions.openEmailAddressPopup = gMessageHeader.openEmailAddressPopup;
	
	// Override a function.
	// gMessageHeader.openEmailAddressPopup
	gMessageHeader.openEmailAddressPopup = async function() {
		// Execute original function.
		let rv = await ovl_cardbookAboutMessage.origFunctions.openEmailAddressPopup.apply(null, arguments);

		// Execute some action afterwards.
		let exclusive = cardbookRepository.cardbookPrefs["exclusive"];
		if (arguments[1].cardDetails.card && arguments[1].cardDetails.card.cbid) {
			ovl_cardbookAboutMessage.hideOrShowNewAddressbook(true);
			let myCard = arguments[1].cardDetails.card;
			document.getElementById("editInCardBookMenu").setAttribute("cardbookId", myCard.dirPrefId+"::"+myCard.uid);
			if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
				document.getElementById('editInCardBookMenu').label=cardbookRepository.extension.localeData.localizeMessage("viewInCardBookMenuLabel");
			} else {
				document.getElementById('editInCardBookMenu').label=cardbookRepository.extension.localeData.localizeMessage("editInCardBookMenuLabel");
			}
			
			cardbookWindowUtils.addCardToIMPPMenuSubMenu(myCard, 'IMPPCardsMenuPopup');

			if (arguments[1].cardDetails.standardCard) {
				document.getElementById("addToAddressBookItem").hidden = true;
				document.getElementById("editContactItem").hidden = !arguments[1].cardDetails.standardCard || arguments[1].cardDetails.book?.readOnly;
				document.getElementById("viewContactItem").hidden = !arguments[1].cardDetails.standardCard || !arguments[1].cardDetails.book?.readOnly;
			} else {
				document.getElementById("addToAddressBookItem").hidden = false;
				document.getElementById("editContactItem").hidden = true;
				document.getElementById("viewContactItem").hidden = true;
			}
		} else {
			ovl_cardbookAboutMessage.hideOrShowNewAddressbook(false);
			cardbookWindowUtils.addCardToIMPPMenuSubMenu(null, 'IMPPCardsMenuPopup');
		}
		ovl_cardbookAboutMessage.hideOldAddressbook(exclusive);

		if (document.documentElement.getAttribute("windowtype") == "mail:messageWindow") {
			document.getElementById('findEmailsFromEmailMessenger').setAttribute('hidden', 'true');
			document.getElementById('findAllEmailsFromContactMessenger').setAttribute('hidden', 'true');
			document.getElementById('findEventsFromEmailMessenger').setAttribute('hidden', 'true');
			document.getElementById('findAllEventsFromContactMessenger').setAttribute('hidden', 'true');
			document.getElementById('findCardBookSeparator2').setAttribute('hidden', 'true');
		} else {
			document.getElementById('findEmailsFromEmailMessenger').removeAttribute('hidden');
			document.getElementById('findAllEmailsFromContactMessenger').removeAttribute('hidden');
			document.getElementById('findEventsFromEmailMessenger').removeAttribute('hidden');
			document.getElementById('findAllEventsFromContactMessenger').removeAttribute('hidden');
			document.getElementById('findCardBookSeparator2').removeAttribute('hidden');
		}
		
		// return the original result
		return rv;
	};
})();

(function() {
	// Keep a reference to the original function.
	ovl_cardbookAboutMessage.origFunctions.showContactEdit = gMessageHeader.showContactEdit;
	
	// Override a function.
	// gMessageHeader.showContactEdit
	gMessageHeader.showContactEdit = function() {
		let event = arguments[0];
		if (event.currentTarget.parentNode.headerField.cardDetails.standardCard) {
			gMessageHeader.editContact(event.currentTarget.parentNode.headerField, "standardCard");
		} else {
			gMessageHeader.editContact(event.currentTarget.parentNode.headerField);
		}
	};
})();

(function() {
	// Keep a reference to the original function.
	ovl_cardbookAboutMessage.origFunctions.editContact = gMessageHeader.editContact;
	
	// Override a function.
	// gMessageHeader.editContact
	gMessageHeader.editContact = async function() {
		if (arguments[1] == "standardCard") {
			arguments[0].cardDetails.card = arguments[0].cardDetails.standardCard;
			ovl_cardbookAboutMessage.origFunctions.editContact(arguments[0]);
		} else if (arguments[0].cardDetails.card.cbid) {
			await ovl_cardbookAboutMessage.editOrViewContact(arguments[0].cardDetails.card);
		} else {
			ovl_cardbookAboutMessage.origFunctions.editContact(arguments[0]);
		}
	};
})();

(function() {
	// Keep a reference to the original function.
	ovl_cardbookAboutMessage.origFunctions.addContact = gMessageHeader.addContact;
	
	// Override a function.
	// gMessageHeader.addContact
	gMessageHeader.addContact = function() {
		let element = arguments[0].currentTarget.parentNode.headerField;
		let card = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance(Components.interfaces.nsIAbCard);
		card.displayName = element.displayName;
		card.primaryEmail = element.emailAddress;
		let addressBook = MailServices.ab.getDirectory("jsaddrbook://abook.sqlite");
		addressBook.addCard(card);
	};
})();
