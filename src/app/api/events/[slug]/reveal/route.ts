import { NextRequest, NextResponse } from "next/server";
import { getRevealPayload } from "@/lib/data/reveal";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = await getRevealPayload(slug);

  if (!payload) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json(payload);
}
