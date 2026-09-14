"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { CurrencyCode, HistoryPoint } from "@/lib/types";
import { deriveFromHistoryPoint } from "@/lib/derive";

const RANGES = [
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
];

type Mode = "rates" | "gap";

function formatDate(t: number, days: number) {
  const d = new Date(t);
  if (days <= 7) {
    return d.toLocaleDateString("es-VE", { weekday: "short", hour: "2-digit" });
  }
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short" });
}

export default function HistoryChart({ currency }: { currency: CurrencyCode }) {
  const [days, setDays] = useState(7);
  const [mode, setMode] = useState<Mode>("rates");
  const [raw, setRaw] = useState<HistoryPoint[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reinicia el loading al cambiar el rango de días
    setLoading(true);
    fetch(`/api/history?days=${days}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((points: HistoryPoint[]) => {
        if (!cancelled) setRaw(points);
      })
      .catch(() => {
        if (!cancelled) setRaw([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const data = useMemo(() => (raw ? raw.map(deriveFromHistoryPoint) : null), [raw]);
  const hasData = data && data.length > 1;

  const officialKey = currency === "USD" ? "bcvUsd" : "bcvEur";
  const parallelKey = currency === "USD" ? "binanceUsd" : "parallelEur";
  const averageKey = currency === "USD" ? "usdAverage" : "eurAverage";
  const gapKey = currency === "USD" ? "usdGapPct" : "eurGapPct";
  const parallelLabel = currency === "USD" ? "Binance P2P" : "Paralelo";

  return (
    <section
      aria-label="Histórico de tasas"
      className="rounded-lg border border-border bg-surface-quiet px-4 py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex gap-1">
          <button
            onClick={() => setMode("rates")}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              mode === "rates"
                ? "border-accent text-accent"
                : "border-border-quiet text-text-faint hover:text-text-muted"
            }`}
          >
            Tasas (Bs)
          </button>
          <button
            onClick={() => setMode("gap")}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              mode === "gap"
                ? "border-accent text-accent"
                : "border-border-quiet text-text-faint hover:text-text-muted"
            }`}
          >
            Brecha (%)
          </button>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                days === r.days
                  ? "border-accent text-accent"
                  : "border-border-quiet text-text-faint hover:text-text-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="text-xs text-text-faint py-10 text-center">Cargando histórico…</p>
      )}

      {!loading && !hasData && (
        <p className="text-xs text-text-faint py-10 text-center">
          Todavía no hay suficiente histórico guardado. Vuelve en unas horas —
          la app toma una foto de las tasas cada hora automáticamente mientras
          se use.
        </p>
      )}

      {!loading && hasData && mode === "rates" && (
        <div className="h-56 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data!} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border-quiet)" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={(t) => formatDate(t, days)}
                stroke="var(--text-faint)"
                fontSize={11}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="var(--text-faint)"
                fontSize={11}
                tickLine={false}
                width={48}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelFormatter={(t) => formatDate(Number(t), days)}
                formatter={(value, name) => [
                  typeof value === "number" ? value.toFixed(2) : String(value),
                  String(name),
                ]}
              />
              <Line
                type="monotone"
                dataKey={officialKey}
                name="BCV"
                stroke="var(--down)"
                dot={false}
                strokeWidth={1.5}
              />
              <Line
                type="monotone"
                dataKey={parallelKey}
                name={parallelLabel}
                stroke="var(--up)"
                dot={false}
                strokeWidth={1.5}
              />
              <Line
                type="monotone"
                dataKey={averageKey}
                name="Promedio"
                stroke="var(--accent)"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && hasData && mode === "gap" && (
        <div className="h-56 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data!} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border-quiet)" vertical={false} />
              <XAxis
                dataKey="t"
                tickFormatter={(t) => formatDate(t, days)}
                stroke="var(--text-faint)"
                fontSize={11}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                stroke="var(--text-faint)"
                fontSize={11}
                tickLine={false}
                width={48}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `${v}%`}
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelFormatter={(t) => formatDate(Number(t), days)}
                formatter={(value) => [
                  typeof value === "number" ? `${value.toFixed(1)}%` : String(value),
                  "Brecha",
                ]}
              />
              <Line
                type="monotone"
                dataKey={gapKey}
                name="Brecha"
                stroke="var(--accent)"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
