var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");

var EXPORTED_SYMBOLS = ["cardbookRepository"];
var cardbookRepository = {
	cardbookCatDatabase: {},
	cardbookDatabase: {},
	cardbookActionsDatabase: {},
	cardbookMailPopDatabase: {},
	cardbookPrefDispNameDatabase: {},
	cardbookSearchDatabase: {},
	cardbookImageDatabase: {},

	extension: ExtensionParent.GlobalManager.getExtension("cardbook@vigneau.philippe"),
	
	windowParams: "chrome,titlebar,resizable,all,dialog=no",
	modalWindowParams: "modal,chrome,titlebar,resizable,minimizable=no",
	// Workaround for Bug 1151440 - the HTML color picker won't work
	// in linux when opened from modal dialog
	colorPickableDialogParams: (AppConstants.platform == 'Linux') ? "chrome,resizable,centerscreen" : "modal,chrome,resizable,centerscreen",
	colorPickableModalDialogParams: (AppConstants.platform == 'Linux') ? "chrome,titlebar,resizable,minimizable=no" : "modal,chrome,titlebar,resizable,minimizable=no",
	countriesList: ["ad","ae","af","ag","ai","al","am","ao","aq","ar","as","at","au","aw","az","ba","bb","bd","be","bf","bg",
						"bh","bi","bj","bl","bm","bn","bo","bq","br","bs","bt","bv","bw","by","bz","ca","cc","cd","cf","cg","ch",
						"ci","ck","cl","cm","cn","co","cp","cr","cu","cv","cw","cx","cy","cz","de","dg","dj","dk","dm","do","dz",
						"ec","ee","eg","eh","er","es","et","fi","fj","fk","fm","fo","fr","ga","gb","gd","ge","gf","gg","gh","gi",
						"gl","gm","gn","gp","gq","gr","gs","gt","gu","gw","gy","hk","hm","hn","hr","ht","hu","id","ie","il","im",
						"in","io","iq","ir","is","it","je","jm","jo","jp","ke","kg","kh","ki","km","kn","kp","kr","kw","ky","kz",
						"la","lb","lc","li","lk","lr","ls","lt","lu","lv","ly","ma","mc","md","me","mf","mg","mh","mk","ml","mm",
						"mn","mo","mp","mq","mr","ms","mt","mu","mv","mw","mx","my","mz","na","nc","ne","nf","ng","ni","nl","no",
						"np","nr","nu","nz","om","pa","pe","pf","pg","ph","pk","pl","pm","pn","pr","pt","pw","py","qa","qm","qs",
						"qu","qw","qx","qz","re","ro","rs","ru","rw","sa","sb","sc","sd","se","sg","sh","si","sk","sl","sm","sn",
						"so","sr","ss","st","sv","sx","sy","sz","tc","td","tf","tg","th","tj","tk","tl","tm","tn","to","tr","tt",
						"tv","tw","tz","ua","ug","us","uy","uz","va","vc","ve","vg","vi","vn","vu","wf","ws","xa","xb","xc","xd",
						"xe","xg","xh","xj","xk","xl","xm","xp","xq","xr","xs","xt","xu","xv","xw","ye","yt","za","zm","zw"],
	defaultCardImage: "chrome://cardbook/content/skin/contact-generic.svg",
	
	allColumns: { "display": ["fn"],
					"personal": ["prefixname", "firstname", "othername", "lastname", "suffixname", "nickname", "gender", "bday",
									"birthplace", "anniversary", "deathdate", "deathplace"],
					"org": ["org", "title", "role"],
					"categories": ["categories"],
					"arrayColumns": [ ["email", ["email"] ],
						["adr", ["postOffice", "extendedAddr", "street", "locality", "region", "postalCode", "country"] ],
						["impp", ["impp"] ],
						["tel", ["tel"] ],
						["url", ["url"] ] ],
					"note": ["note"],
					"calculated": ["age", "ABName"],
					"technical": ["version", "rev", "uid"],
					"media": [ 'photo', 'logo', 'sound' ],
					"technicalForTree": ["cardIcon", "name", "dirPrefId", "cbid", "class1", "etag", "geo", "mailer",
											"prodid", "tz", "sortstring", "kind"] },

	newFields: [ 'gender', 'birthplace', 'anniversary', 'deathdate', 'deathplace' ],
	dateFields: [ 'bday', 'anniversary', 'deathdate' ],
	multilineFields: [ 'email', 'tel', 'adr', 'impp', 'url' ],
	possibleNodes: [ 'categories', 'org' ],
	adrElements: [ "postOffice", "extendedAddr", "street", "locality", "region", "postalCode", "country" ],
	prefCSVPrefix: "*:",

	openedNodes: [],
	defaultDisplayedColumns: "cardIcon,fn,email.0.all,tel.0.all,bday,rev",
	defaultSortDirection: "fn",
	defaultSortResource: "ascending",
	defaultAutocompleteRestrictSearchFields: "firstname|lastname",
	defaultFnFormula: "({{1}} |)({{2}} |)({{3}} |)({{4}} |)({{5}} |)({{6}} |)({{7}}|)",
	defaultAdrFormula: "",
	defaultEmailFormat: "X-MOZILLA-HTML",
	defaultKindCustom: "X-ADDRESSBOOKSERVER-KIND",
	defaultMemberCustom: "X-ADDRESSBOOKSERVER-MEMBER",

	notAllowedCustoms: [ 'X-ABDATE', 'X-ABLABEL', 'X-CATEGORIES', 'X-MOZILLA-HTML' ],
	possibleCustomFields: { "X-CUSTOM1": {add: false}, "X-CUSTOM2": {add: false}, "X-CUSTOM3": {add: false}, "X-CUSTOM4": {add: false},
							"X-PHONETIC-FIRST-NAME": {add: false}, "X-PHONETIC-LAST-NAME": {add: false}, "X-BIRTHPLACE": {add: false},
							"X-ANNIVERSARY": {add: false}, "X-DEATHDATE": {add: false}, "X-DEATHPLACE": {add: false}, "X-GENDER": {add: false} },
					
	cardbookGenderLookup: { "F": "", "M": "", "N": "", "O": "", "U": "" },
	cardbookCoreTypes: { "GOOGLE": { "adr" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
										"email" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
										"tel" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["celltype", "CELL"], ["faxtype", "FAX"], ["pagertype", "PAGER"], ["workfaxtype", "FAX,WORK"], ["homefaxtype", "FAX,HOME"] ],
										"url" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["blogtype", "BLOG", "PG"], ["homepagetype", "HOMEPAGE", "PG"], ["profiletype", "PROFILE", "PG"] ],
										"impp" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
										"addnew" : true },
						"GOOGLE2": { "adr" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"] ],
										"email" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"] ],
										"tel" : [ ["hometype", "home"], ["worktype", "work"], ["celltype", "mobile"], ["pagertype", "pager"], ["workfaxtype", "workFax"], ["homefaxtype", "homeFax"], ["othertype", "other"], ["maintype", "main"] ],
 										"url" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"], ["blogtype", "blog"], ["homepagetype", "homePage"], ["profiletype", "profile"] ],
										"impp" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"] ],
										"addnew" : true },
						"GOOGLE3": { "adr" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"] ],
										"email" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"] ],
										"tel" : [ ["hometype", "home"], ["worktype", "work"], ["celltype", "mobile"], ["pagertype", "pager"], ["workfaxtype", "workFax"], ["homefaxtype", "homeFax"], ["othertype", "other"], ["maintype", "main"] ],
 										"url" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"], ["blogtype", "blog"], ["homepagetype", "homePage"], ["profiletype", "profile"] ],
										"impp" : [ ["hometype", "home"], ["worktype", "work"], ["othertype", "other"] ],
										"addnew" : true },
						"APPLE": { "adr" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"email" : [ ["hometype", "HOME;HOME,INTERNET"], ["worktype", "WORK;WORK,INTERNET"], ["othertype", "OTHER;OTHER,INTERNET"] ],
									"tel" : [ ["hometype", "HOME;HOME,VOICE"], ["worktype", "WORK;WORK,VOICE"], ["celltype", "CELL;CELL,VOICE"], ["faxtype", "FAX;FAX,VOICE"], ["pagertype", "PAGER"],
												["workfaxtype", "FAX,WORK;FAX,WORK,VOICE"], ["homefaxtype", "FAX,HOME;FAX,HOME,VOICE"],
												["othertype", "OTHER;OTHER,VOICE"], ["maintype", "MAIN"], ["iphonetype", "CELL,IPHONE;CELL,IPHONE,VOICE"] ],
									"url" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["othertype", "OTHER"] ],
									"impp" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"addnew" : true },
						"YAHOO": { "adr" : [ ["hometype", "HOME;HOME,POSTAL,PARCEL,WORK"], ["worktype", "WORK;WORK,POSTAL,PARCEL"] ],
									"email" : [ ["hometype", "HOME;HOME,INTERNET"], ["worktype", "WORK;WORK,INTERNET"] ],
									"tel" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["faxtype", "FAX"], ["celltype", "CELL"] ],
									"url" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"impp" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"addnew" : false },
						"OFFICE365": { "adr" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["othertype", "OTHER"] ],
									"email" : [ ],
									"tel" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["faxtype", "FAX"], ["celltype", "CELL"], ["workfaxtype", "FAX,WORK"],
												["homefaxtype", "FAX,HOME"], ["otherfaxtype", "FAX,OTHER"], ["othertype", "OTHER"], ["assistanttype", "ASSISTANT"],
												["callbacktype", "CALLBACK"], ["carphonetype", "CARPHONE"], ["pagertype", "PAGER"], ["radiotype", "RADIO"],
												["telextype", "TELEX"], ["ttytype", "TTY"], ],
									"url" : [ ],
									"impp" : [ ],
									"addnew" : false },
						"CARDDAV": { "adr" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"email" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["othertype", "OTHER"] ],
									"tel" : [ ["hometype", "HOME;HOME,VOICE"], ["worktype", "WORK;WORK,VOICE"], ["celltype", "CELL;CELL,IPHONE;CELL,VOICE"], ["faxtype", "FAX;FAX,VOICE"], ["pagertype", "PAGER"], ["workfaxtype", "FAX,WORK;FAX,WORK,VOICE"], ["homefaxtype", "FAX,HOME;FAX,HOME,VOICE"],
												["othertype", "OTHER;OTHER,VOICE"], ["maintype", "MAIN"] ],
									"url" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["othertype", "OTHER"] ],
									"impp" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"addnew" : true } },

	supportedVersion: ["3.0", "4.0"],

	filtersInitialized: false,

	logins: {},

	preferEmailPref: true,
	preferIMPPPref: true,
	
	addonVersion: "",
	userAgent: "",
	prodid: "",
	
	useColor: "",
	
	autocompleteRestrictSearch: false,
	autocompleteRestrictSearchFields: [],

	cardbookAccounts: [],
	cardbookAccountsCategories: {},
	cardbookAccountsNodes: {},
	cardbookNodeColors: {},
	cardbookCards: {},
	cardbookCategories: {},
	cardbookDisplayCards: {},
	cardbookCardLongSearch: {},
	cardbookCardShortSearch: {},
	cardbookCardEmails: {},
	cardbookFileCacheCards: {},
	cardbookFileCacheCategories: {},
	cardbookComplexSearch: {},

	cardbookMailPopularityIndex: {},
	cardbookMailPopularityLastIndex: 1,

	cardbookPreferDisplayNameIndex: {},
	cardbookPreferDisplayNameLastIndex: 1,
	cardbookDuplicateIndex: {},

	cardbookDirRequest: {},
	cardbookDirResponse: {},
	cardbookFileRequest: {},
	cardbookFileResponse: {},
	cardbookDBCardRequest: {},
	cardbookDBCardResponse: {},
	cardbookDBCatRequest: {},
	cardbookDBCatResponse: {},
	cardbookComplexSearchRequest: {},
	cardbookComplexSearchResponse: {},
	cardbookComplexSearchReloadRequest: {},
	cardbookComplexSearchReloadResponse: {},
	cardbookCardsFromCache: {},
	cardbookCategoriesFromCache: {},
	
	cardbookServerValidation: {},

	cardbookAccessTokenRequest: {},
	cardbookAccessTokenResponse: {},
	cardbookAccessTokenError: {},
	cardbookRefreshTokenRequest: {},
	cardbookRefreshTokenResponse: {},
	cardbookRefreshTokenError: {},
	cardbookServerDiscoveryRequest: {},
	cardbookServerDiscoveryResponse: {},
	cardbookServerDiscoveryError: {},
	cardbookServerSyncRequest: {},
	cardbookServerSyncResponse: {},
	cardbookServerCardSyncDone: {},
	cardbookServerCardSyncTotal: {},
	cardbookServerCardSyncError: {},
	cardbookServerCatSyncDone: {},
	cardbookServerCatSyncTotal: {},
	cardbookServerCatSyncError: {},
	cardbookServerSyncNotUpdatedCard: {},
	cardbookServerSyncNotUpdatedCat: {},
	cardbookServerSyncNewCardOnServer: {},
	cardbookServerSyncNewCatOnServer: {},
	cardbookServerSyncNewCardOnDisk: {},
	cardbookServerSyncNewCatOnDisk: {},
	cardbookServerSyncUpdatedCardOnServer: {},
	cardbookServerSyncUpdatedCatOnServer: {},
	cardbookServerSyncUpdatedCardOnDisk: {},
	cardbookServerSyncUpdatedCatOnDisk: {},
	cardbookServerSyncUpdatedCardOnBoth: {},
	cardbookServerSyncUpdatedCatOnBoth: {},
	cardbookServerSyncUpdatedCardOnDiskDeletedCardOnServer: {},
	cardbookServerSyncUpdatedCatOnDiskDeletedCatOnServer: {},
	cardbookServerSyncDeletedCardOnDisk: {},
	cardbookServerSyncDeletedCatOnDisk: {},
	cardbookServerSyncDeletedCardOnDiskUpdatedCardOnServer: {},
	cardbookServerSyncDeletedCatOnDiskUpdatedCatOnServer: {},
	cardbookServerSyncDeletedCardOnServer: {},
	cardbookServerSyncDeletedCatOnServer: {},
	cardbookServerSyncAgain: {},
	cardbookServerSyncCompareCardWithCacheDone: {},
	cardbookServerSyncCompareCardWithCacheTotal: {},
	cardbookServerSyncCompareCatWithCacheDone: {},
	cardbookServerSyncCompareCatWithCacheTotal: {},
	cardbookServerSyncHandleRemainingCardDone: {},
	cardbookServerSyncHandleRemainingCardTotal: {},
	cardbookServerSyncHandleRemainingCatDone: {},
	cardbookServerSyncHandleRemainingCatTotal: {},
	cardbookServerGetCardRequest: {},
	cardbookServerGetCardResponse: {},
	cardbookServerGetCardError: {},
	cardbookServerGetCardForMergeRequest: {},
	cardbookServerGetCardForMergeResponse: {},
	cardbookServerGetCardForMergeError: {},
	cardbookServerMultiGetArray: {},
	cardbookServerMultiGetGoogleArray: {},
	cardbookServerMultiPutGoogleArray: {},
	cardbookServerSyncParams: {},
	cardbookServerMultiGetRequest: {},
	cardbookServerMultiGetResponse: {},
	cardbookServerMultiGetError: {},
	cardbookServerUpdatedCardRequest: {},
	cardbookServerUpdatedCardResponse: {},
	cardbookServerUpdatedCardError: {},
	cardbookServerGetCardPhotoRequest: {},
	cardbookServerGetCardPhotoResponse: {},
	cardbookServerGetCardPhotoError: {},
	cardbookServerUpdatedCardPhotoRequest: {},
	cardbookServerUpdatedCardPhotoResponse: {},
	cardbookServerUpdatedCardPhotoError: {},
	cardbookServerUpdatedCatRequest: {},
	cardbookServerUpdatedCatResponse: {},
	cardbookServerUpdatedCatError: {},
	cardbookServerCreatedCardRequest: {},
	cardbookServerCreatedCardResponse: {},
	cardbookServerCreatedCardError: {},
	cardbookServerCreatedCatRequest: {},
	cardbookServerCreatedCatResponse: {},
	cardbookServerCreatedCatError: {},
	cardbookServerDeletedCardRequest: {},
	cardbookServerDeletedCardResponse: {},
	cardbookServerDeletedCardError: {},
	cardbookServerDeletedCatRequest: {},
	cardbookServerDeletedCatResponse: {},
	cardbookServerDeletedCatError: {},
	cardbookImageGetRequest: {},
	cardbookImageGetResponse: {},
	cardbookImageGetError: {},
	cardbookSyncMode: {},
	cardbookServerNotPushed: {},
	// used to remember the choice of overriding or not cards
	// while importing, dragging, copying or duplicating
	importConflictChoice: {},
	importConflictChoicePersist: {},
	importConflictChoiceImportValues: ["keep", "update", "duplicate", "merge"],
	importConflictChoiceSync1Values: ["keep", "delete"],
	importConflictChoiceSync2Values: ["local", "remote", "merge"],
	importConflictChoiceSync3Values: ["local", "remote"],
	
	cardbookServerChangedPwd: {},
	
	cardbookReorderMode: "NOREORDER",
	cardbookSearchMode: "NOSEARCH",
	cardbookSearchValue: "",
	cardbookComplexSearchMode: "NOSEARCH",
	cardbookComplexSearchPrefId: "",
	currentAccountId: "",
	// used to copy and paste 
	currentCopiedEntry: [],
	currentCopiedEntryValue: "",
	currentCopiedEntryName: "",
	currentCopiedEntryLabel: "",

	autoSync: {},
	autoSyncInterval: {},
	autoSyncId: {},
	initialSync: true,

	lTimerLoadCacheAll: {},
	lTimerDirAll: {},
	lTimerSyncAll: {},
	lTimerImportAll: {},
	lComplexSearchAll: {},
	lTimerNoSyncModeAll: {},
	lTimerNewRefreshTokenAll: {},
	
	// used to ensure that the initial load is done only once
	firstLoad: false,

	// used to remember the choice of name and dates format
	showNameAs: "",
	dateDisplayedFormat: "0",

	// used for discoveries
	gDiscoveryDescription: "Discovery module",

	cardbookUncategorizedCards: "",
	
	cardbookMailPopularityFile: "mailPopularityIndex.txt",
	cardbookPreferDisplayNameFile: "mailPreferDisplayName.txt",
	cardbookDuplicateFile: "duplicateIndex.txt",

	customFields: {},
									
	statusInformation: [],

	oauthPrefix: "chrome://cardbook/oauth",

	cardbookOAuthData: {"GOOGLE": {
							EMAIL_TYPE:                 "@gmail.com",
							VCARD_VERSIONS:             [ "3.0" ],
							CLIENT_ID:                  "779554755808-957jloa2c3c8n0rrm1a5304fkik7onf0.apps.googleusercontent.com",
							CLIENT_SECRET:              "h3NUkhofCKAW2E1X_NKSn4C_",
							REDIRECT_URI:               "urn:ietf:wg:oauth:2.0:oob",
							REDIRECT_TITLE:             "Success code=",
							RESPONSE_TYPE:              "code",
							SCOPE_CONTACTS:             "https://www.googleapis.com/auth/carddav",
							AUTH_PREFIX_CONTACTS:       "chrome://cardbook/oauth",
							SCOPE_LABELS:               "https://www.google.com/m8/feeds/",
							AUTH_PREFIX_LABELS:         "chrome://cardbook/oauth/labels",
							LABEL_URL:                  "https://www.google.com/m8/feeds/groups/",
							LABELS_URL:                 "https://www.google.com/m8/feeds/groups/default/full?max-results=1000",
							CONTACT_URL:                "https://www.google.com/m8/feeds/contacts/",
							BATCH:                      "https://www.google.com/m8/feeds/contacts/default/full/batch",
							OAUTH_URL:                  "https://accounts.google.com/o/oauth2/auth",
							TOKEN_REQUEST_URL:          "https://accounts.google.com/o/oauth2/token",
							TOKEN_REQUEST_TYPE:         "POST",
							TOKEN_REQUEST_GRANT_TYPE:   "authorization_code",
							REFRESH_REQUEST_URL:        "https://accounts.google.com/o/oauth2/token",
							REFRESH_REQUEST_TYPE:       "POST",
							REFRESH_REQUEST_GRANT_TYPE: "refresh_token",
							ROOT_API:                   "https://www.googleapis.com"},
						"GOOGLE2": {
							EMAIL_TYPE:                 "@gmail.com",
							VCARD_VERSIONS:             [ "3.0" ],
							CLIENT_ID:                  "779554755808-957jloa2c3c8n0rrm1a5304fkik7onf0.apps.googleusercontent.com",
							CLIENT_SECRET:              "h3NUkhofCKAW2E1X_NKSn4C_",
							REDIRECT_URI:               "http://localhost",
							RESPONSE_TYPE:              "code",
							SCOPE_CONTACTS:             "https://www.googleapis.com/auth/contacts",
							AUTH_PREFIX_CONTACTS:       "chrome://cardbook/oauth/people",
							LABELS:                     "contactGroups",
							LABELS_URL:                 "https://people.googleapis.com/v1/contactGroups",
							LABELS_URL_SIZE:            "1000",
							CONTACTS_URL:               "https://people.googleapis.com/v1/people/me/connections",
							CONTACTS_URL_SIZE:          "1000",
							CONTACT_URL:                "https://people.googleapis.com/v1/people",
							BATCH_GET_URL:              "https://people.googleapis.com/v1/people:batchGet",
							BATCH_GET_URL_SIZE:         "50",
							SYNC_PERSON_FIELDS:         "metadata,memberships",
							GET_PERSON_FIELDS:          "addresses,biographies,birthdays,emailAddresses,events,imClients,memberships,metadata,names,nicknames,organizations,phoneNumbers,photos,urls,userDefined",
							UPDATE_PERSON_FIELDS:       "addresses,biographies,birthdays,emailAddresses,events,imClients,memberships,names,nicknames,organizations,phoneNumbers,urls,userDefined",
							CREATE_PERSON_FIELDS:       "addresses,biographies,birthdays,emailAddresses,events,imClients,memberships,metadata,names,nicknames,organizations,phoneNumbers,urls,userDefined",
							OBJECT_TYPE:				"CONTACT",
							UPDATEPHOTO_PERSON_FIELDS:  "metadata",
							DELETEPHOTO_PERSON_FIELDS:  "metadata",
							OAUTH_URL:                  "https://accounts.google.com/o/oauth2/auth",
							TOKEN_REQUEST_URL:          "https://accounts.google.com/o/oauth2/token",
							TOKEN_REQUEST_TYPE:         "POST",                                                                      
							TOKEN_REQUEST_GRANT_TYPE:   "authorization_code",
							REFRESH_REQUEST_URL:        "https://accounts.google.com/o/oauth2/token",
							REFRESH_REQUEST_TYPE:       "POST",
							REFRESH_REQUEST_GRANT_TYPE: "refresh_token",
							ROOT_API:                   "https://www.googleapis.com"},
						"GOOGLE3": {
							VCARD_VERSIONS:             [ "3.0" ],
							CLIENT_ID:                  "779554755808-957jloa2c3c8n0rrm1a5304fkik7onf0.apps.googleusercontent.com",
							CLIENT_SECRET:              "h3NUkhofCKAW2E1X_NKSn4C_",
							REDIRECT_URI:               "http://localhost",
							RESPONSE_TYPE:              "code",
							SCOPE_CONTACTS:             "https://www.googleapis.com/auth/directory.readonly",
							AUTH_PREFIX_CONTACTS:       "chrome://cardbook/oauth/directory",
							LABELS:                     "contactGroups",
							LABELS_URL:                 "https://people.googleapis.com/v1/contactGroups",
							LABELS_URL_SIZE:            "1000",
							CONTACTS_URL:               "https://people.googleapis.com/v1/people:listDirectoryPeople",
							CONTACTS_URL_SIZE:          "1000",
							CONTACTS_SOURCES:			"DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE",
							OBJECT_TYPE:				"DOMAIN_PROFILE",
							CONTACT_URL:                "https://people.googleapis.com/v1/people",
							BATCH_GET_URL:              "https://people.googleapis.com/v1/people:batchGet",
							BATCH_GET_URL_SIZE:         "50",
							SYNC_PERSON_FIELDS:         "metadata,memberships",
							GET_PERSON_FIELDS:          "addresses,biographies,birthdays,emailAddresses,events,imClients,memberships,metadata,names,nicknames,organizations,phoneNumbers,photos,urls,userDefined",
							UPDATE_PERSON_FIELDS:       "addresses,biographies,birthdays,emailAddresses,events,imClients,memberships,names,nicknames,organizations,phoneNumbers,urls,userDefined",
							CREATE_PERSON_FIELDS:       "addresses,biographies,birthdays,emailAddresses,events,imClients,memberships,metadata,names,nicknames,organizations,phoneNumbers,urls,userDefined",
							UPDATEPHOTO_PERSON_FIELDS:  "metadata",
							DELETEPHOTO_PERSON_FIELDS:  "metadata",
							OAUTH_URL:                  "https://accounts.google.com/o/oauth2/auth",
							TOKEN_REQUEST_URL:          "https://accounts.google.com/o/oauth2/token",
							TOKEN_REQUEST_TYPE:         "POST",                                                                      
							TOKEN_REQUEST_GRANT_TYPE:   "authorization_code",
							REFRESH_REQUEST_URL:        "https://accounts.google.com/o/oauth2/token",
							REFRESH_REQUEST_TYPE:       "POST",
							REFRESH_REQUEST_GRANT_TYPE: "refresh_token",
							ROOT_API:                   "https://www.googleapis.com"}
							},

	supportedConnections:[
							{ id: "GOOGLE2", type: "GOOGLE2", url: "", vCard: [ "3.0" ]},
							{ id: "GOOGLE3", type: "GOOGLE3", url: "", vCard: [ "3.0" ]},
							{ id: "CARDDAV", type: "CARDDAV", url: ""},
							{ id: "APPLE", type: "APPLE", url: "https://contacts.icloud.com", vCard: [ "3.0" ], pwdapp: "true"},
							{ id: "YAHOO", type: "YAHOO", url: "https://carddav.address.yahoo.com", vCard: [ "3.0" ], pwdapp: "true"},
							{ id: "AOL.COM", type: "CARDDAV", url: "https://carddav.aol.com", vCard: [ "3.0" ], pwdapp: "true"},
							{ id: "ECLIPSO", type: "CARDDAV", url: "https://www.eclipso.de", vCard: [ "3.0" ]},
							{ id: "EWS", type: "OFFICE365", url: "", vCard: [ "3.0" ], pwdapp: "false"},
							{ id: "FASTMAIL", type: "CARDDAV", url: "https://carddav.fastmail.com", vCard: [ "3.0" ], pwdapp: "true"},
							{ id: "FRUUX", type: "CARDDAV", url: "https://dav.fruux.com", vCard: [ "3.0" ], pwdapp: "false"},
							{ id: "GMX", type: "CARDDAV", url: "https://carddav.gmx.net", vCard: [ "3.0" ]},
							{ id: "HOTMAIL", type: "OFFICE365", url: "https://outlook.office365.com/EWS/Exchange.asmx", vCard: [ "3.0" ], pwdapp: "false"},
							{ id: "LAPOSTE.NET", type: "CARDDAV", url: "https://webmail.laposte.net/dav/%EMAILADDRESS%/contacts", vCard: [ "3.0" ]},
							{ id: "LIBERTA.VIP", type: "CARDDAV", url: "https://cloud.liberta.vip/", vCard: [ "3.0" ], pwdapp: "false"},
							{ id: "MAIL.DE", type: "CARDDAV", url: "https://adressbuch.mail.de", vCard: [ "3.0" ]},
							{ id: "MAILBOX.ORG", type: "CARDDAV", url: "https://dav.mailbox.org", vCard: [ "3.0" ]},
							{ id: "MAILFENCE.COM", type: "CARDDAV", url: "https://mailfence.com", vCard: [ "3.0" ]},
							{ id: "MYKOLAB.COM", type: "CARDDAV", url: "https://carddav.mykolab.com", vCard: [ "3.0" ]},
							{ id: "OFFICE365", type: "OFFICE365", url: "https://outlook.office365.com/EWS/Exchange.asmx", vCard: [ "3.0" ], pwdapp: "false"},
							{ id: "OUTLOOK", type: "OFFICE365", url: "https://outlook.office365.com/EWS/Exchange.asmx", vCard: [ "3.0" ], pwdapp: "false"},
							{ id: "ORANGE.FR", type: "CARDDAV", url: "https://carddav.orange.fr/addressbooks/%EMAILADDRESS%", vCard: [ "3.0" ]},
							{ id: "POSTEO", type: "CARDDAV", url: "https://posteo.de:8843", vCard: [ "3.0" ]},
							{ id: "WEB.DE", type: "CARDDAV", url: "https://carddav.web.de", vCard: [ "3.0" ]},
							{ id: "YANDEX.RU", type: "CARDDAV", url: "https://carddav.yandex.ru/addressbook/%EMAILADDRESS%/addressbook", vCard: [ "3.0" ]},
							{ id: "ZACLYS", type: "CARDDAV", url: "https://ncloud.zaclys.com", vCard: [ "3.0" ], pwdapp: "false"},
							{ id: "ZOHO.COM", type: "CARDDAV", url: "https://contacts.zoho.com", vCard: [ "3.0" ]},
							{ id: "ZIGGO.NL", type: "CARDDAV", url: "https://sync.ziggo.nl", vCard: [ "3.0" ], pwdapp: "false"}
						],
	
	cardbookBirthdayPopup: 0,

	// actions
	currentActionId: 0,
	currentAction: {},
	
	// undos
	currentUndoId: 0,

	loadCustoms: function () {
		cardbookRepository.customFields = cardbookRepository.cardbookPreferences.getAllCustomFields();
		// for file opened with version <= 57.3
		if (cardbookRepository.customFields.pers.length) {
			for (let customLine of cardbookRepository.customFields.pers) {
				cardbookRepository.cardbookPreferences.setCustomFields('personal', customLine[2], customLine[0] + ":" + customLine[1]);
			}
			cardbookRepository.cardbookPreferences.delCustomFields("pers");
			cardbookRepository.customFields = cardbookRepository.cardbookPreferences.getAllCustomFields();
		}
		cardbookRepository.loadPossibleCustomFields();
	},

	loadPossibleCustomFields: function () {
		for (let myCode in cardbookRepository.possibleCustomFields) {
			cardbookRepository.possibleCustomFields[myCode].label = cardbookRepository.extension.localeData.localizeMessage(myCode.replace(/^X-/, "").replace(/-/g, "").toLowerCase() + "Label");
			let found = false;
			for (let j = 0; j < cardbookRepository.customFields.personal.length; j++) {
				if (cardbookRepository.customFields.personal[j][0] == myCode) {
					found = true;
					break;
				}
			}
			cardbookRepository.possibleCustomFields[myCode].added = found;
		}
	},

	writePossibleCustomFields: function () {
		let myCount = cardbookRepository.customFields.personal.length;
		for (let myCode in cardbookRepository.possibleCustomFields) {
			if (cardbookRepository.possibleCustomFields[myCode].add && !cardbookRepository.possibleCustomFields[myCode].added) {
				cardbookRepository.cardbookPreferences.setCustomFields('personal', myCount, myCode + ":" + cardbookRepository.possibleCustomFields[myCode].label);
				cardbookRepository.possibleCustomFields[myCode].added = true;
				myCount++;
			}
		}
		cardbookRepository.loadCustoms();
	},

    setDefaultImppTypes: function () {
		let impps = [];
		impps = cardbookRepository.cardbookPreferences.getAllIMPPs();
		if (impps.length == 0) {
			cardbookRepository.cardbookPreferences.insertIMPPsSeed();
		}
	},

    updateFieldsNameList: function () {
		let fieldsUpdate1 = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.fieldsNameListUpdate1", false);
		if (!fieldsUpdate1) {
			let fields = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.fieldsNameList");
			if (fields != "allFields") {
				let prefs = cardbookRepository.cardbookUtils.escapeString(fields).split(";");
				prefs = prefs.concat(cardbookRepository.adrElements);
				cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.fieldsNameList", prefs.join(";"));
			}
			cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.fieldsNameListUpdate1", true);
		}
		let fieldsUpdate2 = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.fieldsNameListUpdate2", false);
		if (!fieldsUpdate2) {
			let fields = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.fieldsNameList");
			let prefs = cardbookRepository.cardbookUtils.escapeString(fields).split(";");
			prefs = cardbookRepository.cardbookUtils.unescapeArray(prefs);
			if (prefs[0] != "allFields") {
				let result = {};
				for (let pref of prefs) {
					result[pref] = { displayed: true, function: "" };
				}
				cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.fieldsNameList", JSON.stringify(result));
			}
			cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.fieldsNameListUpdate2", true);
		}
	},

	setGenderLookup: function() {
		for (var type in cardbookRepository.cardbookGenderLookup) {
			cardbookRepository.cardbookGenderLookup[type] = cardbookRepository.extension.localeData.localizeMessage("types.gender." + type.toLowerCase());
		}
	},

	getLang: function() {
		try {
			// Thunderbird 52
			let myLang = Services.prefs.getComplexValue("general.useragent.locale", Components.interfaces.nsIPrefLocalizedString).data;
			if (myLang != "") {
				return myLang;
			}
		}
		catch(e) {}
		try {
			// Thunderbird 60
			let myLangArray = Services.prefs.getComplexValue("intl.accept_languages", Components.interfaces.nsIPrefLocalizedString).data.split(',');
			if (myLangArray[0] != "") {
				return myLangArray[0];
			}
		}
		catch(e) {}
		return "en-US";
	},

	getDefaultRegion: function() {
		try {
			var myDefaultRegion = cardbookRepository.cardbookPreferences.getStringPref("browser.search.region");
			if (myDefaultRegion != "") {
				return myDefaultRegion;
			} else {
				var myLangArray = cardbookRepository.getLang().toUpperCase().split('-');
				if (myLangArray[1] && myLangArray[1] != "") {
					return myLangArray[1];
				} else {
					return myLangArray[0];
				}
			}
		}
		catch(e) {}
		return "US";
	},

	setDefaultRegion: function() {
		var defaultRegion = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.defaultRegion");
		if (defaultRegion == "NOTSET") {
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.defaultRegion", cardbookRepository.getDefaultRegion());
		}
	},

	getLocalDirectory: function() {
		let directoryService = Services.dirsvc;
		// this is a reference to the profile dir (ProfD) now.
		let localDir = directoryService.get("ProfD", Components.interfaces.nsIFile);
		
		localDir.append("cardbook");
		
		if (!localDir.exists() || !localDir.isDirectory()) {
			// read and write permissions to owner and group, read-only for others.
			localDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
		}
		return localDir;
	},

	arrayUnique: function (array) {
		var a = array.concat();
		for (var i=0; i<a.length; ++i) {
			for (var j=i+1; j<a.length; ++j) {
				if (a[i] == a[j])
					a.splice(j--, 1);
			}
		}
		return a;
	},

	arrayUnique2D: function (aArray) {
		for (var i=0; i<aArray.length; i++) {
			var listI = aArray[i];
			loopJ: for (var j=0; j<aArray.length; j++) {
				var listJ = aArray[j];
				if (listI === listJ) continue; //Ignore itself
				for (var k=listJ.length; k>=0; k--) {
					if (listJ[k] !== listI[k]) continue loopJ;
				}
				// At this point, their values are equal.
				aArray.splice(j, 1);
			}
		}
		return aArray;
	},

	normalizeString: function (aString) {
		return aString.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
	},

	makeSearchString: function (aString) {
		return this.normalizeString(aString.replace(/([\\\/\:\*\?\"\'\-\<\>\| ]+)/g, "").toUpperCase());
	},

	makeSearchStringWithoutNumber: function (aString) {
		return cardbookRepository.makeSearchString(aString).replace(/([0123456789]+)/g, "");
	},

	getLongSearchString: function(aCard) {
		var lResult = "";
		var sep = "|";
		lResult = lResult + aCard.lastname + sep;
		lResult = lResult + aCard.firstname + sep;
		lResult = lResult + aCard.othername + sep;
		lResult = lResult + aCard.prefixname + sep;
		lResult = lResult + aCard.suffixname + sep;
		lResult = lResult + aCard.fn + sep;
		lResult = lResult + aCard.nickname + sep;
		lResult = lResult + aCard.bday + sep;
		lResult = lResult + aCard.categories.join(sep) + sep;
		for (let i = 0; i < aCard.adr.length; i++) {
			lResult = lResult + aCard.adr[i][0].join() + sep;
		}
		for (let i = 0; i < aCard.tel.length; i++) {
			lResult = lResult + aCard.tel[i][0].join() + sep;
		}
		for (let i = 0; i < aCard.email.length; i++) {
			lResult = lResult + aCard.email[i][0].join() + sep;
		}
		lResult = lResult + aCard.title + sep;
		lResult = lResult + aCard.role + sep;
		lResult = lResult + aCard.org + sep;
		lResult = lResult + aCard.note + sep;
		for (let i = 0; i < aCard.url.length; i++) {
			lResult = lResult + aCard.url[i][0].join() + sep;
		}
		for (let i = 0; i < aCard.impp.length; i++) {
			lResult = lResult + aCard.impp[i][0].join() + sep;
		}
		lResult = lResult.slice(0, -1);
		return cardbookRepository.makeSearchString(lResult);
	},

	getShortSearchString: function(aCard) {
		var lResult = "";
		var sep = "|";
		for (let field of cardbookRepository.autocompleteRestrictSearchFields) {
			lResult = lResult + cardbookRepository.cardbookUtils.getCardValueByField(aCard, field, false).join() + sep;
		}
		lResult = lResult.slice(0, -1);
		return cardbookRepository.makeSearchString(lResult);
	},

	setEmptyContainer: function(aAccountId) {
		let node = cardbookRepository.cardbookPreferences.getNode(aAccountId);
		let nodes = cardbookRepository.cardbookAccountsCategories;
		if (node != "categories") {
			nodes = cardbookRepository.cardbookAccountsNodes;
		}
		if (nodes[aAccountId]) {
			if (nodes[aAccountId].length > 0) {
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[4] == aAccountId) {
						account[3] = false;
						return;
					}
				}
			} else {
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[4] == aAccountId) {
						account[3] = true;
						account[2] = false;
						return;
					}
				}
			}
		}
	},
	
	addAccountToRepository: function(aAccountId, aAccountName, aAccountType, aAccountUrl, aAccountUser, aColor, aEnabled, aExpanded, aVCard, aReadOnly, aUrnuuid,
										aSourceId, aDBcached, aAutoSyncEnabled, aAutoSyncInterval, aPrefInsertion) {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(aAccountId);
		if (!cacheDir.exists() || !cacheDir.isDirectory()) {
			cacheDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
			cacheDir.append("mediacache");
			cacheDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
		}
		if (aPrefInsertion) {
			cardbookRepository.cardbookPreferences.setId(aAccountId, aAccountId);
			cardbookRepository.cardbookPreferences.setName(aAccountId, aAccountName);
			cardbookRepository.cardbookPreferences.setType(aAccountId, aAccountType);
			cardbookRepository.cardbookPreferences.setUrl(aAccountId, aAccountUrl);
			cardbookRepository.cardbookPreferences.setUser(aAccountId, aAccountUser);
			cardbookRepository.cardbookPreferences.setColor(aAccountId, aColor);
			cardbookRepository.cardbookPreferences.setEnabled(aAccountId, aEnabled);
			cardbookRepository.cardbookPreferences.setExpanded(aAccountId, aExpanded);
			cardbookRepository.cardbookPreferences.setVCardVersion(aAccountId, aVCard);
			cardbookRepository.cardbookPreferences.setReadOnly(aAccountId, aReadOnly);
			cardbookRepository.cardbookPreferences.setUrnuuid(aAccountId, aUrnuuid);
			cardbookRepository.cardbookPreferences.setSourceId(aAccountId, aSourceId);
			cardbookRepository.cardbookPreferences.setDBCached(aAccountId, aDBcached);
			cardbookRepository.cardbookPreferences.setAutoSyncEnabled(aAccountId, aAutoSyncEnabled);
			cardbookRepository.cardbookPreferences.setAutoSyncInterval(aAccountId, aAutoSyncInterval);
		}
		
		cardbookRepository.cardbookAccounts.push([aAccountName, true, aExpanded, true, aAccountId, aEnabled, aAccountType, aReadOnly, aAccountId]);
		cardbookRepository.cardbookUtils.sortMultipleArrayByString(cardbookRepository.cardbookAccounts,0,1);
		cardbookRepository.cardbookDisplayCards[aAccountId] = {modified: 0, cards: []};
		cardbookRepository.cardbookAccountsCategories[aAccountId] = [];
		cardbookRepository.cardbookAccountsNodes[aAccountId] = [];
	},

	removeAccountFromRepository: function(aAccountId) {
		cardbookRepository.removeAccountFromCollected(aAccountId);
		cardbookRepository.removeAccountFromRestrictions(aAccountId);
		cardbookRepository.removeAccountFromVCards(aAccountId);
		cardbookRepository.removeAccountFromBirthday(aAccountId);
		cardbookRepository.removeAccountFromDiscovery(aAccountId);

		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(aAccountId);
		if (cacheDir.exists() && cacheDir.isDirectory()) {
			cacheDir.remove(true);
		}

		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			for (let category of cardbookRepository.cardbookAccountsCategories[aAccountId]) {
				var myAccountId = aAccountId+"::categories::"+category;
				delete cardbookRepository.cardbookDisplayCards[myAccountId];
			}
			delete cardbookRepository.cardbookAccountsCategories[aAccountId];
			delete cardbookRepository.cardbookDisplayCards[aAccountId];
		}

		function searchCard2(element) {
			return (element[4] != aAccountId);
		}
		cardbookRepository.cardbookAccounts = cardbookRepository.cardbookAccounts.filter(searchCard2, aAccountId);

		delete cardbookRepository.cardbookCardLongSearch[aAccountId];
		delete cardbookRepository.cardbookCardShortSearch[aAccountId];
		if (cardbookRepository.cardbookFileCacheCards[aAccountId]) {
			delete cardbookRepository.cardbookFileCacheCards[aAccountId];
		}
		if (cardbookRepository.cardbookFileCacheCategories[aAccountId]) {
			delete cardbookRepository.cardbookFileCacheCategories[aAccountId];
		}
		for (let i in cardbookRepository.cardbookCards) {
			let myCard = cardbookRepository.cardbookCards[i];
			if (myCard.dirPrefId == aAccountId) {
				delete cardbookRepository.cardbookCards[i];
			}
		}
	},
		
	removeComplexSearchFromRepository: function(aAccountId) {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(aAccountId);
		if (cacheDir.exists() && cacheDir.isDirectory()) {
			cacheDir.remove(true);
		}

		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			for (let category of cardbookRepository.cardbookAccountsCategories[aAccountId]) {
				var myAccountId = aAccountId+"::categories::"+category;
				delete cardbookRepository.cardbookDisplayCards[myAccountId];
			}
			delete cardbookRepository.cardbookAccountsCategories[aAccountId];
			delete cardbookRepository.cardbookDisplayCards[aAccountId];
		}

		function searchCard2(element) {
			return (element[4] != aAccountId);
		}
		cardbookRepository.cardbookAccounts = cardbookRepository.cardbookAccounts.filter(searchCard2, aAccountId);

		delete cardbookRepository.cardbookComplexSearch[aAccountId];
	},
		
	emptyAccountFromRepository: function(aAccountId) {
		for (var account in cardbookRepository.cardbookDisplayCards) {
			if (account.startsWith(aAccountId+"::categories") || account.startsWith(aAccountId+"::org")) {
				delete cardbookRepository.cardbookDisplayCards[account];
			}
		}
		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			cardbookRepository.cardbookAccountsCategories[aAccountId] = [];
		}
		if (cardbookRepository.cardbookAccountsNodes[aAccountId]) {
			cardbookRepository.cardbookAccountsNodes[aAccountId] = [];
		}
		if (cardbookRepository.cardbookDisplayCards[aAccountId]) {
			cardbookRepository.cardbookDisplayCards[aAccountId] = {modified: 0, cards: []};
		}
		cardbookRepository.setEmptyContainer(aAccountId);

		delete cardbookRepository.cardbookCardLongSearch[aAccountId];
		delete cardbookRepository.cardbookCardShortSearch[aAccountId];
		if (cardbookRepository.cardbookFileCacheCards[aAccountId]) {
			delete cardbookRepository.cardbookFileCacheCards[aAccountId];
		}
		if (cardbookRepository.cardbookFileCacheCategories[aAccountId]) {
			delete cardbookRepository.cardbookFileCacheCategories[aAccountId];
		}
		for (let i in cardbookRepository.cardbookCards) {
			let myCard = cardbookRepository.cardbookCards[i];
			if (myCard.dirPrefId == aAccountId) {
				delete cardbookRepository.cardbookCards[i];
			}
		}
		for (let i in cardbookRepository.cardbookCategories) {
			let myCategory = cardbookRepository.cardbookCategories[i];
			if (myCategory.dirPrefId == aAccountId) {
				delete cardbookRepository.cardbookCategories[i];
			}
		}
	},

	emptyComplexSearchFromRepository: function(aAccountId) {
		for (var account in cardbookRepository.cardbookDisplayCards) {
			if (account.startsWith(aAccountId+"::categories") || account.startsWith(aAccountId+"::org")) {
				delete cardbookRepository.cardbookDisplayCards[account];
			}
		}
		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			cardbookRepository.cardbookAccountsCategories[aAccountId] = [];
		}
		if (cardbookRepository.cardbookAccountsNodes[aAccountId]) {
			cardbookRepository.cardbookAccountsNodes[aAccountId] = [];
		}
		if (cardbookRepository.cardbookDisplayCards[aAccountId]) {
			cardbookRepository.cardbookDisplayCards[aAccountId] = {modified: 0, cards: []};
		}
		for (let i in cardbookRepository.cardbookCategories) {
			let myCategory = cardbookRepository.cardbookCategories[i];
			if (myCategory.dirPrefId == aAccountId) {
				delete cardbookRepository.cardbookCategories[i];
			}
		}
		cardbookRepository.setEmptyContainer(aAccountId);
	},

	removeAccountFromComplexSearch: function (aDirPrefId) {
		if (cardbookRepository.cardbookDisplayCards[aDirPrefId]) {
			for (var dirPrefId in cardbookRepository.cardbookComplexSearch) {
				if (cardbookRepository.cardbookDisplayCards[dirPrefId].cards.length != 0) {
					for (let card of cardbookRepository.cardbookDisplayCards[aDirPrefId].cards) {
						cardbookRepository.removeCardFromDisplayAndCat(card, dirPrefId);
					}
				}
			}
		}
	},

	// only used from the import of Thunderbird standard address books
	addAccountToCollected: function (aDirPrefId) {
		var allEmailsCollections = [];
		allEmailsCollections = cardbookRepository.cardbookPreferences.getAllEmailsCollections();
		var newId = allEmailsCollections.length + 1;
		cardbookRepository.cardbookPreferences.setEmailsCollection(newId.toString(), "true::allMailAccounts::" + aDirPrefId + "::");
	},

	removeAccountFromCollected: function (aDirPrefId) {
		var result = [];
		var allEmailsCollections = [];
		allEmailsCollections = cardbookRepository.cardbookPreferences.getAllEmailsCollections();
		result = allEmailsCollections.filter(child => child[2] != aDirPrefId);
		cardbookRepository.cardbookPreferences.delEmailsCollection();
		for (var i = 0; i < result.length; i++) {
			cardbookRepository.cardbookPreferences.setEmailsCollection(i.toString(), result[i].join("::"));
		}
	},

	enableOrDisableAccountFromCollected: function (aDirPrefId, aValue) {
		var result = [];
		var allEmailsCollections = [];
		allEmailsCollections = cardbookRepository.cardbookPreferences.getAllEmailsCollections();
		function filterAccount(element) {
			if (element[2] == aDirPrefId) {
				element[0] = aValue;
			}
			return true;
		}
		result = allEmailsCollections.filter(filterAccount);
		cardbookRepository.cardbookPreferences.delEmailsCollection();
		for (var i = 0; i < result.length; i++) {
			cardbookRepository.cardbookPreferences.setEmailsCollection(i.toString(), result[i].join("::"));
		}
	},

	removeAccountFromRestrictions: function (aDirPrefId) {
		let allRestrictions = [];
		allRestrictions = cardbookRepository.cardbookPreferences.getAllRestrictions();
		allRestrictions = allRestrictions.filter(element => element[3] != aDirPrefId);
		cardbookRepository.cardbookPreferences.delRestrictions();
		for (let i = 0; i < allRestrictions.length; i++) {
			cardbookRepository.cardbookPreferences.setRestriction(i.toString(), allRestrictions[i].join("::"));
		}
	},

	enableOrDisableAccountFromRestrictions: function (aDirPrefId, aValue) {
		let allRestrictions = [];
		allRestrictions = cardbookRepository.cardbookPreferences.getAllRestrictions();
		function filterAccount(element) {
			if (element[3] == aDirPrefId) {
				element[0] = aValue;
			}
			return true;
		}
		allRestrictions = allRestrictions.filter(filterAccount);
		cardbookRepository.cardbookPreferences.delRestrictions();
		for (let i = 0; i < allRestrictions.length; i++) {
			cardbookRepository.cardbookPreferences.setRestriction(i.toString(), allRestrictions[i].join("::"));
		}
	},

	removeAccountFromVCards: function (aDirPrefId) {
		let allVCards = [];
		allVCards = cardbookRepository.cardbookPreferences.getAllVCards();
		allVCards = allVCards.filter(element => element[2] != aDirPrefId);
		cardbookRepository.cardbookPreferences.delVCards();
		for (let i = 0; i < allVCards.length; i++) {
			cardbookRepository.cardbookPreferences.setVCard(i.toString(), allVCards[i].join("::"));
		}
	},

	enableOrDisableAccountFromVCards: function (aDirPrefId, aValue) {
		let allVCards = [];
		allVCards = cardbookRepository.cardbookPreferences.getAllVCards();
		function filterAccount(element) {
			if (element[2] == aDirPrefId) {
				element[0] = aValue;
			}
			return true;
		}
		allVCards = allVCards.filter(filterAccount);
		for (let i = 0; i < allVCards.length; i++) {
			cardbookRepository.cardbookPreferences.setRestriction(i.toString(), allVCards[i].join("::"));
		}
	},

	removeAccountFromBirthday: function (aDirPrefId) {
		cardbookRepository.enableOrDisableAccountFromBirthday(aDirPrefId, false);
	},

	enableOrDisableAccountFromBirthday: function (aDirPrefId, aValue) {
		let addressBooks = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.addressBooksNameList");
		let addressBooksList = [];
		addressBooksList = addressBooks.split(',').filter(element => element != aDirPrefId);
		if (aValue && aValue === true && addressBooksList[0] != "allAddressBooks") {
			addressBooksList.push(aDirPrefId);
		}
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.addressBooksNameList", addressBooksList.join(','));
	},

	removeAccountFromDiscovery: function (aDirPrefId) {
		var allDiscoveryAccounts = [];
		allDiscoveryAccounts = cardbookRepository.cardbookSynchronization.getAllURLsToDiscover();
		cardbookRepository.cardbookUtils.sortMultipleArrayByString(allDiscoveryAccounts,0,1);
		var withoutDiscoveryAccounts = [];
		withoutDiscoveryAccounts = cardbookRepository.cardbookSynchronization.getAllURLsToDiscover(aDirPrefId);
		if (allDiscoveryAccounts.length != withoutDiscoveryAccounts.length) {
			var addressBooks = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.discoveryAccountsNameList");
			var addressBooksList = [];
			addressBooksList = addressBooks.split(',');
			var myUser = cardbookRepository.cardbookPreferences.getUser(aDirPrefId);
			var myURL = cardbookRepository.cardbookSynchronization.getShortUrl(cardbookRepository.cardbookPreferences.getUrl(aDirPrefId));
			function filterAccount(element) {
				return (element != myUser + "::" + myURL);
			}
			addressBooksList = addressBooksList.filter(filterAccount);
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.discoveryAccountsNameList", addressBooksList.join(','));
		}
	},

	removeCardFromRepository: async function (aCard, aCacheDeletion) {
		try {
			cardbookRepository.removeCardFromLongSearch(aCard);
			cardbookRepository.removeCardFromShortSearch(aCard);
			cardbookRepository.removeCardFromEmails(aCard);
			cardbookRepository.removeCardFromDisplayAndCat(aCard, aCard.dirPrefId);
			cardbookRepository.removeCardFromOrg(aCard, aCard.dirPrefId);
			for (var dirPrefId in cardbookRepository.cardbookComplexSearch) {
				if (cardbookRepository.cardbookPreferences.getEnabled(dirPrefId)) {
					cardbookRepository.removeCardFromDisplayAndCat(aCard, dirPrefId);
				}
			}
			if (aCacheDeletion) {
				await cardbookRepository.removeCardFromCache(aCard);
			}
			cardbookRepository.removeCardFromList(aCard);
			aCard = null;
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.removeCardFromRepository error : " + e, "Error");
		}
	},

	removeCategoryFromRepository: function (aCategory, aCacheDeletion, aDirPrefId) {
		try {
			cardbookRepository.removeCategoryFromDisplay(aCategory, aDirPrefId);
			for (var dirPrefId in cardbookRepository.cardbookComplexSearch) {
				if (cardbookRepository.cardbookPreferences.getEnabled(aDirPrefId) &&
					cardbookRepository.cardbookDisplayCards[dirPrefId+"::categories::"+aCategory.name] &&
					cardbookRepository.cardbookDisplayCards[dirPrefId+"::categories::"+aCategory.name].cards.length == 0 &&
					cardbookRepository.cardbookCategories[dirPrefId+"::"+aCategory.name]) {
					let otherCat = cardbookRepository.cardbookCategories[dirPrefId+"::"+aCategory.name];
					cardbookRepository.removeCategoryFromDisplay(otherCat, dirPrefId);
					cardbookRepository.removeCategoryFromCache(otherCat);
					cardbookRepository.removeCategoryFromList(otherCat);
				}
			}
			if (aCacheDeletion) {
				cardbookRepository.removeCategoryFromCache(aCategory);
			} else {
				cardbookRepository.cardbookUtils.addTagDeleted(aCategory);
				cardbookRepository.addCategoryToCache(aCategory, true, aCategory.dirPrefId);
			}
			cardbookRepository.removeCategoryFromList(aCategory);
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.removeCategoryFromRepository error : " + e, "Error");
		}
	},

	updateCategoryFromRepository: function (aNewCategory, aOldCategory, aDirPrefId) {
		try {
			cardbookRepository.updateCategoryFromDisplay(aNewCategory, aOldCategory, aDirPrefId);
			cardbookRepository.removeCategoryFromCache(aOldCategory);
			cardbookRepository.addCategoryToCache(aNewCategory, true, aDirPrefId);
			cardbookRepository.removeCategoryFromList(aOldCategory);
			cardbookRepository.addCategoryToList(aNewCategory);
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.updateCategoryFromRepository error : " + e, "Error");
		}
	},

	addCardToRepository: async function (aCard, aMode) {
		try {
			// needed only once when using > 55.2
			if ((cardbookRepository.cardbookPreferences.getType(aCard.dirPrefId) == "GOOGLE")
					&& !aCard.created && !aCard.updated) {
				for (let category of aCard.categories) {
					if (!cardbookRepository.cardbookCategories[aCard.dirPrefId+"::"+category]) {
						cardbookRepository.cardbookUtils.addTagUpdated(aCard);
						break;
					} else if (cardbookRepository.cardbookCategories[aCard.dirPrefId+"::"+category].created === true) {
						cardbookRepository.cardbookUtils.addTagUpdated(aCard);
						break;
					}
				}
			}
			cardbookRepository.addCardToEmails(aCard);
			cardbookRepository.addCardToLongSearch(aCard);
			cardbookRepository.addCardToShortSearch(aCard);
			cardbookRepository.addCardToList(aCard);
			await cardbookRepository.addCardToCache(aCard, aMode);
			cardbookRepository.addCardToDisplayAndCat(aCard, aCard.dirPrefId);
			cardbookRepository.addCardToOrg(aCard, aCard.dirPrefId);
			for (var dirPrefId in cardbookRepository.cardbookComplexSearch) {
				if (cardbookRepository.cardbookPreferences.getEnabled(dirPrefId) && cardbookRepository.isMyCardFound(aCard, dirPrefId)) {
					cardbookRepository.addCardToDisplayAndCat(aCard, dirPrefId);
				}
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.addCardToRepository error : " + e, "Error");
		}
	},

	addCategoryToRepository: function (aCategory, aMode, aDirPrefId) {
		try {
			cardbookRepository.addCategoryToList(aCategory);
			cardbookRepository.addCategoryToCache(aCategory, aMode, aDirPrefId);
			cardbookRepository.addCategoryToDisplay(aCategory, aDirPrefId);
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.addCategoryToRepository error : " + e, "Error");
		}
	},

	addCardToList: function(aCard) {
		cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid] = aCard;
	},
		
	addCategoryToList: function(aCategory) {
		cardbookRepository.cardbookCategories[aCategory.cbid] = aCategory;
	},
		
	removeCardFromList: function(aCard) {
		delete cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
	},
		
	removeCategoryFromList: function(aCategory) {
		delete cardbookRepository.cardbookCategories[aCategory.cbid];
	},
		
	addCardToCache: async function(aCard, aAddCardToCache) {
		try {
			var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aCard.dirPrefId);
			var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(aCard.dirPrefId);
			var myDirPrefIdUrl = cardbookRepository.cardbookPreferences.getUrl(aCard.dirPrefId);
			var myDirPrefIdDBCached = cardbookRepository.cardbookPreferences.getDBCached(aCard.dirPrefId);

			for (let media of cardbookRepository.allColumns.media) {
				if (aAddCardToCache) {
					await cardbookRepository.cardbookUtils.cachePutMediaCard(aCard, media);
				}
			}
			cardbookRepository.cardbookUtils.setCacheURIFromCard(aCard, myDirPrefIdType);
			
			if (myDirPrefIdType == "DIRECTORY") {
				if (aAddCardToCache) {
					var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
					myFile.initWithPath(myDirPrefIdUrl);
					myFile.append(aCard.cacheuri);
					await cardbookRepository.cardbookSynchronization.writeCardsToFile(myFile.path, [aCard]);
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(myDirPrefIdName + " : debug mode : Contact " + aCard.fn + " written to directory");
				}
			} else if (myDirPrefIdType != "FILE") {
				if (cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId]) {
					cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aCard.cacheuri] = aCard;
				} else {
					cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId] = {};
					cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aCard.cacheuri] = aCard;
				}
				if (myDirPrefIdDBCached && aAddCardToCache) {
						cardbookIDBCard.addCard(myDirPrefIdName, aCard);
				}
			}
		}	catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.addCardToCache error : " + e, "Error");
		}
	},

	addCategoryToCache: function(aCategory, aAddCardToCache, aDirPrefId) {
		try {
			var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aDirPrefId);

			if (!cardbookRepository.cardbookFileCacheCategories[aDirPrefId]) {
				cardbookRepository.cardbookFileCacheCategories[aDirPrefId] = {};
			}
			cardbookRepository.cardbookFileCacheCategories[aDirPrefId][aCategory.href] = aCategory;
			if (aAddCardToCache && aCategory.name != cardbookRepository.cardbookUncategorizedCards) {
				cardbookIDBCat.addCategory(myDirPrefIdName, aCategory);
			}
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.addCategoryToCache error : " + e, "Error");
		}
	},

	removeCardFromCache: async function(aCard) {
		try {
			var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aCard.dirPrefId);
			var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(aCard.dirPrefId);
			var myDirPrefIdUrl = cardbookRepository.cardbookPreferences.getUrl(aCard.dirPrefId);
			var myDirPrefIdDBCached = cardbookRepository.cardbookPreferences.getDBCached(aCard.dirPrefId);

			await cardbookRepository.cacheDeleteMediaCard(aCard, myDirPrefIdName);
			
			if (myDirPrefIdType === "DIRECTORY") {
				var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
				myFile.initWithPath(myDirPrefIdUrl);
				myFile.append(aCard.cacheuri);
				if (myFile.exists() && myFile.isFile()) {
					myFile.remove(true);
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(myDirPrefIdName + " : debug mode : Contact " + aCard.fn + " deleted from directory");
				}
			} else if (myDirPrefIdDBCached) {
				cardbookIDBCard.removeCard(myDirPrefIdName, aCard);
				if (cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aCard.cacheuri]) {
					delete cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aCard.cacheuri];
				}
			}
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.removeCardFromCache error : " + e, "Error");
		}
	},

	removeCategoryFromCache: function(aCategory) {
		try {
			var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aCategory.dirPrefId);
			cardbookIDBCat.removeCategory(myDirPrefIdName, aCategory);
			if (cardbookRepository.cardbookFileCacheCategories[aCategory.dirPrefId][aCategory.href]) {
				delete cardbookRepository.cardbookFileCacheCategories[aCategory.dirPrefId][aCategory.href];
			}
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.removeCategoryFromCache error : " + e, "Error");
		}
	},

	cacheDeleteMediaCard: async function(aCard, aDirPrefName) {
		try {
			for (let media of cardbookRepository.allColumns.media) {
				await cardbookIDBImage.removeImage( media, aDirPrefName,
														{cbid: aCard.dirPrefId+"::"+aCard.uid, dirPrefId: aCard.dirPrefId, extension: aCard[media].extension, content: aCard[media].value},
														aCard.fn);
			}
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.cacheDeleteMediaCard error : " + e, "Error");
		}
	},

	addCardToDisplayAndCat: function(aCard, aDirPrefId) {
		cardbookRepository.cardbookDisplayCards[aDirPrefId].cards.push(aCard);
		cardbookRepository.addCardToDisplayModified(aCard, aDirPrefId);

		function addProcess(aId, aCategory) {
			if (!cardbookRepository.cardbookCategories[aDirPrefId+"::"+aCategory]) {
				var category = new cardbookCategoryParser(aCategory, aDirPrefId);
				cardbookRepository.cardbookUtils.addTagCreated(category);
				cardbookRepository.addCategoryToRepository(category, true, aDirPrefId);
			}
			if (!cardbookRepository.cardbookDisplayCards[aId]) {
				cardbookRepository.cardbookDisplayCards[aId] = {modified: 0, cards: []};
			}
			cardbookRepository.cardbookDisplayCards[aId].cards.push(aCard);
			cardbookRepository.addCardToDisplayModified(aCard, aId);
		}
		if (aCard.categories.length != 0) {
			for (let category of aCard.categories) {
				addProcess(aDirPrefId+"::categories::"+category, category);
			}
		} else {
			addProcess(aDirPrefId+"::categories::"+cardbookRepository.cardbookUncategorizedCards, cardbookRepository.cardbookUncategorizedCards);
		}
		if (cardbookRepository.cardbookSearchMode === "SEARCH") {
			if (cardbookRepository.getLongSearchString(aCard).indexOf(cardbookRepository.cardbookSearchValue) >= 0) {
				cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue].cards.push(aCard);
				cardbookRepository.addCardToDisplayModified(aCard, cardbookRepository.cardbookSearchValue);
			}
		}
		cardbookRepository.setEmptyContainer(aDirPrefId);
	},
		
	addCategoryToDisplay: function(aCategory, aDirPrefId) {
		if (!cardbookRepository.cardbookAccountsCategories[aDirPrefId]) {
			cardbookRepository.cardbookAccountsCategories[aDirPrefId] = [];
		}
		if (!cardbookRepository.cardbookAccountsCategories[aDirPrefId].includes(aCategory.name)) {
			cardbookRepository.cardbookAccountsCategories[aDirPrefId].push(aCategory.name);
			cardbookRepository.cardbookUtils.sortArrayByString(cardbookRepository.cardbookAccountsCategories[aDirPrefId],1);
		}
		if (!cardbookRepository.cardbookDisplayCards[aDirPrefId+"::categories::"+aCategory.name]) {
			cardbookRepository.cardbookDisplayCards[aDirPrefId+"::categories::"+aCategory.name] = {modified: 0, cards: []};
		}
	},
		
	removeCardFromDisplayAndCat: function(aCard, aDirPrefId) {
		if (cardbookRepository.cardbookDisplayCards[aDirPrefId]) {
			let ABType = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
			cardbookRepository.cardbookDisplayCards[aDirPrefId].cards = cardbookRepository.cardbookDisplayCards[aDirPrefId].cards.filter(child => child.dirPrefId + child.uid != aCard.dirPrefId + aCard.uid);
			cardbookRepository.removeCardFromDisplayModified(aCard, aDirPrefId);
			function deleteProcess(aId, aCategoryName) {
				if (cardbookRepository.cardbookDisplayCards[aId]) {
					cardbookRepository.cardbookDisplayCards[aId].cards = cardbookRepository.cardbookDisplayCards[aId].cards.filter(child => child.dirPrefId + child.uid != aCard.dirPrefId + aCard.uid);
					if (cardbookRepository.cardbookDisplayCards[aId].cards.length == 0 && ABType == "SEARCH") {
						let category = cardbookRepository.cardbookCategories[aDirPrefId+"::"+aCategoryName];
						cardbookRepository.removeCategoryFromRepository(category, true, aDirPrefId);
					} else {
						cardbookRepository.removeCardFromDisplayModified(aCard, aId);
					}
				}
			}
			function deleteProcessUncategorized(aId) {
				if (cardbookRepository.cardbookDisplayCards[aId]) {
					cardbookRepository.cardbookDisplayCards[aId].cards = cardbookRepository.cardbookDisplayCards[aId].cards.filter(child => child.dirPrefId + child.uid != aCard.dirPrefId + aCard.uid);
					if (cardbookRepository.cardbookDisplayCards[aId].cards.length == 0) {
						let category = cardbookRepository.cardbookCategories[aDirPrefId+"::"+cardbookRepository.cardbookUncategorizedCards];
						cardbookRepository.removeCategoryFromRepository(category, true, aDirPrefId);
					} else {
						cardbookRepository.removeCardFromDisplayModified(aCard, aId);
					}
				}
			}
			if (aCard.categories.length != 0) {
				for (var category of aCard.categories) {
					deleteProcess(aDirPrefId+"::categories::"+category, category);
				}
			} else {
				deleteProcessUncategorized(aDirPrefId+"::categories::"+cardbookRepository.cardbookUncategorizedCards);
			}
		}
		if (cardbookRepository.cardbookSearchMode === "SEARCH") {
			function searchCard(element) {
				return (element.dirPrefId + element.uid != aDirPrefId + aCard.uid);
			}
			cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue].cards = cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue].cards.filter(searchCard);
			cardbookRepository.removeCardFromDisplayModified(aCard, cardbookRepository.cardbookSearchValue);
		}
		cardbookRepository.setEmptyContainer(aDirPrefId);
	},

	removeCategoryFromDisplay: function(aCategory, aDirPrefId) {
		cardbookRepository.cardbookAccountsCategories[aDirPrefId] = cardbookRepository.cardbookAccountsCategories[aDirPrefId].filter(child => child != aCategory.name);
		if (cardbookRepository.cardbookDisplayCards[aDirPrefId+"::categories::"+aCategory.name]) {
			delete cardbookRepository.cardbookDisplayCards[aDirPrefId+"::categories::"+aCategory.name];
		}
	},

	updateCategoryFromDisplay: function(aNewCategory, aOldCategory, aDirPrefId) {
		if (!cardbookRepository.cardbookAccountsCategories[aDirPrefId]) {
			cardbookRepository.cardbookAccountsCategories[aDirPrefId] = [];
		}
		cardbookRepository.cardbookAccountsCategories[aDirPrefId] = cardbookRepository.cardbookAccountsCategories[aDirPrefId].filter(child => child != aOldCategory.name);
		if (!cardbookRepository.cardbookAccountsCategories[aDirPrefId].includes(aNewCategory.name)) {
			cardbookRepository.cardbookAccountsCategories[aDirPrefId].push(aNewCategory.name);
			cardbookRepository.cardbookUtils.sortArrayByString(cardbookRepository.cardbookAccountsCategories[aDirPrefId],1);
		}
		let id = aDirPrefId+"::categories::"+aOldCategory.name;
		if (cardbookRepository.cardbookDisplayCards[id]) {
			let oldDisplay = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[id]));
			delete cardbookRepository.cardbookDisplayCards[id];
			cardbookRepository.cardbookDisplayCards[aDirPrefId+"::categories::"+aNewCategory.name] = oldDisplay;
		}
	},

	addCardToOrg: function(aCard, aDirPrefId) {
		if (cardbookRepository.cardbookPreferences.getNode(aDirPrefId) != "org") {
			return;
		}
		function addProcess(aId, aName, aParentId) {
			let orgExists = cardbookRepository.cardbookAccountsNodes[aDirPrefId].find(child => child.id == aId);
			if (!orgExists) {
				cardbookRepository.cardbookAccountsNodes[aDirPrefId].push({ data: aName, id: aId, children: []});
				cardbookRepository.cardbookUtils.sortMultipleArrayByString(cardbookRepository.cardbookAccountsNodes[aDirPrefId], "data", 1);
				cardbookRepository.cardbookDisplayCards[aId] = {modified: 0, cards: []};
			}
			cardbookRepository.cardbookDisplayCards[aId].cards.push(aCard);
			let parentNodeExists = cardbookRepository.cardbookAccountsNodes[aDirPrefId].find(child => child.id == aParentId);
			if (parentNodeExists && !parentNodeExists.children.includes(aName)) {
				parentNodeExists.children.push(aName);
				cardbookRepository.cardbookUtils.sortArrayByString(parentNodeExists.children, 1);
			}
		}
		let parent = aDirPrefId + "::org";
		if (aCard.org) {
			let orgArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(aCard.org).split(";"));
			for (let org of orgArray) {
				let id = parent + "::" + org;
				addProcess(id, org, parent);
				parent = id;
			}
		} else {
			let uncategorizedCards = cardbookRepository.cardbookUncategorizedCards;
			let id = parent + "::" + uncategorizedCards;
			addProcess(id, uncategorizedCards, parent);
		}
		cardbookRepository.setEmptyContainer(aDirPrefId);
	},
		
	removeCardFromOrg: function(aCard, aDirPrefId) {
		if (cardbookRepository.cardbookPreferences.getNode(aDirPrefId) != "org") {
			return;
		}
		function deleteProcess(aId, aName, aParentId) {
			if (cardbookRepository.cardbookDisplayCards[aId]) {
				cardbookRepository.cardbookDisplayCards[aId].cards = cardbookRepository.cardbookDisplayCards[aId].cards.filter(child => child.dirPrefId + child.uid != aCard.dirPrefId + aCard.uid);
				if (cardbookRepository.cardbookDisplayCards[aId].cards.length == 0) {
					delete cardbookRepository.cardbookDisplayCards[aId];
					cardbookRepository.cardbookAccountsNodes[aDirPrefId] = cardbookRepository.cardbookAccountsNodes[aDirPrefId].filter(child => child.id != aId);
					let upperNode = cardbookRepository.cardbookAccountsNodes[aDirPrefId].find(child => child.id == aParentId);
					if (upperNode) {
						upperNode.children = upperNode.children.filter(child => child != aName);
					}
				} else {
					cardbookRepository.removeCardFromDisplayModified(aCard, aId);
				}
			}
		}
		if (aCard.org) {
			let orgArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(aCard.org).split(";"));
			orgArray.splice(0, 0, aCard.dirPrefId, "org" );
			let id = orgArray.join("::");
			let parent = cardbookRepository.getParentOrg(id);
			for (var i = orgArray.length - 1; i >= 0; i--) {
				let data = orgArray[i];
				deleteProcess(id, data, parent);
				id = parent;
				parent = cardbookRepository.getParentOrg(id);
			}
		} else {
			let uncategorizedCards = cardbookRepository.cardbookUncategorizedCards;
			deleteProcess(aCard.dirPrefId + "::org::" + uncategorizedCards, uncategorizedCards, aCard.dirPrefId);
		}
		cardbookRepository.setEmptyContainer(aDirPrefId);
	},

	addCategoryToCard: function(aCard, aCategoryName) {
		aCard.categories.push(aCategoryName);
		aCard.categories = cardbookRepository.cardbookUtils.cleanCategories(aCard.categories);
	},

	removeCategoryFromCard: function(aCard, aCategoryName) {
		aCard.categories = aCard.categories.filter(child => child != aCategoryName);
	},

	renameCategoryFromCard: function(aCard, aOldCategoryName, aNewCategoryName) {
		cardbookRepository.removeCategoryFromCard(aCard, aOldCategoryName);
		cardbookRepository.addCategoryToCard(aCard, aNewCategoryName);
	},

	removeCardsFromCategory: async function(aDirPrefId, aCategoryName) {
		if (cardbookRepository.cardbookDisplayCards[aDirPrefId+"::categories::"+aCategoryName]) {
			var myCards = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[aDirPrefId+"::categories::"+aCategoryName].cards));
			var length = myCards.length;
			for (let card of myCards) {
				var myOutCard = new cardbookCardParser();
				cardbookRepository.cardbookUtils.cloneCard(card, myOutCard);
				cardbookRepository.removeCategoryFromCard(myOutCard, aCategoryName);
				cardbookRepository.cardbookUtils.setCalculatedFields(myOutCard);
				await cardbookRepository.cardbookUtils.changeMediaFromFileToContent(myOutCard);
				if (!myOutCard.created) {
					cardbookRepository.cardbookUtils.addTagUpdated(myOutCard);
				}
				await cardbookRepository.removeCardFromRepository(card, true);
				await cardbookRepository.addCardToRepository(myOutCard, true);
			}
		}
	},

	getParentOrg: function (aId) {
		let idArray = aId.split("::");
		idArray.pop();
		return idArray.join("::");
	},

	addOrgToCard: function(aCard, aNodeId) {
		let nodeArray = cardbookRepository.cardbookUtils.escapeStringSemiColon(aNodeId).split("::");
		nodeArray.shift();
		nodeArray.shift();
		aCard.org = cardbookRepository.cardbookUtils.unescapeStringSemiColon(nodeArray.join(";"));
	},

	removeOrgFromCard: function(aCard, aNodeId) {
		let orgArray = cardbookRepository.cardbookUtils.escapeString(aCard.org).split(";");
		let nodeIdArray = aNodeId.split("::");
		while (orgArray.length >= nodeIdArray.length - 2) {
			orgArray.pop();
		}
		aCard.org = cardbookRepository.cardbookUtils.unescapeStringSemiColon(orgArray.join(";"));
	},

	renameOrgFromCard: function(aCard, aNodeId, aNewNodeName) {
		let orgArray = cardbookRepository.cardbookUtils.escapeString(aCard.org).split(";");
		let nodeIdArray = aNodeId.split("::");
		orgArray[nodeIdArray.length - 3] = cardbookRepository.cardbookUtils.escapeStringSemiColon(aNewNodeName);
		aCard.org = cardbookRepository.cardbookUtils.unescapeStringSemiColon(orgArray.join(";"));
	},

	renameUncategorized: function(aOldCategoryName, aNewCategoryName) {
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.uncategorizedCards", aNewCategoryName);
		for (let account of cardbookRepository.cardbookAccounts) {
			if (account[1] && account[5]) {
				let myDirPrefId = account[4];
				for (let category of cardbookRepository.cardbookAccountsCategories[myDirPrefId]) {
					if (category == aOldCategoryName) {
						category = aNewCategoryName;
					}
				}
				if (cardbookRepository.cardbookDisplayCards[myDirPrefId+"::categories::"+aOldCategoryName]) {
					cardbookRepository.cardbookDisplayCards[myDirPrefId+"::categories::"+aNewCategoryName] = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[myDirPrefId+"::categories::"+aOldCategoryName]));
					delete cardbookRepository.cardbookDisplayCards[myDirPrefId+"::categories::"+aOldCategoryName];
					var oldCat = cardbookRepository.cardbookCategories[myDirPrefId+"::"+aOldCategoryName];
					cardbookRepository.deleteCategories([oldCat]);
					var newCat = new cardbookCategoryParser(aNewCategoryName, myDirPrefId);
					cardbookRepository.saveCategory({}, newCat);
				}
				if (cardbookRepository.cardbookDisplayCards[myDirPrefId+"::org::"+aOldCategoryName]) {
					cardbookRepository.cardbookDisplayCards[myDirPrefId+"::org::"+aNewCategoryName] = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[myDirPrefId+"::org::"+aOldCategoryName]));
					delete cardbookRepository.cardbookDisplayCards[myDirPrefId+"::org::"+aOldCategoryName];
				}
				let nodeExists = cardbookRepository.cardbookAccountsNodes[myDirPrefId].find(child => child.id == myDirPrefId + "::org::" + aOldCategoryName);
				if (nodeExists) {
					nodeExists.data = aNewCategoryName;
					nodeExists.id = myDirPrefId + "::org::" + aNewCategoryName;
				}
			}
		}
		cardbookRepository.cardbookUncategorizedCards = aNewCategoryName;
	},

	saveNodeColors: function() {
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.categoryColors", JSON.stringify(cardbookRepository.cardbookNodeColors));
	},

	addCardToDisplayModified: function(aCard, aAccountId) {
		if (aCard.updated || aCard.created) {
			cardbookRepository.cardbookDisplayCards[aAccountId].modified = cardbookRepository.cardbookDisplayCards[aAccountId].modified + 1;
		}
	},

	removeCardFromDisplayModified: function(aCard, aAccountId) {
		if (aCard.updated || aCard.created) {
			cardbookRepository.cardbookDisplayCards[aAccountId].modified = cardbookRepository.cardbookDisplayCards[aAccountId].modified - 1 ;
		}
	},

	addCardToEmails: function(aCard) {
		for (var i = 0; i < aCard.email.length; i++) {
			var myEmail = aCard.email[i][0][0].toLowerCase();
			if (myEmail) {
				if (!cardbookRepository.cardbookCardEmails[aCard.dirPrefId]) {
					cardbookRepository.cardbookCardEmails[aCard.dirPrefId] = {};
				}
				if (!cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail]) {
					cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail] = [];
				}
				cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail].push(aCard);
			}
		}
	},
		
	removeCardFromEmails: function(aCard) {
		if (cardbookRepository.cardbookCardEmails[aCard.dirPrefId]) {
			for (var i = 0; i < aCard.email.length; i++) {
				var myEmail = aCard.email[i][0][0].toLowerCase();
				if (myEmail) {
					if (cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail]) {
						if (cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail].length == 1) {
							delete cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail];
						} else {
							function searchCard(element) {
								return (element.dirPrefId+"::"+element.uid != aCard.dirPrefId+"::"+aCard.uid);
							}
							cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail] = cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail].filter(searchCard);
						}
					}
				}
			}
		}
	},

	isMyCardFoundInDirPrefId: function (aCard, aComplexSearchDirPrefId) {
		var myRegexp;
		var inverse;
		var myField = [];
		var result;
	
		function buildRegExp(aCard, aCase, aField, aTerm, aValue, aDiacritic) {
			myField = cardbookRepository.cardbookUtils.getCardValueByField(aCard, aField, false);
			if (aDiacritic && myField.length != 0) {
				for (var i = 0; i < myField.length; i++) {
					myField[i] = cardbookRepository.normalizeString(myField[i]);
				}
			}
			if (aTerm == "Contains") {
				myRegexp = new RegExp("(.*)" + aValue + "(.*)", aCase);
				inverse = false;
			} else if (aTerm == "DoesntContain") {
				myRegexp = new RegExp("(.*)" + aValue + "(.*)", aCase);
				inverse = true;
			} else if (aTerm == "Is") {
				myRegexp = new RegExp("^" + aValue + "$", aCase);
				inverse = false;
			} else if (aTerm == "Isnt") {
				myRegexp = new RegExp("^" + aValue + "$", aCase);
				inverse = true;
			} else if (aTerm == "BeginsWith") {
				myRegexp = new RegExp("^" + aValue + "(.*)", aCase);
				inverse = false;
			} else if (aTerm == "EndsWith") {
				myRegexp = new RegExp("(.*)" + aValue + "$", aCase);
				inverse = false;
			} else if (aTerm == "IsEmpty") {
				myRegexp = new RegExp("^$", aCase);
				inverse = false;
			} else if (aTerm == "IsntEmpty") {
				myRegexp = new RegExp("^$", aCase);
				inverse = true;
			}
		};

		for (let rule of cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules) {
			var myCaseOperator = rule.case;
			if (myCaseOperator.startsWith("d")) {
				var myDiacritic = true;
				var myCaseOperator = rule.case.substr(1);
				var myValue = cardbookRepository.normalizeString(rule.value);
			} else {
				var myDiacritic = false;
				var myCaseOperator = rule.case;
				var myValue = rule.value;
			}
		
			buildRegExp(aCard, myCaseOperator, rule.field, rule.term, myValue, myDiacritic);
			function searchArray(element) {
				return element.search(myRegexp) != -1;
			};
			if (myField.length == 0) {
				if (rule.term == "IsEmpty") {
					var found = true;
				} else if (rule.term == "IsntEmpty") {
					var found = true;
				} else {
					var found = false;
				}
			} else if (myField.find(searchArray) == undefined) {
				var found = false;
			} else {
				var found = true;
			}
			
			if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].matchAll) {
				result = true;
				if ((!found && !inverse) || (found && inverse)) {
					result = false;
					break;
				}
			} else {
				result = false;
				if ((found && !inverse) || (!found && inverse)) {
					result = true;
					break;
				}
			}
		}
		return result;
	},

	isMyCardFound: function (aCard, aComplexSearchDirPrefId) {
		if (!cardbookRepository.cardbookPreferences.getEnabled(aComplexSearchDirPrefId)) {
			return false;
		}
		if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId]) {
			if ((cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].searchAB == aCard.dirPrefId) || (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].searchAB === "allAddressBooks")) {
				return cardbookRepository.isMyCardFoundInDirPrefId(aCard, aComplexSearchDirPrefId);
			}
		}
		return false;
	},

	verifyABRestrictions: function (aDirPrefId, aSearchAB, aABExclRestrictions, aABInclRestrictions) {
		if (aABExclRestrictions[aDirPrefId]) {
			return false;
		}
		if (((aABInclRestrictions.length == 0) && ((aSearchAB == aDirPrefId) || (aSearchAB === "allAddressBooks"))) ||
			((aABInclRestrictions.length > 0) && ((aSearchAB == aDirPrefId) || ((aSearchAB === "allAddressBooks") && aABInclRestrictions[aDirPrefId])))) {
			return true;
		} else {
			return false;
		}
	},
	
	verifyCatRestrictions: function (aDirPrefId, aCategory, aSearchInput, aABExclRestrictions, aCatExclRestrictions, aCatInclRestrictions) {
		if (aABExclRestrictions[aDirPrefId]) {
			return false;
		}
		if (aCatExclRestrictions[aDirPrefId] && aCatExclRestrictions[aDirPrefId][aCategory]) {
			return false;
		}
		if (((!(aCatInclRestrictions[aDirPrefId])) && (aCategory.replace(/[\s+\-+\.+\,+\;+]/g, "").toUpperCase().indexOf(aSearchInput) >= 0 || aSearchInput == "")) ||
				((aCatInclRestrictions[aDirPrefId]) && (aCatInclRestrictions[aDirPrefId][aCategory]))) {
			return true;
		} else {
			return false;
		}
	},

	isEmailRegistered: function(aEmail, aIdentityKey) {
		var ABInclRestrictions = {};
		var ABExclRestrictions = {};
		var catInclRestrictions = {};
		var catExclRestrictions = {};

		function _loadRestrictions(aIdentityKey) {
			var result = [];
			result = cardbookRepository.cardbookPreferences.getAllRestrictions();
			ABInclRestrictions = {};
			ABExclRestrictions = {};
			catInclRestrictions = {};
			catExclRestrictions = {};
			if (!aIdentityKey) {
				ABInclRestrictions["length"] = 0;
				return;
			}
			for (var i = 0; i < result.length; i++) {
				var resultArray = result[i];
				if ((resultArray[0] == "true") && (resultArray[3] != "") && ((resultArray[2] == aIdentityKey) || (resultArray[2] == "allMailAccounts"))) {
					if (resultArray[1] == "include") {
						ABInclRestrictions[resultArray[3]] = 1;
						if (resultArray[4]) {
							if (!(catInclRestrictions[resultArray[3]])) {
								catInclRestrictions[resultArray[3]] = {};
							}
							catInclRestrictions[resultArray[3]][resultArray[4]] = 1;
						}
					} else {
						if (resultArray[4]) {
							if (!(catExclRestrictions[resultArray[3]])) {
								catExclRestrictions[resultArray[3]] = {};
							}
							catExclRestrictions[resultArray[3]][resultArray[4]] = 1;
						} else {
							ABExclRestrictions[resultArray[3]] = 1;
						}
					}
				}
			}
			ABInclRestrictions["length"] = cardbookRepository.cardbookUtils.sumElements(ABInclRestrictions);
		};
		
		_loadRestrictions(aIdentityKey);
		
		if (aEmail) {
			var myEmail = aEmail.toLowerCase();
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && account[5] && (account[6] != "SEARCH")) {
					var myDirPrefId = account[4];
					if (cardbookRepository.verifyABRestrictions(myDirPrefId, "allAddressBooks", ABExclRestrictions, ABInclRestrictions)) {
						if (cardbookRepository.cardbookCardEmails[myDirPrefId]) {
							if (cardbookRepository.cardbookCardEmails[myDirPrefId][myEmail]) {
								for (let card of cardbookRepository.cardbookCardEmails[myDirPrefId][myEmail]) {
									if (catExclRestrictions[myDirPrefId]) {
										var add = true;
										for (var l in catExclRestrictions[myDirPrefId]) {
											if (card.categories.includes(l)) {
												add = false;
												break;
											}
										}
										if (!add) {
											continue;
										}
									}
									if (catInclRestrictions[myDirPrefId]) {
										var add = false;
										for (var l in catInclRestrictions[myDirPrefId]) {
											if (card.categories.includes(l)) {
												add = true;
												break;
											}
										}
										if (!add) {
											continue;
										}
									}
									return true;
								}
							}
						}
					}
				}
			}
		}
		return false;
	},

	// this function is only used by the CardBook filters
	// as mail account restrictions do not apply to filters
	isEmailInPrefIdRegistered: function(aDirPrefId, aEmail) {
		if (aEmail) {
			var myTestString = aEmail.toLowerCase();
			// search for a category
			var mySepPosition = aDirPrefId.indexOf("::",0);
			if (mySepPosition != -1) {
				var myCategory = aDirPrefId.substr(mySepPosition+2,aDirPrefId.length);
				aDirPrefId = aDirPrefId.substr(0,mySepPosition);
				if (cardbookRepository.cardbookCardEmails[aDirPrefId]) {
					if (cardbookRepository.cardbookCardEmails[aDirPrefId][myTestString]) {
						for (let card of cardbookRepository.cardbookCardEmails[aDirPrefId][myTestString]) {
							if (myCategory == cardbookRepository.cardbookUncategorizedCards) {
								if (card.categories == "") {
									return true;
								}
							} else {
								if (card.categories.includes(myCategory)) {
									return true;
								}
							}
						}
					}
				}
			} else {
				if (cardbookRepository.cardbookCardEmails[aDirPrefId]) {
					if (cardbookRepository.cardbookCardEmails[aDirPrefId][myTestString]) {
						return true;
					}
				}
			}
		}
		return false;
	},
		
	addCardToLongSearch: function(aCard) {
		var myLongText = cardbookRepository.getLongSearchString(aCard);
		if (myLongText) {
			if (!cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId]) {
				cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId] = {};
			}
			if (!cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText]) {
				cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText] = [];
			}
			cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText].push(aCard);
		}
	},
		
	removeCardFromLongSearch: function(aCard) {
		var myLongText = cardbookRepository.getLongSearchString(aCard);
		if (myLongText) {
			if (cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId] && cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText]) {
				if (cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText].length == 1) {
					delete cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText];
				} else {
					function searchCard(element) {
						return (element.dirPrefId+"::"+element.uid != aCard.dirPrefId+"::"+aCard.uid);
					}
					cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText] = cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText].filter(searchCard);
				}
			}
		}
	},

	addCardToShortSearch: function(aCard) {
		if (cardbookRepository.autocompleteRestrictSearch) {
			var myShortText = cardbookRepository.getShortSearchString(aCard);
			if (myShortText) {
				if (!cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId]) {
					cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId] = {};
				}
				if (!cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText]) {
					cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText] = [];
				}
				cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText].push(aCard);
			}
		} else {
			cardbookRepository.cardbookCardShortSearch = {};
		}
	},
		
	removeCardFromShortSearch: function(aCard) {
		if (cardbookRepository.autocompleteRestrictSearch) {
			var myShortText = cardbookRepository.getShortSearchString(aCard);
			if (myShortText) {
				if (cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText]) {
					if (cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText].length == 1) {
						delete cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText];
					} else {
						function searchCard(element) {
							return (element.dirPrefId+"::"+element.uid != aCard.dirPrefId+"::"+aCard.uid);
						}
						cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText] = cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText].filter(searchCard);
					}
				}
			}
		}
	},

	addCardToAction: async function (aActionId, aType, aCard) {
		let action = cardbookRepository.currentAction[aActionId];
		let tempCard = new cardbookCardParser();
		cardbookRepository.cardbookUtils.cloneCard(aCard, tempCard);
		tempCard.cacheuri = aCard.cacheuri;
		await cardbookRepository.cardbookUtils.changeMediaFromFileToContent(tempCard);
		action[aType].push(tempCard);
		cardbookRepository.currentAction[aActionId].files.push(tempCard.dirPrefId);
		if (aType == "newCards") {
			cardbookRepository.currentAction[aActionId].doneCards++;
		}
	},

	saveCategory: function(aOldCat, aNewCat, aActionId) {
		try {
			if (cardbookRepository.cardbookPreferences.getReadOnly(aNewCat.dirPrefId) || !cardbookRepository.cardbookPreferences.getEnabled(aNewCat.dirPrefId)) {
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					cardbookRepository.currentAction[aActionId].doneCats++;
				}
				return;
			}

			if (aActionId && cardbookRepository.currentAction[aActionId]) {
				cardbookRepository.currentAction[aActionId].totalCats++;
				cardbookRepository.currentAction[aActionId].files.push(aNewCat.dirPrefId);
			}

			var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aNewCat.dirPrefId);
			var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(aNewCat.dirPrefId);
			// Existing category
			if (aOldCat.dirPrefId && cardbookRepository.cardbookCategories[aOldCat.cbid]) {
				cardbookRepository.removeCategoryFromRepository(aOldCat, true, aOldCat.dirPrefId);
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					cardbookRepository.currentAction[aActionId].oldCats.push(aOldCat);
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("categoryRenamed", [myDirPrefIdName, aNewCat.name]);
				if (!aNewCat.created) {
					cardbookRepository.cardbookUtils.addTagUpdated(aNewCat);
				}
				cardbookRepository.addCategoryToRepository(aNewCat, true, aNewCat.dirPrefId);
			// New category
			} else {
				cardbookRepository.cardbookUtils.formatStringForOutput("categoryCreated", [myDirPrefIdName, aNewCat.name]);
				cardbookRepository.cardbookUtils.addTagCreated(aNewCat);
				cardbookRepository.addCategoryToRepository(aNewCat, true, aNewCat.dirPrefId);
			}
			if (aActionId && cardbookRepository.currentAction[aActionId]) {
				cardbookRepository.currentAction[aActionId].newCats.push(aNewCat);
				cardbookRepository.currentAction[aActionId].doneCats++;
			}
			aOldCat = null;
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.saveCategory error : " + e, "Error");
		}
	},

	deleteCategories: function (aListOfCategories, aActionId) {
		try {
			var length = aListOfCategories.length;
			for (var i = 0; i < length; i++) {
				var myDirPrefId = aListOfCategories[i].dirPrefId;
				if (cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId) || !cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId)) {
					if (aActionId && cardbookRepository.currentAction[aActionId]) {
						cardbookRepository.currentAction[aActionId].doneCats++;
					}
					continue;
				}
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					cardbookRepository.currentAction[aActionId].oldCats.push(aListOfCategories[i]);
					cardbookRepository.currentAction[aActionId].files.push(myDirPrefId);
				}
				var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);
				var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(myDirPrefId);
				if (myDirPrefIdType == "GOOGLE" || myDirPrefIdType == "GOOGLE2" || myDirPrefIdType == "GOOGLE3") {
					if (aListOfCategories[i].created) {
						cardbookRepository.removeCategoryFromRepository(aListOfCategories[i], true, myDirPrefId);
					} else {
						cardbookRepository.cardbookUtils.addTagDeleted(aListOfCategories[i]);
						cardbookRepository.removeCategoryFromRepository(aListOfCategories[i], false, myDirPrefId);
					}
				} else {
					cardbookRepository.removeCategoryFromRepository(aListOfCategories[i], true, myDirPrefId);
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("categoryDeleted", [myDirPrefIdName, aListOfCategories[i].name]);
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					cardbookRepository.currentAction[aActionId].doneCats++;
				}
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.deleteCategories error : " + e, "Error");
		}
	},

	saveCardFromUpdate: async function(aOldCard, aNewCard, aActionId, aCheckCategory) {
		cardbookRepository.cardbookUtils.setCalculatedFields(aNewCard);
		await cardbookRepository.saveCard(aOldCard, aNewCard, aActionId, aCheckCategory);
	},

	saveCardFromMove: async function(aOldCard, aNewCard, aActionId, aCheckCategory) {
		if (aNewCard.rev) {
			cardbookRepository.cardbookUtils.setCalculatedFieldsWithoutRev(aNewCard);
		} else {
			cardbookRepository.cardbookUtils.setCalculatedFields(aNewCard);
		}
		await cardbookRepository.saveCard(aOldCard, aNewCard, aActionId, aCheckCategory);
	},

	saveCard: async function(aOldCard, aNewCard, aActionId, aCheckCategory) {
		try {
			if (cardbookRepository.cardbookPreferences.getReadOnly(aNewCard.dirPrefId) || !cardbookRepository.cardbookPreferences.getEnabled(aNewCard.dirPrefId)) {
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					cardbookRepository.currentAction[aActionId].doneCards++;
				}
				return;
			}

			var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(aNewCard.dirPrefId);
			var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aNewCard.dirPrefId);

			if (aActionId && cardbookRepository.currentAction[aActionId]) {
				cardbookRepository.currentAction[aActionId].addedCards++;
				cardbookRepository.currentAction[aActionId].totalCards++;
			}

			// category creation
			for (let category of aNewCard.categories) {
				if (!cardbookRepository.cardbookCategories[aNewCard.dirPrefId+"::"+category]) {
					let newCategory = new cardbookCategoryParser(category, aNewCard.dirPrefId);
					cardbookRepository.cardbookUtils.addTagCreated(newCategory);
					cardbookRepository.cardbookUtils.formatStringForOutput("categoryCreated", [myDirPrefIdName, category]);
					cardbookRepository.addCategoryToRepository(newCategory, true, aNewCard.dirPrefId);
					if (aActionId && cardbookRepository.currentAction[aActionId]) {
						cardbookRepository.currentAction[aActionId].newCats.push(newCategory);
					}
					if (aCheckCategory) {
						cardbookRepository.cardbookActions.addActivity("categoryCreated", [myDirPrefIdName, category], "addItem");
					}
				}
			}

			// Existing card
			if (aOldCard.dirPrefId && cardbookRepository.cardbookCards[aOldCard.dirPrefId+"::"+aNewCard.uid] && aOldCard.dirPrefId == aNewCard.dirPrefId) {
				var myCard = cardbookRepository.cardbookCards[aOldCard.dirPrefId+"::"+aNewCard.uid];
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					await cardbookRepository.addCardToAction(aActionId, "oldCards", myCard);
				}
				if (myDirPrefIdType === "FILE" || myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					await cardbookRepository.removeCardFromRepository(myCard, true);
					cardbookRepository.cardbookUtils.nullifyTagModification(aNewCard);
					cardbookRepository.cardbookUtils.nullifyEtag(aNewCard);
					await cardbookRepository.addCardToRepository(aNewCard, true);
				} else {
					if (!aNewCard.created) {
						cardbookRepository.cardbookUtils.addTagUpdated(aNewCard);
						aNewCard.etag = myCard.etag;
					}
					await cardbookRepository.removeCardFromRepository(myCard, true);
					await cardbookRepository.addCardToRepository(aNewCard, true);
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdated", [myDirPrefIdName, aNewCard.fn]);
			// Moved card
			} else if (aOldCard.dirPrefId && aOldCard.dirPrefId != "" && cardbookRepository.cardbookCards[aOldCard.dirPrefId+"::"+aNewCard.uid] && aOldCard.dirPrefId != aNewCard.dirPrefId) {
				var myCard = cardbookRepository.cardbookCards[aOldCard.dirPrefId+"::"+aNewCard.uid];
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					await cardbookRepository.addCardToAction(aActionId, "oldCards", myCard);
				}
				var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myCard.dirPrefId);
				var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(myCard.dirPrefId);
				if (myDirPrefIdType === "FILE" || myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					await cardbookRepository.removeCardFromRepository(myCard, true);
				} else {
					if (myCard.created) {
						await cardbookRepository.removeCardFromRepository(myCard, true);
					} else {
						cardbookRepository.cardbookUtils.addTagDeleted(myCard);
						await cardbookRepository.addCardToCache(myCard, true);
						await cardbookRepository.removeCardFromRepository(myCard, false);
					}
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("cardDeleted", [myDirPrefIdName, myCard.fn]);
				
				var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aNewCard.dirPrefId);
				var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(aNewCard.dirPrefId);
				aNewCard.cardurl = "";
				cardbookRepository.cardbookUtils.nullifyEtag(aNewCard);
				if (myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB" || myDirPrefIdType === "FILE") {
					cardbookRepository.cardbookUtils.nullifyTagModification(aNewCard);
					await cardbookRepository.addCardToRepository(aNewCard, true);
				} else {
					cardbookRepository.cardbookUtils.addTagCreated(aNewCard);
					await cardbookRepository.addCardToRepository(aNewCard, true);
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("cardCreated", [myDirPrefIdName, aNewCard.fn]);
			// New card
			} else {
				cardbookRepository.cardbookUtils.nullifyEtag(aNewCard);
				if (myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB" || myDirPrefIdType === "FILE") {
					cardbookRepository.cardbookUtils.nullifyTagModification(aNewCard);
					await cardbookRepository.addCardToRepository(aNewCard, true);
				} else {
					cardbookRepository.cardbookUtils.addTagCreated(aNewCard);
					await cardbookRepository.addCardToRepository(aNewCard, true);
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("cardCreated", [myDirPrefIdName, aNewCard.fn]);
			}
			
			if (aActionId && cardbookRepository.currentAction[aActionId]) {
				await cardbookRepository.addCardToAction(aActionId, "newCards", aNewCard);
			}
			aOldCard = null;
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.saveCard error : " + e, "Error");
		}
	},

	deleteCards: async function (aListOfCards, aActionId) {
		try {
			for (let card of aListOfCards) {
				var myDirPrefId = card.dirPrefId;
				if (cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId) || !cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId)) {
					if (aActionId && cardbookRepository.currentAction[aActionId]) {
						cardbookRepository.currentAction[aActionId].doneCards++;
					}
					continue;
				}
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					await cardbookRepository.addCardToAction(aActionId, "oldCards", card);
				}
				var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);
				var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(myDirPrefId);
				if (myDirPrefIdType === "FILE" || myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					await cardbookRepository.removeCardFromRepository(card, true);
				} else {
					if (card.created) {
						await cardbookRepository.removeCardFromRepository(card, true);
					} else {
						cardbookRepository.cardbookUtils.addTagDeleted(card);
						await cardbookRepository.addCardToCache(card, true);
						await cardbookRepository.removeCardFromRepository(card, false);
					}
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("cardDeleted", [myDirPrefIdName, card.fn]);
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					cardbookRepository.currentAction[aActionId].doneCards++;
				}
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.deleteCards error : " + e, "Error");
		}
	},

	asyncDeleteCards: function (aListOfCards, aActionId) {
		try {
			Services.tm.currentThread.dispatch({ run: async function() {
				for (let card of aListOfCards) {
					var myDirPrefId = card.dirPrefId;
					if (cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId) || !cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId)) {
						if (aActionId && cardbookRepository.currentAction[aActionId]) {
							cardbookRepository.currentAction[aActionId].doneCards++;
						}
						continue;
					}
					// Services.tm.currentThread.dispatch({ run: async function() {
					if (aActionId && cardbookRepository.currentAction[aActionId]) {
						await cardbookRepository.addCardToAction(aActionId, "oldCards", card);
					}
					var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);
					var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(myDirPrefId);
					if (myDirPrefIdType === "FILE" || myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
						await cardbookRepository.removeCardFromRepository(card, true);
					} else {
						if (card.created) {
							await cardbookRepository.removeCardFromRepository(card, true);
						} else {
							cardbookRepository.cardbookUtils.addTagDeleted(card);
							await cardbookRepository.addCardToCache(card, true);
							await cardbookRepository.removeCardFromRepository(card, false);
						}
					}
					cardbookRepository.cardbookUtils.formatStringForOutput("cardDeleted", [myDirPrefIdName, card.fn]);
					if (aActionId && cardbookRepository.currentAction[aActionId]) {
						cardbookRepository.currentAction[aActionId].doneCards++;
					}
					// }}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
				}
			}}, Components.interfaces.nsIEventTarget.DISPATCH_NORMAL);
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.deleteCards error : " + e, "Error");
		}
	},

	isOutgoingMail: function(aMsgHdr) {
		if (!aMsgHdr) {
			return false;
		}
		let author = aMsgHdr.mime2DecodedAuthor;
		if (author) {
			let accounts = MailServices.accounts;
			for (let identity of accounts.allIdentities) {
				if (author.includes(identity.email)) {
					return true;
				}
			}
		}
		return false;
	},

	reWriteFiles: async function (aListOfFiles) {
		let listOfFilesToRewrite = cardbookRepository.arrayUnique(aListOfFiles);
		for (var i = 0; i < listOfFilesToRewrite.length; i++) {
			if (cardbookRepository.cardbookPreferences.getType(listOfFilesToRewrite[i]) === "FILE" && !cardbookRepository.cardbookPreferences.getReadOnly(listOfFilesToRewrite[i])) {
				let myArray = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[listOfFilesToRewrite[i]].cards));
				cardbookRepository.cardbookUtils.sortCardsTreeArrayByString(myArray, "uid", 1);
				await cardbookRepository.cardbookSynchronization.writeCardsToFile(cardbookRepository.cardbookPreferences.getUrl(listOfFilesToRewrite[i]), myArray);
			}
		}
	},

	updateMailPop: function (aAddresses) {
		let addresses = MailServices.headerParser.parseEncodedHeaderW(aAddresses);
		for (let address of addresses) {
			cardbookIDBMailPop.updateMailPop(address.email);
		}
	},

	addMailPop: function (aEmail, aValue) {
		cardbookIDBMailPop.updateMailPop(aEmail, aValue);
	},

	addSearch: function (aSearch) {
		cardbookIDBSearch.addSearch(aSearch);
	},

	removeSearch: function (aDirPrefId) {
		cardbookIDBSearch.removeSearch(aDirPrefId);
	},

	getTextColorFromBackgroundColor: function (aHexBackgroundColor) {
		function hexToRgb(aColor) {
			var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(aColor);
			return result ? {r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16)} : null;
		}

		var rgbColor = hexToRgb(aHexBackgroundColor);
		// http://www.w3.org/TR/AERT#color-contrast
		var o = Math.round(((parseInt(rgbColor.r) * 299) + (parseInt(rgbColor.g) * 587) + (parseInt(rgbColor.b) * 114)) / 1000);
		var fore = (o > 125) ? 'black' : 'white';
		return fore;
	},

	deleteCssAllRules: function (aStyleSheet) {
		// aStyleSheet.cssRules may not be available
		try {
			while(aStyleSheet.cssRules.length > 0) {
				aStyleSheet.deleteRule(0);
			}
		} catch(e) {}

	},

	createMarkerRule: function (aStyleSheet, aStyleSheetRuleName) {
		var ruleString = "." + aStyleSheetRuleName + " {}";
		var ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
	},

	createCssAccountRules: function (aStyleSheet, aDirPrefId, aColor) {
		var ruleString = ".cardbookAccountTreeClass treechildren::-moz-tree-image(accountColor color_" + aDirPrefId + ") {\
							list-style-image: url('chrome://cardbook/content/skin/icons/circle.svg');\
							-moz-context-properties: fill;\
							fill: " + aColor + ";}";
		var ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
	},

	createCssCategoryRules: function (aStyleSheet, aDirPrefId, aColor) {
		var oppositeColor = cardbookRepository.getTextColorFromBackgroundColor(aColor);
		var ruleString1 = ".cardbookCategoryClass[type=\"" + aDirPrefId + "\"] {background-color: " + aColor + ";}";
		var ruleIndex1 = aStyleSheet.insertRule(ruleString1, aStyleSheet.cssRules.length);
		var ruleString2 = ".cardbookCategoryClass[type=\"" + aDirPrefId + "\"] {border-color: " + aColor + ";}";
		var ruleIndex2 = aStyleSheet.insertRule(ruleString2, aStyleSheet.cssRules.length);
		var ruleString3 = ".cardbookCategoryClass[type=\"" + aDirPrefId + "\"] {color: " + oppositeColor + ";}";
		var ruleIndex3 = aStyleSheet.insertRule(ruleString3, aStyleSheet.cssRules.length);
		var ruleString4 = ".cardbookCategoryMenuClass[colorType=\"" + aDirPrefId + "\"] {color: " + aColor + ";}";
		var ruleIndex4 = aStyleSheet.insertRule(ruleString4, aStyleSheet.cssRules.length);
	},

	createCssCardRules: function (aStyleSheet, aDirPrefId, aColor) {
		var oppositeColor = cardbookRepository.getTextColorFromBackgroundColor(aColor);
		if (cardbookRepository.useColor == "text") {
			var ruleString1 = ".cardbookCardsTreeClass treechildren::-moz-tree-cell-text(SEARCH color_" + aDirPrefId + ") {color: " + aColor + " !important;}";
			var ruleIndex1 = aStyleSheet.insertRule(ruleString1, aStyleSheet.cssRules.length);

			var ruleString2 = ".cardbookCardsTreeClass treechildren::-moz-tree-row(SEARCH color_" + aDirPrefId + ") {background-color: " + oppositeColor + " !important;}";
			var ruleIndex2 = aStyleSheet.insertRule(ruleString2, aStyleSheet.cssRules.length);
			
			var ruleString3 = ".cardbookCardsTreeClass treechildren::-moz-tree-cell-text(SEARCH color_" + aDirPrefId + ", selected, focus) {color: HighlightText !important;}";
			var ruleIndex3 = aStyleSheet.insertRule(ruleString3, aStyleSheet.cssRules.length);

			var ruleString4 = ".cardbookCardsTreeClass treechildren::-moz-tree-row(SEARCH color_" + aDirPrefId + ", selected, focus) {background-color: Highlight !important;}";
			var ruleIndex4 = aStyleSheet.insertRule(ruleString4, aStyleSheet.cssRules.length);
		} else if (cardbookRepository.useColor == "background") {
			var ruleString1 = ".cardbookCardsTreeClass treechildren::-moz-tree-row(SEARCH color_" + aDirPrefId + ") {background-color: " + aColor + " !important;}";
			var ruleIndex1 = aStyleSheet.insertRule(ruleString1, aStyleSheet.cssRules.length);

			var ruleString2 = ".cardbookCardsTreeClass treechildren::-moz-tree-cell-text(SEARCH color_" + aDirPrefId + ") {color: " + oppositeColor + " !important;}";
			var ruleIndex2 = aStyleSheet.insertRule(ruleString2, aStyleSheet.cssRules.length);

			var ruleString3 = ".cardbookCardsTreeClass treechildren::-moz-tree-row(SEARCH color_" + aDirPrefId + ", selected, focus) {background-color: Highlight !important;}";
			var ruleIndex3 = aStyleSheet.insertRule(ruleString3, aStyleSheet.cssRules.length);

			var ruleString4 = ".cardbookCardsTreeClass treechildren::-moz-tree-cell-text(SEARCH color_" + aDirPrefId + ", selected, focus) {color: HighlightText !important;}";
			var ruleIndex4 = aStyleSheet.insertRule(ruleString4, aStyleSheet.cssRules.length);
		}
	},

	createCssCardRulesForTable: function (aStyleSheet, aDirPrefId, aColor) {
		let oppositeColor = cardbookRepository.getTextColorFromBackgroundColor(aColor);
		if (cardbookRepository.useColor == "text") {
			let ruleString1 = ".tableTree tr[data-value='SEARCH color_" + aDirPrefId + "']:not([rowSelected='true']) {color: " + aColor + " !important;}";
			let ruleIndex1 = aStyleSheet.insertRule(ruleString1, aStyleSheet.cssRules.length);

			let ruleString2 = ".tableTree tr[data-value='SEARCH color_" + aDirPrefId + "']:not([rowSelected='true']) {background-color: " + oppositeColor + " !important;}";
			let ruleIndex2 = aStyleSheet.insertRule(ruleString2, aStyleSheet.cssRules.length);
		} else if (cardbookRepository.useColor == "background") {
			let ruleString1 = ".tableTree tr[data-value='SEARCH color_" + aDirPrefId + "']:not([rowSelected='true']) {background-color: " + aColor + " !important;}";
			let ruleIndex1 = aStyleSheet.insertRule(ruleString1, aStyleSheet.cssRules.length);

			let ruleString2 = ".tableTree tr[data-value='SEARCH color_" + aDirPrefId + "']:not([rowSelected='true']) {color: " + oppositeColor + " !important;}";
			let ruleIndex2 = aStyleSheet.insertRule(ruleString2, aStyleSheet.cssRules.length);
		}
	},

	unregisterCss: function (aChromeUri) {
		var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var uri = Services.io.newURI(aChromeUri, null, null);
		if (sss.sheetRegistered(uri, sss.AUTHOR_SHEET)) {
			sss.unregisterSheet(uri, sss.AUTHOR_SHEET);
		}
	},

	reloadCss: function (aChromeUri) {
		var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var uri = Services.io.newURI(aChromeUri, null, null);
		if (sss.sheetRegistered(uri, sss.AUTHOR_SHEET)) {
			sss.unregisterSheet(uri, sss.AUTHOR_SHEET);
		}
		sss.loadAndRegisterSheet(uri, sss.AUTHOR_SHEET);
	},

	getDateFormat: function (aDirPrefId, aVersion) {
		var myType = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
		if ( myType == 'GOOGLE' || myType == 'APPLE' || myType == 'YAHOO') {
			return "YYYY-MM-DD";
		} else {
			return aVersion;
		}
	},

	getABIconType: function (aType) {
		switch(aType) {
			case "DIRECTORY":
				return "directory";
				break;
			case "FILE":
				return "file";
				break;
			case "LOCALDB":
				return "localdb";
				break;
			case "APPLE":
			case "CARDDAV":
			case "GOOGLE":
			case "GOOGLE2":
			case "GOOGLE3":
			case "OFFICE365":
			case "YAHOO":
				return "remote";
				break;
			case "SEARCH":
				return "search";
				break;
			case "ALL":
				return [ "directory", "file", "localdb", "remote", "search" ];
				break;
		};
		return aType.toLowerCase();
	},

	getABTypeFormat: function (aType) {
		switch(aType) {
			case "DIRECTORY":
			case "FILE":
			case "LOCALDB":
			case "CARDDAV":
			case "SEARCH":
				return "CARDDAV";
				break;
		};
		return aType;
	},

	getABStatusType: function (aDirPrefId) {
		if (cardbookRepository.cardbookUtils.isMyAccountSyncing(aDirPrefId)) {
				return "syncing";
		} else if (cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId)) {
			return "readonly";
		} else {
			return "readwrite";
		}
	}

};

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/preferences/cardbookPreferences.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookUtils.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookSynchronization.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookSynchronizationGoogle.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookSynchronizationGoogle2.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookSynchronizationOffice365.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookLog.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookPasswordManager.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookTypes.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookDiscovery.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookDates.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/migrate/cardbookMigrate.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/collected/cardbookCollection.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/attachvCard/cardbookAttachvCard.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIndexedDB.js", this); //doesn't work with cardbookRepository instead of this
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBCard.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBCat.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBUndo.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBImage.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBMailPop.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBPrefDispName.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookIDBSearch.js", this);
loader.loadSubScript("chrome://cardbook/content/indexedDB/cardbookEncryptor.js", this);
loader.loadSubScript("chrome://cardbook/content/cardbookCategoryParser.js", this);
loader.loadSubScript("chrome://cardbook/content/cardbookCardParser.js", this);
loader.loadSubScript("chrome://cardbook/content/lists/cardbookListConversion.js", this);
loader.loadSubScript("chrome://cardbook/content/scripts/notifyTools.js", this);
loader.loadSubScript("chrome://cardbook/content/simpleMailRedirection/simpleMailRedirection.js", this);
loader.loadSubScript("chrome://cardbook/content/CardBookNotifyListener.js", cardbookRepository);
