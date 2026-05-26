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
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem' }}>

      {/* Hero */}
      <div style={{
        textAlign: 'center',
        padding: '3rem 1rem',
        marginBottom: '2rem',
        background: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #eee'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆 Tournament App</h1>
        <p style={{ color: '#555', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
          Organize and participate in competitive gaming tournaments.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/tournaments"
            style={{
              padding: '0.6rem 1.4rem',
              background: '#333',
              color: 'white',
              borderRadius: '4px',
              textDecoration: 'none'
            }}
          >
            Browse Tournaments
          </Link>
          <Link
            to="/register"
            style={{
              padding: '0.6rem 1.4rem',
              border: '1px solid #333',
              borderRadius: '4px',
              textDecoration: 'none',
              color: '#333'
            }}
          >
            Register
          </Link>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap'
        }}>
          <div style={{
            flex: 1, minWidth: '150px', padding: '1rem',
            border: '1px solid #eee', borderRadius: '4px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{tournaments.length}</div>
            <div style={{ color: '#555' }}>Total Tournaments</div>
          </div>
          <div style={{
            flex: 1, minWidth: '150px', padding: '1rem',
            border: '1px solid #eee', borderRadius: '4px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{ongoingTournaments.length}</div>
            <div style={{ color: '#555' }}>Ongoing</div>
          </div>
          <div style={{
            flex: 1, minWidth: '150px', padding: '1rem',
            border: '1px solid #eee', borderRadius: '4px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{plannedTournaments.length}</div>
            <div style={{ color: '#555' }}>Upcoming</div>
          </div>
          <div style={{
            flex: 1, minWidth: '150px', padding: '1rem',
            border: '1px solid #eee', borderRadius: '4px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{videogames.length}</div>
            <div style={{ color: '#555' }}>Videogames</div>
          </div>
        </div>
      )}

      {/* Torneos en curso */}
      {!loading && ongoingTournaments.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2>🟢 Ongoing Tournaments</h2>
          {ongoingTournaments.map(t => (
            <div key={t.id} style={{
              border: '1px solid #ccc', borderRadius: '4px',
              padding: '1rem', marginBottom: '0.75rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <strong>{t.name}</strong>
                <div style={{ color: '#555', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {videogameName(t.videogame_id)} · {statusLabel(t.status)} · Max: {t.max_players} players
                </div>
              </div>
              <Link
                to={`/tournaments/${t.id}`}
                style={{
                  padding: '0.4rem 0.9rem',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  color: '#333',
                  whiteSpace: 'nowrap',
                  marginLeft: '1rem'
                }}
              >
                View →
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* Próximos torneos */}
      {!loading && plannedTournaments.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2>🟡 Upcoming Tournaments</h2>
          {plannedTournaments.map(t => (
            <div key={t.id} style={{
              border: '1px solid #ccc', borderRadius: '4px',
              padding: '1rem', marginBottom: '0.75rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <strong>{t.name}</strong>
                <div style={{ color: '#555', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {videogameName(t.videogame_id)} · Start: {t.start_date} · Max: {t.max_players} players
                  {t.registrations_open === 1
                    ? ' · 🟢 Registrations open'
                    : ' · 🔴 Registrations closed'}
                </div>
              </div>
              <Link
                to={`/tournaments/${t.id}`}
                style={{
                  padding: '0.4rem 0.9rem',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  color: '#333',
                  whiteSpace: 'nowrap',
                  marginLeft: '1rem'
                }}
              >
                View →
              </Link>
            </div>
          ))}
        </section>
      )}

      {!loading && tournaments.length === 0 && (
        <p style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>
          No tournaments yet. <Link to="/tournaments">Check the tournaments page</Link>.
        </p>
      )}

      {loading && <p style={{ textAlign: 'center', color: '#888' }}>Loading...</p>}

    </div>
  )
}

export default HomePage