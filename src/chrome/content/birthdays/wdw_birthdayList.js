import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
import { cardbookHTMLUtils } from "../cardbookHTMLUtils.mjs";
import { cardbookNewPreferences } from "../preferences/cardbookNewPreferences.mjs";
import { cardbookHTMLDates } from "../cardbookHTMLDates.mjs";
import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";

if ("undefined" == typeof(wdw_birthdayList)) {
	var wdw_birthdayList = {

        birthdayList: [],
        birthdayAccountList: [],
		
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
			if (aEvent.target.tagName.toLowerCase() == "td") {
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

		sortTable: async function (aTableName) {
			let table = document.getElementById(aTableName);
			let order = table.getAttribute("data-sort-order") == "ascending" ? 1 : -1;
			let columnName = table.getAttribute("data-sort-column");
			
			let columnArray = wdw_birthdayList.getTableMapArray(columnName);
			let columnType = wdw_birthdayList.getTableMapType(columnName);
			let data = wdw_birthdayList.birthdayList;
	
			if (data && data.length) {
				if (columnType == "number") {
					cardbookHTMLUtils.sortMultipleArrayByNumber(data, columnArray, order);
				} else {
					cardbookHTMLUtils.sortMultipleArrayByString(data, columnArray, order);
				}
			}
			await wdw_birthdayList.displayBirthdays();
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
				await wdw_birthdayList.sortTable(table.id);
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

		loadCssRules: async function () {
			let myStyleSheetRuleName = "cardbookBirthday.css";
			for (let styleSheet of document.styleSheets) {
				if (styleSheet.href.endsWith(myStyleSheetRuleName)) {
                    cardbookHTMLUtils.deleteCssAllRules(styleSheet);
                    cardbookHTMLUtils.createMarkerRule(styleSheet, myStyleSheetRuleName);
                    let createSearchRules = 0;
                    for (let dirPrefId in wdw_birthdayList.birthdayAccountList) {
                        createSearchRules++;
                    }
                    let useColor = await cardbookHTMLUtils.getPrefValue("useColor");
                    for (let dirPrefId in wdw_birthdayList.birthdayAccountList) {
                        let color = await cardbookNewPreferences.getColor(dirPrefId);
                        if (createSearchRules > 1) {
                            cardbookHTMLUtils.createCssCardRulesForTable(styleSheet, dirPrefId, color, useColor);
                        }
                    }
                    return;
                }
			}
		},

		displayAllBirthdays: async function () {
			document.getElementById('syncLightningMenuItemLabel').disabled = false;
			let maxDaysUntilNextBirthday = await cardbookHTMLUtils.getPrefValue("numberOfDaysForSearching");
            [ wdw_birthdayList.birthdayList, wdw_birthdayList.birthdayAccountList ] = await messenger.runtime.sendMessage({query: "cardbook.getBirthdays", days: maxDaysUntilNextBirthday});
			await wdw_birthdayList.sortTable("birthdayListTable");
		},

		displayBirthdays: async function () {
			await wdw_birthdayList.loadCssRules();
			let noneFound = document.getElementById("noneFound");
			let resulTable = document.getElementById("birthdayListTable");
			let maxDaysUntilNextBirthday = await cardbookHTMLUtils.getPrefValue("numberOfDaysForSearching");
			maxDaysUntilNextBirthday = (maxDaysUntilNextBirthday > 365) ? 365 : maxDaysUntilNextBirthday;

			// if there are no birthdays in the configured timespan
			if (wdw_birthdayList.birthdayList.length == 0) {
				noneFound.hidden = false;
				resulTable.hidden = true;
				let date = new Date();
				let today = new Date(date.getTime() + maxDaysUntilNextBirthday *24*60*60*1000);
				let dateString = cardbookHTMLDates.convertDateToDateString(today, "4.0");
				let longDateString = cardbookHTMLDates.getFormattedDateForDateString(dateString, "4.0", "0");
				let noBirthdaysFoundMessage = messenger.i18n.getMessage("noBirthdaysFoundMessage", [longDateString]);
				noneFound.textContent = noBirthdaysFoundMessage;
			} else {
				noneFound.hidden = true;
				resulTable.hidden = false;
                let headers = [ "daysLeftColumn", "nameColumn", "ageColumn", "dateOfBirthColumn" ];
				let data = wdw_birthdayList.birthdayList.map(x => [ x[0], x[1], x[2], x[3] ]);
				let dataParameters = [];
				let rowParameters = {};
                let tableParameters = { "events": [ [ "click", wdw_birthdayList.clickTree ],
                                                    [ "dblclick", wdw_birthdayList.sendEmail ] ] };
				let sortFunction = wdw_birthdayList.clickToSort;
				rowParameters.values = wdw_birthdayList.birthdayList.map(x => "SEARCH color_" + x[6]);
				cardbookHTMLTools.addTreeTable("birthdayListTable", headers, data, dataParameters, rowParameters, tableParameters, sortFunction);
			}
			document.title = messenger.i18n.getMessage("birthdaysListWindowLabel", [wdw_birthdayList.birthdayList.length.toString()]);
			wdw_birthdayList.buttonShowing();
		},
	
		displaySyncList: async function() {
			let url = "chrome/content/birthdays/wdw_birthdaySync.html";
			let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
															url: url,
															type: "popup"});
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
			if (wdw_birthdayList.birthdayList.length == 0) {
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
				let email = wdw_birthdayList.birthdayList[index][5];
				let name = wdw_birthdayList.birthdayList[index][1];
				if (email == "") {
					let errorTitle = messenger.i18n.getMessage("warningTitle");
					let errorMsg = messenger.i18n.getMessage("noEmailFoundMessage", [name]);
                    let response = await messenger.runtime.sendMessage({query: "cardbook.promptAlert", window: window, title: errorTitle, message: errorMsg});
				} else {
					await messenger.runtime.sendMessage({query: "cardbook.emailCards", compFields: [{field: "to", value: email}]});
				}
			}
		},

        load: async function () {
            i18n.updateDocument();
            cardbookHTMLRichContext.loadRichContext();

           	// button
            document.getElementById("sendEmailLabel").addEventListener("click", event => wdw_birthdayList.sendEmail());
            document.getElementById("syncLightningMenuItemLabel").addEventListener("click", event => wdw_birthdayList.displaySyncList());
            document.getElementById("closeEditionLabel").addEventListener("click", event => wdw_birthdayList.do_close());

			await wdw_birthdayList.displayAllBirthdays();
		},

		do_close: function () {
			cardbookHTMLRichContext.closeWindow();
		}
	};
};

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

wdw_birthdayList.load();
