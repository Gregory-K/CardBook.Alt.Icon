// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { TagUtils } = ChromeUtils.import("resource:///modules/TagUtils.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

// for the quickfilter bar and the filters
var { QuickFilterManager } = ChromeUtils.import("resource:///modules/QuickFilterManager.jsm");

Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookEncryptor.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIndexedDB.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBCard.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBCat.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBUndo.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBImage.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBMailPop.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBPrefDispName.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBSearch.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBDuplicate.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookObserverRepository.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBook3PaneObserver.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookActions.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookCardParser.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookWindowUtils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/ovl_cardbookAbout3Pane.js", window, "UTF-8");

// called on window load or on add-on activation while window is already open
function onLoad(wasAlreadyOpen) {
	WL.injectCSS("chrome://cardbook/content/skin/cardbookAddressBooks.css");
	WL.injectCSS("chrome://cardbook/content/skin/cardbookQFB.css");

	WL.injectElements(`

	<div id="quickFilterBarContainer">
		<html:button id="qfb-cardbook"
			is="toggle-button"
			class="button collapsible-button icon-button check-button"
			title="__MSG_cardbookQFBButtonTooltip__"
			insertafter="qfb-starred">
			<html:span>__MSG_cardbookQFBButtonLabel__</html:span>
		</html:button>
	</div>

	<div id="quickFilterBarSecondFilters">
		<div id="quickFilterBarCardBookContainer" insertafter="quickFilterBarTagsContainer" hidden="true">
			<menulist id="qfb-cardbook-boolean-mode"
						tooltiptext="__MSG_quickFilterBar.booleanMode.tooltip__"
						persist="value" value="OR">
				<menupopup id="qfb-cardbook-boolean-mode-popup">
					<menuitem id="qfb-cardbook-boolean-mode-or" value="OR"
								label="__MSG_quickFilterBar.booleanModeAny.label__"
								tooltiptext="__MSG_quickFilterBar.booleanModeAny.tooltip__"/>
					<menuitem id="qfb-cardbook-boolean-mode-and" value="AND"
								label="__MSG_quickFilterBar.booleanModeAll.label__"
								tooltiptext="__MSG_quickFilterBar.booleanModeAll.tooltip__"/>
				</menupopup>
			</menulist>
		</div>
	</div>

	`);

	window.ovl_cardbookAbout3Pane.load();
};

function onUnload(wasAlreadyOpen) {
	window.ovl_cardbookAbout3Pane.unload();
};
