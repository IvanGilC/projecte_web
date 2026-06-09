import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getUserRegistrations } from '../services/usersService.js'

function MyRegistrationsPage() {
  const { user } = useAuth()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const res = await getUserRegistrations(user.id)
        if (!cancelled) setRegistrations(res.data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Error loading registrations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user.id])

  const statusLabel = (status) => {
    if (status === 'approved') return '✅ Approved'
    if (status === 'pending') return '⏳ Pending'
    if (status === 'rejected') return '❌ Rejected'
    return status
  }

  const tournamentStatusLabel = (status) => {
    if (status === 'planned') return '🟡 Planned'
    if (status === 'ongoing') return '🟢 Ongoing'
    if (status === 'finished') return '⚫ Finished'
    return status
  }

  return (
    <div className="page-container">
      <h1>My Registrations</h1>

      {loading && <p>Loading...</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && registrations.length === 0 && (
        <p className="text-muted">You are not registered in any tournament yet. <Link to="/tournaments">Browse tournaments</Link>.</p>
      )}

      {!loading && !error && registrations.map(t => (
        <div key={t.id} className="card flex flex-between align-start">
          <div>
            <strong className="card-title">{t.name}</strong>
            <div className="meta-inline text-muted text-small mt-05">
              <span>{tournamentStatusLabel(t.status)}</span>
              <span>Type: {t.type}</span>
              <span>Start: {t.start_date}</span>
            </div>
            <div className="mt-05">
              Registration status: <strong>{statusLabel(t.registration_status)}</strong>
            </div>
          </div>
          <Link to={`/tournaments/${t.id}`} className="button-link button-link-secondary">
            View →
          </Link>
        </div>
      ))}
    </div>
  )
}

export default MyRegistrationsPage
