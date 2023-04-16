var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { PromptUtils } = ChromeUtils.import("resource://gre/modules/SharedPromptUtils.jsm");

var EXPORTED_SYMBOLS = ["cardbookPasswordManager"];
var cardbookPasswordManager = {

	askPassword: function (aTitle, aText, aUsername, aPassword, aRememberText, aCheck) {
		try {
			let args = {
				promptType: "promptUserAndPass",
				title: aTitle,
				text: aText,
				user: aUsername.value,
				pass: aPassword.value,
				checkLabel: aRememberText,
				checked: aCheck.value,
				ok: false,
			};

			let propBag = PromptUtils.objectToPropBag(args);
			Services.ww.openWindow(
				Services.ww.activeWindow,
				"chrome://global/content/commonDialog.xhtml",
				"_blank",
				"centerscreen,chrome,modal,titlebar",
				propBag
			);
			PromptUtils.propBagToObject(propBag, args);

			// Did user click Ok or Cancel?
			let ok = args.ok;
			if (ok) {
				aCheck.value = args.checked;
				aUsername.value = args.user;
				aPassword.value = args.pass;
			}
			return ok;
		}
		catch (e) {
			return false;
		}
	},

	getRootUrl: function (aUrl) {
		try {
			var urlArray1 = aUrl.split("://");
			var urlArray2 = urlArray1[1].split("/");
			if (urlArray1[0] != "http" && urlArray1[0] != "https") {
				return "";
			}
			return urlArray1[0] + "://" + urlArray2[0];
		}
		catch (e) {
			return "";
		}
	},

	getDomainPassword: function (aDomain) {
		let password = "";
		let foundLogins = Services.logins.findLogins("smtp://smtp." + aDomain, "", "");
		if (foundLogins.length > 0) {
			password = foundLogins[0].password;
		}
		return password;
	},

	getNotNullPassword: function (aUsername, aPrefId, aUrl) {
		var myUrl = cardbookRepository.cardbookPreferences.getUrl(aPrefId);
		if (myUrl == "") {
			myUrl = aUrl;
		}
		var result = cardbookPasswordManager.getPassword(aUsername, myUrl);
		if (result == "") {
			var myTitle = cardbookRepository.extension.localeData.localizeMessage("wdw_passwordMissingTitle");
			var commonStrBundle = Services.strings.createBundle("chrome://global/locale/commonDialogs.properties");
			var myText = commonStrBundle.formatStringFromName("EnterPasswordFor", [aUsername, myUrl], 2);
			var myUsername = {value: aUsername};
			var myPassword = {value: ""};
			var myRememberText = cardbookRepository.extension.localeData.localizeMessage("rememberPassword");
			var check = {value: false};
			if (cardbookPasswordManager.askPassword(myTitle, myText, myUsername, myPassword, myRememberText, check)) {
				cardbookPasswordManager.rememberPassword(aUsername, myUrl, myPassword.value, check.value);
				return myPassword.value;
			}
		}
		return result;
	},

	getChangedPassword: function (aUsername, aPrefId) {
		var myUrl = cardbookRepository.cardbookPreferences.getUrl(aPrefId);
		var myTitle = cardbookRepository.extension.localeData.localizeMessage("wdw_passwordWrongTitle");
		var commonStrBundle = Services.strings.createBundle("chrome://global/locale/commonDialogs.properties");
		var myText = commonStrBundle.formatStringFromName("EnterPasswordFor", [aUsername, myUrl], 2);
		var myUsername = {value: aUsername};
		var myPassword = {value: ""};
		var myRememberText = cardbookRepository.extension.localeData.localizeMessage("rememberPassword");
		var check = {value: false};
		if (cardbookPasswordManager.askPassword(myTitle, myText, myUsername, myPassword, myRememberText, check)) {
			cardbookPasswordManager.rememberPassword(aUsername, myUrl, myPassword.value, check.value);
			return myPassword.value;
		}
		return "";
	},

	getPassword: function (aUsername, aUrl) {
		var myRootUrl = cardbookPasswordManager.getRootUrl(aUrl);
		if (cardbookRepository.logins[aUsername] && cardbookRepository.logins[aUsername][myRootUrl]) {
			return cardbookRepository.logins[aUsername][myRootUrl];
		} else {
			if (aUrl == cardbookRepository.cardbookOAuthData.GOOGLE.AUTH_PREFIX_CONTACTS ||
				aUrl == cardbookRepository.cardbookOAuthData.GOOGLE.AUTH_PREFIX_LABELS ||
				aUrl == cardbookRepository.cardbookOAuthData.GOOGLE2.AUTH_PREFIX_CONTACTS ||
				aUrl == cardbookRepository.cardbookOAuthData.GOOGLE3.AUTH_PREFIX_CONTACTS) {
				var logins = Services.logins.findLogins(aUrl, "User Refresh Token", null);
			} else {
				var logins = Services.logins.findLogins(cardbookPasswordManager.getRootUrl(aUrl), "User login", null);
			}
			for (var i = 0; i < logins.length; i++) {
				if (logins[i].username == aUsername) {
					return logins[i].password;
				}
			}
		}
		return "";
	},

	addPassword: function (aUsername, aUrl, aPassword) {
		var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");
		if (aUrl.startsWith(cardbookRepository.oauthPrefix)) {
			// google case
			var login_info = new nsLoginInfo(aUrl, "User Refresh Token", null, aUsername, aPassword, "", "");
		} else {
			var login_info = new nsLoginInfo(cardbookPasswordManager.getRootUrl(aUrl), "User login", null, aUsername, aPassword, "", "");
		}
		Services.logins.addLogin(login_info);
		return true;
	},

	removePassword: function (aUsername, aUrl) {
		if (aUrl.startsWith(cardbookRepository.oauthPrefix)) {
			// google case
			var logins = Services.logins.findLogins(aUrl, "User Refresh Token", null);
		} else {
			var logins = Services.logins.findLogins(cardbookPasswordManager.getRootUrl(aUrl), "User login", null);
		}
		for (var i = 0; i < logins.length; i++) {
			if (logins[i].username == aUsername) {
				Services.logins.removeLogin(logins[i]);
				return true;
			}
		}
		return false;
	},

	rememberPassword: function (aUsername, aUrl, aPassword, aSave) {
		if (aUsername && aPassword) {
			if (aSave) {
				cardbookPasswordManager.removePassword(aUsername, aUrl);
				cardbookPasswordManager.addPassword(aUsername, aUrl, aPassword);
			} else {
				cardbookRepository.logins[aUsername] = {};
				cardbookRepository.logins[aUsername][cardbookPasswordManager.getRootUrl(aUrl)] = aPassword;
			}
		}
	}

};
