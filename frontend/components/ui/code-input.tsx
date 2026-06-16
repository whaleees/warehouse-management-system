"use client";

import React, { useRef } from "react";

interface CodeInputProps {
  length?: number;
  value: string;
  onChange: (v: string) => void;
}

export default function CodeInput({
  length = 6,
  value,
  onChange,
}: CodeInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (idx: number, char: string) => {
    if (!/^[0-9a-zA-Z]?$/.test(char)) return;

    const chars = value.split("");
    chars[idx] = char.toUpperCase();
    const newValue = chars.join("");
    onChange(newValue);

    if (char && idx < length - 1) {
      inputs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el!;
          }}
          inputMode="text"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-14 w-12 rounded-lg border border-[var(--border)] bg-[var(--input)] text-center text-xl font-semibold text-[var(--foreground)] focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
      ))}
    </div>
  );
}
