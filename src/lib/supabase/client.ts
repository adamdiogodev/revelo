import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para o navegador — usa só a anon key, usada
 * exclusivamente para autenticação (login/cadastro do anfitrião).
 * Nenhum dado de evento/foto/convidado é lido por aqui: isso continua
 * indo sempre pelo backend com a service role key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
