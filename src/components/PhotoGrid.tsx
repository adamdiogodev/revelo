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
    if (!window.confirm("Delete this photo forever? There is no undo.")) return;

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
        const data = await res.json().catch(() => ({ error: "We could not build the video." }));
        setVideoError(data.error || "We could not build the video.");
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
      setVideoError("No connection. Try again.");
    } finally {
      setVideoLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-baseline justify-center gap-2">
        <h2 className="font-display text-2xl italic text-ink">Every shot</h2>
        <span className="font-mono text-xs text-muted">{localPhotos.length}</span>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <select
          value={filterGuest}
          onChange={(e) => setFilterGuest(e.target.value)}
          className="rounded-full border border-[var(--color-line)] bg-[rgba(247,240,237,0.05)] px-3.5 py-1.5 text-sm text-ink"
        >
          <option value="">Everyone</option>
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
            className="rounded-full border border-[var(--color-line)] bg-[rgba(247,240,237,0.05)] px-3.5 py-1.5 text-sm text-ink"
          >
            <option value="">All challenges</option>
            {challengeTitles.map((t) => (
              <option key={t} value={t} className="text-black">
                {t}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={toggleSelectMode}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
            selectMode
              ? "border-accent bg-accent text-white"
              : "border-[var(--color-line)] bg-[rgba(247,240,237,0.05)] text-ink"
          }`}
        >
          <Clapperboard size={14} />
          {selectMode ? "Cancel" : "Make a video"}
        </button>
      </div>

      {selectMode && (
        <p className="mt-3 text-center text-xs text-muted">
          Tap up to {MAX_VIDEO_PHOTOS} photos to cut a clip for your stories.
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((p) => {
          const selected = selectedIds.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => (selectMode ? toggleSelected(p.id) : setOpenPhoto(p))}
              className="relative aspect-square overflow-hidden rounded-2xl bg-bg-raised"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.viewUrl}
                alt={`Photo by ${p.guestNome}`}
                className="h-full w-full object-cover"
              />
              {selectMode && (
                <span
                  className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    selected ? "border-accent bg-accent text-white" : "border-white/70 bg-black/30"
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
        <p className="mt-8 text-center text-muted">No photos match that filter.</p>
      )}

      {selectMode && selectedIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center gap-3 border-t border-[var(--color-line)] bg-bg/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          <span className="text-sm text-muted">
            {selectedIds.length}/{MAX_VIDEO_PHOTOS} selected
          </span>
          <button
            onClick={handleGenerateVideo}
            disabled={videoLoading}
            className="btn btn-primary px-5 py-2.5 text-sm"
          >
            <Clapperboard size={16} />
            {videoLoading ? "Building video…" : "Build video"}
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
            alt={`Photo by ${openPhoto.guestNome}`}
            className="max-h-[72vh] max-w-full rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-5 text-center text-ink">
            <p className="font-display text-lg italic">{openPhoto.guestNome}</p>
            <p className="text-sm text-ink/60">
              {new Date(openPhoto.takenAt).toLocaleString("en-US")}
            </p>
            {openPhoto.challengeTitulo && (
              <p className="mt-1 text-sm text-accent-soft">🎯 {openPhoto.challengeTitulo}</p>
            )}
            <div className="mt-5 flex justify-center gap-3">
              <a
                href={openPhoto.downloadUrl}
                onClick={(e) => e.stopPropagation()}
                className="btn btn-primary px-5 py-2.5 text-sm"
              >
                <Download size={16} />
                Download
              </a>
              {isHost && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(openPhoto);
                  }}
                  disabled={deleting}
                  className="btn btn-ghost px-5 py-2.5 text-sm text-danger"
                >
                  <Trash2 size={16} />
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setOpenPhoto(null)}
            className="icon-btn absolute right-4 top-[max(1rem,env(safe-area-inset-top))] h-10 w-10"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
