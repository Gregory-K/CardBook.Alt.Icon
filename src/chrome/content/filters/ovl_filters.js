if ("undefined" == typeof(ovl_filters)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { jsmime } = ChromeUtils.import("resource:///modules/jsmime.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_filters = {
		
		_isLocalSearch: function(aSearchScope) {
			switch (aSearchScope) {
				case Components.interfaces.nsMsgSearchScope.offlineMail:
				case Components.interfaces.nsMsgSearchScope.offlineMailFilter:
				case Components.interfaces.nsMsgSearchScope.onlineMailFilter:
				case Components.interfaces.nsMsgSearchScope.localNews:
					return true;
				default:
					return false;
				}
		},

		_addEmails: async function(aMsgHdrs, aActionValue, aField) {
			// a category might be included
			let myCategory = "";
			let mySepPosition = aActionValue.indexOf("::",0);
			if (mySepPosition != -1) {
				myCategory = aActionValue.substr(mySepPosition+2, aActionValue.length);
				aActionValue = aActionValue.substr(0, mySepPosition);
			}
			let myTopic = "emailCollectedByFilter";
			let myActionId = cardbookActions.startAction(myTopic);
			for (let msgHdr of aMsgHdrs) {
				let addresses = MailServices.headerParser.parseEncodedHeaderW(msgHdr[aField]);
				for (let address of addresses) {
					await cardbookRepository.cardbookUtils.addCardFromDisplayAndEmail(aActionValue, address.name, address.email, myCategory, myActionId);
				}
			}
			await cardbookActions.endAction(myActionId);
		},

		_removeEmails: function(aMsgHdrs, aActionValue, aField) {
			// a category might be included
			let myCategory = "";
			let mySepPosition = aActionValue.indexOf("::",0);
			if (mySepPosition != -1) {
				myCategory = aActionValue.substr(mySepPosition+2, aActionValue.length);
				aActionValue = aActionValue.substr(0, mySepPosition);
			}
			let myTopic = "emailDeletedByFilter";
			let myActionId = cardbookActions.startAction(myTopic);
			for (let msgHdr of aMsgHdrs) {
				let addresses = MailServices.headerParser.parseEncodedHeaderW(msgHdr[aField]);
				for (let address of addresses) {
					let myEmail = address.email.toLowerCase();
					if (cardbookRepository.cardbookCardEmails[aActionValue]) {
						if (cardbookRepository.cardbookCardEmails[aActionValue][myEmail]) {
							for (let k = 0; k < cardbookRepository.cardbookCardEmails[aActionValue][myEmail].length; k++) {
								let myCard = cardbookRepository.cardbookCardEmails[aActionValue][myEmail][k];
								if (myCategory != "") {
									if (myCategory == cardbookRepository.cardbookPrefs["uncategorizedCards"]) {
										if (myCard.categories == "") {
											cardbookRepository.asyncDeleteCards([myCard], myActionId);
										}
									} else {
										if (myCard.categories.includes(myCategory)) {
											cardbookRepository.asyncDeleteCards([myCard], myActionId);
										}
									}
								} else if (myCategory == "") {
									cardbookRepository.asyncDeleteCards([myCard], myActionId);
								}
							}
						}
					}
				}
			}
			cardbookActions.endAsyncAction(myActionId);
		},

		_searchEmails: function(aSearchValue, aEmail) {
			if (aSearchValue && aSearchValue != "allAddressBooks") {
				return cardbookRepository.isEmailInPrefIdRegistered(aSearchValue, aEmail);
			} else {
				return cardbookRepository.isEmailRegistered(aEmail);
			}
		},

		_matchEmails: function(aMsgHdrEmails, aSearchValue, aSearchOp) {
			let matches = false;
			let addresses = MailServices.headerParser.parseEncodedHeaderW(aMsgHdrEmails);
			let i = 0;
			for (let address of addresses) {
				switch (aSearchOp) {
					case Components.interfaces.nsMsgSearchOp.IsInAB:
					case Components.interfaces.nsMsgSearchOp.IsntInAB:
						if (i === 0) {
							if (ovl_filters._searchEmails(aSearchValue, address.email)) {
								matches = true;
							} else {
								matches = false;
							}
						} else {
							if (ovl_filters._searchEmails(aSearchValue, address.email)) {
								matches = (matches && true);
							} else {
								matches = (matches && false);
							}
						}
						break;
					default:
						Components.utils.reportError("invalid search operator : " + aSearchOp);
				}
				i++
			}
			if (aSearchOp == Components.interfaces.nsMsgSearchOp.IsntInAB) {
				return !matches;
			} else {
				return matches;
			}
		},

		onLoad: function () {
			if (cardbookRepository.filtersInitialized == true) {
				return;
			}
			var searchFrom = {
				id: "cardbook#searchFrom",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.searchFrom.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope) {
					if (!ovl_filters._isLocalSearch(scope)) {
						return [];
					}
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					return ovl_filters._matchEmails(aMsgHdr.author, aSearchValue, aSearchOp);
				}
			};
			MailServices.filters.addCustomTerm(searchFrom);

			var searchTo = {
				id: "cardbook#searchTo",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.searchTo.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope) {
					if (!ovl_filters._isLocalSearch(scope)) {
						return [];
					}
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					return ovl_filters._matchEmails(aMsgHdr.recipients, aSearchValue, aSearchOp);
				}
			};
			MailServices.filters.addCustomTerm(searchTo);

			var searchCc = {
				id: "cardbook#searchCc",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.searchCc.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope) {
					if (!ovl_filters._isLocalSearch(scope)) {
						return [];
					}
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					return ovl_filters._matchEmails(aMsgHdr.ccList, aSearchValue, aSearchOp);
				}
			};
			MailServices.filters.addCustomTerm(searchCc);

			var searchBcc = {
				id: "cardbook#searchBcc",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.searchBcc.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope) {
					if (!ovl_filters._isLocalSearch(scope)) {
						return [];
					}
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					return ovl_filters._matchEmails(aMsgHdr.bccList, aSearchValue, aSearchOp);
				}
			};
			MailServices.filters.addCustomTerm(searchBcc);

			var searchToOrCc = {
				id: "cardbook#searchToOrCc",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.searchToOrCc.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope) {
					if (!ovl_filters._isLocalSearch(scope)) {
						return [];
					}
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				// true && false => false
				// true || false => true
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					if (aSearchOp == Components.interfaces.nsMsgSearchOp.IsntInAB) {
						return (ovl_filters._matchEmails(aMsgHdr.recipients, aSearchValue, aSearchOp) &&
								ovl_filters._matchEmails(aMsgHdr.ccList, aSearchValue, aSearchOp));
					} else {
						return (ovl_filters._matchEmails(aMsgHdr.recipients, aSearchValue, aSearchOp) ||
								ovl_filters._matchEmails(aMsgHdr.ccList, aSearchValue, aSearchOp));
					}
				}
			};
			MailServices.filters.addCustomTerm(searchToOrCc);

			var searchAll = {
				id: "cardbook#searchAll",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.searchAll.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope) {
					if (!ovl_filters._isLocalSearch(scope)) {
						return [];
					}
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				// true && false => false
				// true || false => true
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					if (aSearchOp == Components.interfaces.nsMsgSearchOp.IsntInAB) {
						return (ovl_filters._matchEmails(aMsgHdr.author, aSearchValue, aSearchOp) &&
								ovl_filters._matchEmails(aMsgHdr.recipients, aSearchValue, aSearchOp) &&
								ovl_filters._matchEmails(aMsgHdr.ccList, aSearchValue, aSearchOp) &&
								ovl_filters._matchEmails(aMsgHdr.bccList, aSearchValue, aSearchOp));
					} else {
						return (ovl_filters._matchEmails(aMsgHdr.author, aSearchValue, aSearchOp) ||
								ovl_filters._matchEmails(aMsgHdr.recipients, aSearchValue, aSearchOp) ||
								ovl_filters._matchEmails(aMsgHdr.ccList, aSearchValue, aSearchOp) ||
								ovl_filters._matchEmails(aMsgHdr.bccList, aSearchValue, aSearchOp));
					}
				}
			};
			MailServices.filters.addCustomTerm(searchAll);

			var searchCorrespondents = {
				id: "cardbook#searchCorrespondents",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.searchCorrespondents.name"),
				getEnabled: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				needsBody: false,
				getAvailable: function (scope, op) {
					return ovl_filters._isLocalSearch(scope);
				},
				getAvailableOperators: function (scope) {
					if (!ovl_filters._isLocalSearch(scope)) {
						return [];
					}
					return [Components.interfaces.nsMsgSearchOp.IsInAB, Components.interfaces.nsMsgSearchOp.IsntInAB];
				},
				// true && false => false
				// true || false => true
				match: function (aMsgHdr, aSearchValue, aSearchOp) {
					if (aSearchOp == Components.interfaces.nsMsgSearchOp.IsntInAB) {
						if (cardbookRepository.isOutgoingMail(aMsgHdr)) {
							return (ovl_filters._matchEmails(aMsgHdr.recipients, aSearchValue, aSearchOp) &&
									ovl_filters._matchEmails(aMsgHdr.ccList, aSearchValue, aSearchOp) &&
									ovl_filters._matchEmails(aMsgHdr.bccList, aSearchValue, aSearchOp));
						} else {
							return ovl_filters._matchEmails(aMsgHdr.author, aSearchValue, aSearchOp);
						}
					} else {
						if (cardbookRepository.isOutgoingMail(aMsgHdr)) {
							return (ovl_filters._matchEmails(aMsgHdr.recipients, aSearchValue, aSearchOp) ||
									ovl_filters._matchEmails(aMsgHdr.ccList, aSearchValue, aSearchOp) ||
									ovl_filters._matchEmails(aMsgHdr.bccList, aSearchValue, aSearchOp));
						} else {
							return ovl_filters._matchEmails(aMsgHdr.author, aSearchValue, aSearchOp);
						}
					}
				}
			};
			MailServices.filters.addCustomTerm(searchCorrespondents);

			var addFrom = {
				id: "cardbook#addFrom",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.addFrom.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				applyAction: async function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					await ovl_filters._addEmails(aMsgHdrs, aActionValue, "author");
				},
				allowDuplicates: false,
				needsBody: false,
				isAsync: true
			};
			MailServices.filters.addCustomAction(addFrom);

			var addTo = {
				id: "cardbook#addTo",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.addTo.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				applyAction: async function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					await ovl_filters._addEmails(aMsgHdrs, aActionValue, "recipients");
				},
				allowDuplicates: false,
				needsBody: false,
				isAsync: true
			};
			MailServices.filters.addCustomAction(addTo);

			var addCc = {
				id: "cardbook#addCc",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.addCc.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				applyAction: async function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					await ovl_filters._addEmails(aMsgHdrs, aActionValue, "ccList");
				},
				allowDuplicates: false,
				needsBody: false,
				isAsync: true
			};
			MailServices.filters.addCustomAction(addCc);

			var addBcc = {
				id: "cardbook#addBcc",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.addBcc.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				applyAction: async function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					await ovl_filters._addEmails(aMsgHdrs, aActionValue, "bccList");
				},
				allowDuplicates: false,
				needsBody: false,
				isAsync: true
			};
			MailServices.filters.addCustomAction(addBcc);

			var addAll = {
				id: "cardbook#addAll",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.addAll.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				applyAction: async function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					await ovl_filters._addEmails(aMsgHdrs, aActionValue, "author");
					await ovl_filters._addEmails(aMsgHdrs, aActionValue, "recipients");
					await ovl_filters._addEmails(aMsgHdrs, aActionValue, "ccList");
					await ovl_filters._addEmails(aMsgHdrs, aActionValue, "bccList");
				},
				allowDuplicates: false,
				needsBody: false,
				isAsync: true
			};
			MailServices.filters.addCustomAction(addAll);

			var removeFrom = {
				id: "cardbook#removeFrom",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.removeFrom.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				applyAction: async function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					await ovl_filters._removeEmails(aMsgHdrs, aActionValue, "author");
				},
				allowDuplicates: false,
				needsBody: false,
				isAsync: true
			};
			MailServices.filters.addCustomAction(removeFrom);

			var removeTo = {
				id: "cardbook#removeTo",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.removeTo.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				applyAction: async function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					await ovl_filters._removeEmails(aMsgHdrs, aActionValue, "recipients");
				},
				allowDuplicates: false,
				needsBody: false,
				isAsync: true
			};
			MailServices.filters.addCustomAction(removeTo);

			var removeCc = {
				id: "cardbook#removeCc",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.removeCc.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				applyAction: async function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					await ovl_filters._removeEmails(aMsgHdrs, aActionValue, "ccList");
				},
				allowDuplicates: false,
				needsBody: false,
				isAsync: true
			};
			MailServices.filters.addCustomAction(removeCc);

			var removeBcc = {
				id: "cardbook#removeBcc",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.removeBcc.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				applyAction: async function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					await ovl_filters._removeEmails(aMsgHdrs, aActionValue, "bccList");
				},
				allowDuplicates: false,
				needsBody: false,
				isAsync: true
			};
			MailServices.filters.addCustomAction(removeBcc);

			var removeAll = {
				id: "cardbook#removeAll",
				name: cardbookRepository.extension.localeData.localizeMessage("cardbook.removeAll.name"),
				isValidForType: function(type, scope) {return true;},
				validateActionValue: function(value, folder, type) { return null;},
				applyAction: async function (aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
					await ovl_filters._removeEmails(aMsgHdrs, aActionValue, "author");
					await ovl_filters._removeEmails(aMsgHdrs, aActionValue, "recipients");
					await ovl_filters._removeEmails(aMsgHdrs, aActionValue, "ccList");
					await ovl_filters._removeEmails(aMsgHdrs, aActionValue, "bccList");
				},
				allowDuplicates: false,
				needsBody: false,
				isAsync: true
			};
			MailServices.filters.addCustomAction(removeAll);

			// insertion of a filter for marking emails from CardBook contacts as not junk
			let cardbookFilterName = cardbookRepository.extension.localeData.localizeMessage("cardbook.filterForNotJunk");
			let cardbookFilterDescOld = "#automatically inserted by CardBook for junk";
			let cardbookFilterDesc = "#automatically inserted by CardBook for junk (v2)";
			let gFilterListMsgWindow = Components.classes["@mozilla.org/messenger/msgwindow;1"].createInstance(Components.interfaces.nsIMsgWindow);
			for (let server of MailServices.accounts.allServers) {
				if (server.canHaveFilters) {
					let folder = server.rootFolder;
					let gCurrentFilterList = folder.getEditableFilterList(gFilterListMsgWindow);
					let found = false;
					let filterCount = gCurrentFilterList.filterCount;
					for (let i = 0; i < filterCount; i++) {
						let filterInserted = gCurrentFilterList.getFilterAt(i);
						if (filterInserted.filterDesc == cardbookFilterDescOld) {
							gCurrentFilterList.removeFilterAt(i);
						} else if (filterInserted.filterDesc == cardbookFilterDesc) {
							if (filterInserted.filterName.includes("??") ) {
								gCurrentFilterList.removeFilterAt(i);
							} else {
								found = true;
								break;
							}
						}
					}

					if (!found) {
						let filter = gCurrentFilterList.createFilter(cardbookFilterName);

						let term = filter.createTerm();
						term.attrib = Components.interfaces.nsMsgSearchAttrib.Custom;
						term.op = Components.interfaces.nsMsgSearchOp.IsInAB;
						term.booleanAnd = true;
						let termValue = term.value;
						termValue.attrib = term.attrib;
						termValue.str = "allAddressBooks";
						term.value = termValue;
						term.customId = "cardbook#searchFrom";
						filter.appendTerm(term);

						let filterAction = filter.createAction();
						filterAction.type = Components.interfaces.nsMsgFilterAction.JunkScore;
						filterAction.junkScore = 0;
						filter.appendAction(filterAction);

						filter.enabled = true;
						filter.filterDesc = cardbookFilterDesc;
						filter.filterType = Components.interfaces.nsMsgFilterType.PostPlugin | Components.interfaces.nsMsgFilterType.Manual;
						
						gCurrentFilterList.insertFilterAt(0, filter);
					}
				}
			}

			cardbookRepository.filtersInitialized = true;
		}
	};
};

window.document.addEventListener("DOMOverlayLoaded_cardbook@vigneau.philippe.alt.icon", function(e) { ovl_filters.onLoad(e); }, false);
