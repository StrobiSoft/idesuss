# Idesüss deployment architecture

## Source of truth

The GitHub repository `StrobiSoft/idesuss` is the single source of truth for Idesüss source code.

Production must never depend on an uncommitted or independently edited working tree on Pepper or any other host.

## Roles

### GitHub

GitHub owns:

- source code and history;
- branches and pull requests;
- validation workflows;
- releases and rollback points;
- the production static frontend published from `main`.

### GitHub Pages

GitHub Pages is the production host for the static Idesüss web surface while the application fits the static-site model.

The custom production domain is:

- `idesuss.net`

The repository-level `CNAME` file must remain consistent with that production domain.

### Pepper

Pepper is runtime infrastructure, not the canonical code store.

Pepper may host components that genuinely require a server process, for example:

- backend APIs;
- resolvers or proxy services;
- long-running workers;
- radio/backend processing;
- private development or staging services.

Any Pepper deployment must be reproducible from a GitHub commit, tag, or release.

A Pepper working copy must be treated as disposable. Local edits on Pepper must not become a separate production branch of reality.

## Deployment contract

The supported flow is:

```
development
    -> GitHub branch
    -> validation
    -> main
    -> production deploy
```

For static frontend code:

```
GitHub main
    -> GitHub Pages
    -> idesuss.net
```

For server-side components:

```
GitHub main/release
    -> automated or explicitly controlled deployment
    -> Pepper runtime / dedicated VM
```

The first production server-side security component is the Password Security
Gateway:

```
idesuss.net (GitHub Pages)
    -> HTTPS request
    -> security.idesuss.net
    -> VM101 idesuss-web-01
    -> Password Security Gateway on 127.0.0.1:8790
    -> HIBP Pwned Passwords range API
```

The gateway does **not** move the static frontend away from GitHub Pages.
`security.idesuss.net` is a dedicated API origin with CORS restricted to the
production web origin; native clients are not subject to browser CORS.

## Rules

1. `main` is the canonical production source.
2. Production fixes must be committed to GitHub first.
3. Do not manually patch the production copy on Pepper.
4. Pepper must not be used as the primary Git remote for Idesüss.
5. If a Pepper runtime is needed, its running revision must be traceable to a GitHub commit.
6. The public domain must have one documented frontend target at a time.
7. Staging and development endpoints must not silently replace production.
8. A rollback means selecting a known GitHub revision and redeploying it, not restoring an unknown server-side copy.

## Current production intent

As of 2026-09-20:

- canonical source: GitHub `StrobiSoft/idesuss`;
- production branch: `main`;
- static production frontend: GitHub Pages;
- production custom domain: `idesuss.net`;
- Pepper: development/runtime host only, not the public static frontend source unless this document is deliberately changed in a reviewed commit;
- VM101 `idesuss-web-01`: designated runtime host for the Password Security Gateway at `security.idesuss.net`, once its DNS/TLS/public-routing prerequisites are validated.

## Change control

If production hosting is ever moved from GitHub Pages to Pepper or another host, update this document in the same change that performs the migration. The migration must explicitly name:

- the new public endpoint;
- the deployment mechanism;
- the rollback mechanism;
- the GitHub revision being deployed;
- which components remain on GitHub Pages, if any.
