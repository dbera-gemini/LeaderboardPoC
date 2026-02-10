import React, { useMemo } from 'react'

type Props = {
  name: string
  series: number[]
  sharpe?: number
  maxDrawdown?: number
  assets?: Record<string, { count: number; pnl: number; volume: number }>
  color?: string
  logoSrc?: string
  onBack?: () => void
}

function Sparkline({
  data,
  color = '#7dd3fc',
  height = 180,
}: {
  data: number[]
  color?: string
  height?: number
}) {
  if (!data || data.length === 0) return <div style={{ height }} />
  const w = 720
  const h = height
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max === min ? 1 : max - min
  const step = w / Math.max(1, data.length - 1)
  const coords = data.map((v, i) => ({
    x: i * step,
    y: h - ((v - min) / range) * h,
  }))
  const linePath = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${h} L 0 ${h} Z`
  const lastPoint = coords[coords.length - 1]

  return (
    <svg className="team-details-chart" width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="detailsFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#detailsFill)" />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        points={coords.map((p) => `${p.x},${p.y}`).join(' ')}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPoint.x} cy={lastPoint.y} r={3} fill={color} />
    </svg>
  )
}

export default function TeamDetails({
  name,
  series,
  sharpe,
  maxDrawdown,
  assets = {},
  color = '#60a5fa',
  logoSrc = 'src/assets/design/team-logo.png',
  onBack,
}: Props) {
  const lastN = useMemo(() => series.slice(-48), [series])
  const last = series?.length ? series[series.length - 1] : 0
  const first = series?.length ? series[0] : 0
  const pnl = last - first
  const winRate = useMemo(() => {
    if (!series || series.length < 2) return 0
    let wins = 0
    for (let i = 1; i < series.length; i++) {
      if (series[i] > series[i - 1]) wins++
    }
    return (wins / Math.max(1, series.length - 1)) * 100
  }, [series])

  const assetEntries = useMemo(() => {
    const entries = Object.entries(assets)
    entries.sort((a, b) => b[1].volume - a[1].volume)
    return entries.slice(0, 12)
  }, [assets])
  const maxVolume = assetEntries.reduce((m, [, v]) => Math.max(m, v.volume), 1)
  const maxPnl = assetEntries.reduce((m, [, v]) => Math.max(m, Math.abs(v.pnl)), 1)

  return (
    <section className="team-details">
      <div className="team-details-header">
        <button type="button" className="team-details-back" onClick={onBack}>
          Back
        </button>
        <div className="team-details-identity">
          <div className="team-details-logo">
            <img src={logoSrc} alt={`${name} logo`} />
          </div>
          <div>
            <div className="team-details-name">{name}</div>
            <div className="team-details-subtitle">Performance overview</div>
          </div>
        </div>
      </div>

      <div className="team-details-main">
        <div className="team-details-kpis">
          <div className="team-details-kpi">
            <div className="team-details-label">Net P&amp;L</div>
            <div className={`team-details-value ${pnl < 0 ? 'neg' : 'pos'}`}>{pnl.toFixed(0)}</div>
          </div>
          <div className="team-details-kpi">
            <div className="team-details-label">Win Rate</div>
            <div className="team-details-value">{winRate.toFixed(1)}%</div>
            <div className="team-details-mini">
              {Math.max(0, series.length - 1)} trades
            </div>
          </div>
          <div className="team-details-kpi">
            <div className="team-details-label">Sharpe</div>
            <div className="team-details-value">{typeof sharpe === 'number' ? sharpe.toFixed(2) : '—'}</div>
          </div>
          <div className="team-details-kpi">
            <div className="team-details-label">Max Drawdown</div>
            <div className="team-details-value">
              {typeof maxDrawdown === 'number' ? `${maxDrawdown.toFixed(2)}%` : '—'}
            </div>
          </div>
        </div>

        <div className="team-details-chart-wrap">
          <Sparkline data={lastN} color={color} height={180} />
        </div>
      </div>

      <div className="team-details-heatmap">
        <div className="team-details-heatmap-title">Assets Traded</div>
        <div className="team-details-heatmap-grid">
          {assetEntries.length === 0 ? (
            <div className="team-details-heatmap-empty">No trades yet</div>
          ) : (
            assetEntries.map(([asset, stats]) => {
              const sizeIntensity = Math.max(0.25, stats.volume / maxVolume)
              const colorIntensity = Math.max(0.25, Math.abs(stats.pnl) / maxPnl)
              const size = 77 + Math.round(50 * sizeIntensity)
              const isNeg = stats.pnl < 0
              const hue = isNeg ? 355 : 145
              return (
                <div
                  key={asset}
                  className="team-details-heatmap-bubble"
                  style={{
                    width: size,
                    height: size,
                    boxShadow: `0 12px 24px rgba(2,6,23,${0.2 + sizeIntensity * 0.25})`,
                    background: `radial-gradient(circle at 30% 30%, hsla(${hue}, 85%, 70%, ${0.35 + colorIntensity * 0.4}), rgba(15,23,42,0.85))`,
                    borderColor: `hsla(${hue}, 75%, 60%, ${0.35 + colorIntensity * 0.4})`,
                  }}
                >
                  <div className="team-details-heatmap-asset">{asset}</div>
                  <div className="team-details-heatmap-count">
                    ${Math.round(stats.volume).toLocaleString()}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
