"use client";

import { useMemo, useState } from "react";
import { X, Download, Trash2, Clapperboard, Check } from "lucide-react";
import type { RevealPhoto } from "@/lib/types";

const MAX_VIDEO_PHOTOS = 10;

export default function PhotoGrid({
  photos,
  guestNames,
  challengeTitles,
  slug,
  isHost,
}: {
  photos: RevealPhoto[];
  guestNames: string[];
  challengeTitles: string[];
  slug: string;
  isHost?: boolean;
}) {
  const [localPhotos, setLocalPhotos] = useState(photos);
  const [filterGuest, setFilterGuest] = useState("");
  const [filterChallenge, setFilterChallenge] = useState("");
  const [openPhoto, setOpenPhoto] = useState<RevealPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return localPhotos.filter((p) => {
      if (filterGuest && p.guestNome !== filterGuest) return false;
      if (filterChallenge && p.challengeTitulo !== filterChallenge) return false;
      return true;
    });
  }, [localPhotos, filterGuest, filterChallenge]);

  async function handleDelete(photo: RevealPhoto) {
    if (!isHost) return;
    if (!window.confirm("Excluir esta foto para sempre? Não dá para desfazer.")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${slug}/photos/${photo.id}`, { method: "DELETE" });
      if (res.ok) {
        setLocalPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        setOpenPhoto(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedIds([]);
    setVideoError(null);
  }

  function toggleSelected(photoId: string) {
    setSelectedIds((prev) => {
      if (prev.includes(photoId)) return prev.filter((id) => id !== photoId);
      if (prev.length >= MAX_VIDEO_PHOTOS) return prev;
      return [...prev, photoId];
    });
  }

  async function handleGenerateVideo() {
    setVideoLoading(true);
    setVideoError(null);
    try {
      const res = await fetch(`/api/events/${slug}/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: selectedIds }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Falha ao gerar o vídeo." }));
        setVideoError(data.error || "Falha ao gerar o vídeo.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug}-video.mp4`;
      link.click();
      URL.revokeObjectURL(url);
      setSelectMode(false);
      setSelectedIds([]);
    } catch {
      setVideoError("Sem conexão. Tente de novo.");
    } finally {
      setVideoLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h2 className="text-center font-display text-2xl italic text-ink">Todas as fotos</h2>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <select
          value={filterGuest}
          onChange={(e) => setFilterGuest(e.target.value)}
          className="rounded-full border border-ink/15 bg-bg-raised px-3 py-1.5 text-sm text-ink"
        >
          <option value="">Todas as pessoas</option>
          {guestNames.map((n) => (
            <option key={n} value={n} className="text-black">
              {n}
            </option>
          ))}
        </select>

        {challengeTitles.length > 0 && (
          <select
            value={filterChallenge}
            onChange={(e) => setFilterChallenge(e.target.value)}
            className="rounded-full border border-ink/15 bg-bg-raised px-3 py-1.5 text-sm text-ink"
          >
            <option value="">Todos os desafios</option>
            {challengeTitles.map((t) => (
              <option key={t} value={t} className="text-black">
                {t}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={toggleSelectMode}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
            selectMode ? "border-accent bg-accent text-accent-ink" : "border-ink/15 bg-bg-raised text-ink"
          }`}
        >
          <Clapperboard size={14} />
          {selectMode ? "Cancelar" : "Criar vídeo"}
        </button>
      </div>

      {selectMode && (
        <p className="mt-3 text-center text-xs text-muted">
          Toque em até {MAX_VIDEO_PHOTOS} fotos para montar um vídeo pra postar no Instagram.
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((p) => {
          const selected = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => (selectMode ? toggleSelected(p.id) : setOpenPhoto(p))}
              className="relative aspect-square overflow-hidden rounded-lg bg-bg-raised"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.viewUrl} alt={`Foto de ${p.guestNome}`} className="h-full w-full object-cover" />
              {selectMode && (
                <span
                  className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    selected ? "border-accent bg-accent text-accent-ink" : "border-ink/60 bg-black/30"
                  }`}
                >
                  {selected && <Check size={14} />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-muted">Nenhuma foto encontrada com esse filtro.</p>
      )}

      {selectMode && selectedIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-3 border-t border-ink/10 bg-bg/95 p-4 backdrop-blur">
          <span className="text-sm text-muted">
            {selectedIds.length}/{MAX_VIDEO_PHOTOS} selecionadas
          </span>
          <button
            onClick={handleGenerateVideo}
            disabled={videoLoading}
            className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-bg disabled:opacity-50"
          >
            <Clapperboard size={16} />
            {videoLoading ? "Gerando vídeo…" : "Gerar vídeo"}
          </button>
        </div>
      )}
      {videoError && <p className="mt-4 text-center text-sm text-danger">{videoError}</p>}

      {openPhoto && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
          onClick={() => setOpenPhoto(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={openPhoto.viewUrl}
            alt={`Foto de ${openPhoto.guestNome}`}
            className="max-h-[75vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-4 text-center text-ink">
            <p className="font-display text-lg italic">{openPhoto.guestNome}</p>
            <p className="text-sm text-ink/60">
              {new Date(openPhoto.takenAt).toLocaleString("pt-BR")}
            </p>
            {openPhoto.challengeTitulo && (
              <p className="mt-1 text-sm text-accent">🎯 {openPhoto.challengeTitulo}</p>
            )}
            <div className="mt-4 flex justify-center gap-3">
              <a
                href={openPhoto.downloadUrl}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-semibold text-bg"
              >
                <Download size={16} />
                Baixar
              </a>
              {isHost && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(openPhoto);
                  }}
                  disabled={deleting}
                  className="flex items-center gap-2 rounded-full bg-danger px-5 py-2.5 font-semibold text-bg disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  {deleting ? "Excluindo…" : "Excluir"}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setOpenPhoto(null)}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] text-ink/70"
            aria-label="Fechar"
          >
            <X size={26} />
          </button>
        </div>
      )}
    </div>
  );
}
