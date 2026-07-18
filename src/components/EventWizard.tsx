"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Film, Users, Upload, Check } from "lucide-react";
import { CHALLENGE_PRESETS } from "@/lib/challenge-presets";
import { PRICING_TIERS, FREE_TIER, formatBRL, formatConvidados } from "@/lib/pricing";
import { COVER_PRESETS } from "@/lib/cover-presets";

const NOME_SUGESTOES = ["Churrasco", "Aniversário", "Formatura", "Confraternização", "Despedida"];
const POSES_OPCOES = [12, 18, 24];

function nextMidnightLocalInputValue() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

const STEP_TITLES = [
  "Qual é o nome do seu evento?",
  "Escolha uma capa",
  "Quando vai rolar a revelação?",
  "Quantas poses por convidado?",
  "Quantos convidados no máximo?",
  "Quer ativar o Modo Desafios?",
  "Tudo pronto",
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

  const lastStep = STEP_TITLES.length - 1;

  function goNext() {
    setError(null);
    if (step === 0 && !nome.trim()) {
      setError("Dá um nome para o evento.");
      return;
    }
    if (step === 2) {
      const d = new Date(revealAt);
      if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
        setError("Escolha um horário de revelação no futuro.");
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
        setCapaError(data.error || "Falha ao enviar a imagem.");
        return;
      }
      setCapaUrl(data.url);
    } catch {
      setCapaError("Sem conexão. Tente de novo.");
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
        const data = await res.json().catch(() => ({ error: "Erro ao criar evento." }));
        setError(data.error || "Erro ao criar evento.");
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
      setError("Sem conexão. Tente de novo.");
      setLoading(false);
    }
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-bg text-ink">
      <div className="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={goBack}
          aria-label="Voltar"
          className={`flex h-9 w-9 items-center justify-center rounded-full bg-bg-raised text-ink ${
            step === 0 ? "invisible" : ""
          }`}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex flex-1 gap-1.5">
          {STEP_TITLES.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-accent" : "bg-ink/10"
              }`}
            />
          ))}
        </div>
      </div>

      <div
        key={step}
        className="flex flex-1 flex-col overflow-y-auto px-6 pb-6 pt-8 animate-[fadeIn_350ms_ease-out]"
      >
        <h1 className="font-display text-3xl italic leading-tight text-ink">
          {STEP_TITLES[step]}
        </h1>

        {step === 0 && (
          <div className="mt-6 flex-1">
            <p className="text-sm text-muted">
              É a primeira coisa que seus convidados veem ao escanear o QR code.
            </p>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do evento"
              maxLength={80}
              autoFocus
              className="mt-6 w-full rounded-xl border border-ink/15 bg-bg-raised px-4 py-3.5 text-lg text-ink placeholder:text-muted focus:border-accent focus:outline-none"
            />
            <p className="mt-6 text-xs uppercase tracking-widest text-muted">Sugestões</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {NOME_SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => setNome(s)}
                  className="rounded-full border border-ink/15 bg-bg-raised px-4 py-2 text-sm text-ink/90"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 flex-1">
            <p className="text-sm text-muted">
              Aparece no seu painel e na hora da revelação. Opcional — dá pra pular.
            </p>

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
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink/25 bg-bg-raised py-4 text-sm font-medium text-ink disabled:opacity-50"
            >
              <Upload size={16} />
              {capaUploading ? "Enviando…" : "Enviar do seu celular"}
            </button>
            {capaError && <p className="mt-2 text-sm text-danger">{capaError}</p>}

            <p className="mt-6 text-xs uppercase tracking-widest text-muted">Ou escolha uma capa</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {COVER_PRESETS.map((c) => {
                const selected = capaUrl === c.url;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCapaUrl(selected ? null : c.url)}
                    className={`relative aspect-[9/16] overflow-hidden rounded-lg border-2 ${
                      selected ? "border-accent" : "border-transparent"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.url} alt="" className="h-full w-full object-cover" />
                    {selected && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Check size={18} className="text-ink" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {capaUrl && !capaUploading && (
              <div className="mt-6">
                <p className="mb-2 text-xs uppercase tracking-widest text-muted">Prévia</p>
                <div className="relative h-40 w-full overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={capaUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
                  <button
                    onClick={() => setCapaUrl(null)}
                    className="absolute right-2 top-2 rounded-full bg-black/50 px-3 py-1 text-xs text-ink"
                  >
                    Remover
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 flex-1">
            <p className="text-sm text-muted">
              As fotos ficam ocultas até esse momento. Depois, todo o álbum é revelado de uma vez.
            </p>
            <input
              type="datetime-local"
              value={revealAt}
              onChange={(e) => setRevealAt(e.target.value)}
              className="mt-6 w-full rounded-xl border border-ink/15 bg-bg-raised px-4 py-3.5 text-ink focus:border-accent focus:outline-none [color-scheme:dark]"
            />
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 flex-1">
            <p className="text-sm text-muted">Acabou o filme, acabou — o limite é rígido.</p>
            <div className="mt-8 flex items-center justify-center gap-2 rounded-full bg-bg-raised px-6 py-4 text-ink">
              <Film size={18} className="text-muted" />
              <span className="font-display text-4xl italic tabular-nums">{poses}</span>
              <span className="text-sm text-muted">poses</span>
            </div>
            <div className="mt-6 flex gap-2">
              {POSES_OPCOES.map((n) => (
                <button
                  key={n}
                  onClick={() => setPoses(n)}
                  className={`flex-1 rounded-xl border py-3 font-semibold ${
                    poses === n
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-ink/15 bg-bg-raised text-ink"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 flex-1">
            <p className="text-sm text-muted">
              Garante que cada convidado tenha suas poses reservadas. Dá pra fazer upgrade depois.
            </p>
            <div className="mt-5 space-y-2">
              {PRICING_TIERS.map((t) => {
                const selected = maxConvidados === t.maxConvidados;
                return (
                  <button
                    key={t.maxConvidados}
                    onClick={() => setMaxConvidados(t.maxConvidados)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left ${
                      selected ? "border-accent bg-accent/10" : "border-ink/15 bg-bg-raised"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-ink">
                      <Users size={16} className="text-muted" />
                      {formatConvidados(t.maxConvidados)} convidados
                    </span>
                    <span className={`font-display italic ${selected ? "text-accent" : "text-ink/80"}`}>
                      {formatBRL(t.precoCentavos)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="mt-6 flex-1">
            <p className="text-sm text-muted">
              Desafios fotográficos opcionais que os convidados podem tentar durante a festa.
            </p>

            <button
              onClick={() => setModoDesafios((v) => !v)}
              className={`mt-6 flex w-full items-center justify-between rounded-xl border px-4 py-3.5 ${
                modoDesafios ? "border-accent bg-accent/10" : "border-ink/15 bg-bg-raised"
              }`}
            >
              <span className="font-medium text-ink">Modo Desafios</span>
              <span
                className={`flex h-6 w-11 items-center rounded-full px-0.5 transition-colors ${
                  modoDesafios ? "justify-end bg-accent" : "justify-start bg-ink/20"
                }`}
              >
                <span className="h-5 w-5 rounded-full bg-ink" />
              </span>
            </button>

            {modoDesafios && (
              <div className="mt-5 space-y-2">
                {CHALLENGE_PRESETS.map((c) => (
                  <label
                    key={c.titulo}
                    className="flex items-center gap-3 rounded-lg border border-ink/10 bg-bg-raised px-3 py-2.5 text-sm text-ink/90"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPresets.includes(c.titulo)}
                      onChange={() => togglePreset(c.titulo)}
                      className="h-4 w-4 accent-accent"
                    />
                    <span>
                      {c.emoji} {c.titulo}
                    </span>
                  </label>
                ))}

                {customChallenges.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-ink/10 bg-bg-raised px-3 py-2.5 text-sm text-ink/90"
                  >
                    <span>📸 {c}</span>
                    <button
                      onClick={() => setCustomChallenges((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted"
                    >
                      remover
                    </button>
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <input
                    value={novoDesafio}
                    onChange={(e) => setNovoDesafio(e.target.value)}
                    placeholder="Escreva seu próprio desafio"
                    maxLength={80}
                    className="flex-1 rounded-lg border border-ink/15 bg-bg-raised px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                  <button
                    onClick={addCustomChallenge}
                    className="rounded-lg bg-ink/10 px-4 text-sm font-medium text-ink"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="mt-6 flex flex-1 flex-col">
            <p className="text-sm text-muted">Confira antes de criar.</p>
            <dl className="mt-6 divide-y divide-ink/10 rounded-xl border border-ink/10 bg-bg-raised">
              <Resumo label="Evento" value={nome} />
              <Resumo label="Capa" value={capaUrl ? "Escolhida" : "Sem capa"} />
              <Resumo label="Revelação" value={new Date(revealAt).toLocaleString("pt-BR")} />
              <Resumo label="Poses" value={`${poses} por convidado`} />
              <Resumo
                label="Convidados"
                value={`até ${formatConvidados(maxConvidados)} (${formatBRL(
                  PRICING_TIERS.find((t) => t.maxConvidados === maxConvidados)?.precoCentavos || 0
                )})`}
              />
              <Resumo
                label="Desafios"
                value={
                  modoDesafios
                    ? `${selectedPresets.length + customChallenges.length || CHALLENGE_PRESETS.length} ativos`
                    : "Desativado"
                }
              />
            </dl>

            {error && <p className="mt-4 text-sm text-danger">{error}</p>}

            <div className="flex-1" />

            <button
              onClick={handleCreate}
              disabled={loading}
              className="mt-6 w-full rounded-full bg-ink py-3.5 text-base font-semibold text-bg disabled:opacity-50"
            >
              {loading
                ? "Criando…"
                : maxConvidados === FREE_TIER.maxConvidados
                  ? "Criar evento grátis"
                  : "Ir para pagamento"}
            </button>
          </div>
        )}

        {step < lastStep && (
          <>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}
            <div className="flex-1" />
            <button
              onClick={goNext}
              className="mt-6 w-full rounded-full bg-ink py-3.5 text-base font-semibold text-bg"
            >
              Continuar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
