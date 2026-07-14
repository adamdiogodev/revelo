"use client";

import { useEffect, useState } from "react";
import { Film, Camera as CameraIcon, Lock } from "lucide-react";
import Camera from "@/components/Camera";
import RevealExperience from "@/components/RevealExperience";
import PinInput from "@/components/PinInput";
import Modal from "@/components/Modal";
import { useCountdown, formatCountdown } from "@/lib/use-countdown";
import type { PublicEventInfo } from "@/lib/types";

type Step =
  | "loading"
  | "codigo"
  | "entry"
  | "requesting-camera"
  | "camera"
  | "revelada"
  | "expirada"
  | "erro";

function storageKeys(slug: string) {
  return {
    token: `festa:${slug}:guestToken`,
    nome: `festa:${slug}:guestNome`,
  };
}

export default function GuestFlow({ initialEvent }: { initialEvent: PublicEventInfo }) {
  const slug = initialEvent.slug;
  const [event, setEvent] = useState(initialEvent);
  const [step, setStep] = useState<Step>("loading");
  const [nome, setNome] = useState("");
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [posesUsadas, setPosesUsadas] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [challengesConcluidos, setChallengesConcluidos] = useState<string[]>([]);
  const [semPosesOpen, setSemPosesOpen] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [codigoError, setCodigoError] = useState(false);
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);
  const msAteRevelacao = useCountdown(event.revealAt);

  useEffect(() => {
    if (event.fase === "expirada") {
      setStep("expirada");
      return;
    }
    if (event.fase === "revelada") {
      setStep("revelada");
      return;
    }

    const { token, nome: savedNome } = storageKeys(slug);
    const savedToken = localStorage.getItem(token);
    const savedNomeVal = localStorage.getItem(savedNome);

    if (savedToken && savedNomeVal) {
      fetch(`/api/events/${slug}/guests/me?token=${encodeURIComponent(savedToken)}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          setGuestToken(savedToken);
          setNome(savedNomeVal);
          setPosesUsadas(data.posesUsadas);
          setChallengesConcluidos(data.challengesConcluidos || []);
          setStep("camera");
          if (data.posesUsadas >= event.posesPorConvidado) setSemPosesOpen(true);
        })
        .catch(() => setStep("codigo"));
    } else {
      setStep("codigo");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Fica de olho na fase do evento enquanto o convidado está na tela de espera/câmera,
  // porque o horário de revelação é decidido pelo servidor, não pelo relógio do celular.
  useEffect(() => {
    if (step !== "camera") return;
    const id = setInterval(() => {
      fetch(`/api/events/${slug}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: PublicEventInfo | null) => {
          if (!data) return;
          setEvent(data);
          if (data.fase === "revelada") setStep("revelada");
          if (data.fase === "expirada") setStep("expirada");
        })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(id);
  }, [step, slug]);

  async function handleCodigoComplete(value: string) {
    if (value.length < 4) return;
    setVerificandoCodigo(true);
    setCodigoError(false);
    try {
      const res = await fetch(`/api/events/${slug}/check-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: value }),
      });
      if (res.ok) {
        setStep("entry");
      } else {
        setCodigoError(true);
        setCodigo("");
      }
    } catch {
      setCodigoError(true);
    } finally {
      setVerificandoCodigo(false);
    }
  }

  async function handleEntrySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setStep("requesting-camera");
    setErrorMsg(null);

    try {
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      testStream.getTracks().forEach((t) => t.stop());
    } catch {
      setErrorMsg(
        "Precisamos da sua câmera para continuar. Verifique a permissão do navegador e tente de novo."
      );
      setStep("entry");
      return;
    }

    try {
      const res = await fetch(`/api/events/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), codigo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Erro ao entrar." }));
        setErrorMsg(data.error || "Erro ao entrar.");
        setStep("entry");
        return;
      }
      const data = await res.json();
      const keys = storageKeys(slug);
      localStorage.setItem(keys.token, data.guestToken);
      localStorage.setItem(keys.nome, data.nome);
      setGuestToken(data.guestToken);
      setPosesUsadas(data.posesUsadas);
      setChallengesConcluidos(data.challengesConcluidos || []);
      setStep("camera");
    } catch {
      setErrorMsg("Sem conexão. Tente de novo.");
      setStep("entry");
    }
  }

  if (step === "loading") {
    return <CenterMessage>carregando…</CenterMessage>;
  }

  if (step === "expirada") {
    return (
      <CenterMessage icon={<Film size={28} />}>
        <p className="font-display text-xl italic text-ink">Esse rolê já virou lembrança.</p>
        <p className="mt-2 text-muted">As fotos foram apagadas.</p>
      </CenterMessage>
    );
  }

  if (step === "revelada") {
    return <RevealExperience slug={slug} />;
  }

  if (step === "camera" && guestToken) {
    return (
      <>
        <Camera
          slug={slug}
          guestToken={guestToken}
          eventNome={event.nome}
          revealAt={event.revealAt}
          posesPorConvidado={event.posesPorConvidado}
          initialPosesUsadas={posesUsadas}
          modoDesafios={event.modoDesafios}
          challenges={event.challenges}
          initialChallengesConcluidos={challengesConcluidos}
          onSemPoses={() => setSemPosesOpen(true)}
          onRevelacaoIniciada={() => setStep("revelada")}
        />
        {semPosesOpen && (
          <Modal icon={<Film size={28} />}>
            <p className="font-display text-xl italic text-ink">Fim do filme!</p>
            <p className="mt-2 text-muted">Suas poses acabaram, {nome}.</p>
            <p className="mt-6 font-display text-3xl italic tabular-nums text-accent">
              {formatCountdown(msAteRevelacao)}
            </p>
            <p className="text-xs uppercase tracking-widest text-muted">até a revelação</p>
            <p className="mt-4 text-sm text-muted">
              {event.totalFotos} foto{event.totalFotos === 1 ? "" : "s"} tiradas pelo grupo até
              agora
            </p>
          </Modal>
        )}
      </>
    );
  }

  if (step === "codigo") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-8 bg-bg px-6 text-center text-ink">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-raised text-accent">
          <Lock size={22} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">{event.nome}</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">Qual é o código?</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-muted">
            Peça o código de 4 dígitos para quem está organizando a festa.
          </p>
        </div>

        <PinInput
          value={codigo}
          onChange={(v) => {
            setCodigo(v);
            setCodigoError(false);
          }}
          onComplete={handleCodigoComplete}
          error={codigoError}
        />

        {verificandoCodigo && <p className="text-sm text-muted">verificando…</p>}
        {codigoError && <p className="text-sm text-danger">Código incorreto. Tente de novo.</p>}
      </div>
    );
  }

  // entry / requesting-camera
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-8 bg-bg px-6 text-center text-ink">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">você foi convidado(a) para</p>
        <h1 className="mt-2 font-display text-4xl italic text-ink">{event.nome}</h1>
        <p className="mx-auto mt-4 max-w-xs text-sm text-muted">
          Você terá <strong className="text-ink">{event.posesPorConvidado} poses</strong>. Ninguém
          vê nada até a revelação — nem você.
        </p>
      </div>

      <form onSubmit={handleEntrySubmit} className="w-full max-w-xs">
        <label className="block text-left text-xs uppercase tracking-widest text-muted">
          Como você se chama?
        </label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu primeiro nome"
          maxLength={40}
          className="mt-2 w-full rounded-xl border border-ink/15 bg-bg-raised px-4 py-3 text-lg text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          autoFocus
        />
        {errorMsg && <p className="mt-2 text-sm text-danger">{errorMsg}</p>}
        <button
          type="submit"
          disabled={step === "requesting-camera" || !nome.trim()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-base font-semibold text-bg transition-opacity disabled:opacity-40"
        >
          <CameraIcon size={18} />
          {step === "requesting-camera" ? "Pedindo acesso à câmera…" : "Pegar minha câmera"}
        </button>
      </form>
    </div>
  );
}

function CenterMessage({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-2 bg-bg px-6 text-center text-ink">
      {icon && (
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg-raised text-ink/70">
          {icon}
        </div>
      )}
      {children}
    </div>
  );
}
