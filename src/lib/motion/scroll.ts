import { docProgress } from './math'
import { prefersReducedMotion } from './reduced'

export type ScrollState = { scrollY: number; vh: number; progress: number }

type Subscriber = (state: ScrollState) => void

/**
 * The site's only scroll listener. Everything that reacts to scroll subscribes here:
 * one event listener, one rAF, one layout read per frame, shared by every subscriber
 * (`MOTION_SPEC` §13). Adding a second `scroll` listener anywhere else is a bug.
 */
const subscribers = new Set<Subscriber>()
let frame = 0

function tick() {
  frame = 0
  const { scrollY, innerHeight: vh } = window
  // Read once, hand the same object to everyone: no subscriber needs to measure again.
  const state: ScrollState = {
    scrollY,
    vh,
    progress: docProgress(scrollY, document.documentElement.scrollHeight, vh),
  }
  for (const fn of subscribers) fn(state)
}

/** The event only raises a flag; the frame does the work, so a burst collapses into one. */
function schedule() {
  if (frame === 0) frame = window.requestAnimationFrame(tick)
}

/**
 * Registers a subscriber and returns its unsubscribe. The listener attaches with the
 * first subscription and detaches with the last one. With `prefers-reduced-motion:
 * reduce` nothing is attached and the subscriber never runs — scroll-driven motion is
 * decoration, so the page simply keeps its resting state.
 */
export function onScroll(fn: Subscriber): () => void {
  if (prefersReducedMotion()) return () => {}

  if (subscribers.size === 0) {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
  }
  subscribers.add(fn)
  schedule() // First frame: subscribers start from the real scroll position, not from 0.

  return () => {
    subscribers.delete(fn)
    if (subscribers.size > 0) return
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    if (frame !== 0) {
      window.cancelAnimationFrame(frame)
      frame = 0
    }
  }
}
