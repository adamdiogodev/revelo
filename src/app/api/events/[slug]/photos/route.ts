import { NextRequest, NextResponse } from "next/server";
import { getEventRowBySlug } from "@/lib/data/events";
import { getGuestByToken } from "@/lib/data/guests";
import { uploadGuestPhoto } from "@/lib/data/photos";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Upload inválido." }, { status: 400 });
  }

  const guestToken = form.get("guestToken");
  const challengeIdRaw = form.get("challengeId");
  const file = form.get("file");

  if (typeof guestToken !== "string" || !guestToken) {
    return NextResponse.json({ error: "Token de convidado ausente." }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Arquivo de foto ausente." }, { status: 400 });
  }

  const event = await getEventRowBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  if (Date.now() >= new Date(event.reveal_at).getTime()) {
    return NextResponse.json(
      { error: "revelacao_iniciada", message: "A revelação já começou, câmera encerrada." },
      { status: 403 }
    );
  }

  const guest = await getGuestByToken(event.id, guestToken);
  if (!guest) {
    return NextResponse.json({ error: "Convidado não encontrado." }, { status: 404 });
  }

  if (guest.poses_usadas >= event.poses_por_convidado) {
    return NextResponse.json(
      { error: "sem_poses", message: "Suas poses já acabaram!" },
      { status: 409 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  const challengeId = typeof challengeIdRaw === "string" && challengeIdRaw ? challengeIdRaw : null;

  const result = await uploadGuestPhoto({
    eventId: event.id,
    guestId: guest.id,
    challengeId,
    fileBuffer,
  });

  if (!result.ok) {
    const status = result.reason === "sem_poses" || result.reason === "revelacao_iniciada" ? 409 : 500;
    const message =
      result.reason === "sem_poses"
        ? "Suas poses já acabaram!"
        : result.reason === "revelacao_iniciada"
          ? "A revelação já começou, câmera encerrada."
          : "Falha ao enviar a foto. Tente novamente.";
    return NextResponse.json({ error: result.reason, message }, { status });
  }

  return NextResponse.json({
    posesUsadas: result.posesUsadas,
    posesPorConvidado: result.posesPorConvidado,
  });
}
