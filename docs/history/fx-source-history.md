# Exchange-rate source history

## Retired national-bank integration

The first Idesüss exchange-rate prototype used the Magyar Nemzeti Bank (MNB) daily-rate service. During initial production integration it did not meet the project's reliability and integration expectations, so the implementation was retired before becoming the long-term source.

The active exchange-rate implementation uses European Central Bank (ECB) reference-rate data. This file is historical context only; no production code should depend on the retired MNB integration.
