# 06 · Decorative console — spec

Issue: [PV3-11](https://linear.app/portfolio-djmaam-v3/issue/PV3-11) · Branch: `feat/06-console`
Design: `handoff/DESIGN_SPEC.md` §3.2 · `handoff/MOTION_SPEC.md` §2 · `handoff/content.json` → `consoleLog`

## Goal

Fill the hero's empty right column with the orchestration console, in its decorative
form. It also exposes the per-line callback that issue 07 uses to fire node-network
pulses.

The interactive console of `handoff/AGENT_CONSOLE_SPEC.md` is v1.1 and out of scope.

## Context

`Hero.astro` renders an empty `<div>` as the second grid track — the console replaces it.
`boot.ts` already handles `[data-boot]`, and the resting state in `app.css` is shared;
the console overrides only its own transform and duration.

`consoleLog` in `content.json` is 11 `[key, value]` pairs, language-independent.

## Scope

### 1. `src/components/Console.astro`

Card: `--color-console-bg`, `backdrop-filter: blur(20px)`, `border-radius: 28px`,
`box-shadow: 0 30px 80px` at .12 light / .6 dark, 1px border in `--color-line`.

Three parts:

- **Header** — three dots, the label `orchestrator — session 0x4D41`, and a LIVE
  indicator (accent dot + `LIVE`, mono, `--text-label-sm`). This is chrome, not page
  copy: it goes in `ui.ts`, same as the theme-toggle label.
- **Log** — six line slots, each `hh:mm:ss · key · value`, mono ~12.5px. `key` in
  `--color-accent`, `value` in `--color-ink`, time in `--color-dim`. Subtle scanlines
  over the log area (repeating-linear-gradient, very low alpha).
- **Footer** — three metrics: AGENTS, SPECS, SHIPPED. Mono 10px labels with `.12em`
  tracking, 20px values, SHIPPED's value in accent. Separated by 1px borders.

### 2. Timestamps must be client-side

The site is statically built. Rendering `hh:mm:ss` at build time would bake **one
timestamp into the HTML forever** — every visitor would see the moment the site was
deployed, and it would drift further from reality with every day the build is not
redeployed.

So: the server renders the six lines with their `key` and `value` and an **empty time
cell**. JavaScript fills the times as lines cycle. With no JavaScript the log reads as
six key/value lines and no clock, which is honest — better than a frozen wrong time.

### 3. Log cycling — `src/lib/motion/consoleLog.ts`

A new line every 1400ms, `rise .35s` on entry (`opacity 0 → 1`,
`translateY(6px) → 0`). At most six visible: the oldest drops as the newest enters.
The source cycles the 11 messages with `tick % 11`, so it loops forever.

The initial six lines are the first six of the cycle, so the server-rendered markup and
the first client frame agree.

### 4. Metrics — pure, in `math.ts`

Exactly the mock's formulas (`Portfolio.dc.html:696`):

```ts
metricsAt(tick: number): { agents: number; specs: number; shipped: number }
// agents  = 3 + (tick % 2)
// specs   = 12 + Math.floor(tick / 11)
// shipped = 41 + Math.floor(tick / 6)
```

Unit-tested, including that `agents` stays within 3–4 for any tick, and that `specs` and
`shipped` never decrease.

### 5. Boot and sweep

`data-boot="10"` → 2200ms, which `bootDelay` already returns. The console's own resting
state overrides the shared one: `translateY(24px) scale(.96) blur(10px)`, transition
1100ms.

A scan line crosses the card once: 2px tall, accent gradient with a glow,
`sweep 1.4s cubic-bezier(.4,0,.2,1)` with a 1.1s delay, `animation-iteration-count: 1`.
The `sweep` keyframe already exists in `app.css`.

### 6. The callback for issue 07

```ts
export function onLogLine(fn: (line: { key: string; value: string }) => void): () => void
```

Same shape as `onScroll`: subscribe, get an unsubscribe back. Fires exactly once per new
line. Issue 07 subscribes to trigger a network pulse; nothing subscribes yet in this
block, and the API must work with zero subscribers.

### 7. Accessibility — deliberate deviation

`handoff/AGENT_CONSOLE_SPEC.md` asks for `role="log"` with `aria-live="polite"`. That is
right for the **interactive** console of v1.1, where output answers a user action.

Here the log auto-cycles forever with no user input. `aria-live="polite"` would make a
screen reader announce a new line every 1.4 seconds, indefinitely — hostile, and it would
bury the rest of the page.

So this block ships `role="log"` with **`aria-live="off"`** and a comment explaining why.
v1.1 flips it to `polite` when lines become responses to a question. The decorative log
is presentational; nothing in it is information the visitor needs.

### 8. Reduced motion

Six static lines, no cycling, no sweep, no rise. Metrics render at `tick = 0`. The
timestamps stay empty, since nothing drives them.

## Acceptance criteria

- [ ] `bun test`: `metricsAt(tick)` matches the three formulas exactly, for tick 0, 1, 6, 11, 12, 66.
- [ ] `bun test`: `agents` ∈ {3, 4} for every tick in 0..500; `specs` and `shipped` are non-decreasing.
- [ ] `bun test`: the cycle emits the 11 messages in order and wraps, never showing more than six lines.
- [ ] `bun test`: `onLogLine` fires exactly once per line, and the cycle runs fine with zero subscribers.
- [ ] `bun test`: unsubscribing stops delivery; the last unsubscribe stops the interval.
- [ ] `bun test`: with `reduce`, no interval is started.
- [ ] `dist/*.html` contains no `hh:mm:ss` timestamp — the time cells ship empty.
- [ ] The six initial lines in the HTML are the first six of the cycle.
- [ ] `role="log"` with `aria-live="off"`; the LIVE dot and the three header dots are `aria-hidden`.
- [ ] Console chrome copy comes from `ui.ts`, log content from `content.json`. No literal strings in the component.
- [ ] With JavaScript disabled: the card renders complete, six lines with key and value, metrics at their base values.
- [ ] Still exactly one scroll listener call site, and one delegated anchor handler.
- [ ] `bun run lint`, `bun test` and `bun run build` pass.

## Out of scope

The interactive agent (v1.1): input, streaming, expand mode, suggestion chips. The node
canvas (issue 07) — this block only exposes the callback it will consume.
