var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/cardbookWebDAV.js", this);

var EXPORTED_SYMBOLS = ["cardbookSynchronizationOffice365"];
var cardbookSynchronizationOffice365 = {
	nsMessages: "http://schemas.microsoft.com/exchange/services/2006/messages",
	nsTypes: "http://schemas.microsoft.com/exchange/services/2006/types",
	VCARD_VERSION: "3.0",
	GET_URL_SIZE: 1000,
	BATCH_GET_URL_SIZE: 1000,
	contacts: {},

	validateWithDiscovery: function(aConnection) {
		var listener_validate = {
			onDAVQueryComplete: async function(status, responseXML) {
				if (responseXML && (status > 199 && status < 400)) {
					let responseState = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsMessages, "FindFolderResponseMessage");
					if (responseState[0].getAttribute("ResponseClass") == "Success") {
						let contactsFolder = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "ContactsFolder");
						for (let i = 0; i < contactsFolder.length; i++) {
							let folderId = contactsFolder[i].getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "FolderId");
							let uid = folderId[0].getAttribute("Id");
							let displayName = contactsFolder[i].getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "DisplayName");
							cardbookRepository.cardbookServerValidation[aConnection.connPrefId]['length']++;
							cardbookRepository.cardbookServerValidation[aConnection.connPrefId][uid] = {}
							cardbookRepository.cardbookServerValidation[aConnection.connPrefId][uid].displayName = displayName[0].textContent;
							cardbookRepository.cardbookServerValidation[aConnection.connPrefId][uid].id = uid;
							cardbookRepository.cardbookServerValidation[aConnection.connPrefId][uid].url = aConnection.connUrl;
							cardbookRepository.cardbookServerValidation[aConnection.connPrefId][uid].forget = false;
						}
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
					}
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "validateWithoutDiscovery", aConnection.connUrl, status], "Error");
					cardbookRepository.cardbookServerDiscoveryError[aConnection.connPrefId]++;
				}
				cardbookRepository.cardbookServerDiscoveryResponse[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
			}
		};
		cardbookRepository.cardbookServerDiscoveryRequest[aConnection.connPrefId]++;
		cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationRequestDiscovery", [aConnection.connDescription, aConnection.connUrl]);
		let request = new cardbookWebDAV(aConnection, listener_validate, "", false);
		let data = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + 
					"<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:m=\"http://schemas.microsoft.com/exchange/services/2006/messages\" xmlns:t=\"http://schemas.microsoft.com/exchange/services/2006/types\">" +
						"<soap:Header>" +
							"<t:RequestServerVersion Version=\"Exchange2010_SP1\"/>" +
						"</soap:Header>" +
						"<soap:Body>" +
							"<m:FindFolder Traversal=\"Deep\">" +
								"<m:FolderShape>" +
									"<t:BaseShape>Default</t:BaseShape>" +
									"<t:AdditionalProperties>" +
										"<t:FieldURI FieldURI=\"folder:DisplayName\"/>" +
									"</t:AdditionalProperties>" +
								"</m:FolderShape>" +
								"<m:IndexedPageFolderView BasePoint=\"Beginning\" Offset=\"0\"/>" +
								"<m:ParentFolderIds>" +
									"<t:DistinguishedFolderId Id=\"msgfolderroot\"/>" +
								"</m:ParentFolderIds>" +
							"</m:FindFolder>" +
						"</soap:Body>" +
					"</soap:Envelope>";
		request.post(data);
	},

	office365SyncContactsInit: function (aConnection) {
		cardbookSynchronizationOffice365.contacts[aConnection.connPrefId] = {};
		cardbookSynchronizationOffice365.office365SyncContacts(aConnection);
	},

	office365SyncContacts: function(aConnection, aOffset) {
		var listener_getContacts = {
			onDAVQueryComplete: async function(status, responseXML, askCertificate) {
				if (responseXML && (status > 199 && status < 400)) {
					cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aConnection.connPrefId] = cardbookSynchronization.getCardsNumber(aConnection.connPrefId);
					let responseState = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsMessages, "FindItemResponseMessage");
					if (responseState[0].getAttribute("ResponseClass") == "Success") {
						let contacts = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "ItemId");
						let url = cardbookRepository.cardbookPreferences.getUrl(aConnection.connPrefId);
						for (let i = 0; i < contacts.length; i++) {
							let uid = contacts[i].getAttribute("Id");
							let etag = contacts[i].getAttribute("ChangeKey");
							let href = url + "/" + uid;
							if (typeof cardbookSynchronizationOffice365.contacts[aConnection.connPrefId][uid] == "undefined") {
								cardbookSynchronizationOffice365.contacts[aConnection.connPrefId][uid] = { href: href, etag: etag};
								cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
								cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal[aConnection.connPrefId]++;
							}
						}
						let IncludesLastItemInRange = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsMessages, "RootFolder")[0].getAttribute("IncludesLastItemInRange");
						if (IncludesLastItemInRange == "true") {
							for (let uid in cardbookSynchronizationOffice365.contacts[aConnection.connPrefId]) {
								let card = cardbookSynchronizationOffice365.contacts[aConnection.connPrefId][uid];
								let aCardConnection = {connPrefId: aConnection.connPrefId, connUrl: url, connDescription: aConnection.connDescription,
														connUser: aConnection.connUser};
								await cardbookSynchronizationOffice365.compareServerCardWithCache(aCardConnection, uid, card.etag, uid);
								if (cardbookRepository.cardbookCardsFromCache[aCardConnection.connPrefId][uid]) {
									delete cardbookRepository.cardbookCardsFromCache[aCardConnection.connPrefId][uid];
									cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aCardConnection.connPrefId]--;
								}
							}
							await cardbookSynchronizationOffice365.handleRemainingCardCache(aConnection);
						} else {
							let nextOffset = cardbookSynchronizationOffice365.GET_URL_SIZE;
							if (aOffset != null) {
								nextOffset = aOffset + +cardbookSynchronizationOffice365.GET_URL_SIZE;
							}
							cardbookRepository.cardbookServerSyncRequest[aConnection.connPrefId]++;
							cardbookSynchronizationOffice365.office365SyncContacts(aConnection, nextOffset)
						}
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					} else {
						cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "office365SyncContacts", aConnection.connUrl, status], "Error");
						cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aConnection.connPrefId] = cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aConnection.connPrefId];
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] = cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId];
					}
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [aConnection.connDescription, "office365SyncContacts", aConnection.connUrl, status], "Error");
					cardbookRepository.cardbookServerCardSyncError[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aConnection.connPrefId] = cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aConnection.connPrefId];
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] = cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId];
				}
			}
		};
		cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationSearchingCards", [aConnection.connDescription]);
		let request = new cardbookWebDAV(aConnection, listener_getContacts, "", false);
		let offset = 0;
		if (aOffset != null) {
			offset = aOffset;
		}
		let sourceId = cardbookRepository.cardbookPreferences.getSourceId(aConnection.connPrefId);
		let data = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + 
					"<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:m=\"http://schemas.microsoft.com/exchange/services/2006/messages\" xmlns:t=\"http://schemas.microsoft.com/exchange/services/2006/types\">" +
						"<soap:Header>" +
							"<t:RequestServerVersion Version=\"Exchange2013\"/>" +
							"<t:TimeZoneContext>" +
								"<t:TimeZoneDefinition Id=\"UTC\"/>" +
							"</t:TimeZoneContext>" +
						"</soap:Header>" +
						"<soap:Body>" +
							"<m:FindItem Traversal=\"Shallow\">" +
								"<m:ItemShape>" +
									"<t:BaseShape>IdOnly</t:BaseShape>" +
								"</m:ItemShape>" +
								"<m:IndexedPageItemView BasePoint=\"Beginning\" MaxEntriesReturned=\"" + cardbookSynchronizationOffice365.GET_URL_SIZE + "\" Offset=\"" + offset + "\"/>" +
								"<m:ParentFolderIds>" +
									// "<t:DistinguishedFolderId Id=\"contacts\"/>" +
									"<t:FolderId Id=\"" + sourceId + "\"/>" +
								"</m:ParentFolderIds>" +
							"</m:FindItem>" +
						"</soap:Body>" +
					"</soap:Envelope>";
		request.getOffice365Contacts(data);
	},

	compareServerCardWithCache: async function (aCardConnection, aUrl, aEtag, aId) {
		if (cardbookRepository.cardbookFileCacheCards[aCardConnection.connPrefId] && cardbookRepository.cardbookFileCacheCards[aCardConnection.connPrefId][aUrl]) {
			var myCacheCard = cardbookRepository.cardbookFileCacheCards[aCardConnection.connPrefId][aUrl];
			var myServerCard = new cardbookCardParser();
			await cardbookRepository.cardbookUtils.cloneCard(myCacheCard, myServerCard);
			cardbookRepository.cardbookUtils.addEtag(myServerCard, aEtag);
			if (myCacheCard.etag == aEtag) {
				if (myCacheCard.deleted) {
					// "DELETEDONDISK";
					cardbookRepository.cardbookServerDeletedCardRequest[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncDeletedCardOnDisk[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("cardDeletedOnDisk", [aCardConnection.connDescription, myCacheCard.fn]);
					cardbookSynchronizationOffice365.serverDeleteCard(aCardConnection, myCacheCard);
				} else if (myCacheCard.updated) {
					// "UPDATEDONDISK";
					cardbookRepository.cardbookServerUpdatedCardRequest[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncUpdatedCardOnDisk[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdatedOnDisk", [aCardConnection.connDescription, myCacheCard.fn]);
					cardbookSynchronizationOffice365.serverUpdateCard(aCardConnection, myCacheCard);
				} else {
					// "NOTUPDATED";
					cardbookRepository.cardbookUtils.formatStringForOutput("cardAlreadyGetFromCache", [aCardConnection.connDescription, myCacheCard.fn]);
					cardbookRepository.cardbookServerCardSyncDone[aCardConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncNotUpdatedCard[aCardConnection.connPrefId]++;
				}
			} else if (myCacheCard.deleted) {
				// "DELETEDONDISKUPDATEDONSERVER";
				cardbookRepository.cardbookServerSyncDeletedCardOnDiskUpdatedCardOnServer[aCardConnection.connPrefId]++;
				cardbookRepository.cardbookUtils.formatStringForOutput("cardDeletedOnDiskUpdatedOnServer", [aCardConnection.connDescription, myCacheCard.fn]);
				var solveConflicts = cardbookRepository.cardbookPrefs["solveConflicts"];
				if (solveConflicts === "Local") {
					var conflictResult = "delete";
				} else if (solveConflicts === "Remote") {
					var conflictResult = "keep";
				} else {
					var message = cardbookRepository.extension.localeData.localizeMessage("cardDeletedOnDiskUpdatedOnServer", [aCardConnection.connDescription, myCacheCard.fn]);
					var conflictResult = await cardbookRepository.cardbookSynchronization.askUser("card", aCardConnection.connPrefId, message, cardbookRepository.importConflictChoiceSync1Values);
				}
				
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aCardConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
				switch (conflictResult) {
					case "keep":
						await cardbookRepository.removeCardFromRepository(myCacheCard, true);
						cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push([aId, aEtag]);
						break;
					case "delete":
						cardbookRepository.cardbookServerDeletedCardRequest[aCardConnection.connPrefId]++;
						cardbookSynchronizationOffice365.serverDeleteCard(aCardConnection, myCacheCard);
						break;
					default:
						cardbookRepository.cardbookServerCardSyncDone[aCardConnection.connPrefId]++;
						break;
				}
			} else if (myCacheCard.updated) {
				// "UPDATEDONBOTH";
				cardbookRepository.cardbookServerSyncUpdatedCardOnBoth[aCardConnection.connPrefId]++;
				cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdatedOnBoth", [aCardConnection.connDescription, myCacheCard.fn]);
				var solveConflicts = cardbookRepository.cardbookPrefs["solveConflicts"];
				if (solveConflicts === "Local") {
					var conflictResult = "local";
				} else if (solveConflicts === "Remote") {
					var conflictResult = "remote";
				} else {
					var message = cardbookRepository.extension.localeData.localizeMessage("cardUpdatedOnBoth", [aCardConnection.connDescription, myCacheCard.fn]);
					var conflictResult = await cardbookRepository.cardbookSynchronization.askUser("card", aCardConnection.connPrefId, message, cardbookRepository.importConflictChoiceSync2Values);
				}
				
				cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aCardConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
				switch (conflictResult) {
					case "local":
						cardbookRepository.cardbookServerUpdatedCardRequest[aCardConnection.connPrefId]++;
						cardbookSynchronizationOffice365.serverUpdateCard(aCardConnection, myCacheCard);
						break;
					case "remote":
						cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push([aId, aEtag]);
						break;
					case "merge":
						cardbookRepository.cardbookServerGetCardForMergeRequest[aCardConnection.connPrefId]++;
						cardbookSynchronizationOffice365.serverGetForMerge(aCardConnection, aEtag, myCacheCard);
						break;
					default:
						cardbookRepository.cardbookServerCardSyncDone[aCardConnection.connPrefId]++;
						break;
				}
			} else {
				// "UPDATEDONSERVER";
				cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push([aId, aEtag]);
				cardbookRepository.cardbookServerSyncUpdatedCardOnServer[aCardConnection.connPrefId]++;
				cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdatedOnServer", [aCardConnection.connDescription, myCacheCard.fn, aEtag, myCacheCard.etag]);
			}
		} else {
			// "NEWONSERVER";
			cardbookRepository.cardbookServerMultiGetArray[aCardConnection.connPrefId].push([aId, aEtag]);
			cardbookRepository.cardbookServerSyncNewCardOnServer[aCardConnection.connPrefId]++;
			cardbookRepository.cardbookUtils.formatStringForOutput("cardNewOnServer", [aCardConnection.connDescription]);
		}
		cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aCardConnection.connPrefId]++;
	},

	handleRemainingCardCache: async function (aConnection) {
		if (cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId]) {
			for (var i in cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId]) {
				var aCard = cardbookRepository.cardbookCardsFromCache[aConnection.connPrefId][i];
				if (aCard.created) {
					// "NEWONDISK";
					cardbookRepository.cardbookUtils.formatStringForOutput("cardNewOnDisk", [aConnection.connDescription, aCard.fn]);
					cardbookRepository.cardbookServerCreatedCardRequest[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncNewCardOnDisk[aConnection.connPrefId]++;
					var aCreateConnection = JSON.parse(JSON.stringify(aConnection));
					cardbookSynchronizationOffice365.serverCreateCard(aCreateConnection, aCard);
				} else if (aCard.updated) {
					// "UPDATEDONDISKDELETEDONSERVER";
					cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdatedOnDiskDeletedOnServer", [aConnection.connDescription, aCard.fn]);
					cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncUpdatedCardOnDiskDeletedCardOnServer[aConnection.connPrefId]++;
					var solveConflicts = cardbookRepository.cardbookPrefs["solveConflicts"];
					if (solveConflicts === "Local") {
						var conflictResult = "keep";
					} else if (solveConflicts === "Remote") {
						var conflictResult = "delete";
					} else {
						var message = cardbookRepository.extension.localeData.localizeMessage("cardUpdatedOnDiskDeletedOnServer", [aConnection.connDescription, aCard.fn]);
						var conflictResult = await cardbookRepository.cardbookSynchronization.askUser("card", aConnection.connPrefId, message, cardbookRepository.importConflictChoiceSync1Values);
					}
					
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(aConnection.connDescription + " : debug mode : conflict resolution : ", conflictResult);
					switch (conflictResult) {
						case "keep":
							cardbookRepository.cardbookServerCreatedCardRequest[aConnection.connPrefId]++;
							var aCreateConnection = JSON.parse(JSON.stringify(aConnection));
							cardbookRepository.cardbookUtils.nullifyEtag(aCard);
							cardbookSynchronizationOffice365.serverCreateCard(aCreateConnection, aCard);
							break;
						case "delete":
							await cardbookRepository.removeCardFromRepository(aCard, true);
							cardbookRepository.cardbookServerGetCardRequest[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerGetCardResponse[aConnection.connPrefId]++;
							cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
							break;
						default:
							cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
							break;
					}
				} else if (!aCard.deleted) {
					// "DELETEDONSERVER";
					cardbookRepository.cardbookServerCardSyncTotal[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("cardDeletedOnServer", [aConnection.connDescription, aCard.fn]);
					await cardbookRepository.removeCardFromRepository(aCard, true);
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerSyncDeletedCardOnServer[aConnection.connPrefId]++;
				}
				cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aConnection.connPrefId]++;
			}
		}
	},
	
	getDataForContacts: function(aArrayOfContacts) {
		// aArrayOfContacts : [ [id1, etag1], [id2, etag2], ...]
		let data = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + 
					"<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:m=\"http://schemas.microsoft.com/exchange/services/2006/messages\" xmlns:t=\"http://schemas.microsoft.com/exchange/services/2006/types\">" +
						"<soap:Header>" +
							"<t:RequestServerVersion Version=\"Exchange2013\"/>" +
							"<t:TimeZoneContext>" +
								"<t:TimeZoneDefinition Id=\"UTC\"/>" +
							"</t:TimeZoneContext>" +
						"</soap:Header>" +
						"<soap:Body>" +
							"<m:GetItem>" +
								"<m:ItemShape>" +
									// "<t:BaseShape>AllProperties</t:BaseShape>" +
									"<t:BaseShape>IdOnly</t:BaseShape>" +
									"<t:AdditionalProperties>" +
										"<t:FieldURI FieldURI=\"contacts:DisplayName\"/>" +
										"<t:FieldURI FieldURI=\"contacts:CompleteName\"/>" +
										"<t:FieldURI FieldURI=\"contacts:Birthday\"/>" +
										// Notes
										"<t:FieldURI FieldURI=\"item:Body\"/>" +
										// Photo
										"<t:FieldURI FieldURI=\"item:Attachments\"/>" +
										"<t:FieldURI FieldURI=\"distributionlist:Members\"/>" +
										"<t:FieldURI FieldURI=\"item:Categories\"/>" +
										"<t:FieldURI FieldURI=\"contacts:CompanyName\"/>" +
										"<t:FieldURI FieldURI=\"contacts:Department\"/>" +
										"<t:FieldURI FieldURI=\"contacts:Profession\"/>" +
										"<t:FieldURI FieldURI=\"contacts:JobTitle\"/>" +
										//  BusinessHomePage does not work
										"<t:FieldURI FieldURI=\"contacts:BusinessHomePage\"/>";
										// Custom fields
			for (let type of ["personal", "org"]) {
				for (let custom of cardbookRepository.customFields[type]) {
					data = data +
										"<t:ExtendedFieldURI DistinguishedPropertySetId=\"PublicStrings\" PropertyName=\"" + custom[0] + "\" PropertyType=\"String\"/>";
				}
			}
			data = data +
										//  OtherPhone2 does not work
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"AssistantPhone\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"BusinessFax\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"BusinessPhone\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"BusinessPhone2\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"Callback\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"CarPhone\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"CompanyMainPhone\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"HomeFax\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"HomePhone\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"HomePhone2\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"MobilePhone\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"OtherFax\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"OtherTelephone\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"Pager\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"RadioPhone\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"Telex\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhoneNumber\" FieldIndex=\"TtyTddPhone\"/>" +

										"<t:IndexedFieldURI FieldURI=\"contacts:EmailAddress\" FieldIndex=\"EmailAddress1\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:EmailAddress\" FieldIndex=\"EmailAddress2\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:EmailAddress\" FieldIndex=\"EmailAddress3\"/>" +

										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:Street\" FieldIndex=\"Home\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:City\" FieldIndex=\"Home\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:State\" FieldIndex=\"Home\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:PostalCode\" FieldIndex=\"Home\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:CountryOrRegion\" FieldIndex=\"Home\"/>" +

										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:Street\" FieldIndex=\"Business\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:City\" FieldIndex=\"Business\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:State\" FieldIndex=\"Business\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:PostalCode\" FieldIndex=\"Business\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:CountryOrRegion\" FieldIndex=\"Business\"/>" +

										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:Street\" FieldIndex=\"Other\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:City\" FieldIndex=\"Other\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:State\" FieldIndex=\"Other\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:PostalCode\" FieldIndex=\"Other\"/>" +
										"<t:IndexedFieldURI FieldURI=\"contacts:PhysicalAddress:CountryOrRegion\" FieldIndex=\"Other\"/>" +

										"<t:IndexedFieldURI FieldURI=\"contacts:ImAddress\" FieldIndex=\"ImAddress1\"/>" +
									"</t:AdditionalProperties>" +
								"</m:ItemShape>" +
								"<m:ItemIds>";
			for (let line of aArrayOfContacts) {
			data = data +
									"<t:ItemId Id=\"" + line[0] + "\" ChangeKey=\"" + line[1] + "\"/>";
			}
			data = data +
								"</m:ItemIds>" +
							"</m:GetItem>" +
						"</soap:Body>" +
					"</soap:Envelope>";
		return data;
	},

	serverGetForMerge: function(aConnection, aEtag, aCacheCard) {
		async function mergeContactOK(aCard) {
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, aCacheCard.fn]);
			await cardbookRepository.mergeCardsFromSync(aCacheCard, aCard, aConnection, aEtag, "SYNC");
		};
		function mergeContactKO(aStatus) {
			cardbookRepository.cardbookServerGetCardForMergeError[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerGetCardForMergeResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, aStatus], "Error");
		};
		var listener_get = {
			onDAVQueryComplete: async function(status, responseXML) {
				if (responseXML && (status > 199 && status < 400)) {
					let responseState = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsMessages, "GetItemResponseMessage");
					if (responseState[0].getAttribute("ResponseClass") == "Success") {
						let office365Contact;
						if (aCacheCard.isAList) {
							office365Contact = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "DistributionList")[0];
						} else {
							office365Contact = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Contact")[0];
						}
						let myCard = cardbookSynchronizationOffice365.parseOffice365ContactToCard(office365Contact, aConnection.connPrefId);
						
						if (myCard.photo.attachmentId) {
							cardbookSynchronizationOffice365.serverGetCardPhoto(aConnection, myCard, mergeContactOK, mergeContactKO);
						} else {
							await mergeContactOK(myCard);
						}
					} else {
						mergeContactKO(status);
					}
				} else {
					mergeContactKO(status);
				}
			}
		};
		let data = cardbookSynchronizationOffice365.getDataForContacts([ [aCacheCard.uid, aCacheCard.etag] ]);
		let request = new cardbookWebDAV(aConnection, listener_get, "", false);
		request.getOffice365Contact(data);
	},

	serverMultiGet: function(aConnection) {
		var listener_multiget = {
			onDAVQueryComplete: async function(status, responseXML, askCertificate, etagDummy, length) {
				if (responseXML && (status > 199 && status < 400)) {
					let responses = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsMessages, "GetItemResponseMessage");
					for (let response of responses) {
						if (response.getAttribute("ResponseClass") == "Success") {
							let found = false;
							let contacts = response.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Contact");
							for (let contact of contacts) {
								let myCard = cardbookSynchronizationOffice365.parseOffice365ContactToCard(contact, aConnection.connPrefId);
								if (myCard.photo.attachmentId) {
									cardbookRepository.cardbookServerGetCardPhotoRequest[aConnection.connPrefId]++;
									cardbookSynchronizationOffice365.serverGetCardPhoto(aConnection, myCard);
								} else {
									if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid]) {
										let myOldCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid];
										await cardbookRepository.removeCardFromRepository(myOldCard, true);
									}
									await cardbookRepository.addCardToRepository(myCard, true);
									cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, myCard.fn]);
									cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
								}
								found = true;
							}
							let lists = response.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "DistributionList");
							for (let list of lists) {
								let myCard = cardbookSynchronizationOffice365.parseOffice365ContactToCard(list, aConnection.connPrefId);
								if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid]) {
									let myOldCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+myCard.uid];
									await cardbookRepository.removeCardFromRepository(myOldCard, true);
								}
								await cardbookRepository.addCardToRepository(myCard, true);
								cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetOK", [aConnection.connDescription, myCard.fn]);
								cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
								found = true;
							}
							if (!found) {
								cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
							}
						} else {
								cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] = cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] + length;
								cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId] = cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId] + length;
								cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
						}
					}
				} else {
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] = cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId] + length;
					cardbookRepository.cardbookServerMultiGetError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetFailed", [aConnection.connDescription, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerMultiGetResponse[aConnection.connPrefId]++;
			}
		};
		let multiget = cardbookSynchronizationOffice365.BATCH_GET_URL_SIZE;
		for (var i = 0; i < cardbookRepository.cardbookServerMultiGetArray[aConnection.connPrefId].length; i = i + +multiget) {
			let subArray = cardbookRepository.cardbookServerMultiGetArray[aConnection.connPrefId].slice(i, i + +multiget);
			let data = cardbookSynchronizationOffice365.getDataForContacts(subArray);
			let request = new cardbookWebDAV(aConnection, listener_multiget, "", false);
			cardbookRepository.cardbookServerMultiGetRequest[aConnection.connPrefId]++;
			request.multigetOffice365Contacts(data, subArray.length);
		}
	},

	serverDeleteCard: function(aConnection, aCard) {
		var listener_delete = {
			onDAVQueryComplete: async function(status, responseXML) {
				if (status > 199 && status < 400) {
					let responseState = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsMessages, "DeleteItemResponseMessage");
					if (responseState[0].getAttribute("ResponseClass") == "Success") {
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardDeletedFromServer", [aConnection.connDescription, aCard.fn]);
						if (aCard.photo.attachmentId) {
							cardbookRepository.cardbookServerUpdatedCardPhotoRequest[aConnection.connPrefId]++;
							cardbookSynchronizationOffice365.serverDeleteCardPhoto(aConnection, aCard);
						}
						await cardbookRepository.removeCardFromRepository(aCard, true);
					} else if (responseState[0].getAttribute("ResponseClass") == "Error") {
						let responseCode = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsMessages, "ResponseCode");
						if (responseCode[0].textContent == "ErrorItemNotFound") {
							cardbookRepository.cardbookUtils.formatStringForOutput("serverCardNotExistServer", [aConnection.connDescription, aCard.fn]);
							if (aCard.photo.attachmentId) {
								cardbookSynchronizationOffice365.serverDeleteCardPhoto(aConnection, aCard);
							}
							await cardbookRepository.removeCardFromRepository(aCard, true);
						} else {
							cardbookRepository.cardbookServerDeletedCardError[aConnection.connPrefId]++;
							cardbookRepository.cardbookUtils.formatStringForOutput("serverCardDeleteFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");		
						}
					} else {
						cardbookRepository.cardbookServerDeletedCardError[aConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardDeleteFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");		
					}
				} else {
					cardbookRepository.cardbookServerDeletedCardError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardDeleteFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerDeletedCardResponse[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			let data = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + 
						"<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:m=\"http://schemas.microsoft.com/exchange/services/2006/messages\" xmlns:t=\"http://schemas.microsoft.com/exchange/services/2006/types\">" +
							"<soap:Header>" +
								"<t:RequestServerVersion Version=\"Exchange2013\"/>" +
							"</soap:Header>" +
							"<soap:Body>" +
								"<m:DeleteItem DeleteType=\"MoveToDeletedItems\">" +
									"<m:ItemIds>" + 
										"<t:ItemId Id=\"" + aCard.uid + "\" ChangeKey=\"" + aCard.etag + "\"/>" +
									"</m:ItemIds>" +
								"</m:DeleteItem>" +
							"</soap:Body>" +
						"</soap:Envelope>";
			let request = new cardbookWebDAV(aConnection, listener_delete, aCard.etag, false);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingDeletion", [aConnection.connDescription, aCard.fn]);
			request.deleteOffice365Contacts(data);
		} else {
			cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerDeletedCardResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverUpdateCard: function(aConnection, aCard) {
		var listener_update = {
			onDAVQueryComplete: async function(status, responseXML) {
				if (status > 199 && status < 400) {
					let responseState = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsMessages, "UpdateItemResponseMessage");
					if (responseState[0].getAttribute("ResponseClass") == "Success") {
						let contact = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "ItemId");
						let etag = contact[0].getAttribute("ChangeKey");
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdatedOnServerWithEtag", [aConnection.connDescription, aCard.fn, etag]);
						cardbookRepository.cardbookUtils.addEtag(aCard, etag);
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						await cardbookRepository.cardbookUtils.changeMediaFromFileToContent(aCard);
						if (aCard.photo.value) {
							cardbookRepository.cardbookUtils.addTagUpdated(aCard);
							cardbookRepository.cardbookServerUpdatedCardPhotoRequest[aConnection.connPrefId]++;
							cardbookSynchronizationOffice365.serverUpdateCardPhoto(aConnection, aCard);
						} else if (aCard.photo.attachmentId) {
							cardbookRepository.cardbookServerUpdatedCardPhotoRequest[aConnection.connPrefId]++;
							cardbookSynchronizationOffice365.serverDeleteCardPhoto(aConnection, aCard);
							if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid]) {
								let myOldCard = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
								await cardbookRepository.removeCardFromRepository(myOldCard, true);
							}
							cardbookRepository.cardbookUtils.nullifyTagModification(aCard);
							await cardbookRepository.addCardToRepository(aCard, true);
						} else {
							if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid]) {
								let myOldCard = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
								await cardbookRepository.removeCardFromRepository(myOldCard, true);
							}
							cardbookRepository.cardbookUtils.nullifyTagModification(aCard);
							await cardbookRepository.addCardToRepository(aCard, true);
						}
					} else {
						cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
						cardbookRepository.cardbookServerUpdatedCardError[aConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
					}
				} else {
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerUpdatedCardError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerUpdatedCardResponse[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			let item = aCard.isAList ? cardbookSynchronizationOffice365.parseCardToOffice365UpdateDistributionList(aCard) :
							cardbookSynchronizationOffice365.parseCardToOffice365UpdateContact(aCard);
			let data = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + 
						"<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:m=\"http://schemas.microsoft.com/exchange/services/2006/messages\" xmlns:t=\"http://schemas.microsoft.com/exchange/services/2006/types\">" +
							"<soap:Header>" +
								"<t:RequestServerVersion Version=\"Exchange2013\"/>" +
							"</soap:Header>" +
							"<soap:Body>" +
								"<m:UpdateItem ConflictResolution=\"AlwaysOverwrite\">" +
									"<m:ItemChanges>" +
										item +
									"</m:ItemChanges>" +
								"</m:UpdateItem>" +
							"</soap:Body>" +
						"</soap:Envelope>";
			let request = new cardbookWebDAV(aConnection, listener_update, aCard.etag, false);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingUpdate", [aConnection.connDescription, aCard.fn]);
			request.updateOffice365Contacts(data);
		} else {
			cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerUpdatedCardResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverCreateCard: function(aConnection, aCard) {
		var listener_create = {
			onDAVQueryComplete: async function(status, responseXML) {
				if (status > 199 && status < 400) {
					let responseState = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsMessages, "CreateItemResponseMessage");
					if (responseState[0].getAttribute("ResponseClass") == "Success") {
						let contact = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "ItemId");
						let uid = contact[0].getAttribute("Id");
						let etag = contact[0].getAttribute("ChangeKey");
						await cardbookRepository.cardbookUtils.changeMediaFromFileToContent(aCard);
						let newCard = new cardbookCardParser();
						await cardbookRepository.cardbookUtils.cloneCard(aCard, newCard);
						newCard.uid = uid;
						newCard.cardurl = uid;
						cardbookRepository.cardbookUtils.addEtag(newCard, etag);
						cardbookRepository.cardbookUtils.setCalculatedFields(newCard);
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardCreatedOnServerWithEtag", [aConnection.connDescription, newCard.fn, etag]);
						if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid]) {
							var myOldCard = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
							await cardbookRepository.removeCardFromRepository(myOldCard, true);
						}
						cardbookRepository.cardbookUtils.nullifyTagModification(newCard);
						await cardbookRepository.addCardToRepository(newCard, true);
						await cardbookRepository.cardbookUtils.changeMediaFromFileToContent(newCard);
						if (newCard.photo.value) {
							cardbookRepository.cardbookUtils.addTagUpdated(newCard);
							cardbookRepository.cardbookServerUpdatedCardPhotoRequest[aConnection.connPrefId]++;
							cardbookSynchronizationOffice365.serverUpdateCardPhoto(aConnection, newCard);
						}
					} else {
						cardbookRepository.cardbookServerCreatedCardError[aConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardCreateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
					}
				} else {
					cardbookRepository.cardbookServerCreatedCardError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardCreateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerCreatedCardResponse[aConnection.connPrefId]++;
				cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			let item = aCard.isAList ? cardbookSynchronizationOffice365.parseCardToOffice365CreateDistributionList(aCard) :
							cardbookSynchronizationOffice365.parseCardToOffice365CreateContact(aCard);
			let data = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + 
						"<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:m=\"http://schemas.microsoft.com/exchange/services/2006/messages\" xmlns:t=\"http://schemas.microsoft.com/exchange/services/2006/types\">" +
							"<soap:Header>" +
								"<t:RequestServerVersion Version=\"Exchange2013\"/>" +
							"</soap:Header>" +
							"<soap:Body>" +
								"<m:CreateItem>" +
									"<m:Items>" +
										item +
									"</m:Items>" +
								"</m:CreateItem>" +
							"</soap:Body>" +
						"</soap:Envelope>";
			let request = new cardbookWebDAV(aConnection, listener_create, aCard.etag, false);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingCreate", [aConnection.connDescription, aCard.fn]);
			request.createOffice365Contacts(data);
		} else {
			cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerCreatedCardResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverGetCardPhoto: function(aConnection, aCard, aCallBackOK, aCallBackKO) {
		var listener_getPhoto = {
			onDAVQueryComplete: async function(status, responseXML) {
				if (status > 199 && status < 400) {
					let responseState = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsMessages, "GetAttachmentResponseMessage");
					if (responseState[0].getAttribute("ResponseClass") == "Success") {
						let content = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Content");
						let value = content[0].textContent;
						aCard.photo.value = value;
						if (aCallBackOK) {
							await aCallBackOK(aCard);
						} else {
							if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid]) {
								let myOldCard = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
								await cardbookRepository.removeCardFromRepository(myOldCard, true);
							}
							await cardbookRepository.addCardToRepository(aCard, true);
							cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetImageOK", [aConnection.connDescription, aCard.fn]);
						}
					} else {
						if (aCallBackKO) {
							aCallBackKO(status);
						} else {
							cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId]++;
							cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetImageFailed", [aConnection.connDescription, aCard.fn,  aConnection.connUrl, status]);
						}
					}
				} else {
					if (aCallBackKO) {
						aCallBackKO(status);
					} else {
						cardbookRepository.cardbookServerGetCardError[aConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGetImageFailed", [aConnection.connDescription, aCard.fn,  aConnection.connUrl, status]);
					}
				}
				if (!aCallBackKO) {
					cardbookRepository.cardbookServerGetCardPhotoResponse[aConnection.connPrefId]++;
					cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
				}
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			let data = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + 
						"<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:m=\"http://schemas.microsoft.com/exchange/services/2006/messages\" xmlns:t=\"http://schemas.microsoft.com/exchange/services/2006/types\">" +
							"<soap:Header>" +
								"<t:RequestServerVersion Version=\"Exchange2013\"/>" +
							"</soap:Header>" +
							"<soap:Body>" +
								"<m:GetAttachment>" +
									"<m:AttachmentShape/>" +
									"<m:AttachmentIds>" +
										"<t:AttachmentId Id=\"" + aCard.photo.attachmentId + "\"/>" + 
									"</m:AttachmentIds>" +
								"</m:GetAttachment>" +
							"</soap:Body>" +
						"</soap:Envelope>";
			let request = new cardbookWebDAV(aConnection, listener_getPhoto, aCard.etag, false);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardGettingImage", [aConnection.connDescription, aCard.fn]);
			request.getOffice365ContactPhoto(data);
		} else {
			cardbookRepository.cardbookServerCardSyncDone[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerGetCardPhotoResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverUpdateCardPhoto: function(aConnection, aCard) {
		var listener_createphoto = {
			onDAVQueryComplete: async function(status, responseXML) {
				if (status > 199 && status < 400) {
					let responseState = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsMessages, "CreateAttachmentResponseMessage");
					if (responseState[0].getAttribute("ResponseClass") == "Success") {
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdatedOnServerWithEtag", [aConnection.connDescription, aCard.fn, aCard.etag]);
						let content = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "AttachmentId");
						let attachmentId = content[0].getAttribute("Id");
						aCard.photo.attachmentId = attachmentId;
						let etag = content[0].getAttribute("RootItemChangeKey");
						cardbookRepository.cardbookUtils.addEtag(aCard, etag);
						if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid]) {
							let myOldCard = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
							await cardbookRepository.removeCardFromRepository(myOldCard, true);
						}
						cardbookRepository.cardbookUtils.nullifyTagModification(aCard);
						await cardbookRepository.addCardToRepository(aCard, true);
					} else {
						cardbookRepository.cardbookServerUpdatedCardPhotoError[aConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
					}
				} else {
					cardbookRepository.cardbookServerUpdatedCardPhotoError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerUpdatedCardPhotoResponse[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			let data = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + 
						"<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:m=\"http://schemas.microsoft.com/exchange/services/2006/messages\" xmlns:t=\"http://schemas.microsoft.com/exchange/services/2006/types\">" +
							"<soap:Header>" +
								"<t:RequestServerVersion Version=\"Exchange2013\"/>" +
							"</soap:Header>" +
							"<soap:Body>" +
								"<m:CreateAttachment>" +
									"<m:ParentItemId Id=\"" + aCard.uid + "\" ChangeKey=\"" + aCard.etag + "\"/>" +
									"<m:Attachments>" +
										"<t:FileAttachment>" +
											"<t:Name>ContactPicture." + aCard.photo.extension + "</t:Name>" +
											"<t:Content>" + aCard.photo.value + "</t:Content>" +
											"<t:ContentType>image/" + aCard.photo.extension + "</t:ContentType>" +
											"<t:IsInline>true</t:IsInline>" +
											"<t:IsContactPhoto>true</t:IsContactPhoto>" +
										"</t:FileAttachment>" +
									"</m:Attachments>" +
								"</m:CreateAttachment>" +
							"</soap:Body>" +
						"</soap:Envelope>";
			let request = new cardbookWebDAV(aConnection, listener_createphoto, aCard.etag, false);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingUpdate", [aConnection.connDescription, aCard.fn]);
			request.createOffice365ContactPhoto(data);
		} else {
			cardbookRepository.cardbookServerUpdatedCardPhotoResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	serverDeleteCardPhoto: function(aConnection, aCard) {
		var listener_deletephoto = {
			onDAVQueryComplete: async function(status, responseXML) {
				if (status > 199 && status < 400) {
					let responseState = responseXML.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsMessages, "DeleteAttachmentResponseMessage");
					if (responseState[0].getAttribute("ResponseClass") == "Success") {
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdatedOnServerWithEtag", [aConnection.connDescription, aCard.fn, aCard.etag]);
					} else {
						cardbookRepository.cardbookServerUpdatedCardPhotoError[aConnection.connPrefId]++;
						cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
					}
				} else {
					cardbookRepository.cardbookServerUpdatedCardPhotoError[aConnection.connPrefId]++;
					cardbookRepository.cardbookUtils.formatStringForOutput("serverCardUpdateFailed", [aConnection.connDescription, aCard.fn, aConnection.connUrl, status], "Error");
				}
				cardbookRepository.cardbookServerUpdatedCardPhotoResponse[aConnection.connPrefId]++;
			}
		};
		if (cardbookSynchronization.getModifsPushed(aConnection.connPrefId) <= cardbookRepository.cardbookPreferences.getMaxModifsPushed()) {
			let data = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + 
						"<soap:Envelope xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:m=\"http://schemas.microsoft.com/exchange/services/2006/messages\" xmlns:t=\"http://schemas.microsoft.com/exchange/services/2006/types\">" +
							"<soap:Header>" +
								"<t:RequestServerVersion Version=\"Exchange2013\"/>" +
							"</soap:Header>" +
							"<soap:Body>" +
								"<m:DeleteAttachment>" +
									"<m:AttachmentIds>" +
										"<t:AttachmentId Id=\"" + aCard.photo.attachmentId + "\"/>" + 
									"</m:AttachmentIds>" +
								"</m:DeleteAttachment>" +
							"</soap:Body>" +
						"</soap:Envelope>";
			let request = new cardbookWebDAV(aConnection, listener_deletephoto, aCard.etag, false);
			cardbookRepository.cardbookUtils.formatStringForOutput("serverCardSendingUpdate", [aConnection.connDescription, aCard.fn]);
			request.deleteOffice365ContactPhoto(data);
		} else {
			cardbookRepository.cardbookServerUpdatedCardPhotoResponse[aConnection.connPrefId]++;
			cardbookRepository.cardbookServerNotPushed[aConnection.connPrefId]++;
		}
	},

	addAddressEntry: function (aData, aAdrCount, aType, aAdressLine) {
		aData = cardbookSynchronizationOffice365.addEntry(aData, "Entry", [ ["Key", aType] ], false);
		aData = cardbookSynchronizationOffice365.addContent(aData, "Street", [], aAdressLine[0][2]);
		aData = cardbookSynchronizationOffice365.addContent(aData, "City", [], aAdressLine[0][3]);
		aData = cardbookSynchronizationOffice365.addContent(aData, "State", [], aAdressLine[0][4]);
		aData = cardbookSynchronizationOffice365.addContent(aData, "PostalCode", [], aAdressLine[0][5]);
		aData = cardbookSynchronizationOffice365.addContent(aData, "CountryOrRegion", [], aAdressLine[0][6]);
		aData = cardbookSynchronizationOffice365.addEntry(aData, "Entry", [], true);
		aAdrCount[aType]++;
		return aData;
	},

	addAddressEntryItem: function (aData, aType, aEntry, aValue) {
		aData = cardbookSynchronizationOffice365.addEntry(aData, "Entry", [ ["Key", aType] ], false);
		aData = cardbookSynchronizationOffice365.addContent(aData, aEntry, [], aValue);
		aData = cardbookSynchronizationOffice365.addEntry(aData, "Entry", [], true);
		return aData;
	},

	addEmailEntry: function (aData, aEmailCount, aValue) {
		aData = cardbookSynchronizationOffice365.addContent(aData, "Entry", [ ["Key", "EmailAddress" + aEmailCount], ["Name", aValue] ], aValue);
		return aData;
	},

	addTelEntry: function (aData, aType, aValue) {
		aData = cardbookSynchronizationOffice365.addContent(aData, "Entry", [ ["Key", aType] ], aValue);
		return aData;
	},

	addImppEntry: function (aData, aValue) {
		aData = cardbookSynchronizationOffice365.addContent(aData, "Entry", [ ["Key", "ImAddress1"] ], aValue);
		return aData;
	},

	addCustomEntry: function (aData, aKey, aValue) {
		aData = cardbookSynchronizationOffice365.addEntry(aData, "ExtendedProperty", [], false);
		aData = cardbookSynchronizationOffice365.addEntry(aData, "ExtendedFieldURI", [ ["DistinguishedPropertySetId", "PublicStrings"], ["PropertyName", aKey], ["PropertyType", "String"] ], true);
		aData = cardbookSynchronizationOffice365.addContent(aData, "Value", [], aValue);
		aData = cardbookSynchronizationOffice365.addEntry(aData, "ExtendedProperty", [], true);
		return aData;
	},
	
	addEntry: function (aData, aElement, aProperty, aClose) {
		let startClose = aClose && (aProperty.length == 0) ? "/" : "";
		let endClose = aClose && (aProperty.length != 0) ? "/" : "";
		aData = aData + "<" + startClose + "t:" + aElement;
		for (let prop of aProperty) {
			aData = aData + " " + prop[0] + "=\"" + prop[1] + "\"";
		}
		aData = aData + endClose + ">";
		return aData;
	},

	addContent: function (aData, aElement, aProperty, aTextContent) {
		if (aTextContent) {
			aData = aData + "<t:" + aElement;
			for (let prop of aProperty) {
				aData = aData + " " + prop[0] + "=\"" + prop[1] + "\"";
			}
			aData = aData + ">" + aTextContent + "</t:" + aElement + ">";
		}
		return aData;
	},
	
	parseCardToOffice365UpdateContact: function (aCard) {
		// console.debug(aCard);
		function addItemField(aField, aEWSField) {
			if (aCard[aField]) {
				Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "SetItemField", [], false);
				Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "FieldURI",  [ ["FieldURI", "contacts:" + aEWSField] ], true);
				Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Contact", [], false);
				Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, aEWSField , [], aCard[aField]);
				Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Contact", [], true);
				Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "SetItemField", [], true);
			} else {
				Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "DeleteItemField", [], false);
				Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "FieldURI",  [ ["FieldURI", "contacts:" + aEWSField] ], true);
				Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "DeleteItemField", [], true);		
			}
			return Office365Contact;
		}

		let dateFormat = cardbookRepository.getDateFormat(aCard.dirPrefId, aCard.version);
		let Office365Contact = "";
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "ItemChange", [], false);
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "ItemId",  [ ["Id", aCard.uid], ["ChangeKey", aCard.etag] ], true);
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Updates", [], false);

		let fieldsMap = { "fn": "DisplayName", "firstname": "GivenName", "othername": "MiddleName",
							"lastname": "Surname", "nickname": "Nickname", "org": "CompanyName",
							"title": "JobTitle" };
		for (let field in fieldsMap) {
			let EWSField = fieldsMap[field];
			addItemField(field, EWSField);
		}
		for (let field of [ "prefixname", "suffixname", "role" ]) {
			if (aCard[field]) {
				let fieldName = cardbookRepository.extension.localeData.localizeMessage(`${field}Label`);
				aCard.note = aCard.note + "\r\n" + fieldName + " : " + aCard[field];
				aCard[field] = "";
			}
		}

		function addCustomField(aData, aKey, aValue) {
			if (aValue) {
				aData = cardbookSynchronizationOffice365.addEntry(aData, "SetItemField", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "ExtendedFieldURI", [ ["DistinguishedPropertySetId", "PublicStrings"], ["PropertyName", aKey], ["PropertyType", "String"] ], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "Contact", [], false);
				aData = cardbookSynchronizationOffice365.addCustomEntry(aData, aKey, aValue);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "Contact", [], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "SetItemField", [], true);
			} else {
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "ExtendedFieldURI", [ ["DistinguishedPropertySetId", "PublicStrings"], ["PropertyName", aKey], ["PropertyType", "String"] ], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], true);
			}
			return aData;
		}
		for (let type of ["personal", "org"]) {
			for (let custom of cardbookRepository.customFields[type]) {
				let customValue = cardbookRepository.cardbookUtils.getCardValueByField(aCard, custom[0], false)[0];
				Office365Contact = addCustomField(Office365Contact, custom[0], customValue);
			}
		}

		if (aCard.categories.length) {
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "SetItemField", [], false);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "FieldURI",  [ ["FieldURI", "item:Categories"] ], true);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Contact", [], false);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Categories", [], false);
			for (let category of aCard.categories) {
				Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "String", [], category);
			}
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Categories", [], true);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Contact", [], true);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "SetItemField", [], true);
		} else {
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "DeleteItemField", [], false);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "FieldURI",  [ ["FieldURI", "item:Categories"] ], true);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "DeleteItemField", [], true);
		}

		let isDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(aCard.bday, dateFormat);
		if (isDate != "WRONGDATE") {
			let dateSplitted = cardbookDates.splitUTCDateIntoComponents(isDate);
			let date = dateSplitted.year + "-" + dateSplitted.month + "-" + dateSplitted.day + "T00:00:00Z";
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "SetItemField", [], false);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "FieldURI",  [ ["FieldURI", "contacts:Birthday"] ], true);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Contact", [], false);
			Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "Birthday", [], date);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Contact", [], true);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "SetItemField", [], true);
		} else {
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "DeleteItemField", [], false);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "FieldURI",  [ ["FieldURI", "contacts:Birthday"] ], true);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "DeleteItemField", [], true);
		}

		function addEmailTypeField(aData, aCounter, aValue) {
			if (aValue) {
				aData = cardbookSynchronizationOffice365.addEntry(aData, "SetItemField", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",   [ ["FieldURI", "contacts:EmailAddress"],  ["FieldIndex", "EmailAddress" + aCounter] ], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "Contact", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "EmailAddresses", [], false);
				aData = cardbookSynchronizationOffice365.addEmailEntry(aData, aCounter, aValue);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "EmailAddresses", [], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "Contact", [], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "SetItemField", [], true);
			} else {
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",   [ ["FieldURI", "contacts:EmailAddress"],  ["FieldIndex", "EmailAddress" + aCounter] ], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], true);
			}
			return aData;
		}
		let emailCount = 1;
		let emailQuota = 3;
		let emails = JSON.parse(JSON.stringify(aCard.email));
		let index = 0;
		for (let email of emails) {
			if (emailCount > emailQuota) {
				let fieldName = cardbookRepository.extension.localeData.localizeMessage("typesCategoryEmailLabel");
				aCard.email.splice(index, 1);
				aCard.note = aCard.note + "\r\n" + fieldName + " : " + email[0][0];
			} else {
				Office365Contact = addEmailTypeField(Office365Contact, emailCount, email[0][0]);
				emailCount++;
			}
			index++;
		}
		while (emailCount <= emailQuota) {
			Office365Contact = addEmailTypeField(Office365Contact, emailCount, "");
			emailCount++;
		}

		function addAddrTypeField(aData, aField, aType, aValue) {
			if (aValue) {
				aData = cardbookSynchronizationOffice365.addEntry(aData, "SetItemField", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",  [ ["FieldURI", "contacts:PhysicalAddress:" + aField],  ["FieldIndex", aType] ], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "Contact", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "PhysicalAddresses", [], false);
				aData = cardbookSynchronizationOffice365.addAddressEntryItem(aData, aType, aField, aValue);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "PhysicalAddresses", [], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "Contact", [], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "SetItemField", [], true);
			} else {
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",  [ ["FieldURI", "contacts:PhysicalAddress:" + aField],  ["FieldIndex", aType] ], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], true);
			}
			return aData;
		}

		function addAddrField(aData, aType, aValue, aCounter) {
			aData = addAddrTypeField(aData, "Street", aType, aValue[0][2]);
			aData = addAddrTypeField(aData, "City", aType, aValue[0][3]);
			aData = addAddrTypeField(aData, "State", aType, aValue[0][4]);
			aData = addAddrTypeField(aData, "PostalCode", aType, aValue[0][5]);
			aData = addAddrTypeField(aData, "CountryOrRegion", aType, aValue[0][6]);
			aCounter[aType]++;
			return aData;
		}

		function deleteAddrField(aData, aType) {
			aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], false);
			aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",  [ ["FieldURI", "contacts:PhysicalAddress:Street"],  ["FieldIndex", aType] ], true);
			aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",  [ ["FieldURI", "contacts:PhysicalAddress:City"],  ["FieldIndex", aType] ], true);
			aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",  [ ["FieldURI", "contacts:PhysicalAddress:State"],  ["FieldIndex", aType] ], true);
			aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",  [ ["FieldURI", "contacts:PhysicalAddress:PostalCode"],  ["FieldIndex", aType] ], true);
			aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",  [ ["FieldURI", "contacts:PhysicalAddress:CountryOrRegion"],  ["FieldIndex", aType] ], true);
			aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], true);
			return aData;
		}

		let adrCount = { "Home": 1, "Business": 1, "Other": 1};
		let adrs = JSON.parse(JSON.stringify(aCard.adr));
		index = 0;
		for (let adr of adrs) {
			let type = cardbookRepository.cardbookTypes.getCodeType("adr", aCard.dirPrefId, adr[1]).result;
			if (type == "hometype" && (adrCount["Home"] <= 1)) {
				Office365Contact = addAddrField(Office365Contact, "Home", adr, adrCount);
			} else if (type == "worktype" && (adrCount["Business"] <= 1)) {
				Office365Contact = addAddrField(Office365Contact, "Business", adr, adrCount);
			} else if (type == "othertype" && (adrCount["Other"] <= 1)) {
				Office365Contact = addAddrField(Office365Contact, "Other", adr, adrCount);
			} else {
				if (adrCount["Home"] <= 1) {
					Office365Contact = addAddrField(Office365Contact, "Home", adr, adrCount);
				} else if (adrCount["Business"] <= 1) {
					Office365Contact = addAddrField(Office365Contact, "Business", adr, adrCount);
				} else if (adrCount["Other"] <= 1) {
					Office365Contact = addAddrField(Office365Contact, "Other", adr, adrCount);
				} else {
					let fieldName = cardbookRepository.extension.localeData.localizeMessage("typesCategoryAdrLabel");
					aCard.adr.splice(index, 1);
					aCard.note = aCard.note + "\r\n" + fieldName + " : " + adr[0].join(":");
				}
			}
			index++;
		}
		if (adrCount["Home"] <= 1) {
			Office365Contact = deleteAddrField(Office365Contact, "Home");
		}
		if (adrCount["Business"] <= 1) {
			Office365Contact = deleteAddrField(Office365Contact, "Business");
		}
		if (adrCount["Other"] <= 1) {
			Office365Contact = deleteAddrField(Office365Contact, "Other");
		}

		function addTelTypeField(aData, aType, aValue, aCounter) {
			if (aValue) {
				aData = cardbookSynchronizationOffice365.addEntry(aData, "SetItemField", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",  [ ["FieldURI", "contacts:PhoneNumber"],  ["FieldIndex", aType] ], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "Contact", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "PhoneNumbers", [], false);
				aData = cardbookSynchronizationOffice365.addTelEntry(aData, aType, aValue);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "PhoneNumbers", [], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "Contact", [], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "SetItemField", [], true);
				aCounter[aType]++;
			} else {
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",  [ ["FieldURI", "contacts:PhoneNumber"],  ["FieldIndex", aType] ], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], true);
			}
			return aData;
		}
		let telCount = { "AssistantPhone": 1, "BusinessFax": 1, "Callback": 1, "CarPhone": 1, "Pager": 1, "Telex": 1, "TtyTddPhone": 1, "RadioPhone": 1,
							"BusinessPhone": 1, "BusinessPhone2": 1, "CompanyMainPhone": 1, "HomeFax": 1, "OtherFax": 1, "HomePhone": 1, "HomePhone2": 1,
							"MobilePhone": 1, "OtherTelephone": 1};
		let tels = JSON.parse(JSON.stringify(aCard.tel));
		index = 0;
		for (let tel of tels) {
			let type = cardbookRepository.cardbookTypes.getCodeType("tel", aCard.dirPrefId, tel[1]).result;
			let telValue = tel[0][0];
			if (type == "hometype" && (telCount["HomePhone"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "HomePhone", telValue, telCount);
			} else if (type == "hometype" && (telCount["HomePhone2"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "HomePhone2", telValue, telCount);
			} else if (type == "othertype" && (telCount["OtherTelephone"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "OtherTelephone", telValue, telCount);
			} else if (type == "celltype" && (telCount["MobilePhone"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "MobilePhone", telValue, telCount);
			} else if (type == "assistanttype" && (telCount["AssistantPhone"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "AssistantPhone", telValue, telCount);
			} else if (type == "worktype" && (telCount["BusinessPhone"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "BusinessPhone", telValue, telCount);
			} else if (type == "worktype" && (telCount["BusinessPhone2"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "BusinessPhone2", telValue, telCount);
			} else if (type == "worktype" && (telCount["CompanyMainPhone"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "CompanyMainPhone", telValue, telCount);
			} else if (type == "workfaxtype" && (telCount["BusinessFax"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "BusinessFax", telValue, telCount);
			} else if (type == "callbacktype" && (telCount["Callback"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "Callback", telValue, telCount);
			} else if (type == "carphonetype" && (telCount["CarPhone"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "CarPhone", telValue, telCount);
			} else if (type == "pagertype" && (telCount["Pager"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "Pager", telValue, telCount);
			} else if (type == "telextype" && (telCount["Telex"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "Telex", telValue, telCount);
			} else if (type == "ttytype" && (telCount["TtyTddPhone"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "TtyTddPhone", telValue, telCount);
			} else if (type == "radiotype" && (telCount["RadioPhone"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "RadioPhone", telValue, telCount);
			} else if (type == "homefaxtype" && (telCount["HomeFax"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "HomeFax", telValue, telCount);
			} else if (type == "otherfaxtype" && (telCount["OtherFax"] <= 1)) {
				Office365Contact = addTelTypeField(Office365Contact, "OtherFax", telValue, telCount);
			} else {
				if (telCount["HomePhone"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "HomePhone", telValue, telCount);
				} else if (telCount["HomePhone2"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "HomePhone2", telValue, telCount);
				} else if (telCount["OtherTelephone"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "OtherTelephone", telValue, telCount);
				} else if (telCount["MobilePhone"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "MobilePhone", telValue, telCount);
				} else if (telCount["AssistantPhone"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "AssistantPhone", telValue, telCount);
				} else if (telCount["BusinessPhone"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "BusinessPhone", telValue, telCount);
				} else if (telCount["BusinessPhone2"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "BusinessPhone2", telValue, telCount);
				} else if (telCount["CompanyMainPhone"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "CompanyMainPhone", telValue, telCount);
				} else if (telCount["BusinessFax"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "BusinessFax", telValue, telCount);
				} else if (telCount["Callback"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "Callback", telValue, telCount);
				} else if (telCount["CarPhone"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "CarPhone", telValue, telCount);
				} else if (telCount["Pager"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "Pager", telValue, telCount);
				} else if (telCount["Telex"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "Telex", telValue, telCount);
				} else if (telCount["TtyTddPhone"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "TtyTddPhone", telValue, telCount);
				} else if (telCount["RadioPhone"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "RadioPhone", telValue, telCount);
				} else if (telCount["HomeFax"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "HomeFax", telValue, telCount);
				} else if (telCount["OtherFax"] <= 1) {
					Office365Contact = addTelTypeField(Office365Contact, "OtherFax", telValue, telCount);
				} else {
					let fieldName = cardbookRepository.extension.localeData.localizeMessage("typesCategoryTelLabel");
					aCard.tel.splice(index, 1);
					aCard.note = aCard.note + "\r\n" + fieldName + " : " + telValue;
				}
			}
			index++;
		}
		for (let type in telCount) {
			if (telCount[type] <= 1) {
				Office365Contact = addTelTypeField(Office365Contact, type, "");
			}
		}

		function addImppTypeField(aData, aValue) {
			if (aValue != "") {
				aData = cardbookSynchronizationOffice365.addEntry(aData, "SetItemField", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",  [ ["FieldURI", "contacts:ImAddress"],  ["FieldIndex", "ImAddress1"] ], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "Contact", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "ImAddresses", [], false);
				aData = cardbookSynchronizationOffice365.addImppEntry(aData, aValue);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "ImAddresses", [], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "Contact", [], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "SetItemField", [], true);
			} else {
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "IndexedFieldURI",  [ ["FieldURI", "contacts:ImAddress"],  ["FieldIndex", "ImAddress1"] ], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], true);
			}
			return aData;
		}
		let imppCount = 1;
		let imppQuota = 1;
		let impps = JSON.parse(JSON.stringify(aCard.impp));
		index = 0;
		for (let impp of impps) {
			if (imppCount > imppQuota) {
				let fieldName = cardbookRepository.extension.localeData.localizeMessage("typesCategoryImppLabel");
				aCard.impp.splice(index, 1);
				aCard.note = aCard.note + "\r\n" + fieldName + " : " + impp[0][0];
			} else {
				Office365Contact = addImppTypeField(Office365Contact, impp[0][0]);
				imppCount++;
			}
			index++;
		}
		if (imppCount <= 1) {
			Office365Contact = addImppTypeField(Office365Contact, "");
		}

		for (let url of aCard.url) {
			let fieldName = cardbookRepository.extension.localeData.localizeMessage("typesCategoryUrlLabel");
			aCard.note = aCard.note + "\r\n" + fieldName + " : " + url[0][0];
		}
		aCard.url = [];

		let events = cardbookRepository.cardbookUtils.getEventsFromCard(aCard.note.split("\n"), aCard.others);
		for (let event of events.result) {
			let fieldName = cardbookRepository.extension.localeData.localizeMessage("eventInNoteEventPrefix");
			aCard.note = aCard.note + "\r\n" + fieldName + " : " + event[0] + ":" + event[1];
		}
		aCard.others = events.remainingOthers;

		if (aCard.note) {
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "SetItemField", [], false);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "FieldURI",  [ ["FieldURI", "item:Body"] ], true);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Contact", [], false);
			Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "Body", [ ["BodyType", "Text"], ["IsTruncated", "false"] ], aCard.note);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Contact", [], true);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "SetItemField", [], true);
		} else {
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "DeleteItemField", [], false);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "FieldURI",  [ ["FieldURI", "item:Body"] ], true);
			Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "DeleteItemField", [], true);
		}

		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Updates", [], true);
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "ItemChange", [], true);

		// console.debug(Office365Contact);
		return Office365Contact;
	},

	parseCardToOffice365UpdateDistributionList: function (aCard) {
		// console.debug(aCard);
		function addItemField(aField, aEWSField) {
			if (aCard[aField]) {
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "SetItemField", [], false);
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "FieldURI",  [ ["FieldURI", "contacts:" + aEWSField] ], true);
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DistributionList", [], false);
				Office365DistributionList = cardbookSynchronizationOffice365.addContent(Office365DistributionList, aEWSField , [], aCard[aField]);
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DistributionList", [], true);
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "SetItemField", [], true);
			} else {
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DeleteItemField", [], false);
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "FieldURI",  [ ["FieldURI", "contacts:" + aEWSField] ], true);
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DeleteItemField", [], true);		
			}
			return Office365DistributionList;
		}

		let Office365DistributionList = "";
		Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "ItemChange", [], false);
		Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "ItemId",  [ ["Id", aCard.uid], ["ChangeKey", aCard.etag] ], true);
		Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Updates", [], false);

		let fieldsMap = { "fn": "DisplayName" };
		for (let field in fieldsMap) {
			let EWSField = fieldsMap[field];
			addItemField(field, EWSField);
		}

		function addCustomField(aData, aKey, aValue) {
			if (aValue) {
				aData = cardbookSynchronizationOffice365.addEntry(aData, "SetItemField", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "ExtendedFieldURI", [ ["DistinguishedPropertySetId", "PublicStrings"], ["PropertyName", aKey], ["PropertyType", "String"] ], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DistributionList", [], false);
				aData = cardbookSynchronizationOffice365.addCustomEntry(aData, aKey, aValue);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DistributionList", [], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "SetItemField", [], true);
			} else {
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], false);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "ExtendedFieldURI", [ ["DistinguishedPropertySetId", "PublicStrings"], ["PropertyName", aKey], ["PropertyType", "String"] ], true);
				aData = cardbookSynchronizationOffice365.addEntry(aData, "DeleteItemField", [], true);
			}
			return aData;
		}
		for (let type of ["personal", "org"]) {
			for (let custom of cardbookRepository.customFields[type]) {
				let customValue = cardbookRepository.cardbookUtils.getCardValueByField(aCard, custom[0], false)[0];
				Office365DistributionList = addCustomField(Office365DistributionList, custom[0], customValue);
			}
		}

		if (aCard.categories.length) {
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "SetItemField", [], false);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "FieldURI",  [ ["FieldURI", "item:Categories"] ], true);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DistributionList", [], false);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Categories", [], false);
			for (let category of aCard.categories) {
				Office365DistributionList = cardbookSynchronizationOffice365.addContent(Office365DistributionList, "String", [], category);
			}
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Categories", [], true);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DistributionList", [], true);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "SetItemField", [], true);
		} else {
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DeleteItemField", [], false);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "FieldURI",  [ ["FieldURI", "item:Categories"] ], true);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DeleteItemField", [], true);
		}

		if (aCard.note) {
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "SetItemField", [], false);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "FieldURI",  [ ["FieldURI", "item:Body"] ], true);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DistributionList", [], false);
			Office365DistributionList = cardbookSynchronizationOffice365.addContent(Office365DistributionList, "Body", [ ["BodyType", "Text"], ["IsTruncated", "false"] ], aCard.note);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DistributionList", [], true);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "SetItemField", [], true);
		} else {
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DeleteItemField", [], false);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "FieldURI",  [ ["FieldURI", "item:Body"] ], true);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DeleteItemField", [], true);
		}

		let results = [];
		let allMembers = [];
		allMembers = cardbookRepository.cardbookUtils.getMembersFromCard(aCard);
		if (allMembers.emails) {
			for (let email of allMembers.emails) {
				let card = cardbookRepository.cardbookUtils.getCardFromEmail(email, aCard.dirPrefId);
				if (card) {
					results.push([email, card.etag, card.fn]);
				}
			}
		}
		if (allMembers.uids) {
			for (let card of allMembers.uids) {
				for (let email of card.emails) {
					results.push([email, card.etag, card.fn]);
				}
			}
		}
		results = cardbookRepository.arrayUnique2D(results);
		if (results.length) {
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "SetItemField", [], false);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "FieldURI",  [ ["FieldURI", "distributionlist:Members"] ], true);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DistributionList", [], false);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Members", [], false);
			for (let result of results) {
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Member", [ ["Key", result[1]] ], false);
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Mailbox", [], false);
				Office365DistributionList = cardbookSynchronizationOffice365.addContent(Office365DistributionList, "Name", [], result[2]);
				Office365DistributionList = cardbookSynchronizationOffice365.addContent(Office365DistributionList, "EmailAddress", [], result[0]);
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Mailbox", [], true);
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Member", [], true);
			}
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Members", [], true);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DistributionList", [], true);
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "SetItemField", [], true);
			let members = Array.from(results, item => "mailto:" + item[0]);
			cardbookRepository.cardbookUtils.addMemberstoCard(aCard, members, "");
		}

		Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Updates", [], true);
		Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "ItemChange", [], true);

		// console.debug(Office365DistributionList);
		return Office365DistributionList;
	},

	parseCardToOffice365CreateContact: function (aCard) {
		// console.debug(aCard);

		let dateFormat = cardbookRepository.getDateFormat(aCard.dirPrefId, aCard.version);
		let Office365Contact = "";
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Contact", [], false);
		Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "DisplayName", [], aCard.fn);

		Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "GivenName", [], aCard.firstname);
		Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "MiddleName", [], aCard.othername);
		Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "Surname", [], aCard.lastname);
		Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "FullName", [], aCard.fn);
		Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "Nickname", [], aCard.nickname);

		for (let field of [ "prefixname", "suffixname", "role" ]) {
			if (aCard[field]) {
				let fieldName = cardbookRepository.extension.localeData.localizeMessage(`${field}Label`);
				aCard.note = aCard.note + "\r\n" + fieldName + " : " + aCard[field];
				aCard[field] = "";
			}
		}

		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Categories", [], false);
		for (let category of aCard.categories) {
			Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "String", [], category);
		}
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Categories", [], true);

		let resultCustoms = [];
		for (let type of ["personal", "org"]) {
			for (let custom of cardbookRepository.customFields[type]) {
				let customValue = cardbookRepository.cardbookUtils.getCardValueByField(aCard, custom[0], false)[0];
				if (customValue) {
					resultCustoms.push([custom[0], customValue]);
				}
			}
		}
		for (let resultCustom of resultCustoms) {
			Office365Contact = cardbookSynchronizationOffice365.addCustomEntry(Office365Contact, resultCustom[0], resultCustom[1]);
		}

		let isDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(aCard.bday, dateFormat);
		if (isDate != "WRONGDATE") {
			let dateSplitted = cardbookDates.splitUTCDateIntoComponents(isDate);
			Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "Birthday", [], dateSplitted.year + "-" + dateSplitted.month + "-" + dateSplitted.day + "T00:00:00Z");
		}

		Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "CompanyName", [], aCard.org);
		Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "JobTitle", [], aCard.title);

		let emailCount = 1;
		let emailQuota = 3;
		let emails = JSON.parse(JSON.stringify(aCard.email));
		let index = 0;
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "EmailAddresses", [], false);
		for (let email of emails) {
			if (emailCount > emailQuota) {
				let fieldName = cardbookRepository.extension.localeData.localizeMessage("typesCategoryEmailLabel");
				aCard.email.splice(index, 1);
				aCard.note = aCard.note + "\r\n" + fieldName + " : " + email[0][0];
			} else {
				Office365Contact = cardbookSynchronizationOffice365.addEmailEntry(Office365Contact, emailCount, email[0][0]);
				emailCount++;
			}
			index++;
		}
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "EmailAddresses", [], true);

		let adrCount = { "Home": 1, "Business": 1, "Other": 1};
		let adrs = JSON.parse(JSON.stringify(aCard.adr));
		index = 0;
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "PhysicalAddresses", [], false);
		for (let adr of adrs) {
			let type = cardbookRepository.cardbookTypes.getCodeType("adr", aCard.dirPrefId, adr[1]).result;
			if (type == "hometype" && (adrCount["Home"] <= 1)) {
				Office365Contact = cardbookSynchronizationOffice365.addAddressEntry(Office365Contact, adrCount, "Home", adr);
			} else if (type == "worktype" && (adrCount["Business"] <= 1)) {
				Office365Contact = cardbookSynchronizationOffice365.addAddressEntry(Office365Contact, adrCount, "Business", adr);
			} else if (type == "othertype" && (adrCount["Other"] <= 1)) {
				Office365Contact = cardbookSynchronizationOffice365.addAddressEntry(Office365Contact, adrCount, "Other", adr);
			} else {
				if (adrCount["Home"] <= 1) {
					Office365Contact = cardbookSynchronizationOffice365.addAddressEntry(Office365Contact, adrCount, "Home", adr);
				} else if (adrCount["Business"] <= 1) {
					Office365Contact = cardbookSynchronizationOffice365.addAddressEntry(Office365Contact, adrCount, "Business", adr);
				} else if (adrCount["Other"] <= 1) {
					Office365Contact = cardbookSynchronizationOffice365.addAddressEntry(Office365Contact, adrCount, "Other", adr);
				} else {
					let fieldName = cardbookRepository.extension.localeData.localizeMessage("typesCategoryAdrLabel");
					aCard.adr.splice(index, 1);
					aCard.note = aCard.note + "\r\n" + fieldName + " : " + adr[0].join(":");
				}
			}
			index++;
		}
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "PhysicalAddresses", [], true);

		function addTelEntry(aType, aTelLine) {
			Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "Entry", [ ["Key", aType] ], aTelLine[0][0]);
			telCount[aType]++;
		}

		let telCount = { "AssistantPhone": 1, "BusinessFax": 1, "Callback": 1, "CarPhone": 1, "Pager": 1, "Telex": 1, "TtyTddPhone": 1, "RadioPhone": 1,
							"BusinessPhone": 1, "BusinessPhone2": 1, "CompanyMainPhone": 1, "HomeFax": 1, "OtherFax": 1, "HomePhone": 1, "HomePhone2": 1,
							"MobilePhone": 1, "OtherTelephone": 1};
		let tels = JSON.parse(JSON.stringify(aCard.tel));
		index = 0;
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "PhoneNumbers", [], false);
		for (let tel of tels) {
			let type = cardbookRepository.cardbookTypes.getCodeType("tel", aCard.dirPrefId, tel[1]).result;
			if (type == "hometype" && (telCount["HomePhone"] <= 1)) {
				addTelEntry("HomePhone", tel);
			} else if (type == "hometype" && (telCount["HomePhone2"] <= 1)) {
				addTelEntry("HomePhone2", tel);
			} else if (type == "othertype" && (telCount["OtherTelephone"] <= 1)) {
				addTelEntry("OtherTelephone", tel);
			} else if (type == "celltype" && (telCount["MobilePhone"] <= 1)) {
				addTelEntry("MobilePhone", tel);
			} else if (type == "assistanttype" && (telCount["AssistantPhone"] <= 1)) {
				addTelEntry("AssistantPhone", tel);
			} else if (type == "worktype" && (telCount["BusinessPhone"] <= 1)) {
				addTelEntry("BusinessPhone", tel);
			} else if (type == "worktype" && (telCount["BusinessPhone2"] <= 1)) {
				addTelEntry("BusinessPhone2", tel);
			} else if (type == "worktype" && (telCount["CompanyMainPhone"] <= 1)) {
				addTelEntry("CompanyMainPhone", tel);
			} else if (type == "workfaxtype" && (telCount["BusinessFax"] <= 1)) {
				addTelEntry("BusinessFax", tel);
			} else if (type == "callbacktype" && (telCount["Callback"] <= 1)) {
				addTelEntry("Callback", tel);
			} else if (type == "carphonetype" && (telCount["CarPhone"] <= 1)) {
				addTelEntry("CarPhone", tel);
			} else if (type == "pagertype" && (telCount["Pager"] <= 1)) {
				addTelEntry("Pager", tel);
			} else if (type == "telextype" && (telCount["Telex"] <= 1)) {
				addTelEntry("Telex", tel);
			} else if (type == "ttytype" && (telCount["TtyTddPhone"] <= 1)) {
				addTelEntry("TtyTddPhone", tel);
			} else if (type == "radiotype" && (telCount["RadioPhone"] <= 1)) {
				addTelEntry("RadioPhone", tel);
			} else if (type == "homefaxtype" && (telCount["HomeFax"] <= 1)) {
				addTelEntry("HomeFax", tel);
			} else if (type == "otherfaxtype" && (telCount["OtherFax"] <= 1)) {
				addTelEntry("OtherFax", tel);
			} else {
				if (telCount["HomePhone"] <= 1) {
					addTelEntry("HomePhone", tel);
				} else if (telCount["HomePhone2"] <= 1) {
					addTelEntry("HomePhone2", tel);
				} else if (telCount["OtherTelephone"] <= 1) {
					addTelEntry("OtherTelephone", tel);
				} else if (telCount["MobilePhone"] <= 1) {
					addTelEntry("MobilePhone", tel);
				} else if (telCount["AssistantPhone"] <= 1) {
					addTelEntry("AssistantPhone", tel);
				} else if (telCount["BusinessPhone"] <= 1) {
					addTelEntry("BusinessPhone", tel);
				} else if (telCount["BusinessPhone2"] <= 1) {
					addTelEntry("BusinessPhone2", tel);
				} else if (telCount["CompanyMainPhone"] <= 1) {
					addTelEntry("CompanyMainPhone", tel);
				} else if (telCount["BusinessFax"] <= 1) {
					addTelEntry("BusinessFax", tel);
				} else if (telCount["Callback"] <= 1) {
					addTelEntry("Callback", tel);
				} else if (telCount["CarPhone"] <= 1) {
					addTelEntry("CarPhone", tel);
				} else if (telCount["Pager"] <= 1) {
					addTelEntry("Pager", tel);
				} else if (telCount["Telex"] <= 1) {
					addTelEntry("Telex", tel);
				} else if (telCount["TtyTddPhone"] <= 1) {
					addTelEntry("TtyTddPhone", tel);
				} else if (telCount["RadioPhone"] <= 1) {
					addTelEntry("RadioPhone", tel);
				} else if (telCount["HomeFax"] <= 1) {
					addTelEntry("HomeFax", tel);
				} else if (telCount["OtherFax"] <= 1) {
					addTelEntry("OtherFax", tel);
				} else {
					let fieldName = cardbookRepository.extension.localeData.localizeMessage("typesCategoryTelLabel");
					aCard.tel.splice(index, 1);
					aCard.note = aCard.note + "\r\n" + fieldName + " : " + telValue;
				}
			}
			index++;
		}
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "PhoneNumbers", [], true);

		let imppCount = 1;
		let imppQuota = 1;
		let impps = JSON.parse(JSON.stringify(aCard.impp));
		index = 0;
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "ImAddresses", [], false);
		for (let impp of impps) {
			if (imppCount > imppQuota) {
				let fieldName = cardbookRepository.extension.localeData.localizeMessage("typesCategoryImppLabel");
				aCard.impp.splice(index, 1);
				aCard.note = aCard.note + "\r\n" + fieldName + " : " + impp[0][0];
			} else {
				Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "Entry", [ ["Key", "ImAddress1"] ], impp[0][0]);
				imppCount++;
			}
			index++;
		}
		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "ImAddresses", [], true);

		for (let url of aCard.url) {
			let fieldName = cardbookRepository.extension.localeData.localizeMessage("typesCategoryUrlLabel");
			aCard.note = aCard.note + "\r\n" + fieldName + " : " + url[0][0];
		}
		aCard.url = [];

		let events = cardbookRepository.cardbookUtils.getEventsFromCard(aCard.note.split("\n"), aCard.others);
		for (let event of events.result) {
			let fieldName = cardbookRepository.extension.localeData.localizeMessage("eventInNoteEventPrefix");
			aCard.note = aCard.note + "\r\n" + fieldName + " : " + event[0] + ":" + event[1];
		}
		aCard.others = events.remainingOthers;

		Office365Contact = cardbookSynchronizationOffice365.addContent(Office365Contact, "Body",  [ ["BodyType", "Text"], ["IsTruncated", "false"] ], aCard.note);

		Office365Contact = cardbookSynchronizationOffice365.addEntry(Office365Contact, "Contact", [], true);

		// console.debug(Office365Contact);
		return Office365Contact;
	},

	parseCardToOffice365CreateDistributionList: function (aCard) {
		// console.debug(aCard);
		let Office365DistributionList = "";
		Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DistributionList", [], false);
		Office365DistributionList = cardbookSynchronizationOffice365.addContent(Office365DistributionList, "DisplayName", [], aCard.fn);

		Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Categories", [], false);
		for (let category of aCard.categories) {
			Office365DistributionList = cardbookSynchronizationOffice365.addContent(Office365DistributionList, "String", [], category);
		}
		Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Categories", [], true);

		let resultCustoms = [];
		for (let type of ["personal", "org"]) {
			for (let custom of cardbookRepository.customFields[type]) {
				let customValue = cardbookRepository.cardbookUtils.getCardValueByField(aCard, custom[0], false)[0];
				if (customValue) {
					resultCustoms.push([custom[0], customValue]);
				}
			}
		}
		for (let resultCustom of resultCustoms) {
			Office365DistributionList = cardbookSynchronizationOffice365.addCustomEntry(Office365DistributionList, resultCustom[0], resultCustom[1]);
		}

		Office365DistributionList = cardbookSynchronizationOffice365.addContent(Office365DistributionList, "Body",  [ ["BodyType", "Text"], ["IsTruncated", "false"] ], aCard.note);

		let results = [];
		let allMembers = [];
		allMembers = cardbookRepository.cardbookUtils.getMembersFromCard(aCard);
		if (allMembers.mails) {
			for (let email of allMembers.mails) {
				let card = cardbookRepository.cardbookUtils.getCardFromEmail(email, aCard.dirPrefId);
				if (card) {
					results.push([email, card.etag, card.fn]);
				}
			}
		}
		if (allMembers.uids) {
			for (let card of allMembers.uids) {
				for (let email of card.emails) {
					results.push([email, card.etag, card.fn]);
				}
			}
		}
		results = cardbookRepository.arrayUnique2D(results);
		if (results.length) {
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Members", [], false);
			for (let result of results) {
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Member", [ ["Key", result[1]] ], false);
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Mailbox", [], false);
				Office365DistributionList = cardbookSynchronizationOffice365.addContent(Office365DistributionList, "Name", [], result[2]);
				Office365DistributionList = cardbookSynchronizationOffice365.addContent(Office365DistributionList, "EmailAddress", [], result[0]);
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Mailbox", [], true);
				Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Member", [], true);
			}
			Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "Members", [], true);
			let members = Array.from(results, item => "mailto:" + item[0]);
			cardbookRepository.cardbookUtils.addMemberstoCard(aCard, members, "");
		}

		Office365DistributionList = cardbookSynchronizationOffice365.addEntry(Office365DistributionList, "DistributionList", [], true);
		// console.debug(Office365DistributionList);
		return Office365DistributionList;
	},

	parseOffice365ContactToCard: function (aOffice365Contact, aDirPrefId) {
		// console.debug(aOffice365Contact);
		let itemId = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "ItemId")[0];
		let uid = itemId.getAttribute("Id");
		let etag = itemId.getAttribute("ChangeKey");
		let ABType = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
		let url = cardbookRepository.cardbookPreferences.getUrl(aDirPrefId);
		let href = url + "/" + uid;
		let aCard = new cardbookCardParser("", href, etag, aDirPrefId);
		aCard.uid = uid;
		aCard.cardurl = href;
		aCard.etag = etag;
		aCard.version = cardbookSynchronizationOffice365.VCARD_VERSION;
		cardbookRepository.cardbookUtils.setCacheURIFromCard(aCard, ABType);
		let displayName = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "DisplayName")[0];
		if (displayName && displayName.textContent) {
			aCard.fn = displayName.textContent;
		}
		let completeName = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "CompleteName")[0];
		if (completeName) {
			let lastname = completeName.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "LastName")[0];
			if (lastname && lastname.textContent) {
				aCard.lastname = lastname.textContent;
			}
			let firstname = completeName.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "FirstName")[0];
			if (firstname && firstname.textContent) {
				aCard.firstname = firstname.textContent;
			}
			let title = completeName.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Title")[0];
			if (title && title.textContent) {
				aCard.prefixname = title.textContent;
			}
			let suffix = completeName.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Suffix")[0];
			if (suffix && suffix.textContent) {
				aCard.suffixname = suffix.textContent;
			}
			let middleName = completeName.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "MiddleName")[0];
			if (middleName && middleName.textContent) {
				aCard.othername = middleName.textContent;
			}
			let nickname = completeName.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Nickname")[0];
			if (nickname && nickname.textContent) {
				aCard.nickname = nickname.textContent;
			}
		}
		let notes = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Body")[0];
		if (notes && notes.textContent) {
			aCard.note = notes.textContent;
		}
		let birthday = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Birthday")[0];
		if (birthday && birthday.textContent) {
			// 1604-01-03T11:59:00Z
			let day =  birthday.textContent.substring(8, 10);
			let month =  birthday.textContent.substring(5, 7);
			let year =  birthday.textContent.substring(0, 4);
			aCard.bday = cardbookRepository.cardbookDates.getFinalDateString(day, month, year, cardbookSynchronizationOffice365.VCARD_VERSION);
		}

		let extendedProperties = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "ExtendedProperty");
		if (extendedProperties) {
			for (let extendedProperty of extendedProperties) {
				let extendedFieldURI = extendedProperty.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "ExtendedFieldURI");
				let key = "";
				if (extendedFieldURI && extendedFieldURI[0]) {
					key = extendedFieldURI[0].getAttribute("PropertyName");
				}
				let value = "";
				let fieldValue = extendedProperty.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Value");
				if (fieldValue && fieldValue[0]) {
					value = fieldValue[0].textContent;
				}
				if (key && value) {
					let found = false;
					for (let customCB of cardbookRepository.customFields.personal) {
						if (customCB[0] == key) {
							cardbookRepository.cardbookUtils.setCardValueByField(aCard, customCB[0], value);
							found = true;
							break;
						}
					}
					if (!found) {
						for (let customCB of cardbookRepository.customFields.org) {
							if (customCB[0] == key) {
								cardbookRepository.cardbookUtils.setCardValueByField(aCard, customCB[0], value);
								found = true;
								break;
							}
						}
					}
					if (!found) {
						let i = 0;
						let condition = true;
						let rootName = "X-GOOGLE";
						while (condition) {
							let newfound = false;
							for (let customCB of cardbookRepository.customFields.personal) {
								if (rootName + i == customCB[0]) {
									newfound = true;
									break;
								}
							}
							if (newfound) {
								i++;
							} else {
								condition = false;
							}
						}
						cardbookRepository.cardbookPreferences.setCustomFields('personal', cardbookRepository.customFields.personal.length, rootName + i + ":" + key);
						cardbookRepository.loadCustoms();
						cardbookRepository.cardbookUtils.setCardValueByField(aCard, rootName + i, value);
					}
				}
			}
		}

		let categories = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Categories");
		if (categories && categories[0]) {
			let strings = categories[0].getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "String");
			for (let string of strings) {
				aCard.categories.push(string.textContent);
			}
		}

		let fileAttachment = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "FileAttachment");
		if (fileAttachment && fileAttachment[0]) {
			let attachmentId = fileAttachment[0].getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "AttachmentId");
			if (attachmentId && attachmentId[0]) {
				let contentType = fileAttachment[0].getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "ContentType");
				let extension;
				if (contentType && contentType[0]) {
					let content = contentType[0].textContent;
					let extensionArray = content.split("/");
					extension = extensionArray[extensionArray.length - 1];
				}
				let id = attachmentId[0].getAttribute("Id");
				aCard.photo = {types: [], value: "", URI: "", extension: extension, attachmentId: id};
			}
		}

		let org = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "CompanyName")[0];
		if (org && org.textContent) {
			aCard.org = org.textContent;
		}
		let title = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "JobTitle")[0];
		if (title && title.textContent) {
			aCard.title = title.textContent;
		}
		let department = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Department")[0];
		if (department && department.textContent) {
			aCard.org += ";" + department.textContent;
		}
		let emails = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "EmailAddresses")[0];
		if (emails) {
			let emailEntries = emails.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Entry");
			for (let email of emailEntries) {
				let value = email.textContent;
				aCard.email.push([ [ value ] , [], "", [], "" ]);
			}
		}

		let addresses = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "PhysicalAddresses")[0];
		if (addresses) {
			let addressesEntries = addresses.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Entry");
			for (let adr of addressesEntries) {
				let key = adr.getAttribute("Key");
				let street = "";
				if (adr.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Street")[0]) {
					street = adr.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Street")[0].textContent;
				}
				let city = "";
				if (adr.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "City")[0]) {
					city = adr.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "City")[0].textContent;
				}
				let region = "";
				if (adr.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "State")[0]) {
					region = adr.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "State")[0].textContent;
				}
				let postalCode = "";
				if (adr.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "PostalCode")[0]) {
					postalCode = adr.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "PostalCode")[0].textContent;
				}
				let country = "";
				if (adr.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "CountryOrRegion")[0]) {
					country = adr.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "CountryOrRegion")[0].textContent;
				}
				if (street || city || region || postalCode || country) {
					if ( key == "Business") {
						aCard.adr.push([ [ "", "", street, city, region, postalCode, country ] , [ "TYPE=WORK" ], "", [], "" ]);
					} else if ( key == "Home") {
						aCard.adr.push([ [ "", "", street, city, region, postalCode, country ] , [ "TYPE=HOME" ], "", [], "" ]);
					} else if ( key == "Other") {
						aCard.adr.push([ [ "", "", street, city, region, postalCode, country ] , [ "TYPE=OTHER" ], "", [], "" ]);
					}
				}
			}
		}

		let tels = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "PhoneNumbers")[0];
		if (tels) {
			let telsEntries = tels.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Entry");
			for (let tel of telsEntries) {
				let key = tel.getAttribute("Key");
				let value = tel.textContent;
				if (value) {
					if ( key == "AssistantPhone") {
						aCard.tel.push([ [ value ] , [ "TYPE=ASSISTANT" ], "", [], "" ]);
					} else if ( key == "BusinessFax") {
						aCard.tel.push([ [ value ] , [ "TYPE=WORK", "TYPE=FAX" ], "", [], "" ]);
					} else if ( key == "BusinessPhone" || key == "BusinessPhone2" || key == "CompanyMainPhone") {
						aCard.tel.push([ [ value ] , [ "TYPE=WORK" ], "", [], "" ]);
					} else if ( key == "Callback") {
						aCard.tel.push([ [ value ] , [ "TYPE=CALLBACK" ], "", [], "" ]);
					} else if ( key == "CarPhone") {
						aCard.tel.push([ [ value ] , [ "TYPE=CARPHONE" ], "", [], "" ]);
					} else if ( key == "HomeFax") {
						aCard.tel.push([ [ value ] , [ "TYPE=HOME", "TYPE=FAX" ], "", [], "" ]);
					} else if ( key == "HomePhone" || key == "HomePhone2") {
						aCard.tel.push([ [ value ] , [ "TYPE=HOME" ], "", [], "" ]);
					} else if ( key == "MobilePhone") {
						aCard.tel.push([ [ value ] , [ "TYPE=CELL" ], "", [], "" ]);
					} else if ( key == "OtherFax") {
						aCard.tel.push([ [ value ] , [ "TYPE=OTHER", "TYPE=FAX" ], "", [], "" ]);
					} else if ( key == "OtherTelephone") {
						aCard.tel.push([ [ value ] , [ "TYPE=OTHER" ], "", [], "" ]);
					} else if ( key == "Pager") {
						aCard.tel.push([ [ value ] , [ "TYPE=PAGER" ], "", [], "" ]);
					} else if ( key == "RadioPhone") {
						aCard.tel.push([ [ value ] , [ "TYPE=RADIO" ], "", [], "" ]);
					} else if ( key == "Telex") {
						aCard.tel.push([ [ value ] , [ "TYPE=TELEX" ], "", [], "" ]);
					} else if ( key == "TtyTddPhone") {
						aCard.tel.push([ [ value ] , [ "TYPE=TTY" ], "", [], "" ]);
					}
				}			
			}
		}

		let impps = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "ImAddresses")[0];
		if (impps) {
			let imppEntries = impps.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Entry");
			for (let impp of imppEntries) {
				let value = impp.textContent;
				aCard.impp.push([ [ value ] , [], "", [], "" ]);
			}
		}

		let members = aOffice365Contact.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "Member");
		if (members) {
			let allMembers = [];
			for (let member of members) {
				let emailAddress = member.getElementsByTagNameNS(cardbookSynchronizationOffice365.nsTypes, "EmailAddress");
				if (emailAddress[0]) {
					allMembers.push("mailto:" + emailAddress[0].textContent);
				}
			}
			aCard.isAList = true;
			cardbookRepository.cardbookUtils.addMemberstoCard(aCard, allMembers, "");
		}

		cardbookRepository.cardbookUtils.setCalculatedFields(aCard);
		// console.debug(aCard);
		return aCard;
	},

	waitForOffice365SyncFinished: function (aPrefId, aPrefName) {
		// wait 10 s to be sure the category were memorized by Google
		var waitTime = 10000;
		cardbookRepository.lTimerSyncAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
		var lTimerSync = cardbookRepository.lTimerSyncAll[aPrefId];
		lTimerSync.initWithCallback({ notify: function(lTimerSync) {
					cardbookRepository.cardbookUtils.notifyObservers("syncRunning", aPrefId);
					let type = cardbookRepository.cardbookPreferences.getType(aPrefId);
					if (cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aPrefId] != 0) {
						if (cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aPrefId] == cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal[aPrefId]) {
							cardbookRepository.cardbookServerSyncCompareCardWithCacheDone[aPrefId] = 0;
							cardbookRepository.cardbookServerSyncCompareCardWithCacheTotal[aPrefId] = 0;
							if (cardbookRepository.cardbookServerMultiGetArray[aPrefId].length != 0) {
								cardbookSynchronizationOffice365.serverMultiGet(cardbookRepository.cardbookServerSyncParams[aPrefId][0], type);
							}
						}
					}
					if (cardbookRepository.cardbookServerSyncHandleRemainingCardDone[aPrefId] == cardbookRepository.cardbookServerSyncHandleRemainingCardTotal[aPrefId]) {
						var request = cardbookSynchronization.getRequest(aPrefId, aPrefName) + cardbookSynchronization.getTotal(aPrefId, aPrefName);
						var response = cardbookSynchronization.getResponse(aPrefId, aPrefName) + cardbookSynchronization.getDone(aPrefId, aPrefName);
						cardbookActions.fetchSyncActivity(aPrefId, cardbookRepository.cardbookServerCardSyncDone[aPrefId], cardbookRepository.cardbookServerCardSyncTotal[aPrefId]);
						if (request == response) {
							let currentConnection = cardbookRepository.cardbookServerSyncParams[aPrefId][0];
							let connection = {connUser: currentConnection.connUser, connPrefId: currentConnection.connPrefId, connType: type, connUrl: cardbookRepository.cardbookOAuthData.GOOGLE2.REFRESH_REQUEST_URL, connDescription: currentConnection.connDescription};
							cardbookRepository.cardbookServerSyncParams[aPrefId] = [ connection ];
							if (cardbookRepository.cardbookServerSyncParams[aPrefId].length && cardbookRepository.cardbookAccessTokenRequest[aPrefId] == 1 && cardbookRepository.cardbookAccessTokenError[aPrefId] != 1) {
								cardbookRepository.cardbookServerSyncRequest[aPrefId]++;
								// test new token ?
							} else {
								if (cardbookRepository.cardbookServerSyncAgain[aPrefId] && cardbookSynchronization.getError(aPrefId) == 0) {
									cardbookRepository.cardbookUtils.formatStringForOutput("synchroForcedToResync", [aPrefName]);
									cardbookSynchronization.finishMultipleOperations(aPrefId);
									cardbookSynchronization.finishSync(aPrefId, aPrefName, type);
									// to avoid other sync during the wait time
									cardbookRepository.cardbookSyncMode[aPrefId] = 1;
									if ("undefined" == typeof(setTimeout)) {
										var { setTimeout } = ChromeUtils.import("resource://gre/modules/Timer.jsm");
									}
									setTimeout(function() {
											cardbookSynchronization.syncAccount(aPrefId, true);
										}, 10000);               
								} else {
									if (cardbookSynchronization.getError(aPrefId) == 0) {
										let sysdate = cardbookRepository.cardbookDates.getDateUTC();
										let syncdate = sysdate.year + sysdate.month + sysdate.day + "T" + sysdate.hour + sysdate.min + sysdate.sec + "Z";
										cardbookRepository.cardbookPreferences.setLastSync(aPrefId, syncdate);
										cardbookRepository.cardbookPreferences.setSyncFailed(aPrefId, false);
									} else {
										cardbookRepository.cardbookPreferences.setSyncFailed(aPrefId, true);
									}
									cardbookSynchronization.finishMultipleOperations(aPrefId);
									cardbookSynchronization.finishSync(aPrefId, aPrefName, type);
									var total = cardbookSynchronization.getRequest() + cardbookSynchronization.getTotal() + cardbookSynchronization.getResponse() + cardbookSynchronization.getDone();
									// all sync are finished
									if (total === 0) {
										// should check if some should be restarted because of a changed password
										var syncAgain = [];
										var syncFailed = [];
										for (let i in cardbookRepository.cardbookServerChangedPwd) {
											if (cardbookRepository.cardbookServerChangedPwd[i].pwdChanged) {
												syncAgain = syncAgain.concat(cardbookRepository.cardbookServerChangedPwd[i].dirPrefIdList);
											} else {
												syncFailed = syncFailed.concat(cardbookRepository.cardbookServerChangedPwd[i].dirPrefIdList);
											}
										}
										cardbookRepository.cardbookServerChangedPwd = {};
										for (var j = 0; j < syncAgain.length; j++) {
											var myPrefId = syncAgain[j];
											var myPrefName = cardbookRepository.cardbookUtils.getPrefNameFromPrefId(myPrefId);
											cardbookRepository.cardbookUtils.formatStringForOutput("synchroForcedToResync", [myPrefName]);
											cardbookSynchronization.syncAccount(myPrefId, false);
										}
										for (var j = 0; j < syncFailed.length; j++) {
											var myPrefId = syncFailed[j];
											cardbookRepository.cardbookUtils.formatStringForOutput("synchronizationFailed", [cardbookRepository.cardbookPreferences.getName(myPrefId), "passwordNotChanged", cardbookRepository.cardbookPreferences.getUrl(myPrefId), 401], "Error");
										}
										if (syncAgain.length == 0) {
											cardbookRepository.cardbookUtils.formatStringForOutput("synchroAllFinished");
											if (cardbookRepository.initialSync) {
												ovl_birthdays.onLoad();
												cardbookRepository.initialSync = false;
											}
											// final step for synchronizations
											cardbookSynchronization.startDiscovery();
										}
									}
								}
								lTimerSync.cancel();
							}
						}
					}
				}
				}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
	}
};
