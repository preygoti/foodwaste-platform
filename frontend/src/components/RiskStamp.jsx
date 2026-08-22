const LEVELS = {
  high: {
    color: "#c1442d",
    bg: "rgba(193, 68, 45, 0.08)",
    border: "rgba(193, 68, 45, 0.35)",
    label: "HIGH RISK",
  },
  medium: {
    color: "#b48d38",
    bg: "rgba(180, 141, 56, 0.08)",
    border: "rgba(180, 141, 56, 0.35)",
    label: "WATCH",
  },
  low: {
    color: "#2d5940",
    bg: "rgba(45, 89, 64, 0.08)",
    border: "rgba(45, 89, 64, 0.35)",
    label: "FRESH",
  },
};

export default function RiskStamp({ level, score }) {
  const cfg = LEVELS[level] || LEVELS.low;
  return (
    <span
      className="inline-flex items-center gap-1 font-mono font-semibold px-2.5 py-0.5 text-[11px] rounded-full whitespace-nowrap tracking-wide border shadow-2xs"
      style={{
        color: cfg.color,
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
      }}
      title={`AI Waste Risk Score: ${score}/100 (${cfg.label})`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ backgroundColor: cfg.color }}
      />
      <span>{cfg.label}</span>
      <span className="opacity-60">·</span>
      <span>{score}</span>
    </span>
  );
}
