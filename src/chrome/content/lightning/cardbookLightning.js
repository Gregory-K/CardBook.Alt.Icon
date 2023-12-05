var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
var { CalAttendee } = ChromeUtils.import("resource:///modules/CalAttendee.jsm");

var cardbookLightning = {
	// code taken from createEventWithDialog
	createLightningEvent: function(aContactList, aListener) {
		let event = new CalEvent();
		let calendar = cal.view.getCompositeCalendar(Services.wm.getMostRecentWindow("mail:3pane")).defaultCalendar;
		let refDate = cal.dtz.now();
		setDefaultItemValues(event, calendar, null, null, refDate, null);
		for (let contact of aContactList) {
			let attendee = new CalAttendee();
			attendee.id = contact[0];
			attendee.commonName = contact[1];
			attendee.isOrganizer = false;
			attendee.role = "REQ-PARTICIPANT";
			attendee.userType = "INDIVIDUAL";
			event.addAttendee(attendee);
		}
		cardbookLightning.modifyLightningEvent(event, event.calendar, "new", aListener);
	},

	// code taken from createTodoWithDialog
	createLightningTodo: function(aTitle, aDescription, aListener) {
		let todo = new CalTodo();
		let calendar = cal.view.getCompositeCalendar(Services.wm.getMostRecentWindow("mail:3pane")).defaultCalendar;
		let refDate = cal.dtz.now();
		setDefaultItemValues(todo, calendar, null, null, refDate);
		// title should be in lowercase
		cal.item.setItemProperty(todo, "title", aTitle);
		cal.item.setItemProperty(todo, "DESCRIPTION", aDescription);
		cardbookLightning.modifyLightningEvent(todo, todo.calendar, "new", aListener, null, refDate);
	},

	// code taken from openEventDialog
	// required because of the window.setCursor("wait");
	// window is unknown
	modifyLightningEvent: function (
		calendarItem,
		calendar,
		mode,
		callback,
		initialDate = null,
		counterProposal
		) {

		let dlg = cal.item.findWindow(calendarItem);
		if (dlg) {
			dlg.focus();
			return;
		}

		// Set up some defaults
		mode = mode || "new";
		calendar = calendar || getSelectedCalendar();
		let calendars = cal.manager.getCalendars();
		calendars = calendars.filter(cal.acl.isCalendarWritable);

		let isItemSupported;
		if (calendarItem.isTodo()) {
			isItemSupported = function (aCalendar) {
				return aCalendar.getProperty("capabilities.tasks.supported") !== false;
			};
		} else if (calendarItem.isEvent()) {
			isItemSupported = function (aCalendar) {
				return aCalendar.getProperty("capabilities.events.supported") !== false;
			};
		}

		// Filter out calendars that don't support the given calendar item
		calendars = calendars.filter(isItemSupported);

		// Filter out calendar/items that we cannot write to/modify
		if (mode == "new") {
			calendars = calendars.filter(cal.acl.userCanAddItemsToCalendar);
		} else if (mode == "modify") {
			calendars = calendars.filter(aCalendar => {
				/* If the calendar is the item calendar, we check that the item
				* can be modified. If the calendar is NOT the item calendar, we
				* check that the user can remove items from that calendar and
				* add items to the current one.
				*/
				let isSameCalendar = calendarItem.calendar == aCalendar;
				let canModify = cal.acl.userCanModifyItem(calendarItem);
				let canMoveItems =
				cal.acl.userCanDeleteItemsFromCalendar(calendarItem.calendar) &&
				cal.acl.userCanAddItemsToCalendar(aCalendar);

				return isSameCalendar ? canModify : canMoveItems;
			});
		}

		if (mode == "new" &&
			(!cal.acl.isCalendarWritable(calendar) ||
			!cal.acl.userCanAddItemsToCalendar(calendar) ||
			!isItemSupported(calendar))) {
			if (calendars.length < 1) {
				// There are no writable calendars or no calendar supports the given
				// item. Don't show the dialog.
				return;
			}
			// Pick the first calendar that supports the item and is writable
			calendar = calendars[0];
			if (calendarItem) {
				// XXX The dialog currently uses the items calendar as a first
				// choice. Since we are shortly before a release to keep
				// regression risk low, explicitly set the item's calendar here.
				calendarItem.calendar = calendars[0];
			}
		}

		// Setup the window arguments
		let args = {};
		args.calendarEvent = calendarItem;
		args.calendar = calendar;
		args.mode = mode;
		args.onOk = callback;
		args.initialStartDateValue = initialDate || cal.dtz.getDefaultStartDate();
		args.counterProposal = counterProposal;
		args.inTab = Services.prefs.getBoolPref("calendar.item.editInTab", false);
		// this will be called if file->new has been selected from within the dialog
		args.onNewEvent = function (opcalendar) {
			createEventWithDialog(opcalendar, null, null);
		};
		args.onNewTodo = function (opcalendar) {
			createTodoWithDialog(opcalendar);
		};

		// the dialog will reset this to auto when it is done loading.
		Services.wm.getMostRecentWindow("mail:3pane").setCursor("wait");

		// Ask the provider if this item is an invitation. If this is the case,
		// we'll open the summary dialog since the user is not allowed to change
		// the details of the item.
		let isInvitation =
		calendar.supportsScheduling && calendar.getSchedulingSupport().isInvitation(calendarItem);

		// open the dialog modeless
		let url;
		let isEditable = mode == "modify" && !isInvitation && cal.acl.userCanModifyItem(calendarItem);

		if (cal.acl.isCalendarWritable(calendar) && (mode == "new" || isEditable)) {
			// Currently the read-only summary dialog is never opened in a tab.
			if (args.inTab) {
				url = "chrome://calendar/content/calendar-item-iframe.xhtml";
			} else {
				url = "chrome://calendar/content/calendar-event-dialog.xhtml";
			}
		} else {
			url = "chrome://calendar/content/calendar-summary-dialog.xhtml";
			args.inTab = false;
			args.isInvitation = isInvitation;
		}

		if (args.inTab) {
			args.url = url;
			let tabmail = document.getElementById("tabmail");
			let tabtype = args.calendarEvent.isEvent() ? "calendarEvent" : "calendarTask";
			tabmail.openTab(tabtype, args);
		} else {
			// open in a window
			Services.wm.getMostRecentWindow("mail:3pane").openDialog(url, "_blank", "chrome,titlebar,toolbar,resizable", args);
		}
	},

	doTransaction: async function (action, item, calendar, oldItem, observer, extResponse = null) {
		// This is usually a user-initiated transaction, so make sure the calendar
		// this transaction is happening on is visible.
		// test top.ensureCalendarVisible(calendar);

		let manager = gCalBatchTransaction || gCalTransactionMgr;
		let trn;
		switch (action) {
			case "add":
				trn = new CalAddTransaction(item, calendar, oldItem, extResponse);
				break;
			case "modify":
				trn = new CalModifyTransaction(item, calendar, oldItem, extResponse);
				break;
			case "delete":
				trn = new CalDeleteTransaction(item, calendar, oldItem, extResponse);
				break;
			default:
				throw new Components.Exception(
					`Invalid action specified "${action}"`,
					Cr.NS_ERROR_ILLEGAL_VALUE
					);
		}

		await manager.commit(trn);

		// If a batch transaction is active, do not update the menu as
		// endBatchTransaction() will take care of that.
		if (gCalBatchTransaction) {
			return;
		}

		observer?.onTransactionComplete(trn.item, trn.oldItem);
		updateUndoRedoMenu();
	}
};