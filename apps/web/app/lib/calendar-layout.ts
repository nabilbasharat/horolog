export const CALENDAR_PX_PER_HOUR = 64;
export const CALENDAR_PX_PER_MINUTE = CALENDAR_PX_PER_HOUR / 60;
export const CALENDAR_DAY_HEIGHT = 24 * CALENDAR_PX_PER_HOUR;
export const MIN_EVENT_HEIGHT = 12;

export interface CalendarTimedEvent {
  startTime: Date;
  endTime: Date;
}

export interface PositionedCalendarEvent<TEvent extends CalendarTimedEvent> {
  event: TEvent;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
  visibleStart: Date;
  visibleEnd: Date;
  visibleDurationMinutes: number;
}

interface EventSegment<TEvent extends CalendarTimedEvent>
  extends PositionedCalendarEvent<TEvent> {
  durationHeight: number;
}

/** Clip events to one local day and place them on a shared minute-based scale. */
export function layoutEventsForDay<TEvent extends CalendarTimedEvent>(
  events: readonly TEvent[],
  day: Date,
): PositionedCalendarEvent<TEvent>[] {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const nextDay = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  const dayStartMs = dayStart.getTime();
  const nextDayMs = nextDay.getTime();
  const segments: EventSegment<TEvent>[] = [];

  for (const event of events) {
    const startMs = event.startTime.getTime();
    const endMs = event.endTime.getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;

    const visibleStartMs = Math.max(startMs, dayStartMs);
    const visibleEndMs = Math.min(endMs, nextDayMs);
    if (visibleEndMs <= visibleStartMs) continue;

    const visibleStart = new Date(visibleStartMs);
    const visibleEnd = new Date(visibleEndMs);
    const visibleDurationMinutes = (visibleEndMs - visibleStartMs) / 60_000;
    const minutesSinceMidnight =
      visibleStart.getHours() * 60 +
      visibleStart.getMinutes() +
      visibleStart.getSeconds() / 60 +
      visibleStart.getMilliseconds() / 60_000;
    const durationHeight = visibleDurationMinutes * CALENDAR_PX_PER_MINUTE;

    segments.push({
      event,
      top: minutesSinceMidnight * CALENDAR_PX_PER_MINUTE,
      height: Math.min(
        CALENDAR_DAY_HEIGHT - minutesSinceMidnight * CALENDAR_PX_PER_MINUTE,
        Math.max(MIN_EVENT_HEIGHT, durationHeight),
      ),
      leftPercent: 0,
      widthPercent: 100,
      visibleStart,
      visibleEnd,
      visibleDurationMinutes,
      durationHeight,
    });
  }

  segments.sort((a, b) => a.top - b.top || b.durationHeight - a.durationHeight);

  // Partition overlapping events into side-by-side lanes. Lane placement only
  // changes width; every event keeps the full height of its visible duration.
  const laidOut: EventSegment<TEvent>[] = [];
  let cluster: EventSegment<TEvent>[] = [];
  let clusterEnd = -1;

  const finishCluster = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const lanes = new Map<EventSegment<TEvent>, number>();

    for (const segment of cluster) {
      let lane = laneEnds.findIndex((end) => end <= segment.top);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = segment.top + segment.height;
      lanes.set(segment, lane);
    }

    const widthPercent = 100 / laneEnds.length;
    for (const segment of cluster) {
      segment.leftPercent = (lanes.get(segment) ?? 0) * widthPercent;
      segment.widthPercent = widthPercent;
      laidOut.push(segment);
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const segment of segments) {
    if (cluster.length > 0 && segment.top >= clusterEnd) finishCluster();
    cluster.push(segment);
    clusterEnd = Math.max(clusterEnd, segment.top + segment.height);
  }
  finishCluster();

  return laidOut.map((segment) => ({
    event: segment.event,
    top: segment.top,
    height: segment.height,
    leftPercent: segment.leftPercent,
    widthPercent: segment.widthPercent,
    visibleStart: segment.visibleStart,
    visibleEnd: segment.visibleEnd,
    visibleDurationMinutes: segment.visibleDurationMinutes,
  }));
}
