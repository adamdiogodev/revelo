import "server-only";
import { supabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase-admin";

/**
 * Apaga permanentemente fotos + eventos cujo expires_at já passou.
 * A regra de "ninguém vê depois de expirado" já é garantida pelo gate de
 * fase (reveal.ts) mesmo antes deste job rodar — isso aqui é só a limpeza
 * física do Storage/banco, por privacidade e custo.
 */
export async function purgeExpiredEvents(): Promise<{ purgedSlugs: string[] }> {
  const nowIso = new Date().toISOString();

  const { data: expiredEvents, error } = await supabaseAdmin
    .from("events")
    .select("id, slug")
    .lte("expires_at", nowIso);

  if (error) throw new Error(error.message);

  const purgedSlugs: string[] = [];

  for (const event of expiredEvents || []) {
    const { data: photos } = await supabaseAdmin
      .from("photos")
      .select("storage_path")
      .eq("event_id", event.id);

    const paths = (photos || []).map((p) => p.storage_path);
    if (paths.length > 0) {
      await supabaseAdmin.storage.from(PHOTOS_BUCKET).remove(paths);
    }

    await supabaseAdmin.from("events").delete().eq("id", event.id);
    purgedSlugs.push(event.slug);
  }

  return { purgedSlugs };
}
