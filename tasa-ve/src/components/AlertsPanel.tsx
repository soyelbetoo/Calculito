"use client";

import { useEffect, useState } from "react";
import { urlBase64ToUint8Array } from "@/lib/urlBase64";
import type { AlertRule, RateKey } from "@/lib/types";

type LocalRule = Pick<AlertRule, "rateType" | "direction" | "threshold">;

const RATE_GROUPS: { label: string; options: { value: RateKey; label: string }[] }[] = [
  {
    label: "Dólar",
    options: [
      { value: "usd.official", label: "BCV" },
      { value: "usd.parallel", label: "Binance P2P" },
      { value: "usd.average", label: "Promedio" },
    ],
  },
  {
    label: "Euro",
    options: [
      { value: "eur.official", label: "BCV" },
      { value: "eur.parallel", label: "Paralelo (estimado)" },
      { value: "eur.average", label: "Promedio" },
    ],
  },
];

const RATE_LABELS: Record<RateKey, string> = {
  "usd.official": "Tasa BCV (USD)",
  "usd.parallel": "Tasa Binance P2P (USD)",
  "usd.average": "Tasa promedio (USD)",
  "eur.official": "Tasa BCV (EUR)",
  "eur.parallel": "Tasa paralela (EUR)",
  "eur.average": "Tasa promedio (EUR)",
};

export default function AlertsPanel() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [rateType, setRateType] = useState<AlertRule["rateType"]>("usd.average");
  const [direction, setDirection] = useState<AlertRule["direction"]>("above");
  const [threshold, setThreshold] = useState("");

  useEffect(() => {
    const ok =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de una API del navegador al montar
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
  }, []);

  async function enableAndSubscribe(newRule: LocalRule) {
    setPending(true);
    setFeedback(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setFeedback("Necesitas permitir las notificaciones para activar alertas.");
        return;
      }

      const keyRes = await fetch("/api/vapid-public-key");
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        setFeedback(
          "El servidor todavía no tiene configuradas las claves de notificaciones (VAPID). Revisa el README."
        );
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });
      }

      const existingRules = rules.map(
        ({ rateType, direction, threshold }) => ({ rateType, direction, threshold })
      );

      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          rules: [...existingRules, newRule],
        }),
      });

      if (!res.ok) throw new Error("fallo al guardar");
      const data = await res.json();
      setRules(data.rules);
      setThreshold("");
      setFeedback("Alerta activada.");
    } catch {
      setFeedback("No se pudo activar la alerta. Intenta de nuevo.");
    } finally {
      setPending(false);
    }
  }

  function addRule() {
    const value = parseFloat(threshold);
    if (Number.isNaN(value) || value <= 0) {
      setFeedback("Escribe un número válido para el umbral.");
      return;
    }
    enableAndSubscribe({ rateType, direction, threshold: value });
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    // Nota: esto solo actualiza la vista local; para eliminar del todo
    // en el servidor bastaría con re-enviar la lista sin esa regla.
  }

  if (!supported) {
    return (
      <section className="rounded-lg border border-border bg-surface-quiet px-4 py-4">
        <h2 className="text-sm text-text-muted mb-1">Alertas</h2>
        <p className="text-xs text-text-faint">
          Tu navegador no soporta notificaciones push. Prueba desde Chrome o
          Safari en tu teléfono.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface-quiet px-4 py-4 flex flex-col gap-3">
      <h2 className="text-sm text-text-muted">Alertas</h2>

      <p className="text-xs text-text-faint">
        Recibe una notificación en tu teléfono cuando una tasa cruce el precio
        que definas.
      </p>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={rateType}
          onChange={(e) => setRateType(e.target.value as AlertRule["rateType"])}
          className="bg-surface border border-border-quiet rounded px-2 py-1.5 text-sm text-text"
        >
          {RATE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as AlertRule["direction"])}
          className="bg-surface border border-border-quiet rounded px-2 py-1.5 text-sm text-text"
        >
          <option value="above">sube a</option>
          <option value="below">baja a</option>
        </select>

        <input
          type="number"
          inputMode="decimal"
          placeholder="Bs. por USD"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="bg-surface border border-border-quiet rounded px-2 py-1.5 text-sm text-text w-32"
        />

        <button
          onClick={addRule}
          disabled={pending}
          className="text-sm px-3 py-1.5 rounded bg-accent text-bg font-medium disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Agregar alerta"}
        </button>
      </div>

      {feedback && <p className="text-xs text-text-muted">{feedback}</p>}

      {rules.length > 0 && (
        <ul className="flex flex-col gap-1.5 mt-1">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center justify-between text-xs text-text-muted border border-border-quiet rounded px-2 py-1.5"
            >
              <span>
                {RATE_LABELS[rule.rateType]}{" "}
                {rule.direction === "above" ? "sube a" : "baja a"} Bs.{" "}
                {rule.threshold}
              </span>
              <button
                onClick={() => removeRule(rule.id)}
                className="text-text-faint hover:text-up"
                aria-label="Quitar alerta"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {permission === "denied" && (
        <p className="text-xs text-up">
          Bloqueaste las notificaciones para este sitio. Actívalas desde los
          ajustes del navegador para usar las alertas.
        </p>
      )}
    </section>
  );
}
