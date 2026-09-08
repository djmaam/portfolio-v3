# 33 · Favicon: the tab icon is the nav mark — spec

Issue: [PV3-38](https://linear.app/portfolio-djmaam-v3/issue/PV3-38) ·
Branch: `feat/33-favicon`
Design: [`30-cube-mark.md`](./30-cube-mark.md) — this block ships no new shape, only a
second renderer for the one that block already defined.

## Goal

The site still served Astro's default favicon: the rocket glyph that ships with
`bun create astro`. The tab icon has to be the mark the nav and the footer draw.

Nothing here is drawn by hand. `scripts/make-favicon.ts` imports `restingPolygons`,
`polyAlpha` and `strokeWidth` from `src/lib/motion/mark.ts` — the same three functions
`CubeMark.astro` calls — so the favicon is the logo by construction, not by resemblance.

## The box is 20, not 32

`markPieces` drops the ticks, the panels and the corner cubes below `DETAIL_MIN` (24), and
`Nav.astro` renders at 20. That reduced cluster is the shape that survives at 16px in a
tab: the full thirty-five pieces turn to noise long before that. Generating at the nav's
own box is also what makes the drift test below meaningful — one number, one shape.

Alphas come from `polyAlpha(poly, true)`. Those are the higher of the two branches, and a
single set of shapes has to carry both tab bars.

## The three files

| File                        | Size | Notes                                                                                                        |
| --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| `public/favicon.svg`        | 20   | `color` on the root plus a `prefers-color-scheme: dark` branch, so the icon follows the tab bar.               |
| `public/favicon.ico`        | 32   | PNG bytes. Safari still ignores SVG favicons.                                                                  |
| `public/apple-touch-icon.png` | 180 | Opaque `--color-bg`: iOS composites transparency to black.                                                     |

The rasters are screenshots of the SVG through the Playwright chromium the e2e suite
already installs — no image dependency is added for two files that change once a year.

Two deliberate calls, both about a raster having no media query:

- The `.ico` name is kept even though the bytes are PNG. Astro's own default did exactly
  that, and clients still probe `/favicon.ico` blind. `Base.astro` links it explicitly all
  the same, with `type="image/png"`.
- The `.ico` takes the **light**-theme accent (`#0a8faf`). The dark accent is a pale cyan
  that disappears on a light tab bar; the darker teal reads on both.

## Colors

`scripts/check-tokens.ts` scans `src/` only, and these literals live in `scripts/`. That is
not a loophole: an SVG under `public/` is served raw and can never read `@theme`, so the
accent has to be inlined somewhere. Keeping it in the generator means one file to edit, and
the generated SVG is derived output rather than hand-maintained markup.

## Acceptance criteria

- [x] No Astro default asset left under `public/`.
- [x] Rerunning `bun scripts/make-favicon.ts` reproduces all three files.
- [x] `tests/mark.test.ts` fails if `mark.ts` moves and the favicon is not regenerated: it
      asserts the shape count and the first vertex against `restingPolygons(20)`.
- [x] `bun run lint`, `bun test` (379) and `bun run build` green.
