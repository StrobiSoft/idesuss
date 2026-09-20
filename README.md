# idesuss

Idesüss Video Viewer – Watch Without Login

We didn't invent the architecture in advance. Each layer was born as a response to a real problem.

## Deployment model

GitHub is the single source of truth for Idesüss. The production static frontend is published from `main` through GitHub Pages to `idesuss.net`.

Pepper is reserved for development and server-side runtime components that genuinely need a host. A Pepper working copy is not an independent production source and must remain reproducible from GitHub.

See [docs/deployment-architecture.md](docs/deployment-architecture.md) for the deployment contract.

## Radio privacy principle

Idesüss Radio is designed around data minimization.

The intended relay path is:

`listener → HTTPS → Idesüss Radio relay → radio station`

The relay should not create a persistent mapping between a listener and a station. In particular, the radio service is designed to avoid:

- listener history linked to an account or user identifier;
- persistent IP-to-station logs;
- forwarding the listener IP upstream through headers such as `X-Forwarded-For`;
- unnecessary analytics or tracking tied to radio playback.

Only the transient state required to deliver the stream should exist. If aggregate information such as a current listener count is exposed, it should be computed without creating a per-listener listening history.

This is both a privacy feature and an operational principle: data that is never collected does not need to be retained, protected, exported, or deleted later.

## Daily exchange rates

The public homepage also shows the official daily MNB exchange rates for EUR/HUF, USD/HUF, GBP/HUF and CHF/HUF.

These are not intraday market quotes. The Magyar Nemzeti Bank fixes the official rates at 11:00 on MNB business days; the published values remain valid until the next official fixing. The Idesüss UI labels this limitation explicitly.
