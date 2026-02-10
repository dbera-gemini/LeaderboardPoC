#!/usr/bin/env node
/**
 * Simple mock WebSocket server for testing the data processor.
 * Sends random 'scores' updates every second.
 */
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 8080
const wss = new WebSocketServer({ port: PORT })

console.log(`Mock WebSocket server listening on ws://localhost:${PORT}`)

function sendRandomScore(ws) {
  const assets = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'LINK', 'DOGE', 'MATIC']
  const teams = [
    { id: 'alpha', user: 'Alice' },
    { id: 'beta', user: 'Bob' },
    { id: 'gamma', user: 'Carol' },
    { id: 'delta', user: 'Dave' },
  ]
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
  const users = ['Alice', 'Bob', 'Carol', 'Dave']
  const now = Date.now()
  const snapshot = []
  for (const user of users) {
    const base = Math.floor(Math.random() * 800) + 200
    for (let i = 24; i >= 1; i--) {
      const score = Math.max(0, base + Math.floor((Math.random() - 0.45) * 120))
      snapshot.push({
        user,
        score,
        sharpe: Number((Math.random() * 4 - 1).toFixed(2)),
        asset: assets[Math.floor(Math.random() * assets.length)],
        assetPnl: Number(((Math.random() - 0.48) * 200).toFixed(2)),
        assetVolume: Number((Math.random() * 15000 + 500).toFixed(2)),
        ts: now - i * 60 * 60 * 1000,
      })
    }
  }
  ws.send(JSON.stringify({ topic: 'scores', type: 'snapshot', data: snapshot }))
}

wss.on('connection', (ws) => {
  console.log('client connected')
  sendSnapshot(ws)
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) sendRandomScore(ws)
  }, 500)

  ws.on('message', (msg) => {
    console.log('received from client:', String(msg))
  })

  ws.on('close', () => {
    clearInterval(interval)
    console.log('client disconnected')
  })
})
