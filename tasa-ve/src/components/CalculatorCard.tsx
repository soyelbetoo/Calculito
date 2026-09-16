"use client";

import { useEffect, useState } from "react";
import { useRates } from "@/hooks/useRates";
import type { CurrencyCode } from "@/lib/types";

type RateChoice = "official" | "parallel" | "average";

function parseNumber(v: string): number | null {
  const cleaned = v.replace(/\./g, "").replace(",", ".").trim();
  // admite tanto "1.234,56" como "1234.56" — si no hay coma, se asume punto decimal normal
  const num = v.includes(",") ? parseFloat(cleaned) : parseFloat(v);
  return Number.isFinite(num) ? num : null;
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CalculatorCard({ currency }: { currency: CurrencyCode }) {
  const { rates } = useRates();
  const current = rates ? rates[currency.toLowerCase() as "usd" | "eur"] : null;

  const [rateChoice, setRateChoice] = useState<RateChoice>("average");
  const [bsInput, setBsInput] = useState("");
  const [fxInput, setFxInput] = useState("");
  const [lastEdited, setLastEdited] = useState<"bs" | "fx">("bs");

  const parallelLabel = currency === "USD" ? "Binance P2P" : "Paralelo (estimado)";
  const rate =
    current === null
      ? null
      : rateChoice === "official"
      ? current.official
      : rateChoice === "parallel"
      ? current.parallel
      : current.average;

  function recomputeFromBs(v: string) {
    const num = parseNumber(v);
    if (num !== null && rate) {
      setFxInput(formatNumber(num / rate));
    } else if (v.trim() === "") {
      setFxInput("");
    }
  }

  function recomputeFromFx(v: string) {
    const num = parseNumber(v);
    if (num !== null && rate) {
      setBsInput(formatNumber(num * rate));
    } else if (v.trim() === "") {
      setBsInput("");
    }
  }

  // Si cambia la tasa (llega una nueva del servidor, o el usuario elige otra
  // tasa u otra moneda), recalcula el lado que NO se está editando a mano.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el campo derivado cuando cambia la tasa, no un evento del usuario
    if (lastEdited === "bs") recomputeFromBs(bsInput);
    else recomputeFromFx(fxInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);

  function clearAll() {
    setBsInput("");
    setFxInput("");
  }

  return (
    <section
      aria-label="Calculadora"
      className="rounded-lg border border-border bg-surface-quiet px-4 py-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-text-muted">Calculadora ({currency})</h2>
        {(bsInput || fxInput) && (
          <button
            onClick={clearAll}
            className="text-xs text-text-faint hover:text-text-muted"
          >
            Borrar
          </button>
        )}
      </div>

      <select
        value={rateChoice}
        onChange={(e) => setRateChoice(e.target.value as RateChoice)}
        className="bg-surface border border-border-quiet rounded px-2 py-1.5 text-sm text-text w-full"
      >
        <option value="average">Calcular con: Promedio</option>
        <option value="official">Calcular con: BCV (oficial)</option>
        <option value="parallel">Calcular con: {parallelLabel}</option>
      </select>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-faint">Bolívares (Bs)</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={bsInput}
            onChange={(e) => {
              setLastEdited("bs");
              setBsInput(e.target.value);
              recomputeFromBs(e.target.value);
            }}
            className="bg-surface border border-border-quiet rounded px-3 py-2 text-xl font-mono tabular-nums text-text"
          />
        </label>

        <div className="text-center text-text-faint text-xs">↕</div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-text-faint">{currency}</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={fxInput}
            onChange={(e) => {
              setLastEdited("fx");
              setFxInput(e.target.value);
              recomputeFromFx(e.target.value);
            }}
            className="bg-surface border border-border-quiet rounded px-3 py-2 text-xl font-mono tabular-nums text-accent"
          />
        </label>
      </div>

      <p className="text-xs text-text-faint">
        {rate !== null
          ? `1 ${currency} = Bs. ${formatNumber(rate)}`
          : "Esperando la tasa…"}
      </p>
    </section>
  );
}
