import { describe, expect, it } from "vitest";
import { addMinutes } from "../services/time";

describe("time helpers", () => {
  it("adds minutes without converting the displayed local time to UTC", () => {
    expect(addMinutes("2026-08-15T09:00:00", 30)).toBe("2026-08-15T09:30:00");
    expect(addMinutes("2026-08-15T20:30:00", 30)).toBe("2026-08-15T21:00:00");
  });

  it("handles crossing midnight while keeping local wall-clock time", () => {
    expect(addMinutes("2026-08-15T23:45:00", 30)).toBe("2026-08-16T00:15:00");
  });
});
