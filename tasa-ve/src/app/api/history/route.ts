import { NextResponse } from "next/server";
import { getHistory } from "@/lib/kv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? "7");
  const limit = Math.min(Math.max(days, 1), 90) * 24;

  const history = await getHistory(limit);
  return NextResponse.json(history, {
    headers: { "Cache-Control": "no-store" },
  });
}
