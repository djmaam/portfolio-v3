import { consoleLog } from '../content'
import { prefersReducedMotion } from './reduced'

export type LogLine = { key: string; value: string }

type Subscriber = (line: LogLine) => void

/**
 * Lines the console shows at once, and therefore the number the server renders: the
 * cycle picks up right after them (`MOTION_SPEC` §2).
 */
export const MAX_LINES = 6

/** One new line every 1400ms (`MOTION_SPEC` §2). */
export const INTERVAL_MS = 1400

const subscribers = new Set<Subscriber>()
let cursor = MAX_LINES
let timer: ReturnType<typeof setInterval> | undefined

function tick() {
  const [key, value] = consoleLog[cursor % consoleLog.length] as [string, string]
  cursor++
  for (const fn of subscribers) fn({ key, value })
}

/**
 * Registers a subscriber for each new log line and returns its unsubscribe — the same
 * shape as `onScroll`, and the hook issue 07 uses to pulse the node network. The timer
 * starts with the first subscription and stops with the last one, so a console that
 * nobody watches costs nothing.
 *
 * The cursor resets on every fresh start, since the six lines already in the markup are
 * what the cycle continues from. With `prefers-reduced-motion: reduce` nothing is
 * scheduled and the subscriber never runs: the six static lines are the whole console.
 */
export function onLogLine(fn: Subscriber): () => void {
  if (prefersReducedMotion()) return () => {}

  if (subscribers.size === 0) {
    cursor = MAX_LINES
    timer = setInterval(tick, INTERVAL_MS)
  }
  subscribers.add(fn)

  return () => {
    subscribers.delete(fn)
    if (subscribers.size > 0) return
    clearInterval(timer)
    timer = undefined
  }
}
