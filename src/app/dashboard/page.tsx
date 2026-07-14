import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Plus, Users, Images } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEventsByHostUser } from "@/lib/data/events";
import SignOutButton from "@/components/SignOutButton";
import type { HostEventSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

const FASE_LABEL: Record<HostEventSummary["fase"], string> = {
  captura: "Em andamento",
  revelada: "Revelado",
  expirada: "Encerrado",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const events = await getEventsByHostUser(user.id);

  return (
    <div className="min-h-dvh bg-bg px-6 py-10 text-ink">
      <div className="mx-auto max-w-md">
        <Image src="/logo.png" alt="Revelo" width={120} height={61} className="h-auto w-28" />

        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">seus eventos</p>
            <h1 className="mt-1 font-display text-2xl italic text-ink">{user.email}</h1>
          </div>
          <SignOutButton />
        </div>

        <Link
          href="/dashboard/novo"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 font-semibold text-bg"
        >
          <Plus size={18} />
          Criar novo evento
        </Link>

        <div className="mt-8 space-y-3">
          {events.length === 0 && (
            <p className="py-12 text-center text-muted">Você ainda não criou nenhum evento.</p>
          )}

          {events.map((event) => (
            <Link
              key={event.slug}
              href={`/${event.slug}/host`}
              className="block rounded-2xl border border-ink/10 bg-bg-raised p-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl italic text-ink">{event.nome}</h2>
                <span className="rounded-full bg-bg px-3 py-1 text-xs text-muted">
                  {FASE_LABEL[event.fase]}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <Users size={14} />
                  {event.totalConvidados}/{event.maxConvidados}
                </span>
                <span className="flex items-center gap-1.5">
                  <Images size={14} />
                  {event.totalFotos}
                </span>
                <span className="ml-auto font-mono tracking-widest text-ink/70">
                  {event.codigoAcesso}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
