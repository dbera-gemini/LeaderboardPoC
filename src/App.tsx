import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import './leaderboard.css'
import DataProcessor from './workers/dataProcessor'
import FigmaEmbed from './FigmaEmbed'

import TeamCard from './components/TeamCard'
import TeamDetails from './components/TeamDetails'
import LeaderboardList from './components/LeaderboardList'
import LeaderboardGrid from './components/LeaderboardGrid'
import Header from './components/Header'
import teamALogo from './assets/design/Team-A.png'
import teamBLogo from './assets/design/Team-B.png'
import teamGLogo from './assets/design/Team-G.png'
import Countdown from './components/Countdown'
import headerImage from './assets/design/Header.png'

function App() {
  const [items, setItems] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<{ user: string; score: number; ts?: number }[]>([]) 
  const [showDesign, setShowDesign] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [endAt] = useState(() => Date.now() + 15 * 24 * 60 * 60 * 1000)
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
  const [teams, setTeams] = useState(() => [
    { id: 'alpha', name: 'Team Alpha', series: [100, 120, 80, 150], sharpe: 1.1, maxDrawdown: computeMaxDrawdown([100, 120, 80, 150]), assets: {} as Record<string, { count: number; pnl: number; volume: number }> },
    { id: 'beta', name: 'Team Beta', series: [50, 60, 40, 90], sharpe: 0.6, maxDrawdown: computeMaxDrawdown([50, 60, 40, 90]), assets: {} as Record<string, { count: number; pnl: number; volume: number }> },
    { id: 'gamma', name: 'Team Gamma', series: [200, 180, 210, 190], sharpe: 1.8, maxDrawdown: computeMaxDrawdown([200, 180, 210, 190]), assets: {} as Record<string, { count: number; pnl: number; volume: number }> },
  ])

  useEffect(() => {
    const dp = new DataProcessor()

    // Subscribe to 'scores' topic
    const subId = dp.subscribe('scores', (msg) => {
      if (msg.type === 'subscribed') {
        setItems(msg.snapshot || [])
      } else if (msg.type === 'update') {
        setItems((s) => [...s, msg.entry])
        // update leaderboard map (keep latest score per user)
        setLeaderboard((prev) => {
          const map = new Map(prev.map((p) => [p.user, p]))
          map.set(msg.entry.user, { user: msg.entry.user, score: msg.entry.score, ts: msg.entry.ts })
          const arr = Array.from(map.values()).sort((a, b) => b.score - a.score)
          return arr
        })
        // map incoming entry to a team (simple hash by name) and update team series
        setTeams((prev) => {
          const next = prev.map((t) => ({ ...t }))
          const key = msg.entry.user || ''
          const idx = Math.abs(key.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0)) % next.length
          const value = typeof msg.entry.score === 'number' ? msg.entry.score : Math.floor(Math.random() * 200)
          const sharpe = typeof msg.entry.sharpe === 'number' ? msg.entry.sharpe : next[idx].sharpe
          const series = [...next[idx].series.slice(-49), value]
          const asset = typeof msg.entry.asset === 'string' ? msg.entry.asset : 'UNK'
          const assetPnl = typeof msg.entry.assetPnl === 'number' ? msg.entry.assetPnl : 0
          const assetVolume = typeof msg.entry.assetVolume === 'number' ? msg.entry.assetVolume : 0
          const nextAssets = { ...(next[idx].assets || {}) }
          const prevAsset = nextAssets[asset] || { count: 0, pnl: 0, volume: 0 }
          nextAssets[asset] = {
            count: prevAsset.count + 1,
            pnl: prevAsset.pnl + assetPnl,
            volume: prevAsset.volume + assetVolume,
          }
          next[idx].series = series
          next[idx].sharpe = sharpe
          next[idx].maxDrawdown = computeMaxDrawdown(series)
          next[idx].assets = nextAssets
          return next
        })
      }
    })

    // Connect to mock websocket (run `npm run start-mock-ws`)
    const ws = new WebSocket('ws://localhost:8080')
    ws.addEventListener('open', () => console.log('ws open'))
    ws.addEventListener('message', (ev) => {
      try {
        const parsed = JSON.parse(ev.data as string)
        // forward to worker
        if (parsed && parsed.topic) {
          if (parsed.type === 'snapshot') {
            for (const entry of parsed.data || []) dp.ingest(parsed.topic, entry)
          } else {
            dp.ingest(parsed.topic, parsed.data)
          }
        }
      } catch (err) {
        console.error('invalid ws message', err)
      }
    })

    return () => {
      dp.unsubscribe(subId, 'scores')
      dp.terminate()
      ws.close()
    }
  }, [])

  const selectedTeam = selectedTeamId ? teams.find((t) => t.id === selectedTeamId) : null

  return (
    <div className="App page-container">
      <div className="hero-banner">
        <img src={headerImage} alt="Leaderboard header" />
      </div>

      <div className="header-row">
        <Countdown endAt={endAt} timeZone="America/New_York" />
        <div />
      </div>


      {selectedTeam ? (
        <TeamDetails
          name={selectedTeam.name}
          series={selectedTeam.series}
          sharpe={selectedTeam.sharpe}
          maxDrawdown={selectedTeam.maxDrawdown}
          assets={selectedTeam.assets}
          color={selectedTeam.id === 'alpha' ? '#34d399' : selectedTeam.id === 'beta' ? '#60a5fa' : '#f59e0b'}
          logoSrc={selectedTeam.id === 'alpha' ? teamALogo : selectedTeam.id === 'beta' ? teamBLogo : teamGLogo}
          onBack={() => setSelectedTeamId(null)}
        />
      ) : (
        <section className="card lb-area">
          <div className="team-cards">
            <TeamCard
              name={teams[0].name}
              series={teams[0].series}
              sharpe={teams[0].sharpe}
              maxDrawdown={teams[0].maxDrawdown}
              color="#34d399"
              logoSrc={teamALogo}
              onClick={() => setSelectedTeamId(teams[0].id)}
            />
            <TeamCard
              name={teams[1].name}
              series={teams[1].series}
              sharpe={teams[1].sharpe}
              maxDrawdown={teams[1].maxDrawdown}
              color="#60a5fa"
              logoSrc={teamBLogo}
              onClick={() => setSelectedTeamId(teams[1].id)}
            />
            <TeamCard
              name={teams[2].name}
              series={teams[2].series}
              sharpe={teams[2].sharpe}
              maxDrawdown={teams[2].maxDrawdown}
              color="#f59e0b"
              logoSrc={teamGLogo}
              onClick={() => setSelectedTeamId(teams[2].id)}
            />
          </div>

          <div>
            <div className="card">
              <LeaderboardGrid teams={teams} />
            </div>
          </div>
        </section>
      )}

      {showDesign && <FigmaEmbed />}
    </div>
  )
}

export default App
