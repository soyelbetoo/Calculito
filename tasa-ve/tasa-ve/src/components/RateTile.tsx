type RateTileProps = {
  label: string;
  value: number | null;
  previousValue?: number | null;
  detail?: string;
  hero?: boolean;
};

function formatBs(value: number): string {
  return value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function RateTile({
  label,
  value,
  previousValue,
  detail,
  hero = false,
}: RateTileProps) {
  const delta =
    value !== null && previousValue !== null && previousValue !== undefined
      ? value - previousValue
      : null;

  return (
    <div
      className={`rounded-lg border px-5 py-4 ${
        hero
          ? "border-accent/60 bg-surface shadow-[0_0_0_1px_rgba(242,183,5,0.15)]"
          : "border-border bg-surface-quiet"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-text-muted">{label}</p>
        {delta !== null && Math.abs(delta) > 0.005 && (
          <span
            className={`text-xs font-mono ${
              delta > 0 ? "text-up" : "text-down"
            }`}
          >
            {delta > 0 ? "▲" : "▼"} {formatBs(Math.abs(delta))}
          </span>
        )}
      </div>

      <p
        className={`mt-1 font-mono tabular-nums leading-none ${
          hero ? "text-5xl text-accent" : "text-3xl text-text"
        }`}
      >
        {value !== null ? formatBs(value) : "—"}
        <span className="ml-2 text-base font-sans text-text-faint">
          Bs/USD
        </span>
      </p>

      {detail && <p className="mt-2 text-xs text-text-faint">{detail}</p>}
    </div>
  );
}
