// Binance bloquea CORS para este endpoint, por eso esto SOLO puede llamarse
// desde el servidor (rutas API de Next.js / funciones serverless de Vercel),
// nunca directamente desde el navegador.
const BINANCE_P2P_URL =
  "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";

type TradeType = "BUY" | "SELL";

async function fetchAds(tradeType: TradeType, rows = 10): Promise<number[]> {
  const res = await fetch(BINANCE_P2P_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      page: 1,
      rows,
      payTypes: [],
      publisherType: "merchant",
      asset: "USDT",
      fiat: "VES",
      tradeType,
    }),
  });

  if (!res.ok) {
    throw new Error(`Binance respondió ${res.status}`);
  }

  const json = await res.json();
  const prices: number[] =
    json?.data
      ?.map((row: { adv?: { price?: string } }) =>
        parseFloat(row?.adv?.price ?? "")
      )
      .filter((n: number) => !Number.isNaN(n)) ?? [];

  return prices;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function fetchBinanceP2PRates(): Promise<{
  buy: number | null; // precio para COMPRAR USDT (ofertas de venta de comerciantes)
  sell: number | null; // precio para VENDER USDT (ofertas de compra de comerciantes)
  avg: number | null;
  source: string;
}> {
  try {
    const [sellAds, buyAds] = await Promise.all([
      fetchAds("SELL", 10), // comerciantes vendiendo USDT -> precio de compra para el usuario
      fetchAds("BUY", 10), // comerciantes comprando USDT -> precio de venta para el usuario
    ]);

    const buy = median(sellAds);
    const sell = median(buyAds);
    const avg =
      buy !== null && sell !== null
        ? (buy + sell) / 2
        : buy ?? sell ?? null;

    return { buy, sell, avg, source: "Binance P2P (mediana top 10 anuncios)" };
  } catch {
    return { buy: null, sell: null, avg: null, source: "no disponible" };
  }
}
