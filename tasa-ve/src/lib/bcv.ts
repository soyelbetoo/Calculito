// Fuente: pyDolarVenezuela — API pública y gratuita que sincroniza la tasa
// oficial publicada por el Banco Central de Venezuela (el BCV no ofrece
// una API propia). Docs: https://pydolarvenezuela-api.vercel.app/apidocs
const PYDOLAR_BASE = "https://pydolarvenezuela-api.vercel.app/api/v1";

// Alternativa/respaldo por si pyDolarVenezuela está caído momentáneamente
// (solo cubre dólar).
const FALLBACK_USD_URL = "https://ve.dolarapi.com/v1/dolares/oficial";
const FALLBACK_EUR_URL = "https://ve.dolarapi.com/v1/dolares/oficial-euro";

async function fetchFromPyDolar(
  currency: "dollar" | "euro"
): Promise<number | null> {
  try {
    const res = await fetch(`${PYDOLAR_BASE}/${currency}?page=bcv`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price =
      data?.monitors?.bcv?.price ?? data?.price ?? null;
    return typeof price === "number" && price > 0 ? price : null;
  } catch {
    return null;
  }
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
