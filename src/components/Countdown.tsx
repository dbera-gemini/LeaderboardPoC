import { useEffect, useMemo, useState } from 'react'

type Props = {
  endAt: number
  timeZone?: string
  label?: string
}

function formatParts(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}

export default function Countdown({ endAt, timeZone = 'America/New_York', label = 'Competition ends in' }: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const remaining = Math.max(0, endAt - now)
  const { days, hours, minutes, seconds } = useMemo(() => formatParts(remaining), [remaining])
  const isOver = remaining === 0

  const endLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(endAt)
    } catch {
      return new Date(endAt).toLocaleString()
    }
  }, [endAt, timeZone])

  return (
    <div className="countdown">
      <div className="countdown-top">
        <div className="countdown-label">{label}</div>
        <div className="countdown-meta">{timeZone.replace('_', ' ')}</div>
      </div>
      <div className="countdown-timer">
        <div className="countdown-unit">
          <div className="countdown-value">{String(days).padStart(2, '0')}</div>
          <div className="countdown-caption">Days</div>
        </div>
        <div className="countdown-sep">:</div>
        <div className="countdown-unit">
          <div className="countdown-value">{String(hours).padStart(2, '0')}</div>
          <div className="countdown-caption">Hours</div>
        </div>
        <div className="countdown-sep">:</div>
        <div className="countdown-unit">
          <div className="countdown-value">{String(minutes).padStart(2, '0')}</div>
          <div className="countdown-caption">Mins</div>
        </div>
        <div className="countdown-sep">:</div>
        <div className="countdown-unit">
          <div className="countdown-value">{String(seconds).padStart(2, '0')}</div>
          <div className="countdown-caption">Secs</div>
        </div>
      </div>
      <div className="countdown-footer">
        {isOver ? 'Competition ended' : `Ends on ${endLabel}`}
      </div>
    </div>
  )
}
