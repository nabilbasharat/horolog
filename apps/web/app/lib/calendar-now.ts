import { CALENDAR_PX_PER_MINUTE } from "./calendar-layout"

export const NOW_UPDATE_INTERVAL_MS = 60_000

export interface NowIndicatorPosition {
  top: number
  label: string
}

type IntervalHandle = ReturnType<typeof globalThis.setInterval>
type IntervalScheduler = (callback: () => void, delay: number) => IntervalHandle
type IntervalCanceller = (handle: IntervalHandle) => void

/** Return the current-time line position when the selected local day is today. */
export function getNowIndicatorPosition(day: Date, now: Date): NowIndicatorPosition | null {
  if (!Number.isFinite(day.getTime()) || !Number.isFinite(now.getTime())) return null

  const isSameLocalDay =
    day.getFullYear() === now.getFullYear() &&
    day.getMonth() === now.getMonth() &&
    day.getDate() === now.getDate()
  if (!isSameLocalDay) return null

  const minutesSinceMidnight =
    now.getHours() * 60 +
    now.getMinutes() +
    now.getSeconds() / 60 +
    now.getMilliseconds() / 60_000

  return {
    top: minutesSinceMidnight * CALENDAR_PX_PER_MINUTE,
    label: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
  }
}

/** Refresh the displayed clock once per minute and return an unsubscriber. */
export function subscribeToMinuteUpdates(
  onUpdate: () => void,
  schedule: IntervalScheduler = globalThis.setInterval,
  cancel: IntervalCanceller = globalThis.clearInterval,
): () => void {
  const interval = schedule(onUpdate, NOW_UPDATE_INTERVAL_MS)
  return () => cancel(interval)
}
