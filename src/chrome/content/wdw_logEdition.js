if ("undefined" == typeof(wdw_logEdition)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/scripts/notifyTools.js", this);

	var wdw_logEdition = {
		
		displaySelect: function () {
			let selectName = "logEditionTable";
			cardbookElementTools.deleteRows(selectName);
			let data = cardbookRepository.statusInformation.map(x => [ x[0] ]);
			let rowParameters = {};
			rowParameters.values = cardbookRepository.statusInformation.map(x => x[1]);
			cardbookElementTools.addTreeSelect(selectName, data, rowParameters);
		},
	
		load: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			wdw_logEdition.displaySelect();
		},

		selectAllKey: function () {
			let select = document.getElementById("logEditionTable");
			for (let child of select.childNodes) {
				child.setAttribute("selected", "true");
			}
		},

		clipboard: function () {
			try {
				let select = document.getElementById("logEditionTable");
				const { selectedOptions } = select;
				if (selectedOptions) {
					const selectedValues = Array.from(selectedOptions).map(e => e.value);
					cardbookClipboard.clipboardSetText(selectedValues.join("\n"));
				}
			}
			catch (e) {
				let errorTitle = "clipboard error";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		flush: function () {
			cardbookRepository.statusInformation = [];
			wdw_logEdition.displaySelect();
		},

		cancel: function () {
			close();
		}
	};
};


document.addEventListener("DOMContentLoaded", wdw_logEdition.load);
