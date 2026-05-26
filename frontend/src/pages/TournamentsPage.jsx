import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTournaments } from '../services/tournamentsService.js'
import { getVideogames } from '../services/videogamesService.js'

function TournamentsPage() {
  const [tournaments, setTournaments] = useState([])
  const [videogames, setVideogames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filtros
  const [filterName, setFilterName] = useState('')
  const [filterVideogame, setFilterVideogame] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const [tRes, vRes] = await Promise.all([
          getTournaments(),
          getVideogames()
        ])
        if (!cancelled) {
          setTournaments(tRes.data)
          setVideogames(vRes.data)
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Error loading tournaments')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const filtered = tournaments.filter(t => {
    const matchName = t.name.toLowerCase().includes(filterName.toLowerCase())
    const matchVideogame = filterVideogame === '' || t.videogame_id === Number(filterVideogame)
    const matchStatus = filterStatus === '' || t.status === filterStatus
    return matchName && matchVideogame && matchStatus
  })

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
    <div className="page-container">
      <div className="flex flex-between mb-1">
        <h1>Tournaments</h1>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 mb-15 flex-wrap">
        <input
          type="text"
          placeholder="Search by name..."
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className="form-control"
        />
        <select
          value={filterVideogame}
          onChange={(e) => setFilterVideogame(e.target.value)}
          className="form-control"
        >
          <option value="">All videogames</option>
          {videogames.map(vg => (
            <option key={vg.id} value={vg.id}>{vg.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="form-control"
        >
          <option value="">All statuses</option>
          <option value="planned">Planned</option>
          <option value="ongoing">Ongoing</option>
          <option value="finished">Finished</option>
        </select>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p>No tournaments found.</p>
      )}

      {!loading && !error && filtered.map(t => (
        <div key={t.id} className="card flex flex-between align-start">
          <div>
            <strong className="card-title">{t.name}</strong>
            <div className="meta-inline text-muted text-small mt-05">
              <span>{videogameName(t.videogame_id)}</span>
              <span>{statusLabel(t.status)}</span>
              <span>Max players: {t.max_players}</span>
              <span>Start: {t.start_date}</span>
            </div>
            {t.description && (
              <p className="text-muted mt-05">{t.description}</p>
            )}
          </div>
          <Link
            to={`/tournaments/${t.id}`}
            className="button-link button-link-secondary"
          >
            View →
          </Link>
        </div>
      ))}
    </div>
  )
}

export default TournamentsPage