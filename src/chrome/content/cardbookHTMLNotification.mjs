export var cardbookHTMLNotification = {
    setNotification: function (aObject, aStatus, aReasonCode, aValueArray) {
        aObject.textContent = "";
        aObject.setAttribute("type", aStatus);
        if (aReasonCode) {
            if (aValueArray && aValueArray.length) {
                aObject.textContent = messenger.i18n.getMessage(aReasonCode, aValueArray);
            } else {
                aObject.textContent = messenger.i18n.getMessage(aReasonCode);
            }
        }
    }
 };
