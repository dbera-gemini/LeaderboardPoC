import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import './leaderboard.css'
import DataProcessor from './workers/dataProcessor'
import FigmaEmbed from './FigmaEmbed'

import TeamCard from './components/TeamCard'
import LeaderboardList from './components/LeaderboardList'
import LeaderboardGrid from './components/LeaderboardGrid'
import Header from './components/Header'

function App() {
  const [items, setItems] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<{ user: string; score: number; ts?: number }[]>([]) 
  const [showDesign, setShowDesign] = useState(false)
  const [teams, setTeams] = useState(() => [
    { id: 'alpha', name: 'Team Alpha', series: [100, 120, 80, 150] },
    { id: 'beta', name: 'Team Beta', series: [50, 60, 40, 90] },
    { id: 'gamma', name: 'Team Gamma', series: [200, 180, 210, 190] },
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
          next[idx].series = [...next[idx].series.slice(-49), value]
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
        if (parsed && parsed.topic) dp.ingest(parsed.topic, parsed.data)
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

  return (
    <div className="App page-container">



      <h1>Leaderboard POC</h1>


      <section className="card lb-area">
        <div className="team-cards">
          <TeamCard name={teams[0].name} series={teams[0].series} color="#34d399" />
          <TeamCard name={teams[1].name} series={teams[1].series} color="#60a5fa" />
          <TeamCard name={teams[2].name} series={teams[2].series} color="#f59e0b" />
        </div>
        

        <div>
          <div className="card">
            <LeaderboardGrid teams={teams} />
          </div>
        </div>
      </section>

      {showDesign && <FigmaEmbed />}
    </div>
  )
}

export default App
