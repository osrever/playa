import type { TideExtreme, TideSample } from "../types/domain";
import { minutesBetween } from "./time";

export function sortExtremes(extremes: TideExtreme[]) {
  return [...extremes].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

export function estimateTideAt(time: string, extremes: TideExtreme[]): TideSample | null {
  const sorted = sortExtremes(extremes);
  const target = new Date(time).getTime();
  const previous = [...sorted].reverse().find((extreme) => new Date(extreme.time).getTime() <= target);
  const next = sorted.find((extreme) => new Date(extreme.time).getTime() > target);

  if (!previous || !next || previous.type === next.type) return null;

  const startMs = new Date(previous.time).getTime();
  const endMs = new Date(next.time).getTime();
  const progress = Math.min(1, Math.max(0, (target - startMs) / (endMs - startMs)));
  const eased = (1 - Math.cos(Math.PI * progress)) / 2;
  const height = previous.heightMeters + (next.heightMeters - previous.heightMeters) * eased;
  const rising = previous.type === "low" && next.type === "high";
  const low = rising ? previous.heightMeters : next.heightMeters;
  const high = rising ? next.heightMeters : previous.heightMeters;
  const span = Math.max(0.01, high - low);
  const percentage = Math.min(100, Math.max(0, ((height - low) / span) * 100));

  return {
    time,
    percentage,
    estimatedHeightMeters: height,
    trend: rising ? "rising" : "falling",
    tidalRangeMeters: span,
    nextExtreme: next,
    minutesToNextExtreme: minutesBetween(time, next.time),
  };
}
