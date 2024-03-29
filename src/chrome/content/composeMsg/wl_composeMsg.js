// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookEncryptor.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIndexedDB.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBCard.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBCat.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBUndo.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBImage.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBMailPop.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBPrefDispName.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBSearch.js", window, "UTF-8");

Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookActions.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookCardParser.js", window, "UTF-8");

Services.scriptloader.loadSubScript("chrome://cardbook/content/autocomplete/cardbookAutocompleteSearch.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/autocomplete/cardbookAutocomplete.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/composeMsg/ovl_cardbookComposeMsg.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookWindowUtils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookObserverRepository.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookComposeMsgObserver.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookObserver.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/ovl_cardbook.js", window, "UTF-8");

Services.scriptloader.loadSubScript("chrome://cardbook/content/lists/cardbookListConversion.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/lists/ovl_list.js", window, "UTF-8");

Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookInit.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookSynchro.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/contactsSidebar/ovl_cardbookContactsSidebarMain.js", window, "UTF-8");

function onLoad(wasAlreadyOpen) {
	// autocompletion, buttons and menus
	WL.injectCSS("chrome://cardbook/content/skin/cardbookAutocomplete.css");
	WL.injectCSS("chrome://cardbook/content/skin/cardbookComposeMsg.css");

	WL.injectElements(`
	<!-- horrible hack to have the CardBookKey defined -->
	<!-- <keyset id="viewZoomKeys"> -->
	<key id="CardBookKey" key="__MSG_cardbookMenuItemAccesskey__" modifiers="accel, shift" oncommand="ovl_cardbook.open();" insertafter="key_fullZoomReduce"/>

	<menupopup id="taskPopup">
		<menuitem id="cardbookMenuItem"
			label="__MSG_cardbookMenuItemLabel__" accesskey="__MSG_cardbookMenuItemAccesskey__"
			key="CardBookKey"
			tooltiptext="__MSG_cardbookMenuItemTooltip__"
			oncommand="ovl_cardbook.open();"
			insertafter="tasksMenuAddressBook"/>
	</menupopup>
	`);

	window.ovl_cardbookComposeMsg.loadMsg();
};

function onUnload(wasAlreadyOpen) {
	window.ovl_cardbookComposeMsg.unloadMsg();
};