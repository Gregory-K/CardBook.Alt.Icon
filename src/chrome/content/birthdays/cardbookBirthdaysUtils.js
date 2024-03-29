if ("undefined" == typeof(cardbookBirthdaysUtils)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var cardbookBirthdaysUtils = {
		lBirthdayList : [],
		lBirthdayAccountList : {},
		lCalendarList : [],
		lBirthdaySyncResult : {},
		
		isCalendarWritable: function (aCalendar) {
			return (!aCalendar.getProperty("disabled") && !aCalendar.readOnly);
		},
		
		getCalendars: function () {
			cardbookBirthdaysUtils.lCalendarList = [];
			var myCalendar = cardbookRepository.cardbookPrefs["calendarsNameList"];
			let cals = cal.manager.getCalendars();
			for (let calendar of cals) {
				if (myCalendar.includes(calendar.id)) {
					cardbookBirthdaysUtils.lCalendarList.push(calendar);
				}
			}
		},

		syncWithLightning: function () {
			var maxDaysUntilNextBirthday = cardbookRepository.cardbookPrefs["numberOfDaysForWriting"];
			cardbookBirthdaysUtils.loadBirthdays(maxDaysUntilNextBirthday);

			cardbookBirthdaysUtils.getCalendars();
			
			if (cardbookBirthdaysUtils.lBirthdayList.length != 0) {
				cardbookBirthdaysUtils.lBirthdaySyncResult = {};
				cardbookBirthdaysUtils.doSyncWithLightning();
			}
		},

		doSyncWithLightning: function () {
			for (var i = 0; i < cardbookBirthdaysUtils.lCalendarList.length; i++) {
				cardbookBirthdaysUtils.syncCalendar(cardbookBirthdaysUtils.lCalendarList[i]);
			}
		},

		syncCalendar: function (aCalendar) {
			var errorTitle;
			var errorMsg;

			// if calendar is not found, then abort
			if (aCalendar == 0) {
				cardbookBirthdaysUtils.lBirthdaySyncResult[aCalendar.id] = {name: aCalendar.name, existing: 0, failed: cardbookBirthdaysUtils.lBirthdayList.length, succeeded: 0};
				errorTitle = cardbookRepository.extension.localeData.localizeMessage("calendarNotFoundTitle");
				errorMsg = cardbookRepository.extension.localeData.localizeMessage("calendarNotFoundMessage", [aCalendar.name]);
				Services.prompt.alert(null, errorTitle, errorMsg);
				return;
			}

			// check if calendar is writable - if not, abort
			if (!(cardbookBirthdaysUtils.isCalendarWritable(aCalendar))) {
				cardbookBirthdaysUtils.lBirthdaySyncResult[aCalendar.id] = {name: aCalendar.name, existing: 0, failed: cardbookBirthdaysUtils.lBirthdayList.length, succeeded: 0};
				errorTitle = cardbookRepository.extension.localeData.localizeMessage("calendarNotWritableTitle");
				errorMsg = cardbookRepository.extension.localeData.localizeMessage("calendarNotWritableMessage", [aCalendar.name]);
				Services.prompt.alert(null, errorTitle, errorMsg);
				return;
			}

			cardbookBirthdaysUtils.lBirthdaySyncResult[aCalendar.id] = {name: aCalendar.name, existing: 0, failed: 0, succeeded: 0};
			cardbookBirthdaysUtils.getCalendarItems(aCalendar);
		},

		getCalendarItems: async function (aCalendar) {
			let filter = 0;
			filter |= aCalendar.ITEM_FILTER_TYPE_EVENT | aCalendar.ITEM_FILTER_CLASS_OCCURRENCES;
			let startDate = cal.createDateTime();
			let endDate = cal.dtz.jsDateToDateTime(new Date(new Date().setFullYear(new Date().getFullYear() + 1)));
			let iterator = cal.iterate.streamValues(
				aCalendar.getItems(filter, 0, startDate, endDate)
			);
			let allItems = [];
			for await (let items of iterator) {
				allItems = allItems.concat(items);
			}		
			cardbookBirthdaysUtils.syncBirthdays(aCalendar, allItems);
		},

		syncBirthdays: function (aCalendar, aItems) {
			var date_of_today = new Date();
			for (var i = 0; i < cardbookBirthdaysUtils.lBirthdayList.length; i++) {
				var ldaysUntilNextBirthday = cardbookBirthdaysUtils.lBirthdayList[i][0];
				var lBirthdayTitle = cardbookBirthdaysUtils.lBirthdayList[i][1];
				var lBirthdayAge = cardbookBirthdaysUtils.lBirthdayList[i][2];
				var lBirthdayName = cardbookBirthdaysUtils.lBirthdayList[i][7];

				var lBirthdayDate = new Date();
				lBirthdayDate.setDate(date_of_today.getDate()+parseInt(ldaysUntilNextBirthday));

				// generate Date as Ical compatible text string
				var lYear = lBirthdayDate.getUTCFullYear();
				var lMonth = lBirthdayDate.getMonth() + 1;
				lMonth += "";
				if (lMonth.length == 1) {
					lMonth = "0"+lMonth;
				}
				var lDay = lBirthdayDate.getDate();
				lDay += "";
				if (lDay.length == 1) {
					lDay = "0" + lDay;
				}
				var lBirthdayDateString = lYear + "" + lMonth + "" + lDay;
				
				var lBirthdayDateNext = new Date(lBirthdayDate.getTime() + (24 * 60 * 60 * 1000));
				var lYear = lBirthdayDateNext.getFullYear();
				var lMonth = lBirthdayDateNext.getMonth() + 1;
				lMonth += "";
				if (lMonth.length == 1) {
					lMonth = "0"+lMonth;
				}
				var lDay = lBirthdayDateNext.getDate();
				lDay += "";
				if (lDay.length == 1) {
					lDay = "0" + lDay;
				}
				var lBirthdayDateNextString = lYear + "" + lMonth + "" + lDay;

				var found = false;
				for (let item of aItems) {
					var summary = item.getProperty("SUMMARY");
					if (summary == lBirthdayTitle) {
						found = true;
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aCalendar.name + " : debug mode : found : " + lBirthdayTitle + ", against : " + summary);
						break;
					} else {
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aCalendar.name + " : debug mode : not found : " + lBirthdayTitle + ", against : " + summary);
					}
				}
				if (!found) {
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(aCalendar.name + " : debug mode : add : " + lBirthdayTitle);
					var lBirthdayId = cardbookRepository.cardbookUtils.getUUID();
					cardbookBirthdaysUtils.addNewCalendarEntry(aCalendar, lBirthdayId, lBirthdayName, lBirthdayAge, lBirthdayDateString, lBirthdayDateNextString, lBirthdayTitle);
				} else {
					cardbookRepository.cardbookUtils.formatStringForOutput("syncListExistingEntry", [aCalendar.name, lBirthdayName]);
					cardbookBirthdaysUtils.lBirthdaySyncResult[aCalendar.id].existing++;
				}
			}
		},

		addNewCalendarEntry: async function (aCalendar, aBirthdayId, aBirthdayName, aBirthdayAge, aDate, aNextDate, aBirthdayTitle) {
			// Strategy is to create iCalString and create Event from that string
			var iCalString = "BEGIN:VCALENDAR\n";
			iCalString += "BEGIN:VEVENT\n";

			var calendarEntryCategories = cardbookRepository.cardbookPrefs["calendarEntryCategories"];
			if (calendarEntryCategories !== "") {
				iCalString += "CATEGORIES:" + calendarEntryCategories + "\n";
			}
			
			iCalString += "TRANSP:TRANSPARENT\n";
			if (cardbookRepository.cardbookPrefs["repeatingEvent"]) {
				iCalString += "RRULE:FREQ=YEARLY\n";
			}

			var dtstart;
			var dtend;
			if (cardbookRepository.cardbookPrefs["eventEntryWholeDay"]) {
				dtstart = "DTSTART;VALUE=DATE:";
				dtend = "DTEND;VALUE=DATE:";
				iCalString += dtstart + aDate + "\n";
				iCalString += dtend + aNextDate + "\n";
			} else {
				dtstart = "DTSTART;TZID=" + cal.dtz.defaultTimezone.tzid + ":";
				dtend = "DTEND;TZID=" + cal.dtz.defaultTimezone.tzid + ":";
				var eventEntryTime = cardbookRepository.cardbookPrefs["eventEntryTime"];
				var EmptyParamRegExp1 = new RegExp("(.*)([^0-9])(.*)", "ig");
				if (eventEntryTime.replace(EmptyParamRegExp1, "$1")!=eventEntryTime) {
					var eventEntryTimeHour = eventEntryTime.replace(EmptyParamRegExp1, "$1");
					var eventEntryTimeMin = eventEntryTime.replace(EmptyParamRegExp1, "$3");
					if ( eventEntryTimeHour < 10 && eventEntryTimeHour.length == 1 ) {
						eventEntryTimeHour = "0" + eventEntryTimeHour;
					}
					if ( eventEntryTimeMin < 10 && eventEntryTimeMin.length == 1 ) {
						eventEntryTimeMin = "0" + eventEntryTimeMin;
					}
					var lBirthdayTimeString = eventEntryTimeHour.toString() + eventEntryTimeMin.toString() + "00";
				} else {
					var lBirthdayTimeString = "000000";
				}
				iCalString += dtstart + aDate + "T" + lBirthdayTimeString + "\n";
				iCalString += dtend + aDate + "T" + lBirthdayTimeString + "\n";
			}

			// set Alarms
			var lcalendarEntryAlarm = cardbookRepository.cardbookPrefs["calendarEntryAlarm"];
			var lcalendarEntryAlarmArray = lcalendarEntryAlarm.split(',');
			for (var i = 0; i < lcalendarEntryAlarmArray.length; i++) {
				// default before alarm before event
				var sign = "-";
				lcalendarEntryAlarmArray[i] = lcalendarEntryAlarmArray[i].replace(/\-/g, "").replace(/ /g, "");
				if (lcalendarEntryAlarmArray[i].includes("+")) {
					sign = "";
					lcalendarEntryAlarmArray[i] = lcalendarEntryAlarmArray[i].replace(/\+/g, "").replace(/ /g, "");
				}
				if (!isNaN(parseInt(lcalendarEntryAlarmArray[i]))) {
					iCalString += "BEGIN:VALARM\nACTION:DISPLAY\nTRIGGER:" + sign + "PT" + parseInt(lcalendarEntryAlarmArray[i]) + "H\nEND:VALARM\n";
				}
			}

			// finalize iCalString
			iCalString += "END:VEVENT\n";
			iCalString += "END:VCALENDAR\n";

			// create event Object out of iCalString
			var event = Components.classes["@mozilla.org/calendar/event;1"].createInstance(Components.interfaces.calIEvent);
			event.icalString = iCalString;

			// set Title
			event.title = aBirthdayTitle;
			event.id = aBirthdayId;

			// add Item to Calendar
			let item = await aCalendar.addItem(event);
			if (item) {
				cardbookRepository.cardbookUtils.formatStringForOutput("syncListCreatedEntry", [aCalendar.name, this.mBirthdayName]);
				cardbookBirthdaysUtils.lBirthdaySyncResult[aCalendar.id].succeeded++;
			} else {
				cardbookRepository.cardbookUtils.formatStringForOutput("syncListErrorEntry", [aCalendar.name, this.mBirthdayName], "Error");
				cardbookBirthdaysUtils.lBirthdaySyncResult[aCalendar.id].failed++;
			}
		},

		getEventName: function (aEventTitle, aDisplayName, aAge, aYear, aName, aEventType) {
			return aEventTitle.replace("%1$S", aDisplayName).replace("%2$S", aAge).replace("%3$S", aYear).replace("%4$S", aName).replace("%5$S", aEventType);
		},

		daysBetween: function (date1, date2) {
			// The number of milliseconds in one day
			var oneDay = 1000 * 60 * 60 * 24;
			
			var newDate1 = new Date(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
			var newDate2 = new Date(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
			return Math.round((newDate1.getTime() - newDate2.getTime())/(oneDay));
		},

		calcDateOfNextBirthday: function (lDateRef, lDateOfBirth) {
			var lDoB_Month= lDateOfBirth.getUTCMonth();
			var lDoB_Day = lDateOfBirth.getUTCDate();
			
			var lnextBirthday = new Date(lDateOfBirth);
			lnextBirthday.setUTCFullYear(lDateRef.getUTCFullYear());
			
			if (this.daysBetween(lnextBirthday, lDateRef)<0) {
				return new Date(Date.UTC(lDateRef.getUTCFullYear()+1, lDoB_Month, lDoB_Day));
			} else {
				return new Date(Date.UTC(lDateRef.getUTCFullYear(), lDoB_Month, lDoB_Day));
			}
		},

		getAllBirthdaysByName: function (aDateFormat, aDateOfBirth, aDisplayName, aNumberOfDays, aDateOfBirthFound, aEmail, aDirPrefId, aName, aType) {
			var date_of_today = new Date();
			var endDate = new Date();
			var dateRef = new Date();
			var lnextBirthday;
			var lAge;
			var ldaysUntilNextBirthday;
			var lDateOfBirth = cardbookRepository.cardbookDates.convertDateStringToDateUTC(aDateOfBirth, aDateFormat);

			var leventEntryTitle = cardbookRepository.cardbookPrefs["eventEntryTitle"];
			endDate.setUTCDate(date_of_today.getDate()+parseInt(aNumberOfDays));
			while (dateRef < endDate) {
				lnextBirthday = this.calcDateOfNextBirthday(dateRef,lDateOfBirth);
				ldaysUntilNextBirthday = this.daysBetween(lnextBirthday, date_of_today);
				if (parseInt(ldaysUntilNextBirthday) <= parseInt(aNumberOfDays)) {
					if (lDateOfBirth.getUTCFullYear() == cardbookRepository.cardbookDates.defaultYear) {
						lAge = "?";
						var lBirthdayTitle =  cardbookBirthdaysUtils.getEventName(leventEntryTitle, aDisplayName, "0", "?", aName, aType);
					} else {
						lAge = lnextBirthday.getFullYear()-lDateOfBirth.getUTCFullYear();
						var lEventDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(aDateOfBirth, aDateFormat);
						var lBirthdayTitle = cardbookBirthdaysUtils.getEventName(leventEntryTitle, aDisplayName, lAge, lEventDate.getUTCFullYear(), aName, aType);
					}
	
					if (ldaysUntilNextBirthday === parseInt(ldaysUntilNextBirthday)) {
						let dateOfBirthOld = cardbookRepository.cardbookDates.getFormattedDateForDateString(aDateOfBirth, aDateFormat, cardbookRepository.cardbookPrefs["dateDisplayedFormat"])
						cardbookBirthdaysUtils.lBirthdayList.push([ldaysUntilNextBirthday, lBirthdayTitle, lAge, dateOfBirthOld, aDateOfBirthFound, aEmail, aDirPrefId, aName]);
					} else {
						cardbookBirthdaysUtils.lBirthdayList.push(["0", lBirthdayTitle + " : Error", "0", "0", aDateOfBirthFound, aEmail, aDirPrefId, aName]);
					}
					if (!(cardbookBirthdaysUtils.lBirthdayAccountList[aDirPrefId])) {
						cardbookBirthdaysUtils.lBirthdayAccountList[aDirPrefId] = "";
					}
				}
				dateRef.setMonth(dateRef.getMonth() + 12);
				// for repeating events one event is enough
				if (cardbookRepository.cardbookPrefs["repeatingEvent"]) {
					return;
				}
			}
		},
	
		loadBirthdays: function (aNumberOfDays) {
			aNumberOfDays = (aNumberOfDays > 365) ? 365 : aNumberOfDays;
			var ABs = cardbookRepository.cardbookPrefs["addressBooksNameList"];
			var useOnlyEmail = cardbookRepository.cardbookPrefs["useOnlyEmail"];
			var search = {};
			for (var field of cardbookRepository.dateFields) {
				search[field] = cardbookRepository.cardbookPrefs["birthday." + field];
			}
			search.events = cardbookRepository.cardbookPrefs["birthday.events"];
			cardbookBirthdaysUtils.lBirthdayList = [];

			let fieldType = {};
			for (let field of cardbookRepository.dateFields) {
				fieldType[field] = cardbookRepository.extension.localeData.localizeMessage(`${field}Label`);
			}
			fieldType["event"] = cardbookRepository.extension.localeData.localizeMessage("eventInNoteEventPrefix");

			for (let i in cardbookRepository.cardbookCards) {
				var myCard = cardbookRepository.cardbookCards[i];
				var myDirPrefId = myCard.dirPrefId;
				if (ABs.includes(myDirPrefId) || ABs === "allAddressBooks") {
					var dateFormat = cardbookRepository.getDateFormat(myDirPrefId, myCard.version);
					var myDirPrefName = cardbookRepository.cardbookUtils.getPrefNameFromPrefId(myDirPrefId);
					let name = cardbookRepository.cardbookUtils.getName(myCard);
					for (let field of cardbookRepository.dateFields) {
						if (myCard[field] && myCard[field] != "" && search[field]) {
							var myFieldValue = myCard[field];
							var isDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(myFieldValue, dateFormat);
							if (isDate != "WRONGDATE") {
								listOfEmail = cardbookRepository.cardbookUtils.getMimeEmailsFromCards([myCard], useOnlyEmail);
								cardbookBirthdaysUtils.getAllBirthdaysByName(dateFormat, myFieldValue, myCard.fn, aNumberOfDays, myFieldValue, listOfEmail, myDirPrefId, name, fieldType[field]);
							} else {
								cardbookRepository.cardbookUtils.formatStringForOutput("dateEntry1Wrong", [myDirPrefName, myCard.fn, myFieldValue, dateFormat], "Warning");
							}
						}
					}
					if (search.events) {
						var myEvents = cardbookRepository.cardbookUtils.getEventsFromCard(myCard.note.split("\n"), myCard.others);
						for (let j = 0; j < myEvents.result.length; j++) {
							var isDate = cardbookRepository.cardbookDates.convertDateStringToDateUTC(myEvents.result[j][0], dateFormat);
							if (isDate != "WRONGDATE") {
								listOfEmail = cardbookRepository.cardbookUtils.getMimeEmailsFromCards([myCard], useOnlyEmail);
								cardbookBirthdaysUtils.getAllBirthdaysByName(dateFormat, myEvents.result[j][0], myCard.fn, aNumberOfDays, myEvents.result[j][0], listOfEmail, myDirPrefId, name, myEvents.result[j][1]);
							} else {
								cardbookRepository.cardbookUtils.formatStringForOutput("dateEntry1Wrong", [myDirPrefName, myCard.fn, myEvents.result[j][0], dateFormat], "Warning");
							}
						}
					}
				}
			}
			return [ cardbookBirthdaysUtils.lBirthdayList, cardbookBirthdaysUtils.lBirthdayAccountList] ;
		}
	};
};
