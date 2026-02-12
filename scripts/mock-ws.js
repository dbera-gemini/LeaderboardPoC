#!/usr/bin/env node
/**
 * Simple mock WebSocket server for testing the data processor.
 * Sends random team_pnl and asset_pnl updates.
 */
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 8080
const wss = new WebSocketServer({ port: PORT })

console.log(`Mock WebSocket server listening on ws://localhost:${PORT}`)

const TEAMS = [
  { id: 'alpha', user: 'Team Alpha' },
  { id: 'beta', user: 'Team Beta' },
  { id: 'gamma', user: 'Team Gamma' },
  { id: 'delta', user: 'Team Delta' },
  { id: 'epsilon', user: 'Team Epsilon' },
  { id: 'zeta', user: 'Team Zeta' },
  { id: 'eta', user: 'Team Eta' },
  { id: 'theta', user: 'Team Theta' },
  { id: 'iota', user: 'Team Iota' },
  { id: 'kappa', user: 'Team Kappa' },
]

function shuffle(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

let rankMap = null
function ensureRankMap() {
  if (rankMap) return
  const ids = shuffle(TEAMS.map((t) => t.id))
  rankMap = new Map(ids.map((id, idx) => [id, idx + 1]))
}

function maybeAdjustRanks() {
  ensureRankMap()
  if (Math.random() < 0.15) {
    const ids = TEAMS.map((t) => t.id)
    const a = ids[Math.floor(Math.random() * ids.length)]
    const b = ids[Math.floor(Math.random() * ids.length)]
    if (a !== b) {
      const ra = rankMap.get(a)
      const rb = rankMap.get(b)
      rankMap.set(a, rb)
      rankMap.set(b, ra)
    }
  }
}

function sendRandomScore(ws) {
  const assets = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'DOGE', 'MATIC']
  const teams = TEAMS
  ensureRankMap()
  maybeAdjustRanks()
  const pick = teams[Math.floor(Math.random() * teams.length)]
  const ranking = rankMap.get(pick.id) || 1
  const assetPnl = Number(((Math.random() - 0.48) * 200).toFixed(2))
  const assetVolume = Number((Math.random() * 15000 + 500).toFixed(2))
  const pnlPayload = {
    topic: 'team_pnl',
    data: {
      user: pick.user,
      teamId: pick.id,
      pnl: Math.floor(Math.random() * 1000),
      sharpe: Number((Math.random() * 4 - 1).toFixed(2)),
      winrate: Math.floor(Math.random() * 100),
      max_drawdown: Number((Math.random() * 50).toFixed(2)),
      risk_per_trade: Number((Math.random() * 100).toFixed(2)),
      ranking,
      ts: Date.now(),
    },
  }
  const assetPayload = {
    topic: 'asset_pnl',
    data: {
      user: pick.user,
      teamId: pick.id,
      product_type: 'spot',
      asset: assets[Math.floor(Math.random() * assets.length)],
      assetPnl,
      assetVolume,
      ts: Date.now(),
    },
  }
  ws.send(JSON.stringify(pnlPayload))
  ws.send(JSON.stringify(assetPayload))
}

function sendSnapshot(ws) {
  const assets = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'DOGE', 'MATIC']
  const now = Date.now()
  const snapshot1d = []
  const snapshot1w = []
  const snapshot1m = []
  const asset1d = []
  const asset1w = []
  const asset1m = []
  const jitter = (span) => Math.floor((Math.random() - 0.5) * span)
  ensureRankMap()
  for (const team of TEAMS) {
    const base = Math.floor(Math.random() * 800) + 200
    const weeklyDrift = Math.floor(Math.random() * 40) - 20
    const monthlyDrift = Math.floor(Math.random() * 80) - 40
    for (let i = 24; i >= 1; i--) {
      const ranking = rankMap.get(team.id) || 1
      const pnl = Math.max(0, base + jitter(120))
      snapshot1d.push({
        user: team.user,
        teamId: team.id,
        pnl,
        sharpe: Number((Math.random() * 4 - 1).toFixed(2)),
        winrate: Math.floor(Math.random() * 100),
        max_drawdown: Number((Math.random() * 50).toFixed(2)),
        risk_per_trade: Number((Math.random() * 100).toFixed(2)),
        ranking,
        ts: now - i * 60 * 60 * 1000,
      })
      asset1d.push({
        user: team.user,
        teamId: team.id,
        product_type: 'spot',
        asset: assets[Math.floor(Math.random() * assets.length)],
        assetPnl: Number(((Math.random() - 0.48) * 200).toFixed(2)),
        assetVolume: Number((Math.random() * 15000 + 500).toFixed(2)),
        ts: now - i * 60 * 60 * 1000,
      })
    }
    for (let i = 7; i >= 1; i--) {
      const ranking = rankMap.get(team.id) || 1
      const pnl = Math.max(0, base + weeklyDrift * (7 - i) + jitter(80))
      snapshot1w.push({
        user: team.user,
        teamId: team.id,
        pnl,
        sharpe: Number((Math.random() * 4 - 1).toFixed(2)),
        winrate: Math.floor(Math.random() * 100),
        max_drawdown: Number((Math.random() * 50).toFixed(2)),
        risk_per_trade: Number((Math.random() * 100).toFixed(2)),
        ranking,
        ts: now - i * 24 * 60 * 60 * 1000,
      })
      asset1w.push({
        user: team.user,
        teamId: team.id,
        product_type: 'spot',
        asset: assets[Math.floor(Math.random() * assets.length)],
        assetPnl: Number(((Math.random() - 0.48) * 200).toFixed(2)),
        assetVolume: Number((Math.random() * 15000 + 500).toFixed(2)),
        ts: now - i * 24 * 60 * 60 * 1000,
      })
    }
    for (let i = 30; i >= 1; i--) {
      const ranking = rankMap.get(team.id) || 1
      const pnl = Math.max(0, base + monthlyDrift * (30 - i) + jitter(120))
      snapshot1m.push({
        user: team.user,
        teamId: team.id,
        pnl,
        sharpe: Number((Math.random() * 4 - 1).toFixed(2)),
        winrate: Math.floor(Math.random() * 100),
        max_drawdown: Number((Math.random() * 50).toFixed(2)),
        risk_per_trade: Number((Math.random() * 100).toFixed(2)),
        ranking,
        ts: now - i * 24 * 60 * 60 * 1000,
      })
      asset1m.push({
        user: team.user,
        teamId: team.id,
        product_type: 'spot',
        asset: assets[Math.floor(Math.random() * assets.length)],
        assetPnl: Number(((Math.random() - 0.48) * 200).toFixed(2)),
        assetVolume: Number((Math.random() * 15000 + 500).toFixed(2)),
        ts: now - i * 24 * 60 * 60 * 1000,
      })
    }
  }
  ws.send(JSON.stringify({ topic: 'team_pnl', type: 'snapshot', range: '1D', data: snapshot1d }))
  ws.send(JSON.stringify({ topic: 'team_pnl', type: 'snapshot', range: '1W', data: snapshot1w }))
  ws.send(JSON.stringify({ topic: 'team_pnl', type: 'snapshot', range: '1M', data: snapshot1m }))
  ws.send(JSON.stringify({ topic: 'asset_pnl', type: 'snapshot', range: '1D', data: asset1d }))
  ws.send(JSON.stringify({ topic: 'asset_pnl', type: 'snapshot', range: '1W', data: asset1w }))
  ws.send(JSON.stringify({ topic: 'asset_pnl', type: 'snapshot', range: '1M', data: asset1m }))
}

wss.on('connection', (ws) => {
  console.log('client connected')
  sendSnapshot(ws)
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) sendRandomScore(ws)
  }, 200)

  ws.on('message', (msg) => {
    console.log('received from client:', String(msg))
  })

  ws.on('close', () => {
    clearInterval(interval)
    console.log('client disconnected')
  })
})
