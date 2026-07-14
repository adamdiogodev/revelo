import { NextRequest, NextResponse } from "next/server";
import { getEventRowBySlug } from "@/lib/data/events";
import { getGuestByToken, getGuestCompletedChallengeIds } from "@/lib/data/guests";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token ausente." }, { status: 400 });
  }

  const event = await getEventRowBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  const guest = await getGuestByToken(event.id, token);
  if (!guest) {
    return NextResponse.json({ error: "Convidado não encontrado." }, { status: 404 });
  }

  const challengesConcluidos = await getGuestCompletedChallengeIds(guest.id);

  return NextResponse.json({
    guestId: guest.id,
    nome: guest.nome,
    posesUsadas: guest.poses_usadas,
    posesPorConvidado: event.poses_por_convidado,
    challengesConcluidos,
  });
}
