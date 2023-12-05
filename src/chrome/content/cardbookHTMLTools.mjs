export var cardbookHTMLTools = {
    // label can't be disabled, only set in grey
    disableNode: function (aNode, aDisabledState) {
        aNode.disabled = aDisabledState;
        if (aDisabledState) {
            aNode.classList.add("disabled");
        } else {
            aNode.classList.remove("disabled");
        }
    },
 
    deleteRows: function (aObjectName) {
        try {
            var aListRows = document.getElementById(aObjectName);
            while (aListRows.hasChildNodes()) {
                aListRows.lastChild.remove();
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

    addHTMLElement: function (aElement, aParent, aId, aParameters) {
        let element = document.createElementNS("http://www.w3.org/1999/xhtml", `${aElement}`);
        if (aId) {
            element.setAttribute("id", aId);
        }
        for (let prop in aParameters) {
            element.setAttribute(prop, aParameters[prop]);
        }
        aParent.appendChild(element);
        return element;
    },

    addHTMLDIV: function (aParent, aId, aParameters) {
        let div = this.addHTMLElement("div", aParent, aId, aParameters);
        return div;
    },

    addHTMLH2LABEL: function (aParent, aId, aValue, aParameters) {
        let aH2Label = this.addHTMLElement("label", aParent, aId, aParameters);
        let aH2 = this.addHTMLElement("h2", aH2Label, "", {})
        aH2.textContent = aValue;
        return aH2Label;
    },

    addHTMLLABEL: function (aParent, aId, aValue, aParameters) {
        let label = this.addHTMLElement("label", aParent, aId, aParameters);
        label.textContent = aValue;
        return label;
    },

    addHTMLINPUT: function (aParent, aId, aValue, aParameters) {
        let input = this.addHTMLElement("input", aParent, aId, aParameters);
        input.setAttribute("value", aValue);
        return input;
    },

    addHTMLTEXTAREA: function (aParent, aId, aValue, aParameters) {
        let textarea = this.addHTMLElement("textarea", aParent, aId, aParameters);
        textarea.textContent = aValue;
        return textarea;
    },

    addHTMLBUTTON: function (aParent, aId, aLabel, aParameters) {
        let button = this.addHTMLElement("button", aParent, aId, aParameters);
        button.textContent = aLabel;
        return button;
    },

    addHTMLPROGRESS: function (aParent, aId, aParameters) {
        let progress = this.addHTMLElement("progress", aParent, aId, aParameters);
        progress.setAttribute("max", "100");
        return progress;
    },

    addHTMLTABLE: function (aParent, aId, aParameters) {
        let table = this.addHTMLElement("table", aParent, aId, aParameters);
        return table;
    },

    addHTMLTR: function (aParent, aId, aParameters) {
        let tr = this.addHTMLElement("tr", aParent, aId, aParameters);
        return tr;
    },

    addHTMLTD: function (aParent, aId, aParameters) {
        let td = this.addHTMLElement("td", aParent, aId, aParameters);
        return td;
    },

    addHTMLTHEAD: function (aParent, aId, aParameters) {
        let thead = this.addHTMLElement("thead", aParent, aId, aParameters);
        return thead;
    },

    addHTMLTBODY: function (aParent, aId, aParameters) {
        let tbody = this.addHTMLElement("tbody", aParent, aId, aParameters);
        return tbody;
    },

    addHTMLTH: function (aParent, aId, aParameters) {
        let th = this.addHTMLElement("th", aParent, aId, aParameters);
        return th;
    },

    addHTMLIMAGE: function (aParent, aId, aParameters) {
        let image = this.addHTMLElement("img", aParent, aId, aParameters);
        return image;
    },

    addHTMLSELECT: function (aParent, aId, aValue, aParameters) {
        let aSelect = this.addHTMLElement("select", aParent, aId, aParameters);
        aSelect.value = aValue;
        return aSelect;
    },

    addHTMLOPTION: function (aParent, aId, aValue, aLabel, aParameters) {
        let option = this.addHTMLElement("option", aParent, aId, aParameters);
        option.value = aValue;
        option.textContent = aLabel;
        return option;
    },

    addTreeTable: function (aId, aHeaders, aData, aDataParameters, aRowParameters, aTableParameters, aSortFunction, aDataId, aDragAndDrop) {
        let table = document.getElementById(aId);
        let sortColumn = table.getAttribute("data-sort-column");
        let orderColumn = table.getAttribute("data-sort-order");

        let selectedRows = table.querySelectorAll("tr[rowSelected='true']");
        let selectedValues = [];
        if (typeof aDataId !== "undefined" && aDataId) {
            selectedValues = Array.from(selectedRows, row => row.cells[aDataId].textContent);
        } else {
            selectedValues = Array.from(selectedRows, row => Array.from(row.cells, cell => cell.textContent).join());
        }
        this.deleteRows(aId);

        if (aHeaders.length) {
            let thead = this.addHTMLTHEAD(table, `${aId}_thead`);
            let tr = this.addHTMLTR(thead, `${aId}_thead_tr`);
            for (let i = 0; i < aHeaders.length; i++) {
                let th = this.addHTMLTH(tr, `${aId}_thead_th_${i}`);
                th.textContent = messenger.i18n.getMessage(`${aHeaders[i]}Label`);
                th.setAttribute("data-value", aHeaders[i]);
                if (aSortFunction) {
                    th.setAttribute("title", messenger.i18n.getMessage("columnsSortBy", [th.textContent]));
                }
                if (aHeaders[i] == sortColumn) {
                    let sortImg;
                    if (orderColumn == "ascending" ) {
                        sortImg = this.addHTMLIMAGE(th, `${aId}_thead_th_${i}_image`, { "src": "../skin/small-icons/arrow-down.svg" } );
                    } else {
                        sortImg = this.addHTMLIMAGE(th, `${aId}_thead_th_${i}_image`, { "src": "../skin/small-icons/arrow-up.svg" } );
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
            let tbody = this.addHTMLTBODY(table, `${aId}_tbody`);
            for (let i = 0; i < aData.length; i++) {
                let tr = this.addHTMLTR(tbody, `${aId}_thead_tr_${i}`, {"tabindex": "0"});
                let trValue = "";
                if (typeof aDataId !== "undefined") {
                    trValue = aData[i][aDataId];
                } else {
                    trValue = aData[i].join();
                }
                for (let j = 0; j < aData[i].length; j++) {
                    let td = this.addHTMLTD(tr, `${aId}_thead_td_${i}_${j}`);
                    let last = td;
                    if (typeof aData[i][j] === "boolean") {
                        let checkbox = this.addHTMLElement("input", td, `${aId}_thead_td_${i}_${j}_checkbox`, {"type": "checkbox"})
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
        if (aTableParameters && aTableParameters.events) {
            for (let event of aTableParameters.events) {
                table.addEventListener(event[0], event[1], false);
            }
        }
        if (typeof aDragAndDrop !== "undefined") {
            if (typeof aDragAndDrop.dragStart !== "undefined") {
                table.setAttribute("draggable", "true");
                table.addEventListener("dragstart", aDragAndDrop.dragStart, false);
            }
            if (typeof aDragAndDrop.drop !== "undefined") {
                table.addEventListener("dragover", event => event.preventDefault(), false);
                table.addEventListener("drop", aDragAndDrop.drop, false);
            }
        }
        return table;
    },

    loadOptions: async function (aSelect, aList, aDefaultValue, aAddEmpty) {
        let id = aSelect.id;
        this.deleteRows(id);
        if (aAddEmpty) {
            let option = this.addHTMLOPTION(aSelect, `${id}_option_empty`, "", "");
        }
        let i = 0;
        for (let [value, label] of aList) {
            let option = this.addHTMLOPTION(aSelect, `${id}_option_${i}`, value, label);
            if (value.toUpperCase() == aDefaultValue.toUpperCase()) {
                option.selected = true;
            }
            i++;
        }
    },

    loadInclExcl: function (aSelect, aDefaultValue) {
        let id = aSelect.id;
        this.deleteRows(id);
        let i = 0;
        for (let value of [ "include", "exclude" ]) {
            let option = this.addHTMLOPTION(aSelect, `${id}_option_${i}`, value, messenger.i18n.getMessage(`${value}Label`));
            if (value.toUpperCase() == aDefaultValue.toUpperCase()) {
                option.selected = true;
            }
            i++;
        }
    },

    loadMailAccounts: async function (aSelect, aDefaultValue, aAddAllMailAccounts) {
        let id = aSelect.id;
        this.deleteRows(id);
        if (aAddAllMailAccounts) {
            let value = "allMailAccounts";
            let option = this.addHTMLOPTION(aSelect, `${id}_option_all`, value, messenger.i18n.getMessage("allMailAccounts"));
            if (value == aDefaultValue) {
                option.selected = true;
            }
        }
        let i = 0;
        for (let account of await browser.accounts.list()) {
			if (account.type == "pop3" || account.type == "imap") {
				for (let identity of account.identities) {
                    let value = identity.id;
                    let option = this.addHTMLOPTION(aSelect, `${id}_option_${i}`, value, identity.email);
                    if (value.toUpperCase() == aDefaultValue.toUpperCase()) {
                        option.selected = true;
                    }
                    i++;
				}
			}
		}
    },

    loadAddressBooks: async function (aSelect, aDefaultValue, aExclusive, aAddAllABs, aIncludeReadOnly, aIncludeSearch, aIncludeDisabled, aInclRestrictionList, aExclRestrictionList) {
        let id = aSelect.id;
        this.deleteRows(id);
        if (aAddAllABs) {
            let value = "allAddressBooks";
            let option = this.addHTMLOPTION(aSelect, `${id}_option_all`, value, messenger.i18n.getMessage("allAddressBooks"));
            if (value == aDefaultValue) {
                option.selected = true;
            }
        }
        let addressbooks = [];
        addressbooks = await messenger.runtime.sendMessage({query: "cardbook.getABs", exclusive: aExclusive, includeReadOnly: aIncludeReadOnly,
                                                        includeSearch: aIncludeSearch, includeDisabled: aIncludeDisabled, inclRestrictionList: aInclRestrictionList,
                                                        exclRestrictionList: aExclRestrictionList});
        let i = 0;
        for (let [label, value, type] of addressbooks) {
            // to do AB icon
            let option = this.addHTMLOPTION(aSelect, `${id}_option_${i}`, value, label);
            if (value.toUpperCase() == aDefaultValue.toUpperCase()) {
                option.selected = true;
            }
            i++;
        }
    },

    loadCategories: async function (aSelect, aDefaultPrefId, aDefaultValue, aAddAllCats, aAddOnlyCats, aAddNoCats, aAddEmptyCats, aInclRestrictionList, aExclRestrictionList) {
        let id = aSelect.id;
        this.deleteRows(id);
        if (aAddEmptyCats) {
            let option = this.addHTMLOPTION(aSelect, `${id}_option_all`, "", "");
        }
        if (!(aInclRestrictionList && aInclRestrictionList[aDefaultPrefId])) {
            if (aAddAllCats) {
                let value = "allCategories";
                let option = this.addHTMLOPTION(aSelect, `${id}_option_all`, value, messenger.i18n.getMessage("allCategories"));
                if (value == aDefaultValue) {
                    option.selected = true;
                }
            }
            if (aAddOnlyCats) {
                let value = "onlyCategorieaDefaultPrefIds";
                let option = this.addHTMLOPTION(aSelect, `${id}_option_only`, value, messenger.i18n.getMessage("onlyCategories"));
                if (value == aDefaultValue) {
                    option.selected = true;
                }
            }
            if (aAddNoCats) {
                let value = "noCategory";
                let option = this.addHTMLOPTION(aSelect, `${id}_option_no`, value, messenger.i18n.getMessage("noCategory"));
                if (value == aDefaultValue) {
                    option.selected = true;
                }
            }
        }
        var categories = [];
        categories = await messenger.runtime.sendMessage({query: "cardbook.getCategories", defaultPrefId: aDefaultPrefId,
                                                        inclRestrictionList: aInclRestrictionList,
                                                        exclRestrictionList: aExclRestrictionList});
        let i = 0;
        for (let [label, value] of categories) {
            let option = this.addHTMLOPTION(aSelect, `${id}_option_${i}`, value, label);
            if (value.toUpperCase() == aDefaultValue.toUpperCase()) {
                option.selected = true;
            }
            i++;
        }
    },

    loadContacts: async function (aSelect, aDirPrefId, aDefaultValue) {
        let id = aSelect.id;
        this.deleteRows(id);
        let contacts = [];
        contacts = await messenger.runtime.sendMessage({query: "cardbook.getContacts", dirPrefId: aDirPrefId});
        let i = 0;
        for (let [label, value, type] of contacts) {
            let option = this.addHTMLOPTION(aSelect, `${id}_option_${i}`, value, label);
            if (value.toUpperCase() == aDefaultValue.toUpperCase()) {
                option.selected = true;
            }
            i++;
        }
    },

    loadConvertionFuntions: function (aSelect, aDefaultValue) {
        let id = aSelect.id;
        this.deleteRows(id);
        let option = this.addHTMLOPTION(aSelect, `${id}_option_no`, "", "");
        let i = 0;
        for (let value of [ "uppercase", "lowercase", "capitalization" ]) {
            let option = this.addHTMLOPTION(aSelect, `${id}_option_${i}`, value, messenger.i18n.getMessage(`${value}Label`));
            if (value.toUpperCase() == aDefaultValue.toUpperCase()) {
                option.selected = true;
            }
            i++;
        }
    },

    loadVCardVersions: function (aSelect, aDefaultList, aSupportedVersions) {
        let id = aSelect.id;
        this.deleteRows(id);
        if (aDefaultList && aDefaultList.length && aDefaultList.length > 0) {
            var versions = aDefaultList;
        } else {
            var versions = aSupportedVersions;
        }
        if (versions.includes("3.0")) {
            var defaultValue = "3.0";
        } else {
            var defaultValue = "4.0";
        }
        let i = 0;
        for (let value of versions) {
            let option = this.addHTMLOPTION(aSelect, `${id}_option_${i}`, value, value);
            if (value.toUpperCase() == defaultValue.toUpperCase()) {
                option.selected = true;
            }
            i++;
        }
    },

    loadRemotePageTypes: function (aSelect, aDefaultId, aSupportedConnections) {
        let id = aSelect.id;
        this.deleteRows(id);
        let i = 0;
        for (let connection of aSupportedConnections) {
            let id = connection[0].toLowerCase();
            let option = this.addHTMLOPTION(aSelect, `${id}_option_${i}`, connection[0], id[0].toUpperCase() + id.substr(1).toLowerCase(),
                                    {"type": connection[1], "url": connection[2]});
            try {
                let locale = messenger.i18n.getMessage(`remotePageType.${id}.label`);
                if (locale) {
                    option.textContent = locale;
                }
            } catch(e) {}
            if (id == aDefaultId.toLowerCase()) {
                option.selected = true;
            }
            i++;
        }
    },

    addMenuCaselist: function (aParent, aType, aIndex, aValue, aParameters) {
        let caseOperators = [["dig", "ignoreCaseIgnoreDiacriticLabel"], ["ig", "ignoreCaseMatchDiacriticLabel"],
                                ["dg", "matchCaseIgnoreDiacriticLabel"], ["g", "matchCaseMatchDiacriticLabel"]]

        let select = this.addHTMLSELECT(aParent, `${aType}_${aIndex}_menulistCase`, "", aParameters);
        let i = 0;
        for (let operator of caseOperators) {
            let option = this.addHTMLOPTION(select, `${aType}_${aIndex}_menulistCase_${i}`, operator[0], messenger.i18n.getMessage(operator[1]));
            if (aValue.toUpperCase() == operator[0].toUpperCase()) {
                option.selected = true;
            }
            i++;
        }
    },

    addMenuObjlist: function (aParent, aType, aIndex, aColumns, aValue, aParameters) {
        let select = this.addHTMLSELECT(aParent, `${aType}_${aIndex}_menulistObj`, "", aParameters);

        let i = 0;
        for (let column of aColumns) {
            let option = this.addHTMLOPTION(select, `${aType}_${aIndex}_menuitemObj_${i}`, column[0], column[1]);
            if (aValue.toUpperCase() == column[0].toUpperCase()) {
                option.selected = true;
            }
            i++;
        }
    },

    addMenuTermlist: function (aParent, aType, aIndex, aValue, aParameters) {
        let select = this.addHTMLSELECT(aParent, `${aType}_${aIndex}_menulistTerm`, "", aParameters);

        let operators = ["Contains", "DoesntContain", "Is", "Isnt", "BeginsWith", "EndsWith", "IsEmpty", "IsntEmpty"]
        let i = 0;
        for (let operator of operators) {
            let option = this.addHTMLOPTION(select, `${aType}_${aIndex}_menulistTerm_${i}`, operator, messenger.i18n.getMessage(`${operator}Operator`));
            if (aValue.toUpperCase() == operator.toUpperCase()) {
                option.selected = true;
            }
            i++;
        }
        return select;
    },

    loadGender: async function (menuname, value) {
        let genderLookup = [ [ "F", messenger.i18n.getMessage("types.gender.f") ],
                                    [ "M", messenger.i18n.getMessage("types.gender.m") ],
                                    [ "N", messenger.i18n.getMessage("types.gender.n") ],
                                    [ "O", messenger.i18n.getMessage("types.gender.o") ],
                                    [ "U", messenger.i18n.getMessage("types.gender.u") ] ];
		let menu = document.getElementById(menuname);
		await cardbookHTMLTools.loadOptions(menu, genderLookup, value, true);
   },

   loadPreferMailFormat: async function (menuname, value) {
        let list = [ [ "0", messenger.i18n.getMessage("Unknown.label") ],
                    [ "1", messenger.i18n.getMessage("PlainText.label") ],
                    [ "2", messenger.i18n.getMessage("HTML.label") ] ];
        let menu = document.getElementById(menuname);
        await cardbookHTMLTools.loadOptions(menu, list, value, true);
    },

	loadCountries: async function (menuname, value) {
		let countryList = await messenger.runtime.sendMessage({query: "cardbook.getCountries", useCodeValues: true});
        let menu = document.getElementById(menuname);
		await cardbookHTMLTools.loadOptions(menu, countryList, value, true);
	},

    addTreeSelect: function (aSelect, aData, aRowParameters) {
        if (aData.length) {
            for (let i = 0; i < aData.length; i++) {
                let option = this.addHTMLOPTION(aSelect, `${aSelect.id}_option_${i}`, { "value": aData[i] } );
                option.textContent = aData[i];
                if (aRowParameters && aRowParameters.values && aRowParameters.values[i]) {
                    option.setAttribute("data-value", aRowParameters.values[i]);
                }
            }
        }
    },

    checkEditButton: function (event) {
        let idArray = this.id.split("_");
        let type = idArray[0];
        let index = idArray[1];
        let prevIndex = parseInt(index) - 1;
        let nextIndex = parseInt(index) + +1;
        document.getElementById(`${type }_${index }_removeButton`).disabled = false;
        if (this.value == "") {
            document.getElementById(`${type }_${index }_addButton`).disabled = true;
        } else {
            document.getElementById(`${type }_${index }_addButton`).disabled = false;
        }
        document.getElementById(`${type }_${index }_downButton`).disabled = true;
        document.getElementById(`${type }_${index }_upButton`).disabled = true;
        if (document.getElementById(`${type }_${prevIndex}_addButton`)) {
            document.getElementById(`${type }_${prevIndex}_addButton`).disabled = true;
            document.getElementById(`${type }_${prevIndex}_downButton`).disabled = false;
            document.getElementById(`${type }_${index }_upButton`).disabled = false;
        }
        if (document.getElementById(`${type }_${nextIndex}_addButton`)) {
            document.getElementById(`${type }_${index }_addButton`).disabled = true;
            document.getElementById(`${type }_${index }_downButton`).disabled = false;
            document.getElementById(`${type }_${nextIndex}_upButton`).disabled = false;
        }
    },

    addCategoriesRow: function (aParent, aCategories) {
        this.deleteRows(aParent.id);

        for (let category of aCategories) {
            let parameters = {class: "tagvalue cardbookCategoryClass", type : "category_" + cardbookRepository.cardbookUtils.formatCategoryForCss(category)}
            this.addHTMLLABEL(aParent, category + 'Label', category, parameters);
        }
    },

    addProcessButton: function (aParent, aId) {
        let processButton = this.addHTMLBUTTON(aParent, aId);
        processButton.setAttribute("class", "cardbookProcessClass");
        processButton.setAttribute("autoConvertField", "true");
        processButton.addEventListener("command", wdw_cardEdition.setConvertFunction, false);
        processButton.setAttribute("title", messenger.i18n.getMessage("dontAutoConvertField"));
    },

};
