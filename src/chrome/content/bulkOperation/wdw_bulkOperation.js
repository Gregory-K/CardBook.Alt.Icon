import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";

if ("undefined" == typeof(wdw_logEdition)) {
	var wdw_bulkOperation = {
		timer: {},

		load: async function () {
            i18n.updateDocument();
            cardbookHTMLRichContext.loadRichContext();

           	// button
            document.getElementById("closeEditionLabel").addEventListener("click", event => wdw_bulkOperation.cancel());

			wdw_bulkOperation.timer = setInterval( async () => {
                let count = 0;
                let table = document.getElementById("bulkOperationTable");
                let actions = await messenger.runtime.sendMessage({query: "cardbook.getCurrentActions"});
                for (let actionId in actions) {
                    try {
                        let totalEstimatedCards = actions[actionId].totalEstimatedCards;
                        let total = actions[actionId].totalCards;
                        let done = actions[actionId].doneCards;
                        let message = actions[actionId].message;
                        if (!(document.getElementById("bulkProgressmeter_" + actionId))) {
                            let currentRow = cardbookHTMLTools.addHTMLTR(table, `bulkOperationRow_${actionId}`);
                            let labelData = cardbookHTMLTools.addHTMLTD(currentRow, `bulkOperationRowLabel_${actionId}.1`);
                            cardbookHTMLTools.addHTMLLABEL(labelData, `bulkOperationRowLabel_${actionId}`, message);
                            let progressmeterData = cardbookHTMLTools.addHTMLTD(currentRow,  `bulkOperationRowLabel_${actionId}.2`);
                            cardbookHTMLTools.addHTMLPROGRESS(progressmeterData, `bulkProgressmeter_${actionId}`);
                        }
                        let totalEstimated = totalEstimatedCards || total;
                        let value = Math.round(done / totalEstimated * 100);
                        document.getElementById(`bulkProgressmeter_${actionId}`).value = value;
                    } catch(e) {}
                }
                // delete finished
                let rows = table.querySelectorAll("tr");
                for (let row of rows) {
                    let actionId = row.id.replace('bulkOperationRow_', '');
                    if (actions[actionId] && actions[actionId].doneCards) {
                        count++
                    } else {
                        table.removeChild(row);
                    }
                }
                if (!count) {
                    wdw_bulkOperation.cancel();
                }
            }, 1000);
        },

		cancel: function () {
			clearInterval(wdw_bulkOperation.timer);
            cardbookHTMLRichContext.closeWindow();
		}

	};

};

await wdw_bulkOperation.load();