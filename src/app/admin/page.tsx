"use client";

import { useState } from "react";
import { PRICING_TIERS, formatConvidados } from "@/lib/pricing";

export default function AdminPage() {
  const [senha, setSenha] = useState("");
  const [slug, setSlug] = useState("");
  const [maxConvidados, setMaxConvidados] = useState(PRICING_TIERS[1].maxConvidados);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${senha}`,
        },
        body: JSON.stringify({ slug: slug.trim(), maxConvidados }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ tipo: "erro", texto: data.error || "Erro ao liberar." });
      } else {
        setMsg({
          tipo: "ok",
          texto: `Liberado! "${data.slug}" agora tem limite de ${formatConvidados(data.maxConvidados)} convidados.`,
        });
      }
    } catch {
      setMsg({ tipo: "erro", texto: "Sem conexão." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-bg px-6 py-12 text-ink">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">área interna</p>
        <h1 className="mt-2 font-display text-2xl italic text-ink">Liberar convidados de graça</h1>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <div>
          <label className="block text-xs uppercase tracking-widest text-muted">Senha admin</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-ink/15 bg-bg-raised px-4 py-3 text-ink focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-muted">
            Slug do evento
          </label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="churrasco-do-adam"
            required
            className="mt-1 w-full rounded-xl border border-ink/15 bg-bg-raised px-4 py-3 text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-muted">
            Novo limite de convidados
          </label>
          <select
            value={maxConvidados}
            onChange={(e) => setMaxConvidados(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-ink/15 bg-bg-raised px-4 py-3 text-ink focus:border-accent focus:outline-none"
          >
            {PRICING_TIERS.map((t) => (
              <option key={t.maxConvidados} value={t.maxConvidados} className="text-black">
                {formatConvidados(t.maxConvidados)}
              </option>
            ))}
          </select>
        </div>

        {msg && (
          <p className={`text-sm ${msg.tipo === "ok" ? "text-accent" : "text-danger"}`}>
            {msg.texto}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-bg disabled:opacity-50"
        >
          {loading ? "Liberando…" : "Liberar de graça"}
        </button>
      </form>
    </div>
  );
}
