import teamProfile from '../assets/design/Team profile.png'

type Props = {
  rank: number
  user: string
  score: number
  ts?: number
}

export default function LeaderboardRow({ rank, user, score, ts }: Props) {
  return (
    <div className="lb-row">
      <div className="lb-rank">{rank}</div>
      <div className="lb-avatar">
        <img src={teamProfile} alt={`${user} avatar`} style={{ width: 44, height: 44, borderRadius: 8 }} />
      </div>
      <div className="lb-meta">
        <div className="lb-name">{user}</div>
        <div className="lb-time">{ts ? new Date(ts).toLocaleTimeString() : ''}</div>
      </div>
      <div className="lb-score">{score}</div>
    </div>
  )
}
