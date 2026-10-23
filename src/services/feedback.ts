import type { BathingSlot, FeedbackValue, StoredFeedback } from "../types/domain";

const FEEDBACK_KEY = "sanlucarBathingFeedback";

export function saveFeedback(date: string, slot: BathingSlot, value: FeedbackValue) {
  const existing = readFeedback();
  const feedback: StoredFeedback = {
    id: `${date}:${slot.startTime}:${slot.endTime}:${Date.now()}`,
    date,
    slotStart: slot.startTime,
    slotEnd: slot.endTime,
    score: slot.averageScore,
    value,
    createdAt: new Date().toISOString(),
    conditions: {
      rating: slot.rating,
      averageTidePercentage: average(slot.intervals.map((interval) => interval.tide?.percentage ?? null)),
      averageTemperatureC: average(slot.intervals.map((interval) => interval.weather?.airTemperatureC ?? null)),
      averageWindKmh: average(slot.intervals.map((interval) => interval.weather?.windSpeedKmh ?? null)),
    },
  };
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify([feedback, ...existing].slice(0, 200)));
  return feedback;
}

export function readFeedback(): StoredFeedback[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? (JSON.parse(raw) as StoredFeedback[]) : [];
  } catch {
    return [];
  }
}

function average(values: Array<number | null>) {
  const numeric = values.filter((value): value is number => typeof value === "number");
  if (!numeric.length) return null;
  return Math.round((numeric.reduce((sum, value) => sum + value, 0) / numeric.length) * 10) / 10;
}
