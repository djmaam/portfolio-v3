# 20 · Nav alignment and the two-line language toggle — spec

Issues: [PV3-25](https://linear.app/portfolio-djmaam-v3/issue/PV3-25),
[PV3-26](https://linear.app/portfolio-djmaam-v3/issue/PV3-26) · Branch: `feat/20-nav-align`
Design: `handoff/DESIGN_SPEC.md` §1, §4 · `handoff/reference/Portfolio.dc.html`

Two independent defects in `src/components/Nav.astro`. They ship together because they
are the same file.

## Defect 1 (PV3-25) — the nav is not aligned to the page container

### Context

`.nav` carries its own edge padding instead of sharing the page container:

```css
.nav {
  padding-inline: clamp(20px, 4vw, 48px); /* no max-width, no centering */
}
```

`container-page` (fixed by issue 19) is `max-width: 1200px; margin-inline: auto;
padding-inline: clamp(20px, 4vw, 48px); box-sizing: content-box`. Below its 1296px cap,
`width: auto` makes an unconstrained box resolve to the same thing a capped one does, so
`.nav`'s own clamp happens to land on the same numbers as `container-page`'s by
coincidence — the two formulas are identical. Above the cap, `container-page` stops
growing and `.nav` does not, and the nav drifts away from every section under it.

The mock has the same bug (`handoff/reference/Portfolio.dc.html`: `nav { padding: 14px
48px }`, full width, no cap). This is a deliberate improvement over the mock, decided by
the site's owner: the glass bar stays full-bleed for its background and bottom border,
but its *contents* — brand, links, toggles — align to the same 1200px column as the rest
of the page. A full-width chrome band over a fixed content grid, the Apple pattern the
design leans on elsewhere.

### Measured

Chromium, dark, `/`:

| Viewport | | Nav content edge | `container-page` edge | Drift |
| --- | --- | --- | --- | --- |
| 1512px | brand left | 48 | 156 | **108px** |
| 1512px | theme toggle right | 1464 | 1356 | **108px** |
| 1024px | brand left | 40.95 | 40.96 | 0 (below the cap, the formulas agree) |

At 1512px the nav's contents sit 108px outside the grid on both sides — the two clamp
formulas agree everywhere under 1296px and diverge everywhere above it, which is exactly
`container-page`'s own cap behavior (spec 19).

### Fix

Keep `.nav` full width for the glass background and the border. Add an inner wrapper —
`.inner.container-page` — that holds brand, links and toggles, exactly the role
`container-page` already plays in `About.astro`, `Contact.astro`, `Experience.astro`,
`Projects.astro`, `Stack.astro` and `Footer.astro`. Unlike `Method.astro`'s `.inner`, this
one is a plain block child of `.nav` rather than a flex item, so it does not need to
restate the `width: min(100% - 2 * var(--container-pad), var(--container-max))` formula —
block layout's own `width: auto` plus `container-page`'s `max-width` and `margin-inline:
auto` already center it correctly. `.inner` itself becomes the flex row that `.nav` used
to be (`display: flex; align-items: center; gap: 14px; height: 100%`), so `--nav-h` still
sets the bar's total height and nothing about the sticky/background/border rules on `.nav`
changes.

## Defect 2 (PV3-26) — the language toggle renders on two lines

### Context

```astro
<a class="toggle lang ..."><span class="lang-current">{lang.toUpperCase()}</span> / {otherLang}</a>
```

```css
.toggle {
  display: grid;
  place-items: center;
}
```

A grid container wraps every stray text run in its own anonymous grid item. `<span>ES</span>`
and the trailing text node `" / en"` become two items, and `grid-auto-flow: row` (Grid's
default) places anonymous items on separate rows — `white-space: nowrap` never gets a
chance to matter, because the two runs were never on the same line to begin with. `.theme`
is unaffected because its only child is a single `<span class="dial">`, so there is only
one grid item and nothing to stack.

### Measured

Chromium, dark, `/`, the lang toggle:

| | Value |
| --- | --- |
| `scrollHeight` | 36px (two 18px lines) |
| `clientHeight` | 32px (fixed `height: 34px` clips it, minus borders) |
| `outerHTML` | `<a class="toggle lang ..."><span class="lang-current">ES</span> / en</a>` |

### Fix

Switch `.toggle` from `display: grid; place-items: center` to `display: flex;
align-items: center; justify-content: center`. Flex's default `flex-direction: row` lays
anonymous flex items out in a line instead of stacking them, so the fix is one property
change, shared by both `.lang` (two items) and `.theme` (one item) with no markup change.

## Acceptance criteria

- [ ] The nav's brand left edge equals the left edge of a section's `container-page`
      content, at 1512px and at 1024px. The right-hand toggle's right edge equals the
      container's right edge.
- [ ] Below 720px, where the container padding drops toward 20px, the nav follows and the
      section links stay hidden (the existing `@media (width < 720px)` rule).
- [ ] The lang toggle's `scrollHeight` is not greater than its `clientHeight`, on both `/`
      and `/en`. `ES / en` renders on one line, the pill keeps its 34px height and 999px
      radius.
- [ ] The lang link is still a real `<a href>` with `rel="alternate"` — the no-JS
      translation path stays guarded by `tests/a11y.test.ts`.
- [ ] `--nav-h` is unchanged and the sticky nav still does not cover focused content.
- [ ] `bun test`, `bun run lint`, `bun run build` and the Playwright suite all pass.

## Out of scope

Anything about the section links themselves (labels, targets, mobile menu design) — no
defect was filed against them and `handoff/DESIGN_SPEC.md` §1 explicitly leaves mobile nav
undesigned. The theme toggle's own visuals — `.theme` is not broken, only along for the
ride because it shares `.toggle`.
