import { appConfig } from "../../config/scoring";
import type { WeatherHour, WeatherProvider } from "../../types/domain";

interface AemetEnvelope {
  datos?: string;
  descripcion?: string;
}

interface AemetValue {
  periodo: string;
  value?: string;
  descripcion?: string;
  velocidad?: string[];
  direccion?: string[];
}

interface AemetDay {
  fecha?: string;
  temperatura?: AemetValue[];
  sensTermica?: AemetValue[];
  humedadRelativa?: AemetValue[];
  vientoAndRachaMax?: AemetValue[];
  precipitacion?: AemetValue[];
  probPrecipitacion?: AemetValue[];
  estadoCielo?: AemetValue[];
}

interface AemetTownForecast {
  prediccion?: {
    dia?: AemetDay[];
  };
}

export class AemetWeatherProvider implements WeatherProvider {
  name = "AEMET OpenData";

  async getWeather(date: string): Promise<WeatherHour[]> {
    const apiKey = import.meta.env.VITE_AEMET_API_KEY;
    if (!apiKey) throw new Error("Falta VITE_AEMET_API_KEY para AEMET OpenData.");

    const endpoint = `https://opendata.aemet.es/opendata/api/prediccion/especifica/municipio/horaria/${appConfig.location.aemetMunicipalityCode}`;
    const first = await fetch(`${endpoint}?api_key=${encodeURIComponent(apiKey)}`);
    if (!first.ok) throw new Error("AEMET OpenData no ha aceptado la solicitud.");
    const envelope = (await first.json()) as AemetEnvelope;
    if (!envelope.datos) throw new Error(envelope.descripcion ?? "AEMET no devolvió URL de datos.");

    const second = await fetch(envelope.datos);
    if (!second.ok) throw new Error("No se pudo descargar la predicción horaria de AEMET.");
    const payload = (await second.json()) as AemetTownForecast[];
    const day = payload[0]?.prediccion?.dia?.find((item) => item.fecha?.startsWith(date));
    if (!day) throw new Error("AEMET no tiene predicción horaria para esa fecha.");

    const byHour = (items: AemetValue[] | undefined) => new Map((items ?? []).map((item) => [item.periodo, item.value]));
    const temps = byHour(day.temperatura);
    const feels = byHour(day.sensTermica);
    const humidity = byHour(day.humedadRelativa);
    const wind = new Map((day.vientoAndRachaMax ?? []).flatMap((item) => (item.periodo ? [[item.periodo, item] as const] : [])));
    const rain = byHour(day.precipitacion);
    const rainProb = byHour(day.probPrecipitacion);
    const sky = new Map((day.estadoCielo ?? []).map((item) => [item.periodo, item.descripcion ?? null]));

    return Array.from({ length: 24 }, (_, hour) => {
      const key = String(hour).padStart(2, "0");
      const windItem = wind.get(key);
      return {
        time: `${date}T${key}:00:00`,
        airTemperatureC: toNumber(temps.get(key)),
        apparentTemperatureC: toNumber(feels.get(key)),
        relativeHumidityPercent: toNumber(humidity.get(key)),
        windSpeedKmh: toNumber(windItem?.velocidad?.[0]),
        windDirectionDeg: null,
        windGustKmh: toNumber(windItem?.value),
        cloudCoverPercent: null,
        precipitationMm: toNumber(rain.get(key)),
        precipitationProbabilityPercent: toNumber(rainProb.get(key)),
        skyState: sky.get(key) ?? null,
      };
    });
  }
}

function toNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
