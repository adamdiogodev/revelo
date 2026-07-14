import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { GuestRow } from "@/lib/types";

export async function createGuest(eventId: string, nome: string): Promise<GuestRow> {
  const { data, error } = await supabaseAdmin
    .from("guests")
    .insert({ event_id: eventId, nome: nome.trim().slice(0, 60) })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Falha ao entrar no evento.");
  return data as GuestRow;
}

export async function countGuestsForEvent(eventId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  return count || 0;
}

export async function getGuestByToken(eventId: string, guestToken: string): Promise<GuestRow | null> {
  const { data, error } = await supabaseAdmin
    .from("guests")
    .select("*")
    .eq("event_id", eventId)
    .eq("guest_token", guestToken)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as GuestRow | null;
}

/** IDs de desafios que este convidado já tentou pelo menos uma vez (para marcar ✔️ no carrossel). */
export async function getGuestCompletedChallengeIds(guestId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("photos")
    .select("challenge_id")
    .eq("guest_id", guestId)
    .not("challenge_id", "is", null);

  if (error) throw new Error(error.message);
  return Array.from(new Set((data || []).map((p) => p.challenge_id as string)));
}
