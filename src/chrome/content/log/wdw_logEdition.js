import { cardbookHTMLTools } from "../cardbookHTMLTools.mjs";
import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";
if ("undefined" == typeof(wdw_logEdition)) {
	var wdw_logEdition = {
		
        statusInformation: [],

		displaySelect: async function () {
            wdw_logEdition.statusInformation = await messenger.runtime.sendMessage({query: "cardbook.getStatusInformation"});
			let selectName = "logEditionTable";
			cardbookHTMLTools.deleteRows(selectName);
			let data = wdw_logEdition.statusInformation.map(x => [ x[0] ]);
			let rowParameters = {};
			rowParameters.values = wdw_logEdition.statusInformation.map(x => x[1]);
            let select = document.getElementById(selectName);
			cardbookHTMLTools.addTreeSelect(select, data, rowParameters);
		},
	
		load: function () {
            i18n.updateDocument();
            cardbookHTMLRichContext.loadRichContext();

           	// button
            document.getElementById("refreshLogEditionLabel").addEventListener("click", event => wdw_logEdition.load());
            document.getElementById("flushLogEditionLabel").addEventListener("click", event => wdw_logEdition.flush());
            document.getElementById("clipboardLogEditionLabel").addEventListener("click", event => wdw_logEdition.clipboard());
            document.getElementById("cancelLogEditionLabel").addEventListener("click", event => wdw_logEdition.cancel());

            wdw_logEdition.displaySelect();

            document.addEventListener("keyup", async (event) => {
                if (event.ctrlKey && event.key.toUpperCase() == "A") {
                    wdw_logEdition.selectAllKey();
                    event.preventDefault();
                } else if (event.ctrlKey && event.key.toUpperCase() == "C") {
                    wdw_logEdition.clipboard();
                    event.preventDefault();
                }
            });
		},

		selectAllKey: function () {
            let select = document.getElementById("logEditionTable");
            for (let option of select.options) {
                option.selected = true;
            }
        },

		clipboard: function () {
			try {
				let select = document.getElementById("logEditionTable");
				const { selectedOptions } = select;
				if (selectedOptions) {
					const selectedValues = Array.from(selectedOptions).map(e => e.textContent);
                    navigator.clipboard.writeText(selectedValues.join("\n"));
				}
			}
			catch (e) {
			}
		},

		flush: async function () {
            wdw_logEdition.data = await messenger.runtime.sendMessage({query: "cardbook.flushStatusInformation"});
			await wdw_logEdition.displaySelect();
		},

		cancel: function () {
            cardbookHTMLRichContext.closeWindow();
		}
	};
};

wdw_logEdition.load();