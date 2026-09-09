import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Plus, Users, Images, ChevronRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEventsByHostUser } from "@/lib/data/events";
import { formatGuestLimit } from "@/lib/pricing";
import SignOutButton from "@/components/SignOutButton";
import type { HostEventSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

const PHASE: Record<HostEventSummary["fase"], { label: string; tone: string }> = {
  captura: { label: "Live", tone: "border-accent/40 bg-accent/15 text-accent-soft" },
  revelada: { label: "Revealed", tone: "" },
  expirada: { label: "Ended", tone: "" },
};

function firstName(email: string) {
  const handle = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return handle.charAt(0).toUpperCase() + handle.slice(1);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const events = await getEventsByHostUser(user.id);
  const live = events.filter((e) => e.fase === "captura").length;

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="ambient" />

      <div className="relative z-10 mx-auto w-full max-w-md px-5 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between">
          <Image src="/logo.png" alt="Revelo" width={120} height={61} className="h-auto w-24" />
          <SignOutButton />
        </header>

        <div className="mt-8">
          <p className="label-caps">host panel</p>
          <h1 className="mt-2 font-display text-3xl italic leading-tight text-ink">
            Hi, {firstName(user.email ?? "there")}!
          </h1>
          <p className="mt-2 text-sm text-muted">
            {events.length === 0
              ? "Nothing developed yet — let's change that."
              : `${events.length} part${events.length === 1 ? "y" : "ies"}${live > 0 ? ` · ${live} live right now` : ""}`}
          </p>
        </div>

        {events.length === 0 && (
          <Link
            href="/dashboard/new"
            className="card mt-6 flex flex-col items-center gap-3 px-6 py-10 text-center animate-[riseIn_500ms_ease-out]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent-soft">
              <Sparkles size={22} />
            </span>
            <p className="font-display text-xl italic text-ink">Your first party</p>
            <p className="max-w-[16rem] text-sm text-muted">
              Set a reveal time, share a QR code, and let the night fill the roll.
            </p>
          </Link>
        )}

        <div className="mt-6 space-y-3">
          {events.map((event, i) => {
            const phase = PHASE[event.fase];
            return (
              <Link
                key={event.slug}
                href={`/${event.slug}/host`}
                className="card block overflow-hidden animate-[riseIn_500ms_ease-out_both]"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="flex items-center gap-4 p-3.5">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-2xl bg-bg-elevated">
                    {event.capaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.capaUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-muted">
                        <Images size={20} />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-display text-xl italic text-ink">{event.nome}</h2>
                      <span className={`badge shrink-0 ${phase.tone}`}>{phase.label}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-[13px] text-muted">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} />
                        {event.totalConvidados}/{formatGuestLimit(event.maxConvidados)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Images size={13} />
                        {event.totalFotos}
                      </span>
                    </div>

                    <p className="mt-2 font-mono text-xs tracking-[0.35em] text-ink/60">
                      {event.codigoAcesso}
                    </p>
                  </div>

                  <ChevronRight size={18} className="shrink-0 text-muted" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-bg via-bg/90 to-transparent px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-8">
        <Link href="/dashboard/new" className="btn btn-primary w-full max-w-md">
          <Plus size={18} />
          New party
        </Link>
      </div>
    </div>
  );
}
