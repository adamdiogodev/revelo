import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Faltam as variáveis NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)."
  );
}

// Cliente com a service role key: só roda no servidor (Route Handlers / Server
// Components), nunca é enviado ao navegador. Ele ignora RLS de propósito — toda
// regra de negócio (limite de poses, hora da revelação) é validada aqui no
// backend antes de qualquer leitura/escrita, nunca confiando no relógio do cliente.
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

export const PHOTOS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "photos";
export const COVERS_BUCKET = "covers";
