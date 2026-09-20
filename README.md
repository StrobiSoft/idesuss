# idesuss

Idesüss Video Viewer – Watch Without Login

We didn't invent the architecture in advance. Each layer was born as a response to a real problem.

## Deployment model

GitHub is the single source of truth for Idesüss. The production static frontend is published from `main` through GitHub Pages to `idesuss.net`.

Pepper is reserved for development and server-side runtime components that genuinely need a host. A Pepper working copy is not an independent production source and must remain reproducible from GitHub.

See [docs/deployment-architecture.md](docs/deployment-architecture.md) for the deployment contract.

## Daily exchange rates

The public homepage also shows the official daily MNB mid-market reference rates for EUR/HUF, USD/HUF, GBP/HUF and CHF/HUF.

These are not intraday market quotes. The Magyar Nemzeti Bank fixes the official rates at 11:00 on MNB business days; the published values remain valid until the next official fixing. The Idesüss UI labels this limitation explicitly.
