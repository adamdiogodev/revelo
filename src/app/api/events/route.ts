import { NextRequest, NextResponse } from "next/server";
import { createEvent } from "@/lib/data/events";
import { createClient } from "@/lib/supabase/server";
import { CHALLENGE_PRESETS } from "@/lib/challenge-presets";

const VALID_POSES = [12, 18, 24];
const MIN_CONVIDADOS = 50;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Faça login para criar um evento." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const {
    nome,
    revealAt,
    posesPorConvidado,
    maxConvidados,
    modoDesafios,
    challenges,
  } = body as {
    nome?: string;
    revealAt?: string;
    posesPorConvidado?: number;
    maxConvidados?: number;
    modoDesafios?: boolean;
    challenges?: { titulo: string; emoji?: string }[];
  };

  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return NextResponse.json({ error: "Nome do evento é obrigatório." }, { status: 400 });
  }

  if (!revealAt || Number.isNaN(Date.parse(revealAt))) {
    return NextResponse.json({ error: "Data/hora de revelação inválida." }, { status: 400 });
  }

  const revealDate = new Date(revealAt);
  if (revealDate.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "A revelação precisa ser em um horário no futuro." },
      { status: 400 }
    );
  }

  if (!posesPorConvidado || !VALID_POSES.includes(posesPorConvidado)) {
    return NextResponse.json({ error: "Poses por convidado inválido." }, { status: 400 });
  }

  if (!maxConvidados || maxConvidados < MIN_CONVIDADOS || maxConvidados % 50 !== 0) {
    return NextResponse.json(
      { error: "Máximo de convidados precisa ser um múltiplo de 50." },
      { status: 400 }
    );
  }

  let finalChallenges: { titulo: string; emoji: string }[] = [];
  if (modoDesafios) {
    const custom = (challenges || [])
      .map((c) => ({ titulo: (c.titulo || "").trim(), emoji: c.emoji || "📸" }))
      .filter((c) => c.titulo.length > 0);

    finalChallenges = custom.length > 0 ? custom : CHALLENGE_PRESETS;
  }

  try {
    const { slug, codigoAcesso } = await createEvent({
      hostUserId: user.id,
      nome: nome.trim().slice(0, 80),
      revealAt: revealDate,
      posesPorConvidado,
      maxConvidados,
      modoDesafios: Boolean(modoDesafios),
      challenges: finalChallenges,
    });

    return NextResponse.json({ slug, codigoAcesso });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao criar o evento. Tente novamente." }, { status: 500 });
  }
}
