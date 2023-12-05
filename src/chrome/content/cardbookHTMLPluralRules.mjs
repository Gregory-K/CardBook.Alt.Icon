export var cardbookHTMLPluralRules = {
	getPluralMessage: function (message, params) {
        // https://developer.mozilla.org.cach3.com/en/Localization_and_Plurals
        // ar : zero, one, two, few, many, other
        // cs, sk : one, few, other
        // da, de, el, hu, it, en-US, es-ES, nl, pt-PT, sv-SE, vi : one, other
        // fr, pt-BR : one, other
        // hr, ru, uk : one, few, other
        // id, ja, ko, tr, zh-CN : other
        // lt : one, few, other
        // pl : one, few, many
        // ro : one, few, other
        // sl : one, two, few, other
        let rules = { "ar": [ "zero", "one", "two", "few", "many", "other" ],
                        "cs": [ "one", "few", "other" ],
                        "da": [ "one", "other" ],
                        "de": [ "one", "other" ],
                        "el": [ "one", "other" ],
                        "en-US": [ "one", "other" ],
                        "es-ES": [ "one", "other" ],
                        "fr": [ "one", "other" ],
                        "hr": [ "one", "few", "other" ],
                        "hu": [ "one", "other" ],
                        "id": [ "other" ],
                        "it": [ "one", "other" ],
                        "ja": [ "other" ],
                        "ko": [ "other" ],
                        "lt": [ "one", "few", "other" ],
                        "nl": [ "one", "other" ],
                        "pl": [ "one", "few", "many" ],
                        "pt-BR": [ "one", "other" ],
                        "pt-PT": [ "one", "other" ],
                        "ro": [ "one", "few", "other" ],
                        "ru": [ "one", "few", "other" ],
                        "sk": [ "one", "few", "other" ],
                        "sl": [ "one", "two", "few", "other" ],
                        "sv-SE": [ "one", "other" ],
                        "tr": [ "other" ],
                        "uk": [ "one", "few", "other" ],
                        "vi": [ "one", "other" ],
                        "zh-CN": [ "other" ] };
        let pluralizer = new Intl.PluralRules(navigator.language, {type: 'cardinal'});
        let lang = navigator.language;
        if (!rules[lang]) {
            lang = "en-US";
        }

        let num = params[0];
        let selector = pluralizer.select(num);
        let messages = browser.i18n.getMessage(message, params).split(";");
        let pluralizedMessage = messages[rules[lang].indexOf(selector)];
        return pluralizedMessage;
    }
};