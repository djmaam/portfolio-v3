# 15 · Company logos: the real marks replace the striped placeholder — spec

Issue: [PV3-20](https://linear.app/portfolio-djmaam-v3/issue/PV3-20) · Branch: `feat/15-company-logos`
Design: `handoff/DESIGN_SPEC.md` §3.5, §4 · `handoff/ARCHITECTURE.md` (assets)

> [!NOTE]
> Completes the deferred asset of [10 · Experience](./10-experience.md), whose dot
> geometry was already tied to `--logo-size` by [23 · Experience](./23-experience.md)
> precisely so this swap would be a CSS-only change there.

## Goal

Replace the striped abbreviation placeholder in each timeline entry with the company's
real mark, rendered monochrome so it reads as part of the site's palette rather than as
five foreign brand colors dropped into it.

## Context

`src/components/Experience.astro` renders, per job:

```astro
<span class="logo font-mono" aria-hidden="true">
  {job.abbr}
</span>
```

```css
.logo {
  width: var(--logo-size);   /* 56px */
  height: var(--logo-size);
  border-radius: 16px;
  border: 1px solid var(--color-line);
  color: var(--color-dim);
  background: repeating-linear-gradient(135deg, /* the stripes */);
}
```

`public/logos/` has existed since issue 00 and holds nothing but a `.gitkeep`. The
component's own comment names this issue as the reason the placeholder is still there.

Four constraints shape every decision below:

- **`handoff/` is read-only.** `content.json` carries `abbr`, `company`, `period`,
  `role`, `note`, `stack` — and no logo field. It never will; anything mapping a company
  to an asset has to live in `src/`.
- **No literal colors outside `src/styles/app.css`** (`scripts/check-tokens.ts`, run by
  `bun run lint`). A brand-colored mark inlined into the component would fail that check;
  an external file would pass it while quietly breaking the rule's intent.
- **Light and dark are one build.** Whatever renders has to work in both without a
  second asset or a `prefers-color-scheme` branch.
- **Nobody publishes a usable vector.** Of the five companies, one has an SVG that is
  broken for this purpose (below), one has an SVG of the wrong lockup, and three publish
  no vector at all. Ucosmos has no live site: `ucosmos.org` is NXDOMAIN and `.com` is a
  parking page. Every source is a flat, full-color raster, three of them JPEGs — which
  have no alpha channel whatsoever.

## Decisions

### 1 — Monochrome, via a CSS mask

The mark is drawn as a **mask over a token-colored surface**, not as an `<img>`:

```css
.logo::before {
  background: var(--color-dim);
  -webkit-mask: var(--logo-src) center / contain no-repeat;
  mask: var(--logo-src) center / contain no-repeat;
}
```

One file serves both themes, the ink is a token, and `check-tokens` sees exactly what it
should: no color literal anywhere near the component. The alternative — `<img>` plus
`filter: grayscale(1)` — needs a color source, still emits the brand's own colors into
the page, and inverts badly in dark mode for any mark that is dark-on-transparent.

The cost is real and accepted: **brand color is discarded.** These are employer marks on
a CV, not a partner wall; the shape carries the recognition.

The mask reads the **alpha** channel, which is the fact the whole asset pipeline below
exists to satisfy — and the reason PNG versus SVG turns out not to matter. What matters
is that the shape lives in alpha, and in the sources it does not.

### 2 — The mask goes on `::before`, not on `.logo`

`mask` clips the element it is applied to, borders and background included. Masking
`.logo` itself would erase its own 1px frame and 16px radius — the container the mock
draws (`DESIGN_SPEC` §3.5). So `.logo` keeps the frame and the pseudo-element carries
the mark, inset far enough to breathe:

```css
.logo::before {
  content: '';
  position: absolute;
  /* ~21% of the 56px box on each side, so the mark reads at ~32px inside its frame.
     `contain` then fits any aspect ratio — a square tile and a wide wordmark both. */
  inset: 12px;
}
```

`contain` rather than a percentage `mask-size` is what makes this survive a wordmark: a
`58%` mask would squash or crop anything that is not roughly square, and two of the five
marks are wordmarks.

The logo picks up the card's existing hover instead of inventing a gesture of its own:

```css
.card:hover .logo::before {
  background: var(--color-ink);
}
```

### 3 — The filename is the mapping

Masks live in **`src/assets/logos/<ABBR>.png`**, named for the `abbr` already in
`content.json` (`NR`, `TC`, `AP`, `DP`, `UC`), and are discovered at build time:

```ts
const logos = import.meta.glob<string>('../assets/logos/*.png', {
  query: '?url',
  import: 'default',
  eager: true,
})
```

The component looks a job up by the basename of each glob key. There is no
company-to-file table to keep in sync, because the filename *is* the key.

**Deviation from `handoff/ARCHITECTURE.md`**, which suggests `public/logos/*.svg`.
Two departures, for two reasons:

- **`src/assets/` over `public/`.** `public/` is copied verbatim: a renamed or missing
  file becomes a silent 404 at runtime, and the URL is unhashed, so a replaced logo
  serves stale from cache. Under `src/assets/` Vite emits a content-hashed URL and a
  broken path fails the build.
- **PNG over SVG.** Not a preference — no company publishes a vector that works (see
  Context). It costs nothing here: the mask keeps only alpha, so a 256px alpha PNG and a
  path render identically at the ~32px this draws at, and the five together weigh 18KB.

The monochrome-56px intent behind the handoff line is honored exactly.

Small files may be emitted as base64 `data:` URIs rather than as separate requests, per
Vite's `assetsInlineLimit`. Either form is a valid `url()` for `mask`, and the base64
encoding is what keeps the value safe inside the inline `style` attribute that carries
it.

### 4 — The shape is recovered by thresholding, and the reading is per company

Every source is bimodal — a mark at one luminance against a background at another, with
nothing between — so one threshold per file separates them, and a soft ramp of ±24
luminance either side of it keeps the edge antialiased at 32px.

What the threshold *cannot* decide is which side is the mark. Three of the five are
**tiles**: a solid plate with the shape knocked out of it in white. Under an alpha mask
both the plate and the knockout are opaque, so the naive read collapses to a featureless
block — this is exactly why Telecentro's own SVG is useless here, with the white "T"
drawn *on top of* the cyan triangle rather than punched through it. Each tile therefore
has two defensible readings, and the choice is per company:

| Reading | Meaning | Applied to |
| --- | --- | --- |
| `strokes` | No plate: what is drawn is the mark | AgroPro, Ucosmos |
| `plate` | The tile is the ink; the shape inside stays a hole | Nera, Telecentro |
| `knockout` | The shape cut out of the tile is the ink; the tile is dropped | DePC |

Rendered side by side at 56px, the split is not close. Nera's rounded square and
Telecentro's play triangle **are** the marks people recognize — stripped to their bare
knockout they become a generic corner and a bare letter T. DePC's gradient square is the
opposite: a stock app-icon backdrop carrying no identity, which as a plate masks to a
solid block with sharp corners fighting the frame's 16px radius, the single worst cell of
the fifteen compared. Its wordmark is what survives.

Telling a knockout from the paper around it is connectivity, not color — both are the
same white. A flood fill from the image border marks everything the outside can reach;
what it cannot reach is the enclosed shape.

### 5 — A missing logo is not a failure

A job whose `abbr` has no file renders exactly what it renders today. `.marked` is the
class that switches the stripes off:

```astro
<span class:list={['logo', 'font-mono', src && 'marked']} aria-hidden="true"
      style={src && `--logo-src: url("${src}")`}>
  {src ? null : job.abbr}
</span>
```

This is what makes partial delivery legitimate, and it is the licensing escape hatch
below: deleting one file reverts that company to its abbreviation with no code change.

### 6 — Accessibility is unchanged

The logo stays `aria-hidden`. It sits immediately before the company name in the `<h3>`;
an `alt` of "Nera" would make a screen reader announce the company twice. The mark is
decoration for a name that is already text — the same reason the abbreviation is hidden
today.

## Asset inventory

Sources, as collected. None is a vector that works; all five are thresholded.

| `abbr` | Company | Source | Type | Reading | Output |
| --- | --- | --- | --- | --- | --- |
| `NR` | Nera | JPEG 200×200 | Green tile, white arrow knocked out | `plate` | 200×200, 2KB |
| `TC` | Telecentro · Tplay | PNG 405×493, no alpha | Cyan play triangle, white "T" knocked out | `plate` | 210×256, 5KB |
| `AP` | AgroPro | JPEG 200×200 | Three open leaves on white | `strokes` | 184×124, 3KB |
| `DP` | DePC Suite | JPEG 512×512 | Gradient square, "DePC" knocked out | `knockout` | 256×77, 5KB |
| `UC` | Ucosmos | PNG 1024×263 | White line mark on a starfield banner | `strokes` | 164×114, 3KB |

Two need more than a threshold:

- **Ucosmos** has no live site and no isolated mark; the only source is a wide hero
  banner. The diamonds are cropped out of it by a fixed region before thresholding, and
  the wordmark beneath them is left behind. The starfield is dark enough that no star
  survives the threshold — checked on the output, not assumed.
- **Telecentro** is the mark whose published SVG is broken for masking, as described in
  decision 4. The raster is thresholded instead.

## Scope

### `assets-src/logos/*` (new)

The five raw sources, committed unmodified. A generation script without its inputs is
dead weight, and the thresholds are exactly the kind of value that needs re-tuning when a
company refreshes its mark. Not shipped: nothing under `assets-src/` is imported.

### `scripts/make-logo-masks.ts` (new)

Reads each source with `sharp` — already a devDependency, used by
`scripts/capture-previews.ts` — thresholds it to alpha per decision 4, flood-fills for
the `knockout` reading, trims to the mark's bounding box, scales the long edge to 256px
and writes `src/assets/logos/<ABBR>.png` with black RGB and the shape in alpha.

The output directory is wiped on every run, so a logo dropped from the config cannot
linger as a file the component still globs up.

Two details that are load-bearing rather than incidental:

- `trim` is given an explicit transparent background. Left to infer one from the
  top-left pixel, a mark that reaches its own border — every tile — is read as the thing
  to trim and gets eaten down to the shape knocked out of it.
- The flood fill uses an explicit queue. Recursion overflows the stack on a 512×512
  plate.

### `src/assets/logos/*.png` (new, generated)

The five masks. Committed: the build imports them, and a clone must not need the
pipeline to produce a working site.

### `src/components/Experience.astro`

The glob, the per-job lookup, the `.marked` class and `--logo-src` style hook, and the
`::before` rule with its hover. `.logo`'s frame, radius, size and the `--logo-size`
custom property `.dot` derives from are all untouched — that is why the dot stays
centered without a second thought (`23-experience.md` §1).

### `tests/experience.test.ts` (existing)

Two guards, added to the file that already covers this component:

1. **Mask safety.** Every file in `src/assets/logos/` has meaningful transparency — a
   mask that is uniformly opaque is a background plate that swallowed its own mark, which
   is the failure mode decision 4 exists to prevent and the one that is invisible in
   review: the logo renders as a solid rounded square and nothing errors.
2. **No orphan files.** Every basename in `src/assets/logos/` matches an `abbr` in
   `content.json`. A typo (`NRA.png`) cannot sit in the directory rendering nothing.

The reverse is deliberately *not* asserted: an `abbr` with no file is the supported
fallback of decision 5, not an error.

### `e2e/experience.spec.ts` (existing)

The rendered half, which no source test can reach: the number of `.logo.marked`
elements equals the number of files in `src/assets/logos/`, and the computed
`mask-image` of the first of them is not `none` — proving the URL survived the build and
the mask actually applied, rather than the class landing on an empty rule.

> [!NOTE]
> Chromium blocks mask images cross-origin, and `file://` counts as opaque: a mask that
> renders over HTTP is invisible when the same page is opened from disk. The Playwright
> suite already serves the build, so this only bites manual checking.

## Acceptance criteria

- [ ] Each of the five companies renders its mark inside the 56px frame, monochrome, in
      both light and dark, at 1512px and 390px.
- [ ] A company whose file is removed falls back to the striped abbreviation placeholder,
      with no other change.
- [ ] The mark's ink is `--color-dim` at rest and `--color-ink` while its card is
      hovered; no color literal is introduced anywhere outside `src/styles/app.css`.
- [ ] `.logo` keeps its 1px frame and 16px radius — the mask does not clip them.
- [ ] The dot stays centered on the logo within 1px, unchanged from `23-experience.md`,
      at both widths.
- [ ] Every mask in `src/assets/logos/` has meaningful transparency, and every basename
      there matches an `abbr` in `content.json`.
- [ ] `bun scripts/make-logo-masks.ts` reproduces the committed masks from
      `assets-src/logos/`.
- [ ] The logo stays `aria-hidden`; the company name is announced once.
- [ ] `bun test`, `bun run lint`, `bun run build` and the Playwright suite all pass.

## Licensing

The marks are used nominatively — to name employers on a personal CV — which is what
every portfolio and every résumé does, and is not a claim of endorsement. Rendering them
monochrome is a modification some brand guidelines formally disallow; that is the
tradeoff decision 1 already takes on the record. If a company objects, the fix is to
delete one file: decision 5 turns that back into the abbreviation placeholder with no
code change.

## Out of scope

The "also with" companies (`alsoWithCompanies` in `src/lib/ui.ts`) stay a text row — the
mock has no logos there. The project cards (issue 11/24) keep their screenshots; they
show products, not employers. No logo enters the nav, the footer or the OG image — the
cube mark of issue 30 owns the site's own identity. Nothing here is animated: the marks
are static, and the section's only motion stays the company-name scramble. Vectorizing
the masks is not attempted: at 32px it would change nothing on screen.
