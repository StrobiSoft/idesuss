# Idesüss radio proxy runtime

Minimal server-side implementation of the shared radio contract for CT105/Pepper.

## Security model

Clients never submit an upstream URL. The public stream route accepts only a station ID from the server-side station map. Upstream URLs must be HTTPS, redirects are revalidated, and DNS targets resolving to loopback/private/link-local/reserved networks are rejected. Client IP forwarding headers are not sent upstream.

## Configuration

Set `IDESUSS_RADIO_STATIONS_JSON` to a JSON object keyed by stable station ID. Example:

```json
{"example-fm":{"name":"Example FM","sourceUrl":"https://radio.example/stream","locales":["en"]}}
```

The source URLs belong in runtime configuration, not in the browser catalog.

Optional variables: `HOST` (default 127.0.0.1), `PORT` (8787), `IDESUSS_RADIO_CORS_ORIGIN` (https://idesuss.net).

## Endpoints

- `GET /healthz`
- `GET /v1/radio/catalog?locale=hu`
- `GET /v1/radio/stream/{stationId}`

Put a TLS reverse proxy in front of this process on CT105. The browser-facing API base must be HTTPS.
