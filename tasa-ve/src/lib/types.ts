export type CurrencyCode = "USD" | "EUR";

export type CurrencyRates = {
  official: number | null; // tasa BCV
  parallel: number | null; // USD: Binance P2P. EUR: derivada (paralelo USD x tasa EUR/USD internacional)
  average: number | null; // promedio entre official y parallel
};

export type Gap = {
  parallelVsOfficialPct: number | null; // qué tan por encima está el paralelo del oficial
  averageVsOfficialPct: number | null;
  parallelVsAveragePct: number | null;
};

export type CurrentRates = {
  usd: CurrencyRates & {
    binanceBuy: number | null; // precio para comprar USDT
    binanceSell: number | null; // precio para vender USDT
  };
  eur: CurrencyRates;
  gaps: {
    usd: Gap;
    eur: Gap;
  };
  timestamp: number; // epoch ms
  source: {
    bcv: string;
    binance: string;
    eurUsdFx: string;
  };
};

// Guardamos los 4 números crudos; todo lo demás (promedios, brechas) se
// deriva al leer, para no duplicar lógica ni tener que migrar el histórico
// guardado cada vez que agreguemos una métrica nueva.
export type HistoryPoint = {
  t: number; // epoch ms
  bcvUsd: number | null;
  binanceUsd: number | null;
  bcvEur: number | null;
  parallelEur: number | null;
};

export type RateKey = "usd.official" | "usd.parallel" | "usd.average" | "eur.official" | "eur.parallel" | "eur.average";

export type AlertRule = {
  id: string;
  endpoint: string; // usado como parte de la key, viene de la push subscription
  rateType: RateKey;
  direction: "above" | "below";
  threshold: number;
  createdAt: number;
  lastTriggeredAt?: number;
};

export type PushSubscriptionRecord = {
  subscription: PushSubscriptionJSON;
  rules: AlertRule[];
};
