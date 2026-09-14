"use client";

import { useEffect, useRef, useState } from "react";
import type { CurrentRates } from "@/lib/types";

const POLL_INTERVAL_MS = 60_000;

export function useRates() {
  const [rates, setRates] = useState<CurrentRates | null>(null);
  const [previous, setPrevious] = useState<CurrentRates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rateRef = useRef<CurrentRates | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/rates", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo consultar las tasas");
        const data: CurrentRates = await res.json();
        if (cancelled) return;

        setPrevious(rateRef.current);
        rateRef.current = data;
        setRates(data);
        setError(null);
      } catch {
        if (!cancelled) setError("No se pudieron actualizar las tasas. Reintentando…");
      }
    }

    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { rates, previous, error };
}
