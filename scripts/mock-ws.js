#!/usr/bin/env node
/**
 * Simple mock WebSocket server for testing the data processor.
 * Sends random 'scores' updates every second.
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

function sendRandomScore(ws) {
  const assets = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'DOGE', 'MATIC']
  const teams = TEAMS
  const pick = teams[Math.floor(Math.random() * teams.length)]
  const assetPnl = Number(((Math.random() - 0.48) * 200).toFixed(2))
  const assetVolume = Number((Math.random() * 15000 + 500).toFixed(2))
  const payload = {
    topic: 'scores',
    data: {
      user: pick.user,
      teamId: pick.id,
      score: Math.floor(Math.random() * 1000),
      sharpe: Number((Math.random() * 4 - 1).toFixed(2)),
      asset: assets[Math.floor(Math.random() * assets.length)],
      assetPnl,
      assetVolume,
      ts: Date.now(),
    },
  }
  ws.send(JSON.stringify(payload))
}

function sendSnapshot(ws) {
  const assets = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'DOGE', 'MATIC']
  const now = Date.now()
  const snapshot1d = []
  const snapshot1w = []
  const snapshot1m = []
  const jitter = (span) => Math.floor((Math.random() - 0.5) * span)
  for (const team of TEAMS) {
    const base = Math.floor(Math.random() * 800) + 200
    const weeklyDrift = Math.floor(Math.random() * 40) - 20
    const monthlyDrift = Math.floor(Math.random() * 80) - 40
    for (let i = 24; i >= 1; i--) {
      const score = Math.max(0, base + jitter(120))
      snapshot1d.push({
        user: team.user,
        teamId: team.id,
        score,
        sharpe: Number((Math.random() * 4 - 1).toFixed(2)),
        asset: assets[Math.floor(Math.random() * assets.length)],
        assetPnl: Number(((Math.random() - 0.48) * 200).toFixed(2)),
        assetVolume: Number((Math.random() * 15000 + 500).toFixed(2)),
        ts: now - i * 60 * 60 * 1000,
      })
    }
    for (let i = 7; i >= 1; i--) {
      const score = Math.max(0, base + weeklyDrift * (7 - i) + jitter(80))
      snapshot1w.push({
        user: team.user,
        teamId: team.id,
        score,
        sharpe: Number((Math.random() * 4 - 1).toFixed(2)),
        asset: assets[Math.floor(Math.random() * assets.length)],
        assetPnl: Number(((Math.random() - 0.48) * 200).toFixed(2)),
        assetVolume: Number((Math.random() * 15000 + 500).toFixed(2)),
        ts: now - i * 24 * 60 * 60 * 1000,
      })
    }
    for (let i = 30; i >= 1; i--) {
      const score = Math.max(0, base + monthlyDrift * (30 - i) + jitter(120))
      snapshot1m.push({
        user: team.user,
        teamId: team.id,
        score,
        sharpe: Number((Math.random() * 4 - 1).toFixed(2)),
        asset: assets[Math.floor(Math.random() * assets.length)],
        assetPnl: Number(((Math.random() - 0.48) * 200).toFixed(2)),
        assetVolume: Number((Math.random() * 15000 + 500).toFixed(2)),
        ts: now - i * 24 * 60 * 60 * 1000,
      })
    }
  }
  ws.send(JSON.stringify({ topic: 'scores', type: 'snapshot', range: '1D', data: snapshot1d }))
  ws.send(JSON.stringify({ topic: 'scores', type: 'snapshot', range: '1W', data: snapshot1w }))
  ws.send(JSON.stringify({ topic: 'scores', type: 'snapshot', range: '1M', data: snapshot1m }))
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
