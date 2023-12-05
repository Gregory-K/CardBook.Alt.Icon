# CardBook Alt.Icon

This is a **fork** of [**CardBook**](https://gitlab.com/CardBook/CardBook), a [Thunderbird](https://www.thunderbird.net/) address book based on the CardDAV and vCard standards.

**CardBook Alt.Icon** simply provides an **alternative** main **icon** more aligned with Thunderbird's toolbar icon design.

Icon Variations (sub-releases):  
- card (`card`)  
  ![card icons](./icons/preview_card.png)
- people (`people`)  
  ![people icons](./icons/preview_people.png)
- people colour (`people_colour`)  
  ![people colour icons](./icons/preview_people_colour.png)
- person (`person`)  
  ![person icons](./icons/preview_person.png)

Homepage:  
GitHub (main) - https://github.com/Gregory-K/CardBook.Alt.Icon  
GitLab (alt.) - https://gitlab.com/Gregory.K/CardBook.Alt.Icon

Version:  
**92.0.1**  
Compatibility:  
113.0a1 <= Thunderbird version <= 116.*


## Branches

### Active

['**T115**'](https://github.com/Gregory-K/CardBook.Alt.Icon/tree/T115) (current):  
113.0a1 <= Thunderbird version >= 116.*

### Archived

['**T102**'](https://github.com/Gregory-K/CardBook.Alt.Icon/tree/T102) (current):  
102.0a1 <= Thunderbird version >= 102.*

['**T91**'](https://github.com/Gregory-K/CardBook.Alt.Icon/tree/T91):  
91.0a1 <= Thunderbird version >= 91.*


## Install / Update

Download the latest (version mentioned above) .xpi [release from GitHub](https://github.com/Gregory-K/CardBook.Alt.Icon/releases) and install it manually into Thunderbird.  
_(drag 'n drop OR "gear menu > Install Add-on From File...")_

Repeat for updates.  
_The "CardBook Alt.Icon" follows the official "CardBook" releases by adding an extra decimal place at the end._

Settings.  
Due to the now altered plugin ID, it does not load the official's extension settings. It has to be reconfigured.


## Caution

This altered extension was only intended for the author's personal use, and it doesn't offer anything more than a different main icon design. It was plain experimentation now being offered "as is" for anyone to try it. It is neither digitally signed nor distributed via the official Thunderbird channels.

You should not use unsigned Add-ons outside the official [Thunderbird Add-ons Repository](https://addons.thunderbird.net/thunderbird/), unless you trust the author/developer or you're able to inspect the source code. It is a serious security risk. The author of the present extension disclaims any responsibility for any damage caused to your Thunderbird installation and CardBook data.

If you are not sure about using this extension, please prefer the official one bellow.


## Notes

The present repository contains only the files needed for an .xpi release.  
The whole codebase resides in a different GitLab repository under the ["Alt.Icon"](https://gitlab.com/Gregory.K/CardBook/-/tree/Alt.Icon) branch.

Versioning: one decimal after the official one  
e.g. `62.9` (official) `62.9.1` (Alt.Icon)


---


# Official "CardBook" extension

[GitLab CardBook Repository](https://gitlab.com/CardBook/CardBook)

[Thunderbird Add-ons listing](https://addons.thunderbird.net/thunderbird/addon/cardbook/?src=hp-dl-featured)


## Official README

***CardBook*** – *a new Thunderbird address book based on the CardDAV and vCard standards*

### Features

* **Autocompletion** in mail address fields and [Lightning](https://addons.thunderbird.net/addon/lightning/) calendar fields
* Manage contacts from messages
* Restrict address book use by mail account (for email autocompletion, email collection and contact registration)
* Easy **[CardDAV](https://en.wikipedia.org/wiki/CardDAV) synchronization**
* Access to **all [vCard](https://en.wikipedia.org/wiki/VCard) data**
* Supports [vCard 3.0](https://en.wikipedia.org/wiki/VCard#vCard_3.0) and [vCard 4.0](https://en.wikipedia.org/wiki/VCard#vCard_4.0) (default)
* **Customizable** data fields
* Unlimited number of custom fields
* Show address on map
* Unlimited categories, email addresses, phone numbers, addresses, chat programs, URLs, calendar events per contact
* Supports colored categories
* [Hierarchized organization support](https://gitlab.com/CardBook/CardBook/merge_requests/405) 
* Phone number validation
* Call phone numbers using softphone, like [TBDialOut](https://addons.thunderbird.net/addon/tbdialout/)
* Connect directly to softphone ([Jami](https://jami.net/), [Linphone](https://www.linphone.org/)) to make phone calls using [SIP](https://en.wikipedia.org/wiki/Session_Initiation_Protocol)
* Address panel
* Connect directly to chat programs 
(Google, 
[Jabber](https://www.jabber.org/), 
[Skype](https://www.skype.com/), 
[QQ](http://www.imqq.com/)) 
to chat using [IMPP](https://en.wikipedia.org/wiki/Instant_Messaging_and_Presence_Protocol)
* Local cache [AES](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)-[CTR](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation#Counter_(CTR)) encryption support (disabled by default)
* [Digest access authentication](https://en.wikipedia.org/wiki/Digest_access_authentication)
* [Drag and drop](https://en.wikipedia.org/wiki/Drag_and_drop) support
* [Saved search](https://en.wikipedia.org/wiki/Saved_search)
* Filter
* Merge contacts modified both locally and on the server
* Find and merge duplicate contacts
* Find all emails related to a contact
* Find all calendar entries related to a contact
* Find ignoring diacritical marks
* Share contacts by email
* Collect outgoing emails
* Contacts stored in [IndexedDB](https://en.wikipedia.org/wiki/Indexed_Database_API)
* Customizable printouts
* Import Thunderbird standard address books
* [CSV](https://en.wikipedia.org/wiki/Comma-separated_values) file export and import
* [VCF](https://en.wikipedia.org/wiki/VCard) file export and import
* Functional [GUI](https://en.wikipedia.org/wiki/Graphical_user_interface)
* Classic and vertical layout
* Anniversary manager
* Export birthdays to [Lightning](https://addons.thunderbird.net/addon/lightning/) add-on
* Task manager
* Supported operating systems 
[Apple macOS](https://en.wikipedia.org/wiki/MacOS), 
[BSD](https://en.wikipedia.org/wiki/Berkeley_Software_Distribution), 
[Linux](https://en.wikipedia.org/wiki/Linux), 
[Microsoft Windows](https://en.wikipedia.org/wiki/Microsoft_Windows)
* [Standalone](https://gitlab.com/CardBook/CardBook#standalone) or fully integrated within Thunderbird
* [Compatible and complementary with add-ons](https://gitlab.com/CardBook/CardBook#compatible-and-complementary-add-ons) 
in the [ATN](https://addons.thunderbird.net/) [ecosystem](https://en.wikipedia.org/wiki/Software_ecosystem)
* [Additional and optional software configuration support](https://gitlab.com/CardBook/CardBook#supports)
* [Automatic configuration](https://gitlab.com/CardBook/CardBook#automatic-configuration)
* Available in many [languages](https://gitlab.com/CardBook/CardBook#translators)
* Fully integrated in the main Thunderbird window (yellow
stars, possibility to edit|remove|add standard and CardBook contacts)
* [Free/Libre Open Source Software (FLOSS)](https://www.gnu.org/philosophy/floss-and-foss.en.html)
* [Comparison of CalDAV and CardDAV client implementations](https://en.wikipedia.org/w/index.php?title=Comparison_of_CalDAV_and_CardDAV_implementations#Client_implementations)
* [User Forum](https://cardbook.6660.eu/)
* [@CardBook](https://twitter.com/CardBookAddon) twitter
* *And many more…*

### Installation

1. [Download CardBook from the official Thunderbird add-on page](https://addons.thunderbird.net/addon/cardbook/)
2. [Installing an Add-on in Thunderbird](https://support.mozilla.org/en-US/kb/installing-addon-thunderbird)

### Installation for Thunderbird Alpha (aka Daily/Nightly) and Beta

The CardBook add-on is also available for:
* [Thunderbird Daily](https://archive.mozilla.org/pub/thunderbird/nightly/latest-comm-central/)
* [Thunderbird Beta](https://www.thunderbird.net/channel/)

[Click here see the CardBook add-on xpi file for Thunderbird ESR, Beta and Daily](https://gitlab.com/CardBook/CardBook/issues/574#note_173609032).
By giving the CardBook add-on developers your feedback [here](https://gitlab.com/CardBook/CardBook/issues/574), you’ll help make the CardBook add-on better for you and your fellow users.
Thanking you in advance.

### Standalone

Once installed, CardBook can also run as a standalone program:<br>
Windows `thunderbird.exe -cardbook`<br>
OSX `thunderbird -cardbook`<br>
Linux `thunderbird -cardbook`

Note: This feature does not currently work with Thunderbird 68+. See [Bug 1552459 not possible to add custom command handler (like thunderbird.exe -test)](https://bugzilla.mozilla.org/show_bug.cgi?id=1552459)

### Compatible and complementary add-ons

[CategoryManager](https://addons.thunderbird.net/addon/categorymanager/),
[Enigmail](https://addons.thunderbird.net/addon/enigmail/),
[Lightning](https://addons.thunderbird.net/addon/lightning/),
[Mail Merge](https://addons.thunderbird.net/addon/mail-merge/),
[Mail Redirect](https://addons.thunderbird.net/addon/mailredirect/),
[Phoenity Icons](https://addons.thunderbird.net/addon/phoenity-icons/),
[Quicktext](https://addons.thunderbird.net/addon/quicktext/),
[Simple Mail Redirection](https://addons.thunderbird.net/addon/simple-mail-redirection/)
and more

### Supports

[1&1 MailXchange](https://www.1and1.com/webmail), 
[atmail](https://www.atmail.com/), 
[Baïkal Server](http://sabre.io/baikal/), 
[Cozy](https://cozy.io/), 
[Cyrus IMAP](https://www.cyrusimap.org/), 
[DAVdroid](https://www.davdroid.com/), 
[DAViCal](https://www.davical.org/), 
[Deepen Dhulla OpenSync App for Android](https://deependhulla.com/android-apps/opensync-app), 
[eclipso](https://www.eclipso.de/), 
[Fastmail](https://www.fastmail.com/), 
[Framagenda](https://framagenda.org/), 
[GMX](https://www.gmx.com/), 
[Google](https://www.google.com/), 
[Horde](https://www.horde.org/), 
[Hover](https://www.hover.com/), 
[iCloud](https://www.icloud.com/),
[Kolab](https://kolab.org/),
[Kolab Now](https://kolabnow.com/),
[Kopano](https://kopano.com/),
macOS Contacts Server, 
[Mail Fence](https://mailfence.com/), 
[Mail-in-a-Box](https://mailinabox.email/), 
[mailbox.org](https://mailbox.org/), 
[MDaemon](http://www.altn.com/), 
[Memotoo](https://www.memotoo.com/), 
[MyPhoneExplorer](https://www.fjsoft.at/), 
[Nextcloud](https://nextcloud.com/), 
[Open-Xchange](https://www.open-xchange.com/), 
[outlook.com/hotmail](https://www.outlook.com/hotmail),
[ownCloud](https://owncloud.org/), 
[Posteo](https://posteo.de/), 
[Radicale](https://radicale.org/), 
[sabre/dav](http://sabre.io/), 
[SecureBlackbox](https://www.secureblackbox.com/), 
[Synology](https://www.synology.com/), 
[Tine 2.0](http://www.tine20.org/), 
[WebDAVBlackbox](https://www.secureblackbox.com/sbb/WebDAVBlackbox/), 
[Xandikos](https://www.xandikos.org/), 
[Yahoo!](https://login.yahoo.com), 
[Yandex](https://yandex.com/), 
[Zarafa](https://www.zarafa.com/), 
[Zentyal](http://www.zentyal.org/), 
[Zimbra](https://www.zimbra.com/), 
[Zoho](https://www.zoho.com/), 
and more

### Automatic configuration

[aol.com](https://mail.aol.com/), 
[fastmail](https://www.fastmail.com/), 
[gmx](https://www.gmx.com/), 
[google](https://www.google.com/), 
[kolabnow.com](https://kolabnow.com/), 
[laposte.net](https://www.laposte.fr/), 
[mail.de](https://www.mail.de/), 
[mailbox.org](https://mailbox.org/),
[mailfence.com](https://mailfence.com/),
[orange.fr](https://www.orange.fr/), 
[posteo](https://posteo.de), 
[web.de](https://web.de/), 
[yahoo!](https://www.yahoo.com/), 
[yandex.ru](https://yandex.ru/), 
[zoho.com](https://www.zoho.com/) 

### Implemented standards

* [RFC 2425 A MIME Content-Type for Directory Information](https://tools.ietf.org/html/rfc2425)
* [RFC 2822 Internet Message Format](https://www.ietf.org/rfc/rfc2822.txt)
* [RFC 4122 A Universally Unique IDentifier (UUID) URN Namespace](https://tools.ietf.org/html/rfc4122)
* [RFC 6350 vCard Format Specification](https://tools.ietf.org/html/rfc6350)
* [RFC 6352 CardDAV: vCard Extensions to Web Distributed Authoring and Versioning (WebDAV)](https://tools.ietf.org/html/rfc6352)
* [RFC 6578 Collection Synchronization for Web Distributed Authoring and Versioning (WebDAV)](https://tools.ietf.org/html/rfc6578)
* [RFC 6764 Locating Services for Calendaring Extensions to WebDAV (CalDAV) and vCard Extensions to WebDAV (CardDAV)](https://tools.ietf.org/html/rfc6764)

### Issues

If you encounter any problems with CardBook please have a look at our [GitLab issue tracker](https://gitlab.com/CardBook/CardBook/issues) and [our forum](https://cardbook.6660.eu/).
If your problem is not listed there, you can do us a great favor by creating a new issue. 
But even if there is already an issue discussing the topic, you could help us by providing additional information in a comment.

When you are creating an issue, please provide the following information:
* a detailed description of the problem
* the situation the problem occurs in and how other people will be able to recreate it, i.e. the steps to reproduce the problem
* your Thunderbird version (you can find this in the main menu at `Help → About Thunderbird`)
* your CardBook version (you can find this in the CardBook Preferences window [title bar](https://en.wikipedia.org/wiki/Window_decoration#Title_bar) `CardBook → Preferences`)
* your operating system and version
* if possible: the **relevant** output of the error console (found at `Tools → Developer Tools → Error Console` / `Ctrl-Shift-J`)

### [Manual](https://gitlab.com/CardBook/CardBook/wikis/home)

CardBook provides an integrated contact management solution with a fully functional and logical [UX](https://en.wikipedia.org/wiki/User_experience) and [UI](https://en.wikipedia.org/wiki/User_interface).

CardBook has been designed to be an efficient and effective tool that does not need a manual to become productive. However, the [CardBook Manual](https://gitlab.com/CardBook/CardBook/wikis/home) may enable the discovery of the features, benefits and workflows of this tool.

You are encouraged to contribute to the [CardBook Manual](https://gitlab.com/CardBook/CardBook/wikis/home) by:
* writing a page about a [feature](https://gitlab.com/CardBook/CardBook#features)
* something else

### Roadmap

* Displays the contact photo/image/picture of the sender/recipient while reading or composing a message, eg. [Display Contact Photo](https://addons.thunderbird.net/addon/display-contact-photo/)
* Better integration with the standard Thunderbird address book
* About the future of Thunderbird, whatever would be the path to the new Thunderbird, I’m [[Philippe Vigneau](https://mail.mozilla.org/pipermail/tb-planning/2017-April/005378.html)] ready and open to work to make [CardBook the new Thunderbird Address Book](https://gitlab.com/CardBook/CardBook#cardbook-the-new-thunderbird-address-book)

### Contribution

You are welcomed to contribute to this project by:
* [voting to replace the Thunderbird Address Book with CardBook](https://gitlab.com/CardBook/CardBook#vote-to-replace-the-thunderbird-address-book-with-cardbook)
* adding or improving the localizations (i.e. translations) of CardBook via [Crowdin](https://crowdin.com/project/cardbook) (if your language is not listed, please create an [issue](https://gitlab.com/CardBook/CardBook/issues))
* creating [issues](https://gitlab.com/CardBook/CardBook/issues) about problems
* creating [issues](https://gitlab.com/CardBook/CardBook/issues) about possible improvements
* helping people who have problems or questions
* improving the documentation
* working on the code ([Thunderbird Style Guide](https://style.thunderbird.net/), [Mozilla Coding Style Guide](https://developer.mozilla.org/docs/Mozilla_Coding_Style_Guide))
* emailing [cardbook.thunderbird@gmail.com](mailto:cardbook.thunderbird@gmail.com) news and media article links about CardBook which can be shared [@CardBook](https://twitter.com/CardBookAddon)
* spreading the word about this great add-on
* improving the [CardBook Manual](https://gitlab.com/CardBook/CardBook/wikis/home)
* adding or improving the localizations (i.e. translations) of the [CardBook Manual](https://gitlab.com/CardBook/CardBook/wikis/home)

### Coders

* Philippe Vigneau (author and maintainer)
* [Alexander Bergmann](https://addons.thunderbird.net/user/tempuser/)
* [John Bieling](https://github.com/jobisoft)
* Sisim Biva
* Patrick Brunschwig
* [Günter Gersdorf](https://addons.thunderbird.net/user/guenter-gersdorf/)
* Axel Grude
* [R. Kent James](https://github.com/rkent)
* Axel Liedtke
* Timothe Litt
* Christoph Mair
* Guillaume Maudoux
* Martin Meyers
* Günther Palfinger
* Boris Prüssmann
* Michael Roland
* Lukáš Tyrychtr
* [YUKI "Piro" Hiroshi (結城 洋志)](https://gitlab.com/piroor)
* Marco Zehe

### Translators

* Ibrahim Mouath ([ar](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/ar)) [حّمل الآن](https://addons.thunderbird.net/ar/addon/cardbook/)
* Michal Blahout ([cs](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/cs)) [Stáhnout](https://addons.thunderbird.net/cs/addon/cardbook/)
* Lukáš Tyrychtr ([cs](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/cs)) [Stáhnout](https://addons.thunderbird.net/cs/addon/cardbook/)
* Johnny Nielsen ([da](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/da)) [Hent nu](https://addons.thunderbird.net/da/addon/cardbook/)
* Alexander Bergmann ([de](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/de)) [Jetzt herunterladen](https://addons.thunderbird.net/de/addon/cardbook/)
* Markus Mauerer ([de](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/de)) [Jetzt herunterladen](https://addons.thunderbird.net/de/addon/cardbook/)
* Chris Mehl ([de](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/de)) [Jetzt herunterladen](https://addons.thunderbird.net/de/addon/cardbook/)
* Oliver Schuppe ([de](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/de)) [Jetzt herunterladen](https://addons.thunderbird.net/de/addon/cardbook/)
* SusiTux ([de](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/de)) [Jetzt herunterladen](https://addons.thunderbird.net/de/addon/cardbook/)
* Γιώτα ([el](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/el)) [Λήψη τώρα](https://addons.thunderbird.net/el/addon/cardbook/)
* Μαρία ([el](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/el)) [Λήψη τώρα](https://addons.thunderbird.net/el/addon/cardbook/)
* Timothe Litt ([en-US](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/en-US)) [Download Now](https://addons.thunderbird.net/en-US/addon/cardbook/)
* Óvári ([en-US](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/en-US)) [Download Now](https://addons.thunderbird.net/en-US/addon/cardbook/)
* Sylvain Lesage ([es-ES](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/es-ES)) [Descargar ahora](https://addons.thunderbird.net/es-ES/addon/cardbook/)
* Philippe Vigneau ([fr](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/fr)) [Télécharger maintenant](https://addons.thunderbird.net/fr/addon/cardbook/)
* Meri ([hr](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/hr)) [Preuzeti sada](https://addons.thunderbird.net/hr/thunderbird/addon/cardbook/)
* Óvári ([hu](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/hu)) [Letöltés most](https://addons.thunderbird.net/hu/addon/cardbook/)
* Zuraida ([id](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/id)) [Unduh Sekarang](https://addons.thunderbird.net/id/addon/cardbook/)
* Stefano Bloisi ([it](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/it)) [Scarica ora](https://addons.thunderbird.net/it/addon/cardbook/)
* Matteo Bonora ([it](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/it)) [Scarica ora](https://addons.thunderbird.net/it/addon/cardbook/)
* Agnese Morettini ([it](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/it)) [Scarica ora](https://addons.thunderbird.net/it/addon/cardbook/)
* いつき ([ja](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/ja)) [今すぐダウンロード](https://addons.thunderbird.net/ja/addon/cardbook/)
* 千秋 ([ja](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/ja)) [今すぐダウンロード](https://addons.thunderbird.net/ja/addon/cardbook/)
* [YUKI "Piro" Hiroshi (結城 洋志)](https://gitlab.com/piroor) ([ja](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/ja)) [今すぐダウンロード](https://addons.thunderbird.net/ja/addon/cardbook/)
* 공성은 ([ko](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/ko)) [다운로드](https://addons.thunderbird.net/ko/addon/cardbook/)
* Sangjun Song ([ko](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/ko)) [다운로드](https://addons.thunderbird.net/ko/addon/cardbook/)
* Gintautas ([lt](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/lt)) [Parsiųsti dabar](https://addons.thunderbird.net/lt/thunderbird/addon/cardbook/)
* Han Knols ([nl](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/nl)) [Nu downloaden](https://addons.thunderbird.net/nl/addon/cardbook/)
* Adam Gorzkiewicz ([pl](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/pl)) [Pobierz](https://addons.thunderbird.net/pl/addon/cardbook/)
* Dominik Wnęk ([pl](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/pl)) [Pobierz](https://addons.thunderbird.net/pl/addon/cardbook/)
* SecretOfSteel ([pl](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/pl)) [Pobierz](https://addons.thunderbird.net/pl/addon/cardbook/)
* Tel Amiel ([pt-BR](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/pt-BR)) [Baixar agora](https://addons.thunderbird.net/pt-BR/addon/cardbook/)
* [André Bação](https://github.com/abacao) ([pt-PT](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/pt-PT)) [Transferir agora](https://addons.thunderbird.net/pt-PT/addon/cardbook/)
* Lucian Burca ([ro](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/ro)) [Descarcă acum](https://addons.thunderbird.net/ro/addon/cardbook/)
* Florin Craciunica ([ro](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/ro)) [Descarcă acum](https://addons.thunderbird.net/ro/addon/cardbook/)
* Alexander Yavorsky ([ru](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/ru)) [Загрузить сейчас](https://addons.thunderbird.net/ru/addon/cardbook/)
* Jozef Gaál ([sk](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/sk)) [Stiahnuť teraz](https://addons.thunderbird.net/sk/addon/cardbook/)
* Peter Klofutar ([sl](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/sl)) [Prenesi zdaj](https://addons.thunderbird.net/sl/addon/cardbook/)
* Anders ([sv-SE](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/sv-SE)) [Hämta nu](https://addons.thunderbird.net/sv-SE/addon/cardbook/)
* Kire Dyfvelsten ([sv-SE](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/sv-SE)) [Hämta nu](https://addons.thunderbird.net/sv-SE/addon/cardbook/)
* Yusuf ([tr](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/tr)) [Şimdi İndir](https://addons.thunderbird.net/tr/addon/cardbook/)
* Валентина ([uk](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/uk)) [Завантажити зараз](https://addons.thunderbird.net/uk/addon/cardbook/)
* Христина ([uk](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/uk)) [Завантажити зараз](https://addons.thunderbird.net/uk/addon/cardbook/)
* Loan ([vi](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/vi)) [Tải xuống ngay](https://addons.thunderbird.net/vi/addon/cardbook/)
* Nguyễn ([vi](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/vi)) [Tải xuống ngay](https://addons.thunderbird.net/vi/addon/cardbook/)
* Thanh ([vi](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/vi)) [Tải xuống ngay](https://addons.thunderbird.net/vi/addon/cardbook/)
* David Peng ([zh-CN](https://gitlab.com/CardBook/CardBook/tree/master/chrome/locale/zh-CN)) [立即下载](https://addons.thunderbird.net/zh-CN/addon/cardbook/)
* [Transvision](https://transvision.mozfr.org/)
* [KDE Localization](https://l10n.kde.org/dictionary/search-translations.php)
* [Microsoft International Terminology](https://www.microsoft.com/language)

#### Trailblazer

* [Thomas McWork](https://github.com/thomas-mc-work): midwife for the public git repository

### CardBook the new Thunderbird Address Book

Supporters who would like to see CardBook as the new Thunderbird Address Book: 
[-=|MisterY|=-](https://addons.thunderbird.net/thunderbird/user/-mistery-/), 
[Anonymous user f17f68](https://addons.thunderbird.net/thunderbird/user/anonymous-f17f687302ae42ed6361c7afbbacf5be/), 
[Aurélien Vabre](https://addons.thunderbird.net/thunderbird/user/valkalon/), 
[Ben](https://addons.thunderbird.net/thunderbird/user/bhmoz/), 
[Carlinux](https://addons.thunderbird.net/thunderbird/user/Carlinux/), 
[Cees Bakker](https://addons.thunderbird.net/thunderbird/user/Cees_Bakker/), 
[Christian Bushland](https://addons.thunderbird.net/thunderbird/user/christian-bushland/), 
[Coolmicro](https://addons.thunderbird.net/thunderbird/user/Coolmicro/), 
[cux](https://addons.thunderbird.net/thunderbird/user/cux/), 
[Damarrin](https://addons.thunderbird.net/thunderbird/user/Damarrin/), 
[Dark Steve](https://addons.thunderbird.net/thunderbird/user/DarkFnord/), 
[Herman van Rink](https://bugzilla.mozilla.org/show_bug.cgi?id=1372580#c3), 
[Jan Edd](https://addons.thunderbird.net/thunderbird/user/szr/), 
[JavaScriptDude](https://addons.thunderbird.net/thunderbird/user/JavaScriptDude/), 
[jörg-blum](https://addons.thunderbird.net/thunderbird/user/j%C3%B6rg-blum/), 
[kiv57](https://addons.thunderbird.net/thunderbird/user/kiv57/), 
[Leigh](https://addons.thunderbird.net/thunderbird/user/leighelse/), 
[LHfirefox88](https://addons.thunderbird.net/thunderbird/user/LHfirefox88/), 
[Mannshoch](https://bugzilla.mozilla.org/show_bug.cgi?id=1372580#c0), 
[Marco T.](https://addons.thunderbird.net/thunderbird/user/mrctrevisan/), 
[Mathieu](https://addons.thunderbird.net/thunderbird/user/anonymous-02cd16f32ccb573b1523672e0da58aa4/), 
[micheleferretto](https://addons.thunderbird.net/thunderbird/user/micheleferretto/), 
[Olav Seyfarth](https://addons.thunderbird.net/thunderbird/user/nursoda/), 
[Philippe Vigneau](https://mail.mozilla.org/pipermail/tb-planning/2017-April/005378.html), 
[Robocog](https://addons.thunderbird.net/thunderbird/user/Robocog/), 
[Steven Klein](https://addons.thunderbird.net/thunderbird/user/Steven_Klein/), 
[t_17](https://addons.thunderbird.net/thunderbird/user/t_17/), 
[TB_user](https://addons.thunderbird.net/thunderbird/user/TB_user/), 
[teddych](https://addons.thunderbird.net/thunderbird/user/teddych/), 
[Tim Reeves](https://addons.thunderbird.net/thunderbird/user/anonymous-cd9d3ebb28f7e51198bbaedf07c00ba8/), 
[Tina Becker](https://addons.thunderbird.net/thunderbird/user/anonymous-5650480a724fe8d09d59c31448dcf0ba/), 
[TinL](https://addons.thunderbird.net/thunderbird/user/tinl/), 
[TMor](https://addons.thunderbird.net/thunderbird/user/TMor/), 
[Tradewatcher](https://bugzilla.mozilla.org/show_bug.cgi?id=1372580#c4), 
[Troy](https://addons.thunderbird.net/thunderbird/user/applaudmedia/), 
[vampsm](https://addons.thunderbird.net/thunderbird/user/vampsm/), 
[Vincent](https://addons.thunderbird.net/thunderbird/user/anonymous-97b09f02b78bb4337b68f096e5be6ef6/), 
[whatevsz](https://addons.thunderbird.net/thunderbird/user/whatevsz/), 
and others

### Vote to replace the Thunderbird Address Book with CardBook
1. [Click here](https://bugzilla.mozilla.org/show_bug.cgi?id=1372580)
2. Log in
3. If not expanded, click on the “Details” section
4. Click on the “Vote” button
5. Follow the prompts

Thank you

### License

[Mozilla Public License version 2.0](https://gitlab.com/CardBook/CardBook/blob/master/LICENSE.txt)
