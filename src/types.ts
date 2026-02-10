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
  liveSeries: number[]
  sharpe?: number
  maxDrawdown?: number
  assets: Record<string, AssetStats>
}

export type ScoreEntry = {
  user: string
  teamId?: string
  score: number
  sharpe?: number
  asset?: string
  assetPnl?: number
  assetVolume?: number
  ts?: number
}

export type SnapshotPayload = {
  topic: string
  type: 'snapshot'
  data: ScoreEntry[]
}

export type UpdatePayload = {
  topic: string
  data: ScoreEntry
}
