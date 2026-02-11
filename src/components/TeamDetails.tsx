import { useMemo } from 'react'

type Props = {
  name: string
  series: number[]
  historySeries?: number[]
  liveSeries?: number[]
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
  showRightAxis = false,
}: {
  data: number[]
  color?: string
  height?: number
  showRightAxis?: boolean
}) {
  if (!data || data.length === 0) return <div style={{ height }} />
  const w = 720
  const h = height
  const rawMin = Math.min(...data)
  const rawMax = Math.max(...data)
  const maxAbs = Math.max(Math.abs(rawMin), Math.abs(rawMax), 1)
  const min = -maxAbs
  const max = maxAbs
  const range = max - min
  const step = w / Math.max(1, data.length - 1)
  const coords = data.map((v, i) => ({
    x: i * step,
    y: h - ((v - min) / range) * h,
    v,
  }))
  const lastPoint = coords[coords.length - 1]

  const axisTicks = showRightAxis ? [max, 0, min] : []

  const zeroY = h - ((0 - min) / range) * h

  const buildSegments = () => {
    const pos: { x: number; y: number }[][] = []
    const neg: { x: number; y: number }[][] = []
    let current: { x: number; y: number }[] = []
    let currentSign: 'pos' | 'neg' | null = null
    for (let i = 0; i < coords.length; i++) {
      const p = coords[i]
      const sign = p.v >= 0 ? 'pos' : 'neg'
      if (currentSign === null) {
        currentSign = sign
        current.push({ x: p.x, y: p.y })
        continue
      }
      const prev = coords[i - 1]
      if (sign === currentSign) {
        current.push({ x: p.x, y: p.y })
      } else {
        const t = (0 - prev.v) / (p.v - prev.v)
        const ix = prev.x + (p.x - prev.x) * t
        const iy = prev.y + (p.y - prev.y) * t
        current.push({ x: ix, y: iy })
        if (currentSign === 'pos') pos.push(current)
        else neg.push(current)
        current = [{ x: ix, y: iy }, { x: p.x, y: p.y }]
        currentSign = sign
      }
    }
    if (current.length) {
      if (currentSign === 'pos') pos.push(current)
      else if (currentSign === 'neg') neg.push(current)
    }
    return { pos, neg }
  }

  const { pos, neg } = buildSegments()
  const pathFor = (seg: { x: number; y: number }[]) =>
    seg.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className={`team-details-chart-shell ${showRightAxis ? 'with-axis' : ''}`}>
      <svg className="team-details-chart" width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="#f87171" strokeWidth="1" strokeDasharray="4 4" />
        {pos.map((seg, i) => (
          <path
            key={`p-${i}`}
            d={pathFor(seg)}
            fill="none"
            stroke="#34d399"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {neg.map((seg, i) => (
          <path
            key={`n-${i}`}
            d={pathFor(seg)}
            fill="none"
            stroke="#fca5a5"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <circle cx={lastPoint.x} cy={lastPoint.y} r={3} fill={color} />
      </svg>
      {showRightAxis && (
        <div className="team-details-axis">
          {axisTicks.map((v, i) => (
            <div key={i} className="team-details-axis-label">
              {v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(0)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeamDetails({
  name,
  series,
  historySeries = [],
  liveSeries = [],
  sharpe,
  maxDrawdown,
  assets = {},
  color = '#60a5fa',
  logoSrc = 'src/assets/design/team-logo.png',
  onBack,
}: Props) {
  const fullSeries = useMemo(() => {
    if (historySeries.length) return [...historySeries, ...liveSeries]
    return series
  }, [historySeries, liveSeries, series])
  const chartSeries = useMemo(() => fullSeries.slice(-48), [fullSeries])
  const cumulative = useMemo(() => {
    if (!chartSeries.length) return []
    const base = chartSeries[0]
    return chartSeries.map((v) => v - base)
  }, [chartSeries])
  const totalPnl = fullSeries.length ? fullSeries[fullSeries.length - 1] - fullSeries[0] : 0
  const totalPnlPct = fullSeries.length && fullSeries[0] !== 0 ? (totalPnl / Math.abs(fullSeries[0])) * 100 : 0
  const last = fullSeries?.length ? fullSeries[fullSeries.length - 1] : 0
  const first = fullSeries?.length ? fullSeries[0] : 0
  const pnl = last - first
  const winRate = useMemo(() => {
    if (!fullSeries || fullSeries.length < 2) return 0
    let wins = 0
    for (let i = 1; i < fullSeries.length; i++) {
      if (fullSeries[i] > fullSeries[i - 1]) wins++
    }
    return (wins / Math.max(1, fullSeries.length - 1)) * 100
  }, [fullSeries])

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
        <div className="team-details-chart-wrap">
          <div className="team-details-chart-header">
            <div className={`team-details-chart-value ${totalPnl < 0 ? 'neg' : 'pos'}`}>
              {totalPnl < 0 ? '-' : '+'}${Math.abs(totalPnl).toFixed(0)}
              <span className="team-details-chart-pct">({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)</span>
            </div>
          </div>
          <Sparkline data={cumulative} color={color} height={273} showRightAxis />
          <div className="team-details-times">
            <span>24h</span>
            <span>18h</span>
            <span>12h</span>
            <span>6h</span>
            <span>Now</span>
          </div>
        </div>

        <div className="team-details-stats">
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
          <div className="team-details-kpi">
            <div className="team-details-label">Net P&amp;L</div>
            <div className={`team-details-value ${pnl < 0 ? 'neg' : 'pos'}`}>{pnl.toFixed(0)}</div>
          </div>
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
