var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardBookEditionObserver = {
	register: function() {
		cardBookObserverRepository.registerAll(this);
	},
	
	unregister: function() {
		cardBookObserverRepository.unregisterAll(this);
	},
	
	observe: function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "cardbook.pref.preferencesChanged":
				wdw_cardEdition.setEditionFields();
				wdw_cardEdition.loadEditionFields();
				wdw_cardEdition.loadFieldSelector();
				wdw_cardEdition.setConvertButtons();
				wdw_cardEdition.changePreviousNext();
				break;
			case "cardbook.mailMode":
				wdw_cardEdition.cancelPreviousNext();
				break;
			case "cardbook.cardbookMode":
				wdw_cardEdition.changePreviousNext();
				break;
		}
	}
};
