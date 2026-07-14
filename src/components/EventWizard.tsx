"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Film, Minus, Plus, Users } from "lucide-react";
import { CHALLENGE_PRESETS } from "@/lib/challenge-presets";

const NOME_SUGESTOES = ["Churrasco", "Aniversário", "Formatura", "Confraternização", "Despedida"];
const POSES_OPCOES = [12, 18, 24];
const MIN_CONVIDADOS = 50;

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
  const [revealAt, setRevealAt] = useState(nextMidnightLocalInputValue());
  const [poses, setPoses] = useState(12);
  const [maxConvidados, setMaxConvidados] = useState(MIN_CONVIDADOS);
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
    if (step === 1) {
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
      router.push(`/${data.slug}/host?created=1`);
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

        {step === 2 && (
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

        {step === 3 && (
          <div className="mt-6 flex-1">
            <p className="text-sm text-muted">
              Garante que cada convidado tenha suas poses reservadas. Dá pra aumentar depois.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3 rounded-full bg-bg-raised px-6 py-4 text-ink">
              <Users size={18} className="text-muted" />
              <span className="font-display text-4xl italic tabular-nums">{maxConvidados}</span>
              <span className="text-sm text-muted">convidados</span>
            </div>
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => setMaxConvidados((n) => Math.max(MIN_CONVIDADOS, n - 50))}
                disabled={maxConvidados <= MIN_CONVIDADOS}
                aria-label="Diminuir 50"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/15 bg-bg-raised text-ink disabled:opacity-30"
              >
                <Minus size={18} />
              </button>
              <button
                onClick={() => setMaxConvidados((n) => n + 50)}
                aria-label="Aumentar 50"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-ink/15 bg-bg-raised text-ink"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
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

        {step === 5 && (
          <div className="mt-6 flex flex-1 flex-col">
            <p className="text-sm text-muted">Confira antes de criar.</p>
            <dl className="mt-6 divide-y divide-ink/10 rounded-xl border border-ink/10 bg-bg-raised">
              <Resumo label="Evento" value={nome} />
              <Resumo label="Revelação" value={new Date(revealAt).toLocaleString("pt-BR")} />
              <Resumo label="Poses" value={`${poses} por convidado`} />
              <Resumo label="Convidados" value={`até ${maxConvidados}`} />
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
              {loading ? "Criando…" : "Criar evento grátis"}
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
