import { NextResponse } from "next/server";
import { fetchBcvUsdRate, fetchBcvEurRate } from "@/lib/bcv";
import { fetchBinanceP2PRates } from "@/lib/binance";
import { fetchEurUsdRate } from "@/lib/fx";
import { buildCurrentRates } from "@/lib/derive";
import { maybeRecordSnapshot, maybeCheckAlerts } from "@/lib/snapshotAndAlerts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const [bcvUsd, bcvEur, binance, eurUsdFx] = await Promise.all([
    fetchBcvUsdRate(),
    fetchBcvEurRate(),
    fetchBinanceP2PRates(),
    fetchEurUsdRate(),
  ]);

  const payload = buildCurrentRates({
    bcvUsd: bcvUsd.rate,
    binanceBuy: binance.buy,
    binanceSell: binance.sell,
    binanceAvg: binance.avg,
    bcvEur: bcvEur.rate,
    eurUsdFx: eurUsdFx.rate,
    sources: {
      bcv: bcvUsd.source,
      binance: binance.source,
      eurUsdFx: eurUsdFx.source,
    },
  });

  // Oportunista: en vez de un cron job (que en el plan gratuito de Vercel
  // solo corre una vez al día), aprovechamos esta consulta real para
  // guardar el histórico y revisar alertas, si ya tocaba.
  await Promise.all([
    maybeRecordSnapshot(payload).catch(() => {}),
    maybeCheckAlerts(payload).catch(() => {}),
  ]);

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
