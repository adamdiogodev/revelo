"use client";

import { useCallback, useEffect, useState } from "react";
import { Film, Download, AlertTriangle, Play } from "lucide-react";
import Slideshow from "@/components/Slideshow";
import PhotoGrid from "@/components/PhotoGrid";
import CoverBackground from "@/components/CoverBackground";
import { useCountdown } from "@/lib/use-countdown";
import type { RevealPayload } from "@/lib/types";

type Stage = "loading" | "intro" | "slideshow" | "grid" | "expirada" | "erro";

export default function RevealExperience({ slug, isHost }: { slug: string; isHost?: boolean }) {
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
  // Until the real payload arrives, aim at a far-future date (never "now") so we
  // do not flash the expired screen by mistake.
  const expireMs = useCountdown(expiresAt || "2999-01-01T00:00:00.000Z");

  useEffect(() => {
    if (expiresAt && expireMs <= 0 && stage !== "expirada") {
      setStage("expirada");
    }
  }, [expireMs, expiresAt, stage]);

  // Important: this has to stay stable across renders. RevealExperience
  // re-renders every second (because of useCountdown), and if this function were
  // recreated each time, the slideshow's auto-advance effect would keep
  // restarting its timer and the photo would never change.
  const handleSlideshowFinish = useCallback(() => setStage("grid"), []);

  if (stage === "loading") {
    return <FullscreenMessage>developing…</FullscreenMessage>;
  }

  if (stage === "erro") {
    return (
      <FullscreenMessage icon={<AlertTriangle size={24} />}>
        <p className="text-muted">We could not load the reveal. Please refresh the page.</p>
      </FullscreenMessage>
    );
  }

  if (stage === "expirada") {
    return (
      <FullscreenMessage icon={<Film size={24} />}>
        <p className="font-display text-xl italic text-ink">This one is a memory now.</p>
        <p className="mt-2 text-muted">The photos have been deleted.</p>
      </FullscreenMessage>
    );
  }

  if (!payload) return null;

  if (stage === "intro") {
    return (
      <div className="relative flex h-dvh flex-col items-center justify-center gap-6">
        <div className="ambient" />
        <CoverBackground url={payload.capaUrl} />
        <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-line)] bg-[rgba(247,240,237,0.06)] text-accent-soft animate-[spin-slow_2.5s_linear_infinite]">
          <Film size={24} />
        </div>
        <div className="relative z-10 text-center">
          <p className="label-caps">now developing</p>
          <p className="mt-2 font-display text-3xl italic text-ink">{payload.nome}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-bg">
      {stage === "slideshow" && (
        <Slideshow
          eventNome={payload.nome}
          capaUrl={payload.capaUrl}
          freePhotos={payload.freePhotos}
          chapters={payload.chapters}
          onFinish={handleSlideshowFinish}
        />
      )}

      {stage === "grid" && (
        <>
          <div className="ambient" />
          <CoverBackground url={payload.capaUrl} />
          <div className="relative z-10">
            <div className="mx-auto max-w-4xl px-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
              <div className="text-center">
                <p className="label-caps">revealed</p>
                <h1 className="mt-2 font-display text-[2rem] italic leading-tight text-ink">
                  {payload.nome}
                </h1>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={() => setStage("slideshow")}
                  className="btn btn-ghost px-5 py-2.5 text-sm"
                >
                  <Play size={16} />
                  Play slideshow
                </button>
                {isHost && (
                  <a href={`/api/events/${slug}/zip`} className="btn btn-primary px-5 py-2.5 text-sm">
                    <Download size={16} />
                    Download album (.zip)
                  </a>
                )}
              </div>
            </div>

            <PhotoGrid
              photos={payload.allPhotos}
              guestNames={payload.guestNames}
              challengeTitles={Array.from(new Set(payload.chapters.map((c) => c.titulo)))}
              slug={slug}
              isHost={isHost}
            />
            <div className="h-16" />
          </div>
        </>
      )}
    </div>
  );
}

function FullscreenMessage({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="relative flex h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="ambient" />
      {icon && (
        <div className="relative z-10 mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(247,240,237,0.06)] text-muted">
          {icon}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
