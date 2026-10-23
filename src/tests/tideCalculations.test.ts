import { describe, expect, it } from "vitest";
import { estimateTideAt } from "../services/tideCalculations";
import type { TideExtreme } from "../types/domain";

const extremes: TideExtreme[] = [
  { time: "2026-08-15T09:00:00", heightMeters: 3, type: "high" },
  { time: "2026-08-15T12:00:00", heightMeters: 0.5, type: "low" },
  { time: "2026-08-15T18:00:00", heightMeters: 3.1, type: "high" },
];

describe("estimateTideAt", () => {
  it("returns 100% at high tide exactly at 09:00", () => {
    const sample = estimateTideAt("2026-08-15T09:00:00", extremes);
    expect(sample?.percentage).toBe(100);
    expect(sample?.trend).toBe("falling");
  });

  it("returns 0% at low tide at noon", () => {
    const sample = estimateTideAt("2026-08-15T12:00:00", extremes);
    expect(sample?.percentage).toBe(0);
    expect(sample?.trend).toBe("rising");
  });

  it("uses a cosine curve around the 50% crossing", () => {
    const sample = estimateTideAt("2026-08-15T15:00:00", extremes);
    expect(sample?.percentage).toBeGreaterThan(49);
    expect(sample?.percentage).toBeLessThan(51);
    expect(sample?.trend).toBe("rising");
  });
});
