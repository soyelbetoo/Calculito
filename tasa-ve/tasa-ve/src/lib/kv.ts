import { Redis } from "@upstash/redis";
import type {
  HistoryPoint,
  PushSubscriptionRecord,
  AlertRule,
} from "./types";

// Usa las variables de entorno que Vercel inyecta automáticamente cuando
// conectas una base de datos Upstash Redis desde el Marketplace de Vercel
// (Storage -> Create Database -> Redis). Ver README para el paso a paso.
function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;
  return new Redis({ url, token });
}

const HISTORY_KEY = "tasa-ve:history";
const SUBSCRIPTIONS_KEY = "tasa-ve:subscriptions";
const MAX_HISTORY_POINTS = 24 * 90; // 90 días de snapshots por hora

export async function appendHistoryPoint(point: HistoryPoint) {
  const redis = getRedis();
  if (!redis) return;

  await redis.rpush(HISTORY_KEY, JSON.stringify(point));
  const len = await redis.llen(HISTORY_KEY);
  if (len > MAX_HISTORY_POINTS) {
    await redis.ltrim(HISTORY_KEY, len - MAX_HISTORY_POINTS, -1);
  }
}

export async function getLastHistoryPoint(): Promise<HistoryPoint | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.lrange<string | HistoryPoint>(HISTORY_KEY, -1, -1);
  if (!raw.length) return null;
  const item = raw[0];
  return typeof item === "string" ? (JSON.parse(item) as HistoryPoint) : item;
}

const LAST_ALERT_CHECK_KEY = "tasa-ve:last-alert-check";

export async function getLastAlertCheckAt(): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return null;
  const val = await redis.get<number>(LAST_ALERT_CHECK_KEY);
  return val ?? null;
}

export async function setLastAlertCheckAt(timestamp: number) {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(LAST_ALERT_CHECK_KEY, timestamp);
}

export async function getHistory(limit = 24 * 30): Promise<HistoryPoint[]> {
  const redis = getRedis();
  if (!redis) return [];

  const len = await redis.llen(HISTORY_KEY);
  const start = Math.max(0, len - limit);
  const raw = await redis.lrange<string | HistoryPoint>(
    HISTORY_KEY,
    start,
    -1
  );

  return raw.map((item) =>
    typeof item === "string" ? (JSON.parse(item) as HistoryPoint) : item
  );
}

export async function saveSubscription(record: PushSubscriptionRecord) {
  const redis = getRedis();
  if (!redis) return;
  await redis.hset(SUBSCRIPTIONS_KEY, {
    [record.subscription.endpoint as string]: JSON.stringify(record),
  });
}

export async function removeSubscription(endpoint: string) {
  const redis = getRedis();
  if (!redis) return;
  await redis.hdel(SUBSCRIPTIONS_KEY, endpoint);
}

export async function getAllSubscriptions(): Promise<
  PushSubscriptionRecord[]
> {
  const redis = getRedis();
  if (!redis) return [];
  const all = await redis.hgetall<Record<string, string>>(SUBSCRIPTIONS_KEY);
  if (!all) return [];
  return Object.values(all).map((v) =>
    typeof v === "string" ? JSON.parse(v) : (v as PushSubscriptionRecord)
  );
}

export async function markRuleTriggered(endpoint: string, rule: AlertRule) {
  const redis = getRedis();
  if (!redis) return;
  const all = await getAllSubscriptions();
  const record = all.find((r) => r.subscription.endpoint === endpoint);
  if (!record) return;
  record.rules = record.rules.map((r) =>
    r.id === rule.id ? { ...r, lastTriggeredAt: Date.now() } : r
  );
  await saveSubscription(record);
}

export function isKvConfigured(): boolean {
  return getRedis() !== null;
}
