import { describe, expect, it } from "vitest";
import { describeUv, evaluateInterval, groupIntervals, selectBestSlot } from "../services/recommendationEngine";
import type { TideExtreme, WeatherHour } from "../types/domain";

const tides: TideExtreme[] = [
  { time: "2026-08-15T06:00:00", heightMeters: 3, type: "high" },
  { time: "2026-08-15T12:00:00", heightMeters: 0.5, type: "low" },
  { time: "2026-08-15T18:00:00", heightMeters: 3.1, type: "high" },
  { time: "2026-08-15T23:45:00", heightMeters: 0.7, type: "low" },
];

function weather(time: string, overrides: Partial<WeatherHour> = {}): WeatherHour {
  return {
    time,
    airTemperatureC: 27,
    apparentTemperatureC: 28,
    relativeHumidityPercent: 66,
    windSpeedKmh: 8,
    windDirectionDeg: 240,
    windGustKmh: 14,
    cloudCoverPercent: 10,
    precipitationMm: 0,
    precipitationProbabilityPercent: 0,
    skyState: "Despejado",
    ...overrides,
  };
}

describe("recommendation engine", () => {
  it("penalizes perfect weather with low tide", () => {
    const interval = evaluateInterval("2026-08-15T12:00:00", tides, [weather("2026-08-15T12:00:00")]);
    expect(interval.hardConstraints).toContain("Marea extremadamente baja");
    expect(interval.rating).toBe("poor");
  });

  it("rejects a falling tide approaching low tide even when weather is good", () => {
    const interval = evaluateInterval("2026-08-15T09:00:00", tides, [weather("2026-08-15T09:00:00")]);
    expect(interval.hardConstraints).toContain("Marea bajando demasiado hacia bajamar");
    expect(interval.rating).toBe("poor");
  });

  it("penalizes cold temperature even with useful tide", () => {
    const interval = evaluateInterval("2026-08-15T09:30:00", tides, [weather("2026-08-15T09:00:00", { airTemperatureC: 19, apparentTemperatureC: 18 })]);
    expect(interval.score).toBeLessThan(70);
  });

  it("explains humidity together with apparent temperature", () => {
    const interval = evaluateInterval(
      "2026-08-15T17:30:00",
      tides,
      [weather("2026-08-15T18:00:00", { airTemperatureC: 30, apparentTemperatureC: 35, relativeHumidityPercent: 89 })]
    );
    expect(interval.reasons).toContain("30 °C, sensación 35 °C, humedad 89 %");
  });

  it("applies hard constraints for excessive wind", () => {
    const interval = evaluateInterval("2026-08-15T17:30:00", tides, [weather("2026-08-15T18:00:00", { windSpeedKmh: 42 })]);
    expect(interval.hardConstraints).toContain("Viento excesivo");
    expect(interval.score).toBeLessThanOrEqual(39);
  });

  it("adds a human UV warning without making it a hard constraint", () => {
    const interval = evaluateInterval("2026-08-15T17:30:00", tides, [weather("2026-08-15T18:00:00", { uvIndex: 9 })]);
    expect(interval.reasons).toContain("UV 9 muy alto: crema, gorra y sombra");
    expect(interval.hardConstraints).not.toContain("UV 9 muy alto: crema, gorra y sombra");
  });

  it("describes extreme UV clearly", () => {
    expect(describeUv(11)).toBe("UV 11 extremo: evita sol directo prolongado");
  });

  it("keeps UV informational instead of changing bathing score", () => {
    const withoutUv = evaluateInterval("2026-08-15T17:30:00", tides, [weather("2026-08-15T18:00:00", { uvIndex: null })]);
    const withHighUv = evaluateInterval("2026-08-15T17:30:00", tides, [weather("2026-08-15T18:00:00", { uvIndex: 10 })]);
    expect(withHighUv.score).toBe(withoutUv.score);
  });

  it("groups consecutive similar intervals", () => {
    const intervals = ["2026-08-15T16:00:00", "2026-08-15T16:30:00", "2026-08-15T17:00:00"].map((time) =>
      evaluateInterval(time, tides, [weather(time)])
    );
    expect(groupIntervals(intervals)).toHaveLength(1);
  });

  it("prefers a stable long best slot over a short peak", () => {
    const intervals = ["2026-08-15T15:00:00", "2026-08-15T15:30:00", "2026-08-15T16:00:00", "2026-08-15T16:30:00"].map((time) =>
      evaluateInterval(time, tides, [weather(time)])
    );
    const best = selectBestSlot(groupIntervals(intervals));
    expect(best?.durationMinutes).toBeGreaterThanOrEqual(60);
  });
});
