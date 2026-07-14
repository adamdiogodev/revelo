"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Zap, ZapOff, RefreshCw, Film, UploadCloud } from "lucide-react";
import { captureFilteredJpeg } from "@/lib/photo-filter";
import { useCountdown, formatCountdown } from "@/lib/use-countdown";

type UploadResult =
  | { ok: true; posesUsadas: number; posesPorConvidado: number }
  | { ok: false; reason: "sem_poses" | "revelacao_iniciada" | "network" | "erro" };

type QueueItem = {
  id: string;
  blob: Blob;
  challengeId: string | null;
  attempts: number;
};

type ChallengeOption = { id: string; titulo: string; emoji: string };

type ExtendedTrackCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
  zoom?: { min: number; max: number; step: number };
};

export default function Camera({
  slug,
  guestToken,
  eventNome,
  revealAt,
  posesPorConvidado,
  initialPosesUsadas,
  modoDesafios,
  challenges,
  initialChallengesConcluidos,
  onSemPoses,
  onRevelacaoIniciada,
}: {
  slug: string;
  guestToken: string;
  eventNome: string;
  revealAt: string;
  posesPorConvidado: number;
  initialPosesUsadas: number;
  modoDesafios: boolean;
  challenges: ChallengeOption[];
  initialChallengesConcluidos: string[];
  onSemPoses: () => void;
  onRevelacaoIniciada: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [posesUsadas, setPosesUsadas] = useState(initialPosesUsadas);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    () => new Set(initialChallengesConcluidos)
  );
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomLevels, setZoomLevels] = useState<{ min: number; max: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  const msAteRevelacao = useCountdown(revealAt);

  const queueRef = useRef<QueueItem[]>([]);
  const processingRef = useRef(false);
  const stoppedRef = useRef(false);

  const posesUsadasRef = useRef(posesUsadas);
  useEffect(() => {
    posesUsadasRef.current = posesUsadas;
  }, [posesUsadas]);

  const startCamera = useCallback(async (mode: "environment" | "user") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setTorchSupported(false);
    setTorchOn(false);
    setZoomLevels(null);
    setZoom(1);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);

      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as ExtendedTrackCapabilities | undefined;
      if (caps?.torch) setTorchSupported(true);
      if (caps?.zoom) setZoomLevels({ min: caps.zoom.min, max: caps.zoom.max });
    } catch {
      setCameraError(
        "Não consegui acessar sua câmera. Verifique a permissão do navegador e tente de novo."
      );
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      // dispositivo recusou o pedido de torch — segue sem flash
    }
  }

  async function applyZoom(level: number) {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: level } as MediaTrackConstraintSet] });
      setZoom(level);
    } catch {
      // zoom não suportado nesta constraint específica — ignora
    }
  }

  const processQueue = useCallback(async () => {
    if (processingRef.current || stoppedRef.current) return;
    processingRef.current = true;

    while (queueRef.current.length > 0 && !stoppedRef.current) {
      const item = queueRef.current[0];
      setStatusMsg("sincronizando…");

      const form = new FormData();
      form.append("guestToken", guestToken);
      if (item.challengeId) form.append("challengeId", item.challengeId);
      form.append("file", item.blob, "foto.jpg");

      let result: UploadResult;
      try {
        const res = await fetch(`/api/events/${slug}/photos`, { method: "POST", body: form });
        if (res.ok) {
          const data = await res.json();
          result = { ok: true, posesUsadas: data.posesUsadas, posesPorConvidado: data.posesPorConvidado };
        } else if (res.status === 409) {
          const data = await res.json().catch(() => ({ error: "erro" }));
          result = { ok: false, reason: data.error === "revelacao_iniciada" ? "revelacao_iniciada" : "sem_poses" };
        } else if (res.status === 403) {
          result = { ok: false, reason: "revelacao_iniciada" };
        } else {
          result = { ok: false, reason: "erro" };
        }
      } catch {
        result = { ok: false, reason: "network" };
      }

      if (result.ok) {
        queueRef.current.shift();
        setPendingCount(queueRef.current.length);
        setPosesUsadas(result.posesUsadas);
        if (item.challengeId) {
          const doneId = item.challengeId;
          setCompletedIds((prev) => (prev.has(doneId) ? prev : new Set(prev).add(doneId)));
        }
        setStatusMsg(queueRef.current.length > 0 ? "sincronizando…" : null);
      } else if (result.reason === "network") {
        item.attempts += 1;
        const delay = Math.min(1000 * 2 ** Math.min(item.attempts, 5), 15000);
        setStatusMsg("sem sinal, tentando de novo…");
        await new Promise((r) => setTimeout(r, delay));
      } else if (result.reason === "sem_poses") {
        queueRef.current.shift();
        setPendingCount(queueRef.current.length);
        setPosesUsadas(posesPorConvidado);
        stoppedRef.current = true;
        onSemPoses();
        break;
      } else if (result.reason === "revelacao_iniciada") {
        queueRef.current.shift();
        setPendingCount(queueRef.current.length);
        stoppedRef.current = true;
        onRevelacaoIniciada();
        break;
      } else {
        item.attempts += 1;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    processingRef.current = false;
  }, [guestToken, slug, posesPorConvidado, onSemPoses, onRevelacaoIniciada]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: BeforeUnloadEvent) => {
      if (queueRef.current.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleShutter = useCallback(async () => {
    if (isCapturing) return;
    if (posesUsadasRef.current >= posesPorConvidado) return;
    if (!videoRef.current || videoRef.current.readyState < 2) return;

    setIsCapturing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 160);

    setPosesUsadas((p) => Math.min(p + 1, posesPorConvidado));

    try {
      const blob = await captureFilteredJpeg(videoRef.current, facingMode === "user");
      queueRef.current.push({
        id: `${Date.now()}-${Math.random()}`,
        blob,
        challengeId: selectedChallengeId,
        attempts: 0,
      });
      setPendingCount(queueRef.current.length);
      processQueue();
    } finally {
      setTimeout(() => setIsCapturing(false), 500);
    }
  }, [isCapturing, posesPorConvidado, facingMode, processQueue, selectedChallengeId]);

  const posesRestantes = posesPorConvidado - posesUsadas;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 0 18vw 2vw rgba(0,0,0,0.55)" }}
      />

      {flash && <div className="absolute inset-0 bg-white animate-[fadeOut_160ms_ease-out]" />}

      <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-0.5 pt-[max(1rem,env(safe-area-inset-top))] px-4 text-center">
        <p className="font-display text-lg italic text-ink/95 [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
          {eventNome}
        </p>
        <p className="font-mono text-[11px] tracking-wide text-ink/60">
          revelação em {formatCountdown(msAteRevelacao)}
        </p>
        {statusMsg && (
          <div className="mt-2 rounded-full bg-black/40 px-3 py-1 text-xs text-ink/80">{statusMsg}</div>
        )}
      </div>

      {cameraError && (
        <div className="absolute inset-x-4 top-1/3 rounded-2xl bg-black/80 p-4 text-center text-ink">
          <p className="mb-3 text-sm">{cameraError}</p>
          <button
            onClick={() => startCamera(facingMode)}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {/* controles secundários: flash, zoom, trocar câmera */}
      <div className="absolute inset-x-0 bottom-[11.5rem] flex items-center justify-center gap-3">
        {torchSupported && (
          <button
            onClick={toggleTorch}
            aria-label="Flash"
            className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur ${
              torchOn ? "bg-accent text-accent-ink" : "bg-black/40 text-ink"
            }`}
          >
            {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
          </button>
        )}

        {zoomLevels && zoomLevels.max > zoomLevels.min && (
          <div className="flex overflow-hidden rounded-full bg-black/40 backdrop-blur">
            {[1, Math.min(2, zoomLevels.max)].map((level) => (
              <button
                key={level}
                onClick={() => applyZoom(level)}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  Math.round(zoom) === level ? "bg-accent text-accent-ink" : "text-ink"
                }`}
              >
                {level}x
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
          aria-label="Trocar câmera"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-ink backdrop-blur"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {modoDesafios && challenges.length > 0 && (
        <div className="absolute inset-x-0 bottom-[8.25rem] flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <button
            onClick={() => setSelectedChallengeId(null)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur ${
              selectedChallengeId === null
                ? "border-accent bg-accent text-accent-ink"
                : "border-ink/20 bg-black/40 text-ink"
            }`}
          >
            Livre
          </button>
          {challenges.map((c) => {
            const isSelected = selectedChallengeId === c.id;
            const isDone = completedIds.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setSelectedChallengeId(isSelected ? null : c.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur ${
                  isSelected
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-ink/20 bg-black/40 text-ink"
                }`}
              >
                {c.emoji} {c.titulo}
                {isDone && <span className="ml-1">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-10 pb-[max(2rem,env(safe-area-inset-bottom))] pt-6">
        <div className="flex h-12 w-12 items-center justify-center gap-1 rounded-full bg-black/40 text-ink backdrop-blur">
          <Film size={14} className="text-ink/60" />
          <span className="font-display text-base italic tabular-nums">{posesRestantes}</span>
        </div>

        <button
          onClick={handleShutter}
          disabled={isCapturing || posesRestantes <= 0}
          aria-label="Tirar foto"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-ink bg-ink/10 backdrop-blur transition-transform active:scale-95 disabled:opacity-40"
        >
          <span className="h-16 w-16 rounded-full bg-ink" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-ink backdrop-blur">
          {pendingCount > 0 ? (
            <div className="flex flex-col items-center">
              <UploadCloud size={14} />
              <span className="text-[10px] tabular-nums">{pendingCount}</span>
            </div>
          ) : (
            <UploadCloud size={14} className="text-ink/30" />
          )}
        </div>
      </div>
    </div>
  );
}
