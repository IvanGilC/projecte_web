import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTournaments } from '../services/tournamentsService.js'
import { getVideogames } from '../services/videogamesService.js'

function HomePage() {
  const [tournaments, setTournaments] = useState([])
  const [videogames, setVideogames] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [tRes, vRes] = await Promise.all([
          getTournaments(),
          getVideogames()
        ])
        if (!cancelled) {
          setTournaments(tRes.data)
          setVideogames(vRes.data)
        }
      } catch {
        // silently fail on home page
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const ongoingTournaments = tournaments.filter(t => t.status === 'ongoing')
  const plannedTournaments = tournaments.filter(t => t.status === 'planned')

  const statusLabel = (status) => {
    if (status === 'planned') return '🟡 Planned'
    if (status === 'ongoing') return '🟢 Ongoing'
    if (status === 'finished') return '⚫ Finished'
    return status
  }

  const videogameName = (id) => {
    const vg = videogames.find(v => v.id === id)
    return vg ? vg.name : '—'
  }

  return (
    <div className="page-container-mid">

      {/* Hero */}
      <div className="card-hero">
        <h1>🏆 Tournament App</h1>
        <p className="hero-copy">
          Organize and participate in competitive gaming tournaments.
        </p>
        <div className="hero-buttons">
          <Link
            to="/tournaments"
            className="button-link"
          >
            Browse Tournaments
          </Link>
          <Link
            to="/register"
            className="button-link button-link-secondary"
          >
            Register
          </Link>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{tournaments.length}</div>
            <div className="text-muted">Total Tournaments</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{ongoingTournaments.length}</div>
            <div className="text-muted">Ongoing</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{plannedTournaments.length}</div>
            <div className="text-muted">Upcoming</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{videogames.length}</div>
            <div className="text-muted">Videogames</div>
          </div>
        </div>
      )}

      {/* Torneos en curso */}
      {!loading && ongoingTournaments.length > 0 && (
        <section className="section">
          <h2>🟢 Ongoing Tournaments</h2>
          {ongoingTournaments.map(t => (
            <div key={t.id} className="card flex flex-between">
              <div>
                <strong>{t.name}</strong>
                <div className="meta-inline text-muted text-small mt-05">
                  <span>{videogameName(t.videogame_id)}</span>
                  <span>{statusLabel(t.status)}</span>
                  <span>Max: {t.max_players} players</span>
                </div>
              </div>
              <Link
                to={`/tournaments/${t.id}`}
                className="button-link button-link-secondary"
              >
                View →
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* Próximos torneos */}
      {!loading && plannedTournaments.length > 0 && (
        <section className="section">
          <h2>🟡 Upcoming Tournaments</h2>
          {plannedTournaments.map(t => (
            <div key={t.id} className="card flex flex-between">
              <div>
                <strong>{t.name}</strong>
                <div className="meta-inline text-muted text-small mt-05">
                  <span>{videogameName(t.videogame_id)}</span>
                  <span>Start: {t.start_date}</span>
                  <span>Max: {t.max_players} players</span>
                  <span>{t.registrations_open === 1 ? '🟢 Registrations open' : '🔴 Registrations closed'}</span>
                </div>
              </div>
              <Link
                to={`/tournaments/${t.id}`}
                className="button-link button-link-secondary"
              >
                View →
              </Link>
            </div>
          ))}
        </section>
      )}

      {!loading && tournaments.length === 0 && (
        <p className="text-muted text-center mt-2">
          No tournaments yet. <Link to="/tournaments">Check the tournaments page</Link>.
        </p>
      )}

      {loading && <p className="text-muted text-center">Loading...</p>}

    </div>
  )
}

export default HomePage