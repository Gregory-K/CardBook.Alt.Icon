var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var lTimerSync = null;
var lEventTimerSync = { notify: function() {
			do_refresh();
		} };
		
function syncAllBirthdays () {
	i18n.updateDocument({ extension: cardbookRepository.extension });
	cardbookBirthdaysUtils.syncWithLightning();
	do_refresh();
	
	lTimerSync = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	lTimerSync.initWithCallback(lEventTimerSync, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
};

function do_close () {
	lTimerSync.cancel();
	close();
};

function do_refresh () {
	let noneFound = document.getElementById("noneFound");
	let resulTable = document.getElementById("syncListTable");
	let maxDaysUntilNextBirthday = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.numberOfDaysForWriting");

	// if there are no birthdays in the configured timespan
	if (cardbookBirthdaysUtils.lBirthdayList.length == 0) {
		noneFound.hidden = false;
		resulTable.hidden = true;
		let date = new Date();
		let today = new Date(date.getTime() + maxDaysUntilNextBirthday *24*60*60*1000);
		let noBirthdaysFoundMessage = cardbookRepository.extension.localeData.localizeMessage("noBirthdaysFoundMessage", [cardbookRepository.cardbookDates.convertDateToDateString(today, 'YYYYMMDD')]);
		noneFound.textContent = noBirthdaysFoundMessage;
		document.title = cardbookRepository.extension.localeData.localizeMessage("syncListWindowLabelEnded", [0,0]);
	} else {
		noneFound.hidden = true;
		resulTable.hidden = false;

		let totalRecordsToInsert = cardbookBirthdaysUtils.lBirthdayList.length * cardbookBirthdaysUtils.lCalendarList.length;
		let totalRecordsInserted = 0;
		let birthdaySyncResultGrouped = [];
		for (let result of cardbookBirthdaysUtils.lBirthdaySyncResult) {
			totalRecordsInserted += result[1] + result[2] + result[3];
			let jfound = -1;
			for (var j=0; j<birthdaySyncResultGrouped.length; j++) {
				if (result[4] == birthdaySyncResultGrouped[j][4] && jfound == -1) {
					jfound = j;
				}
			}
			if (jfound == -1) {
				birthdaySyncResultGrouped.push([result[0],result[1],result[2],result[3],result[4]]);
			} else {
				birthdaySyncResultGrouped[jfound][1] += result[1];
				birthdaySyncResultGrouped[jfound][2] += result[2];
				birthdaySyncResultGrouped[jfound][3] += result[3];
			}
		}

		let headers = [ "calendarName", "existing", "failed", "succeeded" ];
		let data = birthdaySyncResultGrouped.map(x => [ x[0], x[1], x[2], x[3] ]);
		let dataParameters = [];
		let rowParameters = {};
		cardbookElementTools.addTreeTable("syncListTable", headers, data, dataParameters, rowParameters);

		if (totalRecordsToInsert != totalRecordsInserted) {
			let lTotalDisplayed = (totalRecordsInserted<0?'0':totalRecordsInserted.toString());
			document.title = cardbookRepository.extension.localeData.localizeMessage("syncListWindowLabelRunning", [lTotalDisplayed, totalRecordsToInsert.toString()]);
		} else {
			document.title = cardbookRepository.extension.localeData.localizeMessage("syncListWindowLabelEnded", [totalRecordsInserted.toString(), totalRecordsToInsert.toString()]);
		}
	}
};

document.addEventListener("DOMContentLoaded", syncAllBirthdays);

