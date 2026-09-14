// Frankfurter usa las tasas de referencia del Banco Central Europeo.
// Gratis, sin necesidad de API key.
const FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=EUR&to=USD";

// Respaldo simple si Frankfurter falla.
const FALLBACK_URL = "https://open.er-api.com/v6/latest/EUR";

export async function fetchEurUsdRate(): Promise<{
  rate: number | null; // cuántos USD equivale 1 EUR
  source: string;
}> {
  try {
    const res = await fetch(FRANKFURTER_URL, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.USD;
      if (typeof rate === "number" && rate > 0) {
        return { rate, source: "Frankfurter (BCE)" };
      }
    }
  } catch {
    // seguimos al respaldo
  }

  try {
    const res = await fetch(FALLBACK_URL, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rates?.USD;
      if (typeof rate === "number" && rate > 0) {
        return { rate, source: "open.er-api.com (respaldo)" };
      }
    }
  } catch {
    // sin más respaldos
  }

  return { rate: null, source: "no disponible" };
}
