import { expect, test } from 'bun:test'

import { auroraStyle, docProgress } from '../src/lib/motion/math'

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
