"use client";

import Image from "next/image";
import { useRates } from "@/hooks/useRates";
import RateTile from "./RateTile";
import CurrencyToggle from "./CurrencyToggle";
import type { CurrencyCode } from "@/lib/types";

function formatUpdatedAt(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "hace un momento";
  if (diffMin === 1) return "hace 1 minuto";
  return `hace ${diffMin} minutos`;
}

type Props = {
  currency: CurrencyCode;
  onCurrencyChange: (c: CurrencyCode) => void;
};

export default function RateBoard({ currency, onCurrencyChange }: Props) {
  const { rates, previous, error } = useRates();

  const current = rates ? rates[currency.toLowerCase() as "usd" | "eur"] : null;
  const prev = previous ? previous[currency.toLowerCase() as "usd" | "eur"] : null;

  const parallelLabel = currency === "USD" ? "Binance P2P" : "Paralelo (estimado)";
  const parallelDetail =
    currency === "USD"
      ? rates?.usd.binanceBuy && rates?.usd.binanceSell
        ? `Compra ${rates.usd.binanceBuy.toFixed(2)} · Venta ${rates.usd.binanceSell.toFixed(2)}`
        : "Mediana de anuncios USDT/VES"
      : "Dólar paralelo × tasa EUR/USD internacional";

  return (
    <section aria-label="Tasas actuales" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/icons/logo-96.png" alt="" width={28} height={28} className="h-7 w-7" />
          <h1 className="text-lg text-text">Calculito</h1>
        </div>
        <p className="text-xs text-text-faint">
          {rates ? formatUpdatedAt(rates.timestamp) : "cargando…"}
        </p>
      </div>

      <CurrencyToggle value={currency} onChange={onCurrencyChange} />

      {error && (
        <p className="text-xs text-up border border-up/30 bg-up/10 rounded px-3 py-2">
          {error}
        </p>
      )}

      <RateTile
        label={`Promedio general (${currency})`}
        value={current?.average ?? null}
        previousValue={prev?.average ?? null}
        detail={`Promedio entre la tasa BCV y ${parallelLabel.toLowerCase()}`}
        hero
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <RateTile
          label={`BCV (oficial, ${currency})`}
          value={current?.official ?? null}
          previousValue={prev?.official ?? null}
          detail="Tasa de referencia del Banco Central de Venezuela"
        />
        <RateTile
          label={`${parallelLabel} (${currency})`}
          value={current?.parallel ?? null}
          previousValue={prev?.parallel ?? null}
          detail={parallelDetail}
        />
      </div>
    </section>
  );
}
