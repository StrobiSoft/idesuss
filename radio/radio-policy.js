export const RADIO_CLIENT_POLICY = Object.freeze({
  "schemaVersion": 1,
  "contract": "idesuss.radio.client-policy",
  "preset": {
    "slotCount": 8,
    "tierOrder": [
      "signed_out",
      "registered",
      "premium",
      "premium_plus"
    ],
    "maximumSlotsByTier": {
      "signed_out": 1,
      "registered": 2,
      "premium": 4,
      "premium_plus": 8
    },
    "minimumTierBySlot": {
      "1": "signed_out",
      "2": "registered",
      "3": "premium",
      "4": "premium",
      "5": "premium_plus",
      "6": "premium_plus",
      "7": "premium_plus",
      "8": "premium_plus"
    },
    "savingRequiresAuthentication": true,
    "serverEntitlementIsAuthoritative": true,
    "savedChannelsTable": "saved_radio_channels",
    "savedChannelKeyPrefix": "preset_",
    "entitlementsRpc": "get_my_idesuss_entitlements"
  },
  "directory": {
    "provider": "radio-browser",
    "endpoints": [
      "https://de1.api.radio-browser.info",
      "https://nl1.api.radio-browser.info"
    ],
    "searchPath": "/json/stations/search",
    "countriesPath": "/json/countries",
    "languagesPath": "/json/languages",
    "defaultLimit": 80,
    "maximumLimit": 120,
    "httpsOnly": true,
    "hideBroken": true,
    "order": "clickcount",
    "reverse": true,
    "localeDefaults": {
      "hu": {
        "countryCode": "HU",
        "language": "hungarian"
      },
      "en": {
        "countryCode": "GB",
        "language": "english"
      },
      "nl": {
        "countryCode": "NL",
        "language": "dutch"
      },
      "ro": {
        "countryCode": "RO",
        "language": "romanian"
      },
      "pl": {
        "countryCode": "PL",
        "language": "polish"
      },
      "hr": {
        "countryCode": "HR",
        "language": "croatian"
      },
      "be": {
        "countryCode": "BY",
        "language": "belarusian"
      }
    },
    "previewRequiresAuthentication": false,
    "savingRequiresAuthentication": true
  },
  "consumers": [
    "web-radio",
    "native"
  ]
});
