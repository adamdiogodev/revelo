import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase-admin";

export type UploadPhotoResult =
  | { ok: true; posesUsadas: number; posesPorConvidado: number }
  | { ok: false; reason: "sem_poses" | "revelacao_iniciada" | "erro" };

async function incrementGuestPose(guestId: string) {
  const { data, error } = await supabaseAdmin.rpc("increment_guest_pose", {
    p_guest_id: guestId,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row as { poses_usadas: number; poses_por_convidado: number; allowed: boolean };
}

async function decrementGuestPose(guestId: string) {
  await supabaseAdmin.rpc("decrement_guest_pose", { p_guest_id: guestId });
}

/** Baixa os bytes de um conjunto de fotos do evento, na ordem em que foram tiradas. */
export async function downloadPhotosByIds(
  eventId: string,
  photoIds: string[]
): Promise<Buffer[]> {
  const { data: rows, error } = await supabaseAdmin
    .from("photos")
    .select("id, storage_path, taken_at")
    .eq("event_id", eventId)
    .in("id", photoIds)
    .order("taken_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return [];

  const buffers = await Promise.all(
    rows.map(async (row) => {
      const { data, error: downloadError } = await supabaseAdmin.storage
        .from(PHOTOS_BUCKET)
        .download(row.storage_path);
      if (downloadError || !data) return null;
      return Buffer.from(await data.arrayBuffer());
    })
  );

  return buffers.filter((b) => b !== null);
}

export async function deletePhoto(eventId: string, photoId: string): Promise<boolean> {
  const { data: photo, error } = await supabaseAdmin
    .from("photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error || !photo) return false;

  await supabaseAdmin.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);
  const { error: deleteError } = await supabaseAdmin
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("event_id", eventId);

  return !deleteError;
}

export async function uploadGuestPhoto(params: {
  eventId: string;
  guestId: string;
  challengeId: string | null;
  fileBuffer: Buffer;
}): Promise<UploadPhotoResult> {
  const { eventId, guestId, challengeId, fileBuffer } = params;

  const photoId = randomUUID();
  const storagePath = `${eventId}/${guestId}/${photoId}.jpg`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(PHOTOS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, reason: "erro" };
  }

  let reservation;
  try {
    reservation = await incrementGuestPose(guestId);
  } catch {
    await supabaseAdmin.storage.from(PHOTOS_BUCKET).remove([storagePath]);
    return { ok: false, reason: "erro" };
  }

  if (!reservation.allowed) {
    await supabaseAdmin.storage.from(PHOTOS_BUCKET).remove([storagePath]);
    const nowLimited = reservation.poses_usadas >= reservation.poses_por_convidado;
    return { ok: false, reason: nowLimited ? "sem_poses" : "revelacao_iniciada" };
  }

  const { error: insertError } = await supabaseAdmin.from("photos").insert({
    id: photoId,
    event_id: eventId,
    guest_id: guestId,
    storage_path: storagePath,
    challenge_id: challengeId,
  });

  if (insertError) {
    await decrementGuestPose(guestId);
    await supabaseAdmin.storage.from(PHOTOS_BUCKET).remove([storagePath]);
    return { ok: false, reason: "erro" };
  }

  return {
    ok: true,
    posesUsadas: reservation.poses_usadas,
    posesPorConvidado: reservation.poses_por_convidado,
  };
}
