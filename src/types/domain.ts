export type TideType = "high" | "low";
export type TideTrend = "rising" | "falling";
export type Rating = "excellent" | "very-good" | "good" | "fair" | "poor";
export type FeedbackValue = "better" | "ok" | "worse";

export interface TideExtreme {
  time: string;
  heightMeters: number;
  type: TideType;
}

export interface TideSample {
  time: string;
  percentage: number;
  estimatedHeightMeters: number;
  trend: TideTrend;
  tidalRangeMeters: number;
  nextExtreme: TideExtreme;
  minutesToNextExtreme: number;
}

export interface WeatherHour {
  time: string;
  airTemperatureC: number | null;
  apparentTemperatureC: number | null;
  relativeHumidityPercent?: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  windGustKmh: number | null;
  cloudCoverPercent: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPercent: number | null;
  skyState: string | null;
  uvIndex?: number | null;
  waterTemperatureC?: number | null;
  waveHeightM?: number | null;
}

export interface EvaluationInterval {
  time: string;
  endTime: string;
  score: number;
  rating: Rating;
  tide: TideSample | null;
  weather: WeatherHour | null;
  hardConstraints: string[];
  reasons: string[];
  componentScores: Record<string, number>;
}

export interface BathingSlot {
  startTime: string;
  endTime: string;
  rating: Rating;
  averageScore: number;
  minimumScore: number;
  durationMinutes: number;
  intervals: EvaluationInterval[];
  reasons: string[];
  isRecommended: boolean;
}

export interface DayRecommendation {
  date: string;
  intervals: EvaluationInterval[];
  slots: BathingSlot[];
  bestSlot: BathingSlot | null;
  tideExtremes: TideExtreme[];
  weatherHours: WeatherHour[];
  sourceStatus: {
    tides: "ok" | "failed" | "simulated";
    weather: "ok" | "failed" | "simulated";
    messages: string[];
  };
}

export interface TideProvider {
  name: string;
  getTides(date: string): Promise<TideExtreme[]>;
}

export interface WeatherProvider {
  name: string;
  getWeather(date: string): Promise<WeatherHour[]>;
}

export interface StoredFeedback {
  id: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  score: number;
  conditions: {
    rating: Rating;
    averageTidePercentage: number | null;
    averageTemperatureC: number | null;
    averageWindKmh: number | null;
  };
  value: FeedbackValue;
  createdAt: string;
}
