# Idesuss Ferry Board API

Contract-first backend for the Idesuss Ferry Board.

## Endpoint

`GET /api/ferry-board?route=dover-calais`

The service deliberately returns no fabricated departures until a stable, approved official provider adapter is implemented.

Supported route IDs:
- dover-calais
- calais-dover
- dover-dunkirk
- dunkirk-dover

Provider adapters belong in the server layer, not in the browser client.
