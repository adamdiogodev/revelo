"use client";

import { useEffect, useState } from "react";

export function useCountdown(targetIso: string) {
  const [msLeft, setMsLeft] = useState(() => new Date(targetIso).getTime() - Date.now());

  useEffect(() => {
    // Recalcula na hora quando targetIso muda (ex.: de um placeholder para o
    // valor real vindo da API) — sem isso, o valor ficava desatualizado por
    // até 1s, o suficiente para uma tela "expirada" piscar por engano.
    setMsLeft(new Date(targetIso).getTime() - Date.now());
    const id = setInterval(() => {
      setMsLeft(new Date(targetIso).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return msLeft;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, "0")}min`;
  if (minutes > 0) return `${minutes}min${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}
