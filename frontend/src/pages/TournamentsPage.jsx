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
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Tournaments</h1>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          style={{ flex: 1, minWidth: '160px', padding: '0.5rem' }}
        />
        <select
          value={filterVideogame}
          onChange={(e) => setFilterVideogame(e.target.value)}
          style={{ flex: 1, minWidth: '160px', padding: '0.5rem' }}
        >
          <option value="">All videogames</option>
          {videogames.map(vg => (
            <option key={vg.id} value={vg.id}>{vg.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ flex: 1, minWidth: '140px', padding: '0.5rem' }}
        >
          <option value="">All statuses</option>
          <option value="planned">Planned</option>
          <option value="ongoing">Ongoing</option>
          <option value="finished">Finished</option>
        </select>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p>No tournaments found.</p>
      )}

      {!loading && !error && filtered.map(t => (
        <div
          key={t.id}
          style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '1rem',
            marginBottom: '0.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <strong style={{ fontSize: '1.1rem' }}>{t.name}</strong>
            <div style={{ marginTop: '0.25rem', color: '#555', fontSize: '0.9rem' }}>
              <span>{videogameName(t.videogame_id)}</span>
              <span style={{ margin: '0 0.5rem' }}>·</span>
              <span>{statusLabel(t.status)}</span>
              <span style={{ margin: '0 0.5rem' }}>·</span>
              <span>Max players: {t.max_players}</span>
              <span style={{ margin: '0 0.5rem' }}>·</span>
              <span>Start: {t.start_date}</span>
            </div>
            {t.description && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem' }}>{t.description}</p>
            )}
          </div>
          <Link
            to={`/tournaments/${t.id}`}
            style={{
              marginLeft: '1rem',
              padding: '0.4rem 0.9rem',
              border: '1px solid #333',
              borderRadius: '4px',
              textDecoration: 'none',
              color: '#333',
              whiteSpace: 'nowrap'
            }}
          >
            View →
          </Link>
        </div>
      ))}
    </div>
  )
}

export default TournamentsPage