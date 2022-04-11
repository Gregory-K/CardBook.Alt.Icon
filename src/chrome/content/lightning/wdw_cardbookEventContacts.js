if ("undefined" == typeof(wdw_cardbookEventContacts)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

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
			if (aEvent.target.tagName == "html:td") {
				let row = aEvent.target.closest("tr");
				let tbody = aEvent.target.closest("tbody");
				for (let child of tbody.childNodes) {
					child.removeAttribute("rowSelected");
				}
				row.setAttribute("rowSelected", "true");
				wdw_cardbookEventContacts.buttonShowing();
			}
		},

		sortTable: function (aTableName) {
			let table = document.getElementById(aTableName);
			let order = table.getAttribute("data-sort-order") == "ascending" ? 1 : -1;
			let columnName = table.getAttribute("data-sort-column");
			
			let columnSort = wdw_cardbookEventContacts.getTableMapColumn(columnName);

			cal.unifinder.sortItems(wdw_cardbookEventContacts.allEvents, columnSort, order);

			wdw_cardbookEventContacts.displayEvents();
		},
	
		clickToSort: function (aEvent) {
			if (aEvent.target.tagName == "html:th" || aEvent.target.tagName == "html:img") {
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
				wdw_cardbookEventContacts.sortTable(table.id);
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

		doubleClickTree: function (aEvent) {
			if (aEvent.target.tagName == "html:th") {
				return;
			} else if (aEvent.target.tagName == "html:td") {
				wdw_cardbookEventContacts.editEvent();
			} else {
				wdw_cardbookEventContacts.createEvent();
			}
		},

		displayEvents: function () {
			function getEventEndDate (x) {
				let eventEndDate = x.endDate.clone();
				if (x.startDate.isDate) {
					eventEndDate.day = eventEndDate.day - 1;
				}
				return eventEndDate;
			}

			cardbookElementTools.deleteRows("eventsTable");
			let headers = [ "eventsTableTitle", "eventsTableStartdate", "eventsTableEnddate", "eventsTableCategories", "eventsTableLocation", "eventsTableCalendarname" ];
			let data = wdw_cardbookEventContacts.allEvents.map(x => [ (x.title ? x.title.replace(/\n/g, ' ') : ""),
																		wdw_cardbookEventContacts.formatEventDateTime(x.startDate),
																		wdw_cardbookEventContacts.formatEventDateTime(getEventEndDate(x)),
																		x.getCategories({}).join(", "),
																		x.getProperty("LOCATION"),
																		x.calendar.name ]);
			let dataParameters = [];
			let rowParameters = {};
			let sortFunction = wdw_cardbookEventContacts.clickToSort;
			cardbookElementTools.addTreeTable("eventsTable", headers, data, dataParameters, rowParameters, sortFunction);
			wdw_cardbookEventContacts.buttonShowing();
		},

		formatEventDateTime: function (aDatetime) {
			return cal.dtz.formatter.formatDateTime(aDatetime.getInTimezone(cal.dtz.defaultTimezone));
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

		// code taken from modifyEventWithDialog
		editEvent: function() {
			let currentIndex = wdw_cardbookEventContacts.getTableCurrentIndex("eventsTable");
			if (currentIndex) {
				var myItem = wdw_cardbookEventContacts.allEvents[currentIndex];
				let dlg = cal.item.findWindow(myItem);
				if (dlg) {
					dlg.focus();
					disposeJob(null);
					return;
				}

				var editListener = {
					onOperationComplete: function(aCalendar, aStatus, aOperationType, aId, aDetail) {
						wdw_cardbookEventContacts.loadEvents();
					}
				};

				var onModifyItem = function(item, calendar, originalItem, listener, extresponse=null) {
					doTransaction('modify', item, calendar, originalItem, editListener, extresponse);
					// as the editlistener does not work, bug seems solved
					// wdw_cardbookEventContacts.loadEvents();
				};

				let item = myItem;
				let response;
				[item, , response] = promptOccurrenceModification(item, true, "edit");
				
				if (item && (response || response === undefined)) {
					openEventDialog(item, item.calendar, "modify", onModifyItem, null, null, null);
				} else {
					disposeJob(null);
				}
			}
		},

		// code taken from createEventWithDialog
		createEvent: function() {
			var createListener = {
				onOperationComplete: function(aCalendar, aStatus, aOperationType, aId, aDetail) {
					wdw_cardbookEventContacts.loadEvents();
				}
			};

			var onNewEvent = function(item, calendar, originalItem, listener) {
				if (item.id) {
					// If the item already has an id, then this is the result of
					// saving the item without closing, and then saving again.
					doTransaction('modify', item, calendar, originalItem, createListener);
				} else {
					// Otherwise, this is an addition
					doTransaction('add', item, calendar, null, createListener);
				}
				// as the createListener does not work, bug seems solved
				// wdw_cardbookEventContacts.loadEvents();
			};
		
			let contacts = [];
			for (let email of wdw_cardbookEventContacts.emailArray) {
				contacts.push(["mailto:" + email, wdw_cardbookEventContacts.displayName]);
			}
			cardbookLightning.createLightningEvent(contacts, onNewEvent);
		},

		chooseActionForKey: function (aEvent) {
			if (aEvent.key == "Enter") {
				wdw_cardbookEventContacts.editEvent();
				aEvent.stopPropagation();
			}
		},
		
		addItemsFromCalendar: function (aCalendar, aAddItemsInternalFunc) {
			var refreshListener = {
				QueryInterface: ChromeUtils.generateQI([Components.interfaces.calIOperationListener]),
				mEventArray: [],
				onOperationComplete: function (aCalendar, aStatus, aOperationType, aId, aDateTime) {
					var refreshTreeInternalFunc = function() {
						aAddItemsInternalFunc(refreshListener.mEventArray);
					};
					setTimeout(refreshTreeInternalFunc, 0);
				},
				
				onGetResult: function (aCalendar, aStatus, aItemType, aDetail, aItems) {
					refreshListener.mEventArray = refreshListener.mEventArray.concat(aItems);
				}
			};
			
			let filter = 0;
			filter |= aCalendar.ITEM_FILTER_TYPE_EVENT;
			
			aCalendar.getItems(filter, 0, null, null, refreshListener);
		},

		addItemsFromCompositeCalendarInternal: function (eventArray) {
			wdw_cardbookEventContacts.allEvents = wdw_cardbookEventContacts.allEvents.concat(eventArray);

			// filter does not work
			for (var i = 0; i < wdw_cardbookEventContacts.allEvents.length; i++) {
				let found = false;
				let attendeesArray = cal.email.createRecipientList(wdw_cardbookEventContacts.allEvents[i].getAttendees({})).split(', ');
				for (let j = 0; !found && j < attendeesArray.length; j++) {
					for (let k = 0; !found && k < wdw_cardbookEventContacts.emailArray.length; k++) {
						if (attendeesArray[j].indexOf(wdw_cardbookEventContacts.emailArray[k].toLowerCase()) >= 0) {
							found = true;
						}
					}
				}
				if (!found) {
					wdw_cardbookEventContacts.allEvents.splice(i,1);
					i--;
				}
			}
			wdw_cardbookEventContacts.sortTable("eventsTable");
		},

		loadEvents: function () {
			wdw_cardbookEventContacts.allEvents = [];
			let cals = cal.getCalendarManager().getCalendars({});
			for (let calendar of cals) {
				if (!calendar.getProperty("disabled")) {
					wdw_cardbookEventContacts.addItemsFromCalendar(calendar, wdw_cardbookEventContacts.addItemsFromCompositeCalendarInternal);
				}
			}
		},

		load: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			wdw_cardbookEventContacts.emailArray = window.arguments[0].listOfEmail;
			wdw_cardbookEventContacts.displayName = window.arguments[0].displayName;
			document.title = cardbookRepository.extension.localeData.localizeMessage("eventContactsWindowLabel", [wdw_cardbookEventContacts.displayName]);

			wdw_cardbookEventContacts.loadEvents();
		},
	
		do_close: function () {
			close();
		}
	};
};

function ensureCalendarVisible(aCalendar) {};
function goUpdateCommand(aCommand) {};

document.addEventListener("DOMContentLoaded", wdw_cardbookEventContacts.load);
