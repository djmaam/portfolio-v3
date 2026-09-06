# 24 · Projects: shimmer loop + Telecentro link — spec

Issues: [PV3-29](https://linear.app/portfolio-djmaam-v3/issue/PV3-29) (shimmer cut) ·
[PV3-30](https://linear.app/portfolio-djmaam-v3/issue/PV3-30) (Telecentro URL) ·
Branch: `feat/24-projects`
Design: `handoff/MOTION_SPEC.md` §9

## Defect 1 — the shimmer loop is visibly cut (PV3-29)

`src/components/Projects.astro` and `src/styles/app.css` today:

```css
.shimmer { left: -40%; width: 40%; transform: skewX(-12deg); }
@keyframes shimmer { to { transform: translateX(250%); } }
```

The band is 40% of the frame, parked at `left: -40%` (already offscreen-left before any
transform). `translateX(250%)` moves it 250% of its **own** width = 100% of the frame, so
it lands with its left edge at 60% and its **right edge exactly on the frame's right
edge**. `ease-in-out` decelerates into that exact position, so the last frame anyone sees
is the band parked against the border — then it snaps back to `-40%`. It reads as a cut,
not a loop.

`MOTION_SPEC` §9: `translateX(-100% → 250%)`. That is a different geometry: the band
starts at `left: 0`, and the offscreen offset is the transform, not the layout position.
Our `left: -40%` double-counts the initial offset and eats 40% off the end of the travel.

### The fix

- `.shimmer` moves to `left: 0`, keeps `width: 40%`, and its rest-state transform becomes
  `translateX(-100%) skewX(-12deg)` — the same position the animation starts from, so the
  band is offscreen-left whether or not the animation is running (matches today's
  behavior under `prefers-reduced-motion: reduce`, where the shimmer never animates and
  must not appear as a static bar over the preview).
- `@keyframes shimmer` gets an explicit `from`, and both keyframes carry the skew alongside
  the translate so the two interpolate as one function list instead of decomposing into a
  matrix:

  ```css
  @keyframes shimmer {
    from {
      transform: translateX(-100%) skewX(-12deg);
    }
    to {
      transform: translateX(250%) skewX(-12deg);
    }
  }
  ```

  At `from`: `left: 0` shifted by `-100%` of the band's own 40%-wide box = the band spans
  -40% to 0% of the frame — offscreen-left, touching the boundary. At `to`: shifted by
  `250%` of the same box = the band spans 100% to 140% of the frame — offscreen-right,
  touching the boundary on the other side. Neither endpoint overlaps the frame's interior,
  so the loop point is invisible by construction, not just by eye.

`@keyframes shimmer` lives in `src/styles/app.css`, shared with sibling agents' work —
only that one block is touched here.

## Defect 2 — the Telecentro preview and link point at the root (PV3-30)

`public/previews/telecentro.com.ar.jpg` is a screenshot of `https://telecentro.com.ar/`.
The product the owner actually built, and what the card's description already claims, is
`https://telecentro.com.ar/t-play`. `handoff/content.json` hardcodes
`"url": "https://telecentro.com.ar/"` for both languages and is read-only, so the fix
cannot live there — and the owner has decided the outgoing `href` moves too, not just the
screenshot.

### The fix

`src/lib/projects.ts` already owns the host-keyed preview policy (`PREVIEWS`, keyed by
host so a reordered `content.json` cannot change what a site resolves to). A second table
next to it, `URL_OVERRIDES`, keyed the same way:

```ts
export const URL_OVERRIDES: Record<string, string> = {
  'telecentro.com.ar': 'https://telecentro.com.ar/t-play',
}

export function projectUrl(host: string, fallback: string): string {
  return URL_OVERRIDES[host] ?? fallback
}
```

`Projects.astro`'s `href` and `capture-previews.ts`'s `page.goto` both resolve through
`projectUrl(project.host, project.url)` instead of reading `project.url` directly. Every
other project has no entry in the table, so it falls back to its own `content.json` URL
unchanged.

The screenshot is then regenerated with `bun scripts/capture-previews.ts telecentro.com.ar`
against the new URL, replacing `public/previews/telecentro.com.ar.jpg`.

## Acceptance criteria

- [ ] The shimmer's bounding box does not intersect the preview frame at either `0%` or
      `100%` of the animation.
- [ ] The band still enters from the left, is skewed `-12deg`, is 40% wide, and uses
      `accent@.12`.
- [ ] The animation stays inside `@media (prefers-reduced-motion: no-preference)`.
- [ ] The URL resolved for `telecentro.com.ar` is `https://telecentro.com.ar/t-play`; every
      other project falls back to its `content.json` URL.
- [ ] The rendered card's `href` is `https://telecentro.com.ar/t-play` on both `/` and
      `/en`.
- [ ] The override is keyed by host: reversing `content.es.projects` does not change any
      resolved URL.
- [ ] The new screenshot shows the T-Play product page, not the Telecentro home, still
      960×660 JPEG quality 82, and the preview set stays well under its current ~723 KB.
- [ ] The previews stay decorative (`loading="lazy"`, `alt=""`, `pointer-events: none`) and
      no `<iframe>` returns.

## Out of scope

Everything else in `Projects.astro` and `projects.ts` — the reveal stagger, the column
count, the other five previews. Those are unrelated blocks (19, 17) and are not touched
here.
