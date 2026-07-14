import "server-only";
import slugify from "slugify";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { EventRow, HostEventSummary, PublicEventInfo } from "@/lib/types";

function randomSuffix(length = 4) {
  return Math.random().toString(36).slice(2, 2 + length);
}

function generateCodigoAcesso(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

async function generateUniqueSlug(nome: string): Promise<string> {
  const base = slugify(nome, { lower: true, strict: true, locale: "pt" }) || "festa";

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomSuffix(attempt + 2)}`;
    const { data, error } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return candidate;
  }

  throw new Error("Não foi possível gerar um link único para o evento. Tente outro nome.");
}

export type CreateEventInput = {
  hostUserId: string;
  nome: string;
  revealAt: Date;
  posesPorConvidado: number;
  maxConvidados: number;
  modoDesafios: boolean;
  challenges: { titulo: string; emoji: string }[];
};

export async function createEvent(
  input: CreateEventInput
): Promise<{ slug: string; codigoAcesso: string; eventId: string }> {
  const slug = await generateUniqueSlug(input.nome);
  const codigoAcesso = generateCodigoAcesso();
  const expiresAt = new Date(input.revealAt.getTime() + 24 * 60 * 60 * 1000);

  const { data: event, error } = await supabaseAdmin
    .from("events")
    .insert({
      host_user_id: input.hostUserId,
      nome: input.nome,
      slug,
      codigo_acesso: codigoAcesso,
      reveal_at: input.revealAt.toISOString(),
      poses_por_convidado: input.posesPorConvidado,
      max_convidados: input.maxConvidados,
      modo_desafios: input.modoDesafios,
      expires_at: expiresAt.toISOString(),
    })
    .select("id, slug, codigo_acesso")
    .single();

  if (error || !event) {
    throw new Error(error?.message || "Falha ao criar evento.");
  }

  if (input.modoDesafios && input.challenges.length > 0) {
    const { error: challengesError } = await supabaseAdmin.from("challenges").insert(
      input.challenges.map((c) => ({
        event_id: event.id,
        titulo: c.titulo,
        emoji: c.emoji || "📸",
      }))
    );
    if (challengesError) throw new Error(challengesError.message);
  }

  return { slug: event.slug, codigoAcesso: event.codigo_acesso, eventId: event.id };
}

export async function getEventRowBySlug(slug: string): Promise<EventRow | null> {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as EventRow | null;
}

export function computeFase(event: EventRow, now: Date): PublicEventInfo["fase"] {
  const reveal = new Date(event.reveal_at).getTime();
  const expires = new Date(event.expires_at).getTime();
  const nowMs = now.getTime();
  if (nowMs >= expires) return "expirada";
  if (nowMs >= reveal) return "revelada";
  return "captura";
}

export async function getPublicEventBySlug(slug: string): Promise<PublicEventInfo | null> {
  const event = await getEventRowBySlug(slug);
  if (!event) return null;

  const now = new Date();

  const [{ count: totalFotos }, { count: totalConvidados }, { data: challenges }] = await Promise.all([
    supabaseAdmin
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id),
    supabaseAdmin
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id),
    supabaseAdmin
      .from("challenges")
      .select("id, titulo, emoji")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    nome: event.nome,
    slug: event.slug,
    revealAt: event.reveal_at,
    expiresAt: event.expires_at,
    posesPorConvidado: event.poses_por_convidado,
    modoDesafios: event.modo_desafios,
    challenges: challenges || [],
    now: now.toISOString(),
    totalFotos: totalFotos || 0,
    totalConvidados: totalConvidados || 0,
    maxConvidados: event.max_convidados,
    fase: computeFase(event, now),
  };
}

export async function setEventMaxConvidados(eventId: string, maxConvidados: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from("events")
    .update({ max_convidados: maxConvidados })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
}

/** Evento + verificação de posse: só retorna algo se o evento pertencer a este anfitrião logado. */
export async function getEventForHost(slug: string, hostUserId: string): Promise<EventRow | null> {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("host_user_id", hostUserId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as EventRow | null;
}

export async function getEventsByHostUser(hostUserId: string): Promise<HostEventSummary[]> {
  const { data: events, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("host_user_id", hostUserId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!events || events.length === 0) return [];

  const now = new Date();

  const summaries = await Promise.all(
    (events as EventRow[]).map(async (event) => {
      const [{ count: totalFotos }, { count: totalConvidados }] = await Promise.all([
        supabaseAdmin
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("event_id", event.id),
        supabaseAdmin
          .from("guests")
          .select("id", { count: "exact", head: true })
          .eq("event_id", event.id),
      ]);

      return {
        slug: event.slug,
        nome: event.nome,
        revealAt: event.reveal_at,
        expiresAt: event.expires_at,
        codigoAcesso: event.codigo_acesso,
        totalFotos: totalFotos || 0,
        totalConvidados: totalConvidados || 0,
        maxConvidados: event.max_convidados,
        fase: computeFase(event, now),
      } satisfies HostEventSummary;
    })
  );

  return summaries;
}
