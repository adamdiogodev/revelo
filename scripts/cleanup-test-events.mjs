import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import ws from "ws";

function loadEnvLocal() {
  const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
}
loadEnvLocal();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

const slugs = process.argv.slice(2);

for (const slug of slugs) {
  const { data: event } = await supabase.from("events").select("id").eq("slug", slug).maybeSingle();
  if (!event) {
    console.log(slug, "-> não encontrado");
    continue;
  }

  const { data: photos } = await supabase.from("photos").select("storage_path").eq("event_id", event.id);
  if (photos && photos.length > 0) {
    const paths = photos.map((p) => p.storage_path);
    await supabase.storage.from("photos").remove(paths);
  }

  await supabase.from("events").delete().eq("id", event.id);
  console.log(slug, `-> removido (${photos?.length || 0} fotos)`);
}
