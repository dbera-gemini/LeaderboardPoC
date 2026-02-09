import React from 'react'
import LeaderboardRow from './LeaderboardRow'

type Entry = { user: string; score: number; ts?: number }

export default function LeaderboardList({ entries }: { entries: Entry[] }) {
  return (
    <div className="lb-list">
      {entries.map((e, i) => (
        <LeaderboardRow key={e.user} rank={i + 1} user={e.user} score={e.score} ts={e.ts} />
      ))}
    </div>
  )
}
