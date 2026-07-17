import "server-only";
import { supabaseAdmin, PHOTOS_BUCKET } from "@/lib/supabase-admin";
import { computeFase, getEventRowBySlug } from "@/lib/data/events";
import type { RevealChapter, RevealPayload, RevealPhoto } from "@/lib/types";

const SIGNED_URL_TTL_SECONDS = 6 * 60 * 60; // 6h — suficiente para uma sessão de slideshow

type PhotoJoinRow = {
  id: string;
  storage_path: string;
  taken_at: string;
  challenge_id: string | null;
  guests: { nome: string } | { nome: string }[] | null;
  challenges: { titulo: string; emoji: string } | { titulo: string; emoji: string }[] | null;
};

function firstOf<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export async function getRevealPayload(slug: string): Promise<RevealPayload | null> {
  const event = await getEventRowBySlug(slug);
  if (!event) return null;

  const now = new Date();
  // Nunca confiar em relógio de cliente: a fase (e portanto se as fotos
  // podem ser servidas) é sempre recalculada aqui a partir do timestamp do banco.
  const fase = computeFase(event, now);

  const base = {
    fase,
    nome: event.nome,
    revealAt: event.reveal_at,
    expiresAt: event.expires_at,
    capaUrl: event.capa_url,
  };

  if (fase !== "revelada") {
    return { ...base, freePhotos: [], chapters: [], allPhotos: [], guestNames: [] };
  }

  const { data: photos, error } = await supabaseAdmin
    .from("photos")
    .select(
      "id, storage_path, taken_at, challenge_id, guests(nome), challenges(titulo, emoji)"
    )
    .eq("event_id", event.id)
    .order("taken_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (photos || []) as unknown as PhotoJoinRow[];

  const paths = rows.map((r) => r.storage_path);
  const [viewSigned, downloadSigned] = await Promise.all([
    paths.length
      ? supabaseAdmin.storage.from(PHOTOS_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
      : Promise.resolve({ data: [], error: null }),
    paths.length
      ? Promise.all(
          rows.map((r, i) =>
            supabaseAdmin.storage
              .from(PHOTOS_BUCKET)
              .createSignedUrl(r.storage_path, SIGNED_URL_TTL_SECONDS, {
                download: `foto-${i + 1}.jpg`,
              })
          )
        )
      : Promise.resolve([]),
  ]);

  const viewUrlByPath = new Map<string, string>();
  for (const item of viewSigned.data || []) {
    if (item?.signedUrl) viewUrlByPath.set(item.path ?? "", item.signedUrl);
  }

  const revealPhotos: RevealPhoto[] = rows.map((r, i) => {
    const guestNome = firstOf(r.guests)?.nome || "Convidado";
    const challenge = firstOf(r.challenges);
    return {
      id: r.id,
      guestNome,
      takenAt: r.taken_at,
      viewUrl: viewUrlByPath.get(r.storage_path) || "",
      downloadUrl: (downloadSigned as { data?: { signedUrl?: string } }[])[i]?.data?.signedUrl || "",
      challengeId: r.challenge_id,
      challengeTitulo: challenge?.titulo || null,
    };
  });

  const freePhotos = revealPhotos.filter((p) => !p.challengeId);

  const { data: challengeRows } = await supabaseAdmin
    .from("challenges")
    .select("id, titulo, emoji")
    .eq("event_id", event.id)
    .order("created_at", { ascending: true });

  const chapters: RevealChapter[] = (challengeRows || [])
    .map((c) => ({
      challengeId: c.id,
      titulo: c.titulo,
      emoji: c.emoji,
      photos: revealPhotos.filter((p) => p.challengeId === c.id),
    }))
    .filter((c) => c.photos.length > 0);

  const guestNames = Array.from(new Set(revealPhotos.map((p) => p.guestNome))).sort();

  return {
    ...base,
    freePhotos,
    chapters,
    allPhotos: revealPhotos,
    guestNames,
  };
}
