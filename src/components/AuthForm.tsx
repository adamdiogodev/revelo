"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError("Wrong email or password.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(
          error.message.includes("Password")
            ? "Your password needs at least 6 characters."
            : "We couldn't create that account. Try another email."
        );
        return;
      }
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setInfo("Account created! Check your email to confirm it before signing in.");
        setMode("signin");
      }
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-10">
      <div className="ambient" />

      <div className="relative z-10 w-full max-w-sm animate-[riseIn_500ms_ease-out]">
        <div className="flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Revelo"
            width={180}
            height={91}
            priority
            className="h-auto w-32"
          />
          <h1 className="mt-6 font-display text-3xl italic text-ink">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "signin" ? "Pick up where your party left off." : "Host your first party in a minute."}
          </p>
        </div>

        <div className="card mt-7 p-5">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-[rgba(247,240,237,0.05)] p-1">
            {(
              [
                ["signin", "Sign in"],
                ["signup", "Sign up"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                className={`rounded-full py-2 text-sm font-semibold transition-colors ${
                  mode === value ? "bg-ink text-bg" : "text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              autoFocus
              autoComplete="email"
              className="field"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="field"
            />

            {error && <p className="text-sm text-danger">{error}</p>}
            {info && <p className="text-sm text-accent-soft">{info}</p>}

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-muted">
          Guests never need an account — only hosts do.
        </p>
      </div>
    </div>
  );
}
