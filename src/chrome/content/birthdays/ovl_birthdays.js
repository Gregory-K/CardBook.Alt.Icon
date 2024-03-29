if ("undefined" == typeof(ovl_birthdays)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_birthdays = {
		lTimerPopup: null,
		lPopupShowed: 0,
		lEventTimerPopup: { notify: function(lTimerPopup) {
			if (cardbookRepository.cardbookPrefs["showPeriodicPopup"]) {
				var popupTime = cardbookRepository.cardbookPrefs["periodicPopupIime"];
				var dateOfToday = new Date();
				var dateOfTodayHour = (dateOfToday.getHours()<10?'0':'') + dateOfToday.getHours();
				var dateOfTodayMin = (dateOfToday.getMinutes()<10?'0':'') + dateOfToday.getMinutes();
				var checkTime = dateOfTodayHour.toString() + dateOfTodayMin.toString();
		
				var EmptyParamRegExp1 = new RegExp("(.*)([^0-9])(.*)", "ig");
				if (popupTime.replace(EmptyParamRegExp1, "$1")!=popupTime) {
					var checkPopupHour = popupTime.replace(EmptyParamRegExp1, "$1");
					var checkPopupMin = popupTime.replace(EmptyParamRegExp1, "$3");
					if (checkPopupHour < 10 && checkPopupHour.length == 1) {
						checkPopupHour = "0" + checkPopupHour;
					}
					if (checkPopupMin < 10 && checkPopupMin.length == 1) {
						checkPopupMin = "0" + checkPopupMin;
					}
					var checkPopupTime = checkPopupHour.toString() + checkPopupMin.toString();
				}
				
				if ((checkTime == checkPopupTime) && (ovl_birthdays.lPopupShowed == 0)) {
					ovl_birthdays.lPopupShowed++;
					ovl_birthdays.onShowPopup();
				} else if ((ovl_birthdays.lPopupShowed > 0) && (ovl_birthdays.lPopupShowed < 8)) {
					ovl_birthdays.lPopupShowed++;
				} else {
					ovl_birthdays.lPopupShowed=0;
				}
			}
		}},
	
		onLoad: async function() {
			if (cardbookRepository.cardbookPrefs["showPopupOnStartup"]) {
				ovl_birthdays.onShowPopup();
			}
			
			if (cardbookRepository.cardbookPrefs["syncWithLightningOnStartup"]) {
				cardbookBirthdaysUtils.syncWithLightning();
			}
		},
	
		displayBirthdayList: async function() {
			let url = "chrome/content/birthdays/wdw_birthdayList.html";
			let win = await notifyTools.notifyBackground({query: "cardbook.openWindow",
															url: url,
															type: "popup"});
		},
	
		onShowPopup: async function() {
			let maxDaysUntilNextBirthday = cardbookRepository.cardbookPrefs["numberOfDaysForSearching"];
			let birthdayList = cardbookBirthdaysUtils.loadBirthdays(maxDaysUntilNextBirthday);
			let showPopupEvenIfNoBirthday = cardbookRepository.cardbookPrefs["showPopupEvenIfNoBirthday"];
			if ((birthdayList.length>0) || showPopupEvenIfNoBirthday) {
				await ovl_birthdays.displayBirthdayList();
			}
		}
	};
	
	if (!cardbookRepository.birthdayTimerCreated) {
		ovl_birthdays.lTimerPopup = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
		ovl_birthdays.lTimerPopup.initWithCallback(ovl_birthdays.lEventTimerPopup, 10000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		cardbookRepository.birthdayTimerCreated = true;
	}
}
