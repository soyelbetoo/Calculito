"use client";

import { useRates } from "@/hooks/useRates";
import type { CurrencyCode } from "@/lib/types";

function formatPct(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

type RowProps = { label: string; value: number | null; help: string };

function GapRow({ label, value, help }: RowProps) {
  const color =
    value === null
      ? "text-text-faint"
      : value > 0
      ? "text-up"
      : value < 0
      ? "text-down"
      : "text-text-muted";

  return (
    <div className="flex items-start justify-between gap-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text">{label}</p>
        <p className="text-xs text-text-faint">{help}</p>
      </div>
      <p className={`font-mono text-lg tabular-nums shrink-0 ${color}`}>
        {formatPct(value)}
      </p>
    </div>
  );
}

export default function GapCard({ currency }: { currency: CurrencyCode }) {
  const { rates } = useRates();
  const gap = rates ? rates.gaps[currency.toLowerCase() as "usd" | "eur"] : null;
  const parallelLabel = currency === "USD" ? "Binance P2P" : "paralelo estimado";

  return (
    <section
      aria-label="Brecha cambiaria"
      className="rounded-lg border border-border bg-surface-quiet px-4 py-4"
    >
      <h2 className="text-sm text-text-muted mb-1">
        Brecha cambiaria ({currency})
      </h2>
      <p className="text-xs text-text-faint mb-2">
        Qué tan separada está cada tasa de la oficial BCV. Positivo = por
        encima del oficial.
      </p>

      <div className="divide-y divide-border-quiet">
        <GapRow
          label={`${parallelLabel} vs. oficial`}
          value={gap?.parallelVsOfficialPct ?? null}
          help="La brecha cambiaria clásica"
        />
        <GapRow
          label="Promedio vs. oficial"
          value={gap?.averageVsOfficialPct ?? null}
          help="Cuánto se aleja el promedio del BCV"
        />
        <GapRow
          label={`${parallelLabel} vs. promedio`}
          value={gap?.parallelVsAveragePct ?? null}
          help="Diferencia entre el paralelo y el promedio"
        />
      </div>
    </section>
  );
}
