if ("undefined" == typeof(wdw_logEdition)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var wdw_bulkOperation = {
		
		lTimerBulkOperation: {},
		
		load: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });

			document.getElementById('closeEditionLabel').addEventListener("input", wdw_bulkOperation.cancel, false);
			document.getElementById('closeEditionLabel').addEventListener("click", wdw_bulkOperation.cancel, false);

			wdw_bulkOperation.lTimerBulkOperation[1] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerBulkOperation = wdw_bulkOperation.lTimerBulkOperation[1];
			lTimerBulkOperation.initWithCallback({ notify: function(lTimerBulkOperation) {
						let close = true;
						for (let actionId in cardbookRepository.currentAction) {
							let total = cardbookRepository.currentAction[actionId].totalCards;
							let done = cardbookRepository.currentAction[actionId].doneCards;
							let message = cardbookRepository.currentAction[actionId].message;
							// console.log("test : " + message + " : " + done + " / " + total)
							if (total != done) {
								if (!(document.getElementById("bulkProgressmeter_" + actionId))) {
									let currentRow = cardbookElementTools.addTableRow(document.getElementById("bulkOperationTable"), 'bulkOperationRow_' + actionId);
									let labelData = cardbookElementTools.addTableData(currentRow, 'bulkOperationRowLabel_' + actionId + '.1');
									cardbookElementTools.addLabel(labelData, 'bulkOperationRowLabel_' + actionId, message, 'bulkOperationProgressmeter_' + actionId);
									let progressmeterData = cardbookElementTools.addTableData(currentRow, 'bulkOperationRowLabel_' + actionId + '.2');
									cardbookElementTools.addProgressmeter(progressmeterData, "bulkProgressmeter_" + actionId);
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

document.addEventListener("DOMContentLoaded", wdw_bulkOperation.load);
