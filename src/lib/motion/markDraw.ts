import { hoverSettle, markPolygons, markSpin, polyAlpha, strokeWidth } from './mark'
import { prefersReducedMotion } from './reduced'

/**
 * The canvas half of the mark (spec 30). Plumbing only: every number it paints comes from
 * `mark.ts`, where `bun test` can reach it.
 *
 * One rAF for every mark on the page, throttled like the node cloud, and an
 * `IntersectionObserver` that stops the ones nobody is looking at — which is the footer,
 * most of the time.
 */

type Mounted = {
  ctx: CanvasRenderingContext2D
  box: number
  visible: boolean
  light: boolean
  accent: string
  /** `performance.now()` at mount. Every other time in `Mounted` is rebased onto this, the
   *  way `network.ts` rebases onto its own `born` — so the first frame is always `t = 0`,
   *  which is the frame `restingPolygons` bakes into the build-time SVG. */
  born: number
  /** When the pointer last entered the mark's link, in the same `born`-relative time base
   *  as `t`, so the pieces can loosen and settle. */
  hoverAt: number
}

const FRAME_MS = 24

const mounted = new Set<Mounted>()
let running = false
let last = 0

const observer =
  typeof IntersectionObserver === 'undefined'
    ? null
    : new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const mark = (entry.target as HTMLElement & { _mark?: Mounted })._mark
          if (mark) mark.visible = entry.isIntersecting
        }
      })

function readTheme(mark: Mounted): void {
  // The tokens the browser resolved, so the canvas follows the theme toggle without ever
  // naming a color — the same trick `network.ts` uses.
  const styles = getComputedStyle(mark.ctx.canvas)
  mark.accent = styles.color
  mark.light = document.documentElement.dataset.theme === 'light'
}

function paint(mark: Mounted, now: number): void {
  const { ctx, box } = mark
  ctx.clearRect(0, 0, box, box)
  ctx.strokeStyle = mark.accent
  ctx.fillStyle = mark.accent

  // Rebased onto this mark's own mount, not the page's time origin: at `t = 0` this is
  // `restingPolygons(box)` exactly, which is what `CubeMark.astro` baked into the SVG the
  // canvas just replaced.
  const t = now - mark.born
  const settle = hoverSettle(mark.hoverAt, t)

  for (const poly of markPolygons(box, settle, t, markSpin(t))) {
    const alpha = polyAlpha(poly, mark.light)
    ctx.beginPath()
    poly.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    if (poly.points.length > 2) {
      ctx.closePath()
      if (alpha.fill > 0) {
        ctx.globalAlpha = alpha.fill
        ctx.fill()
      }
    }
    ctx.globalAlpha = alpha.stroke
    ctx.lineWidth = strokeWidth(poly.kind, box)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function loop(now: number): void {
  if (mounted.size === 0) {
    running = false
    return
  }
  if (now - last >= FRAME_MS) {
    last = now
    for (const mark of mounted) if (mark.visible) paint(mark, now)
  }
  requestAnimationFrame(loop)
}

/**
 * Replaces the build-time SVG inside `host` with a canvas and starts turning it. Returns
 * the teardown. A no-op under `prefers-reduced-motion: reduce`: the SVG stays.
 */
export function mountMark(
  host: HTMLElement,
  box: number,
  hoverTarget?: Element | null,
): () => void {
  if (prefersReducedMotion()) return () => {}

  const canvas = document.createElement('canvas')
  // Read once and never again, unlike `network.ts`, which re-measures on the shared scroll
  // channel. Deliberate: this box never resizes, and a zoom or a monitor swap leaving a
  // 16-20px decoration slightly soft is not worth a second listener to chase.
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.width = Math.round(box * dpr)
  canvas.height = Math.round(box * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  host.querySelector('[data-mark-svg]')?.remove()
  host.appendChild(canvas)

  const mark: Mounted = {
    ctx,
    box,
    visible: true,
    light: false,
    accent: 'currentColor',
    born: performance.now(),
    hoverAt: 0,
  }
  readTheme(mark)
  mounted.add(mark)
  ;(host as HTMLElement & { _mark?: Mounted })._mark = mark
  observer?.observe(host)

  // Only fires on the theme toggle, so it costs nothing per frame.
  const themeWatch = new MutationObserver(() => readTheme(mark))
  themeWatch.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })

  const onHover = () => (mark.hoverAt = performance.now() - mark.born)
  hoverTarget?.addEventListener('mouseenter', onHover)

  if (!running) {
    running = true
    requestAnimationFrame(loop)
  }

  return () => {
    hoverTarget?.removeEventListener('mouseenter', onHover)
    themeWatch.disconnect()
    observer?.unobserve(host)
    mounted.delete(mark)
    canvas.remove()
  }
}
