import { NextRequest, NextResponse } from "next/server";
import { getEventRowBySlug, setEventMaxConvidados } from "@/lib/data/events";
import { getLatestPaymentForEvent, markPaymentCortesia } from "@/lib/data/payments";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "ADMIN_SECRET não configurado." }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { slug, maxConvidados } = body as { slug?: string; maxConvidados?: number };

  if (!slug || !maxConvidados || maxConvidados < 1) {
    return NextResponse.json({ error: "slug e maxConvidados são obrigatórios." }, { status: 400 });
  }

  const event = await getEventRowBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  await setEventMaxConvidados(event.id, maxConvidados);

  const pending = await getLatestPaymentForEvent(event.id);
  if (pending && pending.status === "pendente") {
    await markPaymentCortesia(pending.id);
  }

  return NextResponse.json({ ok: true, slug, maxConvidados });
}
