import { NextRequest, NextResponse } from "next/server";
import {
  computeFase,
  getEventForHost,
  getPublicEventBySlug,
  updateEventSettings,
} from "@/lib/data/events";
import { createClient } from "@/lib/supabase/server";

const POSES_OPCOES = [12, 18, 24];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const info = await getPublicEventBySlug(slug);

  if (!info) {
    return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  return NextResponse.json(info);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Faça login como anfitrião." }, { status: 401 });
  }

  const event = await getEventForHost(slug, user.id);
  if (!event) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const updates: { capaUrl?: string | null; posesPorConvidado?: number } = {};

  if ("capaUrl" in body) {
    const capaUrl = body.capaUrl;
    if (capaUrl === null) {
      updates.capaUrl = null;
    } else if (typeof capaUrl === "string") {
      const isPreset = capaUrl.startsWith("/covers/");
      const isUploaded = capaUrl.startsWith(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/`
      );
      if (!isPreset && !isUploaded) {
        return NextResponse.json({ error: "Capa inválida." }, { status: 400 });
      }
      updates.capaUrl = capaUrl;
    } else {
      return NextResponse.json({ error: "Capa inválida." }, { status: 400 });
    }
  }

  if ("posesPorConvidado" in body) {
    const fase = computeFase(event, new Date());
    if (fase !== "captura") {
      return NextResponse.json(
        { error: "Só dá para mudar as poses antes da revelação." },
        { status: 400 }
      );
    }
    const poses = body.posesPorConvidado;
    if (typeof poses !== "number" || !POSES_OPCOES.includes(poses)) {
      return NextResponse.json({ error: "Número de poses inválido." }, { status: 400 });
    }
    updates.posesPorConvidado = poses;
  }

  await updateEventSettings(event.id, updates);

  const info = await getPublicEventBySlug(slug);
  return NextResponse.json(info);
}
