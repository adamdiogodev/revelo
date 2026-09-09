import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { computeFase, getEventRowBySlug } from "@/lib/data/events";
import { downloadPhotosByIds } from "@/lib/data/photos";
import { generateHighlightVideo } from "@/lib/video";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_PHOTOS = 10;

async function loadCoverBuffer(capaUrl: string | null): Promise<Buffer | null> {
  if (!capaUrl) return null;
  if (capaUrl.startsWith("/covers/")) {
    return readFile(path.join(process.cwd(), "public", capaUrl));
  }
  try {
    const res = await fetch(capaUrl);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { photoIds } = body as { photoIds?: string[] };
  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: "Pick at least 1 photo." }, { status: 400 });
  }
  if (photoIds.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Pick at most ${MAX_PHOTOS} photos.` }, { status: 400 });
  }

  const event = await getEventRowBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  // Never build a video from photos before the reveal — same rule as always,
  // computed from the server clock.
  const fase = computeFase(event, new Date());
  if (fase !== "revelada") {
    return NextResponse.json({ error: "The video can only be built after the reveal." }, { status: 403 });
  }

  try {
    const [photoBuffers, capaBuffer] = await Promise.all([
      downloadPhotosByIds(event.id, photoIds),
      loadCoverBuffer(event.capa_url),
    ]);

    if (photoBuffers.length === 0) {
      return NextResponse.json({ error: "Nenhuma das fotos selecionadas foi encontrada." }, { status: 400 });
    }

    const video = await generateHighlightVideo({
      eventNome: event.nome,
      capaBuffer,
      photoBuffers,
    });

    return new NextResponse(new Uint8Array(video), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${slug}-video.mp4"`,
      },
    });
  } catch (err) {
    console.error("Error building video:", err);
    return NextResponse.json({ error: "We could not build the video. Please try again." }, { status: 500 });
  }
}
