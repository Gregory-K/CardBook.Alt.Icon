// Import any needed modules.
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

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
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookActions.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookCardParser.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookWindowUtils.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/formatEmailCorrespondents/ovl_formatEmailCorrespondents.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/mailContact/ovl_cardbookFindEmails.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/mailContact/ovl_cardbookFindEvents.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/wdw_cardbook.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardBookObserverRepository.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/observers/cardbookAboutMessageObserver.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/attachments/ovl_attachments.js", window, "UTF-8");
Services.scriptloader.loadSubScript("chrome://cardbook/content/ovl_cardbookAboutMessage.js", window, "UTF-8");

// called on window load or on add-on activation while window is already open
function onLoad(wasAlreadyOpen) {
	WL.injectCSS("chrome://cardbook/content/skin/cardbookAddressBooks.css");

    WL.injectElements(`
    <menupopup id="emailAddressPopup">
        <menuseparator id="editCardBookSeparator" insertafter="viewContactItem"/>
        <menu id="addToCardBookMenu" class="menuitem-iconic" label="__MSG_addToCardBookMenuLabel__" accesskey="__MSG_addToCardBookMenuAccesskey__" insertafter="editCardBookSeparator">
            <menupopup id="addToCardBookMenuPopup" onpopupshowing="ovl_cardbookAboutMessage.addToCardBookMenuSubMenu(this.id, ovl_cardbookAboutMessage.addToCardBook)"/>
        </menu>
        <menuitem id="editInCardBookMenu" class="menuitem-iconic" label="__MSG_editInCardBookMenuLabel__" accesskey="__MSG_editInCardBookMenuAccesskey__" insertafter="addToCardBookMenu" onclick="ovl_cardbookAboutMessage.editOrViewContact(event.currentTarget.parentNode.headerField.cardDetails.card);"/>
        <menuitem id="deleteInCardBookMenu" class="menuitem-iconic" label="__MSG_deleteInCardBookMenuLabel__" accesskey="__MSG_deleteInCardBookMenuAccesskey__" insertafter="editInCardBookMenu" onclick="ovl_cardbookAboutMessage.deleteContact(event.currentTarget.parentNode.headerField.cardDetails.card);"/>
        <menuseparator id="IMPPCardBookSeparator" insertafter="deleteInCardBookMenu"/>
        <menu id="IMPPCards" class="menuitem-iconic" label="__MSG_IMPPMenuLabel__" accesskey="__MSG_IMPPMenuAccesskey__" insertafter="IMPPCardBookSeparator">
            <menupopup id="IMPPCardsMenuPopup"/>
        </menu>
        <menuseparator id="findCardBookSeparator1" insertafter="IMPPCards"/>
        <menuitem id="findEmailsFromEmailMessenger" class="menuitem-iconic" label="__MSG_findEmailsFromEmailMessengerLabel__" accesskey="__MSG_findEmailsFromEmailMessengerAccesskey__"
            oncommand="ovl_cardbookFindEmails.findEmailsFromEmail(event.currentTarget.parentNode.headerField);" insertafter="findCardBookSeparator1"/>
        <menuitem id="findAllEmailsFromContactMessenger" class="menuitem-iconic" label="__MSG_findAllEmailsFromContactMessengerLabel__" accesskey="__MSG_findAllEmailsFromContactMessengerAccesskey__"
            oncommand="ovl_cardbookFindEmails.findAllEmailsFromContact(event.currentTarget.parentNode.headerField);" insertafter="findEmailsFromEmailMessenger"/>
        <menuitem id="findEventsFromEmailMessenger" class="menuitem-iconic" label="__MSG_findEventsFromEmailMessengerLabel__" accesskey="__MSG_findEventsFromEmailMessengerAccesskey__"
            oncommand="ovl_cardbookFindEvents.findEventsFromEmail(event.currentTarget.parentNode.headerField);" insertafter="findAllEmailsFromContactMessenger"/>
        <menuitem id="findAllEventsFromContactMessenger" class="menuitem-iconic" label="__MSG_findAllEventsFromContactMessengerLabel__" accesskey="__MSG_findAllEventsFromContactMessengerAccesskey__"
            oncommand="ovl_cardbookFindEvents.findAllEventsFromContact(event.currentTarget.parentNode.headerField);" insertafter="findEventsFromEmailMessenger"/>
        <menuseparator id="findCardBookSeparator2" insertafter="findAllEventsFromContactMessenger"/>
    </menupopup>

	<menupopup id="attachmentSaveAllMultipleMenu">
		<menu id="attachments1CardBookImport" label="__MSG_addAllAttachementsToCardBookMenuLabel__" insertafter="button-saveAllAttachments">
			<menupopup id="attachments1CardBookImportPopup"/>
		</menu>
	</menupopup>

	<menupopup id="attachmentSaveAllSingleMenu">
		<menu id="attachment1CardBookImport" label="__MSG_addAttachementToCardBookMenuLabel__" insertafter="button-saveAttachment">
			<menupopup id="attachment1CardBookImportPopup"/>
		</menu>
	</menupopup>
	`);

    window.ovl_cardbookAboutMessage.load();
};

function onUnload(wasAlreadyOpen) {
    window.ovl_cardbookAboutMessage.unload();
    window.ovl_attachments.unload();
};
