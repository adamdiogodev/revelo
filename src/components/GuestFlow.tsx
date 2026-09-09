"use client";

import { useEffect, useState } from "react";
import { Film, Camera as CameraIcon, Lock } from "lucide-react";
import Camera from "@/components/Camera";
import RevealExperience from "@/components/RevealExperience";
import CoverBackground from "@/components/CoverBackground";
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
  const [welcomeOpen, setWelcomeOpen] = useState(false);
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
          else setWelcomeOpen(true);
        })
        .catch(() => setStep("codigo"));
    } else {
      setStep("codigo");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Keep an eye on the event phase while the guest waits or shoots, because the
  // reveal time is decided by the server, not by the phone's clock.
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
        "We need your camera to continue. Check your browser permission and try again."
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
        const data = await res.json().catch(() => ({ error: "We could not let you in." }));
        setErrorMsg(data.error || "We could not let you in.");
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
      setWelcomeOpen(true);
    } catch {
      setErrorMsg("No connection. Try again.");
      setStep("entry");
    }
  }

  if (step === "loading") {
    return <CenterMessage>loading…</CenterMessage>;
  }

  if (step === "expirada") {
    return (
      <CenterMessage icon={<Film size={26} />}>
        <p className="font-display text-xl italic text-ink">This one is a memory now.</p>
        <p className="mt-2 text-muted">The photos have been deleted.</p>
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
          <Modal icon={<Film size={26} />}>
            <p className="font-display text-xl italic text-ink">End of the roll!</p>
            <p className="mt-2 text-muted">You are out of shots, {nome}.</p>
            <p className="mt-6 font-display text-3xl italic tabular-nums text-accent-soft">
              {formatCountdown(msAteRevelacao)}
            </p>
            <p className="label-caps mt-1">until the reveal</p>
            <p className="mt-4 text-sm text-muted">
              {event.totalFotos} photo{event.totalFotos === 1 ? "" : "s"} taken by the group so far
            </p>
          </Modal>
        )}
        {welcomeOpen && !semPosesOpen && (
          <Modal icon={<CameraIcon size={24} />}>
            <p className="font-display text-xl italic text-ink">
              You have {event.posesPorConvidado - posesUsadas} shots, {nome}!
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              No rush — you can close this page and come back whenever you like. Your shots stay
              saved until the reveal.
            </p>
            <button onClick={() => setWelcomeOpen(false)} className="btn btn-primary mt-5 w-full py-2.5 text-sm">
              Let&apos;s go
            </button>
          </Modal>
        )}
      </>
    );
  }

  if (step === "codigo") {
    return (
      <div className="relative flex h-dvh flex-col items-center justify-center gap-7 px-6 text-center">
        <div className="ambient" />
        <CoverBackground url={event.capaUrl} />

        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent-soft">
          <Lock size={20} />
        </div>
        <div className="relative z-10">
          <p className="label-caps">{event.nome}</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">What is the code?</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-muted">
            Ask whoever is throwing the party for the 4-digit code.
          </p>
        </div>

        <div className="relative z-10">
          <PinInput
            value={codigo}
            onChange={(v) => {
              setCodigo(v);
              setCodigoError(false);
            }}
            onComplete={handleCodigoComplete}
            error={codigoError}
          />
        </div>

        {verificandoCodigo && <p className="relative z-10 text-sm text-muted">checking…</p>}
        {codigoError && (
          <p className="relative z-10 text-sm text-danger">Wrong code. Give it another go.</p>
        )}
      </div>
    );
  }

  // entry / requesting-camera
  return (
    <div className="relative flex h-dvh flex-col justify-end overflow-hidden">
      <div className="ambient" />
      <CoverBackground url={event.capaUrl} />

      <div className="relative z-10 mx-auto w-full max-w-md px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10 animate-[riseIn_500ms_ease-out]">
        <p className="label-caps">you are invited to</p>
        <h1 className="mt-2 font-display text-[2.5rem] italic leading-[1.05] text-ink">
          {event.nome}
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
          You get <strong className="text-ink">{event.posesPorConvidado} shots</strong>. Nobody sees
          a thing until the reveal — not even you.
        </p>

        <form onSubmit={handleEntrySubmit} className="mt-8">
          <label className="label-caps block text-left">What should we call you?</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Your first name"
            maxLength={40}
            className="field mt-2.5 py-4 text-lg"
            autoFocus
          />
          {errorMsg && <p className="mt-2 text-sm text-danger">{errorMsg}</p>}
          <button
            type="submit"
            disabled={step === "requesting-camera" || !nome.trim()}
            className="btn btn-primary mt-5 w-full"
          >
            <CameraIcon size={18} />
            {step === "requesting-camera" ? "Asking for camera access…" : "Grab my camera"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CenterMessage({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="relative flex h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="ambient" />
      {icon && (
        <div className="relative z-10 mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(247,240,237,0.06)] text-muted">
          {icon}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
