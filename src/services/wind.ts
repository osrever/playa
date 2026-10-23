export type WindFamily = "calma" | "levante" | "poniente" | "norte" | "sur" | "variable";

export function describeWindDirection(degrees: number | null | undefined, speedKmh?: number | null) {
  if (speedKmh !== undefined && speedKmh !== null && speedKmh < 6) return { family: "calma" as const, label: "calma" };
  if (degrees === null || degrees === undefined || Number.isNaN(degrees)) return { family: "variable" as const, label: "dirección variable" };

  const normalized = ((degrees % 360) + 360) % 360;
  const compass = compassLabel(normalized);

  if (normalized >= 45 && normalized <= 135) return { family: "levante" as const, label: `Levante (${compass})` };
  if (normalized >= 225 && normalized <= 315) return { family: "poniente" as const, label: `Poniente (${compass})` };
  if (normalized > 315 || normalized < 45) return { family: "norte" as const, label: `Norte (${compass})` };
  return { family: "sur" as const, label: `Sur (${compass})` };
}

function compassLabel(degrees: number) {
  const labels = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return labels[Math.round(degrees / 45) % labels.length];
}
