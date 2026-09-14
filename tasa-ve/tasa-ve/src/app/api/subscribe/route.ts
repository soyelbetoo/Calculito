import { NextResponse } from "next/server";
import { saveSubscription, removeSubscription } from "@/lib/kv";
import type { AlertRule } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const { subscription, rules } = body as {
    subscription: PushSubscriptionJSON;
    rules: Omit<AlertRule, "id" | "endpoint" | "createdAt">[];
  };

  if (!subscription?.endpoint) {
    return NextResponse.json(
      { error: "Suscripción inválida" },
      { status: 400 }
    );
  }

  const fullRules: AlertRule[] = rules.map((r) => ({
    ...r,
    id: crypto.randomUUID(),
    endpoint: subscription.endpoint as string,
    createdAt: Date.now(),
  }));

  await saveSubscription({ subscription, rules: fullRules });

  return NextResponse.json({ ok: true, rules: fullRules });
}

export async function DELETE(req: Request) {
  const { endpoint } = await req.json();
  if (!endpoint) {
    return NextResponse.json({ error: "Falta endpoint" }, { status: 400 });
  }
  await removeSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
