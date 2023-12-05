import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
import { cardbookHTMLDates } from "../cardbookHTMLDates.mjs";
import { cardbookHTMLUtils } from "../cardbookHTMLUtils.mjs";
import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";

var timer = null;
		
async function syncAllBirthdays () {
    i18n.updateDocument();
    cardbookHTMLRichContext.loadRichContext();

    // button
    document.getElementById("closeEditionLabel").addEventListener("click", event => do_close());

	await messenger.runtime.sendMessage({query: "cardbook.syncWithLightning"});
	await do_refresh();
	
	timer = setInterval( async () => {
		await do_refresh();
	}, 1000);
};

function do_close () {
	clearInterval(timer);
	cardbookHTMLRichContext.closeWindow();
};

async function do_refresh () {
	let noneFound = document.getElementById("noneFound");
	let resulTable = document.getElementById("syncListTable");
	let maxDaysUntilNextBirthday = await cardbookHTMLUtils.getPrefValue("numberOfDaysForWriting");
	maxDaysUntilNextBirthday = (maxDaysUntilNextBirthday > 365) ? 365 : maxDaysUntilNextBirthday;

	let birthdaysListLength = await messenger.runtime.sendMessage({query: "cardbook.getBirthdaysListLength"});

	// if there are no birthdays in the configured timespan
	if (birthdaysListLength == 0) {
		noneFound.hidden = false;
		resulTable.hidden = true;
		let date = new Date();
		let today = new Date(date.getTime() + maxDaysUntilNextBirthday *24*60*60*1000);
		let dateString = cardbookHTMLDates.convertDateToDateString(today, "4.0");
		let longDateString = cardbookHTMLDates.getFormattedDateForDateString(dateString, "4.0", "0");
		let noBirthdaysFoundMessage = messenger.i18n.getMessage("noBirthdaysFoundMessage", [longDateString]);
		noneFound.textContent = noBirthdaysFoundMessage;
		document.title = messenger.i18n.getMessage("syncListWindowLabelEnded", [0,0]);
	} else {
		let calendarsListLength = await messenger.runtime.sendMessage({query: "cardbook.getCalendarsListLength"});
		let birthdaysSyncResult = await messenger.runtime.sendMessage({query: "cardbook.getBirthdaySyncResult"});
		noneFound.hidden = true;
		resulTable.hidden = false;

		let totalRecordsToInsert = birthdaysListLength * calendarsListLength;
		let birthdaySyncResultGrouped = [];
		let totalRecordsInserted = 0;
		for (let calId in birthdaysSyncResult) {
            birthdaySyncResultGrouped.push([birthdaysSyncResult[calId].name, birthdaysSyncResult[calId].existing, birthdaysSyncResult[calId].failed, birthdaysSyncResult[calId].succeeded]);
			totalRecordsInserted = totalRecordsInserted + birthdaysSyncResult[calId].existing + birthdaysSyncResult[calId].failed + birthdaysSyncResult[calId].succeeded;
		}

		let headers = [ "calendarName", "existing", "failed", "succeeded" ];
		let data = birthdaySyncResultGrouped.map(x => [ x[0], x[1], x[2], x[3] ]);
		let dataParameters = [];
		let rowParameters = {};
		cardbookHTMLTools.addTreeTable("syncListTable", headers, data, dataParameters, rowParameters);

		if (totalRecordsToInsert != totalRecordsInserted) {
			let lTotalDisplayed = totalRecordsInserted < 0 ? '0' : totalRecordsInserted.toString();
			document.title = messenger.i18n.getMessage("syncListWindowLabelRunning", [lTotalDisplayed, totalRecordsToInsert.toString()]);
		} else {
			document.title = messenger.i18n.getMessage("syncListWindowLabelEnded", [totalRecordsInserted.toString(), totalRecordsToInsert.toString()]);
		}
	}
};

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

await syncAllBirthdays();

