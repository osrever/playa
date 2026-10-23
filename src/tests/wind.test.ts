import { describe, expect, it } from "vitest";
import { describeWindDirection } from "../services/wind";

describe("describeWindDirection", () => {
  it("identifies Levante from east sectors", () => {
    expect(describeWindDirection(90, 14).family).toBe("levante");
    expect(describeWindDirection(90, 14).label).toContain("Levante");
  });

  it("identifies Poniente from west sectors", () => {
    expect(describeWindDirection(270, 14).family).toBe("poniente");
    expect(describeWindDirection(270, 14).label).toContain("Poniente");
  });

  it("treats very light wind as calm", () => {
    expect(describeWindDirection(90, 4).family).toBe("calma");
  });
});
