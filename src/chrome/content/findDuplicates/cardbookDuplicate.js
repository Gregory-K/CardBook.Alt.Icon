if ("undefined" == typeof(cardbookDuplicate)) {
	var cardbookDuplicate = {

		generateCardArray: function (aCard) {
			try {
				let myResultTry = [];
				let myResultSure = {id: "", firstname: "", lastname: "", tel: [], email: []};
				for (let field of [ "firstname" , "lastname" ]) {
					if (aCard[field]) {
						myResultTry.push(cardbookRepository.makeSearchStringWithoutNumber(aCard[field]));
						myResultSure[field] = cardbookRepository.makeSearchStringWithoutNumber(aCard[field]);
					}
				}
				for (let emailLine of aCard.email) {
					let email = emailLine[0][0];
					var myCleanEmail = email.replace(/([\\\/\:\*\?\"\'\-\<\>\| ]+)/g, "").replace(/([0123456789]+)/g, "").toUpperCase();
					var myEmailArray = myCleanEmail.split("@");
					var myEmailArray1 = myEmailArray[0].replace(/([^\+]*)(.*)/, "$1").split(".");
					myResultTry = myResultTry.concat(myEmailArray1);
					myResultSure.email.push(email.toUpperCase());
				}
				for (let telLine of aCard.tel) {
					let tel = telLine[0][0];
					tel = cardbookRepository.cardbookUtils.formatTelForSearching(tel);
					myResultSure.tel.push(tel);
				}
				myResultSure.id = aCard.uid;
				myResultTry = cardbookRepository.arrayUnique(myResultTry);
				return {resultTry : myResultTry, resultSure : myResultSure};
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookDuplicate.generateCardArray error : " + e, "Error");
			}
		},

		compareCardArrayTry: function (aArray1, aArray2) {
			try {
				if (aArray1.length == 1) {
					if (aArray2.length != 1) {
						return false;
					} else if (aArray1[0] == aArray2[0]) {
						return true;
					} else {
						return false;
					}
				} else {
					var count = 0;
					for (var i = 0; i < aArray1.length; i++) {
						for (var j = 0; j < aArray2.length; j++) {
							if (aArray1[i] == aArray2[j]) {
								count++;
								break;
							}
						}
						if (count == 2) {
							return true;
						}
					}
				}
				return false;
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookDuplicate.compareCardArrayTry error : " + e, "Error");
			}
		},

		compareCardArraySure: function (aArray1, aArray2) {
			try {
				if (aArray1.lastname && aArray1.firstname && aArray2.lastname && aArray2.firstname) {
					if ((aArray1.lastname == aArray2.lastname && aArray1.firstname == aArray2.firstname) ||
						(aArray1.lastname == aArray2.firstname && aArray1.firstname == aArray2.lastname)) {
						return true;
					}
				}
				for (let field of [ "email" , "tel" ]) {
					for (var i = 0; i < aArray1[field].length; i++) {
						for (var j = 0; j < aArray2[field].length; j++) {
							if (aArray1[field][i] == aArray2[field][j]) {
								return true;
								break;
							}
						}
					}
				}
				return false;
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookDuplicate.compareCardArraySure error : " + e, "Error");
			}
		},

		mergeOne: async function (aRecord, aSourceCat, aTargetCat, aActionId) {
			let myOutCard = new cardbookCardParser();
			myOutCard.dirPrefId = aRecord[0].dirPrefId;
			myOutCard.version = aRecord[0].version;
			
			for (var j of [ 'photo' ]) {
				var dirname = cardbookRepository.cardbookPreferences.getName(myOutCard.dirPrefId);
				var image = {};
				await cardbookIDBImage.getImage(j, dirname, aRecord[0].dirPrefId+"::"+aRecord[0].uid, aRecord[0].fn)
					.then(imageFound => {
						if (imageFound && imageFound.content && imageFound.extension) {
							image = imageFound;
			 			}})
					.catch( () => {} );
				if (image.content && image.content != "") {
					myOutCard[j].value = image.content;
					myOutCard[j].extension = image.extension;
				} else {
					var out = false;
					for (var k = 1; k < aRecord.length; k++) {
						await cardbookIDBImage.getImage(j, dirname, aRecord[k].dirPrefId+"::"+aRecord[k].uid, aRecord[k][j].fn)
							.then(image => {
								if (image && image.content && image.extension) {
									myOutCard[j].value = image.content;
									myOutCard[j].extension = image.extension;
									out = true;
								}
							})
							.catch( () => { } );
						if (out == true) {
							break;
						}
					}
				}
			}
			var fields = cardbookRepository.allColumns.display.concat(cardbookRepository.allColumns.personal);
			fields = fields.concat(cardbookRepository.allColumns.org);
			for (let j of fields) {
				myOutCard[j] = aRecord[0][j];
				if (!myOutCard[j]) {
					for (let k = 1; k < aRecord.length; k++) {
						if (aRecord[k][j]) {
							myOutCard[j] = JSON.parse(JSON.stringify(aRecord[k][j]));
							break;
						}
					}
				}
			}
			for (let j in cardbookRepository.customFields) {
				for (let k = 0; k < cardbookRepository.customFields[j].length; k++) {
					if (!cardbookRepository.cardbookUtils.getCardValueByField(myOutCard, cardbookRepository.customFields[j][k][0], false).length) {
						for (let l = 1; l < aRecord.length; l++) {
							if (cardbookRepository.cardbookUtils.getCardValueByField(aRecord[l], cardbookRepository.customFields[j][k][0], false).length) {
								myOutCard.others.push(cardbookRepository.customFields[j][k][0] + ":" + cardbookRepository.cardbookUtils.getCardValueByField(aRecord[l], cardbookRepository.customFields[j][k][0], false)[0]);
								break;
							}
						}
					}
				}
			}
			for (let j of cardbookRepository.allColumns.categories) {
				myOutCard[j] = JSON.parse(JSON.stringify(aRecord[0][j]));
				for (let k = 1; k < aRecord.length; k++) {
					myOutCard[j] = myOutCard[j].concat(aRecord[k][j]);
				}
				myOutCard[j] = cardbookRepository.arrayUnique(myOutCard[j]);
			}
			for (let j of cardbookRepository.multilineFields) {
				myOutCard[j] = JSON.parse(JSON.stringify(aRecord[0][j]));
				for (let k = 1; k < aRecord.length; k++) {
					myOutCard[j] = myOutCard[j].concat(aRecord[k][j]);
				}
				for (var k=0; k<myOutCard[j].length; ++k) {
					for (var l=k+1; l<myOutCard[j].length; ++l) {
						if (j == "tel" && cardbookRepository.cardbookUtils.formatTelForSearching(myOutCard[j][k][0][0]) == cardbookRepository.cardbookUtils.formatTelForSearching(myOutCard[j][l][0][0])) {
							myOutCard[j].splice(l--, 1);
						} else if (j != "tel" && myOutCard[j][k][0][0] == myOutCard[j][l][0][0]) {
							myOutCard[j].splice(l--, 1);
						}
					}
				}
			}
			for (let j of [ 'event' ]) {
				for (let k = 0; k < aRecord.length; k++) {
					let myEvents = cardbookRepository.cardbookUtils.getEventsFromCard(aRecord[k].note.split("\n"), aRecord[k].others);
					let dateFormat = cardbookRepository.getDateFormat(aRecord[k].dirPrefId, aRecord[k].version);
					let myPGNextNumber = cardbookRepository.cardbookTypes.rebuildAllPGs(myOutCard);
					cardbookRepository.cardbookUtils.addEventstoCard(myOutCard, myEvents.result, myPGNextNumber, dateFormat);
				}
				// to do array unique
			}
			for (let j of cardbookRepository.allColumns.note) {
				myOutCard[j] = aRecord[0][j];
				if (!myOutCard[j]) {
					for (let k = 1; k < aRecord.length; k++) {
						if (aRecord[k][j]) {
							myOutCard[j] = JSON.parse(JSON.stringify(aRecord[k][j]));
							break;
						}
					}
				}
			}

			for (let card of aRecord) {
				let newCard = new cardbookCardParser();
				await cardbookRepository.cardbookUtils.cloneCard(card, newCard);
				cardbookRepository.addCategoryToCard(newCard, aSourceCat);
				await cardbookRepository.saveCardFromUpdate(card, newCard, aActionId, true);
			}
			cardbookRepository.addCategoryToCard(myOutCard, aTargetCat);
			await cardbookRepository.saveCardFromUpdate({}, myOutCard, aActionId, true);
		}
	};

};
