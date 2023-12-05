import { cardbookHTMLRichContext } from "../cardbookHTMLRichContext.mjs";


if ("undefined" == typeof(wdw_cardbookAskUser)) {
	var wdw_cardbookAskUser = {
		choice: [],
        dirPrefId: "",
        type: "",
        message: "",
        buttons: "",
        button1: "",
        button2: "",
        button3: "",
        button4: "",
		resultGiven: false,

		load: function () {
            let urlParams = new URLSearchParams(window.location.search);
            wdw_cardbookAskUser.dirPrefId = urlParams.get("dirPrefId");
            wdw_cardbookAskUser.type = urlParams.get("type");
            wdw_cardbookAskUser.message = urlParams.get("message");
            wdw_cardbookAskUser.buttons = urlParams.get("buttons");
			let tmpArray = wdw_cardbookAskUser.buttons.split("::")
            wdw_cardbookAskUser.button1 = tmpArray[0];
            wdw_cardbookAskUser.button2 = tmpArray[1];
            wdw_cardbookAskUser.button3 = tmpArray[2];
            wdw_cardbookAskUser.button4 = tmpArray[3];

            i18n.updateDocument();
            cardbookHTMLRichContext.loadRichContext();
        
            // button
            document.getElementById('askUserButton1').addEventListener("click", event => wdw_cardbookAskUser.fireButton(event));
            document.getElementById('askUserButton2').addEventListener("click", event => wdw_cardbookAskUser.fireButton(event));
            document.getElementById('askUserButton3').addEventListener("click", event => wdw_cardbookAskUser.fireButton(event));
            document.getElementById('askUserButton4').addEventListener("click", event => wdw_cardbookAskUser.fireButton(event));

			document.title = messenger.i18n.getMessage(wdw_cardbookAskUser.type + "AskUserTitle");
			document.getElementById('messageLabel').textContent =wdw_cardbookAskUser.message;
			document.getElementById('askUserButton1').textContent = messenger.i18n.getMessage(wdw_cardbookAskUser.type + wdw_cardbookAskUser.button1 + "AskUserLabel");
			wdw_cardbookAskUser.choice.push(wdw_cardbookAskUser.button1);
			document.getElementById('askUserButton2').textContent = messenger.i18n.getMessage(wdw_cardbookAskUser.type + wdw_cardbookAskUser.button2 + "AskUserLabel");
			wdw_cardbookAskUser.choice.push(wdw_cardbookAskUser.button2);
			if (wdw_cardbookAskUser.button3) {
				document.getElementById('askUserButton3').textContent = messenger.i18n.getMessage(wdw_cardbookAskUser.type + wdw_cardbookAskUser.button3 + "AskUserLabel");
				document.getElementById('askUserButton3').hidden = false;
				wdw_cardbookAskUser.choice.push(wdw_cardbookAskUser.button3);
			} else {
				document.getElementById('askUserButton3').hidden = true;
			}
			if (wdw_cardbookAskUser.button4) {
				document.getElementById('askUserButton4').textContent = messenger.i18n.getMessage(wdw_cardbookAskUser.type + wdw_cardbookAskUser.button4 + "AskUserLabel");
				document.getElementById('askUserButton4').hidden = false;
				wdw_cardbookAskUser.choice.push(wdw_cardbookAskUser.button4);
			} else {
				document.getElementById('askUserButton4').hidden = true;
			}
		},

		fireButton: async function (aEvent) {
			wdw_cardbookAskUser.resultGiven = true;
			let myButton = aEvent.target.id.replace("askUser", "").toLowerCase();
			await messenger.runtime.sendMessage({query: "cardbook.askUser.sendChoice", dirPrefId: wdw_cardbookAskUser.dirPrefId, buttons: wdw_cardbookAskUser.buttons, message: wdw_cardbookAskUser.message,
													result: wdw_cardbookAskUser[myButton], confirm: document.getElementById('confirmCheckBox').checked});
			cardbookHTMLRichContext.closeWindow();
		},

		close: async function () {
			if (wdw_cardbookAskUser.resultGiven === false) {
				await messenger.runtime.sendMessage({query: "cardbook.askUser.sendChoice", dirPrefId: wdw_cardbookAskUser.dirPrefId, buttons: wdw_cardbookAskUser.buttons, message: wdw_cardbookAskUser.message,
																result: "cancel", confirm: false});
			}
			cardbookHTMLRichContext.closeWindow();
		}
	};
};

messenger.runtime.onMessage.addListener( (info) => {
	switch (info.query) {
		case "cardbook.askUser.importConflictChoicePersist":
			if (info.dirPrefId == wdw_cardbookAskUser.dirPrefId &&
				info.buttons == wdw_cardbookAskUser.buttons) {
				wdw_cardbookAskUser.resultGiven = true;
				wdw_cardbookAskUser.close();
			}
			break;
		}
});

window.addEventListener("resize", async function() {
	await cardbookHTMLRichContext.saveWindowSize();
});

window.addEventListener("beforeunload", async function() {
	if (wdw_cardbookAskUser.resultGiven === false) {
		await messenger.runtime.sendMessage({query: "cardbook.askUser.sendChoice", dirPrefId: wdw_cardbookAskUser.dirPrefId, buttons: wdw_cardbookAskUser.buttons, message: wdw_cardbookAskUser.message,
														result: "cancel", confirm: false});
	}
});

await wdw_cardbookAskUser.load();

