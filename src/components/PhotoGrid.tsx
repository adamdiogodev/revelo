"use client";

import { useMemo, useState } from "react";
import { X, Download, Trash2 } from "lucide-react";
import type { RevealPhoto } from "@/lib/types";

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
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpenPhoto(p)}
            className="aspect-square overflow-hidden rounded-lg bg-bg-raised"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.viewUrl} alt={`Foto de ${p.guestNome}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-muted">Nenhuma foto encontrada com esse filtro.</p>
      )}

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
