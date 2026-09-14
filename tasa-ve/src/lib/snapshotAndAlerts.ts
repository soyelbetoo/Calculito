import {
  appendHistoryPoint,
  getLastHistoryPoint,
  getLastAlertCheckAt,
  setLastAlertCheckAt,
  getAllSubscriptions,
  markRuleTriggered,
} from "./kv";
import { sendPushNotification, isPushConfigured } from "./push";
import type { AlertRule, CurrentRates, RateKey } from "./types";

// El plan gratuito de Vercel solo permite cron jobs una vez al día, así que
// en vez de depender de un cron, aprovechamos cada visita/consulta real a
// /api/rates para "tomar la foto" del histórico y revisar alertas, pero
// solo si ya pasó suficiente tiempo desde la última vez. Si nadie visita
// la app durante horas, simplemente no se guardan puntos en ese lapso.
const SNAPSHOT_INTERVAL_MS = 55 * 60 * 1000; // ~cada hora
const ALERT_CHECK_INTERVAL_MS = 14 * 60 * 1000; // ~cada 15 minutos
const RETRIGGER_COOLDOWN_MS = 6 * 60 * 60 * 1000; // no repetir la misma alerta antes de 6h

export async function maybeRecordSnapshot(rates: CurrentRates) {
  const last = await getLastHistoryPoint();
  if (last && rates.timestamp - last.t < SNAPSHOT_INTERVAL_MS) return;

  await appendHistoryPoint({
    t: rates.timestamp,
    bcvUsd: rates.usd.official,
    binanceUsd: rates.usd.parallel,
    bcvEur: rates.eur.official,
    parallelEur: rates.eur.parallel,
  });
}

const LABELS: Record<RateKey, string> = {
  "usd.official": "Tasa BCV (USD)",
  "usd.parallel": "Tasa Binance P2P (USD)",
  "usd.average": "Tasa promedio (USD)",
  "eur.official": "Tasa BCV (EUR)",
  "eur.parallel": "Tasa paralela (EUR)",
  "eur.average": "Tasa promedio (EUR)",
};

function valueFor(rateType: RateKey, rates: CurrentRates): number | null {
  switch (rateType) {
    case "usd.official":
      return rates.usd.official;
    case "usd.parallel":
      return rates.usd.parallel;
    case "usd.average":
      return rates.usd.average;
    case "eur.official":
      return rates.eur.official;
    case "eur.parallel":
      return rates.eur.parallel;
    case "eur.average":
      return rates.eur.average;
  }
}

function ruleIsMet(rule: AlertRule, rates: CurrentRates): boolean {
  const value = valueFor(rule.rateType, rates);
  if (value === null) return false;
  return rule.direction === "above"
    ? value >= rule.threshold
    : value <= rule.threshold;
}

export async function maybeCheckAlerts(rates: CurrentRates) {
  if (!isPushConfigured()) return { skipped: true, notified: 0 };

  const lastChecked = await getLastAlertCheckAt();
  if (lastChecked && rates.timestamp - lastChecked < ALERT_CHECK_INTERVAL_MS) {
    return { skipped: true, notified: 0 };
  }
  await setLastAlertCheckAt(rates.timestamp);

  const subscriptions = await getAllSubscriptions();
  let notified = 0;

  for (const record of subscriptions) {
    for (const rule of record.rules) {
      const met = ruleIsMet(rule, rates);
      const cooledDown =
        !rule.lastTriggeredAt ||
        Date.now() - rule.lastTriggeredAt > RETRIGGER_COOLDOWN_MS;

      if (met && cooledDown) {
        const value = valueFor(rule.rateType, rates);
        try {
          await sendPushNotification(record.subscription, {
            title: "Alerta de tasa de cambio",
            body: `${LABELS[rule.rateType]} ${
              rule.direction === "above" ? "subió a" : "bajó a"
            } Bs. ${value?.toFixed(2)} (tu umbral: ${rule.threshold})`,
          });
          await markRuleTriggered(record.subscription.endpoint as string, rule);
          notified++;
        } catch {
          // la suscripción puede haber expirado; se ignora silenciosamente
        }
      }
    }
  }

  return { skipped: false, notified };
}
