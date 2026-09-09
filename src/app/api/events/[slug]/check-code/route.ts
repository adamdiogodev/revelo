import { NextRequest, NextResponse } from "next/server";
import { getEventRowBySlug } from "@/lib/data/events";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { codigo } = body as { codigo?: string };

  const event = await getEventRowBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  if (!codigo || codigo !== event.codigo_acesso) {
    return NextResponse.json({ error: "Wrong code." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
