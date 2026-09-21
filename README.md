# idesuss

Idesüss Video Viewer – Watch Without Login

We didn't invent the architecture in advance. Each layer was born as a response to a real problem.

## Deployment model

GitHub is the single source of truth for Idesüss. The production static frontend is published from `main` through GitHub Pages to `idesuss.net`.

Pepper is reserved for development and server-side runtime components that genuinely need a host. A Pepper working copy is not an independent production source and must remain reproducible from GitHub.

See [docs/deployment-architecture.md](docs/deployment-architecture.md) for the deployment contract.

## Daily exchange rates

The public homepage shows daily foreign-exchange reference rates derived from the European Central Bank (ECB) euro reference-rate feed.

These are reference rates rather than intraday market quotes. Idesüss derives the displayed cross-rates from the ECB's euro-based daily reference rates and labels this limitation explicitly.
