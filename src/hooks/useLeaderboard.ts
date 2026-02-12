import { useEffect, useState } from 'react'
import DataProcessor from '../workers/dataProcessor'
import type { AssetEntry, AssetSnapshotPayload, ScoreEntry, SnapshotPayload, Team } from '../types'

const WS_ENDPOINTS = {
  mock: 'ws://localhost:8080',
  real: 'ws://quant-comp-analytics.s-marketplace-staging.use1.eks.gem.link/ws/competition',
} as const

function resolveWsConfig() {
  const mode = import.meta.env.VITE_WS_MODE === 'real' ? 'real' : 'mock'
  const override = typeof import.meta.env.VITE_WS_URL === 'string' ? import.meta.env.VITE_WS_URL : ''
  return { mode, url: override || WS_ENDPOINTS[mode] }
}

function computeMaxDrawdown(series: number[]) {
  if (!series || series.length < 2) return 0
  let peak = series[0]
  let maxDD = 0
  for (const v of series) {
    peak = Math.max(peak, v)
    const dd = peak === 0 ? 0 : (peak - v) / peak
    maxDD = Math.max(maxDD, dd)
  }
  return maxDD * 100
}

function initTeams(): Team[] {
  return []
}

function resolveTeamIndex(teams: Team[], entry: ScoreEntry | AssetEntry) {
  if (!teams.length) return 0
  if (typeof entry.teamId === 'string') {
    const idx = teams.findIndex((t) => t.id === entry.teamId)
    if (idx >= 0) return idx
  }
  const key = entry.user || ''
  return Math.abs(key.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % teams.length
}

function createTeam(id: string, name: string, seedValue?: number): Team {
  const seed = typeof seedValue === 'number' ? [seedValue] : []
  return {
    id,
    name,
    historySeries: seed,
    historyByRange: { '1D': seed, '1W': [], '1M': [] },
    liveSeries: [],
    series: seed,
    sharpe: undefined,
    maxDrawdown: computeMaxDrawdown(seed),
    assets: {},
    assetsByRange: { '1D': {}, '1W': {}, '1M': {} },
  }
}

function ensureTeamIndex(teams: Team[], entry: ScoreEntry | AssetEntry) {
  if (typeof entry.teamId === 'string') {
    const idx = teams.findIndex((t) => t.id === entry.teamId)
    if (idx >= 0) return idx
    const seedValue = 'pnl' in entry ? entry.pnl : undefined
    const name = entry.user || `Team ${entry.teamId}`
    teams.push(createTeam(entry.teamId, name, seedValue))
    return teams.length - 1
  }
  return resolveTeamIndex(teams, entry)
}

function applyAssetUpdate(team: Team, entry: AssetEntry) {
  const asset = typeof entry.asset === 'string' ? entry.asset : 'UNK'
  const assetPnl = typeof entry.assetPnl === 'number' ? entry.assetPnl : 0
  const assetVolume = typeof entry.assetVolume === 'number' ? entry.assetVolume : 0
  const nextAssets = { ...(team.assets || {}) }
  const prevAsset = nextAssets[asset] || { count: 0, pnl: 0, volume: 0 }
  nextAssets[asset] = {
    count: prevAsset.count + 1,
    pnl: prevAsset.pnl + assetPnl,
    volume: prevAsset.volume + assetVolume,
  }
  return nextAssets
}

function applyLiveUpdate(team: Team, entry: ScoreEntry): Team {
  const value = typeof entry.pnl === 'number' ? entry.pnl : 0
  const sharpe = typeof entry.sharpe === 'number' ? entry.sharpe : team.sharpe
  const winRate = typeof entry.winrate === 'number' ? entry.winrate : team.winRate
  const riskPerTrade = typeof entry.risk_per_trade === 'number' ? entry.risk_per_trade : team.riskPerTrade
  const liveSeries = [...(team.liveSeries || []), value].slice(-48)
  const series = [...(team.historySeries || []), ...liveSeries]
  const computedDd = computeMaxDrawdown(series)
  const maxDrawdown = typeof entry.max_drawdown === 'number' ? entry.max_drawdown : computedDd
  return {
    ...team,
    liveSeries,
    series,
    sharpe,
    winRate,
    maxDrawdown,
    riskPerTrade,
    assets: team.assets,
  }
}

function applySnapshot(teams: Team[], payload: SnapshotPayload) {
  const next = teams.map((t) => ({ ...t }))
  const range = payload.range ?? '1D'
  const buckets = new Map<number, ScoreEntry[]>()
  for (const entry of payload.data || []) {
    const idx = ensureTeamIndex(next, entry)
    if (!buckets.has(idx)) buckets.set(idx, [])
    buckets.get(idx)!.push(entry)
  }
  for (const [idx, list] of buckets.entries()) {
    list.sort((a, b) => (a.ts || 0) - (b.ts || 0))
    const history = list.map((e) => (typeof e.pnl === 'number' ? e.pnl : 0))
    const lastSharpe = list.length ? list[list.length - 1].sharpe : next[idx].sharpe
    const lastWin = list.length ? list[list.length - 1].winrate : next[idx].winRate
    const lastDd = list.length ? list[list.length - 1].max_drawdown : next[idx].maxDrawdown
    const lastRisk = list.length ? list[list.length - 1].risk_per_trade : next[idx].riskPerTrade
    const computedDd = computeMaxDrawdown(range === '1D' ? history : next[idx].series)
    next[idx] = {
      ...next[idx],
      historySeries: range === '1D' ? history : next[idx].historySeries,
      historyByRange: { ...(next[idx].historyByRange || {}), [range]: history },
      liveSeries: [],
      series: range === '1D' ? history : next[idx].series,
      sharpe: typeof lastSharpe === 'number' ? lastSharpe : next[idx].sharpe,
      winRate: typeof lastWin === 'number' ? lastWin : next[idx].winRate,
      maxDrawdown: typeof lastDd === 'number' ? lastDd : computedDd,
      riskPerTrade: typeof lastRisk === 'number' ? lastRisk : next[idx].riskPerTrade,
    }
  }
  return next
}

function applyAssetSnapshot(teams: Team[], payload: AssetSnapshotPayload) {
  const next = teams.map((t) => ({ ...t }))
  const range = payload.range ?? '1D'
  const buckets = new Map<number, AssetEntry[]>()
  for (const entry of payload.data || []) {
    const idx = ensureTeamIndex(next, entry)
    if (!buckets.has(idx)) buckets.set(idx, [])
    buckets.get(idx)!.push(entry)
  }
  for (const [idx, list] of buckets.entries()) {
    let assets = {}
    for (const entry of list) {
      assets = applyAssetUpdate({ ...next[idx], assets }, entry)
    }
    const assetsByRange = { ...(next[idx].assetsByRange || {}) }
    assetsByRange[range] = assets
    next[idx] = {
      ...next[idx],
      assets: range === '1D' ? assets : next[idx].assets,
      assetsByRange,
    }
  }
  return next
}

export function useLeaderboard() {
  const [teams, setTeams] = useState<Team[]>(() => initTeams())

  useEffect(() => {
    const dp = new DataProcessor()
    const pending: ScoreEntry[] = []
    let flushTimer: number | null = null

    const flush = () => {
      if (!pending.length) return
      setTeams((prev) => {
        const next = [...prev]
        for (const entry of pending.splice(0, pending.length)) {
          const idx = ensureTeamIndex(next, entry)
          next[idx] = applyLiveUpdate(next[idx], entry)
        }
        return next
      })
    }

    const subId = dp.subscribe('team_pnl', (msg) => {
      if (msg.type === 'update' && msg.topic === 'team_pnl') {
        pending.push(msg.entry as ScoreEntry)
      }
    })
    const assetSubId = dp.subscribe('asset_pnl', (msg) => {
      if (msg.type === 'update' && msg.topic === 'asset_pnl') {
        setTeams((prev) => {
          const next = [...prev]
          const idx = ensureTeamIndex(next, msg.entry as AssetEntry)
          const assets = applyAssetUpdate(next[idx], msg.entry as AssetEntry)
          next[idx] = {
            ...next[idx],
            assets,
            assetsByRange: { ...(next[idx].assetsByRange || {}), '1D': assets },
          }
          return next
        })
      }
    })

    const { mode, url } = resolveWsConfig()
    const ws = new WebSocket(url)
    ws.addEventListener('open', () => {
      if (mode === 'real') {
        ws.send(JSON.stringify({ type: 'subscribe_team_metrics' }))
      }
    })
    ws.addEventListener('message', (ev) => {
      try {
        const parsed = JSON.parse(ev.data as string)
        if (parsed && parsed.topic) {
          if (parsed.type === 'snapshot') {
            if (parsed.topic === 'team_pnl') {
              setTeams((prev) => applySnapshot(prev, parsed as SnapshotPayload))
            } else if (parsed.topic === 'asset_pnl') {
              setTeams((prev) => applyAssetSnapshot(prev, parsed as AssetSnapshotPayload))
            }
          } else {
            dp.ingest(parsed.topic, parsed.data)
          }
        }
      } catch (err) {
        console.error('invalid ws message', err)
      }
    })

    const frameLoop = () => {
      flush()
      flushTimer = window.requestAnimationFrame(frameLoop)
    }
    flushTimer = window.requestAnimationFrame(frameLoop)

    return () => {
      dp.unsubscribe(subId, 'team_pnl')
      dp.unsubscribe(assetSubId, 'asset_pnl')
      dp.terminate()
      ws.close()
      if (flushTimer != null) cancelAnimationFrame(flushTimer)
    }
  }, [])

  return { teams }
}
