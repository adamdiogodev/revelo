"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Film, MessageCircle } from "lucide-react";
import { useCountdown, formatCountdown } from "@/lib/use-countdown";
import RevealExperience from "@/components/RevealExperience";
import type { PublicEventInfo } from "@/lib/types";

export default function HostDashboard({
  event: initialEvent,
  codigoAcesso,
  justCreated,
}: {
  event: PublicEventInfo;
  codigoAcesso: string;
  justCreated: boolean;
}) {
  const [event, setEvent] = useState(initialEvent);
  const [copied, setCopied] = useState(false);
  const [siteUrl, setSiteUrl] = useState(
    process.env.NEXT_PUBLIC_SITE_URL || ""
  );

  useEffect(() => {
    if (!siteUrl && typeof window !== "undefined") {
      setSiteUrl(window.location.origin);
    }
  }, [siteUrl]);

  useEffect(() => {
    const id = setInterval(() => {
      fetch(`/api/events/${event.slug}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: PublicEventInfo | null) => data && setEvent(data))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(id);
  }, [event.slug]);

  const guestUrl = siteUrl ? `${siteUrl}/${event.slug}` : `/${event.slug}`;

  const revealMs = useCountdown(event.revealAt);

  function copyLink() {
    navigator.clipboard.writeText(guestUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const text = `📸 Bora tirar fotos em ${event.nome}! Entre aqui: ${guestUrl}\nCódigo de entrada: ${codigoAcesso}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  if (event.fase === "revelada") {
    return <RevealExperience slug={event.slug} isHost />;
  }

  if (event.fase === "expirada") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-2 bg-bg px-6 text-center text-ink">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg-raised text-ink/70">
          <Film size={26} />
        </div>
        <p className="font-display text-xl italic">Esse rolê já virou lembrança.</p>
        <p className="mt-2 text-muted">As fotos foram apagadas.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg px-6 py-10 text-ink">
      <div className="mx-auto max-w-md space-y-8">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">painel do anfitrião</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">{event.nome}</h1>
        </div>

        {justCreated && (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 text-center">
            <p className="mb-4 font-medium text-ink">Convide seus convidados</p>
            <div className="flex justify-center rounded-xl bg-ink p-4">
              <QRCodeSVG value={guestUrl} size={200} />
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg bg-bg-raised px-3 py-2 text-sm">
              <span className="flex-1 truncate text-left text-ink/80">{guestUrl}</span>
              <button onClick={copyLink} className="flex items-center gap-1 font-medium text-accent">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "copiado" : "copiar"}
              </button>
            </div>

            <button
              onClick={shareWhatsApp}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-2.5 font-semibold text-bg"
            >
              <MessageCircle size={16} />
              Compartilhar no WhatsApp
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-ink/10 bg-bg-raised p-5 text-center">
          <p className="text-xs uppercase tracking-widest text-muted">Código de entrada</p>
          <p className="mt-2 flex justify-center gap-2">
            {codigoAcesso.split("").map((d, i) => (
              <span
                key={i}
                className="flex h-12 w-10 items-center justify-center rounded-lg bg-bg font-display text-2xl italic text-accent"
              >
                {d}
              </span>
            ))}
          </p>
          <p className="mt-3 text-xs text-muted">
            Compartilhe com seus convidados por fora do link — sem o código, ninguém entra.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-ink/10 bg-bg-raised p-5">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-muted">Revelação em</p>
            <p className="mt-1 font-display text-4xl italic tabular-nums text-accent">
              {revealMs > 0 ? formatCountdown(revealMs) : "revelando…"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-bg p-3">
              <p className="font-display text-2xl italic">
                {event.totalConvidados}
                <span className="text-base text-muted">/{event.maxConvidados}</span>
              </p>
              <p className="text-xs text-muted">convidados</p>
            </div>
            <div className="rounded-xl bg-bg p-3">
              <p className="font-display text-2xl italic">{event.totalFotos}</p>
              <p className="text-xs text-muted">fotos tiradas</p>
            </div>
          </div>

          {event.modoDesafios && event.challenges.length > 0 && (
            <p className="text-center text-sm text-muted">
              Modo desafios ativo · {event.challenges.length} desafios disponíveis
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
