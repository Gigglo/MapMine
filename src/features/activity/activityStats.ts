import type { Day } from "../../database/repository";
import { precedingDay } from "../exploration/engine";

export const activityPeriods = {
  Daily: { days: 1, bucketDays: 1 },
  Weekly: { days: 7, bucketDays: 1 },
  "30 days": { days: 30, bucketDays: 5 },
  "90 days": { days: 90, bucketDays: 10 },
} as const;

export type ActivityPeriod = keyof typeof activityPeriods;

export function activityWindow(today: string, period: ActivityPeriod, pagesBack: number) {
  const { days, bucketDays } = activityPeriods[period];
  const end = precedingDay(today, pagesBack * days);
  return { start: precedingDay(end, days - 1), end, days, bucketDays };
}

export function summarizeActivity(rows: readonly Day[], window: ReturnType<typeof activityWindow>) {
  const byDay = new Map(rows.map(row => [row.day, row]));
  const { end, days, bucketDays } = window;
  const totals = { meters: 0, seconds: 0, area: 0 };
  const buckets = Array.from({ length: Math.ceil(days / bucketDays) }, (_, index) => {
    const offset = index * bucketDays;
    const first = precedingDay(end, days - 1 - offset);
    const last = precedingDay(end, Math.max(0, days - offset - bucketDays));
    let meters = 0;
    let area = 0;
    for (let dayOffset = offset; dayOffset < Math.min(days, offset + bucketDays); dayOffset++) {
      const row = byDay.get(precedingDay(end, days - 1 - dayOffset));
      if (!row) continue;
      meters += row.meters;
      area += row.area;
      totals.seconds += row.seconds;
    }
    totals.meters += meters;
    totals.area += area;
    return { first, last, meters, area };
  });
  return { totals, buckets };
}
