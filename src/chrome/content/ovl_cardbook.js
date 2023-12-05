var cardbookTabMonitor = {
	monitorName: "cardbook",
	onTabTitleChanged: function() {},
	onTabOpened: function(aTab) {
		// the currentset is lost by the overlay loader
		var currentSet = cardbookRepository.cardbookPrefs["cardbookToolbar.currentset"];
		var toolbar = document.getElementById("cardbook-toolbar");
		var toolbox = document.getElementById("cardbook-toolbox");
		if (currentSet) {
			toolbar.currentSet = currentSet;
		}
		var mode = cardbookRepository.cardbookPrefs["cardbookToolbar.mode"].split("::");
		if (mode[0]) {
			toolbar.setAttribute("mode", mode[0]);
			toolbox.setAttribute("mode", mode[0]);
		}
		if (mode[1]) {
			toolbar.setAttribute("labelalign", mode[1]);
			toolbox.setAttribute("labelalign", mode[1]);
		}
		document.getElementById("cardbookTabPanel").removeAttribute("collapsed");
		wdw_cardbook.loadFirstWindow();
	},
	onTabClosing: function(aTab) {
		document.getElementById("cardbookTabPanel").setAttribute("collapsed", "true");
		if (aTab.mode.name == "cardbook") {
			if (document.getElementById("cardboookModeBroadcasterTab")) {
				document.getElementById("cardboookModeBroadcasterTab").setAttribute("mode", "mail");
			}
		}
		// spaces
		document.getElementById("cardbookButton").classList.remove("current");
		document.getElementById("spacesPopupButtonCardBook").classList.remove("current");
	},
	onTabPersist: function() {},
	onTabRestored: function() {},
	onTabSwitched: function(aNewTab, aOldTab) {
		if (aNewTab.mode.name == "cardbook") {
			if (document.getElementById("cardboookModeBroadcasterTab")) {
				document.getElementById("cardboookModeBroadcasterTab").setAttribute("mode", "cardbook");
			}
			document.getElementById("cardbookTabPanel").removeAttribute("collapsed");
		} else {
			if (document.getElementById("cardboookModeBroadcasterTab")) {
				document.getElementById("cardboookModeBroadcasterTab").setAttribute("mode", "mail");
			}
			if (document.getElementById("cardbookTabPanel")) {
				document.getElementById("cardbookTabPanel").setAttribute("collapsed", "true");
			}
		}
		// spaces
		if (aNewTab.mode.name == "cardbook") {
			let nodes = document.getElementById("spacesToolbar").querySelectorAll(".spaces-toolbar-button");
			for (let node of nodes) {
				node.classList.remove("current");
			}
			document.getElementById("cardbookButton").classList.add("current");
			let menus = document.getElementById("spacesButtonMenuPopup").querySelectorAll(".spaces-popup-menuitem");
			for (let menu of menus) {
				menu.classList.remove("current");
			}
			document.getElementById("spacesPopupButtonCardBook").classList.add("current");
		} else {
			document.getElementById("cardbookButton").classList.remove("current");
			document.getElementById("spacesPopupButtonCardBook").classList.remove("current");
		}
	}
};

var cardbookTabType = {
	name: "cardbook",
	panelId: "cardbookTabPanel",
	modes: {
		cardbook: {
			type: "cardbookTab",
			maxTabs: 1,
			openTab: function(aTab, aArgs) {
				aTab.tabNode.setIcon("chrome://cardbook/content/skin/cardbook.svg");
				aTab.title = aArgs["title"];
				ovl_cardbookLayout.orientPanes();
			},

			showTab: function(aTab) {
			},

			closeTab: function(aTab) {
				cardBookWindowObserver.unregister();
			},
			
			persistTab: function(aTab) {
				let tabmail = document.getElementById("tabmail");
				return {
					background: (aTab != tabmail.currentTabInfo)
					};
			},
			
			restoreTab: function(aTabmail, aState) {
				aState.title = cardbookRepository.extension.localeData.localizeMessage("cardbookTitle");
				aTabmail.openTab('cardbook', aState);
			},
			
			onTitleChanged: function(aTab) {
				aTab.title = cardbookRepository.extension.localeData.localizeMessage("cardbookTitle");
			},
			
			supportsCommand: function supportsCommand(aCommand, aTab) {
				switch (aCommand) {
					case "cmd_toggleMessagePane":
					case "cmd_viewClassicMailLayout":
					case "cmd_viewVerticalMailLayout":
					case "cmd_printSetup":
					case "cmd_print":
					case "cmd_printpreview":
					case "cmd_copy":
					case "cmd_cut":
					case "cmd_paste":
					case "cmd_delete":
					case "cmd_find":
					case "cmd_findAgain":
					case "cmd_showQuickFilterBar":
					case "cmd_undo":
					case "cmd_redo":
						return true;
					default:
						return false;
				}
			},
			
			isCommandEnabled: function isCommandEnabled(aCommand, aTab) {
				switch (aCommand) {
					case "cmd_toggleMessagePane":
					case "cmd_viewClassicMailLayout":
					case "cmd_viewVerticalMailLayout":
					case "cmd_printSetup":
					case "cmd_print":
					case "cmd_printpreview":
					case "cmd_copy":
					case "cmd_cut":
					case "cmd_paste":
					case "cmd_delete":
					case "cmd_find":
					case "cmd_findAgain":
					case "cmd_showQuickFilterBar":
					case "cmd_undo":
					case "cmd_redo":
						return true;
					default:
						return false;
				}
			},
			
			doCommand: function doCommand(aCommand, aTab) {
				switch (aCommand) {
					case "cmd_toggleMessagePane":
						ovl_cardbookLayout.changeResizePanes('viewABContact');
						break;
					case "cmd_viewClassicMailLayout":
					case "cmd_viewVerticalMailLayout":
						ovl_cardbookLayout.changeOrientPanes(aCommand);
						break;
					case "cmd_printSetup":
						PrintUtils.showPageSetup();
						break;
					case "cmd_print":
					case "cmd_printpreview":
						wdw_cardbook.printCards();
						break;
					case "cmd_copy":
						wdw_cardbook.copyKey();
						break;
					case "cmd_cut":
						wdw_cardbook.cutKey();
						break;
					case "cmd_paste":
						wdw_cardbook.pasteKey();
						break;
					case "cmd_delete":
						wdw_cardbook.deleteKey();
						break;
					case "cmd_find":
					case "cmd_findAgain":
					case "cmd_showQuickFilterBar":
						wdw_cardbook.findKey();
						break;
					case "cmd_undo":
						cardbookActions.undo();
						break;
					case "cmd_redo":
						cardbookActions.redo();
						break;
				}
			},

			onEvent: function(aEvent, aTab) {}
		}
	},

	saveTabState: function(aTab) {
	}
};
	
var ovl_cardbook = {
	reloadCardBookQFB: function () {
		if (cardbookRepository.cardbookPrefs["exclusive"]) {
			if (document.getElementById("mail3PaneTabBrowser1").contentDocument.getElementById('qfb-inaddrbook')) {
				document.getElementById("mail3PaneTabBrowser1").contentDocument.getElementById('qfb-inaddrbook').hidden = true;
			}
		} else {
			if (document.getElementById("mail3PaneTabBrowser1").contentDocument.getElementById('qfb-inaddrbook')) {
				document.getElementById("mail3PaneTabBrowser1").contentDocument.getElementById('qfb-inaddrbook').hidden = false;
			}
		}
		if (document.getElementById("mail3PaneTabBrowser1").contentDocument.getElementById("quickFilterBarCardBookContainer") && 
			!document.getElementById("mail3PaneTabBrowser1").contentDocument.getElementById("quickFilterBarCardBookContainer").hidden) {
			try {
				let { quickFilterBar } = document.getElementById("mail3PaneTabBrowser1").contentWindow;
				quickFilterBar.updateSearch();
			} catch (e) {}
		}
	},

	overrideToolbarMenu: function() {
		var menus = [ 'toolbar-context-menu', 'menu_Toolbars' ];
		for (var i in menus) {
			if (document.getElementById(menus[i])) {
				var myMenu = document.getElementById(menus[i]);
				myMenu.removeEventListener('popupshowing', arguments.callee, true);
				myMenu.addEventListener("popupshowing", function(event) {
					if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
						onViewToolbarsPopupShowing(event, ["navigation-toolbox", "cardbook-toolbox"]);
					} else {
						// does not exist with messengercompose
						if ("undefined" !== typeof(onToolbarsPopupShowingForTabType)) {
							onToolbarsPopupShowingForTabType(event);
						}
					}
				});
			}
		}
	},

	load: async function() {
		let tabmail = document.getElementById('tabmail');
		if (tabmail) {
			tabmail.registerTabType(cardbookTabType);
			tabmail.registerTabMonitor(cardbookTabMonitor);
		}

		var firstRun = cardbookRepository.cardbookPrefs["firstRun"];
		if (firstRun) {
			await wdw_cardbook.addAddressbook("first");
			cardbookRepository.cardbookPreferences.setBoolPref("firstRun", false);
		}

		if (document.getElementById("addressBook")) {
			document.getElementById("addressBook").removeAttribute("key");
		}
		if (document.getElementById("appmenu_addressBook")) {
			document.getElementById("appmenu_addressBook").removeAttribute("key");
		}
		if (document.getElementById("key_addressbook")) {
			document.getElementById("key_addressbook").setAttribute("key", "");
		}

		ovl_cardbook.overrideToolbarMenu();
	},

	unload: function() {
		// observers
		cardBookObserver.unregister();
		// test myFormatObserver.unregister();

		InitViewLayoutStyleMenu = ovl_cardbookLayout.origFunctions.InitViewLayoutStyleMenu;
		InitEditMessagesMenu = ovl_cardbookLayout.origFunctions.InitEditMessagesMenu;

		// closing tabs
		let tabmail = document.getElementById("tabmail");
		let cardbookMode = tabmail.tabModes.cardbook;
		if (cardbookMode.tabs.length == 1) {
			tabmail.closeTab(cardbookMode.tabs[0]);
		}
		for (let i = tabmail.tabModes.contentTab.tabs.length - 1; i >= 0; i--) {
			if (tabmail.tabModes.contentTab.tabs[i].title == cardbookRepository.extension.localeData.localizeMessage("cardbookPrefTitle") + " (" + cardbookRepository.cardbookPrefs["addonVersion"] + ")") {
				tabmail.closeTab(tabmail.tabModes.contentTab.tabs[i]);
			}
		}
		// unregistering
		if (tabmail) {
			tabmail.unregisterTabType(cardbookTabType);
			tabmail.unregisterTabMonitor(cardbookTabMonitor);
		}
	},

	open: function() {
		var tabmail = document.getElementById("tabmail");
		if (!tabmail) {
			// Try opening new tabs in an existing 3pane window
			let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
			if (mail3PaneWindow) {
				tabmail = mail3PaneWindow.document.getElementById("tabmail");
				mail3PaneWindow.focus();
			}
		}
		tabmail.openTab('cardbook', {title: cardbookRepository.extension.localeData.localizeMessage("cardbookTitle")});
	}
};


