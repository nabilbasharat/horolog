import assert from "node:assert/strict"
import test from "node:test"
import { CALENDAR_PX_PER_HOUR } from "../app/lib/calendar-layout"
import {
  getNowIndicatorPosition,
  NOW_UPDATE_INTERVAL_MS,
  subscribeToMinuteUpdates,
} from "../app/lib/calendar-now"

const today = new Date(2026, 8, 29, 0, 0)

test("the now line is available only for the selected local day that is today", () => {
  const now = new Date(2026, 8, 29, 12, 47)
  assert.deepEqual(getNowIndicatorPosition(today, now), {
    top: (12 * 60 + 47) * (CALENDAR_PX_PER_HOUR / 60),
    label: "12:47",
  })
  assert.equal(getNowIndicatorPosition(new Date(2026, 8, 28), now), null)
  assert.equal(getNowIndicatorPosition(new Date(2026, 8, 30), now), null)
})

test("the now line uses the same minute scale at whole and half hours", () => {
  const onTheHour = getNowIndicatorPosition(today, new Date(2026, 8, 29, 9, 0))
  const halfPast = getNowIndicatorPosition(today, new Date(2026, 8, 29, 9, 30))

  assert.equal(onTheHour?.top, 9 * CALENDAR_PX_PER_HOUR)
  assert.equal(halfPast?.top, 9.5 * CALENDAR_PX_PER_HOUR)
})

test("a minute refresh recalculates the position and label when the clock changes", () => {
  let now = new Date(2026, 8, 29, 9, 0)
  let scheduledUpdate: (() => void) | undefined
  let scheduledDelay = 0
  const intervalHandle = {} as ReturnType<typeof globalThis.setInterval>
  let clearedHandle: ReturnType<typeof globalThis.setInterval> | undefined

  const getCurrentPosition = () => getNowIndicatorPosition(today, now)
  const unsubscribe = subscribeToMinuteUpdates(
    () => {
      now = new Date(2026, 8, 29, 9, 1)
    },
    (callback, delay) => {
      scheduledUpdate = callback
      scheduledDelay = delay
      return intervalHandle
    },
    (handle) => {
      clearedHandle = handle
    },
  )

  const beforeUpdate = getCurrentPosition()
  assert.equal(scheduledDelay, NOW_UPDATE_INTERVAL_MS)
  scheduledUpdate?.()
  const afterUpdate = getCurrentPosition()

  assert.ok(beforeUpdate)
  assert.ok(afterUpdate)
  assert.equal(beforeUpdate.label, "09:00")
  assert.equal(afterUpdate.label, "09:01")
  assert.equal(afterUpdate.top, (9 * 60 + 1) * (CALENDAR_PX_PER_HOUR / 60))

  unsubscribe()
  assert.equal(clearedHandle, intervalHandle)
})
