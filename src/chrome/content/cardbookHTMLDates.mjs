import { cardbookHTMLUtils } from "./cardbookHTMLUtils.mjs";

export var cardbookHTMLDates = {
	
	defaultYear: "1604",
	dateFields: [ 'bday', 'anniversary', 'deathdate' ],
	
	getDateForCompare: async function (aCard, aField) {
		try {
			var myFieldValue = aCard[aField];
			if (myFieldValue == "") {
				return new Date(Date.UTC(cardbookHTMLDates.defaultYear, '6', '6'));
			} else {
				switch(myFieldValue.length) {
					// datetimes
					// the mozilla parser does not parse 20180904T161908Z or 20180904T161908
					case 15:
					case 16:
					case 17:
					case 18:
					case 19:
					case 20:
					case 24:
						myFieldValue = cardbookHTMLDates.getCorrectDatetime(myFieldValue);
						var myDate = new Date(Date.parse(myFieldValue));
						if (isNaN(myDate)) {
							return new Date(Date.UTC(cardbookHTMLDates.defaultYear, '6', '6'));
						} else {
							return myDate;
						}
						break;

					// dates
					default:
						var dateFormat = await cardbookHTMLUtils.getDateFormat(aCard.dirPrefId, aCard.version);
						var myDate = cardbookHTMLDates.convertDateStringToDateUTC(myFieldValue, dateFormat);
						if (myDate == "WRONGDATE") {
							return new Date(Date.UTC(cardbookHTMLDates.defaultYear, '6', '6'));
						} else {
							return myDate;
						}
				}
			}
		}
		catch (e) {
			return new Date(Date.UTC(cardbookHTMLDates.defaultYear, '6', '6'));
		}
	},

	getFormattedDateForCard: async function (aCard, aField) {
		try {
			let myFieldValue = aCard[aField];
			if (myFieldValue == "") {
				return "";
			} else {
                let pref = await cardbookHTMLUtils.getPrefValue("dateDisplayedFormat");
				switch(myFieldValue.length) {
					// datetimes
					// the mozilla parser does not parse 20180904T161908Z or 20180904T161908
					case 15:
					case 16:
					case 17:
					case 18:
					case 19:
					case 20:
					case 24:
						let date = cardbookHTMLDates.getCorrectDatetime(myFieldValue);
						return cardbookHTMLDates.getFormattedDateTimeForDateTimeString(date, pref);
						break;

					// dates
					default:
						let dateFormat = await cardbookHTMLUtils.getDateFormat(aCard.dirPrefId, aCard.version);
						return cardbookHTMLDates.getFormattedDateForDateString(myFieldValue, dateFormat, pref);
				}
			}
		}
		catch (e) {
			return aCard[aField];
		}
	},

	getFormattedDateForDateString: function (aDateString, aSourceDateFormat, aTargetDateFormat) {
		try {
			var myDate = cardbookHTMLDates.convertDateStringToDateUTC(aDateString, aSourceDateFormat);
			if (myDate == "WRONGDATE") {
				return aDateString;
			} else if (myDate.getUTCFullYear() == cardbookHTMLDates.defaultYear) {
				if (aTargetDateFormat == "0") {
                    var formatter = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", timeZone: "UTC"});
				} else {
					var formatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC"});
				}
				return formatter.format(myDate);
			} else {
				if (aTargetDateFormat == "0") {
					var formatter = new Intl.DateTimeFormat(undefined, {dateStyle: "long", timeZone: "UTC"});
				} else {
					var formatter = new Intl.DateTimeFormat(undefined, {dateStyle: "short", timeZone: "UTC"});
				}
				return formatter.format(myDate);
			}
		}
		catch (e) {
			return aDateString;
		}
	},

	getFormattedDateTimeForDateTimeString: function (aDate, aTargetDateFormat) {
		try {
			if (isNaN(aDate)) {
				return aDate;
			} else {
				if (aTargetDateFormat == "0") {
					var formatter = new Intl.DateTimeFormat(undefined, {dateStyle: "long", timeZone: "UTC"});
				} else if (aTargetDateFormat == "1") {
					var formatter = new Intl.DateTimeFormat(undefined, {dateStyle: "short", timeZone: "UTC"});
				} else if (aTargetDateFormat == "2") {
					var formatter = new Intl.DateTimeFormat(undefined, {dateStyle: "full", timeStyle: 'long'});
				}
				return formatter.format(aDate);
			}
		}
		catch (e) {
			return aDate;
		}
	},

	getAge: async function (aCard) {
		try {
			if (aCard.bday == "") {
				return "";
			} else {
				var dateFormat = await cardbookHTMLUtils.getDateFormat(aCard.dirPrefId, aCard.version);
				var lDateOfBirth = cardbookHTMLDates.convertDateStringToDateUTC(aCard.bday, dateFormat);
				if (lDateOfBirth == "WRONGDATE") {
					return "?";
				} else if (lDateOfBirth.getUTCFullYear() == cardbookHTMLDates.defaultYear) {
					return "?";
				} else {
					var today = new Date();
					var age = today.getFullYear() - lDateOfBirth.getFullYear();
					var m = today.getMonth() - lDateOfBirth.getMonth();
					if (m < 0 || (m === 0 && today.getDate() < lDateOfBirth.getDate())) {
						age--;
					}
					return age.toString();
				}
			}
		}
		catch (e) {
			return "?";
		}
	},

	lPad: function (aValue) {
		return ("0" + aValue).slice(-2);
	},

	getCorrectDatetime: function (aValue) {
		let date;
		// 20190208T000004
		// 20190208T000004Z
		if (aValue.length == 15 ||aValue.length == 16) {
			date = new Date(Date.UTC(parseInt(aValue.slice(0,4)), 
										parseInt(aValue.slice(4,6))-1, 
										parseInt(aValue.slice(6,8)),
										parseInt(aValue.slice(9,11)),
										parseInt(aValue.slice(11,13)),
										parseInt(aValue.slice(13,15))));
		// 2019-02-08T000004
		} else if (aValue.length == 17 && aValue.includes("-")) {
			date = new Date(Date.UTC(parseInt(aValue.slice(0,4)), 
										parseInt(aValue.slice(6,8))-1, 
										parseInt(aValue.slice(8,10)),
										parseInt(aValue.slice(11,13)),
										parseInt(aValue.slice(13,15)),
										parseInt(aValue.slice(15,17))));
		// 20190208T00:00:04
		} else if (aValue.length == 17 && aValue.includes(":")) {
			date = new Date(Date.UTC(parseInt(aValue.slice(0,4)), 
										parseInt(aValue.slice(4,6))-1, 
										parseInt(aValue.slice(6,8)),
										parseInt(aValue.slice(9,11)),
										parseInt(aValue.slice(12,14)),
										parseInt(aValue.slice(15,17))));
		// 2019-02-08T000004Z
		} else if (aValue.length == 18 && aValue.includes("-")) {
			date = new Date(Date.UTC(parseInt(aValue.slice(0,4)), 
										parseInt(aValue.slice(6,8))-1, 
										parseInt(aValue.slice(8,10)),
										parseInt(aValue.slice(11,13)),
										parseInt(aValue.slice(13,15)),
										parseInt(aValue.slice(15,17))));
		// 20190208T00:00:04Z
		} else if (aValue.length == 18 && aValue.includes(":")) {
			date = new Date(Date.UTC(parseInt(aValue.slice(0,4)), 
										parseInt(aValue.slice(4,6))-1, 
										parseInt(aValue.slice(6,8)),
										parseInt(aValue.slice(9,11)),
										parseInt(aValue.slice(12,14)),
										parseInt(aValue.slice(15,17))));
		// 2019-02-08T00:00:04
		// 2019-02-08T00:00:04Z
		// 2023-08-27T17:25:16.301Z
		} else if (aValue.length >= 19) {
			date = new Date(Date.UTC(parseInt(aValue.slice(0,4)), 
										parseInt(aValue.slice(6,8))-1, 
										parseInt(aValue.slice(8,10)),
										parseInt(aValue.slice(11,13)),
										parseInt(aValue.slice(14,16)),
										parseInt(aValue.slice(17,19))));
		}
		return date;
	},

	getCorrectPartialDate: function (aValue) {
		// years equal to 1604 are always considered as a partial date
		// 5-8
		if (aValue.length == 3 && aValue.includes("-")) {
			aValue = cardbookHTMLDates.defaultYear + "-0" + aValue.slice(0,1) + "-0" + aValue.slice(2,3);
		// 523
		} else if (aValue.length == 3 && !aValue.includes("-")) {
			aValue = cardbookHTMLDates.defaultYear + "-0" + aValue.slice(0,1) + "-" + aValue.slice(1,3);
		// 1212
		} else if (aValue.length == 4 && !aValue.includes("-")) {
			aValue = cardbookHTMLDates.defaultYear + "-" + aValue.slice(0,2) + "-" + aValue.slice(2,4);
		// 8-12
		} else if (aValue.length == 4 && aValue.indexOf("-") == 1) {
			aValue = cardbookHTMLDates.defaultYear + "-0" + aValue.slice(0,1) + "-" + aValue.slice(2,4);
		// 12-8
		} else if (aValue.length == 4 && aValue.indexOf("-") == 2) {
			aValue = cardbookHTMLDates.defaultYear + "-" + aValue.slice(0,2) + "-0" + aValue.slice(3,4);
		// 11-12
		} else if (aValue.length == 5 && aValue.indexOf("-") == 2) {
			aValue = cardbookHTMLDates.defaultYear + "-" + aValue.slice(0,2) + "-" + aValue.slice(3,5);
		// --1125
		} else if (aValue.length == 6 && aValue.startsWith("--")) {
			aValue = cardbookHTMLDates.defaultYear + "-" + aValue.slice(2,4) + "-" + aValue.slice(4,6);
		}
		return aValue;
	},

	convertDateStringToDateUTC: function (aDateString, aDateFormat) {
		try {
			if (aDateString.length < 3) {
				return "WRONGDATE";
			// datetimes
			// the mozilla parser does not parse 20180904T161908Z or 20180904T161908
			} else if (aDateString.length >= 15 && aDateString.length <= 20) {
				let date = cardbookHTMLDates.getCorrectDatetime(aDateString);
				if (isNaN(date)) {
					return "WRONGDATE";
				} else {
					return date;
				}
			// partial dates
			} else if (aDateString.length >= 3 && aDateString.length <= 6) {
				aDateString = cardbookHTMLDates.getCorrectPartialDate(aDateString);
				let myYear = aDateString.slice(0, 4);
				let myMonth = aDateString.slice(5, 7);
				let myDay = aDateString.slice(8, 10);
				let myDate = new Date(Date.UTC(myYear, myMonth-1, myDay));
				if (isNaN(myDate)) {
					return "WRONGDATE";
				} else {
					return myDate;
				}
			} else {
				if (aDateFormat == "YYYY-MM-DD") {
					let myYear = aDateString.slice(0, 4);
					let myMonth = aDateString.slice(5, 7);
					let myDay = aDateString.slice(8, 10);
					let myDate = new Date(Date.UTC(myYear, myMonth-1, myDay));
					if (isNaN(myDate)) {
						return "WRONGDATE";
					} else {
						return myDate;
					}
				} else if (aDateFormat == "3.0") {
					if (aDateString.length == 10) {
						let myYear = aDateString.slice(0, 4);
						let myMonth = aDateString.slice(5, 7);
						let myDay = aDateString.slice(8, 10);
						let myDate = new Date(Date.UTC(myYear, myMonth-1, myDay));
						if (isNaN(myDate)) {
							return "WRONGDATE";
						} else {
							return myDate;
						}
					} else if (aDateString.length == 8) {
						let myYear = aDateString.slice(0, 4);
						let myMonth = aDateString.slice(4, 6);
						let myDay = aDateString.slice(6, 8);
						let myDate = new Date(Date.UTC(myYear, myMonth-1, myDay));
						if (isNaN(myDate)) {
							return "WRONGDATE";
						} else {
							return myDate;
						}
					} else {
						return "WRONGDATE";
					}
				} else if (aDateFormat == "4.0") {
					if (aDateString.length == 8) {
						let myYear = aDateString.slice(0, 4);
						let myMonth = aDateString.slice(4, 6);
						let myDay = aDateString.slice(6, 8);
						let myDate = new Date(Date.UTC(myYear, myMonth-1, myDay));
						if (isNaN(myDate)) {
							return "WRONGDATE";
						} else {
							return myDate;
						}
					} else {
						return "WRONGDATE";
					}
				} else {
					return "WRONGDATE";
				}
			}
		}
		catch (e) {
			return "WRONGDATE";
		}
	},

	convertDateStringToDateString: function (aDay, aMonth, aYear, aDateFormat) {
		aMonth = cardbookHTMLDates.lPad(aMonth);
		aDay = cardbookHTMLDates.lPad(aDay);
		return cardbookHTMLDates.getFinalDateString(aDay, aMonth, aYear, aDateFormat);
	},

	splitUTCDateIntoComponents: function (aDate) {
		let lYear = aDate.getUTCFullYear();
		let lMonth = aDate.getUTCMonth() + 1;
		lMonth = cardbookHTMLDates.lPad(lMonth);
		let lDay = aDate.getUTCDate();
		lDay = cardbookHTMLDates.lPad(lDay);
		return {day: lDay, month: lMonth, year: lYear};
	},
	
	convertUTCDateToDateString: function (aDate, aDateFormat) {
		let dateSplitted = cardbookHTMLDates.splitUTCDateIntoComponents(aDate);
		return cardbookHTMLDates.getFinalDateString(dateSplitted.day, dateSplitted.month, dateSplitted.year, aDateFormat);
	},

	splitDateIntoComponents: function (aDate) {
		let lYear = aDate.getFullYear();
		let lMonth = aDate.getMonth() + 1;
		lMonth = cardbookHTMLDates.lPad(lMonth);
		let lDay = aDate.getDate();
		lDay = cardbookHTMLDates.lPad(lDay);
		return {day: lDay, month: lMonth, year: lYear};
	},

	convertDateToDateString: function (aDate, aDateFormat) {
		let dateSplitted = cardbookHTMLDates.splitDateIntoComponents(aDate);
		return cardbookHTMLDates.getFinalDateString(dateSplitted.day, dateSplitted.month, dateSplitted.year, aDateFormat);
	},

	getFinalDateString: function (aDay, aMonth, aYear, aDateFormat) {
		aMonth = cardbookHTMLDates.lPad(aMonth);
		aDay = cardbookHTMLDates.lPad(aDay);
		if (aDateFormat == "YYYY-MM-DD") {
			if (aYear == "") {
				aYear = cardbookHTMLDates.defaultYear;
			}
			return aYear + "-" + aMonth + "-" + aDay;
		} else if (aDateFormat == "3.0") {
			if (aYear == "") {
				aYear = cardbookHTMLDates.defaultYear;
			}
			return "" + aYear + aMonth + aDay;
		} else {
			if (aYear == "") {
				aYear = "--";
			}
			return "" + aYear + aMonth + aDay;
		}
	},

	getVCardDateFromDateString: function (aValue, aDateFormat) {
		// the value supplied is always validated before
		// years equal to 1604 are always considered as a partial date
		if (aValue.length >= 3 && aValue.length <= 5) {
			var myMonth;
			var myDay;
			// 5-8
			if (aValue.length == 3 && aValue.includes("-")) {
				myMonth = "0" + aValue.slice(0,1);
				myDay = "0" + aValue.slice(2,3);
			// 523
			} else if (aValue.length == 3 && !aValue.includes("-")) {
				myMonth = "0" + aValue.slice(0,1);
				myDay = aValue.slice(1,3);
			// 1212
			} else if (aValue.length == 4 && !aValue.includes("-")) {
				myMonth = aValue.slice(0,2);
				myDay = aValue.slice(2,4);
			// 8-12
			} else if (aValue.length == 4 && aValue.indexOf("-") == 1) {
				myMonth = "0" + aValue.slice(0,1);
				myDay = aValue.slice(2,4);
			// 12-8
			} else if (aValue.length == 4 && aValue.indexOf("-") == 2) {
				myMonth = aValue.slice(0,2);
				myDay = "0" + aValue.slice(3,4);
			// 11-12
			} else if (aValue.length == 5 && aValue.indexOf("-") == 2) {
				myMonth = aValue.slice(0,2);
				myDay = aValue.slice(3,5);
			}
			if (aDateFormat == "YYYY-MM-DD") {
				aValue = cardbookHTMLDates.defaultYear + "-" + myMonth + "-" + myDay;
			} else if (aDateFormat == "3.0") {
				aValue = cardbookHTMLDates.defaultYear + myMonth + myDay;
			} else {
				aValue = "--" + myMonth + myDay;
			}
		}
		return aValue;
	},

	getDateStringFromVCardDate: function (aValue, aDateFormat) {
		if (!aValue) {
			return "";
		} else if (aDateFormat == "4.0") {
			return aValue.replace(/^--/, "");
		} else {
			var myRegexp = new RegExp("^" + cardbookHTMLDates.defaultYear + "-?");
			return aValue.replace(myRegexp, "");
		}
	},

	addEventstoCard: function(aCard, aEventsArray, aPGNextNumber, aDateFormat) {
		var myEventsArray = [];
		for (var i = 0; i < aEventsArray.length; i++) {
			var myValue = cardbookHTMLDates.getVCardDateFromDateString(aEventsArray[i][0], aDateFormat);
			if (aEventsArray[i][2]) {
				myEventsArray.push("ITEM" + aPGNextNumber + ".X-ABDATE;TYPE=PREF:" + myValue);
			} else {
				myEventsArray.push("ITEM" + aPGNextNumber + ".X-ABDATE:" + myValue);
			}
			myEventsArray.push("ITEM" + aPGNextNumber + ".X-ABLABEL:" + aEventsArray[i][1]);
			aPGNextNumber++;
		}
		aCard.others = myEventsArray.concat(aCard.others);
	},

	convertCardDate: async function (aCard, aDirPrefName, aSourceDateFormat, aTargetDateFormat) {
		var eventInNoteEventPrefix = messenger.i18n.getMessage("eventInNoteEventPrefix");
		// date fields
		var cardChanged = false;
		for (var field of cardbookHTMLDates.dateFields) {
			if (aCard[field] && aCard[field] != "") {
				var myFieldValue = aCard[field];
				var isDate = cardbookHTMLDates.convertDateStringToDateUTC(myFieldValue, aSourceDateFormat);
				if (isDate != "WRONGDATE") {
					aCard[field] = cardbookHTMLDates.convertUTCDateToDateString(isDate, aTargetDateFormat);
					var cardChanged = true;
				} else {
                    let values =  [aDirPrefName, aCard.fn, myFieldValue, aSourceDateFormat];
                    await messenger.runtime.sendMessage({query: "cardbook.formatStringForOutput", string: "dateEntry1Wrong", values: values, error: "Warning"});
				}
			}
		}
		
		// events 
		var eventsChanged = false;
		var myNoteArray = aCard.note.split("\n");
		var myEvents = cardbookHTMLUtils.getEventsFromCard(myNoteArray, aCard.others);
		if (myEvents.result.length != 0) {
			for (var i = 0; i < myEvents.result.length; i++) {
				var myFieldValue = myEvents.result[i][0];
				var isDate = cardbookHTMLDates.convertDateStringToDateUTC(myFieldValue, aSourceDateFormat);
				if (isDate != "WRONGDATE") {
					myEvents.result[i][0] = cardbookHTMLDates.convertUTCDateToDateString(isDate, aTargetDateFormat);
				} else {
                    let values =  [aDirPrefName, aCard.fn, myFieldValue, aSourceDateFormat];
                    await messenger.runtime.sendMessage({query: "cardbook.formatStringForOutput", string: "dateEntry1Wrong", values: values, error: "Warning"});
				}
			}

			aCard.others = myEvents.remainingOthers;
			aCard.note = myEvents.remainingNote.join("\n");
			var myPGNextNumber = cardbookHTMLUtils.rebuildAllPGs(aCard);
			cardbookHTMLDates.addEventstoCard(aCard, myEvents.result, myPGNextNumber, aTargetDateFormat);
			eventsChanged = true;
		}

		if (cardChanged || eventsChanged) {
			return true;
		} else {
			return false;
		}
	},

	getDateFormatLabel: async function (aDirPrefId, aVersion) {
		var dateFormat = await cardbookHTMLUtils.getDateFormat(aDirPrefId, aVersion);
		if (dateFormat == "YYYY-MM-DD") {
			return dateFormat;
		} else {
			return "YYYYMMDD";
		}
	},

	getDateUTC: function () {
		var sysdate = new Date();
		var year = sysdate.getUTCFullYear();
		var month = cardbookHTMLDates.lPad(sysdate.getUTCMonth() + 1);
		var day = cardbookHTMLDates.lPad(sysdate.getUTCDate());
		var hour = cardbookHTMLDates.lPad(sysdate.getUTCHours());
		var min = cardbookHTMLDates.lPad(sysdate.getUTCMinutes());
		var sec = cardbookHTMLDates.lPad(sysdate.getUTCSeconds());
		return {year, month, day, hour, min, sec};
	}
};
