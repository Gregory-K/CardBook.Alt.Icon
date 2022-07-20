if ("undefined" == typeof(wdw_birthdayList)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/scripts/notifyTools.js", this);

	var wdw_birthdayList = {
		
		getIndexFromName: function (aName) {
			let tmpArray = aName.split("_");
			return tmpArray[tmpArray.length - 1];
		},

		getTableCurrentIndex: function (aTableName) {
			let selectedList = document.getElementById(aTableName).querySelectorAll("tr[rowSelected='true']");
			if (selectedList.length) {
				return wdw_birthdayList.getIndexFromName(selectedList[0].id);
			}
		},

		clickTree: function (aEvent) {
			if (aEvent.target.tagName == "html:td") {
				let tbody = aEvent.target.closest("tbody");
				let row = aEvent.target.closest("tr");
				if (aEvent.shiftKey) {
					let startIndex = wdw_birthdayList.getTableCurrentIndex("birthdayListTable") || 0;
					let endIndex = wdw_birthdayList.getIndexFromName(row.id);
					let i = 0;
					for (let child of tbody.childNodes) {
						if (i >= startIndex && i <= endIndex) {
							child.setAttribute("rowSelected", "true");
						} else {
							child.removeAttribute("rowSelected");
						}
						i++;
					}
				} else if (aEvent.ctrlKey) {
					if (row.hasAttribute("rowSelected")) {
						row.removeAttribute("rowSelected");
					} else {
						row.setAttribute("rowSelected", "true");
					}
				} else {
					for (let child of tbody.childNodes) {
						child.removeAttribute("rowSelected");
					}
					row.setAttribute("rowSelected", "true");
				}
				wdw_birthdayList.buttonShowing();
			}
		},

		sortTable: function (aTableName) {
			let table = document.getElementById(aTableName);
			let order = table.getAttribute("data-sort-order") == "ascending" ? 1 : -1;
			let columnName = table.getAttribute("data-sort-column");
			
			let columnArray = wdw_birthdayList.getTableMapArray(columnName);
			let columnType = wdw_birthdayList.getTableMapType(columnName);
			let data = cardbookBirthdaysUtils.lBirthdayList;
	
			if (data && data.length) {
				if (columnType == "number") {
					cardbookRepository.cardbookUtils.sortMultipleArrayByNumber(data, columnArray, order);
				} else {
					cardbookRepository.cardbookUtils.sortMultipleArrayByString(data, columnArray, order);
				}
			}
			wdw_birthdayList.displayBirthdays();
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
				wdw_birthdayList.sortTable(table.id);
			}
			aEvent.stopImmediatePropagation();
		},
	
		getTableMapArray: function (aColumnName) {
			let headers = [ "daysLeftColumn", "nameColumn", "ageColumn", "dateOfBirthColumn" ];
			return headers.indexOf(aColumnName);
		},

		getTableMapType: function (aColumnName) {
			if (aColumnName == "daysLeftColumn") {
				return "number";
			} else if (aColumnName == "nameColumn") {
				return "string";
			} else if (aColumnName == "ageColumn") {
				return "number";
			} else if (aColumnName == "dateOfBirthColumn") {
				return "string";
			}
		},

		loadCssRules: function () {
			let myStyleSheet = "chrome://cardbook/content/skin/cardbookBirthday.css";
			let myStyleSheetRuleName = "cardbookBirthday";
			for (let styleSheet of InspectorUtils.getAllStyleSheets(window.document, false)) {
				for (let rule of styleSheet.cssRules) {
					// difficult to find as the sheet as no href 
					if (rule.cssText.includes(myStyleSheetRuleName)) {
						cardbookRepository.deleteCssAllRules(styleSheet);
						cardbookRepository.createMarkerRule(styleSheet, myStyleSheetRuleName);
						let createSearchRules = 0;
						for (let dirPrefId in cardbookBirthdaysUtils.lBirthdayAccountList) {
							createSearchRules++;
						}
						for (let dirPrefId in cardbookBirthdaysUtils.lBirthdayAccountList) {
							let color = cardbookRepository.cardbookPreferences.getColor(dirPrefId)
							if (createSearchRules > 1) {
								cardbookRepository.createCssCardRulesForTable(styleSheet, dirPrefId, color);
							}
						}
						cardbookRepository.reloadCss(myStyleSheet);
						return;
					}
				}
			}
		},

		displayAllBirthdays: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			document.getElementById('syncLightningMenuItemLabel').disabled = false;
			let maxDaysUntilNextBirthday = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.numberOfDaysForSearching");
			cardbookBirthdaysUtils.loadBirthdays(maxDaysUntilNextBirthday);
			wdw_birthdayList.sortTable("birthdayListTable");
		},

		displayBirthdays: function () {
			wdw_birthdayList.loadCssRules();
			let noneFound = document.getElementById("noneFound");
			let resulTable = document.getElementById("birthdayListTable");
			let maxDaysUntilNextBirthday = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.numberOfDaysForSearching");
			maxDaysUntilNextBirthday = (maxDaysUntilNextBirthday > 365) ? 365 : maxDaysUntilNextBirthday;

			// if there are no birthdays in the configured timespan
			if (cardbookBirthdaysUtils.lBirthdayList.length == 0) {
				noneFound.hidden = false;
				resulTable.hidden = true;
				let date = new Date();
				let today = new Date(date.getTime() + maxDaysUntilNextBirthday *24*60*60*1000);
				let noBirthdaysFoundMessage = cardbookRepository.extension.localeData.localizeMessage("noBirthdaysFoundMessage", [cardbookRepository.cardbookDates.convertDateToDateString(today, 'YYYYMMDD')]);
				noneFound.textContent = noBirthdaysFoundMessage;
			} else {
				noneFound.hidden = true;
				resulTable.hidden = false;
				let headers = [ "daysLeftColumn", "nameColumn", "ageColumn", "dateOfBirthColumn" ];
				let data = cardbookBirthdaysUtils.lBirthdayList.map(x => [ x[0], x[1], x[2], x[3] ]);
				let dataParameters = [];
				let rowParameters = {};
				let sortFunction = wdw_birthdayList.clickToSort;
				rowParameters.values = cardbookBirthdaysUtils.lBirthdayList.map(x => "SEARCH color_" + x[6]);
				cardbookElementTools.addTreeTable("birthdayListTable", headers, data, dataParameters, rowParameters, sortFunction);
			}
			document.title = cardbookRepository.extension.localeData.localizeMessage("birthdaysListWindowLabel", [cardbookBirthdaysUtils.lBirthdayList.length.toString()]);
			wdw_birthdayList.buttonShowing();
		},
	
		displaySyncList: function() {
			Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/birthdays/wdw_birthdaySync.xhtml", "", cardbookRepository.windowParams);
		},

		buttonShowing: function () {
			let btnSend = document.getElementById("sendEmailLabel");
			let currentIndex = wdw_birthdayList.getTableCurrentIndex("birthdayListTable");
			if (currentIndex) {
				btnSend.disabled = false;
			} else {
				btnSend.disabled = true;
			}
			let btnSync = document.getElementById("syncLightningMenuItemLabel");
			if (cardbookBirthdaysUtils.lBirthdayList.length == 0) {
				btnSync.disabled = true;
			} else {
				btnSync.disabled = false;
			}
		},

		sendEmail: async function () {
			let table = document.getElementById("birthdayListTable");
			let selectedRows = table.querySelectorAll("tr[rowSelected='true']");
			for (let row of selectedRows) {
				let index =  wdw_birthdayList.getIndexFromName(row.id);
				let email = cardbookBirthdaysUtils.lBirthdayList[index][5];
				let name = cardbookBirthdaysUtils.lBirthdayList[index][1];
				if (email == "") {
					let errorTitle = cardbookRepository.extension.localeData.localizeMessage("warningTitle");
					let errorMsg = cardbookRepository.extension.localeData.localizeMessage("noEmailFoundMessage", [name]);
					Services.prompt.alert(null, errorTitle, errorMsg);
				} else {
					await notifyTools.notifyBackground({query: "cardbook.emailCards", compFields: [{field: "to", value: email}]});
				}
			}
		},
	
		do_close: function () {
			close();
		}
	};
};

document.addEventListener("DOMContentLoaded", wdw_birthdayList.displayAllBirthdays);
