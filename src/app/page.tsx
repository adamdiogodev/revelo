import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { QrCode, Camera, Sparkles, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: QrCode,
    step: "01",
    title: "Scan",
    text: "Guests join in one tap with a QR code. No app, no sign-up.",
  },
  {
    icon: Camera,
    step: "02",
    title: "Shoot blind",
    text: "A limited roll of film. Nobody sees a single shot — not even you.",
  },
  {
    icon: Sparkles,
    step: "03",
    title: "Reveal",
    text: "At the hour you set, the whole album is developed at once.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <div className="ambient" />

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="Revelo"
            width={220}
            height={111}
            priority
            className="h-auto w-28"
          />
          <Link href="/login" className="badge">
            Sign in
          </Link>
        </header>

        <div className="mt-10 animate-[riseIn_600ms_ease-out]">
          <p className="label-caps">the disposable party camera</p>
          <h1 className="mt-3 font-display text-[2.6rem] italic leading-[1.05] tracking-tight text-ink">
            Everyone shoots.
            <br />
            <span className="text-accent-soft">Nobody peeks.</span>
          </h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
            Your guests fill a roll of film through the night. It all stays sealed until the
            moment you choose — then the party is revealed together.
          </p>
        </div>

        <div className="mt-8 space-y-2.5">
          {STEPS.map(({ icon: Icon, step, title, text }, i) => (
            <div
              key={step}
              className="card flex items-start gap-4 p-4 animate-[riseIn_600ms_ease-out_both]"
              style={{ animationDelay: `${120 + i * 90}ms` }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent-soft">
                <Icon size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-display text-lg italic leading-none text-ink">{title}</h2>
                  <span className="font-mono text-[10px] text-muted">{step}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-snug text-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1" />

        <div className="mt-10">
          <Link href="/login" className="btn btn-primary w-full">
            Start a party
            <ArrowRight size={17} />
          </Link>
          <p className="mt-3 text-center text-xs text-muted">
            Free for up to 5 guests · no app to install
          </p>
        </div>
      </main>
    </div>
  );
}
