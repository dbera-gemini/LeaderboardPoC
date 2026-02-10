# Leaderboard POC

This app renders a live trading leaderboard with team cards, an AG Grid table, and a Team Details view. Data is streamed from a mock WebSocket server and processed via a web-worker.

## How the App Works

### Data Flow Overview
1. **Mock WebSocket server** emits messages on the `scores` topic.
2. **Web worker** (`src/workers/dataProcessor.worker.ts`) ingests messages and broadcasts updates.
3. **App state** (`src/App.tsx`) updates teams, the grid, and the details view.

### Snapshot + Continuous Stream Logic
The mock server sends:
- **Snapshot**: a 24‑hour historical series per team on connect (**24 points per team**, typically spaced 1 hour apart).
- **Continuous stream**: new deltas after the snapshot.

In the app:
- `historySeries` is populated from the snapshot and **never mutated**.
- `liveSeries` is appended with incoming deltas.
- The chart uses `historySeries + liveSeries` so the left (historical) portion stays fixed while new points append on the right.

## API + Data Structures

### WebSocket Payloads
All messages are JSON with a `topic` and `data`.

#### Snapshot message (24 points per team)
```json
{
  "topic": "scores",
  "type": "snapshot",
  "data": [
    {
      "user": "Alice",
      "teamId": "alpha",
      "score": 532,
      "sharpe": 1.12,
      "asset": "BTC",
      "assetPnl": 45.2,
      "assetVolume": 10234.5,
      "ts": 1700000000000
    }
  ]
}
```

**Snapshot requirements**
- Send **24 data points per team**.
- Each point should include a **timestamp (`ts`)** spaced **1 hour apart** (or your chosen cadence).
- Points should be ordered by time or include valid timestamps so the client can sort.

#### Delta/update message (continuous stream)
```json
{
  "topic": "scores",
  "data": {
    "user": "Alice",
    "teamId": "alpha",
    "score": 540,
    "sharpe": 1.08,
    "asset": "ETH",
    "assetPnl": -12.4,
    "assetVolume": 5342.9,
    "ts": 1700003600000
  }
}
```

### Team State Shape (simplified)
```ts
type Team = {
  id: string
  name: string
  series: number[]        // history + live
  historySeries: number[] // fixed 24h snapshot
  liveSeries: number[]    // deltas after snapshot
  sharpe?: number
  maxDrawdown?: number
  assets: Record<string, { count: number; pnl: number; volume: number }>
}
```

### Asset Heatmap
The Team Details view aggregates assets by:
- `count` (number of trades)
- `pnl` (sum of assetPnl)
- `volume` (sum of assetVolume)

Bubble sizing is based on **total volume** and color intensity is based on **P&L magnitude** (green for positive, red for negative).

## Running the App

Install dependencies:
```bash
npm install
```

Start the mock WebSocket server:
```bash
npm run start-mock-ws
```

In a second terminal, start the Vite dev server:
```bash
npm run dev
```

Open the app:
```
http://localhost:5173
```

## Notes
- If the mock server is not running, the app will render static seed data.
- The Team Details view opens by clicking a team card.
