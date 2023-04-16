if ("undefined" == typeof(ovl_cardbookLayout)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_cardbookLayout = {
		origFunctions: {},

		changeResizePanes: function(aPref, aSplitter) {
			if (aSplitter) {
				// unpossible to fire a drag event on splitter
				// don't know how to do
				cardbookRepository.cardbookPreferences.setBoolPref(aPref, (aSplitter.getAttribute("state") == "open"));
			} else {
				cardbookRepository.cardbookPreferences.setBoolPref(aPref, !cardbookRepository.cardbookPrefs[aPref]);
			}
			ovl_cardbookLayout.resizePanes();
		},

		resizePanes: function() {
			if (document.getElementById("cardsBox") && document.getElementById("dirTreeSplitter")) {
				if (cardbookRepository.cardbookPrefs["viewABPane"]) {
					document.getElementById("dirTreeSplitter").setAttribute("state", "open");
				} else {
					document.getElementById("dirTreeSplitter").setAttribute("state", "collapsed");
				}
				if (cardbookRepository.cardbookPrefs["viewABContact"]) {
					document.getElementById("resultsSplitter").setAttribute("state", "open");
				} else {
					document.getElementById("resultsSplitter").setAttribute("state", "collapsed");
				}
			}
		},

		setCheckboxes: function() {
			if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
				document.getElementById("cardbookABPaneItem").hidden=false;
				document.getElementById("cardbookContactPaneItem").hidden=false;
				document.getElementById("menu_showFolderPane").hidden=true;
				document.getElementById("menu_showFolderPaneCols").hidden=true;
				document.getElementById("menu_showMessage").hidden=true;
				document.getElementById("cardbookABPaneItem").setAttribute('checked', cardbookRepository.cardbookPrefs["viewABPane"]);
				document.getElementById("cardbookContactPaneItem").setAttribute('checked', cardbookRepository.cardbookPrefs["viewABContact"]);
			} else {
				document.getElementById("cardbookABPaneItem").hidden=true;
				document.getElementById("cardbookContactPaneItem").hidden=true;
				document.getElementById("menu_showFolderPane").hidden=false;
				document.getElementById("menu_showFolderPaneCols").hidden=false;
				document.getElementById("menu_showMessage").hidden=false;
			}
		},

		setCheckboxesForWindow: function() {
			document.getElementById("cardbookABPaneItem").setAttribute('checked', cardbookRepository.cardbookPrefs["viewABPane"]);
			document.getElementById("cardbookContactPaneItem").setAttribute('checked', cardbookRepository.cardbookPrefs["viewABContact"]);
		},

		setBoxes: function(aEvent) {
			aEvent.stopImmediatePropagation();
			var paneConfig = 0;
			var panesView = cardbookRepository.cardbookPrefs["panesView"];
			if (panesView == "modern") {
				var paneConfig = 2;
			} else if (panesView == "classical") {
				var paneConfig = 0;
			}
			var layoutStyleMenuitem = aEvent.target.childNodes[paneConfig];
			if (layoutStyleMenuitem) {
				layoutStyleMenuitem.setAttribute("checked", "true");
			}
		},

		changeOrientPanes: function(aValue) {
			if (aValue == "cmd_viewClassicMailLayout") {
				var strData = "classical";
			} else if (aValue == "cmd_viewVerticalMailLayout") {
				var strData = "modern";
			}
			cardbookRepository.cardbookPreferences.setStringPref("panesView", strData);
			ovl_cardbookLayout.orientPanes();
		},

		orientPanes: async function() {
			if (document.getElementById("cardsBox") && document.getElementById("resultsSplitter")) {
				var panesView = cardbookRepository.cardbookPrefs["panesView"];
				if (panesView == "modern") {
					document.getElementById("cardsBox").setAttribute("orient", "horizontal");
					document.getElementById("resultsSplitter").hidden=false;
					document.getElementById("resultsSplitter").setAttribute("orient", "horizontal");
					document.getElementById("resultsSplitter").setAttribute("class", "cardbookVerticalSplitterClass");
				} else {
					document.getElementById("cardsBox").setAttribute("orient", "vertical");
					document.getElementById("resultsSplitter").hidden=false;
					document.getElementById("resultsSplitter").setAttribute("orient", "vertical");
					document.getElementById("resultsSplitter").setAttribute("class", "cardbookHorizontalSplitterClass");
				}
				if (cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value]) {
					var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
					await wdw_cardbook.displayCard(myCard);
				}
			}
		}

	};
};

// for the displayed name of emails
// InitViewLayoutStyleMenu
(function() {
	// for the standalone window, does not exist
	if ("undefined" != typeof(InitViewLayoutStyleMenu)) {
		// Keep a reference to the original function.
		ovl_cardbookLayout.origFunctions.InitViewLayoutStyleMenu = InitViewLayoutStyleMenu;
		
		// Override a function.
		InitViewLayoutStyleMenu = function() {
			
			ovl_cardbookLayout.setCheckboxes();
			// Execute some action afterwards.
			if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
				ovl_cardbookLayout.setBoxes(arguments[0]);
			} else {
				// Execute original function.
				ovl_cardbookLayout.origFunctions.InitViewLayoutStyleMenu.apply(null, arguments);
			}
		};
	}
})();

// for displaying the undo and redo
// InitEditMessagesMenu
(function() {
	// for the standalone window, does not exist
	if ("undefined" != typeof(InitEditMessagesMenu)) {
		// Keep a reference to the original function.
		ovl_cardbookLayout.origFunctions.InitEditMessagesMenu = InitEditMessagesMenu;
		
		// Override a function.
		InitEditMessagesMenu = function() {
			
			// Execute some action afterwards.
			if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
				cardbookActions.setUndoAndRedoMenuAndButton();
			} else {
				// Execute original function.
				ovl_cardbookLayout.origFunctions.InitEditMessagesMenu.apply(null, arguments);
			}
		};
	}
})();
