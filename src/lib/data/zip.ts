import "server-only";
import JSZip from "jszip";
import { supabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase-admin";

type PhotoForZip = {
  storage_path: string;
  taken_at: string;
  guests: { nome: string } | { nome: string }[] | null;
};

function firstOf<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40) || "convidado";
}

export async function buildEventZip(eventId: string): Promise<Buffer> {
  const { data: photos, error } = await supabaseAdmin
    .from("photos")
    .select("storage_path, taken_at, guests(nome)")
    .eq("event_id", eventId)
    .order("taken_at", { ascending: true });

  if (error) throw new Error(error.message);

  const zip = new JSZip();
  const rows = (photos || []) as unknown as PhotoForZip[];
  const usedNames = new Set<string>();

  await Promise.all(
    rows.map(async (row, i) => {
      const { data, error: downloadError } = await supabaseAdmin.storage
        .from(PHOTOS_BUCKET)
        .download(row.storage_path);

      if (downloadError || !data) return;

      const guestNome = sanitizeFilename(firstOf(row.guests)?.nome || "convidado");
      let filename = `${String(i + 1).padStart(3, "0")}_${guestNome}.jpg`;
      let suffix = 1;
      while (usedNames.has(filename)) {
        filename = `${String(i + 1).padStart(3, "0")}_${guestNome}_${suffix}.jpg`;
        suffix += 1;
      }
      usedNames.add(filename);

      const arrayBuffer = await data.arrayBuffer();
      zip.file(filename, arrayBuffer);
    })
  );

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
