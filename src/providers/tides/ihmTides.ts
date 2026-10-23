import { appConfig } from "../../config/scoring";
import type { TideExtreme, TideProvider } from "../../types/domain";
import { addMinutes, toDateInputValue } from "../../services/time";

export class IhmTideProvider implements TideProvider {
  name = "Instituto Hidrográfico de la Marina";

  async getTides(date: string): Promise<TideExtreme[]> {
    const dates = [shiftDate(date, -1), date, shiftDate(date, 1)];
    const chunks = await Promise.all(dates.map((day) => fetchDay(day)));
    const extremes = chunks.flat().sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    if (!extremes.length) throw new Error("Predicción de mareas no disponible en IHM.");
    return extremes;
  }
}

async function fetchDay(date: string): Promise<TideExtreme[]> {
  const yyyymmdd = date.replaceAll("-", "");
  const url = `https://ideihm.covam.es/api-ihm/getmarea?request=gettide&id=${appConfig.location.tideStationCode}&date=${yyyymmdd}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Predicción de mareas no disponible en IHM.");
  const text = await response.text();
  const rows = text.split(/\r?\n/);

  return rows.flatMap((row) => {
    const match = row.trim().match(/^(\d{2}:\d{2})\s+(-?\d+(?:[.,]\d+)?)\s+(pleamar|bajamar)$/i);
    if (!match) return [];

    return [
      {
        time: shiftIsoMinutes(`${date}T${match[1]}:00`, appConfig.tide.localTimeOffsetMinutes),
        heightMeters: Number(match[2].replace(",", ".")),
        type: match[3].toLowerCase() === "pleamar" ? "high" : "low",
      } satisfies TideExtreme,
    ];
  });
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return toDateInputValue(value);
}

function shiftIsoMinutes(iso: string, minutes: number) {
  return addMinutes(iso, minutes);
}
