import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getTournamentById, registerToTournament } from '../services/tournamentsService.js'

function TournamentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [registerMsg, setRegisterMsg] = useState(null)
  const [registerError, setRegisterError] = useState(null)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const res = await getTournamentById(id)
        if (!cancelled) setTournament(res.data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Error loading tournament')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id, refresh])

  const handleRegister = async () => {
    setRegisterMsg(null)
    setRegisterError(null)
    setRegisterLoading(true)
    try {
      const res = await registerToTournament(id)
      setRegisterMsg(res.data.message)
      setRefresh(r => r + 1)
    } catch (err) {
      setRegisterError(err.response?.data?.error || 'Error registering')
    } finally {
      setRegisterLoading(false)
    }
  }

  const isAlreadyRegistered = () => {
    if (!tournament || !user) return false
    return tournament.players.some(p => p.id === Number(user.id))
  }

  const statusLabel = (status) => {
    if (status === 'planned') return '🟡 Planned'
    if (status === 'ongoing') return '🟢 Ongoing'
    if (status === 'finished') return '⚫ Finished'
    return status
  }

  const matchStatusLabel = (status) => {
    if (status === 'pending') return '⏳ Pending'
    if (status === 'assigned') return '🎮 Assigned'
    if (status === 'completed') return '✅ Completed'
    return status
  }

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>
  if (!tournament) return null

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem' }}>

      {/* Cabecera */}
      <h1>{tournament.name}</h1>
      <div style={{ color: '#555', marginBottom: '1rem' }}>
        <span>{statusLabel(tournament.status)}</span>
        <span style={{ margin: '0 0.5rem' }}>·</span>
        <span>Type: {tournament.type}</span>
        <span style={{ margin: '0 0.5rem' }}>·</span>
        <span>Max players: {tournament.max_players}</span>
        <span style={{ margin: '0 0.5rem' }}>·</span>
        <span>Start: {tournament.start_date}</span>
        {tournament.end_date && (
          <>
            <span style={{ margin: '0 0.5rem' }}>·</span>
            <span>End: {tournament.end_date}</span>
          </>
        )}
      </div>
      {tournament.description && (
        <p style={{ marginBottom: '1rem' }}>{tournament.description}</p>
      )}

      {/* Botón de gestión para organizers y admins */}
      {(user?.role === 'organizer' || user?.role === 'admin') && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            to={`/tournaments/${tournament.id}/manage`}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #333',
              borderRadius: '4px',
              textDecoration: 'none',
              color: '#333'
            }}
          >
            ⚙️ Manage Tournament
          </Link>
        </div>
      )}

      {/* Botón de inscripción para players */}
      {user?.role === 'player' && tournament.status === 'planned' && tournament.registrations_open === 1 && (
        <div style={{ marginBottom: '1.5rem' }}>
          {isAlreadyRegistered() ? (
            <p style={{ color: 'green' }}>✅ You are already registered in this tournament.</p>
          ) : (
            <button
              onClick={handleRegister}
              disabled={registerLoading}
              style={{ padding: '0.5rem 1.2rem' }}
            >
              {registerLoading ? 'Registering...' : 'Register to this tournament'}
            </button>
          )}
          {registerMsg && <p style={{ color: 'green', marginTop: '0.5rem' }}>{registerMsg}</p>}
          {registerError && <p style={{ color: 'red', marginTop: '0.5rem' }}>{registerError}</p>}
        </div>
      )}

      {user?.role === 'player' && tournament.status === 'planned' && tournament.registrations_open === 0 && (
        <p style={{ marginBottom: '1.5rem', color: '#888' }}>🔒 Registrations are closed.</p>
      )}

      {/* Organizadores */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2>Organizers</h2>
        {tournament.organizers.length === 0 ? (
          <p style={{ color: '#888' }}>No support organizers.</p>
        ) : (
          <ul>
            {tournament.organizers.map(o => (
              <li key={o.id}>{o.username}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Jugadores inscritos */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2>Players</h2>
        {tournament.players.length === 0 ? (
          <p style={{ color: '#888' }}>No players registered yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
                <th style={{ padding: '0.4rem' }}>Username</th>
                <th style={{ padding: '0.4rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tournament.players.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.4rem' }}>{p.username}</td>
                  <td style={{ padding: '0.4rem' }}>
                    {p.status === 'approved' && '✅ Approved'}
                    {p.status === 'pending' && '⏳ Pending'}
                    {p.status === 'rejected' && '❌ Rejected'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Partidas */}
      <section style={{ marginBottom: '1.5rem' }}>
        <h2>Matches</h2>
        {tournament.matches.length === 0 ? (
          <p style={{ color: '#888' }}>No matches yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
                <th style={{ padding: '0.4rem' }}>Round</th>
                <th style={{ padding: '0.4rem' }}>Player 1</th>
                <th style={{ padding: '0.4rem' }}>Player 2</th>
                <th style={{ padding: '0.4rem' }}>Score</th>
                <th style={{ padding: '0.4rem' }}>Winner</th>
                <th style={{ padding: '0.4rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tournament.matches.map(m => {
                const p1 = tournament.players.find(p => p.id === m.player1_id)
                const p2 = tournament.players.find(p => p.id === m.player2_id)
                const winner = tournament.players.find(p => p.id === m.winner_id)
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.4rem' }}>{m.round || '—'}</td>
                    <td style={{ padding: '0.4rem' }}>{p1 ? p1.username : '—'}</td>
                    <td style={{ padding: '0.4rem' }}>{p2 ? p2.username : '—'}</td>
                    <td style={{ padding: '0.4rem' }}>
                      {m.score_player1 !== null && m.score_player2 !== null
                        ? `${m.score_player1} - ${m.score_player2}`
                        : '—'}
                    </td>
                    <td style={{ padding: '0.4rem' }}>{winner ? winner.username : '—'}</td>
                    <td style={{ padding: '0.4rem' }}>{matchStatusLabel(m.status)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Clasificación final */}
      {tournament.status === 'finished' && tournament.standings && tournament.standings.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h2>Final Standings</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
                <th style={{ padding: '0.4rem' }}>Position</th>
                <th style={{ padding: '0.4rem' }}>Player</th>
                <th style={{ padding: '0.4rem' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {tournament.standings.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.4rem' }}>#{s.position}</td>
                  <td style={{ padding: '0.4rem' }}>{s.username}</td>
                  <td style={{ padding: '0.4rem' }}>{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

    </div>
  )
}

export default TournamentDetailPage