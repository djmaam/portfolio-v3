# 13 · Contact — spec

Issue: [PV3-18](https://linear.app/portfolio-djmaam-v3/issue/PV3-18) · Branch: `feat/13-contact`
Design: `handoff/DESIGN_SPEC.md` §3.8, §4 · `handoff/MOTION_SPEC.md` §11

## Goal

The closing card: theme-inverted, with a conic gradient rotating in its border.

## Context

**Three other sections are being built in parallel.** You own `Contact.astro` and the
`contact` markers in both pages. Nothing else.

Reuse `bindReveals` from `reveal.ts`.

Content: `secContact`, `contactTitle`, `contactSub`, and `links`
(`email`, `github`, `linkedin`, `telegram`).

## Scope

`src/components/Contact.astro`, props `lang: Lang`, section `id="contact"`.

The card **inverts the theme**: background `--color-contact-card`, text
`--color-contact-ink` (both already exist). `border-radius: 32px`.

**Animated border**: a wrapper with `padding: 2px; border-radius: 34px; overflow: hidden`
containing a div at 220% size with
`conic-gradient(from 0deg, accent@.1 0 50%, accent 76%, violet 86%, accent@.1 100%)`,
spinning with `spin 7s linear infinite`. A halo: the same gradient at `inset: -2px` with
`blur(14px)` and `opacity: .55`.

**Inner grid**: 48px squares, `mask: radial-gradient(60% 80% at 80% 50%, …)`,
`gridflow 6s linear infinite`.

Left: `06 / CONTACTO`, `contactTitle` at `--text-h2-contact`, `contactSub`.
Right: the email large and underlined with `↗`, then pills for GitHub, LinkedIn and
Telegram.

**Icons**: monochrome, drawn with `mask-image` over `currentColor` so they inherit the
hover color. Inline SVG as a data URI in the CSS, not `<img>` and not a fill-colored SVG
— a fill would not follow the theme inversion or the hover.

States: email hover → `--color-contact-ink`, the arrow gap grows 10px → 16px. Pills
hover → accent border and text, icon inherits.

One column below 720px; the email may wrap onto two lines.

`mailto:` for the email; the three social links get `target="_blank"` and
`rel="noopener"`.

## Acceptance criteria

- [ ] `bun test`: every link comes from `content.json` → `links`; the `mailto:` matches `links.email`.
- [ ] The card renders inverted against the active theme, in both light and dark.
- [ ] Icons use `mask-image` over `currentColor` — no `fill` attribute with a fixed color.
- [ ] External links carry `rel="noopener"`.
- [ ] With `reduce`: no border spin, no `gridflow`; the card renders complete.
- [ ] With JavaScript disabled the card and every link work.
- [ ] Still exactly one scroll listener call site.
- [ ] `git status` touches only `Contact.astro`, the two page markers, its styles and its test file.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.
