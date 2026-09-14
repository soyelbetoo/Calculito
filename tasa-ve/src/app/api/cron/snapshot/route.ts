import { NextResponse } from "next/server";
import { fetchBcvUsdRate, fetchBcvEurRate } from "@/lib/bcv";
import { fetchBinanceP2PRates } from "@/lib/binance";
import { fetchEurUsdRate } from "@/lib/fx";
import { buildCurrentRates } from "@/lib/derive";
import { appendHistoryPoint } from "@/lib/kv";

export const dynamic = "force-dynamic";

// Solo necesaria si conectas un cron externo gratuito (ver README). Vercel
// Hobby no llama esta ruta automáticamente.
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [bcvUsd, bcvEur, binance, eurUsdFx] = await Promise.all([
    fetchBcvUsdRate(),
    fetchBcvEurRate(),
    fetchBinanceP2PRates(),
    fetchEurUsdRate(),
  ]);

  const rates = buildCurrentRates({
    bcvUsd: bcvUsd.rate,
    binanceBuy: binance.buy,
    binanceSell: binance.sell,
    binanceAvg: binance.avg,
    bcvEur: bcvEur.rate,
    eurUsdFx: eurUsdFx.rate,
    sources: { bcv: bcvUsd.source, binance: binance.source, eurUsdFx: eurUsdFx.source },
  });

  await appendHistoryPoint({
    t: rates.timestamp,
    bcvUsd: rates.usd.official,
    binanceUsd: rates.usd.parallel,
    bcvEur: rates.eur.official,
    parallelEur: rates.eur.parallel,
  });

  return NextResponse.json({ ok: true, usd: rates.usd, eur: rates.eur });
}
