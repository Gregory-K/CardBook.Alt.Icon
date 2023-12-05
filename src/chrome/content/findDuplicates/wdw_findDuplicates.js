import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
import { cardbookHTMLUtils } from "../cardbookHTMLUtils.mjs";
import { cardbookNewPreferences } from "../preferences/cardbookNewPreferences.mjs";

if ("undefined" == typeof(wdw_findDuplicates)) {

	var wdw_findDuplicates = {

        dirPrefId: "",
		winId: 0,
		displayId: 0,
		cardbookDuplicateIndex: {},
		gResults: [],
		gResultsDirPrefId: [],
		gHideForgotten: true,
		resfreshTime: 200,
		toDo: 0,
		rowDone: 0,
		cardsLoaded: false,

		createCssTextBoxRules: function (aStyleSheet, aDirPrefId, aColor, aColorProperty) {
			let ruleString = ".cardbookFindDuplicatesClass input[findDuplicates=color_" + aDirPrefId + "] {-moz-appearance: none !important; " + aColorProperty + ": " + aColor + " !important; border: 1px !important;}";
			let ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
		},

		loadCssRules: async function () {
			let myStyleSheetRuleName = "cardbookFindDuplicates.css";
			for (let styleSheet of document.styleSheets) {
				if (styleSheet.href.endsWith(myStyleSheetRuleName)) {
					cardbookHTMLUtils.deleteCssAllRules(styleSheet);
					cardbookHTMLUtils.createMarkerRule(styleSheet, myStyleSheetRuleName);
					for (let dirPrefId of wdw_findDuplicates.gResultsDirPrefId) {
						let color = await cardbookNewPreferences.getColor(dirPrefId);
						let useColor = await cardbookHTMLUtils.getPrefValue("useColor");
						let oppositeColor = cardbookHTMLUtils.getTextColorFromBackgroundColor(color);
						if (useColor == "text") {
							wdw_findDuplicates.createCssTextBoxRules(styleSheet, dirPrefId, color, "color");
							wdw_findDuplicates.createCssTextBoxRules(styleSheet, dirPrefId, oppositeColor, "background-color");
						} else if (useColor == "background") {
							wdw_findDuplicates.createCssTextBoxRules(styleSheet, dirPrefId, color, "background-color");
							wdw_findDuplicates.createCssTextBoxRules(styleSheet, dirPrefId, oppositeColor, "color");
						}
					}
					return;
				}
			}
		},

		prepareVariables: async function () {
			let win = await messenger.windows.getCurrent();
			wdw_findDuplicates.winId = win.id;
			wdw_findDuplicates.displayId++;
			await messenger.runtime.sendMessage({query: "cardbook.processData.setDisplayId", winId: wdw_findDuplicates.winId, displayId: wdw_findDuplicates.displayId});
			wdw_findDuplicates.rowDone = 0;
			wdw_findDuplicates.toDo = 0;
			wdw_findDuplicates.cardsLoaded = false;
			wdw_findDuplicates.gResults = [];
			wdw_findDuplicates.gResultsDirPrefId = [];
        },

		compareCards: async function () {
            cardbookHTMLTools.deleteTableRows('fieldsTable');
			wdw_findDuplicates.waitForDisplay();
			await wdw_findDuplicates.prepareVariables();

			let buttonState = document.getElementById('moreOrLessLabel').getAttribute('state');
			await messenger.runtime.sendMessage({query: "cardbook.findDuplicates.getCards", dirPrefId: wdw_findDuplicates.dirPrefId, state: buttonState, winId: wdw_findDuplicates.winId, displayId: wdw_findDuplicates.displayId});
		},

		mergeAll: async function () {
			let nodes = document.getElementById("fieldsTable").querySelectorAll("tr:not(.hidden)");
			wdw_findDuplicates.toDo = nodes.length;
			if (wdw_findDuplicates.toDo) {
				wdw_findDuplicates.showProgressBar();
				wdw_findDuplicates.rowDone = 0;
				let now = cardbookHTMLUtils.getTime();
				let sourceCat = now + "_" + messenger.i18n.getMessage("sourceCategoryLabel")
				let targetCat = now + "_" + messenger.i18n.getMessage("targetCategoryLabel")
				let actionId = await messenger.runtime.sendMessage({query: "cardbook.startAction", topic: "cardsMerged"});
				var i = 0;
				while (document.getElementById(i + 'Row')) {
					let row = document.getElementById(i + 'Row');
					if (row.getAttribute('delete') == 'true') {
						i++;
						continue;
					} else if (wdw_findDuplicates.gHideForgotten && row.getAttribute('forget') == 'true') {
						i++;
						continue;
					}
					await messenger.runtime.sendMessage({query: "cardbook.findDuplicates.mergeOne", record: wdw_findDuplicates.gResults[i], actionId: actionId, sourceCat: sourceCat, targetCat: targetCat});
					wdw_findDuplicates.rowDone++;
					let value = Math.round(wdw_findDuplicates.rowDone / wdw_findDuplicates.toDo * 100);
					document.getElementById("data-progressmeter").value = value;
					i++;
				}
				await messenger.runtime.sendMessage({query: "cardbook.endAction", actionId: actionId});
			}
			wdw_findDuplicates.cancel();
		},

		addTableRow: function (aParent, aName, aHidden) {
			let aTableRow = cardbookHTMLTools.addHTMLTR(aParent, `${aName}Row`, {"forget": aHidden.toString()});
			if (wdw_findDuplicates.gHideForgotten && aTableRow.getAttribute('forget') == 'true') {
				aTableRow.classList.add("hidden");
			} else {
				aTableRow.classList.remove("hidden");
			}
			return aTableRow
		},

		createMergeButton: function (aRow, aName, aLabel) {
			let aButton = cardbookHTMLTools.addHTMLBUTTON(aRow, `${aName}Merge`, aLabel);

			async function fireButton(event) {
				let lineId = this.id.replace(/Merge$/, "");
				let listOfSelectedCard = wdw_findDuplicates.gResults[lineId];
				let ids = listOfSelectedCard.map(card => card.cbid);
				let mode = listOfSelectedCard.filter(card => card.isAList).length > 0 ? "LIST" : "CONTACT";
				let mergeId = await messenger.runtime.sendMessage({query: "cardbook.getUUID"});
				let url = "chrome/content/mergeCards/wdw_mergeCards.html";
				let params = new URLSearchParams();
				params.set("hideCreate", false);
				params.set("source", "DUPLICATE");
				params.set("mode", mode);
				params.set("ids", ids.join(","));
				params.set("duplicateLineId", lineId);
				params.set("duplicateWinId", wdw_findDuplicates.winId);
				params.set("duplicateDisplayId", wdw_findDuplicates.displayId);
				params.set("mergeId", mergeId);
				let win = await messenger.runtime.sendMessage({query: "cardbook.openWindow",
														url: `${url}?${params.toString()}`,
														type: "popup"});
			};
			aButton.addEventListener("click", fireButton, false);
		},

		finishMergeAction: function (aId) {
			document.getElementById(aId + 'Row').classList.add("hidden");
			document.getElementById(aId + 'Row').setAttribute('delete', 'true');
			wdw_findDuplicates.finishAction();
		},

		createForgetButton: function (aRow, aName, aLabel) {
			let aButton = cardbookHTMLTools.addHTMLBUTTON(aRow, `${aName}Forget`, aLabel);

			async function fireButton(event) {
				let lineId = this.id.replace(/Forget$/, "");
				let uids = Array.from(wdw_findDuplicates.gResults[lineId]).map(card => card.uid);
				uids = cardbookHTMLUtils.arrayUnique(uids);
				await messenger.runtime.sendMessage({query: "cardbook.findDuplicates.addDuplidateIndex", uids: uids});
				wdw_findDuplicates.finishForgetAction(lineId);
			};
			aButton.addEventListener("click", fireButton, false);
		},

		finishForgetAction: function (aId) {
			document.getElementById(aId + 'Row').setAttribute('forget', 'true');
			if (wdw_findDuplicates.gHideForgotten) {
				document.getElementById(aId + 'Row').classList.add("hidden");
			}
			document.getElementById(aId + 'Forget').classList.add("hidden");
			wdw_findDuplicates.finishAction();
		},

		createDeleteButton: function (aRow, aName, aLabel) {
			let aButton = cardbookHTMLTools.addHTMLBUTTON(aRow, `${aName}Delete`, aLabel);

			async function fireButton(event) {
				let lineId = this.id.replace(/Delete$/, "");
				await messenger.runtime.sendMessage({query: "cardbook.findDuplicates.deleteCardsAndValidate", winId: wdw_findDuplicates.winId, displayId: wdw_findDuplicates.displayId, lineId: lineId, cards: wdw_findDuplicates.gResults[lineId]});
			};
			aButton.addEventListener("click", fireButton, false);
		},

		finishDeleteAction: function (aId) {
			// wdw_findDuplicates.gResults.splice(aId, 1);
			document.getElementById(aId + 'Row').classList.add("hidden");
			document.getElementById(aId + 'Row').setAttribute('delete', 'true');
			wdw_findDuplicates.finishAction();
		},

		finishAction: function () {
			wdw_findDuplicates.showLabels();
		},

		displayResults: function () {
			let table = document.getElementById('fieldsTable');
			let buttonMergeLabel = messenger.i18n.getMessage("mergeCardsLabel");
			let buttonForgetLabel = messenger.i18n.getMessage("forgetCardsLabel");
			let buttonDeleteLabel = messenger.i18n.getMessage("deleteCardsLabel");

			for (let i = 0; i < wdw_findDuplicates.gResults.length; i++) {
				let shouldBeForgotten = false;
				for (let j = 0; j < wdw_findDuplicates.gResults[i].length-1; j++) {
					let myCard = wdw_findDuplicates.gResults[i][j];
					for (let k = j+1; k < wdw_findDuplicates.gResults[i].length; k++) {
						let otherCard = wdw_findDuplicates.gResults[i][k];
						if ((wdw_findDuplicates.cardbookDuplicateIndex[myCard.uid] && wdw_findDuplicates.cardbookDuplicateIndex[myCard.uid].includes(otherCard.uid)) ||
							(wdw_findDuplicates.cardbookDuplicateIndex[otherCard.uid] && wdw_findDuplicates.cardbookDuplicateIndex[otherCard.uid].includes(myCard.uid))) {
							shouldBeForgotten = true;
							break;
						}
					}
					if (shouldBeForgotten) {
						break;
					}
				}
				let row = wdw_findDuplicates.addTableRow(table, i, shouldBeForgotten);
				let mergeData = cardbookHTMLTools.addHTMLTD(row, i + '.2');
				wdw_findDuplicates.createMergeButton(mergeData, i, buttonMergeLabel);
				if (!shouldBeForgotten) {
					let forgetData = cardbookHTMLTools.addHTMLTD(row, i + '.3');
					wdw_findDuplicates.createForgetButton(forgetData, i, buttonForgetLabel);
				}
				let deleteData = cardbookHTMLTools.addHTMLTD(row, i + '.4');
				wdw_findDuplicates.createDeleteButton(deleteData, i, buttonDeleteLabel);
				for (let j = 0; j < wdw_findDuplicates.gResults[i].length; j++) {
					let myCard = wdw_findDuplicates.gResults[i][j];
					let textboxData = cardbookHTMLTools.addHTMLTD(row, i + '.' + j + '.1');
					let textbox = cardbookHTMLTools.addHTMLINPUT(textboxData, i+"::"+j, myCard.fn, {"findDuplicates": `color_${myCard.dirPrefId}`});
				}
			}
			wdw_findDuplicates.cardsLoaded = true;
		},

		showLabels: function () {
			let nodes = document.getElementById("fieldsTable").querySelectorAll("tr:not(.hidden)");
			if (nodes.length == 0) {
				document.getElementById('mergeAllLabel').disabled = true;
				document.getElementById('noContactsFoundDesc').classList.remove("hidden");
				document.getElementById('noContactsFoundDesc').textContent = messenger.i18n.getMessage("noContactsDuplicated");
				document.getElementById('fieldsTable').classList.add("hidden");
				document.getElementById('numberLinesFoundDesc').classList.add("hidden");
			} else {
				document.getElementById('mergeAllLabel').disabled = false;
				document.getElementById('noContactsFoundDesc').classList.add("hidden");
				document.getElementById('fieldsTable').classList.remove("hidden");
				document.getElementById('numberLinesFoundDesc').textContent = messenger.i18n.getMessage("numberLines", [nodes.length]);
				document.getElementById('numberLinesFoundDesc').classList.remove("hidden");
			}
			if (wdw_findDuplicates.gHideForgotten) {
				document.getElementById('hideOrShowForgottenLabel').textContent = messenger.i18n.getMessage("showForgottenLabel");
			} else {
				document.getElementById('hideOrShowForgottenLabel').textContent = messenger.i18n.getMessage("hideForgottenLabel");
			}
		},

		hideOrShowForgotten: function () {
			wdw_findDuplicates.gHideForgotten = !wdw_findDuplicates.gHideForgotten;
			var i = 0;
			while (true) {
				if (document.getElementById(i + 'Row')) {
					var myRow = document.getElementById(i + 'Row');
					if (myRow.getAttribute('delete') == 'true') {
						myRow.classList.add("hidden")
					} else if (wdw_findDuplicates.gHideForgotten && myRow.getAttribute('forget') == 'true') {
						myRow.classList.add("hidden")
					} else {
						myRow.classList.remove("hidden")
					}
					i++;
				} else {
					break;
				}
			}
			wdw_findDuplicates.finishAction();
		},

		moreOrLess: function () {
			let button = document.getElementById('moreOrLessLabel');
			let buttonState = button.getAttribute('state');
			let newState = (buttonState == "less") ? "more" : "less";
			button.textContent = messenger.i18n.getMessage(buttonState + "EditionLabel");
			button.setAttribute('state' , newState);
			wdw_findDuplicates.compareCards();
		},

        showProgressBar: function () {
			document.getElementById('hideOrShowForgottenLabel').disabled = true;
			document.getElementById('moreOrLessLabel').disabled = true;
			document.getElementById('data-progressmeter').classList.remove("hidden");
			document.getElementById('fieldsTable').classList.add("hidden");
			document.getElementById('numberLinesFoundDesc').classList.add("hidden");
			document.getElementById('noContactsFoundDesc').classList.add("hidden");
		},

        waitForDisplay: function () {
			wdw_findDuplicates.showProgressBar();
			let lTimerDisplay = setInterval( async function() {
				let todo = wdw_findDuplicates.toDo;
				let done = wdw_findDuplicates.rowDone;
				if (wdw_findDuplicates.cardsLoaded) {
					wdw_findDuplicates.endWaitForDisplay();
					clearInterval(lTimerDisplay);
				} else {
					let value = Math.round(done / todo * 100);
					document.getElementById("data-progressmeter").value = value;
				}
			}, wdw_findDuplicates.resfreshTime);
		},

        endWaitForDisplay: function () {
			document.getElementById('hideOrShowForgottenLabel').disabled = false;
			document.getElementById('moreOrLessLabel').disabled = false;
			document.getElementById('data-progressmeter').classList.add("hidden");
			document.getElementById('fieldsTable').classList.remove("hidden");
			wdw_findDuplicates.finishAction();
		},

		preload: async function () {
			wdw_findDuplicates.cardbookDuplicateIndex = await messenger.runtime.sendMessage({query: "cardbook.findDuplicates.getDuplidateIndex"});
			await wdw_findDuplicates.load();
		},

		load: async function () {
			let urlParams = new URLSearchParams(window.location.search);
            wdw_findDuplicates.dirPrefId = urlParams.get("dirPrefId");
        
			i18n.updateDocument();
			cardbookHTMLRichContext.loadRichContext();

			let name = "";
			if (wdw_findDuplicates.dirPrefId) {
				name = await cardbookNewPreferences.getName(wdw_findDuplicates.dirPrefId);
			} else {
				name = messenger.i18n.getMessage("allAddressBooks");
			}
			document.title = messenger.i18n.getMessage("wdw_findDuplicatesTitle", [name]);

			let button = document.getElementById('moreOrLessLabel');
			let buttonState = button.getAttribute('state');
			let newState = (buttonState == "less") ? "more" : "less";
			button.textContent = messenger.i18n.getMessage(newState + "EditionLabel");

			// button
        	document.getElementById("mergeAllLabel").addEventListener("click", event => wdw_findDuplicates.mergeAll());
        	document.getElementById("hideOrShowForgottenLabel").addEventListener("click", event => wdw_findDuplicates.hideOrShowForgotten());
        	document.getElementById("moreOrLessLabel").addEventListener("click", event => wdw_findDuplicates.moreOrLess());
        	document.getElementById("cancelEditionLabel").addEventListener("click", event => wdw_findDuplicates.cancel());

			wdw_findDuplicates.compareCards();
		},

		cancel: function () {
			cardbookHTMLRichContext.closeWindow();
		}
	};
};

messenger.runtime.onMessage.addListener( (info) => {
	switch (info.query) {
		case "cardbook.findDuplicates.ABs":
			if (wdw_findDuplicates.winId == info.winId && wdw_findDuplicates.displayId == info.displayId) {
				wdw_findDuplicates.gResultsDirPrefId = info.ABids;
				if (wdw_findDuplicates.gResultsDirPrefId.length == 1) {
					document.getElementById('mergeAllLabel').removeAttribute("disabled");
				}
				// not await
				wdw_findDuplicates.loadCssRules();
			}
			break;
		case "cardbook.findDuplicates.cards":
			if (wdw_findDuplicates.winId == info.winId && wdw_findDuplicates.displayId == info.displayId) {
				wdw_findDuplicates.gResults = info.cards;
				wdw_findDuplicates.displayResults();
			}
			break;
		case "cardbook.processData.toDo":
			if (wdw_findDuplicates.winId == info.winId && wdw_findDuplicates.displayId == info.displayId) {
				wdw_findDuplicates.toDo = info.toDo;
			}
			break;
		case "cardbook.processData.rowDone":
			if (wdw_findDuplicates.winId == info.winId && wdw_findDuplicates.displayId == info.displayId) {
				wdw_findDuplicates.rowDone = info.rowDone;
			}
			break;
		case "cardbook.findDuplicates.finishMergeAction":
			if (wdw_findDuplicates.winId == info.duplicateWinId && wdw_findDuplicates.duplicateDisplayId == info.displayId) {
				wdw_findDuplicates.finishMergeAction(info.duplicateLineId);
			}
			break;
		case "cardbook.findDuplicates.finishDeleteAction":
			if (wdw_findDuplicates.winId == info.winId && wdw_findDuplicates.displayId == info.displayId) {
				wdw_findDuplicates.finishDeleteAction(info.lineId);
			}
			break;
		}
	}
);

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

await wdw_findDuplicates.preload();