// Fuente: pyDolarVenezuela — API pública y gratuita que sincroniza la tasa
// oficial publicada por el Banco Central de Venezuela (el BCV no ofrece
// una API propia). El proyecto ha cambiado de dominio antes (de
// pydolarvenezuela-api.vercel.app a pydolarve.org), así que probamos
// varios y parseamos la respuesta de forma flexible por si vuelve a
// cambiar el formato.
const PYDOLAR_BASES = [
  "https://pydolarve.org/api/v1",
  "https://pydolarvenezuela-api.vercel.app/api/v1",
];

// Respaldo si pyDolarVenezuela está caído del todo (solo dólar).
const FALLBACK_USD_URL = "https://ve.dolarapi.com/v1/dolares/oficial";
const FALLBACK_EUR_URL = "https://ve.dolarapi.com/v1/dolares/oficial-euro";

type MonitorEntry = { key?: string; price?: number; title?: string };

function extractPrice(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  // Forma directa: { price: 123.45 }
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
      const price = extractPrice(data);
      if (price !== null) return price;
    } catch {
      // probamos el siguiente dominio
    }
  }
  return null;
}

async function fetchFallback(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.promedio === "number" ? data.promedio : null;
  } catch {
    return null;
  }
}

export async function fetchBcvUsdRate(): Promise<{
  rate: number | null;
  source: string;
}> {
  const rate = await fetchFromPyDolar("dollar");
  if (rate !== null) return { rate, source: "pyDolarVenezuela" };

  const fallback = await fetchFallback(FALLBACK_USD_URL);
  if (fallback !== null) return { rate: fallback, source: "DolarApi (respaldo)" };

  return { rate: null, source: "no disponible" };
}

export async function fetchBcvEurRate(): Promise<{
  rate: number | null;
  source: string;
}> {
  const rate = await fetchFromPyDolar("euro");
  if (rate !== null) return { rate, source: "pyDolarVenezuela" };

  const fallback = await fetchFallback(FALLBACK_EUR_URL);
  if (fallback !== null) return { rate: fallback, source: "DolarApi (respaldo)" };

  return { rate: null, source: "no disponible" };
}
