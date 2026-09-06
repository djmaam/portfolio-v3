import { expect, test } from 'bun:test'

import {
  aboutProgress,
  anchorOffset,
  asteriskRadius,
  asteriskTarget,
  auroraStyle,
  bootDelay,
  cameraAngles,
  cloudCenter,
  collapseFactor,
  commandHopDelay,
  commandPulses,
  connectionAlpha,
  consoleAnchors,
  cursorPull,
  docProgress,
  ellipsoidPoint,
  ellipsoidRadii,
  formationPhase,
  insideCard,
  lerp,
  logWindow,
  median,
  metricsAt,
  nearestPoint,
  nodeAlpha,
  nodeCountFor,
  nodeRadius,
  projectNode,
  revealDelay,
  rotationStep,
  scrambleFrame,
  twinkle,
  typedLength,
  verticalDrift,
  wordOpacity,
} from '../src/lib/motion/math'

test('docProgress is 0 at the top of the document and 1 at the bottom', () => {
  expect(docProgress(0, 5000, 800)).toBe(0)
  expect(docProgress(4200, 5000, 800)).toBe(1)
  expect(docProgress(2100, 5000, 800)).toBeCloseTo(0.5, 10)
})

test('docProgress clamps beyond both ends', () => {
  expect(docProgress(-400, 5000, 800)).toBe(0)
  expect(docProgress(99999, 5000, 800)).toBe(1)
})

test('docProgress returns 0 when the document does not scroll', () => {
  expect(docProgress(0, 800, 800)).toBe(0)
  expect(docProgress(120, 800, 800)).toBe(0)
  // A shorter document than the viewport is the same non-scrolling case.
  expect(docProgress(120, 600, 800)).toBe(0)
})

test('auroraStyle at p=0 is the resting state of MOTION_SPEC §4', () => {
  const s = auroraStyle(0)
  expect(s.filter).toBe('hue-rotate(0deg) saturate(1)')
  expect(s.opacity).toBeCloseTo(0.45, 10)
  expect(s.translateY).toBe('0vh')
})

test('auroraStyle at p=.2 is halfway up the opacity ramp', () => {
  const s = auroraStyle(0.2)
  expect(s.filter).toBe('hue-rotate(52deg) saturate(1.08)')
  expect(s.opacity).toBeCloseTo(0.725, 10)
  expect(s.translateY).toBe('-2.4vh')
})

test('auroraStyle reaches opacity 1 at p=.4 and stays there', () => {
  expect(auroraStyle(0.4).opacity).toBeCloseTo(1, 10)
  expect(auroraStyle(0.4).filter).toBe('hue-rotate(104deg) saturate(1.16)')
  expect(auroraStyle(0.4).translateY).toBe('-4.8vh')
  for (const p of [0.5, 0.75, 1]) expect(auroraStyle(p).opacity).toBeCloseTo(1, 10)
})

test('auroraStyle at p=1 is the full hue rotation of MOTION_SPEC §4', () => {
  const s = auroraStyle(1)
  expect(s.filter).toBe('hue-rotate(260deg) saturate(1.4)')
  expect(s.opacity).toBeCloseTo(1, 10)
  expect(s.translateY).toBe('-12vh')
})

const GLYPHS = '<>/_-=+*#%&{}[]|\\01'
const BRAND = 'Marcos Arrieta'

/** Deterministic stand-in for Math.random: walks [0, 1) in coprime steps. */
const seeded = () => {
  let i = 0
  return () => ((i++ * 7) % 19) / 19
}

test('scrambleFrame keeps the length and the spaces of its target at every progress', () => {
  const spaces = [...BRAND].flatMap((char, index) => (char === ' ' ? [index] : []))
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    const frame = scrambleFrame(BRAND, p, seeded())
    expect(frame).toHaveLength(BRAND.length)
    expect([...frame].flatMap((char, index) => (char === ' ' ? [index] : []))).toEqual(spaces)
  }
})

test('scrambleFrame resolves to its target at p=1 and is all glyphs at p=0', () => {
  expect(scrambleFrame(BRAND, 1, seeded())).toBe(BRAND)
  for (const char of scrambleFrame(BRAND, 0, seeded())) {
    if (char !== ' ') expect(GLYPHS).toInclude(char)
  }
})

test('scrambleFrame resolves exactly floor(p² · len) characters, left to right', () => {
  // `<` is the first glyph of the pool and absent from the target, so with a `rand` that
  // always picks it the resolved prefix is whatever precedes the first `<`.
  const target = 'ORCHESTRATION'
  const first = () => 0
  let previous = -1
  for (let p = 0; p <= 1.0001; p += 0.05) {
    const frame = scrambleFrame(target, p, first)
    const n = Math.floor(p ** 2 * target.length)
    expect(frame.slice(0, n)).toBe(target.slice(0, n))
    expect(frame.slice(n)).toBe('<'.repeat(target.length - n))
    expect(n).toBeGreaterThanOrEqual(previous)
    previous = n
  }
})

test('scrambleFrame defaults to Math.random and stays inside the glyph pool', () => {
  const frame = scrambleFrame('abc', 0)
  expect(frame).toHaveLength(3)
  for (const char of frame) expect(GLYPHS).toInclude(char)
})

test('anchorOffset lands the target below the nav, and never above the document', () => {
  expect(anchorOffset(1200, 64)).toBe(1136)
  expect(anchorOffset(64, 64)).toBe(0)
  // `#top` reports a document top of 0, which is where it must land — never at -64.
  expect(anchorOffset(0, 64)).toBe(0)
  expect(anchorOffset(30, 64)).toBe(0)
})

test('bootDelay staggers the hero 170ms per step after a 500ms wait', () => {
  expect([0, 1, 2, 3, 4].map((n) => bootDelay(n))).toEqual([500, 670, 840, 1010, 1180])
  // The console's slot (issue 06) jumps to n=10, which is the 2200ms of MOTION_SPEC §2.
  expect(bootDelay(10)).toBe(2200)
})

test('typedLength shows nothing before the first character and clamps at the total', () => {
  expect(typedLength(-700, 28, 46)).toBe(0)
  expect(typedLength(0, 28, 46)).toBe(0)
  expect(typedLength(27, 28, 46)).toBe(0)
  expect(typedLength(46 * 28, 28, 46)).toBe(46)
  expect(typedLength(99999, 28, 46)).toBe(46)
})

test('typedLength advances exactly one character per perChar ms', () => {
  for (let n = 0; n <= 46; n++) {
    expect(typedLength(n * 28, 28, 46)).toBe(n)
    expect(typedLength(n * 28 + 27, 28, 46)).toBe(n)
  }
})

test('metricsAt is exactly the three formulas of the mock', () => {
  for (const tick of [0, 1, 6, 11, 12, 66]) {
    expect(metricsAt(tick)).toEqual({
      agents: 3 + (tick % 2),
      specs: 12 + Math.floor(tick / 11),
      shipped: 41 + Math.floor(tick / 6),
    })
  }
  expect(metricsAt(0)).toEqual({ agents: 3, specs: 12, shipped: 41 })
  expect(metricsAt(66)).toEqual({ agents: 3, specs: 18, shipped: 52 })
})

test('the console metrics only ever count up, and agents stays in 3-4', () => {
  let previous = metricsAt(0)
  for (let tick = 0; tick <= 500; tick++) {
    const metrics = metricsAt(tick)
    expect([3, 4]).toContain(metrics.agents)
    expect(metrics.specs).toBeGreaterThanOrEqual(previous.specs)
    expect(metrics.shipped).toBeGreaterThanOrEqual(previous.shipped)
    previous = metrics
  }
})

test('logWindow ships the first six of the cycle as the initial six lines', () => {
  expect(logWindow(6, 11, 6)).toEqual([0, 1, 2, 3, 4, 5])
})

test('logWindow keeps the six most recent lines and wraps the source forever', () => {
  expect(logWindow(7, 11, 6)).toEqual([1, 2, 3, 4, 5, 6])
  expect(logWindow(11, 11, 6)).toEqual([5, 6, 7, 8, 9, 10])
  expect(logWindow(12, 11, 6)).toEqual([6, 7, 8, 9, 10, 0])
  expect(logWindow(17, 11, 6)).toEqual([0, 1, 2, 3, 4, 5])
})

test('logWindow never shows more than six lines, and fills up before it drops any', () => {
  expect(logWindow(0, 11, 6)).toEqual([])
  expect(logWindow(3, 11, 6)).toEqual([0, 1, 2])
  for (let tick = 0; tick <= 200; tick++) {
    const window = logWindow(tick, 11, 6)
    expect(window.length).toBe(Math.min(tick, 6))
    for (const index of window) expect(index).toBeGreaterThanOrEqual(0)
    for (const index of window) expect(index).toBeLessThan(11)
  }
})

// ── Node network (`MOTION_SPEC` §3) ──────────────────────────────────────────

test('ellipsoidPoint puts every point on the surface of the ellipsoid', () => {
  const r = { rx: 560, ry: 384, rz: 400 }
  for (let theta = 0; theta < 6.28; theta += 0.31) {
    for (let phi = -1.4; phi <= 1.4; phi += 0.2) {
      const { x, y, z } = ellipsoidPoint(theta, phi, r)
      expect((x / r.rx) ** 2 + (y / r.ry) ** 2 + (z / r.rz) ** 2).toBeCloseTo(1, 10)
    }
  }
})

test('ellipsoidRadii are the fractions of the viewport of MOTION_SPEC §3', () => {
  expect(ellipsoidRadii(1000, 800, 0)).toEqual({ rx: 560, ry: 384, rz: 400 })
  // Collapse shrinks all three by the same factor, down to 15% of the radius.
  const collapsed = ellipsoidRadii(1000, 800, 1)
  expect(collapsed.rx).toBeCloseTo(84, 10)
  expect(collapsed.ry).toBeCloseTo(57.6, 10)
  expect(collapsed.rz).toBeCloseTo(60, 10)
})

test('projectNode shrinks the scale as z grows, front to back', () => {
  const cam = { f: 900, w: 1000, h: 800 }
  const front = projectNode({ x: 100, y: 50, z: -450 }, cam)
  const middle = projectNode({ x: 100, y: 50, z: 0 }, cam)
  const back = projectNode({ x: 100, y: 50, z: 450 }, cam)

  expect(front.sc).toBeCloseTo(2, 10)
  expect(middle.sc).toBeCloseTo(1, 10)
  expect(back.sc).toBeCloseTo(2 / 3, 10)
  expect(front.sc).toBeGreaterThan(middle.sc)
  expect(middle.sc).toBeGreaterThan(back.sc)
})

test('projectNode places the projection around the center of the camera', () => {
  const cam = { f: 900, w: 1000, h: 800 }
  expect(projectNode({ x: 0, y: 0, z: 0 }, cam)).toMatchObject({ x: 500, y: 400 })
  // At the front the same offset projects further out; at the back, closer in.
  expect(projectNode({ x: 100, y: 50, z: -450 }, cam).x).toBeCloseTo(700, 10)
  expect(projectNode({ x: 100, y: 50, z: 450 }, cam).x).toBeCloseTo(500 + 200 / 3, 10)
})

test('projectNode keeps depth inside [.3, 1] and orders it front to back', () => {
  const cam = { f: 900, w: 1000, h: 800 }
  const depths = [-450, -100, 0, 300, 450, 4000].map(
    (z) => projectNode({ x: 0, y: 0, z }, cam).depth,
  )
  for (const depth of depths) {
    expect(depth).toBeGreaterThanOrEqual(0.3)
    expect(depth).toBeLessThanOrEqual(1)
  }
  expect(depths[0]).toBe(1)
  expect(depths.at(-1)).toBe(0.3)
  for (let i = 1; i < depths.length; i++) {
    expect(depths[i]!).toBeLessThanOrEqual(depths[i - 1]!)
  }
})

test('asteriskTarget spreads the nodes over exactly six arms', () => {
  const angles = new Set<number>()
  for (let i = 0; i < 84; i++) {
    const { x, y } = asteriskTarget(i, 84, 200)
    angles.add(Math.round(Math.atan2(y, x) * 1000))
  }
  expect(angles.size).toBe(6)
})

test('asteriskTarget keeps every node inside the radius', () => {
  for (let i = 0; i < 84; i++) {
    const { x, y } = asteriskTarget(i, 84, 200)
    expect(Math.hypot(x, y)).toBeLessThanOrEqual(200)
    expect(Math.hypot(x, y)).toBeGreaterThan(0)
  }
})

test('asteriskTarget is symmetric about the center', () => {
  // Opposite arms are three spokes apart, at the same distance from the center: the
  // pairing only holds inside a ring of six, which is why it stops at the third spoke.
  for (let i = 0; i < 84 - 3; i++) {
    if (i % 6 >= 3) continue
    const a = asteriskTarget(i, 84, 200)
    const b = asteriskTarget(i + 3, 84, 200)
    expect(a.x + b.x).toBeCloseTo(0, 10)
    expect(a.y + b.y).toBeCloseTo(0, 10)
  }
  // And the whole figure balances: the center of mass sits at the origin.
  let sx = 0
  let sy = 0
  for (let i = 0; i < 84; i++) {
    const { x, y } = asteriskTarget(i, 84, 200)
    sx += x
    sy += y
  }
  expect(sx).toBeCloseTo(0, 8)
  expect(sy).toBeCloseTo(0, 8)
})

test('formationPhase walks idle → forming → holding → dissolving → idle', () => {
  expect(formationPhase(0)).toEqual({ mode: 'idle', p: 0 })
  expect(formationPhase(299)).toEqual({ mode: 'idle', p: 0 })
  expect(formationPhase(300)).toEqual({ mode: 'forming', p: 0 })
  expect(formationPhase(750).mode).toBe('forming')
  expect(formationPhase(750).p).toBeCloseTo(0.5, 10)
  expect(formationPhase(1200)).toEqual({ mode: 'holding', p: 1 })
  expect(formationPhase(1899)).toEqual({ mode: 'holding', p: 1 })
  expect(formationPhase(1900)).toEqual({ mode: 'dissolving', p: 1 })
  expect(formationPhase(2350).mode).toBe('dissolving')
  expect(formationPhase(2350).p).toBeCloseTo(0.5, 10)
  expect(formationPhase(2800)).toEqual({ mode: 'idle', p: 0 })
  expect(formationPhase(99999)).toEqual({ mode: 'idle', p: 0 })
})

test('formationPhase progress never leaves [0, 1] and eases at both ends', () => {
  for (let t = 0; t <= 3200; t += 7) {
    const { p } = formationPhase(t)
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  }
  // Ease-in-out cubic: slow off the start, so the first quarter covers less than a
  // quarter of the distance.
  expect(formationPhase(300 + 225).p).toBeLessThan(0.25)
})

test('connectionAlpha fades to nothing at 150px and peaks at zero distance', () => {
  expect(connectionAlpha(150, 1, true)).toBe(0)
  expect(connectionAlpha(400, 1, true)).toBe(0)
  expect(connectionAlpha(0, 1, true)).toBeCloseTo(0.22, 10)
  expect(connectionAlpha(75, 1, true)).toBeCloseTo(0.11, 10)
})

test('connectionAlpha is stronger in light than in dark, and scales with depth', () => {
  for (const dist of [0, 40, 100, 149]) {
    expect(connectionAlpha(dist, 1, false)).toBeGreaterThan(connectionAlpha(dist, 1, true))
  }
  expect(connectionAlpha(0, 0.5, true)).toBeCloseTo(0.11, 10)
})

test('collapseFactor is 0 at the top, 1 at three quarters of a viewport, clamped', () => {
  expect(collapseFactor(0, 800)).toBe(0)
  expect(collapseFactor(600, 800)).toBe(1)
  expect(collapseFactor(300, 800)).toBeCloseTo(0.5, 10)
  expect(collapseFactor(4000, 800)).toBe(1)
  expect(collapseFactor(-200, 800)).toBe(0)
  // A viewport of zero height cannot be scrolled through: no collapse, no division.
  expect(collapseFactor(120, 0)).toBe(0)
})

test('commandHopDelay staggers each hop by .55', () => {
  expect(commandHopDelay(0)).toBeCloseTo(-0.55, 10)
  expect(commandHopDelay(1)).toBeCloseTo(-1.1, 10)
  expect(commandHopDelay(2)).toBeCloseTo(-1.65, 10)
  for (let hop = 0; hop < 8; hop++) {
    expect(commandHopDelay(hop)).toBeCloseTo(-(hop + 1) * 0.55, 10)
  }
})

test('nodeCountFor drops to the mobile count under 720px', () => {
  expect(nodeCountFor(1440)).toBe(84)
  expect(nodeCountFor(720)).toBe(84)
  expect(nodeCountFor(719)).toBe(48)
  expect(nodeCountFor(600)).toBe(48)
})

/** A row of points 100px apart: every node is within 150px of its neighbors only. */
const chain = (count: number, gap = 100) =>
  Array.from({ length: count }, (_, i) => ({ x: i * gap, y: 0 }))

test('commandPulses walks at most three hops out from the start', () => {
  const pulses = commandPulses(chain(20), 0)
  expect(pulses).toHaveLength(3)
  expect(pulses.map((pulse) => pulse.to)).toEqual([1, 2, 3])
  expect(pulses.map((pulse) => pulse.delay)).toEqual([
    commandHopDelay(0),
    commandHopDelay(1),
    commandHopDelay(2),
  ])
})

test('commandPulses never visits a node twice', () => {
  // A dense cluster: everything is within reach of everything else.
  const points = Array.from({ length: 12 }, (_, i) => ({
    x: (i % 4) * 20,
    y: Math.floor(i / 4) * 20,
  }))
  const pulses = commandPulses(points, 5)
  const visited = pulses.map((pulse) => pulse.to)
  expect(new Set(visited).size).toBe(visited.length)
  expect(visited).not.toContain(5)
})

test('commandPulses terminates on a disconnected graph', () => {
  expect(
    commandPulses(
      [
        { x: 0, y: 0 },
        { x: 900, y: 900 },
      ],
      0,
    ),
  ).toEqual([])
  expect(commandPulses([{ x: 0, y: 0 }], 0)).toEqual([])
  expect(commandPulses([], 0)).toEqual([])
})

test('commandPulses stops at the pulse budget', () => {
  const grid = Array.from({ length: 200 }, (_, i) => ({
    x: (i % 20) * 10,
    y: Math.floor(i / 20) * 10,
  }))
  expect(commandPulses(grid, 0).length).toBeLessThanOrEqual(40)
})

test('nearestPoint finds the closest point inside the radius, or nothing', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 90, y: 0 },
  ]
  expect(nearestPoint(points, 100, 0, 280)).toBe(2)
  expect(nearestPoint(points, 100, 0, 5)).toBe(-1)
  expect(nearestPoint([], 0, 0, 280)).toBe(-1)
  // The filter skips candidates the caller cannot use — occluded or too far back.
  expect(nearestPoint(points, 100, 0, 280, (i) => i !== 2)).toBe(1)
})

test('consoleAnchors sits on the four edges of the card of MOTION_SPEC §3', () => {
  expect(consoleAnchors({ left: 100, top: 200, width: 400, height: 300 })).toEqual([
    { x: 100, y: 275 },
    { x: 100, y: 386 },
    { x: 300, y: 500 },
    { x: 220, y: 200 },
  ])
})

test('insideCard covers the card plus its 10px margin', () => {
  const rect = { left: 100, top: 200, width: 400, height: 300 }
  expect(insideCard(300, 350, rect)).toBe(true)
  expect(insideCard(95, 350, rect)).toBe(true)
  expect(insideCard(85, 350, rect)).toBe(false)
  expect(insideCard(300, 511, rect)).toBe(false)
  expect(insideCard(300, 350, null)).toBe(false)
})

test('cloudCenter pulls the cloud a third of the way toward the console', () => {
  const rect = { left: 600, top: 100, width: 400, height: 300 }
  const center = cloudCenter(rect, 1000, 800)
  expect(center.x).toBeCloseTo(500 + (800 - 500) * 0.35, 10)
  expect(center.y).toBeCloseTo(240, 10)
  // No console — before the first measure — keeps the cloud where the design puts it.
  expect(cloudCenter(null, 1000, 800)).toEqual({ x: 640, y: 360 })
})

test('cursorPull attracts toward the cursor and dies at 200px', () => {
  expect(cursorPull(0, 0)).toEqual({ x: 0, y: 0 })
  expect(cursorPull(200, 0)).toEqual({ x: 0, y: 0 })
  expect(cursorPull(100, 0).x).toBeCloseTo(0.7, 10)
  expect(cursorPull(100, 0).y).toBe(0)
  // Direction only depends on the sign, magnitude only on the distance.
  expect(cursorPull(-100, 0).x).toBeCloseTo(-0.7, 10)
  const diagonal = cursorPull(60, 80)
  expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(0.7, 10)
})

test('cameraAngles stay inside the ±.25 tilt and ±.15 rotation of MOTION_SPEC §3', () => {
  expect(cameraAngles(0.5, 0.5).tilt).toBeCloseTo(0, 10)
  expect(cameraAngles(0.5, 0.5).rot).toBeCloseTo(0, 10)
  expect(cameraAngles(0, 0).tilt).toBeCloseTo(0.25, 10)
  expect(cameraAngles(1, 1).tilt).toBeCloseTo(-0.25, 10)
  expect(cameraAngles(0, 0).rot).toBeCloseTo(-0.15, 10)
  expect(cameraAngles(1, 1).rot).toBeCloseTo(0.15, 10)
})

test('rotationStep speeds the rotation up as the network collapses', () => {
  expect(rotationStep(0)).toBeCloseTo(0.00003 * 24, 12)
  expect(rotationStep(1)).toBeCloseTo(0.00003 * 24 * 6, 12)
  expect(rotationStep(0.5)).toBeGreaterThan(rotationStep(0))
})

test('median is the middle sample of the degradation window', () => {
  expect(median([5])).toBe(5)
  expect(median([9, 1, 5])).toBe(5)
  expect(median([4, 1, 3, 2])).toBe(2.5)
  expect(median([])).toBe(0)
})

test('lerp walks from a to b and keeps going past both ends', () => {
  expect(lerp(10, 20, 0)).toBe(10)
  expect(lerp(10, 20, 1)).toBe(20)
  expect(lerp(10, 20, 0.25)).toBeCloseTo(12.5, 10)
})

test('verticalDrift is the ±9px bob of MOTION_SPEC §3', () => {
  expect(verticalDrift(0, 0)).toBeCloseTo(0, 10)
  expect(verticalDrift(Math.PI * 500, 0)).toBeCloseTo(9, 10)
  for (let t = 0; t < 20000; t += 137) {
    expect(Math.abs(verticalDrift(t, 1.7))).toBeLessThanOrEqual(9)
  }
})

test('twinkle stays between .1 and 1, and the phase offsets it', () => {
  for (let t = 0; t < 20000; t += 137) {
    const value = twinkle(t, 0.4)
    expect(value).toBeGreaterThanOrEqual(0.1)
    expect(value).toBeLessThanOrEqual(1)
  }
  expect(twinkle(0, 0)).toBeCloseTo(0.55, 10)
  expect(twinkle(0, Math.PI / 2)).toBeCloseTo(1, 10)
})

test('nodeRadius grows with the depth and with the flash', () => {
  expect(nodeRadius(2, 1, 0)).toBeCloseTo(3, 10)
  expect(nodeRadius(2, 0.3, 0)).toBeCloseTo(1.6, 10)
  expect(nodeRadius(2, 1, 1)).toBeCloseTo(5, 10)
  expect(nodeRadius(2, 0.3, 0)).toBeLessThan(nodeRadius(2, 1, 0))
})

test('nodeAlpha dims with the depth and is stronger in dark', () => {
  expect(nodeAlpha(1, 1, true)).toBeCloseTo(0.9, 10)
  expect(nodeAlpha(1, 1, false)).toBeCloseTo(0.8, 10)
  expect(nodeAlpha(0.3, 1, true)).toBeLessThan(nodeAlpha(1, 1, true))
  expect(nodeAlpha(1, 0.1, true)).toBeLessThan(nodeAlpha(1, 1, true))
})

test('asteriskRadius is 26% of the shorter side of the canvas', () => {
  expect(asteriskRadius(1000, 800)).toBeCloseTo(208, 10)
  expect(asteriskRadius(600, 900)).toBeCloseTo(156, 10)
})

// ── About (`MOTION_SPEC` §6) ─────────────────────────────────────────────────

test('aboutProgress is 0 below the trigger and 1 once the lead has risen past it', () => {
  // The ramp runs from `top = .8·vh` down to `top = .35·vh`, i.e. over .45 viewports.
  expect(aboutProgress(800, 1000)).toBe(0)
  expect(aboutProgress(801, 1000)).toBe(0)
  expect(aboutProgress(350, 1000)).toBe(1)
  expect(aboutProgress(575, 1000)).toBeCloseTo(0.5, 10)
})

test('aboutProgress clamps beyond both ends', () => {
  expect(aboutProgress(4000, 1000)).toBe(0)
  expect(aboutProgress(-4000, 1000)).toBe(1)
  // A viewport of no height has no ramp, so it reports 0 instead of dividing by zero.
  expect(aboutProgress(0, 0)).toBe(0)
})

test('wordOpacity rests at .16 before the lead is reached', () => {
  for (let i = 0; i < 12; i++) expect(wordOpacity(i, 12, 0)).toBe(0.16)
})

test('wordOpacity lights the first word as soon as p·(N+3) reaches 1', () => {
  const total = 12
  expect(wordOpacity(0, total, 1 / (total + 3))).toBeCloseTo(1, 10)
  expect(wordOpacity(0, total, 0.5 / (total + 3))).toBeCloseTo(0.5, 10)
})

test('wordOpacity carries the +3 lead-in, so the last word is lit before p reaches 1', () => {
  const total = 12
  // At p = 1 the ramp has run (N+3) - (N-1) = 4 words past the end of the sentence.
  expect(wordOpacity(total - 1, total, 1)).toBe(1)
  // The +3 is what makes the last word arrive early: without it, it would need p = 1.
  expect(wordOpacity(total - 1, total, (total - 1) / (total + 3))).toBe(0.16)
  expect(wordOpacity(total - 1, total, total / (total + 3))).toBeCloseTo(1, 10)
})

test('wordOpacity clamps at both ends and lights the words left to right', () => {
  const total = 12
  const p = 0.4
  const values = Array.from({ length: total }, (_, i) => wordOpacity(i, total, p))
  for (const value of values) {
    expect(value).toBeGreaterThanOrEqual(0.16)
    expect(value).toBeLessThanOrEqual(1)
  }
  for (let i = 1; i < total; i++) {
    expect(values[i]!).toBeLessThanOrEqual(values[i - 1]!)
  }
})

test('revealDelay staggers 110ms per index', () => {
  expect(revealDelay(0)).toBe(0)
  expect(revealDelay(1)).toBe(110)
  expect(revealDelay(2)).toBe(220)
})
