import type { WeatherHour, WeatherProvider } from "../../types/domain";

function skyForHour(hour: number) {
  if (hour < 11) return "Poco nuboso";
  if (hour < 16) return "Despejado";
  if (hour < 19) return "Intervalos nubosos";
  return "Cubierto";
}

export class SimulatedWeatherProvider implements WeatherProvider {
  name = "Meteorología simulada";

  async getWeather(date: string): Promise<WeatherHour[]> {
    return Array.from({ length: 24 }, (_, hour) => {
      const temp = hour < 9 ? 20 : hour < 15 ? 21 + (hour - 8) * 0.95 : 27.2 - (hour - 15) * 0.42;
      const wind = hour < 12 ? 8 + hour * 0.45 : hour < 18 ? 13 + (hour - 12) * 0.9 : 18 + (hour - 18) * 1.4;
      return {
        time: `${date}T${String(hour).padStart(2, "0")}:00:00`,
        airTemperatureC: Number(temp.toFixed(1)),
        apparentTemperatureC: Number((temp + (hour >= 13 && hour <= 18 ? 0.8 : -0.2)).toFixed(1)),
        relativeHumidityPercent: hour < 10 ? 74 : hour < 17 ? 58 : 68,
        windSpeedKmh: Number(wind.toFixed(1)),
        windDirectionDeg: hour < 15 ? 250 : 210,
        windGustKmh: Number((wind + 7).toFixed(1)),
        cloudCoverPercent: hour < 12 ? 20 : hour < 18 ? 35 : 70,
        precipitationMm: hour >= 20 ? 0.4 : 0,
        precipitationProbabilityPercent: hour >= 19 ? 35 : 5,
        skyState: skyForHour(hour),
        uvIndex: hour >= 12 && hour <= 16 ? 8 : hour >= 10 && hour <= 18 ? 5 : 1,
        waterTemperatureC: 22.5,
        waveHeightM: 0.4,
      };
    });
  }
}
