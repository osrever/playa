import { appConfig } from "../../config/scoring";
import type { WeatherHour, WeatherProvider } from "../../types/domain";

const weatherCodes: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nuboso",
  3: "Cubierto",
  45: "Niebla",
  51: "Llovizna débil",
  61: "Lluvia débil",
  63: "Lluvia",
  65: "Lluvia intensa",
  80: "Chubascos",
  95: "Tormenta",
};

interface OpenMeteoResponse {
  hourly?: Record<string, Array<string | number | null>>;
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  name = "Open-Meteo";

  async getWeather(date: string): Promise<WeatherHour[]> {
    const { latitude, longitude, timezone } = appConfig.location;
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      timezone,
      start_date: date,
      end_date: date,
      wind_speed_unit: "kmh",
      hourly:
        "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,precipitation,precipitation_probability,weather_code,uv_index",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) throw new Error("Datos meteorológicos no disponibles.");
    const data = (await response.json()) as OpenMeteoResponse;
    const hourly = data.hourly;
    if (!hourly?.time?.length) throw new Error("Predicción meteorológica incompleta.");

    return hourly.time.map((time, index) => ({
      time: String(time),
      airTemperatureC: numberAt(hourly.temperature_2m, index),
      apparentTemperatureC: numberAt(hourly.apparent_temperature, index),
      relativeHumidityPercent: numberAt(hourly.relative_humidity_2m, index),
      windSpeedKmh: numberAt(hourly.wind_speed_10m, index),
      windDirectionDeg: numberAt(hourly.wind_direction_10m, index),
      windGustKmh: numberAt(hourly.wind_gusts_10m, index),
      cloudCoverPercent: numberAt(hourly.cloud_cover, index),
      precipitationMm: numberAt(hourly.precipitation, index),
      precipitationProbabilityPercent: numberAt(hourly.precipitation_probability, index),
      skyState: weatherCodes[Number(hourly.weather_code?.[index])] ?? "Sin descripción",
      uvIndex: numberAt(hourly.uv_index, index),
    }));
  }
}

function numberAt(values: Array<string | number | null> | undefined, index: number) {
  const value = values?.[index];
  return typeof value === "number" ? value : value === null || value === undefined ? null : Number(value);
}
