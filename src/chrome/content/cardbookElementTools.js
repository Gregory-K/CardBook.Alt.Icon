if ("undefined" == typeof(cardbookElementTools)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { FormHistory } = ChromeUtils.import("resource://gre/modules/FormHistory.jsm");
	var { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var cardbookElementTools = {
		
		deleteRowsAllTypes: function () {
			cardbookElementTools.deleteRows('modernRows');
			cardbookElementTools.deleteRows('classicalRows');
		},

		deleteRowsType: function (aType) {
			cardbookElementTools.deleteRows(aType + 'Groupbox');
		},

		deleteRows: function (aObjectName) {
			// for anonid this does not work
			try {
				var aListRows = document.getElementById(aObjectName);
				while (aListRows.hasChildNodes()) {
					aListRows.lastChild.remove();
				}
			} catch (e) {}
		},

		deleteTreecols: function (aTreecol) {
			try {
				for (let i = aTreecol.childNodes.length -1; i >= 0; i--) {
					let child = aTreecol.childNodes[i];
					if (child.tagName != "treecolpicker") {
						aTreecol.removeChild(child);
					}
				}
			} catch (e) {}
		},

		deleteTableRows: function (aTableName, aTableHeaderRowName) {
			let table = document.getElementById(aTableName);
			let toDelete = [];
			for (let row of table.rows) {
				if (aTableHeaderRowName) {
					if (row.id != aTableHeaderRowName) {
						toDelete.push(row);
					}
				} else {
					toDelete.push(row);
				}
			}
			for (let row of toDelete) {
				let oldChild = table.removeChild(row);
			}
		},

		addCategoriesRow: function (aParent, aCategories) {
			cardbookElementTools.deleteRows(aParent.id);

			for (category of aCategories) {
				var aBox = document.createXULElement('box');
				aParent.appendChild(aBox);
				aBox.setAttribute('flex', '1');
				var aLabel = document.createXULElement('label');
				aBox.appendChild(aLabel);
				aLabel.setAttribute('id', category + 'Label');
				aLabel.setAttribute('value', category);
				aLabel.setAttribute('class', 'tagvalue cardbookCategoryClass');
				aLabel.setAttribute('type', 'category_' + cardbookRepository.cardbookUtils.formatCategoryForCss(category));
			}
		},

		addCaption: function (aType, aParent) {
			let aCaption = document.createXULElement('label');
			aParent.appendChild(aCaption);
			aCaption.setAttribute('id', aType + '_caption');
			aCaption.setAttribute('value', cardbookRepository.extension.localeData.localizeMessage(aType + "GroupboxLabel"));
			aCaption.setAttribute('class', 'header');
		},
		
		addCaptionWithLabel: function (aType, aParent, aValue) {
			let aCaption = document.createXULElement('label');
			aParent.appendChild(aCaption);
			aCaption.setAttribute('id', aType + '_caption');
			aCaption.setAttribute('value', aValue);
			aCaption.setAttribute('class', 'header');
		},
		
		addTreeSplitter: function (aParent, aParameters) {
			var aSplitter = document.createXULElement('splitter');
			aParent.appendChild(aSplitter);
			aSplitter.setAttribute('class', 'tree-splitter');

			for (var prop in aParameters) {
				aSplitter.setAttribute(prop, aParameters[prop]);
			}
		},
		
		addTreecol: function (aParent, aId, aLabel, aParameters) {
			var aTreecol = document.createXULElement('treecol');
			aParent.appendChild(aTreecol);
			aTreecol.setAttribute('id', aId);
			aTreecol.setAttribute('label', aLabel);

			for (var prop in aParameters) {
				aTreecol.setAttribute(prop, aParameters[prop]);
			}
		},

		addHBox: function (aType, aIndex, aParent, aParameters) {
			var aHBox = document.createXULElement('hbox');
			aParent.appendChild(aHBox);
			aHBox.setAttribute('id', aType + '_' + aIndex + '_hbox');
			aHBox.setAttribute('flex', '1');
			aHBox.setAttribute('align', 'center');

			for (var prop in aParameters) {
				aHBox.setAttribute(prop, aParameters[prop]);
			}
			return aHBox;
		},
		
		addVBox: function (aParent, aId, aParameters) {
			var aVBox = document.createXULElement('vbox');
			aParent.appendChild(aVBox);
			aVBox.setAttribute('id', aId);

			for (var prop in aParameters) {
				aVBox.setAttribute(prop, aParameters[prop]);
			}
			return aVBox;
		},
		
		addHTMLElement: function (aElement, aParent, aId, aParameters) {
			let element = document.createElementNS("http://www.w3.org/1999/xhtml", `html:${aElement}`);
			aParent.appendChild(element);
			if (aId) {
				element.setAttribute('id', aId);
			}
			for (let prop in aParameters) {
				element.setAttribute(prop, aParameters[prop]);
			}
			return element;
		},

		addHTMLTABLE: function (aParent, aId, aParameters) {
			let table = cardbookElementTools.addHTMLElement("table", aParent, aId, aParameters);
			return table;
		},

		addHTMLTR: function (aParent, aId, aParameters) {
			let tr = cardbookElementTools.addHTMLElement("tr", aParent, aId, aParameters);
			return tr;
		},

		addHTMLTD: function (aParent, aId, aParameters) {
			let td = cardbookElementTools.addHTMLElement("td", aParent, aId, aParameters);
			return td;
		},

		addHTMLTHEAD: function (aParent, aId, aParameters) {
			let thead = cardbookElementTools.addHTMLElement("thead", aParent, aId, aParameters);
			return thead;
		},

		addHTMLTBODY: function (aParent, aId, aParameters) {
			let tbody = cardbookElementTools.addHTMLElement("tbody", aParent, aId, aParameters);
			return tbody;
		},

		addHTMLTH: function (aParent, aId, aParameters) {
			let th = cardbookElementTools.addHTMLElement("th", aParent, aId, aParameters);
			return th;
		},

		addHTMLIMAGE: function (aParent, aId, aParameters) {
			let image = cardbookElementTools.addHTMLElement("img", aParent, aId, aParameters);
			return image;
		},

		addTreeTable: function (aId, aHeaders, aData, aDataParameters, aRowParameters, aSortFunction, aDataId) {
			let table = document.getElementById(aId);
			let sortColumn = table.getAttribute("data-sort-column");
			let orderColumn = table.getAttribute("data-sort-order");

			let selectedRows = table.querySelectorAll("tr[rowSelected='true']");
			let selectedValues = [];
			if (typeof aDataId !== 'undefined') {
				selectedValues = Array.from(selectedRows, row => row.cells[aDataId].textContent);
			} else {
				selectedValues = Array.from(selectedRows, row => Array.from(row.cells, cell => cell.textContent).join());
			}
			cardbookElementTools.deleteRows(aId);

			if (aHeaders.length) {
				let thead = cardbookElementTools.addHTMLTHEAD(table, `${aId}_thead`);
				let tr = cardbookElementTools.addHTMLTR(thead, `${aId}_thead_tr`);
				for (let i = 0; i < aHeaders.length; i++) {
					let th = cardbookElementTools.addHTMLTH(tr, `${aId}_thead_th_${i}`);
					th.textContent = cardbookRepository.extension.localeData.localizeMessage(`${aHeaders[i]}Label`);
					th.setAttribute("data-value", aHeaders[i]);
					try {
						let tooltip = cardbookRepository.extension.localeData.localizeMessage(`${aHeaders[i]}Tooltip`);
						th.setAttribute("title", tooltip);
					} catch (e) {}
					if (aHeaders[i] == sortColumn) {
						let sortImg;
						if (orderColumn == "ascending" ) {
							sortImg = cardbookElementTools.addHTMLIMAGE(th, `${aId}_thead_th_${i}_image`, { "src": "chrome://cardbook/content/skin/small-icons/arrow-down.svg" } );
						} else {
							sortImg = cardbookElementTools.addHTMLIMAGE(th, `${aId}_thead_th_${i}_image`, { "src": "chrome://cardbook/content/skin/small-icons/arrow-up.svg" } );
						}
						if (aSortFunction) {
							sortImg.addEventListener("click", aSortFunction, false);
						}
					}
				}
				if (aSortFunction) {
					tr.addEventListener("click", aSortFunction, false);
				}
			}
			if (aData.length) {
				let tbody = cardbookElementTools.addHTMLTBODY(table, `${aId}_tbody`);
				for (let i = 0; i < aData.length; i++) {
					let tr = cardbookElementTools.addHTMLTR(tbody, `${aId}_thead_tr_${i}`, {"tabindex": "0"});
					let trValue = "";
					if (typeof aDataId !== 'undefined') {
						trValue = aData[i][aDataId];
					} else {
						trValue = aData[i].join();
					}
					for (let j = 0; j < aData[i].length; j++) {
						let td = cardbookElementTools.addHTMLTD(tr, `${aId}_thead_td_${i}_${j}`);
						let last = td;
						if (typeof aData[i][j] === "boolean") {
							let checkbox = cardbookElementTools.addHTMLElement("input", td, `${aId}_thead_td_${i}_${j}_checkbox`, {"type": "checkbox"})
							checkbox.checked = aData[i][j];
							last = checkbox;
						} else {
							td.textContent = aData[i][j];
						}
						if (aDataParameters && aDataParameters[j] && aDataParameters[j].events) {
							for (let event of aDataParameters[j].events) {
								last.addEventListener(event[0], event[1], false);
							}
						}
					}
					if (selectedValues.includes(trValue)) {
						tr.setAttribute("rowSelected", "true");
					}
					if (aRowParameters && aRowParameters.titles && aRowParameters.titles[i]) {
						tr.setAttribute("title", aRowParameters.titles[i]);
					}
					if (aRowParameters && aRowParameters.values && aRowParameters.values[i]) {
						tr.setAttribute("data-value", aRowParameters.values[i]);
					}
				}
			}
			return table;
		},

		addLabel: function (aOrigBox, aId, aValue, aControl, aParameters) {
			var aLabel = document.createXULElement('label');
			aOrigBox.appendChild(aLabel);
			aLabel.setAttribute('id', aId);
			aLabel.setAttribute('value', aValue);
			aLabel.setAttribute('control', aControl);
			for (var prop in aParameters) {
				aLabel.setAttribute(prop, aParameters[prop]);
			}
			return aLabel;
		},

		addKeyTextbox: function (aParent, aId, aValue, aParameters) {
			var aKeyTextBox = cardbookElementTools.addHTMLINPUT(aParent, aId, aValue, aParameters);
			aKeyTextBox.addEventListener("input", cardbookElementTools.checkEditButton, false);
			return aKeyTextBox;
		},

		addHTMLINPUT: function (aParent, aId, aValue, aParameters) {
			let aTextbox = cardbookElementTools.addHTMLElement("input", aParent, aId, aParameters)
			aTextbox.setAttribute('value', aValue);
			return aTextbox;
		},

		addDatepicker: function (aParent, aId, aValue, aParameters) {
			var aDatepicker = document.createXULElement('cardbookdatepicker');
			aParent.appendChild(aDatepicker);
			aDatepicker.setAttribute('id', aId);
			aDatepicker.setAttribute('value', aValue);

			for (var prop in aParameters) {
				aDatepicker.setAttribute(prop, aParameters[prop]);
			}
			return aDatepicker;
		},

		addKeyTextarea: function (aParent, aId, aValue, aParameters, aIndex) {
			var aKeyTextArea = cardbookElementTools.addHTMLTEXTAREA(aParent, aId, aValue, aParameters);
			aKeyTextArea.addEventListener("input", cardbookElementTools.checkEditButton, false);
			return aKeyTextArea;
		},

		addHTMLTEXTAREA: function (aParent, aId, aValue, aParameters) {
			let aTextarea = cardbookElementTools.addHTMLElement("textarea", aParent, aId, aParameters)
			aTextarea.value = aValue;
			return aTextarea;
		},

		loadCountries: function (aPopup, aMenu, aDefaultValue, aAddEmptyCountries, aUseCodeValues) {
			var myResult = [];
			for (let code of cardbookRepository.countriesList) {
				let country = cardbookRepository.extension.localeData.localizeMessage("region-name-" + code);
				if (aUseCodeValues) {
					myResult.push([code.toUpperCase(), country]);
				} else {
					myResult.push([country, country]);
				}
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(myResult,1,1);
			cardbookElementTools.deleteRows(aPopup.id);
			var defaultIndex = 0;
			var j = 0;
			if (aAddEmptyCountries) {
				var menuItem = aMenu.appendItem("", "");
				j++;
			}
			var found = false;
			for (var i = 0; i < myResult.length; i++) {
				var menuItem = aMenu.appendItem(myResult[i][1], myResult[i][0]);
				aPopup.appendChild(menuItem);
				if (!found && aDefaultValue != "" && myResult[i][0].toUpperCase() == aDefaultValue.toUpperCase()) {
					defaultIndex=j;
					found=true;
				}
				j++;
			}
			if (found) {
				aMenu.selectedIndex = defaultIndex;
			}
		},

		loadAccountsOrCatsTreeMenu: function (aPopupName, aMenuName, aDefaultId) {
			if (document.getElementById(aMenuName)) {
				var myPopup = document.getElementById(aPopupName);
				cardbookElementTools.deleteRows(aPopupName);
				var defaultIndex = 0;
				var j = 0;
				var typeName = [ 'all', 'enabled', 'disabled', 'local', 'remote', 'search' ];
				for (var i = 0; i < typeName.length; i++) {
					var menuItem = document.getElementById(aMenuName).appendItem(cardbookRepository.extension.localeData.localizeMessage(typeName[i] + "AccountsLabel"), typeName[i]);
					menuItem.setAttribute("type", "radio");
					menuItem.setAttribute("checked", "false");
					myPopup.appendChild(menuItem);
					if (typeName[i] == aDefaultId) {
						defaultIndex=j;
						menuItem.setAttribute("checked", "true");
					}
					j++;
				}
				document.getElementById(aMenuName).selectedIndex = defaultIndex;
			}
		},

		loadGender: function (aPopupName, aMenuName, aDefaultId) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			var myResult = [["", ""]];
			for (var type in cardbookRepository.cardbookGenderLookup) {
				myResult.push([type, cardbookRepository.cardbookGenderLookup[type]]);
			}
			for (var i = 0; i < myResult.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", myResult[i][1]);
				menuItem.setAttribute("value", myResult[i][0]);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				myPopup.appendChild(menuItem);
				if (myResult[i][0] == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
			document.getElementById(aMenuName).selectedItem.setAttribute("checked", "true");
		},

		loadAddressBooks: function (aPopup, aMenu, aDefaultId, aExclusive, aAddAllABs, aIncludeReadOnly, aIncludeSearch, aIncludeDisabled,
										aInclRestrictionList, aExclRestrictionList) {
			cardbookElementTools.deleteRows(aPopup.id);
			var defaultIndex = 0;
			var j = 0;
			if (aAddAllABs) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("allAddressBooks"));
				menuItem.setAttribute("value", "allAddressBooks");
				menuItem.setAttribute("class", "menuitem-iconic");
				aPopup.appendChild(menuItem);
				if ("allAddressBooks" == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			var sortedAddressBooks = [];
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && (aIncludeDisabled || account[5])
						&& (aIncludeReadOnly || !account[7])
						&& (aIncludeSearch || (account[6] !== "SEARCH"))) {
					if (aExclRestrictionList && aExclRestrictionList[account[4]]) {
						continue;
					}
					if (aInclRestrictionList && aInclRestrictionList.length > 0) {
						if (aInclRestrictionList[account[4]]) {
							sortedAddressBooks.push([account[0], account[4], cardbookRepository.getABIconType(account[6])]);
						}
					} else {
						sortedAddressBooks.push([account[0], account[4], cardbookRepository.getABIconType(account[6])]);
					}
				}
			}
			if (!aExclusive) {
				for (let addrbook of MailServices.ab.directories) {
					// remote LDAP directory
					if (addrbook.isRemote && addrbook.dirType === 0) {
						continue;
					}
					if (aInclRestrictionList && aInclRestrictionList.length > 0) {
						if (aInclRestrictionList[addrbook.dirPrefId]) {
							sortedAddressBooks.push([addrbook.dirName, addrbook.dirPrefId, "standard-abook"]);
						}
					} else {
						sortedAddressBooks.push([addrbook.dirName, addrbook.dirPrefId, "standard-abook"]);
					}
				}
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(sortedAddressBooks,0,1);
			for (var i = 0; i < sortedAddressBooks.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", sortedAddressBooks[i][0]);
				menuItem.setAttribute("value", sortedAddressBooks[i][1]);
				menuItem.setAttribute("ABtype", sortedAddressBooks[i][2]);
				menuItem.setAttribute("class", "menuitem-iconic");
				aPopup.appendChild(menuItem);
				if (sortedAddressBooks[i][1] == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			aMenu.selectedIndex = defaultIndex;
		},

		loadSyncAddressBooks: function (aPopup) {
			cardbookElementTools.deleteRows(aPopup.id);
			var sortedAddressBooks = [];
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && account[5] && cardbookRepository.cardbookUtils.isMyAccountRemote(account[6])) {
					sortedAddressBooks.push([account[0], account[4], cardbookRepository.getABIconType(account[6])]);
				}
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(sortedAddressBooks,0,1);
			for (var i = 0; i < sortedAddressBooks.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", sortedAddressBooks[i][0]);
				menuItem.setAttribute("value", sortedAddressBooks[i][1]);
				menuItem.setAttribute("ABtype", sortedAddressBooks[i][2]);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.addEventListener("command", function(aEvent) {
					cardbookRepository.cardbookSynchronization.syncAccount(this.value);
					aEvent.stopPropagation();
				}, false);
				aPopup.appendChild(menuItem);
			}
		},

		loadCategories: function (aPopupName, aMenuName, aDefaultPrefId, aDefaultCatId, aAddAllCats, aAddOnlyCats, aAddNoCats, aAddEmptyCats, aInclRestrictionList, aExclRestrictionList) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			if (aAddEmptyCats) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", "");
				menuItem.setAttribute("value", "");
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				myPopup.appendChild(menuItem);
				j++;
			}
			if (!(aInclRestrictionList && aInclRestrictionList[aDefaultPrefId])) {
				if (aAddAllCats) {
					var menuItem = document.createXULElement("menuitem");
					menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("allCategories"));
					menuItem.setAttribute("value", "allCategories");
					menuItem.setAttribute("class", "menuitem-iconic");
					menuItem.setAttribute("type", "radio");
					myPopup.appendChild(menuItem);
					if ("allCategories" == aDefaultCatId) {
						defaultIndex=j;
					}
					j++;
				}
				if (aAddOnlyCats) {
					var menuItem = document.createXULElement("menuitem");
					menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("onlyCategories"));
					menuItem.setAttribute("value", "onlyCategories");
					menuItem.setAttribute("class", "menuitem-iconic");
					menuItem.setAttribute("type", "radio");
					myPopup.appendChild(menuItem);
					if ("onlyCategories" == aDefaultCatId) {
						defaultIndex=j;
					}
					j++;
				}
				if (aAddNoCats) {
					var menuItem = document.createXULElement("menuitem");
					menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("noCategory"));
					menuItem.setAttribute("value", "noCategory");
					menuItem.setAttribute("class", "menuitem-iconic");
					menuItem.setAttribute("type", "radio");
					myPopup.appendChild(menuItem);
					if ("noCategory" == aDefaultCatId) {
						defaultIndex=j;
					}
					j++;
				}
			}
			var sortedCategories = [];
			if (cardbookRepository.cardbookAccountsCategories[aDefaultPrefId]) {
				for (let category of cardbookRepository.cardbookAccountsCategories[aDefaultPrefId]) {
					if (aExclRestrictionList && aExclRestrictionList[aDefaultPrefId] && aExclRestrictionList[aDefaultPrefId][category]) {
						continue;
					}
					if (aInclRestrictionList && aInclRestrictionList[aDefaultPrefId]) {
						if (aInclRestrictionList[aDefaultPrefId][category]) {
							sortedCategories.push([category, aDefaultPrefId+"::categories::"+category]);
						}
					} else {
						sortedCategories.push([category, aDefaultPrefId+"::categories::"+category]);
					}
				}
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(sortedCategories,0,1);
			for (var i = 0; i < sortedCategories.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", sortedCategories[i][0]);
				menuItem.setAttribute("value", sortedCategories[i][1]);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				myPopup.appendChild(menuItem);
				if (sortedCategories[i][1] == aDefaultCatId) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
			document.getElementById(aMenuName).selectedItem.setAttribute("checked", "true");
		},

		addMenuIMPPlist: function (aParent, aType, aIndex, aArray, aCode, aProtocol) {
			var aMenulist = document.createXULElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_menulistIMPP');
			aMenulist.setAttribute('sizetopopup', 'none');
			var aMenupopup = document.createXULElement('menupopup');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.setAttribute('id', aType + '_' + aIndex + '_menupopupIMPP');
			cardbookElementTools.deleteRows(aMenupopup.id);
			var found = false;
			for (var i = 0; i < aArray.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute('id', aType + '_' + aIndex + '_menuitemIMPP_' + i);
				menuItem.setAttribute("label", aArray[i][1]);
				menuItem.setAttribute("value", aArray[i][0]);
				aMenupopup.appendChild(menuItem);
				if (aCode != "") {
					if (aArray[i][0].toLowerCase() == aCode.toLowerCase()) {
						aMenulist.selectedIndex = i;
						found = true;
					}
				} else if (aProtocol != "") {
					if (aArray[i][2].toLowerCase() == aProtocol.toLowerCase()) {
						aMenulist.selectedIndex = i;
						found = true;
					}
				}
			}
			if (!found) {
				aMenulist.selectedIndex = 0;
			}
			return found;
		},

		addMenuTzlist: function (aParent, aType, aIndex, aValue, aParameters) {
			var aMenulist = document.createXULElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_menulistTz');
			aMenulist.setAttribute('sizetopopup', 'none');
			for (var prop in aParameters) {
				aMenulist.setAttribute(prop, aParameters[prop]);
			}
			
			var aMenupopup = document.createXULElement('menupopup');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.setAttribute('id', aType + '_' + aIndex + '_menupopupTz');
			cardbookElementTools.deleteRows(aMenupopup.id);
			var defaultIndex = 0;
			var nullmenuItem = aMenulist.appendItem("", "");
			var i = 1;
			for (let tzid of cal.timezoneService.timezoneIds) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute('id', aType + '_' + aIndex + '_menuitemTz_' + i);
				menuItem.setAttribute("label", cal.timezoneService.getTimezone(tzid).displayName);
				menuItem.setAttribute("value", tzid);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				aMenupopup.appendChild(menuItem);
				if (aValue == tzid) {
					defaultIndex = i;
				}
				i++
			}
			aMenulist.selectedIndex = defaultIndex;
			aMenulist.selectedItem.setAttribute("checked", "true");
			aMenulist.addEventListener("select", cardbookElementTools.checkEditButton, false);
			return aMenulist;
		},

		addPrefStar: function (aParent, aType, aIndex, aValue) {
			var aPrefButton = document.createXULElement('button');
			aParent.appendChild(aPrefButton);
			aPrefButton.setAttribute('id', aType + '_' + aIndex + '_PrefImage');
			aPrefButton.setAttribute('class', 'small-button cardbookPrefStarClass');
			if (aValue) {
				aPrefButton.setAttribute('haspref', 'true');
			} else {
				aPrefButton.removeAttribute('haspref');
			}
			aPrefButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("prefLabel"));

			function firePrefCheckBox(event) {
				var myIdArray = this.id.split('_');
				if (document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_prefWeightBoxLabel') &&
					document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_prefWeightBox')) {
					var myPrefWeightBoxLabel = document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_prefWeightBoxLabel');
					var myPrefWeightBox = document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_prefWeightBox');
					if (this.getAttribute('haspref')) {
						myPrefWeightBoxLabel.disabled = true;
						myPrefWeightBox.disabled = true;
					} else {
						myPrefWeightBoxLabel.disabled = false;
						myPrefWeightBox.disabled = false;
					}
					myPrefWeightBox.value = "";
				}
				if (this.getAttribute('haspref')) {
					this.removeAttribute('haspref');
				} else {
					this.setAttribute('haspref', 'true');
				}
			};
			aPrefButton.addEventListener("command", firePrefCheckBox, false);
			return aPrefButton;
		},

		addKeyButton: function (aParent, aType, aIndex, aKeyType, aCardFn, aCardDirPrefId) {
			var aKeyButton = document.createXULElement('button');
			aParent.appendChild(aKeyButton);
			aKeyButton.setAttribute('id', aType + '_' + aIndex + '_PrefImage');
			aKeyButton.setAttribute('class', 'cardbookKeyClass');
			if (cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(aKeyType.types)) {
				aKeyButton.setAttribute('haspref', 'true');
			} else {
				aKeyButton.removeAttribute('haspref');
			}
			let keyValue = aKeyType.value ? aKeyType.value : aKeyType.URI;
			aKeyButton.setAttribute('keyValue', keyValue);
			aKeyButton.setAttribute('cardFn', aCardFn);
			aKeyButton.setAttribute('cardDirPrefId', aCardDirPrefId);

			function fireKeyCheckBox(event) {
				let confirmTitle = cardbookRepository.extension.localeData.localizeMessage("confirmTitle");
				let confirmMsg = cardbookRepository.extension.localeData.localizeMessage("importKeyFromCards.label");
				if (Services.prompt.confirm(window, confirmTitle, confirmMsg)) {
					wdw_cardbook.importKeyFromValue(
						this.getAttribute('keyValue'),
						{
							'dirPrefId': this.getAttribute('cardDirPrefId'),
							'fn': this.getAttribute('cardFn')
						}
					);
				}
			};
			aKeyButton.addEventListener("command", fireKeyCheckBox, false);
			return aKeyButton;
		},

		addMenuTypelist: function (aParent, aType, aIndex, aCheckedArray) {
			var aMenulist = document.createXULElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_MenulistType');
			aMenulist.setAttribute('sizetopopup', 'none');
			aMenulist.addEventListener("keydown", function(aEvent) {
				cardbookWindowUtils.panelMenulistKeydown(aEvent, 'type', aType + '_' + aIndex + '_MenupopupType');
			}, false);

			var aMenupopup = document.createXULElement('menupopup');
			aMenupopup.setAttribute('id', aType + '_' + aIndex + '_MenupopupType');
			aMenupopup.setAttribute('ignorekeys', 'true');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.addEventListener("popuphiding", function(aEvent) {
				cardbookWindowUtils.panelMenupopupHiding(aEvent, aType, this.id);
			}, false);

			cardbookElementTools.deleteRows(aType + '_' + aIndex + '_MenupopupType');
			var myDirPrefId = wdw_cardEdition.workingCard.dirPrefId;
			var ABType = cardbookRepository.cardbookPreferences.getType(myDirPrefId);
			var ABTypeFormat = cardbookRepository.getABTypeFormat(ABType);
			if (cardbookRepository.cardbookCoreTypes[ABTypeFormat].addnew == true) {
				var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
				aTextbox.setAttribute('id', aType + '_' + aIndex + '_TextboxType');
				aTextbox.setAttribute('placeholder', cardbookRepository.extension.localeData.localizeMessage("typeAddNew"));
				aMenupopup.appendChild(aTextbox);
				aTextbox.addEventListener("keydown", function(aEvent) {
					cardbookWindowUtils.panelTextboxKeydown(aEvent, 'type', aType + '_' + aIndex + '_MenupopupType');
				}, false);
			}
			var aMenuseparator = document.createXULElement('menuseparator');
			aMenupopup.appendChild(aMenuseparator);
			
			var sourceList = cardbookRepository.cardbookTypes.getTypesFromDirPrefId(aType, myDirPrefId);
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(sourceList,0,1);
			var checkedCode = cardbookRepository.cardbookTypes.whichCodeTypeShouldBeChecked(aType, myDirPrefId, aCheckedArray, sourceList);
			if (checkedCode.isAPg && !checkedCode.isAlreadyThere) {
				sourceList.push([checkedCode.result, checkedCode.result]);
				cardbookRepository.cardbookUtils.sortMultipleArrayByString(sourceList,0,1);
			}
			for (let type of sourceList) {
				let item = document.createXULElement("menuitem");
				item.setAttribute("class", "menuitem-iconic cardbook-item");
				item.setAttribute("label", type[0]);
				item.setAttribute("value", type[1]);
				item.setAttribute("type", "radio");
				if (checkedCode.result == type[1]) {
					item.setAttribute("checked", "true");
				}
				aMenupopup.appendChild(item);
			}
			if ("undefined" == typeof(setTimeout)) {
				var { setTimeout } = ChromeUtils.import("resource://gre/modules/Timer.jsm");
			}
			setTimeout(function() {
					cardbookWindowUtils.updateComplexMenulist('type', aMenupopup.id);
				}, 0);
		},

		addEditButton: function (aParent, aType, aIndex, aButtonType, aButtonName, aFunction) {
			var aEditButton = document.createXULElement('button');
			aParent.appendChild(aEditButton);
			aEditButton.setAttribute('id', aType + '_' + aIndex + '_' + aButtonName + 'Button');
			aEditButton.setAttribute('class', 'small-button');
			if (aButtonType == "add") {
				aEditButton.setAttribute('class', 'small-button cardbookAdd');
			} else if (aButtonType == "remove") {
				aEditButton.setAttribute('class', 'small-button cardbookDelete');
			} else if (aButtonType == "up") {
				aEditButton.setAttribute('class', 'small-button cardbookUp');
			} else if (aButtonType == "down") {
				aEditButton.setAttribute('class', 'small-button cardbookDown');
			} else if (aButtonType == "validated") {
				aEditButton.setAttribute('class', 'small-button cardbookValidated');
			} else if (aButtonType == "notValidated") {
				aEditButton.setAttribute('class', 'small-button cardbookNotValidated');
			} else if (aButtonType == "link") {
				aEditButton.setAttribute('class', 'small-button cardbookLink');
			}
			aEditButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage(aButtonType + "EntryTooltip"));
			// aEditButton.addEventListener("click", aFunction, false);
			aEditButton.addEventListener("command", aFunction, false);
		},

		checkEditButton: function (event) {
			let idArray = this.id.split('_');
			let type = idArray[0];
			let index = idArray[1];
			let prevIndex = parseInt(index) - 1;
			let nextIndex = parseInt(index) + +1;
			document.getElementById(type + "_" + index + "_removeButton").disabled = false;
			if (this.value == "") {
				document.getElementById(type + "_" + index + "_addButton").disabled = true;
			} else {
				document.getElementById(type + "_" + index + "_addButton").disabled = false;
			}
			document.getElementById(type + "_" + index + "_downButton").disabled = true;
			document.getElementById(type + "_" + index + "_upButton").disabled = true;
			if (document.getElementById(type + "_" + prevIndex + "_addButton")) {
				document.getElementById(type + "_" + prevIndex + "_addButton").disabled = true;
				document.getElementById(type + "_" + prevIndex + "_downButton").disabled = false;
				document.getElementById(type + "_" + index + "_upButton").disabled = false;
			}
			if (document.getElementById(type + "_" + nextIndex + "_addButton")) {
				document.getElementById(type + "_" + index + "_addButton").disabled = true;
				document.getElementById(type + "_" + index + "_downButton").disabled = false;
				document.getElementById(type + "_" + nextIndex + "_upButton").disabled = false;
			}
		},

		addProcessButton: function (aParent, aId) {
			var aProcessButton = document.createXULElement('button');
			aParent.appendChild(aProcessButton);
			aProcessButton.setAttribute('id', aId);
			aProcessButton.setAttribute('type', "checkbox");
			aProcessButton.setAttribute('class', "cardbookProcessClass");
			aProcessButton.setAttribute('autoConvertField', "true");
			aProcessButton.addEventListener("command", wdw_cardEdition.setConvertFunction, false);
			aProcessButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("dontAutoConvertField"));
		}
	};

};
