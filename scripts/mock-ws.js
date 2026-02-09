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
  const payload = {
    topic: 'scores',
    data: {
      user: ['Alice', 'Bob', 'Carol', 'Dave'][Math.floor(Math.random() * 4)],
      score: Math.floor(Math.random() * 1000),
      ts: Date.now(),
    },
  }
  ws.send(JSON.stringify(payload))
}

wss.on('connection', (ws) => {
  console.log('client connected')
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) sendRandomScore(ws)
  }, 1000)

  ws.on('message', (msg) => {
    console.log('received from client:', String(msg))
  })

  ws.on('close', () => {
    clearInterval(interval)
    console.log('client disconnected')
  })
})
