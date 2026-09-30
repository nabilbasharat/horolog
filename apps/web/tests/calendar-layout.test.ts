import assert from "node:assert/strict"
import test from "node:test"
import {
  CALENDAR_PX_PER_HOUR,
  layoutEventsForDay,
  type CalendarTimedEvent,
} from "../app/lib/calendar-layout"

const YEAR = 2026
const MONTH = 8
const DAY = 29
const visibleDay = new Date(YEAR, MONTH, DAY)

function timedEvent(
  id: string,
  hour: number,
  minute: number,
  durationMinutes: number,
): CalendarTimedEvent & { id: string } {
  const startTime = new Date(YEAR, MONTH, DAY, hour, minute)
  return {
    id,
    startTime,
    endTime: new Date(startTime.getTime() + durationMinutes * 60_000),
  }
}

test("event height follows its full duration on the hour scale", () => {
  const durations = [15, 45, 60, 180, 390]

  for (const durationMinutes of durations) {
    const [positioned] = layoutEventsForDay(
      [timedEvent(`duration-${durationMinutes}`, 9, 0, durationMinutes)],
      visibleDay,
    )

    assert.ok(positioned)
    assert.equal(
      positioned.height,
      (durationMinutes / 60) * CALENDAR_PX_PER_HOUR,
      `${durationMinutes} minutes should use the matching fraction of the hour scale`,
    )
  }
})

test("partial-hour start position and duration use the same minute scale", () => {
  const [positioned] = layoutEventsForDay([timedEvent("partial-hour", 7, 30, 45)], visibleDay)

  assert.ok(positioned)
  assert.equal(positioned.top, 7.5 * CALENDAR_PX_PER_HOUR)
  assert.equal(positioned.height, 0.75 * CALENDAR_PX_PER_HOUR)
})

test("an overnight event is clipped to the visible portion of each day", () => {
  const overnight = timedEvent("overnight", 22, 0, 4 * 60)
  const nextDay = new Date(YEAR, MONTH, DAY + 1)
  const firstDaySegment = layoutEventsForDay([overnight], visibleDay)[0]
  const nextDaySegment = layoutEventsForDay([overnight], nextDay)[0]

  assert.ok(firstDaySegment)
  assert.ok(nextDaySegment)
  assert.equal(firstDaySegment.top, 22 * CALENDAR_PX_PER_HOUR)
  assert.equal(firstDaySegment.height, 2 * CALENDAR_PX_PER_HOUR)
  assert.equal(firstDaySegment.visibleEnd.getHours(), 0)
  assert.equal(nextDaySegment.top, 0)
  assert.equal(nextDaySegment.height, 2 * CALENDAR_PX_PER_HOUR)
  assert.equal(nextDaySegment.visibleStart.getHours(), 0)
})

test("a short event near midnight does not extend beyond the visible day", () => {
  const [positioned] = layoutEventsForDay([timedEvent("last-minute", 23, 59, 1)], visibleDay)

  assert.ok(positioned)
  assert.ok(positioned.top + positioned.height <= 24 * CALENDAR_PX_PER_HOUR)
})

test("overlapping events keep their full heights and use separate horizontal lanes", () => {
  const events = [timedEvent("long", 9, 0, 180), timedEvent("short", 10, 0, 60)]
  const positioned = layoutEventsForDay(events, visibleDay)
  const long = positioned.find((item) => item.event.id === "long")
  const short = positioned.find((item) => item.event.id === "short")

  assert.ok(long)
  assert.ok(short)
  assert.equal(long.height, 3 * CALENDAR_PX_PER_HOUR)
  assert.equal(short.height, CALENDAR_PX_PER_HOUR)
  assert.equal(long.widthPercent, 50)
  assert.equal(short.widthPercent, 50)
})
