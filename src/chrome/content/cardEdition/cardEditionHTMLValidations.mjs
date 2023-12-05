export var cardEditionHTMLValidations = {
	validateOffice365: async function (aCard) {
		let dirPrefId = document.getElementById('addressbookMenulist').value;
		let ABType = cardbookNewPreferences.getType(dirPrefId);

		if (ABType != "OFFICE365") {
			return true;
		}

		for (let field of ['suffixname', 'prefixname', 'role']) {
			let fieldValue = document.getElementById(`${field}TextBox`).value.trim();
			if (fieldValue) {
				let fieldLabel = document.getElementById(`${field}Label`).value.trim();
				cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365Field", [fieldLabel, fieldValue]);
				return false;
			}
		}

		let i = 0;
		while (true) {
			if (document.getElementById(`event_${i}_hbox`)) {
				let eventDate = document.getElementById('event_' + i + '_valueDateBox').value.trim();
				let eventName = document.getElementById('event_' + i + '_valueBox').value.trim();
				if (eventDate || eventName) {
					let fieldLabel = document.getElementById('event_caption').value.trim();
					cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365Field", [fieldLabel, eventDate + " : " + eventName]);
					return false;
				}
				i++;
			} else {
				break;
			}
		}

		i = 0;
		while (true) {
			if (document.getElementById(`url_${i}_hbox`)) {
				let urlName = document.getElementById('url_' + i + '_valueBox').value.trim();
				if (urlName) {
					let fieldLabel = document.getElementById('url_caption').value.trim();
					cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365Field", [fieldLabel, urlName]);
					return false;
				}
				i++;
			} else {
				break;
			}
		}

		i = 0;
		let emailQuota = 3;
		let emailCount = 0;
		while (true) {
			if (document.getElementById(`email_${i}_hbox`)) {
				let emailName = document.getElementById('email_' + i + '_valueBox').value.trim();
				if (emailName) {
					emailCount++;
					if (emailCount > emailQuota) {
						cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365Email");
						return false;
					}
				}
				i++;
			} else {
				break;
			}
		}

		i = 0;
		let imppQuota = 1;
		let imppCount = 0;
		while (true) {
			if (document.getElementById(`impp_${i}_hbox`)) {
				let imppName = document.getElementById('impp_' + i + '_valueBox').value.trim();
				if (imppName) {
					imppCount++;
					if (imppCount > imppQuota) {
						cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365Impp");
						return false;
					}
				}
				i++;
			} else {
				break;
			}
		}

		i = 0;
		let adrQuota = 3;
		let adrCount = 0;
		while (true) {
			if (document.getElementById(`adr_${i}_hbox`)) {
				let adrName = document.getElementById('adr_' + i + '_valueBox').value.trim();
				if (adrName) {
					adrCount++;
					if (adrCount > adrQuota) {
						cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365Adr");
						return false;
					}
				}
				i++;
			} else {
				break;
			}
		}

		i = 0;
		let telQuota = 17;
		let telCount = 0;
		while (true) {
			if (document.getElementById(`tel_${i}_hbox`)) {
				let telName = document.getElementById('tel_' + i + '_valueBox').value.trim();
				if (telName) {
					telCount++;
					if (telCount > telQuota) {
						cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365Tel");
						return false;
					}
				}
				i++;
			} else {
				break;
			}
		}

		for (let field of cardbookHTMLTypes.multilineFields) {
			aCard[field] = cardbookWindowUtils.getAllTypes(field, true);
		}

		let telTypeQuota = { "assistanttype": 1, "workfaxtype": 1, "callbacktype": 1, "carphonetype": 1, "pagertype": 1,
							"telextype": 1, "ttytype": 1, "radiotype": 1, "worktype": 3, "homefaxtype": 1, "otherfaxtype": 1,
							"hometype": 2, "celltype": 1, "othertype": 1 };
		let telTypeCount = { "assistanttype": 0, "workfaxtype": 0, "callbacktype": 0, "carphonetype": 0, "pagertype": 0,
							"telextype": 0, "ttytype": 0, "radiotype": 0, "worktype": 0, "homefaxtype": 0, "otherfaxtype": 0,
							"hometype": 0, "celltype": 0, "othertype": 0 };
		for (let tel of aCard.tel) {
			let type = await cardbookHTMLTypes.getCodeType("tel", aCard.dirPrefId, tel[1]).result;
			if (type) {
				telTypeCount[type]++;
			} else {
				let fieldLabel = document.getElementById('tel_caption').value.trim();
				cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365EmptyType", [fieldLabel]);
				return false;
			}
		}
		for (let type in telTypeCount) {
			if (telTypeCount[type] > telTypeQuota[type]) {
				let fieldLabel = document.getElementById('tel_caption').value.trim();
				let fieldType = messenger.i18n.getMessage(type);
				cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365Type", [fieldLabel, fieldType, telTypeQuota[type]]);
				return false;
			}
		}

		let adrTypeQuota = { "worktype": 1, "hometype": 1, "othertype": 1 };
		let adrTypeCount = { "worktype": 0, "hometype": 0, "othertype": 0 };
		for (let adr of aCard.adr) {
			let type = await cardbookHTMLTypes.getCodeType("adr", aCard.dirPrefId, adr[1]).result;
			if (type) {
				adrTypeCount[type]++;
			} else {
				let fieldLabel = document.getElementById('adr_caption').value.trim();
				cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365EmptyType", [fieldLabel]);
				return false;
			}
		}
		for (let type in adrTypeCount) {
			if (adrTypeCount[type] > adrTypeQuota[type]) {
				let fieldLabel = document.getElementById('adr_caption').value.trim();
				let fieldType = messenger.i18n.getMessage(type);
				cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365Type", [fieldLabel, fieldType, adrTypeQuota[type]]);
				return false;
			}
		}

		if (wdw_cardEdition.workingCard.isAList) {
			for (let field of ['firstname', 'othername', 'lastname', 'nickname', 'bday', 'title', 'birthplace', 'deathplace', 'deathplace', 'anniversary']) {
				let fieldValue = document.getElementById(`${field}TextBox`).value.trim();
				if (fieldValue) {
					let fieldLabel = document.getElementById(`${field}Label`).value.trim();
					cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365Field", [fieldLabel, fieldValue]);
					return false;
				}
			}
			let j = 0;
			while (true) {
				if (document.getElementById(`orgTextBox_${j}`)) {
					let fieldValue = document.getElementById(`orgTextBox_${j}`).value.trim();
					if (fieldValue) {
						let fieldLabel = document.getElementById(`orgLabel_${j}`).value.trim();
						cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365Field", [fieldLabel, fieldValue]);
						return false;
					}
					j++;
				} else {
					break;
				}
			}
			for (let addedCardLine of wdw_cardEdition.cardbookeditlists.addedCardsTree) {
				if (addedCardLine[5] == "EMAIL") {
					let email = addedCardLine[1];
					let card = await messenger.runtime.sendMessage({query: "cardbook.getCardFromEmail", email: email, dirPrefId: dirPrefId});
					if (!card) {
						cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "invalidOffice365Member", [email]);
						return false;
					}
				}
			}
		}
		return true;
	},

	validateMailPopularity: function () {
		var limit = 100000;
		var i = 0;
		while (true) {
			if (document.getElementById('emailproperty_' + i + '_Row')) {
				var field = messenger.i18n.getMessage("popularityLabel");
				var data = document.getElementById('popularity_' + i + '_Textbox').value.trim() * 1;
				if (data && (data > limit)) {
					cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "validateIntegerMsg", [field, limit, data]);
					return false;
				}
				i++;
			} else {
				break;
			}
		}
		return true;
	},

	validateDateFields: async function () {
		var dateFormat = await cardbookHTMLUtils.getDateFormat(wdw_cardEdition.workingCard.dirPrefId, wdw_cardEdition.workingCard.version);
		for (var field of cardbookHTMLDates.dateFields) {
			if (document.getElementById(field + 'InputText')) {
				var myValue = document.getElementById(field + 'InputText').value.trim();
				if (myValue.length > 0) {
					var isDate = cardbookHTMLDates.convertDateStringToDateUTC(myValue, dateFormat);
					if (isDate == "WRONGDATE") {
						cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "dateEntry2Wrong", [myValue, dateFormat]);
						return false;
					}
				}
			}
		}
		var i = 0;
		while (true) {
			if (document.getElementById('event_' + i + '_hbox')) {
				var myEventDate = document.getElementById('event_' + i + '_valueDateBox').value.trim();
				if (myEventDate != "") {
					var isDate = cardbookHTMLDates.convertDateStringToDateUTC(myEventDate, dateFormat);
					if (isDate == "WRONGDATE") {
						cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "dateEntry2Wrong", [myEventDate, dateFormat]);
						return false;
					}
				}
				i++;
			} else {
				break;
			}
		}
		return true;
	},

	validateEvents: function () {
		var i = 0;
		while (true) {
			if (document.getElementById('event_' + i + '_hbox')) {
				var myEventDate = document.getElementById('event_' + i + '_valueDateBox').value.trim();
				var myEventName = document.getElementById('event_' + i + '_valueBox').value.trim();
				if (myEventDate != "" && myEventName != "") {
					i++;
					continue;
				} else if (myEventDate == "" && myEventName == "") {
					i++;
					continue;
				} else if (myEventDate == "") {
					cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "eventDateNull", []);
					return false;
				} else if (myEventName == "") {
					cardbookHTMLNotification.setNotification(wdw_cardEdition.notificationMessage, "eventNameNull", []);
					return false;
				}
			} else {
				break;
			}
		}
		return true;
	}

};
