"use client";

import { useCallback, useEffect, useState } from "react";
import { Film, Download, AlertTriangle, Play } from "lucide-react";
import Slideshow from "@/components/Slideshow";
import PhotoGrid from "@/components/PhotoGrid";
import { useCountdown } from "@/lib/use-countdown";
import type { RevealPayload } from "@/lib/types";

type Stage = "loading" | "intro" | "slideshow" | "grid" | "expirada" | "erro";

export default function RevealExperience({
  slug,
  isHost,
}: {
  slug: string;
  isHost?: boolean;
}) {
  const [payload, setPayload] = useState<RevealPayload | null>(null);
  const [stage, setStage] = useState<Stage>("loading");

  useEffect(() => {
    fetch(`/api/events/${slug}/reveal`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: RevealPayload) => {
        setPayload(data);
        if (data.fase === "expirada") setStage("expirada");
        else setStage("intro");
      })
      .catch(() => setStage("erro"));
  }, [slug]);

  useEffect(() => {
    if (stage !== "intro") return;
    const id = setTimeout(() => setStage("slideshow"), 2600);
    return () => clearTimeout(id);
  }, [stage]);

  const expiresAt = payload?.expiresAt;
  // Enquanto o payload real não chega, usa uma data bem distante como alvo
  // (nunca "agora") para não disparar a tela de expirada por engano.
  const expireMs = useCountdown(expiresAt || "2999-01-01T00:00:00.000Z");

  useEffect(() => {
    if (expiresAt && expireMs <= 0 && stage !== "expirada") {
      setStage("expirada");
    }
  }, [expireMs, expiresAt, stage]);

  // Importante: precisa ser estável entre renders. O RevealExperience
  // re-renderiza a cada segundo (por causa do useCountdown), e se essa
  // função fosse recriada a cada vez, o efeito de auto-avanço do
  // Slideshow reiniciava o timer sem parar e a foto nunca trocava.
  const handleSlideshowFinish = useCallback(() => setStage("grid"), []);

  if (stage === "loading") {
    return <FullscreenMessage>carregando…</FullscreenMessage>;
  }

  if (stage === "erro") {
    return (
      <FullscreenMessage icon={<AlertTriangle size={26} />}>
        Não deu para carregar a revelação. Recarregue a página.
      </FullscreenMessage>
    );
  }

  if (stage === "expirada") {
    return (
      <FullscreenMessage icon={<Film size={26} />}>
        <p className="font-display text-xl italic text-ink">Esse rolê já virou lembrança.</p>
        <p className="mt-2 text-muted">As fotos foram apagadas.</p>
      </FullscreenMessage>
    );
  }

  if (!payload) return null;

  if (stage === "intro") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-5 bg-bg text-ink">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-raised text-accent animate-[spin-slow_2.5s_linear_infinite]">
          <Film size={26} />
        </div>
        <p className="font-display text-2xl italic">Revelando o filme…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      {stage === "slideshow" && (
        <Slideshow
          freePhotos={payload.freePhotos}
          chapters={payload.chapters}
          onFinish={handleSlideshowFinish}
        />
      )}

      {stage === "grid" && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-3 py-4">
            <button
              onClick={() => setStage("slideshow")}
              className="flex items-center gap-2 rounded-full bg-bg-raised px-5 py-2.5 text-sm font-semibold text-ink"
            >
              <Play size={16} />
              Ver slideshow
            </button>
            {isHost && (
              <a
                href={`/api/events/${slug}/zip`}
                className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg"
              >
                <Download size={16} />
                Baixar álbum completo (.zip)
              </a>
            )}
          </div>
          <PhotoGrid
            photos={payload.allPhotos}
            guestNames={payload.guestNames}
            challengeTitles={Array.from(new Set(payload.chapters.map((c) => c.titulo)))}
            slug={slug}
            isHost={isHost}
          />
          <div className="h-16" />
        </>
      )}
    </div>
  );
}

function FullscreenMessage({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 bg-bg px-6 text-center text-ink">
      {icon && (
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg-raised text-ink/70">
          {icon}
        </div>
      )}
      {children}
    </div>
  );
}
