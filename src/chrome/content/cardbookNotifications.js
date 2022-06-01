if ("undefined" == typeof(cardbookNotifications)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var cardbookNotifications = {
		setNotification: function(aNotificationBox, aReasonCode, aValueArray, aPriority) {
			if (aReasonCode == "OK") {
				aNotificationBox.removeAllNotifications();
			} else {
				let notificationCode = aReasonCode;
				if (aValueArray && aValueArray.length > 0) {
					notificationCode = notificationCode + aValueArray.join("_");
				}
				let existingBox = aNotificationBox.getNotificationWithValue(notificationCode);
				if (!existingBox) {
					aNotificationBox.removeAllNotifications();
					if (aValueArray && aValueArray.length > 0) {
						var reason = cardbookRepository.extension.localeData.localizeMessage(aReasonCode, aValueArray);
					} else {
						var reason = cardbookRepository.extension.localeData.localizeMessage(aReasonCode);
					}
					if (aPriority) {
						var priority = aNotificationBox[aPriority];
					} else {
						var priority = aNotificationBox.PRIORITY_WARNING_MEDIUM;
					}
					aNotificationBox.appendNotification(notificationCode, {label: reason, priority: priority}, null);
					aNotificationBox.getNotificationWithValue(notificationCode);
				}
			}
		}

	};
};
