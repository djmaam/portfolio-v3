# 35 · security.txt — spec

Issue: none — the Linear integration in this session points at another workspace, so
this block has no PV3 issue. Branch: `feat/35-security-txt`
Extends: [`18-deploy.md`](./18-deploy.md) (`robots.txt` and `sitemap.xml` as endpoints).

## Why

Cloudflare's Security Center suggests a `security.txt` for the zone. RFC 9116 defines it
as the place a researcher looks for how to report a vulnerability. A static portfolio
has little to report, but the file is a few lines and the site already has a contact
address for it.

It lives in the repo instead of the Cloudflare dashboard so it is versioned and reads
the address and domain from `content.json`, like `robots.txt`.

## Changes

- `src/pages/.well-known/security.txt.ts` — a static endpoint that renders
  `/.well-known/security.txt` with `Contact` (`links.email`), `Expires`,
  `Preferred-Languages: es, en` and `Canonical` (`links.domain`).
- `Expires` is the build time plus 365 days. The RFC requires the field and recommends
  it stay under a year, so a pinned date would need a commit every year; computed at
  build, every deploy pushes it forward. Known ceiling: a year with no deploy lets it
  lapse.
- `tests/securityTxt.test.ts` — checks the fields and that `Expires` is in the future and
  within a year.

## Out of scope

`Encryption`, `Policy`, `Acknowledgments` and `Hiring`: there is no PGP key, no
published disclosure policy and nothing to acknowledge yet. No signed (OpenPGP
cleartext) version, for the same reason.

## Acceptance criteria

- [x] `dist/.well-known/security.txt` exists after `bun run build` and carries
      `Contact: mailto:hi@marcosarrieta.dev` and
      `Canonical: https://marcosarrieta.dev/.well-known/security.txt`.
- [x] `bun test`: `Expires` parses, is in the future and is at most a year away.
- [x] `bun run lint`, `bun test` and `bun run build` pass.
- [ ] After deploy, `https://marcosarrieta.dev/.well-known/security.txt` answers 200 as
      `text/plain`.
