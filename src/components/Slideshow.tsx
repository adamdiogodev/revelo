"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SkipBack, SkipForward, Play, Pause, Volume2, VolumeX, X } from "lucide-react";
import type { RevealChapter, RevealPhoto } from "@/lib/types";
import { useWakeLock } from "@/lib/use-wake-lock";

type Slide =
  | { kind: "title"; nome: string; capaUrl: string | null }
  | { kind: "photo"; photo: RevealPhoto }
  | { kind: "chapter"; titulo: string; emoji: string };

const TITLE_DURATION_MS = 3200;
const PHOTO_DURATION_MS = 4000;
const CHAPTER_DURATION_MS = 2200;

function durationFor(slide: Slide) {
  if (slide.kind === "title") return TITLE_DURATION_MS;
  if (slide.kind === "chapter") return CHAPTER_DURATION_MS;
  return PHOTO_DURATION_MS;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function Slideshow({
  eventNome,
  capaUrl,
  freePhotos,
  chapters,
  onFinish,
}: {
  eventNome: string;
  capaUrl: string | null;
  freePhotos: RevealPhoto[];
  chapters: RevealChapter[];
  onFinish: () => void;
}) {
  const slides = useMemo<Slide[]>(() => {
    const s: Slide[] = [{ kind: "title", nome: eventNome, capaUrl }];
    for (const photo of freePhotos) s.push({ kind: "photo", photo });
    for (const chapter of chapters) {
      s.push({ kind: "chapter", titulo: chapter.titulo, emoji: chapter.emoji });
      for (const photo of chapter.photos) s.push({ kind: "photo", photo });
    }
    return s;
  }, [eventNome, capaUrl, freePhotos, chapters]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useWakeLock(true);

  useEffect(() => {
    if (paused || slides.length === 0) return;
    const duration = durationFor(slides[index]);

    const id = setTimeout(() => {
      if (index >= slides.length - 1) {
        onFinish();
      } else {
        setIndex((i) => i + 1);
      }
    }, duration);

    return () => clearTimeout(id);
  }, [index, paused, slides, onFinish]);

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }
  function goNext() {
    if (index >= slides.length - 1) onFinish();
    else setIndex((i) => i + 1);
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    if (muted) {
      audio.muted = false;
      audio.play().catch(() => {});
      setMuted(false);
    } else {
      audio.muted = true;
      setMuted(true);
    }
  }

  const slide = slides[index];

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <audio ref={audioRef} src="/soundtrack.mp3" loop muted={muted} />

      {slide.kind === "title" && (
        <div key={index} className="relative h-full w-full animate-[fadeIn_600ms_ease-out]">
          {slide.capaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slide.capaUrl}
              alt=""
              className="h-full w-full object-cover animate-[kenBurns_3200ms_ease-out_both]"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-bg-raised to-black" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 px-8 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-soft">the reveal</p>
            <h1 className="mt-3 font-display text-4xl italic text-ink [text-shadow:0_2px_20px_rgba(0,0,0,0.6)]">
              {slide.nome}
            </h1>
          </div>
        </div>
      )}

      {slide.kind === "chapter" && (
        <div
          key={index}
          className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-ink animate-[fadeIn_500ms_ease-out]"
        >
          <div className="text-6xl">{slide.emoji}</div>
          <p className="text-sm uppercase tracking-widest text-accent-soft">Challenge</p>
          <h2 className="font-display text-3xl italic">{slide.titulo}</h2>
        </div>
      )}

      {slide.kind === "photo" && (
        <div key={index} className="relative h-full w-full animate-[fadeIn_500ms_ease-out]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.photo.viewUrl}
            alt={`Photo by ${slide.photo.guestNome}`}
            className="h-full w-full object-contain animate-[kenBurns_4000ms_ease-out_both]"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <p className="font-display text-lg italic text-ink">{slide.photo.guestNome}</p>
            <p className="text-sm text-ink/60">at {formatTime(slide.photo.takenAt)}</p>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 top-0 flex items-center gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex flex-1 gap-1">
          {slides.map((s, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-ink/20">
              {i < index && <div className="h-full w-full bg-accent-soft" />}
              {i === index && !paused && (
                <div
                  key={`${index}-${paused}`}
                  className="h-full bg-accent-soft"
                  style={{
                    animation: `slideProgress ${durationFor(s)}ms linear forwards`,
                  }}
                />
              )}
              {i === index && paused && <div className="h-full w-1/3 bg-accent-soft" />}
            </div>
          ))}
        </div>
        <button onClick={toggleMute} className="text-ink" aria-label="Sound">
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button onClick={onFinish} className="text-ink" aria-label="Close slideshow and see the grid">
          <X size={22} />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          onClick={goPrev}
          className="icon-btn h-11 w-11 bg-black/40"
          aria-label="Previous"
        >
          <SkipBack size={18} />
        </button>
        <button
          onClick={() => setPaused((p) => !p)}
          className="icon-btn h-14 w-14 bg-ink/15 backdrop-blur"
          aria-label={paused ? "Play" : "Pause"}
        >
          {paused ? <Play size={22} /> : <Pause size={22} />}
        </button>
        <button
          onClick={goNext}
          className="icon-btn h-11 w-11 bg-black/40"
          aria-label="Next"
        >
          <SkipForward size={18} />
        </button>
      </div>
    </div>
  );
}
