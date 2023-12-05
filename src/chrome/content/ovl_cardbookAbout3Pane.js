if ("undefined" == typeof(ovl_cardbookAbout3Pane)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ovl_cardbookAbout3Pane = {
		origFunctions: {},
		ABFacetingFilter: {
			name: "cardbook",
			domId: "qfb-cardbook",
			
			/**
			* @returns true if the constaint is only on is in addressbooks/isn't in addressbooks,
			*     false if there are specific AB constraints in play.
			*/
			isSimple(aFilterValue) {
				// it's the simple case if the value is just a boolean
				if (typeof aFilterValue != "object") {
					return true;
				}
				// but also if the object contains no non-null values
				let simpleCase = true;
				for (let key in aFilterValue.addressbooks) {
					let value = aFilterValue.addressbooks[key];
					if (value !== null) {
						simpleCase = false;
						break;
					}
				}
				return simpleCase;
			},
			
			/**
			* Because we support both inclusion and exclusion we can produce up to two
			*  groups.  One group for inclusion, one group for exclusion.  To get listed
			*  the message must have any/all of the addressbooks marked for inclusion,
			*  (depending on mode), but it cannot have any of the addressbooks marked for
			*  exclusion.
			*/
			appendTerms(aTermCreator, aTerms, aFilterValue) {
				if (aFilterValue == null) {
					return null;
				}
				
				let term, value;
				
				// just the true/false case
				if (this.isSimple(aFilterValue)) {
					term = aTermCreator.createTerm();
					value = term.value;
					term.attrib = Components.interfaces.nsMsgSearchAttrib.Custom;
					value.attrib = term.attrib;
					value.str = "";
					term.value = value;
					term.customId = "cardbook#searchCorrespondents";
					term.booleanAnd = true;
					term.op = Components.interfaces.nsMsgSearchOp.IsInAB;
					aTerms.push(term);
					// we need to perform faceting if the value is literally true.
					if (aFilterValue === true) {
						return this;
					}
				} else {
					let firstIncludeClause = true, firstExcludeClause = true;
					let lastIncludeTerm = null;
					term = null;
					let excludeTerms = [];
					let mode = aFilterValue.mode;
					for (let key in aFilterValue.addressbooks) {
						let shouldFilter = aFilterValue.addressbooks[key];
						if (shouldFilter !== null) {
							term = aTermCreator.createTerm();
							value = term.value;
							term.attrib = Components.interfaces.nsMsgSearchAttrib.Custom;
							value.attrib = term.attrib;
							value.str = key;
							term.value = value;
							term.customId = "cardbook#searchCorrespondents";
							if (shouldFilter) {
								term.op = Components.interfaces.nsMsgSearchOp.IsInAB;
								// AND for the group. Inside the group we also want AND if the
								// mode is set to "All of".
								term.booleanAnd = firstIncludeClause || mode === "AND";
								term.beginsGrouping = firstIncludeClause;
								aTerms.push(term);
								firstIncludeClause = false;
								lastIncludeTerm = term;
							} else {
								term.op = Components.interfaces.nsMsgSearchOp.IsntInAB;
								// you need to not include all of the addressbooks marked excluded.
								term.booleanAnd = true;
								term.beginsGrouping = firstExcludeClause;
								excludeTerms.push(term);
								firstExcludeClause = false;
							}
						}
					}
					if (lastIncludeTerm) {
						lastIncludeTerm.endsGrouping = true;
					}
					
					// if we have any exclude terms:
					// - we might need to add a "is in AB" clause if there were no explicit
					//   inclusions.
					// - extend the exclusions list in.
					if (excludeTerms.length) {
						// (we need to add is in AB)
						if (!lastIncludeTerm) {
							term = aTermCreator.createTerm();
							value = term.value;
							term.attrib = Components.interfaces.nsMsgSearchAttrib.Custom;
							value.attrib = term.attrib;
							value.str = "";
							term.value = value;
							term.customId = "cardbook#searchCorrespondents";
							term.booleanAnd = true;
							term.op = Components.interfaces.nsMsgSearchOp.IsInAB;
							aTerms.push(term);
						}
			
						// (extend in the exclusions)
						excludeTerms[excludeTerms.length - 1].endsGrouping = true;
						aTerms.push.apply(aTerms, excludeTerms);
					}
				}
				return null;
			},
		
			onSearchStart(aCurState) {
				// this becomes aKeywordMap; we want to start with an empty one
				return {};
			},
		
			onSearchMessage(aKeywordMap, aMsgHdr, aFolder) {
			},
		
			onSearchDone(aCurState, aKeywordMap, aStatus) {
				// we are an async operation; if the user turned off the AB facet already,
				//  then leave that state intact...
				if (aCurState == null) {
					return [null, false, false];
				}
				
				// only propagate things that are actually addressbooks though!
				let outKeyMap = { addressbooks: {} };
				let allAddressBooks = cardbookRepository.cardbookPreferences.getAllPrefIds();
				for (let i = 0; i < allAddressBooks.length; i++) {
					let dirPrefId = allAddressBooks[i];
					if (cardbookRepository.cardbookPreferences.getEnabled(dirPrefId) && (cardbookRepository.cardbookPreferences.getType(dirPrefId) !== "SEARCH")) {
						if (dirPrefId in aKeywordMap) {
							outKeyMap.addressbooks[dirPrefId] = aKeywordMap[dirPrefId];
						}
					}
				}
				return [outKeyMap, true, false];
			},
		
			/**
			* We need to clone our state if it's an object to avoid bad sharing.
			*/
			propagateState(aOld, aSticky) {
				// stay disabled when disabled, get disabled when not sticky
				if (aOld == null || !aSticky) {
					return null;
				}
				if (this.isSimple(aOld)) {
					// Could be an object, need to convert.
					return !!aOld;
				}
				// return shallowObjCopy(aOld);
				return JSON.parse(JSON.stringify(aOld));
			},
			
			/**
			* Default behaviour but:
			* - We collapse our expando if we get unchecked.
			* - We want to initiate a faceting pass if we just got checked.
			*/
			onCommand(aState, aNode, aEvent, aDocument) {
				let checked = aNode.pressed ? true : null;
				if (!checked) {
					document.getElementById("quickFilterBarCardBookContainer").hidden = true;
				}
				
				// return ourselves if we just got checked to have
				// onSearchStart/onSearchMessage/onSearchDone get to do their thing.
				return [checked, true];
			},
			
			domBindExtra(aDocument, aMuxer, aNode) {
				// AB filtering mode menu (All of/Any of)
				function commandHandler(aEvent) {
					let filterValue = aMuxer.getFilterValueForMutation(ovl_cardbookAbout3Pane.ABFacetingFilter.name);
					filterValue.mode = aEvent.target.value;
					aMuxer.updateSearch();
				}
				document.getElementById("qfb-cardbook-boolean-mode").addEventListener("ValueChange", commandHandler);
			},
			
			reflectInDOM(aNode, aFilterValue, aDocument, aMuxer) {
				aNode.pressed = aFilterValue;
				if (aFilterValue != null && typeof aFilterValue == "object") {
					this._populateABBar(aFilterValue, aDocument, aMuxer);
				} else {
					document.getElementById("quickFilterBarCardBookContainer").hidden = true;
				}
			},
			
			_populateABBar(aState, aDocument, aMuxer) {
				let ABbar = document.getElementById("quickFilterBarCardBookContainer");
				let keywordMap = aState.addressbooks;
				
				// If we have a mode stored use that. If we don't have a mode, then update
				// our state to agree with what the UI is currently displaying;
				// this will happen for fresh profiles.
				let qbm = document.getElementById("qfb-cardbook-boolean-mode");
				if (aState.mode) {
					qbm.value = aState.mode;
				} else {
					aState.mode = qbm.value;
				}
				
				function clickHandler(aEvent) {
					let ABKey = this.getAttribute("value");
					let state = aMuxer.getFilterValueForMutation(ovl_cardbookAbout3Pane.ABFacetingFilter.name);
					state.addressbooks[ABKey] = this.pressed ? true : null;
					this.removeAttribute("inverted");
					aMuxer.updateSearch();
				}
				
				function rightClickHandler(aEvent) {
					if (aEvent.button == 2) {
						// Toggle isn't triggered by a contextmenu event, so do it here.
						this.pressed = !this.pressed;
						let ABKey = this.getAttribute("value");
						let state = aMuxer.getFilterValueForMutation(ovl_cardbookAbout3Pane.ABFacetingFilter.name);
						state.addressbooks[ABKey] = this.pressed ? false : null;
						if (this.pressed) {
							this.setAttribute("inverted", "true");
						} else {
							this.removeAttribute("inverted");
						}
						aMuxer.updateSearch();
						aEvent.preventDefault();
					}
				};
				
				while (ABbar.children.length > 1) {
					ABbar.lastElementChild.remove();
				}
				let addCount = 0;
				var allAddressBooks = [];
				allAddressBooks = cardbookRepository.cardbookPreferences.getAllPrefIds();
				for (let i = 0; i < allAddressBooks.length; i++) {
					let dirPrefId = allAddressBooks[i];
					if (cardbookRepository.cardbookPreferences.getEnabled(dirPrefId) && (cardbookRepository.cardbookPreferences.getType(dirPrefId) !== "SEARCH")) {
						let dirPrefName = cardbookRepository.cardbookPreferences.getName(dirPrefId);
						addCount++;
	
						// Keep in mind that the XBL does not get built for dynamically created
						//  elements such as these until they get displayed, which definitely
						//  means not before we append it into the tree.
						let button = aDocument.createElement("button", { is: "toggle-button" });
	
						button.setAttribute("id", "qfb-cardbook-" + dirPrefId);
						button.addEventListener("click", clickHandler);
						button.addEventListener("contextmenu", rightClickHandler);
						if (keywordMap[dirPrefId] !== null && keywordMap[dirPrefId] !== undefined) {
							button.pressed = true;
							if (!keywordMap[dirPrefId]) {
								button.setAttribute("inverted", "true");
							}
						}
						button.textContent = dirPrefName;
						button.setAttribute("value", dirPrefId);
	
						button.setAttribute("class", "button qfb-cardbook-button");
						let useColor = cardbookRepository.cardbookPreferences.getStringPref("useColor");
						if (useColor == "background" || useColor == "text") {
							let color = cardbookRepository.cardbookPreferences.getColor(dirPrefId)
							let contrast = TagUtils.isColorContrastEnough(color) ? "black" : "white";
							if (color) {
								button.setAttribute("style", `--tag-color: ${color}; --tag-contrast-color: ${contrast};`);
							}
						}
	
						ABbar.appendChild(button);
					}
				}
				ABbar.hidden = !addCount;
			},
		},
	
		reloadCardBookQFB: function () {
			let addrButton = document.querySelector("#qfb-inaddrbook");
			if (cardbookRepository.cardbookPrefs["exclusive"]) {
				if (addrButton) {
					addrButton.hidden = true;
				}
			} else {
				if (addrButton) {
					addrButton.hidden = false;
				}
			}
			window.quickFilterBar.updateSearch();
		},

		bindQFB: function () {
			let domNode = document.getElementById(ovl_cardbookAbout3Pane.ABFacetingFilter.domId);
			// let menuItemNode = document.getElementById(ovl_cardbookAbout3Pane.ABFacetingFilter.menuItemID);
			let handlerDomId, handlerMenuItems;
			handlerDomId = event => {
				let filterValues = window.quickFilterBar.filterer.filterValues;
				let preValue = ovl_cardbookAbout3Pane.ABFacetingFilter.name in filterValues ? filterValues[ovl_cardbookAbout3Pane.ABFacetingFilter.name] : null;
				let [postValue, update] = ovl_cardbookAbout3Pane.ABFacetingFilter.onCommand(preValue, domNode, event, document);
				window.quickFilterBar.filterer.setFilterValue(ovl_cardbookAbout3Pane.ABFacetingFilter.name, postValue, !update);
				if (update) {
					window.quickFilterBar.deferredUpdateSearch(domNode);
				}
			};
			/* handlerMenuItems = event => {
				let filterValues = window.quickFilterBar.filterer.filterValues;
				let preValue = ovl_cardbookAbout3Pane.ABFacetingFilter.name in filterValues ? filterValues[ovl_cardbookAbout3Pane.ABFacetingFilter.name] : null;
				let [postValue, update] = ovl_cardbookAbout3Pane.ABFacetingFilter.onCommand(preValue, menuItemNode, event, document);
				window.quickFilterBar.filterer.setFilterValue(filterDef.name, postValue, !update);
				if (update) {
					window.quickFilterBar.deferredUpdateSearch();
				}
			};*/
			domNode.addEventListener("click", handlerDomId);
			// menuItemNode.addEventListener("command", handlerMenuItems);
			ovl_cardbookAbout3Pane.ABFacetingFilter.domBindExtra(document, window.quickFilterBar, domNode);
		},

		load() {
			// QuickFilterManager.defineFilter(ABFacetingFilter);
			// window.quickFilterBar.init();
			cardBook3PaneObserver.register();
			ovl_cardbookAbout3Pane.bindQFB();
			ovl_cardbookAbout3Pane.reloadCardBookQFB();
		},

		unload() {
			// quickfilter
			// QuickFilterManager.killFilter("cardbook");
			window.quickFilterBar.reflectFiltererState = ovl_cardbookAbout3Pane.origFunctions.reflectFiltererState;
			window.quickFilterBar.onMessagesChanged = ovl_cardbookAbout3Pane.origFunctions.onMessagesChanged;
			QuickFilterManager.createSearchTerms = ovl_cardbookAbout3Pane.origFunctions.createSearchTerms;
			QuickFilterManager.clearAllFilterValues = ovl_cardbookAbout3Pane.origFunctions.clearAllFilterValues;
			QuickFilterManager.clearFilterValue = ovl_cardbookAbout3Pane.origFunctions.clearFilterValue;
			QuickFilterManager.getDefaultValues = ovl_cardbookAbout3Pane.origFunctions.getDefaultValues;
			QuickFilterManager.propagateValues = ovl_cardbookAbout3Pane.origFunctions.propagateValues;
		}
	};
};

(function() {
	// Keep a reference to the original function.
	ovl_cardbookAbout3Pane.origFunctions.reflectFiltererState = window.quickFilterBar.reflectFiltererState;

	// Override a function.
	// window.quickFilterBar.reflectFiltererState
	window.quickFilterBar.reflectFiltererState = function(aFilterName) {
		if (!QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.defineFilter(ovl_cardbookAbout3Pane.ABFacetingFilter);
		}

		// If we aren't visible then there is no need to update the widgets.
		if (window.quickFilterBar.filterer.visible) {
			let filterValues = window.quickFilterBar.filterer.filterValues;
			for (let filterDef of QuickFilterManager.filterDefs) {
				// If we only need to update one state, check and skip as appropriate.
				if (aFilterName && filterDef.name != aFilterName) {
					continue;
				}

				let domNode = document.getElementById(filterDef.domId);
				let value = filterDef.name in filterValues ? filterValues[filterDef.name] : null;
				if (!("reflectInDOM" in filterDef)) {
					domNode.pressed = value;
				} else {
					filterDef.reflectInDOM(domNode, value, document, window.quickFilterBar);
				}
			}
		}

		window.quickFilterBar.reflectFiltererResults();
		window.quickFilterBar.domNode.hidden = !window.quickFilterBar.filterer.visible;

		if (QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.killFilter(ovl_cardbookAbout3Pane.ABFacetingFilter.name);
		}
	};
})();

(function() {
	// Keep a reference to the original function.
	ovl_cardbookAbout3Pane.origFunctions.onMessagesChanged = window.quickFilterBar.onMessagesChanged;

	// Override a function.
	// window.quickFilterBar.onMessagesChanged
	window.quickFilterBar.onMessagesChanged = function() {
		if (!QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.defineFilter(ovl_cardbookAbout3Pane.ABFacetingFilter);
		}

		let filtering = gViewWrapper.search?.userTerms != null;
		let newCount = filtering ? gDBView.numMsgsInView : null;
		window.quickFilterBar.filterer.setFilterValue("results", newCount, true);
	   
		// - postFilterProcess everyone who cares
		// This may need to be converted into an asynchronous process at some point.
		for (let filterDef of QuickFilterManager.filterDefs) {
			if ("postFilterProcess" in filterDef) {
				let preState =
					filterDef.name in window.quickFilterBar.filterer.filterValues
					? window.quickFilterBar.filterer.filterValues[filterDef.name]
					: null;
				let [newState, update, treatAsUserAction] = filterDef.postFilterProcess(
					preState,
					gViewWrapper,
					filtering
				);
				window.quickFilterBar.filterer.setFilterValue(
					filterDef.name,
					newState,
					!treatAsUserAction
				);
				if (update) {
					let domNode = document.getElementById(filterDef.domId);
					// We are passing update as a super-secret data propagation channel
					//  exclusively for one-off cases like the text filter gloda upsell.
					filterDef.reflectInDOM(domNode, newState, document, window.quickFilterBar, update);
				}
			}
		}
	   
		// - Update match status.
		window.quickFilterBar.reflectFiltererState();
		if (QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.killFilter(ovl_cardbookAbout3Pane.ABFacetingFilter.name);
		}
	};
})();

(function() {
	// Keep a reference to the original function.
	ovl_cardbookAbout3Pane.origFunctions.createSearchTerms = QuickFilterManager.createSearchTerms;
	
	// Override a function.
	// QuickFilterManager.createSearchTerms
	QuickFilterManager.createSearchTerms = function(aFilterValues, aTermCreator) {
		if (!QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.defineFilter(ovl_cardbookAbout3Pane.ABFacetingFilter);
		}

		let searchTerms = [],
		listeners = [];
		for (let filterName in aFilterValues) {
			let filterValue = aFilterValues[filterName];
			let filterDef = QuickFilterManager.filterDefsByName[filterName];
			try {
				let listener = filterDef.appendTerms(aTermCreator, searchTerms, filterValue);
				if (listener) {
					listeners.push([listener, filterDef]);
				}
			} catch (ex) {
				console.error(ex);
			}
		}
		if (QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.killFilter(ovl_cardbookAbout3Pane.ABFacetingFilter.name);
		}
		return searchTerms.length ? [searchTerms, listeners] : [null, listeners];
	};
})();


(function() {
	// Keep a reference to the original function.
	ovl_cardbookAbout3Pane.origFunctions.clearAllFilterValues = QuickFilterManager.clearAllFilterValues;

	// Override a function.
	// QuickFilterManager.clearAllFilterValues
	QuickFilterManager.clearAllFilterValues = function(aFilterValues) {
		if (!QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.defineFilter(ovl_cardbookAbout3Pane.ABFacetingFilter);
		}
		let didClearSomething = false;
		for (let filterDef of QuickFilterManager.filterDefs) {
			if (QuickFilterManager.clearFilterValue(filterDef.name, aFilterValues)) {
				didClearSomething = true;
			}
		}
		if (QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.killFilter(ovl_cardbookAbout3Pane.ABFacetingFilter.name);
		}
		return didClearSomething;
	};
})();

(function() {
	// Keep a reference to the original function.
	ovl_cardbookAbout3Pane.origFunctions.clearFilterValue = QuickFilterManager.clearFilterValue;

	// Override a function.
	// QuickFilterManager.clearFilterValue
	QuickFilterManager.clearFilterValue = function(aFilterName, aValues) {
		if (!QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.defineFilter(ovl_cardbookAbout3Pane.ABFacetingFilter);
		}
		let filterDef = QuickFilterManager.filterDefsByName[aFilterName];
		if (!("clearState" in filterDef)) {
			if (aFilterName in aValues) {
				delete aValues[aFilterName];
				if (QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
					QuickFilterManager.killFilter(ovl_cardbookAbout3Pane.ABFacetingFilter.name);
				}
				return true;
			}
			if (QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
				QuickFilterManager.killFilter(ovl_cardbookAbout3Pane.ABFacetingFilter.name);
			}
			return false;
		}

		let curValue = aFilterName in aValues ? aValues[aFilterName] : undefined;
		// Yes, we want to call it to clear its state even if it has no state.
		let [newValue, didClear] = filterDef.clearState(curValue);
		if (newValue != null) {
			aValues[aFilterName] = newValue;
		} else {
			delete aValues[aFilterName];
		}
		if (QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.killFilter(ovl_cardbookAbout3Pane.ABFacetingFilter.name);
		}
		return didClear;
	};
})();

(function() {
	// Keep a reference to the original function.
	ovl_cardbookAbout3Pane.origFunctions.getDefaultValues = QuickFilterManager.getDefaultValues;

	// Override a function.
	// QuickFilterManager.getDefaultValues
	QuickFilterManager.getDefaultValues = function() {
		if (!QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.defineFilter(ovl_cardbookAbout3Pane.ABFacetingFilter);
		}
		let values = {};
		for (let filterDef of QuickFilterManager.filterDefs) {
			if ("getDefaults" in filterDef) {
				let newValue = filterDef.getDefaults();
				if (newValue != null) {
					values[filterDef.name] = newValue;
				}
			}
		}
		if (QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.killFilter(ovl_cardbookAbout3Pane.ABFacetingFilter.name);
		}
		return values;
	};
})();

(function() {
	// Keep a reference to the original function.
	ovl_cardbookAbout3Pane.origFunctions.propagateValues = QuickFilterManager.propagateValues;

	// Override a function.
	// QuickFilterManager.propagateValues
	QuickFilterManager.propagateValues = function(aTemplValues) {
		if (!QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.defineFilter(ovl_cardbookAbout3Pane.ABFacetingFilter);
		}
		let values = {};
		let sticky = "sticky" in aTemplValues ? aTemplValues.sticky : false;
	
		for (let filterDef of QuickFilterManager.filterDefs) {
			if ("propagateState" in filterDef) {
				let curValue =
					filterDef.name in aTemplValues
					? aTemplValues[filterDef.name]
					: undefined;
				let newValue = filterDef.propagateState(curValue, sticky);
				if (newValue != null) {
					values[filterDef.name] = newValue;
				}
			} else if (sticky) {
				// Always propagate the value if sticky and there was no handler.
				if (filterDef.name in aTemplValues) {
					values[filterDef.name] = aTemplValues[filterDef.name];
				}
			}
		}
		if (QuickFilterManager.filterDefsByName[ovl_cardbookAbout3Pane.ABFacetingFilter.name]) {
			QuickFilterManager.killFilter(ovl_cardbookAbout3Pane.ABFacetingFilter.name);
		}
		return values;
	};
})();

