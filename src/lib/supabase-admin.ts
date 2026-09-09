import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)."
  );
}

// Client with the service role key: server only (Route Handlers / Server
// Components), never shipped to the browser. It bypasses RLS on purpose — every
// business rule (shot limit, reveal time) is validated here on the backend
// before any read/write, never trusting the client clock.
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

export const PHOTOS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "photos";
export const COVERS_BUCKET = "covers";
