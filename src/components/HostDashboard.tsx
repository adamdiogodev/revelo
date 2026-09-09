"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import {
  Check,
  ChevronLeft,
  Copy,
  Download,
  Film,
  MessageCircle,
  CreditCard,
  Pencil,
  Upload,
  Users,
  Images,
  X,
} from "lucide-react";
import { useCountdown, formatCountdown } from "@/lib/use-countdown";
import { formatPrice, formatGuestLimit } from "@/lib/pricing";
import { COVER_PRESETS } from "@/lib/cover-presets";
import RevealExperience from "@/components/RevealExperience";
import CoverBackground from "@/components/CoverBackground";
import type { PublicEventInfo } from "@/lib/types";

type PendingPayment = { maxConvidados: number; valorCentavos: number };
const SHOT_OPTIONS = [12, 18, 24];

export default function HostDashboard({
  event: initialEvent,
  codigoAcesso,
  justCreated,
  pendingPayment,
  paidStatus,
}: {
  event: PublicEventInfo;
  codigoAcesso: string;
  justCreated: boolean;
  pendingPayment: PendingPayment | null;
  paidStatus?: string;
}) {
  const router = useRouter();
  const [event, setEvent] = useState(initialEvent);
  const [copied, setCopied] = useState(false);
  const [siteUrl, setSiteUrl] = useState(process.env.NEXT_PUBLIC_SITE_URL || "");
  const [payingLoading, setPayingLoading] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const [editing, setEditing] = useState(false);
  const [editCapaUrl, setEditCapaUrl] = useState<string | null>(event.capaUrl);
  const [editPoses, setEditPoses] = useState(event.posesPorConvidado);
  const [capaUploading, setCapaUploading] = useState(false);
  const [capaError, setCapaError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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

  // If the host came back from checkout successfully but the webhook has not
  // confirmed yet, keep refreshing for a few seconds until the plan unlocks.
  useEffect(() => {
    if (paidStatus !== "success" || !pendingPayment) return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= 10) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [paidStatus, pendingPayment, router]);

  const guestUrl = siteUrl ? `${siteUrl}/${event.slug}` : `/${event.slug}`;

  const revealMs = useCountdown(event.revealAt);

  function copyLink() {
    navigator.clipboard.writeText(guestUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const text = `📸 Come shoot with us at ${event.nome}! Join here: ${guestUrl}\nEntry code: ${codigoAcesso}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function downloadQrCode() {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qrcode-${event.slug}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleFinishPayment() {
    setPayingLoading(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/checkout`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setPayingLoading(false);
      }
    } catch {
      setPayingLoading(false);
    }
  }

  function openEditor() {
    setEditCapaUrl(event.capaUrl);
    setEditPoses(event.posesPorConvidado);
    setCapaError(null);
    setSaveError(null);
    setEditing(true);
  }

  async function handleEditCapaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapaError(null);
    setCapaUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/covers/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setCapaError(data.error || "We could not upload that image.");
        return;
      }
      setEditCapaUrl(data.url);
    } catch {
      setCapaError("No connection. Try again.");
    } finally {
      setCapaUploading(false);
      e.target.value = "";
    }
  }

  async function handleSaveEdit() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/events/${event.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capaUrl: editCapaUrl, posesPorConvidado: editPoses }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "We could not save your changes.");
        return;
      }
      setEvent(data);
      setEditing(false);
    } catch {
      setSaveError("No connection. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (event.fase === "revelada") {
    return <RevealExperience slug={event.slug} isHost />;
  }

  if (event.fase === "expirada") {
    return (
      <div className="relative flex h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="ambient" />
        <div className="relative z-10 mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(247,240,237,0.06)] text-muted">
          <Film size={24} />
        </div>
        <p className="relative z-10 font-display text-xl italic">This one is a memory now.</p>
        <p className="relative z-10 mt-2 text-muted">The photos have been deleted.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh">
      <div className="ambient" />
      <CoverBackground url={event.capaUrl} />

      <div className="relative z-10 mx-auto w-full max-w-md space-y-3 px-5 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between">
          <Link href="/dashboard" aria-label="Back to your parties" className="icon-btn h-9 w-9">
            <ChevronLeft size={18} />
          </Link>
          <p className="label-caps">host panel</p>
          <button
            onClick={openEditor}
            className="icon-btn h-9 w-9"
            aria-label="Edit cover and shots"
          >
            <Pencil size={15} />
          </button>
        </header>

        <div className="pb-2 pt-4 text-center">
          <h1 className="font-display text-[2rem] italic leading-tight text-ink">{event.nome}</h1>
          <p className="mt-1.5 text-sm text-muted">
            {event.posesPorConvidado} shots per guest · sealed until reveal
          </p>
        </div>

        {pendingPayment && (
          <div className="card border-danger/40 bg-danger/10 p-5 text-center">
            <p className="font-medium text-ink">
              {paidStatus === "success" ? "Confirming your payment…" : "Payment pending"}
            </p>
            <p className="mt-1 text-sm text-muted">
              Plan for up to {formatGuestLimit(pendingPayment.maxConvidados)} guests —{" "}
              {formatPrice(pendingPayment.valorCentavos)}
            </p>
            {paidStatus === "success" ? (
              <p className="mt-3 text-xs text-muted">This usually takes just a few seconds.</p>
            ) : (
              <button
                onClick={handleFinishPayment}
                disabled={payingLoading}
                className="btn btn-primary mt-4 w-full py-2.5 text-sm"
              >
                <CreditCard size={16} />
                {payingLoading ? "Opening checkout…" : "Finish payment"}
              </button>
            )}
          </div>
        )}

        <div className="card p-6 text-center">
          <p className="label-caps">develops in</p>
          <p className="mt-2 font-display text-[2.75rem] italic leading-none tabular-nums text-accent-soft">
            {revealMs > 0 ? formatCountdown(revealMs) : "developing…"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <Users size={16} className="text-muted" />
            <p className="mt-3 font-display text-3xl italic leading-none text-ink">
              {event.totalConvidados}
              <span className="text-base text-muted">/{formatGuestLimit(event.maxConvidados)}</span>
            </p>
            <p className="mt-1.5 text-xs text-muted">guests joined</p>
          </div>
          <div className="card p-4">
            <Images size={16} className="text-muted" />
            <p className="mt-3 font-display text-3xl italic leading-none text-ink">
              {event.totalFotos}
            </p>
            <p className="mt-1.5 text-xs text-muted">shots taken</p>
          </div>
        </div>

        <div className="card p-5">
          <p className="text-center font-medium text-ink">
            {justCreated ? "Invite your guests" : "Party QR code"}
          </p>

          <div className="mt-4 flex justify-center rounded-2xl bg-ink p-4">
            <QRCodeCanvas ref={qrCanvasRef} value={guestUrl} size={200} />
          </div>

          <div className="card-flat mt-3 flex items-center gap-2 px-3 py-2.5 text-sm">
            <span className="flex-1 truncate text-left text-ink/80">{guestUrl}</span>
            <button
              onClick={copyLink}
              className="flex items-center gap-1 font-medium text-accent-soft"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "copied" : "copy"}
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button onClick={shareWhatsApp} className="btn btn-primary flex-1 py-2.5 text-sm">
              <MessageCircle size={16} />
              WhatsApp
            </button>
            <button onClick={downloadQrCode} className="btn btn-ghost flex-1 py-2.5 text-sm">
              <Download size={16} />
              Save QR
            </button>
          </div>
        </div>

        <div className="card p-5 text-center">
          <p className="label-caps">entry code</p>
          <div className="mt-3 flex justify-center gap-2">
            {codigoAcesso.split("").map((d, i) => (
              <span
                key={i}
                className="flex h-14 w-12 items-center justify-center rounded-xl border border-[var(--color-line)] bg-[rgba(10,5,7,0.6)] font-display text-2xl italic text-accent-soft"
              >
                {d}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-snug text-muted">
            Share it with your guests separately — without the code, nobody gets in.
          </p>
        </div>

        {event.modoDesafios && event.challenges.length > 0 && (
          <p className="pt-1 text-center text-sm text-muted">
            Challenge Mode is on · {event.challenges.length} challenges available
          </p>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center">
          <div className="card max-h-[88vh] w-full max-w-md overflow-y-auto p-5 text-ink animate-[riseIn_260ms_ease-out]">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl italic">Edit party</p>
              <button onClick={() => setEditing(false)} className="icon-btn h-8 w-8" aria-label="Close">
                <X size={15} />
              </button>
            </div>

            <p className="label-caps mt-6">Cover</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {COVER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setEditCapaUrl(preset.url)}
                  className={`relative aspect-[9/16] overflow-hidden rounded-xl border-2 ${
                    editCapaUrl === preset.url ? "border-accent" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preset.url} alt="" className="h-full w-full object-cover" />
                  {editCapaUrl === preset.url && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <input
              ref={editFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleEditCapaUpload}
            />
            <button
              onClick={() => editFileInputRef.current?.click()}
              disabled={capaUploading}
              className="btn btn-ghost mt-3 w-full py-2.5 text-sm"
            >
              <Upload size={15} />
              {capaUploading ? "Uploading…" : "Upload my own image"}
            </button>
            {capaError && <p className="mt-2 text-center text-xs text-danger">{capaError}</p>}

            <p className="label-caps mt-6">Shots per guest</p>
            <div className="mt-3 flex gap-2">
              {SHOT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setEditPoses(n)}
                  className={`flex-1 rounded-2xl border py-3 font-semibold transition-colors ${
                    editPoses === n
                      ? "border-accent bg-accent text-white"
                      : "border-[var(--color-line)] bg-[rgba(247,240,237,0.04)] text-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {saveError && <p className="mt-4 text-center text-sm text-danger">{saveError}</p>}

            <button
              onClick={handleSaveEdit}
              disabled={saving || capaUploading}
              className="btn btn-primary mt-6 w-full"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
