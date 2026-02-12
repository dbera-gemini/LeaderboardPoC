import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './leaderboard.css'

import TeamCard from './components/TeamCard'
import TeamDetails from './components/TeamDetails'
import LeaderboardGrid from './components/LeaderboardGrid'
import teamALogo from './assets/design/Team-A.png'
import teamBLogo from './assets/design/Team-B.png'
import teamGLogo from './assets/design/Team-G.png'
import Countdown from './components/Countdown'
import headerImage from './assets/design/Header.png'
import { useLeaderboard } from './hooks/useLeaderboard'

function App() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [endAt] = useState(() => Date.now() + 15 * 24 * 60 * 60 * 1000)
  const { teams } = useLeaderboard()

  const selectedTeam = selectedTeamId ? teams.find((t) => t.id === selectedTeamId) : null
  const teamsRef = useRef(teams)
  const [topTeamIds, setTopTeamIds] = useState<string[]>(() => teams.slice(0, 3).map((t) => t.id))
  const [leaderFlash, setLeaderFlash] = useState(false)
  const [topFlash, setTopFlash] = useState(false)
  const prevLeaderRef = useRef<string | null>(null)

  useEffect(() => {
    teamsRef.current = teams
  }, [teams])

  const computeTop = (withFlash = false) => {
    const snapshot = [...teamsRef.current]
    if (!snapshot.length) return
    snapshot.sort((a, b) => {
      const aPnl = (a.series.at(-1) ?? 0) - (a.series[0] ?? 0)
      const bPnl = (b.series.at(-1) ?? 0) - (b.series[0] ?? 0)
      return bPnl - aPnl
    })
    const nextIds = snapshot.slice(0, 3).map((t) => t.id)
    setTopTeamIds(nextIds)
    if (withFlash) {
      const nextLeader = nextIds[0] ?? null
      if (nextLeader && nextLeader !== prevLeaderRef.current) {
        prevLeaderRef.current = nextLeader
        setTopFlash(true)
        setLeaderFlash(true)
        window.setTimeout(() => {
          setTopFlash(false)
          setLeaderFlash(false)
        }, 1200)
      }
    }
  }

  useEffect(() => {
    computeTop(true)
    const interval = window.setInterval(() => computeTop(true), 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!topTeamIds.length && teams.length) {
      computeTop(false)
    }
  }, [teams, topTeamIds.length])

  const topTeams = useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t]))
    return topTeamIds.map((id) => map.get(id)).filter(Boolean) as typeof teams
  }, [teams, topTeamIds])

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
          historySeries={selectedTeam.historySeries}
          historyByRange={selectedTeam.historyByRange}
          liveSeries={selectedTeam.liveSeries}
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
            {topTeams.map((team, idx) => {
              const color = idx === 0 ? '#34d399' : idx === 1 ? '#60a5fa' : '#f59e0b'
              const logoSrc = idx === 0 ? teamALogo : idx === 1 ? teamBLogo : teamGLogo
              const isLeader = idx === 0
              return (
                <TeamCard
                  key={team.id}
                  name={team.name}
                  series={team.series}
                  sharpe={team.sharpe}
                  maxDrawdown={team.maxDrawdown}
                  color={color}
                  logoSrc={logoSrc}
                  rank={idx + 1}
                  className={`${topFlash ? 'team-card-leader-flash' : ''} ${isLeader ? `team-card-leader ${leaderFlash ? 'team-card-leader-flash' : ''}` : ''}`.trim()}
                  onClick={() => setSelectedTeamId(team.id)}
                />
              )
            })}
          </div>

          <div>
            <div className="card">
              <LeaderboardGrid teams={teams} />
            </div>
          </div>
        </section>
      )}

    </div>
  )
}

export default App
