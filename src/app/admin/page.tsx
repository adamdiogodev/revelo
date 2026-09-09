"use client";

import { useState } from "react";
import { PRICING_TIERS, formatGuestLimit } from "@/lib/pricing";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [maxConvidados, setMaxConvidados] = useState(PRICING_TIERS[1].maxConvidados);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ slug: slug.trim(), maxConvidados }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ kind: "error", text: data.error || "Could not grant that plan." });
      } else {
        setMsg({
          kind: "ok",
          text: `Done! "${data.slug}" is now capped at ${formatGuestLimit(data.maxConvidados)} guests.`,
        });
      }
    } catch {
      setMsg({ kind: "error", text: "No connection." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="ambient" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center">
          <p className="label-caps">internal</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">Grant guest seats</h1>
        </div>

        <form onSubmit={handleSubmit} className="card mt-7 space-y-4 p-5">
          <div>
            <label className="label-caps block">Admin password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="field mt-1.5"
            />
          </div>

          <div>
            <label className="label-caps block">Event slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="adams-birthday"
              required
              className="field mt-1.5"
            />
          </div>

          <div>
            <label className="label-caps block">New guest limit</label>
            <select
              value={maxConvidados}
              onChange={(e) => setMaxConvidados(Number(e.target.value))}
              className="field mt-1.5"
            >
              {PRICING_TIERS.map((t) => (
                <option key={t.maxConvidados} value={t.maxConvidados} className="text-black">
                  {formatGuestLimit(t.maxConvidados)}
                </option>
              ))}
            </select>
          </div>

          {msg && (
            <p className={`text-sm ${msg.kind === "ok" ? "text-accent-soft" : "text-danger"}`}>
              {msg.text}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "Granting…" : "Grant for free"}
          </button>
        </form>
      </div>
    </div>
  );
}
