import { revealBoot } from './boot'
import {
  cloudFade,
  consoleEntry,
  ENTRY_MS,
  energyParticle,
  entrySpan,
  markTransform,
  phaseAt,
} from './entry'
import { markPolygons, polyAlpha, strokeWidth } from './mark'
import {
  cloudCenter,
  ellipsoidPoint,
  ellipsoidRadii,
  focalLength,
  nodeCountFor,
  projectNode,
  rotateX,
  type Point,
  type Rect,
} from './math'
import { prefersReducedMotion } from './reduced'
import { scramble } from './scramble'
import { onScroll } from './scroll'

/**
 * The DOM half of the entry choreography (spec 31). Plumbing only: every number it paints
 * comes from `entry.ts` and `mark.ts`, where `bun test` can reach it.
 *
 * The overlay is a second canvas, fixed over the whole viewport and above the nav, and it
 * is removed from the DOM when the sequence ends. One canvas cannot do this: the mark is
 * clipped by the nav during its flight, or the node cloud paints over the console's text,
 * and there is no z-index that satisfies both.
 *
 * `document.documentElement.dataset.entry` is the flag the rest of the site reads —
 * `'run'` while the sequence is in flight, `'done'` once it has ended, skipped or been
 * gated by the session, and absent on any page without a hero. Only this module writes it.
 */

const KEY = 'pv3-entry'
const FRAME_MS = 24

/** Private browsing can throw on either call; a session that cannot be remembered just
 *  plays the entry again, which is a smaller problem than a script that stops here. */
function played(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== null
  } catch {
    return false
  }
}

function remember(): void {
  try {
    sessionStorage.setItem(KEY, 'done')
  } catch {
    /* empty */
  }
}

/**
 * The card's box in viewport coordinates, from its offsets rather than from
 * `getBoundingClientRect`: the driver is scaling and translating the card at the moment
 * the energy targets are built, and a transform moves its rect but not its offsets — the
 * same reason `network.ts` measures the console the way it does.
 */
function cardBox(card: HTMLElement): Rect {
  let el: HTMLElement | null = card
  let left = 0
  let top = 0
  while (el) {
    left += el.offsetLeft
    top += el.offsetTop
    el = el.offsetParent as HTMLElement | null
  }
  return {
    left: left - window.scrollX,
    top: top - window.scrollY,
    width: card.offsetWidth,
    height: card.offsetHeight,
  }
}

/**
 * Plays the entry over the hero, returning its teardown. A no-op under
 * `prefers-reduced-motion: reduce`: no flag, no canvas, no listener, and the resting
 * states in `app.css` all sit behind `no-preference`, so the page is already in its end
 * state. On a second load in the same session it applies that end state and returns.
 */
export function mountEntry(card: HTMLElement): () => void {
  if (prefersReducedMotion()) return () => {}

  const html = document.documentElement
  const navHost = document.querySelector<HTMLElement>('[data-brand] [data-mark]')
  const brandText = document.querySelector<HTMLElement>('[data-brand-text]')

  /** The card is driven per frame, so its resting rule in `app.css` carries no
   *  transition: the end state is this same function at `t = D`, applied once. */
  const paintConsole = (t: number) => {
    const { opacity, translateY, scale, blur, sweep } = consoleEntry(t, ENTRY_MS)
    card.style.opacity = String(opacity)
    card.style.transform = `translateY(${translateY}px) scale(${scale})`
    card.style.filter = `blur(${blur}px)`
    card.style.setProperty('--sweep', `${sweep * 100}%`)
    card.style.setProperty('--sweep-a', sweep > 0 && sweep < 1 ? '1' : '0')
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  /** The card's end state, with the transform and blur it arrived under cleared: both are
   *  no-ops at `t = D` that still cost the card a compositing layer for the rest of the
   *  visit. Its opacity stays written — the resting rule in `app.css` is 0. */
  const settleConsole = () => {
    paintConsole(ENTRY_MS)
    card.style.transform = ''
    card.style.filter = ''
  }

  if (!navHost || !ctx || played()) {
    html.dataset.entry = 'done'
    settleConsole()
    return () => {}
  }

  html.dataset.entry = 'run'

  const w = window.innerWidth
  const h = window.innerHeight
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  canvas.id = 'entry'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  // A child of `body`, not of the `z-[1]` wrapper the nav sits in: one z-index then
  // clears the sticky nav instead of fighting a stacking context it cannot leave.
  document.body.appendChild(canvas)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // The tokens the browser resolved, like the other two canvases. Never a literal color.
  let accent = getComputedStyle(canvas).color
  let light = html.dataset.theme === 'light'
  const themes = new MutationObserver(() => {
    accent = getComputedStyle(canvas).color
    light = html.dataset.theme === 'light'
  })
  themes.observe(html, { attributes: true, attributeFilter: ['data-theme'] })

  // The overlay owns both while it is flying them in.
  navHost.style.opacity = '0'
  if (brandText) brandText.style.opacity = '0'

  const dock = entrySpan('DOCK', ENTRY_MS)

  /** The FLIP target: the nav slot's center and the box `markDraw.ts` paints into. Read at
   *  mount and re-read once at the start of DOCK, never per frame — a layout read per
   *  frame is the thing the site's one-scroll-listener rule exists to prevent. */
  const slot = () => {
    const rect = navHost.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      // The box the nav canvas uses, not the measured width: the landing has to be the
      // same integer, or the mark resizes by a fraction of a pixel as the overlay dies.
      box: Number(navHost.dataset.mark),
    }
  }
  let nav = slot()
  let measured = false

  /** Where the particles are going: the hero cloud's own ellipsoid, sampled off `math.ts`
   *  so they land where `network.ts` is drawing rather than near it. Built once, on the
   *  first frame of ENERGY, from one measurement of the card. */
  let targets: Point[] | null = null
  const buildTargets = (): Point[] => {
    const center = cloudCenter(cardBox(card), w, h)
    const radii = ellipsoidRadii(w, h, 0)
    const cam = { f: focalLength(w, h), w, h }
    const count = nodeCountFor(w)

    return Array.from({ length: count }, (_, i) => {
      // The golden angle spreads the longitudes without a random source; the latitude
      // walks the same ±1.3 band `makeNodes` draws from.
      const rad = 0.55 + (((i * 7) % 11) / 11) * 0.6
      const point = ellipsoidPoint(i * 2.399963, (i / count - 0.5) * 2.6, {
        rx: radii.rx * rad,
        ry: radii.ry * rad,
        rz: radii.rz * rad,
      })
      const projected = projectNode(rotateX(point, 0.1), cam)
      return { x: projected.x + center.x - w / 2, y: projected.y + center.y - h / 2 }
    })
  }
  const particleDelay = (i: number) => ((i * 13) % 17) / 17

  let born = 0
  let raf = 0
  let last = 0
  let ended = false
  let named = false

  const draw = (t: number) => {
    if (!measured && t >= dock.from) {
      nav = slot()
      measured = true
    }

    const frame = markTransform(t, ENTRY_MS, { w, h }, nav)
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = accent
    ctx.fillStyle = accent

    ctx.save()
    ctx.translate(frame.center.x - frame.scale / 2, frame.center.y - frame.scale / 2)
    for (const poly of markPolygons(frame.scale, frame.settle, t, frame.spinY, frame.expand)) {
      const alpha = polyAlpha(poly, light)
      ctx.beginPath()
      poly.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      if (poly.points.length > 2) {
        ctx.closePath()
        if (alpha.fill > 0) {
          ctx.globalAlpha = alpha.fill * frame.alpha
          ctx.fill()
        }
      }
      ctx.globalAlpha = alpha.stroke * frame.alpha
      ctx.lineWidth = strokeWidth(poly.kind, frame.scale)
      ctx.stroke()
    }
    ctx.restore()

    // The energy trail. It is decoration on the overlay: the real cloud comes up under it
    // over the same window (`cloudFade` in `network.ts`), so the particles fade out as the
    // nodes they are landing on resolve, and nothing is ever handed over.
    const fade = cloudFade(t, ENTRY_MS)
    const pEnergy = phaseAt('ENERGY', t, ENTRY_MS)
    if (pEnergy > 0 && fade < 1) {
      targets ??= buildTargets()
      ctx.globalAlpha = 0.75 * (1 - fade)
      for (let i = 0; i < targets.length; i++) {
        const p = energyParticle(frame.center, targets[i] as Point, pEnergy, particleDelay(i), h)
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    paintConsole(t)

    // The brand resolves as the mark comes down on the nav, not after it: the same
    // `scramble` the nav already runs on load, with its trigger moved here.
    if (!named && brandText && t >= dock.from + 0.62 * (dock.to - dock.from)) {
      named = true
      brandText.style.opacity = ''
      scramble(brandText, 0.16 * ENTRY_MS)
    }
  }

  const end = () => {
    if (ended) return
    ended = true
    cancelAnimationFrame(raf)
    stopScroll()
    window.removeEventListener('click', skip)
    themes.disconnect()
    canvas.remove()
    settleConsole()
    // The nav canvas has been painting the same frame underneath all along, so revealing
    // it as the overlay goes is the whole handover.
    navHost.style.opacity = ''
    if (brandText) brandText.style.opacity = ''
    remember()
    html.dataset.entry = 'done'
    // The cascade is on timers of its own; a skip has to flush the ones still pending.
    revealBoot()
  }

  /** One final frame at `t = D`, then teardown. The end state is not written twice: it is
   *  the same `draw` every other frame goes through, at the end of the clock. */
  const skip = () => {
    if (ended) return
    draw(ENTRY_MS)
    end()
  }

  const step = (now: number) => {
    raf = requestAnimationFrame(step)
    if (born === 0) born = now
    if (now - last < FRAME_MS) return
    last = now
    const t = Math.min(ENTRY_MS, now - born)
    draw(t)
    if (t >= ENTRY_MS) end()
  }

  // The site's one scroll listener, not a second one: `tests/network.test.ts` asserts
  // `scroll.ts` is the only module that attaches one. It calls back on subscription, so
  // the skip waits for the position to actually change.
  //
  // That channel also republishes on `resize`, which is the only warning this module gets
  // that its canvas and its nav target have both gone stale. Rather than re-measure and
  // re-scale mid-flight, a resize ends the sequence the same way a click does: it is a
  // rare thing to do in the first four seconds of a page, and the end state is never wrong.
  const startY = window.scrollY
  const stopScroll = onScroll(({ scrollY, vh }) => {
    if (scrollY !== startY || vh !== h || window.innerWidth !== w) skip()
  })
  window.addEventListener('click', skip)

  raf = requestAnimationFrame(step)

  return end
}
