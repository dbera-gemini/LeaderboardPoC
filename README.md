# Leaderboard POC

This app renders a live trading leaderboard with team cards, an AG Grid table, and a Team Details view. Data is streamed from a mock WebSocket server and processed via a web-worker.

## How the App Works

### Data Flow Overview
1. **Mock WebSocket server** emits messages on `team_pnl` and `asset_pnl` topics.
2. **Web worker** (`src/workers/dataProcessor.worker.ts`) ingests messages and broadcasts updates per topic.
3. **App state** (`src/hooks/useLeaderboard.ts`) updates teams, the grid, and the details view.

### Snapshot + Continuous Stream Logic
The mock server sends:
- **Snapshots** on connect for both topics and ranges:
  - `team_pnl`: `1D` (24 points), `1W` (7 points), `1M` (30 points)
  - `asset_pnl`: `1D`, `1W`, `1M`
- **Continuous stream**: new deltas after the snapshot (both topics).

In the app:
- `historySeries` is populated from the **team_pnl** snapshot and **never mutated**.
- `liveSeries` is appended with incoming **team_pnl** deltas.
- The chart uses `historySeries + liveSeries` so the left (historical) portion stays fixed while new points append on the right.
- Asset bubbles are aggregated from **asset_pnl** messages.

## API + Data Structures

### API Instructions (Mock Server Contract)
- **Protocol**: WebSocket
- **Endpoint**: `ws://localhost:8080`
- **Topics**: `team_pnl`, `asset_pnl`
- **Handshake behavior**: on connect, send **snapshots** for `1D`, `1W`, `1M`, then stream **deltas** continuously.
- **team_pnl required fields**: `teamId`, `user`, `pnl`, `ts`
- **team_pnl optional fields**: `sharpe`, `winrate`, `max_drawdown`, `risk_per_trade`
- **asset_pnl required fields**: `teamId`, `user`, `product_type`, `asset`, `assetPnl`, `assetVolume`, `ts`

The client will:
- use `teamId` to route updates to the correct team,
- treat the snapshot as immutable history,
- append deltas to the live series.

## Current P&L Semantics
The app does **not** calculate P&L. It treats `pnl` as **current cumulative P&L** provided by the server (i.e., the team’s P&L value at that timestamp). The UI uses the series to derive:
- **Realized P&L**: `last(pnl) - first(pnl)`
- **P&L %**: `(realized / |first|) * 100`
- **Chart**: plots the 24‑hour history plus live deltas

If you want a different model, compute it server‑side and send it as `pnl` (the UI will treat it as the timeline value).

### Example: Current P&L Over Time (team_pnl)
Snapshot (hourly cumulative P&L for a team):
```json
{
  "topic": "team_pnl",
  "type": "snapshot",
  "data": [
    { "user": "Alice", "teamId": "alpha", "pnl": 100, "ts": 1700000000000 },
    { "user": "Alice", "teamId": "alpha", "pnl": 105, "ts": 1700003600000 },
    { "user": "Alice", "teamId": "alpha", "pnl": 98,  "ts": 1700007200000 }
  ]
}
```

Live delta update (current P&L now 112):
```json
{
  "topic": "team_pnl",
  "data": {
    "user": "Alice",
    "teamId": "alpha",
    "pnl": 112,
    "ts": 1700010800000
  }
}
```

### WebSocket Payloads
All messages are JSON with a `topic` and `data`.

#### Snapshot message (team_pnl)
```json
{
  "topic": "team_pnl",
  "type": "snapshot",
  "range": "1D",
  "data": [
    {
      "user": "Alice",
      "teamId": "alpha",
      "pnl": 532,
      "sharpe": 1.12,
      "winrate": 64,
      "max_drawdown": 12.4,
      "risk_per_trade": 44,
      "ts": 1700000000000
    }
  ]
}
```

#### Snapshot message (asset_pnl)
```json
{
  "topic": "asset_pnl",
  "type": "snapshot",
  "range": "1D",
  "data": [
    {
      "user": "Alice",
      "teamId": "alpha",
      "product_type": "spot",
      "asset": "BTC",
      "assetPnl": 45.2,
      "assetVolume": 10234.5,
      "ts": 1700000000000
    }
  ]
}
```

**Snapshot requirements**
- Send **24 data points per team** for **1D** (hourly, representing **23h → now**).
- Send **7 data points per team** for **1W** (daily).
- Send **30 data points per team** for **1M** (daily).
- Each point should include a **timestamp (`ts`)** spaced to match the range.
- Points should be ordered by time or include valid timestamps so the client can sort.

#### Delta/update message (team_pnl)
```json
{
  "topic": "team_pnl",
  "data": {
    "user": "Alice",
    "teamId": "alpha",
    "pnl": 540,
    "sharpe": 1.08,
    "ts": 1700003600000
  }
}
```

#### Delta/update message (asset_pnl)
```json
{
  "topic": "asset_pnl",
  "data": {
    "user": "Alice",
    "teamId": "alpha",
    "product_type": "spot",
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
  winRate?: number
  riskPerTrade?: number
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

Configure WebSocket via `.env`:
- `VITE_WS_MODE=mock` connects to `ws://localhost:8080`
- `VITE_WS_MODE=real` connects to `ws://quant-comp-analytics.s-marketplace-staging.use1.eks.gem.link/ws/competition`
- `VITE_WS_URL=ws://custom-host/path` overrides the URL

When `VITE_WS_MODE=real`, the client sends:
```json
{ "type": "subscribe_team_metrics" }
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
- If the mock server is not running, the app will wait for live data (no seed teams in the client).
- The Team Details view opens by clicking a team card.
