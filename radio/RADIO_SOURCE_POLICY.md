# Idesüss Radio — Curated Source Policy

Status: development guardrail

## Curated catalog entries

A stream URL placed in the built-in Idesüss radio catalog is not automatically distributable through the product.

Catalog-managed stations must declare:

- `catalogManaged: true`
- `distributionStatus: "approved"`

before their `streamUrl` is exposed to the playback engine.

Any catalog-managed source that is missing explicit approval is normalized to an empty playback URL with `sourceStatus: "blocked_unapproved_source"`.

This is intentionally conservative: finding a technically working public stream URL does not by itself establish that Idesüss may ship it as a built-in station.

## User-managed stations

A future user-managed/custom-station feature is a separate path. Those stations are not treated as curated Idesüss catalog entries and should have their own product/legal rules before public release.

## Current state

The two built-in Idesüss station slots are placeholders only and contain no external stream URL.
