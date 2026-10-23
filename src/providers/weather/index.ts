import { appConfig } from "../../config/scoring";
import { cached } from "../../services/cache";
import type { WeatherHour, WeatherProvider } from "../../types/domain";
import { AemetWeatherProvider } from "./aemetWeather";
import { OpenMeteoWeatherProvider } from "./openMeteoWeather";
import { SimulatedWeatherProvider } from "./simulatedWeather";

function configuredWeatherProvider(): WeatherProvider {
  if (import.meta.env.VITE_DATA_MODE === "simulated") return new SimulatedWeatherProvider();
  if (import.meta.env.VITE_WEATHER_PROVIDER === "aemet") return new AemetWeatherProvider();
  if (import.meta.env.VITE_WEATHER_PROVIDER === "simulated") return new SimulatedWeatherProvider();
  return new OpenMeteoWeatherProvider();
}

export async function loadWeather(date: string) {
  const provider = configuredWeatherProvider();
  const simulated = provider instanceof SimulatedWeatherProvider;

  try {
    const hours = await cached<WeatherHour[]>(
      `weather:${provider.name}:${date}`,
      appConfig.cache.weatherTtlMs,
      () => provider.getWeather(date)
    );
    return { hours, status: simulated ? ("simulated" as const) : ("ok" as const), message: null };
  } catch (error) {
    if (import.meta.env.VITE_DATA_MODE === "strict") {
      return {
        hours: [],
        status: "failed" as const,
        message: error instanceof Error ? error.message : "Datos meteorológicos no disponibles.",
      };
    }

    const fallback = await new SimulatedWeatherProvider().getWeather(date);
    return {
      hours: fallback,
      status: "failed" as const,
      message: error instanceof Error ? error.message : "Datos meteorológicos no disponibles.",
    };
  }
}
