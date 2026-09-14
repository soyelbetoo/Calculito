"use client";

import type { CurrencyCode } from "@/lib/types";

type Props = {
  value: CurrencyCode;
  onChange: (c: CurrencyCode) => void;
};

export default function CurrencyToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded border border-border-quiet p-0.5 gap-0.5">
      {(["USD", "EUR"] as const).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`text-xs px-3 py-1 rounded transition-colors ${
            value === c
              ? "bg-accent text-bg font-medium"
              : "text-text-faint hover:text-text-muted"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
