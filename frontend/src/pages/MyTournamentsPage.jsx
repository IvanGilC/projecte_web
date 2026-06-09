import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getUserTournaments } from '../services/usersService.js'

function MyTournamentsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const res = await getUserTournaments(user.id)
        if (!cancelled) setTournaments(res.data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Error loading tournaments')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user.id])

  const statusLabel = (status) => {
    if (status === 'planned') return '🟡 Planned'
    if (status === 'ongoing') return '🟢 Ongoing'
    if (status === 'finished') return '⚫ Finished'
    return status
  }

  return (
    <div className="page-container">
      <div className="flex flex-between mb-1">
        <h1>My Tournaments</h1>
        <button className="button" onClick={() => navigate('/tournaments/new')}>
          + New Tournament
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && tournaments.length === 0 && (
        <p className="text-muted">You have not created any tournaments yet.</p>
      )}

      {!loading && !error && tournaments.map(t => (
        <div key={t.id} className="card flex flex-between align-start">
          <div>
            <strong className="card-title">{t.name}</strong>
            <div className="meta-inline text-muted text-small mt-05">
              <span>{statusLabel(t.status)}</span>
              <span>Type: {t.type}</span>
              <span>Max players: {t.max_players}</span>
              <span>Start: {t.start_date}</span>
            </div>
          </div>
          <div className="card-actions">
            <Link to={`/tournaments/${t.id}`} className="button-link button-link-secondary">
              View
            </Link>
            <Link to={`/tournaments/${t.id}/manage`} className="button-link">
              Manage
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

export default MyTournamentsPage
