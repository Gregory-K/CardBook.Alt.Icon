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
	if (lTimerSync) {
		lTimerSync.cancel();
	}
	close();
};

function do_refresh () {
	var maxDaysUntilNextBirthday = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.numberOfDaysForWriting");

	// if there are no birthdays in the configured timespan
	if (cardbookBirthdaysUtils.lBirthdayList.length == 0) {
		var today = new Date();
		today = new Date(today.getTime() + maxDaysUntilNextBirthday * 24*60*60*1000);
		var noBirthdaysFoundMessage = cardbookRepository.extension.localeData.localizeMessage("noBirthdaysFoundMessage", [cardbookRepository.cardbookDates.convertDateToDateString(today, 'YYYYMMDD')]);
		var treeView = {
			rowCount : 1,
			getCellText : function(row,column){
				if (column.id == "addressbook") return noBirthdaysFoundMessage;
			}
		}
		document.getElementById('syncListTree').view = treeView;
		document.title = cardbookRepository.extension.localeData.localizeMessage("syncListWindowLabelEnded", [0,0]);
	} else {
		var totalRecordsToInsert = cardbookBirthdaysUtils.lBirthdayList.length * cardbookBirthdaysUtils.lCalendarList.length;
		var totalRecordsInserted = 0;
		
		var lBirthdaySyncResultGrouped = [];
		for (var i=0; i<cardbookBirthdaysUtils.lBirthdaySyncResult.length; i++) {
			totalRecordsInserted += cardbookBirthdaysUtils.lBirthdaySyncResult[i][1] + cardbookBirthdaysUtils.lBirthdaySyncResult[i][2] + cardbookBirthdaysUtils.lBirthdaySyncResult[i][3];
			var jfound = -1;
			for (var j=0; j<lBirthdaySyncResultGrouped.length; j++) {
				if (cardbookBirthdaysUtils.lBirthdaySyncResult[i][4] == lBirthdaySyncResultGrouped[j][4] && jfound == -1) {
					jfound = j;
				}
			}
			if (jfound == -1) {
				lBirthdaySyncResultGrouped.push([cardbookBirthdaysUtils.lBirthdaySyncResult[i][0],cardbookBirthdaysUtils.lBirthdaySyncResult[i][1],cardbookBirthdaysUtils.lBirthdaySyncResult[i][2],cardbookBirthdaysUtils.lBirthdaySyncResult[i][3],cardbookBirthdaysUtils.lBirthdaySyncResult[i][4]]);
			} else {
				lBirthdaySyncResultGrouped[jfound][1] += cardbookBirthdaysUtils.lBirthdaySyncResult[i][1];
				lBirthdaySyncResultGrouped[jfound][2] += cardbookBirthdaysUtils.lBirthdaySyncResult[i][2];
				lBirthdaySyncResultGrouped[jfound][3] += cardbookBirthdaysUtils.lBirthdaySyncResult[i][3];
			}
		}

		var treeView = {
			rowCount : lBirthdaySyncResultGrouped.length,
			getCellText : function(row,column){
				if (column.id == "addressbook") return lBirthdaySyncResultGrouped[row][0];
				else if (column.id == "existing") return lBirthdaySyncResultGrouped[row][1];
				else if (column.id == "failed") return lBirthdaySyncResultGrouped[row][2];
				else if (column.id == "succeeded") return lBirthdaySyncResultGrouped[row][3];
				else return lBirthdaySyncResultGrouped[row][4];
			}
		}
		document.getElementById('syncListTree').view = treeView;
		if (totalRecordsToInsert != totalRecordsInserted) {
			var lTotalDisplayed = (totalRecordsInserted<0?'0':totalRecordsInserted.toString());
			document.title=cardbookRepository.extension.localeData.localizeMessage("syncListWindowLabelRunning", [lTotalDisplayed, totalRecordsToInsert.toString()]);
		} else {
			document.title=cardbookRepository.extension.localeData.localizeMessage("syncListWindowLabelEnded", [totalRecordsInserted.toString(), totalRecordsToInsert.toString()]);
		}
	}
};

document.addEventListener("DOMContentLoaded", syncAllBirthdays);

