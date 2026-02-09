import React from 'react'
import schoolLogo from '../assets/design/Team profile.png'

type Props = {
  title?: string
  schoolName?: string
  logo?: string
}

export default function Header({ title = 'Leaderboard', schoolName = 'Springfield High', logo }: Props) {
  return (
    <header className="lb-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={logo || schoolLogo} alt="school logo" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />
        <div>
          <h1>{schoolName}</h1>
          <p className="subtitle">{title} — Live rankings from the competition feed</p>
        </div>
      </div>
      <div className="lb-header-right">
        <button className="btn">Filters</button>
      </div>
    </header>
  )
}
