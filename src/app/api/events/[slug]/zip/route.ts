import { NextRequest, NextResponse } from "next/server";
import { getEventForHost } from "@/lib/data/events";
import { buildEventZip } from "@/lib/data/zip";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in as the host." }, { status: 401 });
  }

  const event = await getEventForHost(slug, user.id);
  if (!event) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  if (Date.now() < new Date(event.reveal_at).getTime()) {
    return NextResponse.json({ error: "The album can only be downloaded after the reveal." }, { status: 403 });
  }

  const zipBuffer = await buildEventZip(event.id);

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}.zip"`,
    },
  });
}
