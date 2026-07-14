import { NextRequest, NextResponse } from "next/server";
import { getPublicEventBySlug } from "@/lib/data/events";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const info = await getPublicEventBySlug(slug);

  if (!info) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  return NextResponse.json(info);
}
