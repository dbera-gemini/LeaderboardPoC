export type AssetStats = {
  count: number
  pnl: number
  volume: number
}

export type Team = {
  id: string
  name: string
  series: number[]
  historySeries: number[]
  historyByRange: Record<'1D' | '1W' | '1M', number[]>
  liveSeries: number[]
  sharpe?: number
  winRate?: number
  maxDrawdown?: number
  riskPerTrade?: number
  assets: Record<string, AssetStats>
  assetsByRange: Record<'1D' | '1W' | '1M', Record<string, AssetStats>>
}

export type ScoreEntry = {
  user: string
  teamId?: string
  pnl: number
  sharpe?: number
  winrate?: number
  max_drawdown?: number
  risk_per_trade?: number
  ts?: number
}

export type SnapshotPayload = {
  topic: string
  type: 'snapshot'
  range?: '1D' | '1W' | '1M'
  data: ScoreEntry[]
}

export type AssetEntry = {
  user: string
  teamId?: string
  product_type?: string
  asset: string
  assetPnl?: number
  assetVolume?: number
  ts?: number
}

export type AssetSnapshotPayload = {
  topic: string
  type: 'snapshot'
  range?: '1D' | '1W' | '1M'
  data: AssetEntry[]
}

export type UpdatePayload = {
  topic: string
  data: ScoreEntry | AssetEntry
}
