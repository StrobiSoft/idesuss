# Idesüss Radio — Curated Source Policy

Status: development guardrail

Built-in catalog sources must have `catalogManaged: true` and `distributionStatus: "approved"` before they become available in the built-in station catalog.

A technically working public stream URL alone does not establish that Idesüss may ship it as a built-in station.

User-managed stations are a separate future path and require their own product/legal rules.


## Client rule

A client must never promote a technically resolved station to `approved`. Directory
matches, stream probes and a successful HTTP response are technical facts only.

Production clients prefer the shared Idesüss Radio API. A catalog entry from that API is
treated as server-managed playback and uses only the Idesüss playback route; this does
not expose or synthesize a legal/distribution label in the browser.

Direct third-party directory resolution is development-only until an explicit source has
passed the server-side catalog/policy gate.
