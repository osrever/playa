import { appConfig } from "../../config/scoring";
import { cached } from "../../services/cache";
import type { TideExtreme, TideProvider } from "../../types/domain";
import { IhmTideProvider } from "./ihmTides";
import { SimulatedTideProvider } from "./simulatedTides";

function configuredTideProvider(): TideProvider {
  if (import.meta.env.VITE_TIDE_PROVIDER === "simulated" || import.meta.env.VITE_DATA_MODE === "simulated") return new SimulatedTideProvider();
  return new IhmTideProvider();
}

export async function loadTides(date: string) {
  const provider = configuredTideProvider();
  const simulated = provider instanceof SimulatedTideProvider;

  try {
    const extremes = await cached<TideExtreme[]>(
      `tides:v2:${provider.name}:offset-${appConfig.tide.localTimeOffsetMinutes}:${date}`,
      appConfig.cache.tidesTtlMs,
      () => provider.getTides(date)
    );
    return { extremes, status: simulated ? ("simulated" as const) : ("ok" as const), message: null };
  } catch (error) {
    const fallback = await new SimulatedTideProvider().getTides(date);
    return {
      extremes: fallback,
      status: "failed" as const,
      message: error instanceof Error ? error.message : "Predicción de mareas no disponible.",
    };
  }
}
