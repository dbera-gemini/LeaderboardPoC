import { useState } from 'react'
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
            {teams.slice(0, 3).map((team, idx) => {
              const color = idx === 0 ? '#34d399' : idx === 1 ? '#60a5fa' : '#f59e0b'
              const logoSrc = idx === 0 ? teamALogo : idx === 1 ? teamBLogo : teamGLogo
              return (
                <TeamCard
                  key={team.id}
                  name={team.name}
                  series={team.series}
                  sharpe={team.sharpe}
                  maxDrawdown={team.maxDrawdown}
                  color={color}
                  logoSrc={logoSrc}
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
