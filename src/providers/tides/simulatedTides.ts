import type { TideExtreme, TideProvider } from "../../types/domain";

export class SimulatedTideProvider implements TideProvider {
  name = "Mareas simuladas";

  async getTides(date: string): Promise<TideExtreme[]> {
    return [
      { time: `${date}T00:15:00`, heightMeters: 0.7, type: "low" },
      { time: `${date}T06:35:00`, heightMeters: 2.85, type: "high" },
      { time: `${date}T12:35:00`, heightMeters: 0.62, type: "low" },
      { time: `${date}T18:45:00`, heightMeters: 3.05, type: "high" },
      { time: `${date}T23:55:00`, heightMeters: 0.74, type: "low" },
    ];
  }
}
