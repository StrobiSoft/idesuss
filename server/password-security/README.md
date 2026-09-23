# Idesüss Password Security Gateway

Server-side leaked-password screening for Idesüss web and native clients.

## Security contract

- Passwords are processed only in memory.
- Plaintext passwords are never logged.
- Full SHA-1 hashes and HIBP hash suffixes are never logged.
- Only the first five SHA-1 hex characters are sent to the Have I Been Pwned Pwned Passwords range API.
- HIBP failures fail closed with HTTP 503.
- The service contains rate limiting, bounded request bodies and the shared defensive Spy Trap.
- Spy Trap output may contain timestamp, source address, method, path, request size, reason and user agent, but never request bodies or password-derived values.
- Production HIBP destination is fixed to `https://api.pwnedpasswords.com`. An alternate URL is accepted only with `NODE_ENV=test`.

## HTTP API

### `POST /v1/security/password/check`

Request:

```json
{"password":"candidate password"}
```

Safe response:

```json
{"ok":true,"compromised":false}
```

Known compromised password:

```json
{"ok":false,"compromised":true,"reason":"known_compromised_password"}
```

The response intentionally does not disclose the breach count.

### `GET /healthz`

Returns service health only.

## Runtime defaults

- listen: `127.0.0.1:8790`
- allowed browser origin: `https://idesuss.net`
- body limit: 16 KiB
- password length: 8–1024 Unicode code points
- rate limit: 20 checks / 5 minutes / source
- HIBP timeout: 5 seconds

Expected production routing on VM 101 is same-origin Nginx proxying from
`/api/security/password/check` to the internal service endpoint
`/v1/security/password/check`.
