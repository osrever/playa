import type { Rating } from "../types/domain";

export const appConfig = {
  location: {
    name: "Sanlúcar de Barrameda",
    subtitle: "Cádiz",
    latitude: 36.7781,
    longitude: -6.3515,
    timezone: "Europe/Madrid",
    aemetMunicipalityCode: "11032",
    tideStationCode: "37",
    tideStationName: "Sanlúcar playa, corregido desde Bonanza IHM",
  },
  schedule: {
    startHour: 9,
    endHour: 21,
    intervalMinutes: 30,
  },
  cache: {
    tidesTtlMs: 1000 * 60 * 60 * 24,
    weatherTtlMs: 1000 * 60 * 35,
  },
  tide: {
    minimumUsefulPercentage: 60,
    fallingMinimumUsefulPercentage: 78,
    hardMinimumPercentage: 28,
    fallingHardPercentage: 48,
    fallingCautionMinutesToLow: 240,
    excellentPercentage: 88,
    goodPercentage: 68,
    absoluteMinimumHeightMeters: null as number | null,
    weakTidalRangeMeters: 1.7,
    localTimeOffsetMinutes: 118,
  },
  weights: {
    tide: 40,
    temperature: 25,
    wind: 20,
    sky: 10,
    timeOfDay: 5,
  },
  temperature: {
    morning: { startHour: 9, endHour: 11, poorBelowC: 22, fairBelowC: 24, goodFromC: 24 },
    midday: { startHour: 11, endHour: 18, goodFromC: 23, excellentFromC: 25 },
    evening: { startHour: 18, endHour: 21, poorFeelsBelowC: 21, fairFeelsBelowC: 23, goodFeelsFromC: 24 },
  },
  wind: {
    excellentBelowKmh: 10,
    goodBelowKmh: 15,
    moderateBelowKmh: 20,
    poorBelowKmh: 30,
    hardMaximumKmh: 38,
    gustHardMaximumKmh: 48,
    directionEffects: {
      levantePenalty: 18,
      ponienteBonus: 6,
      northPenalty: 8,
      calmBelowKmh: 6,
    },
  },
  sky: {
    rainPoorMm: 0.6,
    rainHardMm: 3,
    stormWords: ["tormenta", "tormentoso", "rayos"],
    cloudPenaltyStartsPercent: 45,
  },
  uv: {
    moderateFrom: 3,
    highFrom: 6,
    veryHighFrom: 8,
    extremeFrom: 11,
  },
  ratingBands: [
    { rating: "excellent", min: 85, label: "Excelente" },
    { rating: "very-good", min: 70, label: "Muy buena" },
    { rating: "good", min: 55, label: "Buena" },
    { rating: "fair", min: 40, label: "Justa" },
    { rating: "poor", min: 0, label: "Mala" },
  ] as const satisfies ReadonlyArray<{ rating: Rating; min: number; label: string }>,
};

export function labelForRating(rating: Rating) {
  return appConfig.ratingBands.find((band) => band.rating === rating)?.label ?? "Sin datos";
}
