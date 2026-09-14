// Fuente principal: DolarAPI (https://dolarapi.com/docs/venezuela) — API
// pública, gratuita y bien documentada que sincroniza la tasa oficial del
// BCV (el BCV no ofrece una API propia). Como respaldo, se intenta también
// pyDolarVenezuela, que ha cambiado de dominio antes (de
// pydolarvenezuela-api.vercel.app a pydolarve.org), así que probamos varios
// dominios y parseamos la respuesta de forma flexible por si cambia el
// formato de nuevo.

const DOLARAPI_USD_URL = "https://ve.dolarapi.com/v1/dolares/oficial";
const DOLARAPI_EUR_URL = "https://ve.dolarapi.com/v1/euros/oficial";

const PYDOLAR_BASES = [
  "https://pydolarve.org/api/v1",
  "https://pydolarvenezuela-api.vercel.app/api/v1",
];

type MonitorEntry = { key?: string; price?: number; title?: string };

function extractPydolarPrice(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  if (typeof obj.price === "number" && obj.price > 0) return obj.price;

  const monitors = obj.monitors;

  // Forma nueva: { monitors: [ { key: "usd", price: 123.45 }, ... ] }
  if (Array.isArray(monitors)) {
    const list = monitors as MonitorEntry[];
    const bcv =
      list.find((m) => m.key?.toLowerCase().includes("bcv")) ?? list[0];
    if (bcv && typeof bcv.price === "number" && bcv.price > 0) {
      return bcv.price;
    }
  }

  // Forma vieja: { monitors: { bcv: { price: 123.45 } } }
  if (monitors && typeof monitors === "object" && !Array.isArray(monitors)) {
    const map = monitors as Record<string, MonitorEntry>;
    const entry = map.bcv ?? Object.values(map)[0];
    if (entry && typeof entry.price === "number" && entry.price > 0) {
      return entry.price;
    }
  }

  return null;
}

async function fetchDolarApi(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.promedio === "number" && data.promedio > 0
      ? data.promedio
      : null;
  } catch {
    return null;
  }
}

async function fetchFromPyDolar(
  currency: "dollar" | "euro"
): Promise<number | null> {
  for (const base of PYDOLAR_BASES) {
    try {
      const res = await fetch(`${base}/${currency}?page=bcv`, {
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = await res.json();
      const price = extractPydolarPrice(data);
      if (price !== null) return price;
    } catch {
      // probamos el siguiente dominio
    }
  }
  return null;
}

export async function fetchBcvUsdRate(): Promise<{
  rate: number | null;
  source: string;
}> {
  const rate = await fetchDolarApi(DOLARAPI_USD_URL);
  if (rate !== null) return { rate, source: "DolarApi" };

  const fallback = await fetchFromPyDolar("dollar");
  if (fallback !== null) return { rate: fallback, source: "pyDolarVenezuela (respaldo)" };

  return { rate: null, source: "no disponible" };
}

export async function fetchBcvEurRate(): Promise<{
  rate: number | null;
  source: string;
}> {
  const rate = await fetchDolarApi(DOLARAPI_EUR_URL);
  if (rate !== null) return { rate, source: "DolarApi" };

  const fallback = await fetchFromPyDolar("euro");
  if (fallback !== null) return { rate: fallback, source: "pyDolarVenezuela (respaldo)" };

  return { rate: null, source: "no disponible" };
}
