"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Film, Users, Upload, Check, ArrowRight, Sparkles, X } from "lucide-react";
import { CHALLENGE_PRESETS } from "@/lib/challenge-presets";
import { PRICING_TIERS, FREE_TIER, formatPrice, formatGuestLimit } from "@/lib/pricing";
import { COVER_PRESETS } from "@/lib/cover-presets";

const NAME_SUGGESTIONS = ["Birthday", "BBQ", "Graduation", "Housewarming", "Farewell"];
const SHOT_OPTIONS = [12, 18, 24];

function nextMidnightLocalInputValue() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

const STEPS = [
  {
    title: "What is your party called?",
    hint: "It is the first thing guests see when they scan the QR code.",
  },
  {
    title: "Pick a cover",
    hint: "Shows up on your panel and at reveal time. Optional — you can skip it.",
  },
  {
    title: "When does it develop?",
    hint: "Photos stay hidden until then. After that, the whole album opens at once.",
  },
  {
    title: "How many shots each?",
    hint: "When the roll runs out, it runs out — the limit is hard.",
  },
  {
    title: "How many guests, max?",
    hint: "Reserves a roll of film for every guest. You can upgrade later.",
  },
  {
    title: "Want Challenge Mode?",
    hint: "Optional photo missions your guests can chase during the party.",
  },
  { title: "All set", hint: "One last look before you create it." },
];

export default function EventWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [nome, setNome] = useState("");
  const [capaUrl, setCapaUrl] = useState<string | null>(null);
  const [capaUploading, setCapaUploading] = useState(false);
  const [capaError, setCapaError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [revealAt, setRevealAt] = useState(nextMidnightLocalInputValue());
  const [poses, setPoses] = useState(12);
  const [maxConvidados, setMaxConvidados] = useState(FREE_TIER.maxConvidados);
  const [modoDesafios, setModoDesafios] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [customChallenges, setCustomChallenges] = useState<string[]>([]);
  const [novoDesafio, setNovoDesafio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastStep = STEPS.length - 1;

  function goNext() {
    setError(null);
    if (step === 0 && !nome.trim()) {
      setError("Give your party a name.");
      return;
    }
    if (step === 2) {
      const d = new Date(revealAt);
      if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
        setError("Pick a reveal time in the future.");
        return;
      }
    }
    setStep((s) => Math.min(lastStep, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function togglePreset(titulo: string) {
    setSelectedPresets((prev) =>
      prev.includes(titulo) ? prev.filter((t) => t !== titulo) : [...prev, titulo]
    );
  }

  function addCustomChallenge() {
    const v = novoDesafio.trim();
    if (!v) return;
    setCustomChallenges((prev) => [...prev, v]);
    setNovoDesafio("");
  }

  async function handleCapaUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
      setCapaUrl(data.url);
    } catch {
      setCapaError("No connection. Try again.");
    } finally {
      setCapaUploading(false);
      e.target.value = "";
    }
  }

  async function handleCreate() {
    setError(null);
    const revealDate = new Date(revealAt);
    const challenges = [
      ...CHALLENGE_PRESETS.filter((c) => selectedPresets.includes(c.titulo)),
      ...customChallenges.map((titulo) => ({ titulo, emoji: "📸" })),
    ];

    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          capaUrl,
          revealAt: revealDate.toISOString(),
          posesPorConvidado: poses,
          maxConvidados,
          modoDesafios,
          challenges,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "We could not create your party." }));
        setError(data.error || "We could not create your party.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        router.push(`/${data.slug}/host?created=1`);
      }
    } catch {
      setError("No connection. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden">
      <div className="ambient" />

      <header className="relative z-10 mx-auto flex w-full max-w-md items-center gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={goBack}
          aria-label="Back"
          className={`icon-btn h-9 w-9 ${step === 0 ? "invisible" : ""}`}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-1 gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-accent" : "bg-[rgba(247,240,237,0.12)]"
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-[11px] text-muted">
          {step + 1}/{STEPS.length}
        </span>
      </header>

      <div
        key={step}
        className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-5 pb-5 pt-8 animate-[riseIn_400ms_ease-out]"
      >
        <h1 className="font-display text-[2rem] italic leading-[1.1] text-ink">
          {STEPS[step].title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{STEPS[step].hint}</p>

        {step === 0 && (
          <div className="mt-7 flex-1">
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Party name"
              maxLength={80}
              autoFocus
              className="field py-4 text-lg"
            />
            <p className="label-caps mt-7">Suggestions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {NAME_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setNome(s)}
                  className="badge px-4 py-2 text-sm text-ink/90"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-7 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCapaUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={capaUploading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(247,240,237,0.22)] bg-[rgba(247,240,237,0.03)] py-5 text-sm font-medium text-ink disabled:opacity-50"
            >
              <Upload size={16} />
              {capaUploading ? "Uploading…" : "Upload from your phone"}
            </button>
            {capaError && <p className="mt-2 text-sm text-danger">{capaError}</p>}

            <p className="label-caps mt-7">Or pick one</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {COVER_PRESETS.map((c) => {
                const selected = capaUrl === c.url;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCapaUrl(selected ? null : c.url)}
                    className={`relative aspect-[9/16] overflow-hidden rounded-xl border-2 transition-colors ${
                      selected ? "border-accent" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.url} alt="" className="h-full w-full object-cover" />
                    {selected && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Check size={18} className="text-ink" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {capaUrl && !capaUploading && (
              <div className="mt-7">
                <p className="label-caps">Preview</p>
                <div className="relative mt-3 h-44 w-full overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={capaUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
                  <p className="absolute bottom-3 left-4 font-display text-xl italic text-ink">
                    {nome || "Your party"}
                  </p>
                  <button
                    onClick={() => setCapaUrl(null)}
                    aria-label="Remove cover"
                    className="icon-btn absolute right-2 top-2 h-8 w-8 bg-black/50"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="mt-7 flex-1">
            <input
              type="datetime-local"
              value={revealAt}
              onChange={(e) => setRevealAt(e.target.value)}
              className="field py-4 text-lg [color-scheme:dark]"
            />
            <div className="card mt-4 flex items-start gap-3 p-4">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-accent-soft" />
              <p className="text-[13px] leading-snug text-muted">
                A morning-after reveal works beautifully — everyone wakes up to the night they
                barely remember.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-7 flex-1">
            <div className="card flex items-center justify-center gap-3 py-8">
              <Film size={20} className="text-muted" />
              <span className="font-display text-5xl italic tabular-nums text-ink">{poses}</span>
              <span className="text-sm text-muted">shots</span>
            </div>
            <div className="mt-4 flex gap-2">
              {SHOT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setPoses(n)}
                  className={`flex-1 rounded-2xl border py-3.5 font-semibold transition-colors ${
                    poses === n
                      ? "border-accent bg-accent text-white"
                      : "border-[var(--color-line)] bg-[rgba(247,240,237,0.04)] text-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="mt-7 flex-1 space-y-2">
            {PRICING_TIERS.map((t) => {
              const selected = maxConvidados === t.maxConvidados;
              return (
                <button
                  key={t.maxConvidados}
                  onClick={() => setMaxConvidados(t.maxConvidados)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                    selected
                      ? "border-accent/60 bg-accent/10"
                      : "border-[var(--color-line)] bg-[rgba(247,240,237,0.04)]"
                  }`}
                >
                  <span className="flex items-center gap-2.5 text-ink">
                    <Users size={16} className={selected ? "text-accent-soft" : "text-muted"} />
                    {formatGuestLimit(t.maxConvidados)} guests
                  </span>
                  <span
                    className={`font-display italic ${selected ? "text-accent-soft" : "text-ink/80"}`}
                  >
                    {formatPrice(t.precoCentavos)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === 5 && (
          <div className="mt-7 flex-1">
            <button
              onClick={() => setModoDesafios((v) => !v)}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 transition-colors ${
                modoDesafios
                  ? "border-accent/60 bg-accent/10"
                  : "border-[var(--color-line)] bg-[rgba(247,240,237,0.04)]"
              }`}
            >
              <span className="font-medium text-ink">Challenge Mode</span>
              <span
                className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${
                  modoDesafios
                    ? "justify-end bg-accent"
                    : "justify-start bg-[rgba(247,240,237,0.18)]"
                }`}
              >
                <span className="h-5 w-5 rounded-full bg-ink" />
              </span>
            </button>

            {modoDesafios && (
              <div className="mt-4 space-y-2">
                {CHALLENGE_PRESETS.map((c) => {
                  const checked = selectedPresets.includes(c.titulo);
                  return (
                    <button
                      key={c.titulo}
                      onClick={() => togglePreset(c.titulo)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors ${
                        checked
                          ? "border-accent/50 bg-accent/10 text-ink"
                          : "border-[var(--color-line)] bg-[rgba(247,240,237,0.04)] text-ink/90"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                          checked
                            ? "border-accent bg-accent text-white"
                            : "border-[rgba(247,240,237,0.25)]"
                        }`}
                      >
                        {checked && <Check size={12} />}
                      </span>
                      <span>
                        {c.emoji} {c.titulo}
                      </span>
                    </button>
                  );
                })}

                {customChallenges.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-line)] bg-[rgba(247,240,237,0.04)] px-3.5 py-3 text-sm text-ink/90"
                  >
                    <span>📸 {c}</span>
                    <button
                      onClick={() =>
                        setCustomChallenges((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-muted"
                    >
                      remove
                    </button>
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <input
                    value={novoDesafio}
                    onChange={(e) => setNovoDesafio(e.target.value)}
                    placeholder="Write your own challenge"
                    maxLength={80}
                    className="field flex-1 py-2.5 text-sm"
                  />
                  <button onClick={addCustomChallenge} className="btn btn-ghost px-5 text-sm">
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="mt-7 flex flex-1 flex-col">
            <dl className="card divide-y divide-[var(--color-line)] overflow-hidden">
              <Summary label="Party" value={nome} />
              <Summary label="Cover" value={capaUrl ? "Chosen" : "None"} />
              <Summary label="Reveal" value={new Date(revealAt).toLocaleString("en-US")} />
              <Summary label="Shots" value={`${poses} per guest`} />
              <Summary
                label="Guests"
                value={`up to ${formatGuestLimit(maxConvidados)} (${formatPrice(
                  PRICING_TIERS.find((t) => t.maxConvidados === maxConvidados)?.precoCentavos || 0
                )})`}
              />
              <Summary
                label="Challenges"
                value={
                  modoDesafios
                    ? `${selectedPresets.length + customChallenges.length || CHALLENGE_PRESETS.length} active`
                    : "Off"
                }
              />
            </dl>

            {error && <p className="mt-4 text-sm text-danger">{error}</p>}

            <div className="flex-1" />

            <button onClick={handleCreate} disabled={loading} className="btn btn-primary mt-6 w-full">
              {loading
                ? "Creating…"
                : maxConvidados === FREE_TIER.maxConvidados
                  ? "Create free party"
                  : "Go to checkout"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </div>
        )}

        {step < lastStep && (
          <>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}
            <div className="flex-1" />
            <button onClick={goNext} className="btn btn-primary mt-6 w-full">
              Continue
              <ArrowRight size={17} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="truncate font-medium text-ink">{value}</span>
    </div>
  );
}
