import { NextRequest, NextResponse } from "next/server";
import { getEventRowBySlug } from "@/lib/data/events";
import { createGuest, countGuestsForEvent } from "@/lib/data/guests";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { nome, codigo } = body as { nome?: string; codigo?: string };
  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return NextResponse.json({ error: "Tell us your name!" }, { status: 400 });
  }

  const event = await getEventRowBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  // Never trust the client-side code screen alone — validate again here, at the
  // actual moment someone becomes a guest.
  if (!codigo || codigo !== event.codigo_acesso) {
    return NextResponse.json({ error: "Wrong entry code." }, { status: 403 });
  }

  if (Date.now() >= new Date(event.reveal_at).getTime()) {
    return NextResponse.json(
      { error: "The reveal already started — you cannot join as a guest anymore." },
      { status: 403 }
    );
  }

  const totalConvidados = await countGuestsForEvent(event.id);
  if (totalConvidados >= event.max_convidados) {
    return NextResponse.json(
      { error: "This party has already hit its maximum number of guests." },
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
