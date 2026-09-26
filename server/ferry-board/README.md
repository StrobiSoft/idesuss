# Idesuss Ferry Board API

Contract-first backend for the Idesuss ferry departures board.

## Endpoint

`GET /api/ferry-board?route=dover-calais`

The MVP deliberately returns no fabricated departures until a stable official provider endpoint is approved and implemented.

Supported route IDs:
- dover-calais
- calais-dover
- dover-dunkirk
- dunkirk-dover

Provider adapters belong here, not in the browser client.
