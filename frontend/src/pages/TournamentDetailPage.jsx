import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getTournamentById, registerToTournament } from '../services/tournamentsService.js'
import { getVideogameById } from '../services/videogamesService.js'

// Componente árbol de eliminatoria
function EliminationBracket({ matches, players }) {
  const rounds = [...new Set(matches.map(m => m.round))].filter(Boolean)

  const getPlayer = (id) => players.find(p => p.id === id)

  return (
    <div className="table-responsive">
      <div className="bracket-grid">
        {rounds.map(round => (
          <div key={round} className="bracket-column">
            <h4 className="text-center mb-05">{round}</h4>
            {matches.filter(m => m.round === round).map(m => {
              const p1 = getPlayer(m.player1_id)
              const p2 = getPlayer(m.player2_id)
              const winner = getPlayer(m.winner_id)
              return (
                <div key={m.id} className="bracket-card">
                  <div className={winner?.id === p1?.id ? 'bracket-player winner' : 'bracket-player'}>
                    <span>{p1 ? p1.username : '—'}</span>
                    {m.score_player1 !== null && (
                      <span className="text-muted">{m.score_player1}</span>
                    )}
                  </div>
                  <div className={winner?.id === p2?.id ? 'bracket-player winner' : 'bracket-player'}>
                    <span>{p2 ? p2.username : '—'}</span>
                    {m.score_player2 !== null && (
                      <span className="text-muted">{m.score_player2}</span>
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
    <div className="table-responsive">
      <table className="table table-compact">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th className="text-center">P</th>
            <th className="text-center">W</th>
            <th className="text-center">L</th>
            <th className="text-center">GF</th>
            <th className="text-center">GA</th>
            <th className="text-center">GD</th>
            <th className="text-center">Pts</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={s.player.id} className={i === 0 ? 'table-row-highlight' : ''}>
              <td className="text-muted">{i + 1}</td>
              <td>
                <strong>{s.player.username}</strong>
              </td>
              <td className="text-center">{s.played}</td>
              <td className="text-center text-green">{s.wins}</td>
              <td className="text-center text-red">{s.losses}</td>
              <td className="text-center">{s.goalsFor}</td>
              <td className="text-center">{s.goalsAgainst}</td>
              <td className="text-center">{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
              <td className="text-center">
                <strong>{s.points}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted text-small mt-05">
        P: Played · W: Wins · L: Losses · GF: Goals For · GA: Goals Against · GD: Goal Difference · Pts: Points
      </p>
    </div>
  )
}

function TournamentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [videogame, setVideogame] = useState(null)
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

  useEffect(() => {
    let cancelled = false

    const loadVideogame = async () => {
      if (!tournament) return
      try {
        const res = await getVideogameById(tournament.videogame_id)
        if (!cancelled) setVideogame(res.data)
      } catch {
        if (!cancelled) setVideogame(null)
      }
    }

    loadVideogame()
    return () => { cancelled = true }
  }, [tournament])

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

  if (loading) return <p className="page-container">Loading...</p>
  if (error) return <p className="text-error page-container">{error}</p>
  if (!tournament) return null

  const hasStarted = tournament.status !== 'planned'
  const isElimination = tournament.type === 'elimination'
  const isLeague = tournament.type === 'league'

  return (
    <div className="page-container">

      {/* Cabecera */}
      <h1>{tournament.name}</h1>
      <div className="meta-inline text-muted mb-1">
        <span>{statusLabel(tournament.status)}</span>
        <span>Videogame: {videogame?.name || '—'}</span>
        <span>Type: {tournament.type}</span>
        <span>Max players: {tournament.max_players}</span>
        <span>Start: {tournament.start_date}</span>
        {tournament.end_date && (
          <span>End: {tournament.end_date}</span>
        )}
      </div>

      {tournament.description && (
        <p className="mb-1">{tournament.description}</p>
      )}

      {/* Botón de gestión para organizers y admins */}
      {(user?.role === 'organizer' || user?.role === 'admin') && (
        <div className="mb-15">
          <Link
            to={`/tournaments/${tournament.id}/manage`}
            className="button-link button-link-secondary"
          >
            ⚙️ Manage Tournament
          </Link>
        </div>
      )}

      {/* Botón de inscripción para players */}
      {user?.role === 'player' && tournament.status === 'planned' && tournament.registrations_open === 1 && (
        <div className="mb-15">
          {isAlreadyRegistered() ? (
            <p className="text-success">✅ You are already registered in this tournament.</p>
          ) : (
            <button
              onClick={handleRegister}
              disabled={registerLoading}
              className="button"
            >
              {registerLoading ? 'Registering...' : 'Register to this tournament'}
            </button>
          )}
          {registerMsg && <p className="text-success mt-05">{registerMsg}</p>}
          {registerError && <p className="text-error mt-05">{registerError}</p>}
        </div>
      )}

      {user?.role === 'player' && tournament.status === 'planned' && tournament.registrations_open === 0 && (
        <p className="text-muted mb-15">🔴 Registrations are closed.</p>
      )}

      {/* Organizadores */}
      <section className="section">
        <h2>Organizers</h2>
        {tournament.organizers.length === 0 ? (
          <p className="text-muted">No support organizers.</p>
        ) : (
          <ul>
            {tournament.organizers.map(o => (
              <li key={o.id}>{o.username}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Jugadores inscritos */}
      <section className="section">
        <h2>Players</h2>
        {tournament.players.length === 0 ? (
          <p className="text-muted">No players registered yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tournament.players.map(p => (
                  <tr key={p.id}>
                    <td>{p.username}</td>
                    <td>
                      {p.status === 'approved' && '✅ Approved'}
                      {p.status === 'pending' && '⏳ Pending'}
                      {p.status === 'rejected' && '❌ Rejected'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Partidas */}
      <section className="section">
        <div className="flex flex-between align-center mb-1">
          <h2 className="m-0">Matches</h2>
          {hasStarted && (
            <div className="flex gap-05">
              <button
                onClick={() => setView('table')}
                className={view === 'table' ? 'button-toggle active' : 'button-toggle'}
              >
                Table
              </button>
              {isElimination && (
                <button
                  onClick={() => setView('bracket')}
                  className={view === 'bracket' ? 'button-toggle active' : 'button-toggle'}
                >
                  Bracket
                </button>
              )}
              {isLeague && (
                <button
                  onClick={() => setView('league')}
                  className={view === 'league' ? 'button-toggle active' : 'button-toggle'}
                >
                  Standings
                </button>
              )}
            </div>
          )}
        </div>

        {tournament.matches.length === 0 ? (
          <p className="text-muted">No matches yet.</p>
        ) : (
          <>
            {view === 'table' && (
              <div className="table-responsive">
                <table className="table table-compact">
                  <thead>
                    <tr>
                      <th>Round</th>
                      <th>Player 1</th>
                      <th>Player 2</th>
                      <th>Score</th>
                      <th>Winner</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournament.matches.map(m => {
                      const p1 = tournament.players.find(p => p.id === m.player1_id)
                      const p2 = tournament.players.find(p => p.id === m.player2_id)
                      const winner = tournament.players.find(p => p.id === m.winner_id)
                      return (
                        <tr key={m.id}>
                          <td>{m.round || '—'}</td>
                          <td>{p1 ? p1.username : '—'}</td>
                          <td>{p2 ? p2.username : '—'}</td>
                          <td>
                            {m.score_player1 !== null && m.score_player2 !== null
                              ? `${m.score_player1} - ${m.score_player2}`
                              : '—'}
                          </td>
                          <td>{winner ? winner.username : '—'}</td>
                          <td>{matchStatusLabel(m.status)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
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
        <section className="section">
          <h2>Final Standings</h2>
          <div className="table-responsive">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Player</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {tournament.standings.map(s => (
                  <tr key={s.id}>
                    <td>#{s.position}</td>
                    <td>{s.username}</td>
                    <td>{s.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  )
}

export default TournamentDetailPage