# Idesüss milestone — 2026-09-23

## Name
Profile/EULA + Radio/PWA stabilization baseline

## Completed baseline
- Versioned EULA with server-enforced acceptance before profile save.
- Explicit EULA-required feedback instead of a silent blocked Save action.
- Avatar upload/crop/submission and moderation workflow.
- House Rules v2 (2026-09-23-v2) with anti-hate and anti-exclusion policy in all supported UI languages.
- Approved Radio proxy/security foundation, one-button player, presets and PWA/Media Session metadata/actions.
- Explicit Radio navigation requests immediate playback, with browser-policy fallback.
- Shared language preference across the relevant surfaces and current CI locale validation green.

## Deferred / external verification
These are not part of the completed baseline and must not be represented as finished:
- Public DNS/TLS ingress for security.idesuss.net, then external health/API/CORS verification and switching password-security enforcement from pending to required.
- Same-browser 1 -> 2 -> 3 tab presence-counter live verification.
- Live approval of a fresh custom avatar and confirmation that the approved image becomes active on all intended profile/webapp surfaces.
- Richer avatar crop/position UX can be revisited later; it is non-blocking for this milestone.

## Decision note
Video conversation/storage policy is intentionally out of scope because Idesüss does not currently provide video conversations. No retention promise is added for a feature that does not exist.
