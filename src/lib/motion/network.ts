import { onLogLine } from './consoleLog'
import {
  ANCHOR_DIST,
  asteriskRadius,
  asteriskTarget,
  cameraAngles,
  cloudCenter,
  collapseFactor,
  CONNECT_DIST,
  commandPulses,
  connectionAlpha,
  consoleAnchors,
  CURSOR_BOOST_DIST,
  CURSOR_LINK_DIST,
  cursorPull,
  ellipsoidPoint,
  ellipsoidRadii,
  fade,
  focalLength,
  formationPhase,
  insideCard,
  lerp,
  median,
  nearestPoint,
  nodeAlpha,
  nodeCountFor,
  nodeRadius,
  projectNode,
  rotateX,
  rotationStep,
  twinkle,
  verticalDrift,
  type Point,
  type Rect,
} from './math'
import { prefersReducedMotion } from './reduced'
import { onScroll } from './scroll'

/** 24ms between rendered frames: the 30–40fps of `MOTION_SPEC` §3. */
const FRAME_MS = 24
/** Frames sampled before deciding whether the machine can afford the full cloud. */
const SAMPLE_FRAMES = 60
/** Median frame time above which the cloud drops to `SAFE_NODES`, once and for all. */
const SLOW_FRAME_MS = 33
const SAFE_NODES = 40

type NetNode = {
  /** Longitude and latitude on the ellipsoid, and how fast each drifts. */
  theta: number
  phi: number
  dTheta: number
  dPhi: number
  /** Fraction of the ellipsoid radii this node orbits at, so the cloud has thickness. */
  rad: number
  size: number
  phase: number
  /** Displacement the cursor has pulled the node by, decaying every frame. */
  ox: number
  oy: number
  flash: number
  depth: number
}

/** An anchor of the console is a fixed point; every other end of a pulse is a node. */
type PulseEnd = number | Point
type LivePulse = { from: PulseEnd; to: number; t: number }

function makeNodes(count: number, rand: () => number): NetNode[] {
  return Array.from({ length: count }, () => ({
    theta: rand() * Math.PI * 2,
    phi: (rand() - 0.5) * 2.6,
    dTheta: (rand() - 0.5) * 0.0005,
    dPhi: (rand() - 0.5) * 0.0002,
    rad: 0.55 + rand() * 0.6,
    size: 1 + rand() * 1.3,
    phase: rand() * Math.PI * 2,
    ox: 0,
    oy: 0,
    flash: 0,
    depth: 1,
  }))
}

/**
 * The hero's node network (`MOTION_SPEC` §3): 84 nodes on a rotating ellipsoid centered
 * on the console, converging into the ✳ on load, wired to the console's log, reacting to
 * the cursor and collapsing on scroll.
 *
 * Plumbing only — canvas, node array and rAF loop. Every formula it draws with lives in
 * `math.ts`, where `bun test` covers it without a DOM.
 */
class NodeNetwork {
  private canvas = document.createElement('canvas')
  private ctx: CanvasRenderingContext2D
  private nodes: NetNode[]
  /** Projected position of each node this frame, reused instead of reallocated. */
  private points: Point[]
  private pulses: LivePulse[] = []
  private anchors: Point[] = []

  private w = 0
  private h = 0
  private dpr = 1
  private card: Rect | null = null

  private raf = 0
  private last = 0
  private born = 0
  private rot = 0
  private tilt = 0
  private camRot = 0
  private collapse = 0
  private form = 0

  /** Cursor in canvas fractions: negative until a mouse has actually moved over it. */
  private mouse = { x: -1, y: -1, tx: -1, ty: -1 }

  private accent = ''
  private violet = ''
  private dark = true

  private samples: number[] = []
  private degraded = false

  private stopScroll: () => void
  private stopLog: () => void
  private themes: MutationObserver

  constructor(
    private section: HTMLElement,
    private cardEl: HTMLElement,
    rand: () => number = Math.random,
  ) {
    this.canvas.className = 'hero-net'
    this.canvas.setAttribute('aria-hidden', 'true')
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D
    section.append(this.canvas)

    this.nodes = makeNodes(nodeCountFor(section.clientWidth), rand)
    this.points = this.nodes.map(() => ({ x: 0, y: 0 }))

    this.readTheme()
    this.themes = new MutationObserver(() => this.readTheme())
    this.themes.observe(document.documentElement, { attributeFilter: ['data-theme'] })

    this.measure()

    // The one scroll listener of the site already publishes `vh` and refreshes on
    // resize, so the canvas needs neither a `scroll` nor a `resize` listener of its own.
    this.stopScroll = onScroll(({ scrollY, vh }) => {
      this.collapse = collapseFactor(scrollY, vh)
      this.measure()
      // Nothing to draw once the network is fully collapsed: park until it comes back.
      if (this.collapse >= 1) this.park()
      else this.resume()
    })

    // The canvas is a viewport box, so its size no longer changes when the hero re-flows
    // and `measure`'s size guard would keep a stale card across a font swap — the one
    // reflow that moves the console without resizing the window.
    document.fonts?.ready.then(() => {
      this.w = -1
      this.measure()
    })

    this.stopLog = onLogLine(() => this.command())
    window.addEventListener('pointermove', this.onPointer, { passive: true })
    this.resume()
  }

  destroy(): void {
    this.park()
    this.stopScroll()
    this.stopLog()
    this.themes.disconnect()
    window.removeEventListener('pointermove', this.onPointer)
    this.canvas.remove()
  }

  /** Desktop only: a touch never reports `mouse`, so it never gets a cursor node. */
  private onPointer = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    this.mouse.tx = (event.clientX - rect.left) / rect.width
    this.mouse.ty = (event.clientY - rect.top) / rect.height
  }

  private readTheme(): void {
    // The tokens resolved by the browser, so the canvas follows the theme toggle without
    // ever naming a color: `.hero-net` carries the accent as `color` and the violet as
    // `border-color` for exactly this.
    const styles = getComputedStyle(this.canvas)
    this.accent = styles.color
    this.violet = styles.borderTopColor
    this.dark = document.documentElement.dataset.theme !== 'light'
  }

  /**
   * Backing store and console rect, both only on a real size change: the card is
   * measured once per resize and cached, never per frame. Offsets, not
   * `getBoundingClientRect`, so the boot transform of the card does not move the anchors.
   */
  private measure(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas
    if (w === this.w && h === this.h) return
    this.w = w
    this.h = h
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)

    let el: HTMLElement | null = this.cardEl
    let left = 0
    let top = 0
    while (el && el !== this.section) {
      left += el.offsetLeft
      top += el.offsetTop
      el = el.offsetParent as HTMLElement | null
    }
    // Into the canvas' own coordinates. The canvas is the viewport box, not the section
    // box (`app.css`, `.hero-net`), so the two spaces no longer coincide.
    left -= this.canvas.offsetLeft
    top -= this.canvas.offsetTop
    this.card = { left, top, width: this.cardEl.offsetWidth, height: this.cardEl.offsetHeight }
    this.anchors = consoleAnchors(this.card)
  }

  private park(): void {
    if (this.raf === 0) return
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private resume(): void {
    if (this.raf === 0) this.raf = requestAnimationFrame(this.frame)
  }

  /** A node the console can see: not hidden behind the card, not lost at the back. */
  private visible(index: number): boolean {
    const p = this.points[index] as Point
    return !insideCard(p.x, p.y, this.card) && (this.nodes[index] as NetNode).depth >= 0.5
  }

  /**
   * One log line, one command (`MOTION_SPEC` §3): a pulse from the left-62% anchor to the
   * nearest visible node, then a three-hop breadth-first walk out from it. Silent once
   * the network has mostly collapsed, and before the first frame has placed the nodes.
   */
  private command(): void {
    const source = this.anchors[1]
    if (!source || this.collapse >= 0.6 || this.born === 0) return

    const start = nearestPoint(this.points, source.x, source.y, Infinity, (i) => this.visible(i))
    if (start < 0) return

    this.pulses.push({ from: { ...source }, to: start, t: 0 })
    for (const pulse of commandPulses(this.points, start)) {
      this.pulses.push({ from: pulse.from, to: pulse.to, t: pulse.delay })
    }
  }

  private endpoint(end: PulseEnd): Point {
    return typeof end === 'number' ? (this.points[end] as Point) : end
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame)
    if (now - this.last < FRAME_MS) return
    this.last = now
    if (this.born === 0) this.born = now
    if (this.w === 0 || this.h === 0) return

    const started = performance.now()
    this.draw(now)
    this.sample(performance.now() - started)
  }

  /** The degradation of `MOTION_SPEC` §13: one measurement, one decision, no loop. */
  private sample(ms: number): void {
    if (this.degraded || this.samples.length >= SAMPLE_FRAMES) return
    this.samples.push(ms)
    if (this.samples.length < SAMPLE_FRAMES) return
    this.degraded = true
    if (median(this.samples) <= SLOW_FRAME_MS || this.nodes.length <= SAFE_NODES) return
    this.nodes.length = SAFE_NODES
    this.points.length = SAFE_NODES
    this.pulses.length = 0
  }

  private draw(now: number): void {
    const { ctx, nodes, points, w, h, dark } = this
    const count = nodes.length

    this.form = formationPhase(now - this.born).p
    const center = cloudCenter(this.card, w, h)
    const radii = ellipsoidRadii(w, h, this.collapse)
    const cam = { f: focalLength(w, h), w, h }
    const dx = center.x - w / 2
    const dy = center.y - h / 2
    const armRadius = asteriskRadius(w, h)
    // The ✳ is centered on the console itself (`MOTION_SPEC` §3), not on the damped
    // center the cloud orbits — that is 210px to its left, over the H1.
    const formCenter = this.form > 0 ? cloudCenter(this.card, w, h, 1) : center
    this.rot += rotationStep(this.collapse)

    // The cursor eases toward its target, so the camera never snaps.
    const { mouse } = this
    if (mouse.tx >= 0) {
      if (mouse.x < 0) {
        mouse.x = mouse.tx
        mouse.y = mouse.ty
      }
      mouse.x = lerp(mouse.x, mouse.tx, 0.06)
      mouse.y = lerp(mouse.y, mouse.ty, 0.06)
    }
    const camera = cameraAngles(mouse.x < 0 ? 0.5 : mouse.x, mouse.y < 0 ? 0.5 : mouse.y)
    this.tilt = lerp(this.tilt, camera.tilt, 0.05)
    this.camRot = lerp(this.camRot, camera.rot, 0.05)

    const mx = mouse.x * w
    const my = mouse.y * h
    const hasMouse = mouse.x >= 0 && mouse.y >= 0 && mouse.y <= 1 && this.collapse < 0.5

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    // The collapse fades the whole layer out; every alpha below multiplies into it.
    const base = 1 - this.collapse
    ctx.lineWidth = 1

    for (let i = 0; i < count; i++) {
      const n = nodes[i] as NetNode
      const p = points[i] as Point

      n.theta += n.dTheta * FRAME_MS
      n.phi += n.dPhi * FRAME_MS
      if (Math.abs(n.phi) > 1.4) n.dPhi *= -1

      const point = ellipsoidPoint(this.rot + this.camRot + n.theta, n.phi, {
        rx: radii.rx * n.rad,
        ry: radii.ry * n.rad,
        rz: radii.rz * n.rad,
      })
      point.y += verticalDrift(now, n.phase)
      const projected = projectNode(rotateX(point, this.tilt), cam)
      n.depth = projected.depth
      p.x = projected.x + dx + n.ox
      p.y = projected.y + dy + n.oy

      if (this.form > 0) {
        const target = asteriskTarget(i, count, armRadius)
        p.x = lerp(p.x, formCenter.x + target.x, this.form)
        p.y = lerp(p.y, formCenter.y + target.y, this.form)
      }

      if (hasMouse) {
        const pull = cursorPull(mx - p.x, my - p.y)
        n.ox += pull.x
        n.oy += pull.y
      }
      n.ox *= 0.9
      n.oy *= 0.9
      n.flash *= 0.93
    }

    // Connections.
    ctx.strokeStyle = this.accent
    for (let i = 0; i < count; i++) {
      const a = points[i] as Point
      for (let j = i + 1; j < count; j++) {
        const b = points[j] as Point
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d >= CONNECT_DIST) continue
        const na = nodes[i] as NetNode
        const nb = nodes[j] as NetNode
        let alpha = connectionAlpha(d, Math.min(na.depth, nb.depth), dark)
        if (hasMouse) {
          const md = Math.hypot((a.x + b.x) / 2 - mx, (a.y + b.y) / 2 - my)
          alpha += fade(md, CURSOR_BOOST_DIST) * 0.35
        }
        alpha += Math.max(na.flash, nb.flash) * 0.5
        ctx.globalAlpha = base * Math.min(0.9, alpha)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }

    // The console's four anchors, each wired to the nearest node it can see. Hidden
    // while the ✳ holds: the card has not arrived yet, so there is nothing to wire.
    if (this.form === 0) {
      for (const anchor of this.anchors) {
        const near = nearestPoint(points, anchor.x, anchor.y, ANCHOR_DIST, (i) => this.visible(i))
        if (near < 0) continue
        const p = points[near] as Point
        ctx.globalAlpha =
          base * (0.45 * fade(Math.hypot(p.x - anchor.x, p.y - anchor.y), ANCHOR_DIST) + 0.15)
        ctx.beginPath()
        ctx.moveTo(anchor.x, anchor.y)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
        ctx.fillStyle = this.accent
        ctx.globalAlpha = base * 0.9
        ctx.beginPath()
        ctx.arc(anchor.x, anchor.y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // The cursor node and its violet web.
    if (hasMouse) {
      ctx.strokeStyle = this.violet
      for (let i = 0; i < count; i++) {
        const p = points[i] as Point
        const d = Math.hypot(p.x - mx, p.y - my)
        if (d >= CURSOR_LINK_DIST) continue
        ctx.globalAlpha = base * fade(d, CURSOR_LINK_DIST) * 0.5
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(mx, my)
        ctx.stroke()
      }
      ctx.fillStyle = this.violet
      ctx.globalAlpha = base * 0.9
      ctx.shadowColor = this.violet
      ctx.shadowBlur = 16
      ctx.beginPath()
      ctx.arc(mx, my, 2.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // The nodes themselves, plus the ring of whichever one a command just reached.
    ctx.fillStyle = this.accent
    ctx.strokeStyle = this.accent
    for (let i = 0; i < count; i++) {
      const n = nodes[i] as NetNode
      const p = points[i] as Point
      ctx.globalAlpha = base * nodeAlpha(n.depth, twinkle(now, n.phase), dark)
      ctx.beginPath()
      ctx.arc(p.x, p.y, nodeRadius(n.size, n.depth, n.flash), 0, Math.PI * 2)
      ctx.fill()
      if (n.flash <= 0.02) continue
      ctx.globalAlpha = base * n.flash * 0.8
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(p.x, p.y, n.size + (1 - n.flash) * 22, 0, Math.PI * 2)
      ctx.stroke()
      ctx.lineWidth = 1
    }

    // The commands in flight: a head with a .18 tail, and a flash where it lands.
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i] as LivePulse
      pulse.t += 0.045
      if (pulse.t < 0) continue
      if (pulse.t >= 1) {
        const arrived = this.nodes[pulse.to]
        if (arrived) arrived.flash = 1
        this.pulses.splice(i, 1)
        continue
      }
      const from = this.endpoint(pulse.from)
      const to = this.endpoint(pulse.to)
      if (!from || !to) {
        this.pulses.splice(i, 1)
        continue
      }
      const tail = Math.max(0, pulse.t - 0.18)
      ctx.globalAlpha = base * 0.7
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(lerp(from.x, to.x, tail), lerp(from.y, to.y, tail))
      ctx.lineTo(lerp(from.x, to.x, pulse.t), lerp(from.y, to.y, pulse.t))
      ctx.stroke()
      ctx.lineWidth = 1
      ctx.globalAlpha = base * 0.95
      ctx.shadowColor = this.accent
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(lerp(from.x, to.x, pulse.t), lerp(from.y, to.y, pulse.t), 2.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    ctx.globalAlpha = 1
  }
}

/**
 * Mounts the network on the hero shell, returning its teardown. With
 * `prefers-reduced-motion: reduce` there is no canvas at all — no element, no rAF, no
 * subscriptions — which is why the element is created here and never server-rendered.
 */
export function mountNetwork(
  section: HTMLElement,
  card: HTMLElement,
  rand: () => number = Math.random,
): () => void {
  if (prefersReducedMotion()) return () => {}
  const network = new NodeNetwork(section, card, rand)
  return () => network.destroy()
}
