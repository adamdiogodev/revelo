import type { Config } from "@netlify/functions";

// Equivalente ao cron do vercel.json, mas no formato de Scheduled Function
// do Netlify — só chama a mesma rota /api/cron/cleanup do próprio site.
export default async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_URL;
  const secret = process.env.CRON_SECRET;

  if (!siteUrl || !secret) {
    console.error("Faltam as variáveis URL/CRON_SECRET para o cleanup agendado.");
    return new Response("missing env", { status: 500 });
  }

  const res = await fetch(`${siteUrl}/api/cron/cleanup`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.text();
  return new Response(body, { status: res.status });
};

export const config: Config = {
  schedule: "0 * * * *",
};
