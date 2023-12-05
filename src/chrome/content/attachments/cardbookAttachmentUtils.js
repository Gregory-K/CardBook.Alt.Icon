if ("undefined" == typeof(cardbookAttachmentUtils)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var cardbookAttachmentUtils = {
		loadAttachment: async function(aAttachment, aDirPrefId) {
			let myFileArray = aAttachment.name.split(".");
			let myExtension =  myFileArray[myFileArray.length-1];
			if (myExtension.toLowerCase() == "vcf") {
                let attachmentId = aAttachment.partID || aAttachment.partName;
				let content = await notifyTools.notifyBackground({query: "cardbook.getAttachmentContent", attachmentId: attachmentId});
				let myTopic = "cardsImportedFromFile";
				let actionId = cardbookActions.startAction(myTopic, [aAttachment.name], aDirPrefId, 1);
				cardbookRepository.importConflictChoice[aDirPrefId] = {};
				cardbookRepository.currentAction[actionId]["mode"] = "import";
				cardbookRepository.currentAction[actionId]["status"] = "STARTED";
				cardbookRepository.currentAction[actionId]["params"] = {};
				let params = {};
				params["aTarget"] = aDirPrefId;
				params["aImportMode"] = "IMPORTFILE";
				params["aPrefId"] = aDirPrefId;
				params["aPrefIdType"] = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
				params["aPrefIdName"] = cardbookRepository.cardbookPreferences.getName(aDirPrefId);
				params["aPrefIdUrl"] = cardbookRepository.cardbookPreferences.getUrl(aDirPrefId);
				params["aPrefIdVersion"] = cardbookRepository.cardbookPreferences.getVCardVersion(aDirPrefId);
				params["aPrefIdDateFormat"] = cardbookRepository.getDateFormat(aDirPrefId, params["aPrefIdVersion"]);
				params["aActionId"] = actionId;
				cardbookRepository.cardbookSynchronization.loadFileAsync(content, params);
				cardbookRepository.cardbookSynchronization.waitForImportFinished(aDirPrefId, actionId, {window: Services.wm.getMostRecentWindow("mail:3pane"), name: aAttachment.name, dirname: params["aPrefIdName"]});
			}
		},

		importFileIntoCardBook: async function(aDirPrefId) {
			var attachmentList = document.getElementById('attachmentList');
			var selectedAttachments = attachmentList.selectedItems;
			if (selectedAttachments.length == 0) {
				for (var i = 0; i < currentAttachments.length; i++) {
					await cardbookAttachmentUtils.loadAttachment(currentAttachments[i], aDirPrefId);
				}
			} else {
				for (var i = 0; i < selectedAttachments.length; i++) {
					await cardbookAttachmentUtils.loadAttachment(selectedAttachments[i].attachment, aDirPrefId);
				}
			}
		}
	};
};
