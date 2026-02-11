import { useMemo, useState } from 'react'
import gemiLogo from '../assets/design/gemi.png'

type Props = {
  name: string
  series: number[]
  historySeries?: number[]
  historyByRange?: Record<'1D' | '1W' | '1M', number[]>
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
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
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
  const activePoint = hoverIdx != null ? coords[hoverIdx] : null

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
      <div className="team-details-chart-hover">
        <svg
          className="team-details-chart"
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          onMouseMove={(e) => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
            const x = e.clientX - rect.left
            const idx = Math.min(coords.length - 1, Math.max(0, Math.round(x / (w / Math.max(1, coords.length - 1)))))
            setHoverIdx(idx)
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
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
      {activePoint && (
        <circle cx={activePoint.x} cy={activePoint.y} r={4} fill={color} />
      )}
    </svg>
    {activePoint && (
      <div
        className="team-details-tooltip"
        style={{
          left: `${(activePoint.x / w) * 100}%`,
          top: `${(activePoint.y / h) * 100}%`,
        }}
      >
        {activePoint.v >= 0 ? '+' : '-'}${Math.abs(activePoint.v).toFixed(0)}
      </div>
    )}
      </div>
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
  historyByRange,
  liveSeries = [],
  sharpe,
  maxDrawdown,
  assets = {},
  color = '#60a5fa',
  logoSrc = 'src/assets/design/team-logo.png',
  onBack,
}: Props) {
  const [range, setRange] = useState<'1D' | '1W' | '1M'>('1D')
  const [showPnlCard, setShowPnlCard] = useState(false)
  const fullSeries = useMemo(() => {
    if (range !== '1D') {
      return historyByRange?.[range] ?? historySeries ?? series
    }
    if (historySeries.length) return [...historySeries, ...liveSeries]
    return series
  }, [historyByRange, historySeries, liveSeries, range, series])
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

  const downloadPnlCard = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 720
    canvas.height = 420
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, 'rgba(15,23,42,0.95)')
    gradient.addColorStop(1, 'rgba(2,6,23,0.95)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = 'rgba(148,163,184,0.25)'
    ctx.lineWidth = 2
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32)

    ctx.fillStyle = 'rgba(148,163,184,0.9)'
    ctx.font = '16px Space Grotesk, sans-serif'
    ctx.fillText('Cumulative P&L', 40, 70)

    ctx.fillStyle = '#f8fafc'
    ctx.font = '28px Space Grotesk, sans-serif'
    ctx.fillText(name, 40, 110)

    const pnlColor = totalPnl < 0 ? '#fca5a5' : '#34d399'
    ctx.fillStyle = pnlColor
    ctx.font = '64px Space Grotesk, sans-serif'
    const pnlText = `${totalPnl < 0 ? '-' : '+'}$${Math.abs(totalPnl).toFixed(0)}`
    ctx.fillText(pnlText, 40, 200)

    ctx.fillStyle = 'rgba(226,232,240,0.8)'
    ctx.font = '22px Space Grotesk, sans-serif'
    const pctText = `(${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%)`
    ctx.fillText(pctText, 40, 238)

    ctx.fillStyle = 'rgba(148,163,184,0.8)'
    ctx.font = '16px Space Grotesk, sans-serif'
    ctx.fillText(`Range: ${range === '1D' ? '24H' : range}`, 40, 285)

    const link = document.createElement('a')
    link.download = `${name.replace(/\\s+/g, '-')}-pnl.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

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
          <div className="team-details-range">
            {(['1D', '1W', '1M'] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={`team-details-range-btn ${range === r ? 'active' : ''}`}
                onClick={() => setRange(r)}
              >
                {r === '1D' ? '24H' : r}
              </button>
            ))}
          </div>
          <div className="team-details-chart-header">
            <div className={`team-details-chart-value ${totalPnl < 0 ? 'neg' : 'pos'}`}>
              {totalPnl < 0 ? '-' : '+'}${Math.abs(totalPnl).toFixed(0)}
              <span className="team-details-chart-pct">({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)</span>
            </div>
            <button
              type="button"
              className="team-details-download"
              onClick={() => setShowPnlCard((s) => !s)}
            >
              {showPnlCard ? 'Hide P&L Card' : 'Show P&L Card'}
            </button>
          </div>
          <Sparkline data={cumulative} color={color} height={273} showRightAxis />
          <div className="team-details-times">
            {range === '1D' && (
              <>
                <span>24h</span>
                <span>18h</span>
                <span>12h</span>
                <span>6h</span>
                <span>Now</span>
              </>
            )}
            {range === '1W' && (
              <>
                <span>7d</span>
                <span>5d</span>
                <span>3d</span>
                <span>1d</span>
                <span>Now</span>
              </>
            )}
            {range === '1M' && (
              <>
                <span>30d</span>
                <span>21d</span>
                <span>14d</span>
                <span>7d</span>
                <span>Now</span>
              </>
            )}
          </div>
        </div>

        <div className="team-details-stats">
          <div className="team-details-kpi">
            <div className="team-details-label">Win Rate</div>
            <div className="team-details-value">{winRate.toFixed(1)}%</div>
            <div className="team-details-mini">
              {Math.max(0, series.length - 1)} trades
            </div>
            <div className="team-details-range-bar">
              <div className="team-details-range-track">
                <div
                  className="team-details-range-fill"
                  style={{ width: `${Math.min(100, Math.max(0, winRate))}%` }}
                />
              </div>
              <div className="team-details-range-labels">
                <span>Low</span>
                <span>Ok</span>
                <span>Good</span>
              </div>
            </div>
          </div>
          <div className="team-details-kpi">
            <div className="team-details-label">Sharpe</div>
            <div className="team-details-value">{typeof sharpe === 'number' ? sharpe.toFixed(2) : '—'}</div>
            {typeof sharpe === 'number' && (
              <div className="team-details-range-bar">
                <div className="team-details-range-track">
                  <div
                    className="team-details-range-fill"
                    style={{ width: `${Math.min(100, Math.max(0, (sharpe / 3) * 100))}%` }}
                  />
                </div>
                <div className="team-details-range-labels">
                  <span>Low</span>
                  <span>Ok</span>
                  <span>Good</span>
                  <span>3+</span>
                </div>
              </div>
            )}
          </div>
          <div className="team-details-kpi">
            <div className="team-details-label">Max Drawdown</div>
            <div className="team-details-value">
              {typeof maxDrawdown === 'number' ? `${maxDrawdown.toFixed(2)}%` : '—'}
            </div>
            {typeof maxDrawdown === 'number' && (
              <div className="team-details-range-bar">
                <div className="team-details-range-track">
                  <div
                    className="team-details-range-fill invert"
                    style={{ width: `${Math.min(100, Math.max(0, (maxDrawdown / 50) * 100))}%` }}
                  />
                </div>
                <div className="team-details-range-labels">
                  <span>Good</span>
                  <span>Ok</span>
                  <span>Low</span>
                </div>
              </div>
            )}
          </div>
          <div className="team-details-kpi">
            <div className="team-details-label">Net P&amp;L</div>
            <div className={`team-details-value ${pnl < 0 ? 'neg' : 'pos'}`}>{pnl.toFixed(0)}</div>
          </div>
        </div>
      </div>

      {showPnlCard && (
        <div className="team-details-modal" onClick={() => setShowPnlCard(false)}>
          <div className="team-details-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="team-details-download-card-inner">
          <div className="team-details-download-title">Cumulative P&amp;L</div>
          <img className="team-details-download-logo" src={gemiLogo} alt="Gemi logo" />
          <div className="team-details-download-name">{name}</div>
              <div className={`team-details-download-value ${totalPnl < 0 ? 'neg' : 'pos'}`}>
                {totalPnl < 0 ? '-' : '+'}${Math.abs(totalPnl).toFixed(0)}
                <span className="team-details-download-pct">
                  ({totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%)
                </span>
              </div>
              <div className="team-details-download-range">Range: {range === '1D' ? '24H' : range}</div>
            </div>
            <div className="team-details-download-mini">
              <Sparkline data={cumulative} color={color} height={90} showRightAxis={false} />
            </div>
            <div className="team-details-modal-actions">
              <button type="button" className="team-details-download" onClick={downloadPnlCard}>
                Download P&amp;L Card
              </button>
              <button type="button" className="team-details-download secondary" onClick={() => setShowPnlCard(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
