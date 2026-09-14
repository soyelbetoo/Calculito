import type { CurrentRates, Gap, HistoryPoint } from "./types";

export function computeGap(official: number | null, parallel: number | null): Gap {
  const average =
    official !== null && parallel !== null ? (official + parallel) / 2 : null;

  const pct = (a: number, b: number) => ((a - b) / b) * 100;

  return {
    parallelVsOfficialPct:
      official !== null && parallel !== null ? pct(parallel, official) : null,
    averageVsOfficialPct:
      official !== null && average !== null ? pct(average, official) : null,
    parallelVsAveragePct:
      average !== null && parallel !== null ? pct(parallel, average) : null,
  };
}

export function buildCurrentRates(input: {
  bcvUsd: number | null;
  binanceBuy: number | null;
  binanceSell: number | null;
  binanceAvg: number | null;
  bcvEur: number | null;
  eurUsdFx: number | null;
  sources: { bcv: string; binance: string; eurUsdFx: string };
}): CurrentRates {
  const { bcvUsd, binanceBuy, binanceSell, binanceAvg, bcvEur, eurUsdFx, sources } =
    input;

  const usdAverage =
    bcvUsd !== null && binanceAvg !== null ? (bcvUsd + binanceAvg) / 2 : null;

  const parallelEur =
    binanceAvg !== null && eurUsdFx !== null ? binanceAvg * eurUsdFx : null;
  const eurAverage =
    bcvEur !== null && parallelEur !== null ? (bcvEur + parallelEur) / 2 : null;

  return {
    usd: {
      official: bcvUsd,
      parallel: binanceAvg,
      average: usdAverage,
      binanceBuy,
      binanceSell,
    },
    eur: {
      official: bcvEur,
      parallel: parallelEur,
      average: eurAverage,
    },
    gaps: {
      usd: computeGap(bcvUsd, binanceAvg),
      eur: computeGap(bcvEur, parallelEur),
    },
    timestamp: Date.now(),
    source: sources,
  };
}

// Deriva promedio + brecha USD/EUR a partir de un punto histórico crudo,
// para el gráfico de "Histórico de brecha" sin tener que guardar esos
// campos calculados por separado.
export function deriveFromHistoryPoint(point: HistoryPoint) {
  return {
    t: point.t,
    usdGapPct: computeGap(point.bcvUsd, point.binanceUsd).parallelVsOfficialPct,
    eurGapPct: computeGap(point.bcvEur, point.parallelEur).parallelVsOfficialPct,
    bcvUsd: point.bcvUsd,
    binanceUsd: point.binanceUsd,
    usdAverage:
      point.bcvUsd !== null && point.binanceUsd !== null
        ? (point.bcvUsd + point.binanceUsd) / 2
        : null,
    bcvEur: point.bcvEur,
    parallelEur: point.parallelEur,
    eurAverage:
      point.bcvEur !== null && point.parallelEur !== null
        ? (point.bcvEur + point.parallelEur) / 2
        : null,
  };
}
