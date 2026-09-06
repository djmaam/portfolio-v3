# 17 · Playwright smoke + Lighthouse CI — spec

Issue: [PV3-22](https://linear.app/portfolio-djmaam-v3/issue/PV3-22) · Branch: `feat/17-e2e-lighthouse`
Design: design doc §6, §9 · `handoff/MOTION_SPEC.md` §13

## Goal

The end-to-end safety net, plus the performance budget. Small on purpose: 304 unit tests
already cover every formula, so this block only has to prove the DOM plumbing runs in a
real browser.

## Context

`bun test` covers content, i18n, all the motion math, contrast and the a11y invariants.
None of it opens a browser. Every block so far verified its own DOM work by running
shipped scripts against hand-written stubs — which is honest, but not the same as a
browser.

Two things are still unverified for exactly that reason:

- Whether the focus ring is **visually unclipped**. `overflow: hidden` on `.row`,
  `.preview` and `.edge` could crop a 2px offset ring on an element sitting flush
  against them. Issue 16 flagged this and could not close it.
- Whether the frame budget holds on a throttled machine rather than an M4.

CI today runs lint, test and build on Bun 1.4.0.

## Scope

### 1. Playwright

`bun add -d @playwright/test`. This is the one dependency this block adds, and it is
justified: nothing else drives a real browser.

`playwright.config.ts`: Chromium only, `webServer` running `bun run preview` against the
static build, `baseURL` from it, retries 0 locally and 1 in CI, trace on first retry.

### 2. The six smoke tests — `e2e/smoke.spec.ts`

Each asserts something a unit test structurally cannot:

1. **The hero boots.** After the boot sequence, the `h1` and all five `[data-boot]`
   elements are at opacity 1. Guards the whole `boot.ts` timeline in a real event loop.
2. **The theme toggle round-trips.** Click, assert `documentElement.dataset.theme` and
   `style.colorScheme` both flipped, reload, assert it persisted.
3. **The language toggle navigates.** Click, land on `/en`, assert `<html lang="en">` and
   that the `h1` matches `content.en.h1a`.
4. **A reveal fires on scroll.** A card below the fold starts at opacity 0 and reaches 1
   after scrolling to it.
5. **The method sticky advances.** Scroll through the 280vh track and assert the active
   step index goes 0 → 4 and the indicator text tracks it.
6. **`reduce` mounts no canvas.** With `prefers-reduced-motion: reduce` emulated:
   `page.locator('canvas')` has count 0, and the hero text is visible from the first
   frame.

Plus the one issue 16 could not do:

7. **The focus ring is not clipped.** Tab to each interactive element and assert its
   `getBoundingClientRect`, expanded by the 2px ring and its 2px offset, is inside the
   client rect of every `overflow: hidden` ancestor. If an element fails, fix the CSS —
   do not delete the assertion.

Keep it at these seven. A large E2E suite is slow and flaky, and this one exists to catch
what unit tests cannot reach, not to re-cover them.

### 3. Lighthouse CI

`bun add -d @lhci/cli`. Mobile preset against the static build.

Thresholds, all **error** level: Performance, Accessibility, Best Practices and SEO each
≥ 90.

If Performance misses, degrade in the order `MOTION_SPEC` §13 fixes — shimmer, then
aurora, then node count — and **write down in the PR what was degraded and the before/after
numbers**. Do not lower the threshold, and do not degrade preemptively: measure first.

### 4. CI wiring

Extend `.github/workflows/ci.yml`: the existing `check` job stays as is, and a second job
runs the build once, then Playwright and Lighthouse against it. Cache the Playwright
browser download.

Total CI time must stay under 5 minutes. Report the actual number.

### 5. Scripts

Add `test:e2e` (`playwright test`) and `test:lh` (`lhci autorun`). `tests/scaffold.test.ts`
asserts the exact set of package scripts, so it needs updating — that is expected, not a
reason to avoid adding them.

## Acceptance criteria

- [ ] The seven Playwright tests pass locally three runs in a row with no flake.
- [ ] They pass in CI.
- [ ] Lighthouse reports ≥ 90 on all four categories, mobile, against the built site.
- [ ] The focus-ring test genuinely fails when a ring is clipped — prove it by temporarily narrowing an ancestor, then revert.
- [ ] `bun run lint`, `bun test` and `bun run build` still pass; the scaffold script test is updated.
- [ ] Total CI wall time under 5 minutes.

## Out of scope

Visual regression snapshots. Cross-browser runs — Chromium only; the design targets
evergreen browsers and a second engine doubles CI time for little here. Deploy (issue 18).
