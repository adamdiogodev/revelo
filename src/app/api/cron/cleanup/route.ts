import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredEvents } from "@/lib/data/cleanup";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }

  const result = await purgeExpiredEvents();
  return NextResponse.json(result);
}
