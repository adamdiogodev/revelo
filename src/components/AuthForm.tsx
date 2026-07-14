"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      setLoading(false);
      if (error) {
        setError("E-mail ou senha incorretos.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password: senha });
      setLoading(false);
      if (error) {
        setError(error.message.includes("Password") ? "A senha precisa ter pelo menos 6 caracteres." : "Não deu para criar a conta. Tente outro e-mail.");
        return;
      }
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setInfo("Conta criada! Confira seu e-mail para confirmar antes de entrar.");
        setMode("entrar");
      }
    }
  }

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-8 bg-bg px-6 text-center text-ink">
      <Image src="/logo.png" alt="Revelo" width={180} height={91} priority className="h-auto w-40" />

      <div>
        <h1 className="font-display text-3xl italic text-ink">
          {mode === "entrar" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === "entrar" ? "Acesse seus eventos" : "Crie sua conta de anfitrião"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
          autoFocus
          className="w-full rounded-xl border border-ink/15 bg-bg-raised px-4 py-3 text-ink placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          required
          minLength={6}
          className="w-full rounded-xl border border-ink/15 bg-bg-raised px-4 py-3 text-ink placeholder:text-muted focus:border-accent focus:outline-none"
        />

        {error && <p className="text-sm text-danger">{error}</p>}
        {info && <p className="text-sm text-accent">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-ink py-3.5 font-semibold text-bg disabled:opacity-50"
        >
          {loading ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode((m) => (m === "entrar" ? "criar" : "entrar"));
          setError(null);
          setInfo(null);
        }}
        className="text-sm text-muted underline underline-offset-4"
      >
        {mode === "entrar" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
      </button>
    </div>
  );
}
