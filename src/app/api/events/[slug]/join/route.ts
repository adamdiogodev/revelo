import { NextRequest, NextResponse } from "next/server";
import { getEventRowBySlug } from "@/lib/data/events";
import { createGuest, countGuestsForEvent } from "@/lib/data/guests";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { nome, codigo } = body as { nome?: string; codigo?: string };
  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return NextResponse.json({ error: "Diz aí seu nome!" }, { status: 400 });
  }

  const event = await getEventRowBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  // Nunca confia só na tela de código do cliente — valida de novo aqui,
  // no momento real de virar convidado.
  if (!codigo || codigo !== event.codigo_acesso) {
    return NextResponse.json({ error: "Código de entrada incorreto." }, { status: 403 });
  }

  if (Date.now() >= new Date(event.reveal_at).getTime()) {
    return NextResponse.json(
      { error: "A revelação já começou, não dá mais para entrar como convidado." },
      { status: 403 }
    );
  }

  const totalConvidados = await countGuestsForEvent(event.id);
  if (totalConvidados >= event.max_convidados) {
    return NextResponse.json(
      { error: "Esse evento já atingiu o número máximo de convidados." },
      { status: 403 }
    );
  }

  const guest = await createGuest(event.id, nome);

  return NextResponse.json({
    guestId: guest.id,
    guestToken: guest.guest_token,
    nome: guest.nome,
    posesUsadas: guest.poses_usadas,
    posesPorConvidado: event.poses_por_convidado,
    challengesConcluidos: [] as string[],
  });
}
