# 18 · Deploy: Cloudflare Pages, domain, Email Routing — spec

Issue: [PV3-23](https://linear.app/portfolio-djmaam-v3/issue/PV3-23) ·
Branch: `feat/18-deploy` ·
Design: `handoff/ARCHITECTURE.md` (deploy, lines 13–14 and 23)

> [!NOTE]
> **Scope change against the issue.** The issue leaves the `.ar` domain pending: "decide
> whether to renew `marcosarrieta.ar` for a year to 301-redirect it to the `.dev`". The
> decision is **no** — `marcosarrieta.ar` is allowed to expire and no redirect is built.
> The issue also budgets a CSP "compatible with the preview iframes from issue 11": there
> are no iframes left. Spec 17 replaced all six with static screenshots
> (`src/lib/projects.ts`), so the policy can forbid framing outright instead of carving
> six origins out of it.

## Goal

`marcosarrieta.dev` serves the built site over HTTPS from Cloudflare Pages, mail to
`hi@marcosarrieta.dev` arrives, and the build carries everything a public URL needs that
a local `dist/` never did: a content policy, cache headers, a sitemap, a robots file and
the social card `Base.astro` has been pointing at since spec 03.

## What the repository owns, and what the account owns

Two halves, and they fail differently. The repository half is code — it is reviewed,
tested and reverts with a commit. The account half is Cloudflare configuration: it lives
in a dashboard, has no diff, and is written down here precisely because nothing else in
the repo can record it.

Everything under [Build surface](#build-surface) is the first half. Everything under
[Account setup](#account-setup) is the second.

## Build surface

### The content policy lives in the HTML, not in `_headers`

The obvious place for a CSP on Cloudflare Pages is `public/_headers`. It is the wrong
place here. The site ships two inline scripts — the JSON-LD `Person` block and the theme
script that settles `data-theme` before the first paint — so a policy has to name either
their hashes or `'unsafe-inline'`. A hash written into `_headers` by hand goes stale the
first time anybody edits the theme script, and it goes stale _silently_: the page still
renders, just without a theme.

Astro 7 computes those hashes at build time and writes them into a
`<meta http-equiv="content-security-policy">`. That is `security.csp` in
`astro.config.mjs`, and it is the only version of the policy that cannot drift from the
output it describes.

The directives:

| Directive                 | Value                        | Why                                                                     |
| ------------------------- | ---------------------------- | ----------------------------------------------------------------------- |
| `default-src`             | `'self'`                     | Everything the page loads, it ships.                                     |
| `script-src`              | `'self'` + build-time hashes | Written by Astro, not by hand.                                           |
| `style-src`               | `'self' 'unsafe-inline'`     | See below.                                                               |
| `img-src`                 | `'self' data:`               | Previews, logos and favicons are local; `data:` covers inlined SVG.      |
| `font-src`                | `'self'`                     | Both faces are self-hosted in `public/fonts/`.                           |
| `object-src`              | `'none'`                     | No plugins, ever.                                                        |
| `base-uri`                | `'self'`                     | An injected `<base>` would repoint every relative URL on the page.       |
| `form-action`             | `'none'`                     | There is no form; contact is a `mailto:`.                                |

`style-src` is the one loose thread and it is deliberate. The site sets twelve inline
`style` attributes, each passing a custom property down to CSS (`--mark-size` on the cube
mark, `--step` on the method traffic light, `--logo` on the company masks). CSP treats a
`style` attribute as inline style, and — this is the trap — a policy that carries _any_
style hash makes `'unsafe-inline'` inert for attributes as well as elements, so the
attributes go dead and the masks resolve to `none`. The site has no `<style>` elements to
hash, so `security.csp.styleDirective.resources` overrides the source list to
`'self' 'unsafe-inline'` and no hash is emitted alongside it. Scripts keep their hashes;
only style attributes are let through. `e2e/deploy.spec.ts` is what catches a regression
here, because a blocked resource is a console error and nothing else.

`frame-ancestors` is the directive a `<meta>` policy is not allowed to express. Cloudflare
carries `X-Frame-Options: DENY` in `_headers` instead, which covers the same need.

### `public/_headers`

Only what a meta tag cannot carry:

- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
  and `X-Frame-Options: DENY` on `/*`.
- `Cache-Control: public, max-age=31536000, immutable` on `/_astro/*` and `/fonts/*`.
  Both are versioned by file name — the build hashes the first, the font file names carry
  their own version — so a year is safe. Everything else keeps the Pages default, which
  revalidates, because `/previews/*` and `/logos/*` are plain names that get overwritten
  in place.

### `robots.txt` and `sitemap.xml` are endpoints, not files

`@astrojs/sitemap` renders six lines for two routes that are not going to become three.
Two static endpoints — `src/pages/robots.txt.ts` and `src/pages/sitemap.xml.ts` — cost no
dependency and, more to the point, read `links.domain` from `content.json` instead of
writing the domain down a third and fourth time. Each `<url>` declares both `hreflang`
alternates plus `x-default` on Spanish, mirroring the `<link rel="alternate">` pairs in
`Base.astro`.

### `public/og.png`

`Base.astro` has advertised `og:image` at `/og.png` since spec 03 with a comment saying
the file arrives with the deploy issue. It arrives here: 1200×630, generated by
`bun scripts/make-og.ts` from `scripts/og.html`.

It is a standalone template rather than a crop of the real hero, because 630px of the
real page is the H1 cut in half. The copy comes from `content.json` and the mark from
`restingPolygons` — the same pure function the nav and the canvas project — so the card
cannot disagree with the site about either. The colors are the dark-theme values written
out literally, which is legal only because `scripts/` is outside the tree
`scripts/check-tokens.ts` scans: a Chromium `file://` render has no `@theme` to resolve
tokens against.

Regenerate it by hand when the hero copy or the mark changes. It is committed, not built.

## Account setup

Not code. Recorded here because a dashboard has no diff.

1. **Pages project** — connected to `djmaam/portfolio-v3`, production branch `main`.
   Build command `bun run build`, output directory `dist`. Preview deployments on every
   pull request, production on every push to `main`.
2. **Custom domain** — `marcosarrieta.dev` on the Pages project, with `www` redirecting to
   the apex. HTTPS and the certificate are Cloudflare's to issue.
3. **Email Routing** — `hi@marcosarrieta.dev` forwarding to the personal inbox, with the
   MX and SPF records Cloudflare writes for it.
4. **`marcosarrieta.ar`** — nothing. It expires.

## Acceptance criteria

- [ ] `https://marcosarrieta.dev` and `https://marcosarrieta.dev/en` serve the site over
      valid HTTPS.
- [ ] An email sent to `hi@marcosarrieta.dev` arrives.
- [ ] `curl -I https://marcosarrieta.dev` answers `X-Content-Type-Options`,
      `Referrer-Policy` and `X-Frame-Options`.
- [ ] The page paints themed on the first frame in production — the theme script is not
      blocked — and the company logo masks render.
- [ ] `https://marcosarrieta.dev/robots.txt` and `/sitemap.xml` resolve, and the sitemap
      lists both routes.
- [ ] `https://marcosarrieta.dev/og.png` resolves as `image/png`.
- [ ] Lighthouse ≥ 90 in all four categories measured **against production**, not only
      against `dist/`.
- [ ] `bun test`, `bun run test:e2e` and `bun run test:lh` stay green.

## Accepted, not fixed

- **`style-src 'unsafe-inline'`.** Closing it means moving twelve custom-property
  handoffs out of `style` attributes and into generated `<style>` blocks, across four
  components, to harden a static site with no input surface, no cookies and no session.
  The script policy — the half that actually stops XSS — stays hash-locked.
- **The OG card is committed, not generated in CI.** It changes when the hero copy
  changes, which is roughly never, and generating it in CI would put Playwright on the
  critical path of every build to produce a byte-identical file.
- **No production Lighthouse in CI.** `test:lh` scores `dist/`, which is the artifact
  Pages serves; scoring the live URL on every push would measure Cloudflare's edge and
  the run's network more than it measures the site.
