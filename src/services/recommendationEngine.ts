import { appConfig, labelForRating } from "../config/scoring";
import type { BathingSlot, DayRecommendation, EvaluationInterval, Rating, TideExtreme, WeatherHour } from "../types/domain";
import { estimateTideAt } from "./tideCalculations";
import { addMinutes, buildDayIntervals, formatTime, hourOf } from "./time";
import { describeWindDirection } from "./wind";

export function buildRecommendation(
  date: string,
  tideExtremes: TideExtreme[],
  weatherHours: WeatherHour[],
  sourceStatus: DayRecommendation["sourceStatus"]
): DayRecommendation {
  const intervals = buildDayIntervals(date).map((time) => evaluateInterval(time, tideExtremes, weatherHours));
  const slots = groupIntervals(intervals);
  return {
    date,
    intervals,
    slots,
    bestSlot: selectBestSlot(slots),
    tideExtremes,
    weatherHours,
    sourceStatus,
  };
}

export function evaluateInterval(time: string, tideExtremes: TideExtreme[], weatherHours: WeatherHour[]): EvaluationInterval {
  const tide = estimateTideAt(time, tideExtremes);
  const weather = nearestWeather(time, weatherHours);
  const hardConstraints: string[] = [];
  const reasons: string[] = [];
  const componentScores = {
    tide: tide ? scoreTide(tide) : 0,
    temperature: weather ? scoreTemperature(time, weather) : 0,
    wind: weather ? scoreWind(weather) : 0,
    sky: weather ? scoreSky(weather) : 0,
    timeOfDay: scoreTimeOfDay(time),
  };

  if (hourOf(time) < appConfig.schedule.startHour || hourOf(time) >= appConfig.schedule.endHour) {
    hardConstraints.push("Fuera del horario permitido");
  }
  if (!tide) hardConstraints.push("Predicción de mareas no disponible");
  if (!weather) hardConstraints.push("Datos meteorológicos no disponibles");
  if (tide && tide.percentage < appConfig.tide.hardMinimumPercentage) hardConstraints.push("Marea extremadamente baja");
  if (tide && isFallingTowardLow(tide) && tide.percentage < appConfig.tide.fallingMinimumUsefulPercentage) {
    hardConstraints.push("Marea bajando demasiado hacia bajamar");
  }
  if (weather?.windSpeedKmh !== null && weather?.windSpeedKmh !== undefined && weather.windSpeedKmh >= appConfig.wind.hardMaximumKmh) {
    hardConstraints.push("Viento excesivo");
  }
  if (weather?.windGustKmh !== null && weather?.windGustKmh !== undefined && weather.windGustKmh >= appConfig.wind.gustHardMaximumKmh) {
    hardConstraints.push("Rachas excesivas");
  }
  if ((weather?.precipitationMm ?? 0) >= appConfig.sky.rainHardMm) hardConstraints.push("Lluvia intensa");
  if (weather?.skyState && appConfig.sky.stormWords.some((word) => weather.skyState?.toLowerCase().includes(word))) {
    hardConstraints.push("Riesgo de tormenta");
  }

  if (tide) {
    const trend = tide.trend === "rising" ? "subiendo" : "bajando";
    reasons.push(`Marea ${Math.round(tide.percentage)} % y ${trend}`);
    reasons.push(`Próxima ${tide.nextExtreme.type === "high" ? "pleamar" : "bajamar"} a las ${formatTime(tide.nextExtreme.time)}`);
    if (tide.tidalRangeMeters < appConfig.tide.weakTidalRangeMeters) reasons.push("Rango de marea bajo para el día");
  }
  if (weather?.airTemperatureC !== null && weather?.airTemperatureC !== undefined) {
    reasons.push(
      `${Math.round(weather.airTemperatureC)} °C${weather.apparentTemperatureC ? `, sensación ${Math.round(weather.apparentTemperatureC)} °C` : ""}${
        weather.relativeHumidityPercent ? `, humedad ${Math.round(weather.relativeHumidityPercent)} %` : ""
      }`
    );
  }
  if (weather?.windSpeedKmh !== null && weather?.windSpeedKmh !== undefined) {
    const direction = describeWindDirection(weather.windDirectionDeg, weather.windSpeedKmh);
    reasons.push(`Viento de ${direction.label}, ${Math.round(weather.windSpeedKmh)} km/h${weather.windGustKmh ? `, rachas ${Math.round(weather.windGustKmh)} km/h` : ""}`);
  }
  if (weather?.skyState) reasons.push(weather.skyState);
  if ((weather?.precipitationMm ?? 0) > 0) reasons.push(`Precipitación ${weather?.precipitationMm} mm`);
  if (weather?.uvIndex !== null && weather?.uvIndex !== undefined) reasons.push(describeUv(weather.uvIndex));

  const score = hardConstraints.length
    ? Math.min(39, weightedScore(componentScores))
    : weightedScore(componentScores);

  return {
    time,
    endTime: addMinutes(time, appConfig.schedule.intervalMinutes),
    score,
    rating: ratingForScore(score),
    tide,
    weather,
    hardConstraints,
    reasons,
    componentScores,
  };
}

export function groupIntervals(intervals: EvaluationInterval[]): BathingSlot[] {
  const slots: BathingSlot[] = [];
  let current: EvaluationInterval[] = [];

  for (const interval of intervals) {
    const previous = current.at(-1);
    const compatible =
      previous &&
      previous.rating === interval.rating &&
      previous.hardConstraints.join("|") === interval.hardConstraints.join("|") &&
      Math.abs(previous.score - interval.score) <= 16;

    if (!previous || compatible) {
      current.push(interval);
    } else {
      slots.push(toSlot(current));
      current = [interval];
    }
  }

  if (current.length) slots.push(toSlot(current));
  return slots;
}

export function selectBestSlot(slots: BathingSlot[]): BathingSlot | null {
  const candidates = slots.filter((slot) => slot.isRecommended && slot.durationMinutes >= 60);
  const pool = candidates.length ? candidates : slots.filter((slot) => slot.isRecommended);
  if (!pool.length) return null;

  return [...pool].sort((a, b) => slotFitness(b) - slotFitness(a))[0];
}

function toSlot(intervals: EvaluationInterval[]): BathingSlot {
  const scores = intervals.map((interval) => interval.score);
  const averageScore = round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  const minimumScore = Math.min(...scores);
  const rating = ratingForScore(averageScore);
  const reasonCounts = new Map<string, number>();
  intervals
    .flatMap((interval) => [...interval.hardConstraints, ...interval.reasons])
    .forEach((reason) => reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1));

  return {
    startTime: intervals[0].time,
    endTime: intervals.at(-1)?.endTime ?? intervals[0].endTime,
    rating,
    averageScore,
    minimumScore,
    durationMinutes: intervals.length * appConfig.schedule.intervalMinutes,
    intervals,
    reasons: [...reasonCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([reason]) => reason),
    isRecommended: minimumScore >= 40 && intervals.every((interval) => interval.hardConstraints.length === 0),
  };
}

function nearestWeather(time: string, hours: WeatherHour[]) {
  const target = new Date(time).getTime();
  return [...hours].sort((a, b) => Math.abs(new Date(a.time).getTime() - target) - Math.abs(new Date(b.time).getTime() - target))[0] ?? null;
}

function weightedScore(componentScores: Record<string, number>) {
  const weights = appConfig.weights;
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const score =
    (componentScores.tide * weights.tide +
      componentScores.temperature * weights.temperature +
      componentScores.wind * weights.wind +
      componentScores.sky * weights.sky +
      componentScores.timeOfDay * weights.timeOfDay) /
    total;
  return round(score);
}

function scoreTide(tide: NonNullable<EvaluationInterval["tide"]>) {
  const { percentage } = tide;
  let score = 16;
  if (percentage >= appConfig.tide.excellentPercentage) score = 100;
  else if (percentage >= appConfig.tide.goodPercentage) score = 82;
  else if (percentage >= appConfig.tide.minimumUsefulPercentage) score = 64;
  else if (percentage >= 30) score = 42;

  if (isFallingTowardLow(tide) && percentage < appConfig.tide.fallingMinimumUsefulPercentage) {
    score = Math.min(score, percentage < appConfig.tide.fallingHardPercentage ? 26 : 44);
  }

  if (isFallingTowardLow(tide) && percentage >= appConfig.tide.fallingMinimumUsefulPercentage) {
    score = Math.min(score, 72);
  }

  if (tide.tidalRangeMeters < appConfig.tide.weakTidalRangeMeters && percentage < appConfig.tide.excellentPercentage) {
    score = Math.min(score, 58);
  }

  return score;
}

function isFallingTowardLow(tide: EvaluationInterval["tide"]) {
  return (
    tide !== null &&
    tide.trend === "falling" &&
    tide.nextExtreme.type === "low" &&
    tide.minutesToNextExtreme <= appConfig.tide.fallingCautionMinutesToLow
  );
}

function scoreTemperature(time: string, weather: WeatherHour) {
  const temp = weather.airTemperatureC;
  const feels = weather.apparentTemperatureC ?? temp;
  if (temp === null || temp === undefined) return 45;
  const hour = hourOf(time);

  if (hour < appConfig.temperature.morning.endHour) {
    if (temp < appConfig.temperature.morning.poorBelowC) return 25;
    if (temp < appConfig.temperature.morning.fairBelowC) return 58;
    return 82;
  }

  if (hour < appConfig.temperature.midday.endHour) {
    if (temp >= appConfig.temperature.midday.excellentFromC) return 100;
    if (temp >= appConfig.temperature.midday.goodFromC) return 82;
    return 42;
  }

  if ((feels ?? temp) < appConfig.temperature.evening.poorFeelsBelowC) return 25;
  if ((feels ?? temp) < appConfig.temperature.evening.fairFeelsBelowC) return 55;
  if ((feels ?? temp) >= appConfig.temperature.evening.goodFeelsFromC) return 82;
  return 68;
}

function scoreWind(weather: WeatherHour) {
  const wind = Math.max(weather.windSpeedKmh ?? 0, (weather.windGustKmh ?? 0) - 8);
  let score = 8;
  if (wind < appConfig.wind.excellentBelowKmh) score = 100;
  else if (wind < appConfig.wind.goodBelowKmh) score = 82;
  else if (wind < appConfig.wind.moderateBelowKmh) score = 58;
  else if (wind < appConfig.wind.poorBelowKmh) score = 32;

  const direction = describeWindDirection(weather.windDirectionDeg, weather.windSpeedKmh);
  if (direction.family === "levante") score -= appConfig.wind.directionEffects.levantePenalty;
  if (direction.family === "poniente") score += appConfig.wind.directionEffects.ponienteBonus;
  if (direction.family === "norte") score -= appConfig.wind.directionEffects.northPenalty;
  if (direction.family === "calma") score = Math.max(score, 100);

  return Math.max(0, Math.min(100, score));
}

function scoreSky(weather: WeatherHour) {
  const rain = weather.precipitationMm ?? 0;
  const clouds = weather.cloudCoverPercent ?? 35;
  const probability = weather.precipitationProbabilityPercent ?? 0;
  if (rain >= appConfig.sky.rainPoorMm) return 20;
  if (probability >= 60) return 45;
  if (clouds <= appConfig.sky.cloudPenaltyStartsPercent) return 92;
  if (clouds <= 75) return 70;
  return 48;
}

export function describeUv(uv: number) {
  if (uv >= appConfig.uv.extremeFrom) return `UV ${Math.round(uv)} extremo: evita sol directo prolongado`;
  if (uv >= appConfig.uv.veryHighFrom) return `UV ${Math.round(uv)} muy alto: crema, gorra y sombra`;
  if (uv >= appConfig.uv.highFrom) return `UV ${Math.round(uv)} alto: protección solar`;
  if (uv >= appConfig.uv.moderateFrom) return `UV ${Math.round(uv)} moderado`;
  return `UV ${Math.round(uv)} bajo`;
}

function scoreTimeOfDay(time: string) {
  const hour = hourOf(time);
  if (hour >= 12 && hour <= 18.5) return 100;
  if (hour >= 10.5 && hour < 12) return 82;
  if (hour > 18.5 && hour <= 20) return 74;
  return 58;
}

export function ratingForScore(score: number): Rating {
  return appConfig.ratingBands.find((band) => score >= band.min)?.rating ?? "poor";
}

function slotFitness(slot: BathingSlot) {
  const stability = 100 - (slot.averageScore - slot.minimumScore);
  const durationBonus = Math.min(10, slot.durationMinutes / 18);
  return slot.averageScore * 0.58 + slot.minimumScore * 0.22 + stability * 0.12 + durationBonus;
}

function round(value: number) {
  return Math.round(value);
}

export { labelForRating };
