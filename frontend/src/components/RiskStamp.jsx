const LEVELS = {
  high: { color: "#c1442d", label: "HIGH RISK" },
  medium: { color: "#b48d38", label: "WATCH" },
  low: { color: "#2d5940", label: "FRESH" },
};

export default function RiskStamp({ level, score }) {
  const cfg = LEVELS[level] || LEVELS.low;
  return (
    <span
      className="risk-stamp px-3 py-1 text-[10px]"
      style={{ color: cfg.color }}
      title={`Risk score ${score}/100`}
    >
      {cfg.label} · {score}
    </span>
  );
}
