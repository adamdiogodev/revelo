import "server-only";
import { supabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase-admin";

/**
 * Permanently deletes photos + events whose expires_at has passed.
 * The "nobody sees anything after it expires" rule is already enforced by the
 * phase gate (reveal.ts) even before this job runs — this is only the physical
 * cleanup of Storage/database, for privacy and cost.
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
