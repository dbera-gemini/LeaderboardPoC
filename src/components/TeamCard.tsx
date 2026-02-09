import React, { useId } from "react";

type Props = {
  name: string;
  series: number[];
  realizedPnl?: number;      // optional; if not provided we’ll use latest
  sharpe?: number;           // optional
  maxDrawdown?: number;      // optional (as % e.g. 12.3)
  color?: string;
  logoSrc?: string;
};

function Sparkline({
  data,
  color = "#7dd3fc",
  height = 56,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (!data || data.length === 0) return <div style={{ height }} />;
  const w = 260;
  const h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max === min ? 1 : max - min;
  const step = w / Math.max(1, data.length - 1);
  const coords = data.map((v, i) => ({
    x: i * step,
    y: h - ((v - min) / range) * h,
  }));
  const linePath = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${h} L 0 ${h} Z`;
  const lastPoint = coords[coords.length - 1];
  const gradientId = useId();

  return (
    <svg
      className="team-card-sparkline"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="team-card-sparkline-area" d={areaPath} fill={`url(#${gradientId})`} />
      <polyline
        className="team-card-sparkline-line"
        fill="none"
        stroke={color}
        strokeWidth={2}
        points={coords.map((p) => `${p.x},${p.y}`).join(" ")}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="team-card-sparkline-dot" cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill={color} />
    </svg>
  );
}

function formatMoney(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  // compact-ish formatting without Intl complexity
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function computeMaxDrawdown(series: number[]) {
  if (!series || series.length < 2) return 0;
  let peak = series[0];
  let maxDD = 0;
  for (const v of series) {
    peak = Math.max(peak, v);
    const dd = peak === 0 ? 0 : (peak - v) / peak;
    maxDD = Math.max(maxDD, dd);
  }
  return maxDD * 100; // percent
}

export default function TeamCard({
  name,
  series,
  realizedPnl,
  sharpe,
  maxDrawdown,
  color = "#60a5fa",
  logoSrc = "src/assets/design/team-logo.png",
}: Props) {
  const last = series?.length ? series[series.length - 1] : 0;
  const pnl = typeof realizedPnl === "number" ? realizedPnl : last;

  // sparkline uses last 14 for smoother look; tweak as you like
  const lastN = series.slice(-24);
  const sparkColor =
    lastN.length > 1 && lastN[lastN.length - 1] < lastN[0] ? "#fca5a5" : color;

  const dd = typeof maxDrawdown === "number" ? maxDrawdown : computeMaxDrawdown(series);
  const firstWindow = lastN[0] ?? 0;
  const lastWindow = lastN[lastN.length - 1] ?? 0;
  const trendBase = Math.max(1, Math.abs(firstWindow));
  const trendPct = lastN.length > 1 ? ((lastWindow - firstWindow) / trendBase) * 100 : 0;
  const rangeValue =
    lastN.length > 1 ? Math.max(...lastN) - Math.min(...lastN) : 0;

  return (
    <div className="team-card">
      <div className="team-card-inner">
        <div className="team-card-top">
          <div className="team-card-identity">
            <div className="team-card-logo">
              <img src={logoSrc} alt={`${name} logo`} />
            </div>
            <div className="team-card-name">{name}</div>
            <div className="team-card-subtitle">
              Portfolio · Hourly · {lastN.length} pts
            </div>
          </div>
          <div className="team-card-top-right">
            <div className="team-card-pnl">
              <div className="team-card-label">Net P&amp;L</div>
              <div className={`team-card-value ${pnl < 0 ? "neg" : "pos"}`}>
                {formatMoney(pnl)}
              </div>
              <div className="team-card-hint">Last 24h</div>
            </div>
            <div className={`team-card-trend ${trendPct >= 0 ? "up" : "down"}`}>
              <span className="team-card-trend-arrow">
                {trendPct >= 0 ? "▲" : "▼"}
              </span>
              {Math.abs(trendPct).toFixed(2)}%
            </div>
          </div>
        </div>

        <div className="team-card-spark">
          <Sparkline data={lastN} color={sparkColor} height={90} />
          <div className="team-card-spark-times">
            <span>24h</span>
            <span>18h</span>
            <span>12h</span>
            <span>6h</span>
            <span>Now</span>
          </div>
        </div>

        <div className="team-card-stats">
          <div className="team-card-stat">
            <div className="team-card-label">Sharpe</div>
            <div className="team-card-stat-value">
              {typeof sharpe === "number" ? sharpe.toFixed(2) : "—"}
            </div>
          </div>
          <div className="team-card-stat">
            <div className="team-card-label">Max Drawdown</div>
            <div className="team-card-stat-value">
              {dd ? `${dd.toFixed(2)}%` : "—"}
            </div>
          </div>
          <div className="team-card-stat">
            <div className="team-card-label">Range</div>
            <div className="team-card-stat-value">
              {rangeValue ? formatMoney(rangeValue) : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
