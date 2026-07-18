import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, COVERS_BUCKET } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Faça login para enviar uma capa." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Upload inválido." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Imagem muito grande (máximo 20MB)." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "O arquivo precisa ser uma imagem." }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage.from(COVERS_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: "Falha ao enviar a imagem." }, { status: 500 });
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from(COVERS_BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: publicUrlData.publicUrl });
}
