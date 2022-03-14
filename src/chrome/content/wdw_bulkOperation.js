if ("undefined" == typeof(wdw_logEdition)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var wdw_bulkOperation = {
		
		lTimerBulkOperation: {},
		
		load: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			wdw_bulkOperation.lTimerBulkOperation[1] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerBulkOperation = wdw_bulkOperation.lTimerBulkOperation[1];
			lTimerBulkOperation.initWithCallback({ notify: function(lTimerBulkOperation) {
						let close = true;
						for (let actionId in cardbookRepository.currentAction) {
							let total = cardbookRepository.currentAction[actionId].totalCards;
							let done = cardbookRepository.currentAction[actionId].doneCards;
							let message = cardbookRepository.currentAction[actionId].message;
							if (total != done) {
								if (!(document.getElementById("bulkProgressmeter_" + actionId))) {
									let currentRow = cardbookElementTools.addGridRow(document.getElementById("bulkOperationRows"), 'bulkOperationRow_' + actionId, {align: 'center'});
									cardbookElementTools.addLabel(currentRow, 'bulkOperationRowLabel_' + actionId, message, 'bulkOperationProgressmeter_' + actionId);
									cardbookElementTools.addProgressmeter(currentRow, "bulkProgressmeter_" + actionId);
								}
								let totalEstimated = cardbookRepository.currentAction[actionId].totalEstimatedCards || total;
								let value = Math.round(done / totalEstimated * 100);
								document.getElementById("bulkProgressmeter_" + actionId).value = value;
								close = false;
							}
						}
						if (close) {
							wdw_bulkOperation.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		cancel: function () {
			wdw_bulkOperation.lTimerBulkOperation[1].cancel();
			close();
		}

	};

};
