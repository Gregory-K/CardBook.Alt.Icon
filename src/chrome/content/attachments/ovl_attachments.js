if ("undefined" == typeof(ovl_attachments)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	Services.scriptloader.loadSubScript("chrome://cardbook/content/attachments/cardbookAttachmentUtils.js", window, "UTF-8");

	var ovl_attachments = {
		origFunctions: {},
		
		setCardBookMenus: function (aValue) {
			document.getElementById('attachments1CardBookImport').disabled = aValue;
			document.getElementById('attachment1CardBookImport').disabled = aValue;
			if (!aValue) {
				cardbookWindowUtils.addToCardBookMenuSubMenu('attachments1CardBookImportPopup', ovl_cardbookAboutMessage.getIdentityKey(), cardbookAttachmentUtils.importFileIntoCardBook, {"emailAttachment" : "true"});
				cardbookWindowUtils.addToCardBookMenuSubMenu('attachment1CardBookImportPopup', ovl_cardbookAboutMessage.getIdentityKey(), cardbookAttachmentUtils.importFileIntoCardBook, {"emailAttachment" : "true"});
			}
		},

		displayCardBookMenu: function() {
			var disabled = true;
			var attachmentList = document.getElementById('attachmentList');
			var selectedAttachments = attachmentList.selectedItems;
			if (selectedAttachments.length == 0) {
				for (var i = 0; i < currentAttachments.length; i++) {
					var attachment = currentAttachments[i];
					var myFileArray = attachment.name.split(".");
					var myExtension =  myFileArray[myFileArray.length-1];
					if (myExtension.toLowerCase() == "vcf") {
						disabled = false;
						break;
					}
				}
			} else {
				for (var i = 0; i < selectedAttachments.length; i++) {
					var attachment = selectedAttachments[i].attachment;
					var myFileArray = attachment.name.split(".");
					var myExtension =  myFileArray[myFileArray.length-1];
					if (myExtension.toLowerCase() == "vcf") {
						disabled = false;
						break;
					}
				}
			}
			ovl_attachments.setCardBookMenus(disabled);
		},

		unload: function() {
			window.onShowSaveAttachmentMenuMultiple = ovl_attachments.origFunctions.onShowSaveAttachmentMenuMultiple;
			window.onShowSaveAttachmentMenuSingle = ovl_attachments.origFunctions.onShowSaveAttachmentMenuSingle;
		}
	};
};

// for the displaying or not import into CardBook for all attachments
// onShowSaveAttachmentMenuMultiple
(function() {
	// Keep a reference to the original function.
	ovl_attachments.origFunctions.onShowSaveAttachmentMenuMultiple = window.onShowSaveAttachmentMenuMultiple;
	
	// Override a function.
	window.onShowSaveAttachmentMenuMultiple = function() {
		
		// Execute original function.
		var rv = ovl_attachments.origFunctions.onShowSaveAttachmentMenuMultiple.apply(null, arguments);
		ovl_attachments.displayCardBookMenu();
		
		// return the original result
		return rv;
	};

})();

// for the displaying or not import into CardBook for one attachment
// onShowSaveAttachmentMenuSingle
(function() {
	// Keep a reference to the original function.
	ovl_attachments.origFunctions.onShowSaveAttachmentMenuSingle = window.onShowSaveAttachmentMenuSingle;
	
	// Override a function.
	window.onShowSaveAttachmentMenuSingle = function() {
		
		// Execute original function.
		var rv = ovl_attachments.origFunctions.onShowSaveAttachmentMenuSingle.apply(null, arguments);
		ovl_attachments.displayCardBookMenu();
		
		// return the original result
		return rv;
	};

})();
