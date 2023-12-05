import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";

if ("undefined" == typeof(wdw_cardbookEventContacts)) {
	var wdw_cardbookEventContacts = {
		allEvents: [],
		emailArray: [],
		displayName: "",

		getIndexFromName: function (aName) {
			let tmpArray = aName.split("_");
			return tmpArray[tmpArray.length - 1];
		},

		getTableCurrentIndex: function (aTableName) {
			let selectedList = document.getElementById(aTableName).querySelectorAll("tr[rowSelected='true']");
			if (selectedList.length) {
				return wdw_cardbookEventContacts.getIndexFromName(selectedList[0].id);
			}
		},

		clickTree: function (aEvent) {
            if (aEvent.target.tagName.toLowerCase() == "td") {
				let row = aEvent.target.closest("tr");
				let tbody = aEvent.target.closest("tbody");
				for (let child of tbody.childNodes) {
					child.removeAttribute("rowSelected");
				}
				row.setAttribute("rowSelected", "true");
				wdw_cardbookEventContacts.buttonShowing();
			}
		},

		clickToSort: async function (aEvent) {
            if (aEvent.target.tagName.toLowerCase() == "th" || aEvent.target.tagName.toLowerCase() == "img") {
				let column = aEvent.target.closest("th");
				let columnName = column.getAttribute("data-value");
				let table = column.closest("table");
				if (table.getAttribute("data-sort-column") == columnName) {
					if (table.getAttribute("data-sort-order") == "ascending") {
						table.setAttribute("data-sort-order", "descending");
					} else {
						table.setAttribute("data-sort-order", "ascending");
					}
				} else {
					table.setAttribute("data-sort-column", columnName);
					table.setAttribute("data-sort-order", "ascending");
				}
                await wdw_cardbookEventContacts.displayEvents();
			}
			aEvent.stopImmediatePropagation();
		},
	
		getTableMapColumn: function (aColumnName) {
			if (aColumnName == "eventsTableTitle") {
				return "title";
			} else if (aColumnName == "eventsTableStartdate") {
				return "startDate";
			} else if (aColumnName == "eventsTableEnddate") {
				return "endDate";
			} else if (aColumnName == "eventsTableCategories") {
				return "categories";
			} else if (aColumnName == "eventsTableLocation") {
				return "location";
			} else if (aColumnName == "eventsTableCalendarname") {
				return "calendarName";
			}
		},

		doubleClickTree: async function (aEvent) {
            if (aEvent.target.tagName.toLowerCase() == "th") {
				return;
            } else if (aEvent.target.tagName.toLowerCase() == "td") {
				await wdw_cardbookEventContacts.editEvent();
			} else {
				await wdw_cardbookEventContacts.createEvent();
			}
		},

		displayEvents: async function () {
			let table = document.getElementById("eventsTable");
			let order = table.getAttribute("data-sort-order") == "ascending" ? 1 : -1;
			let columnName = table.getAttribute("data-sort-column");
			let columnSort = wdw_cardbookEventContacts.getTableMapColumn(columnName);

			let headers = [ "eventsTableTitle", "eventsTableStartdate", "eventsTableEnddate", "eventsTableCategories", "eventsTableLocation", "eventsTableCalendarname" ];
			if (wdw_cardbookEventContacts.emailArray[0] != "") {
            	wdw_cardbookEventContacts.allEvents = await messenger.runtime.sendMessage({query: "cardbook.getEvents", emails: wdw_cardbookEventContacts.emailArray, column: columnSort, order: order});
			}
            let data = wdw_cardbookEventContacts.allEvents.map(x => [ x[0], x[1], x[2], x[3], x[4], x[5] ])
			let dataParameters = [];
			let rowParameters = {};
            let tableParameters = { "events": [ [ "click", wdw_cardbookEventContacts.clickTree ],
                                                [ "dblclick", wdw_cardbookEventContacts.doubleClickTree ],
                                                [ "keydown", wdw_cardbookEventContacts.chooseActionForKey ] ] };
            let sortFunction = wdw_cardbookEventContacts.clickToSort;
			cardbookHTMLTools.addTreeTable("eventsTable", headers, data, dataParameters, rowParameters, tableParameters, sortFunction);
			wdw_cardbookEventContacts.buttonShowing();
		},

		buttonShowing: function () {
			var btnEdit = document.getElementById("editEventLabel");
			let currentIndex = wdw_cardbookEventContacts.getTableCurrentIndex("eventsTable");
			if (currentIndex) {
				btnEdit.disabled = false;
			} else {
				btnEdit.disabled = true;
			}
		},

		editEvent: async function() {
			let currentIndex = wdw_cardbookEventContacts.getTableCurrentIndex("eventsTable");
			if (currentIndex) {
				let eventId = wdw_cardbookEventContacts.allEvents[currentIndex][6];
				let calendarId = wdw_cardbookEventContacts.allEvents[currentIndex][7];
                await messenger.runtime.sendMessage({query: "cardbook.editEvent", eventId: eventId, calendarId: calendarId});
			}
		},

		// code taken from createEventWithDialog
		createEvent: async function() {
			await messenger.runtime.sendMessage({query: "cardbook.createEvent", emails: wdw_cardbookEventContacts.emailArray, displayName: wdw_cardbookEventContacts.displayName});
		},

		chooseActionForKey: function (aEvent) {
			if (aEvent.key == "Enter") {
				wdw_cardbookEventContacts.editEvent();
				aEvent.stopPropagation();
			}
		},
		
		load: async function () {
            let urlParams = new URLSearchParams(window.location.search);
            wdw_cardbookEventContacts.displayName = urlParams.get("displayName");
            wdw_cardbookEventContacts.emailArray = urlParams.get("listOfEmail").split(",");
        
			i18n.updateDocument();
			cardbookHTMLRichContext.loadRichContext();
			document.title = messenger.i18n.getMessage("eventContactsWindowLabel", [wdw_cardbookEventContacts.displayName]);

           	// button
            document.getElementById("createEventLabel").addEventListener("click", event => wdw_cardbookEventContacts.createEvent());
            document.getElementById("editEventLabel").addEventListener("click", event => wdw_cardbookEventContacts.editEvent());
            document.getElementById("closeEditionLabel").addEventListener("click", event => wdw_cardbookEventContacts.do_close());

            await wdw_cardbookEventContacts.displayEvents();
		},
	
		do_close: function () {
			close();
		}
	};
};

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

messenger.runtime.onMessage.addListener( (info) => {
	switch (info.query) {
		case "cardbook.displayEvents":
			wdw_cardbookEventContacts.displayEvents();
			break;
		}
});

await wdw_cardbookEventContacts.load()