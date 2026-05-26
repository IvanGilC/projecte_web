import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getTournamentById, registerToTournament } from '../services/tournamentsService.js'

// Componente árbol de eliminatoria
function EliminationBracket({ matches, players }) {
  const rounds = [...new Set(matches.map(m => m.round))].filter(Boolean)

  const getPlayer = (id) => players.find(p => p.id === id)

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: '2rem', minWidth: 'max-content', padding: '1rem 0' }}>
        {rounds.map(round => (
          <div key={round} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ textAlign: 'center', margin: '0 0 0.5rem' }}>{round}</h4>
            {matches.filter(m => m.round === round).map(m => {
              const p1 = getPlayer(m.player1_id)
              const p2 = getPlayer(m.player2_id)
              const winner = getPlayer(m.winner_id)
              return (
                <div key={m.id} style={{
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  minWidth: '180px'
                }}>
                  <div style={{
                    padding: '0.4rem 0.6rem',
                    background: winner?.id === p1?.id ? '#d4edda' : '#f8f9fa',
                    borderBottom: '1px solid #ccc',
                    fontWeight: winner?.id === p1?.id ? 'bold' : 'normal'
                  }}>
                    {p1 ? p1.username : '—'}
                    {m.score_player1 !== null && (
                      <span style={{ float: 'right', color: '#555' }}>{m.score_player1}</span>
                    )}
                  </div>
                  <div style={{
                    padding: '0.4rem 0.6rem',
                    background: winner?.id === p2?.id ? '#d4edda' : '#f8f9fa',
                    fontWeight: winner?.id === p2?.id ? 'bold' : 'normal'
                  }}>
                    {p2 ? p2.username : '—'}
                    {m.score_player2 !== null && (
                      <span style={{ float: 'right', color: '#555' }}>{m.score_player2}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// Componente tabla de liga
function LeagueTable({ matches, players }) {
  const approvedPlayers = players.filter(p => p.status === 'approved')

  const stats = approvedPlayers.map(player => {
    const playerMatches = matches.filter(m =>
      m.status === 'completed' &&
      (m.player1_id === player.id || m.player2_id === player.id)
    )
    const wins = playerMatches.filter(m => m.winner_id === player.id).length
    const losses = playerMatches.length - wins

    let goalsFor = 0
    let goalsAgainst = 0
    playerMatches.forEach(m => {
      if (m.player1_id === player.id) {
        goalsFor += m.score_player1 || 0
        goalsAgainst += m.score_player2 || 0
      } else {
        goalsFor += m.score_player2 || 0
        goalsAgainst += m.score_player1 || 0
      }
    })

    return {
      player,
      played: playerMatches.length,
      wins,
      losses,
      points: wins,
      goalsFor,
      goalsAgainst,
      goalDiff: goalsFor - goalsAgainst
    }
  }).sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left', background: '#f8f9fa' }}>
            <th style={{ padding: '0.5rem' }}>#</th>
            <th style={{ padding: '0.5rem' }}>Player</th>
            <th style={{ padding: '0.5rem', textAlign: 'center' }}>P</th>
            <th style={{ padding: '0.5rem', textAlign: 'center' }}>W</th>
            <th style={{ padding: '0.5rem', textAlign: 'center' }}>L</th>
            <th style={{ padding: '0.5rem', textAlign: 'center' }}>GF</th>
            <th style={{ padding: '0.5rem', textAlign: 'center' }}>GA</th>
            <th style={{ padding: '0.5rem', textAlign: 'center' }}>GD</th>
            <th style={{ padding: '0.5rem', textAlign: 'center' }}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={s.player.id} style={{
              borderBottom: '1px solid #eee',
              background: i === 0 ? '#fff9e6' : 'white'
            }}>
              <td style={{ padding: '0.5rem', color: '#888' }}>{i + 1}</td>
              <td style={{ padding: '0.5rem' }}>
                <strong>{s.player.username}</strong>
              </td>
              <td style={{ padding: '0.5rem', textAlign: 'center' }}>{s.played}</td>
              <td style={{ padding: '0.5rem', textAlign: 'center', color: 'green' }}>{s.wins}</td>
              <td style={{ padding: '0.5rem', textAlign: 'center', color: 'red' }}>{s.losses}</td>
              <td style={{ padding: '0.5rem', textAlign: 'center' }}>{s.goalsFor}</td>
              <td style={{ padding: '0.5rem', textAlign: 'center' }}>{s.goalsAgainst}</td>
              <td style={{ padding: '0.5rem', textAlign: 'center' }}>{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                <strong>{s.points}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
        P: Played · W: Wins · L: Losses · GF: Goals For · GA: Goals Against · GD: Goal Difference · Pts: Points
      </p>
    </div>
  )
}

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
  const [view, setView] = useState('table') // 'table' | 'bracket' | 'league'

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

  const hasStarted = tournament.status !== 'planned'
  const isElimination = tournament.type === 'elimination'
  const isLeague = tournament.type === 'league'

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
        <p style={{ marginBottom: '1.5rem', color: '#888' }}>🔴 Registrations are closed.</p>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Matches</h2>
          {hasStarted && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setView('table')}
                style={{
                  padding: '0.3rem 0.7rem',
                  background: view === 'table' ? '#333' : 'white',
                  color: view === 'table' ? 'white' : '#333',
                  border: '1px solid #333',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Table
              </button>
              {isElimination && (
                <button
                  onClick={() => setView('bracket')}
                  style={{
                    padding: '0.3rem 0.7rem',
                    background: view === 'bracket' ? '#333' : 'white',
                    color: view === 'bracket' ? 'white' : '#333',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Bracket
                </button>
              )}
              {isLeague && (
                <button
                  onClick={() => setView('league')}
                  style={{
                    padding: '0.3rem 0.7rem',
                    background: view === 'league' ? '#333' : 'white',
                    color: view === 'league' ? 'white' : '#333',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Standings
                </button>
              )}
            </div>
          )}
        </div>

        {tournament.matches.length === 0 ? (
          <p style={{ color: '#888' }}>No matches yet.</p>
        ) : (
          <>
            {view === 'table' && (
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

            {view === 'bracket' && isElimination && (
              <EliminationBracket
                matches={tournament.matches}
                players={tournament.players}
              />
            )}

            {view === 'league' && isLeague && (
              <LeagueTable
                matches={tournament.matches}
                players={tournament.players}
              />
            )}
          </>
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