if ("undefined" == typeof(cardbookClipboard)) {
	var { NetUtil } = ChromeUtils.import("resource://gre/modules/NetUtil.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

	var cardbookClipboard = {

		clipboardSetImage: function (aBase64, aType) {
			notifyTools.notifyBackground({query: "cardbook.clipboardSetImage", type: aType, b64: aBase64});
		},

		clipboardSetText: function (aText, aMessage) {
			notifyTools.notifyBackground({query: "cardbook.clipboardSetText", text: aText});
			if (aMessage) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation(aMessage);
			}
		},

		clipboardSetValueForFlavor: function (aFlavor, aText, aMessage) {
			let ss = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString);
			let trans = Components.classes['@mozilla.org/widget/transferable;1'].createInstance(Components.interfaces.nsITransferable);
	
			let clipid = Components.interfaces.nsIClipboard;
			let clipboard   = Components.classes['@mozilla.org/widget/clipboard;1'].getService(clipid);
			if (!clipboard)
				return;
	
			ss.data = aText;
			trans.addDataFlavor(aFlavor);
			trans.setTransferData(aFlavor, ss, aText.length * 2);
			clipboard.setData(trans, null, clipid.kGlobalClipboard);
			
			if (aMessage) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation(aMessage);
			}
		},

		clipboardGetSupportedFlavors: function(aType) {
			var flavors = [];
			if (aType == "IMAGES") {
				flavors.push("image/jpeg");
				flavors.push("image/jpg");
				flavors.push("image/png");
				flavors.push("image/gif");
				flavors.push("application/x-moz-file");
				flavors.push("text/unicode");
				flavors.push("text/plain");
			} else if (aType == "CARDS") {
				flavors.push("text/x-moz-cardbook-id");
			}
			return flavors;
		},

		clipboardCanPaste: function(aType) {
            var flavors = cardbookClipboard.clipboardGetSupportedFlavors(aType);
            return Services.clipboard.hasDataMatchingFlavors(flavors, Services.clipboard.kGlobalClipboard);
		},

		clipboardGetData: function(aType) {
			var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
			var flavors = cardbookClipboard.clipboardGetSupportedFlavors(aType);
			for (let i = 0; i < flavors.length; i++) {
				trans.addDataFlavor(flavors[i]);
			}
			Services.clipboard.getData(trans, Services.clipboard.kGlobalClipboard);

			var flavor = {};
			var data = {};
			trans.getAnyTransferData(flavor, data);
			return { flavor: flavor.value, data: data.value }; 
		}
	};
};
