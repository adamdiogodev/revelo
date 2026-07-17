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
  { realtime: { transport: (await import("ws")).default } }
);

const bucket = "covers";
const { data: buckets } = await supabase.storage.listBuckets();
const exists = buckets?.some((b) => b.name === bucket);

if (exists) {
  console.log(`Bucket "${bucket}" já existe.`);
} else {
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error) {
    console.error("Erro ao criar bucket:", error.message);
    process.exit(1);
  }
  console.log(`Bucket "${bucket}" criado (público).`);
}
