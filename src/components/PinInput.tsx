"use client";

import { useRef } from "react";

export default function PinInput({
  length = 4,
  value,
  onChange,
  onComplete,
  error,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  error?: boolean;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  function setDigit(index: number, digit: string) {
    const chars = value.split("");
    chars[index] = digit;
    const next = chars.join("").slice(0, length);
    onChange(next);

    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
    if (next.length === length && !next.includes(undefined as unknown as string)) {
      onComplete?.(next);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted.padEnd(value.length, ""));
    if (pasted.length === length) onComplete?.(pasted);
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex justify-center gap-3">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={`h-16 w-14 rounded-2xl border bg-[rgba(247,240,237,0.05)] text-center font-display text-3xl italic text-ink transition-colors focus:outline-none ${
            error
              ? "border-danger"
              : "border-[var(--color-line)] focus:border-accent focus:shadow-[0_0_0_3px_rgba(230,57,78,0.16)]"
          }`}
        />
      ))}
    </div>
  );
}
