import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import {
  getTournamentById,
  updatePlayerStatus
} from '../services/tournamentsService.js'
import { updateMatch } from '../services/matchesService.js'

function TournamentManagePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refresh, setRefresh] = useState(0)

  // Estado para resultados de partidas
  const [matchInputs, setMatchInputs] = useState({})
  const [matchErrors, setMatchErrors] = useState({})
  const [matchSuccess, setMatchSuccess] = useState({})

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

  const isOwner = tournament && user && tournament.owner_id === Number(user.id)
  const isOrganizerOf = tournament && user && (
    isOwner ||
    user.role === 'admin' ||
    tournament.organizers.some(o => o.id === Number(user.id))
  )

  const handlePlayerStatus = async (playerId, status) => {
    try {
      await updatePlayerStatus(id, playerId, status)
      setRefresh(r => r + 1)
    } catch (err) {
      alert(err.response?.data?.error || 'Error updating player status')
    }
  }

  const handleMatchInputChange = (matchId, field, value) => {
    setMatchInputs(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: value }
    }))
  }

  const handleMatchSubmit = async (match) => {
    const inputs = matchInputs[match.id] || {}
    const winnerId = inputs.winner_id ? Number(inputs.winner_id) : undefined
    const score1 = inputs.score_player1 !== undefined && inputs.score_player1 !== ''
      ? Number(inputs.score_player1) : undefined
    const score2 = inputs.score_player2 !== undefined && inputs.score_player2 !== ''
      ? Number(inputs.score_player2) : undefined

    if (!winnerId) {
      setMatchErrors(prev => ({ ...prev, [match.id]: 'Please select a winner.' }))
      return
    }

    setMatchErrors(prev => ({ ...prev, [match.id]: null }))
    setMatchSuccess(prev => ({ ...prev, [match.id]: null }))

    try {
      await updateMatch(match.id, {
        winner_id: winnerId,
        score_player1: score1,
        score_player2: score2
      })
      setMatchSuccess(prev => ({ ...prev, [match.id]: 'Match updated!' }))
      setRefresh(r => r + 1)
    } catch (err) {
      setMatchErrors(prev => ({
        ...prev,
        [match.id]: err.response?.data?.error || 'Error updating match'
      }))
    }
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
  if (!isOrganizerOf) return <p className="text-error page-container">403 - Forbidden</p>

  const approvedPlayers = tournament.players.filter(p => p.status === 'approved')
  const pendingPlayers = tournament.players.filter(p => p.status === 'pending')
  const assignedMatches = tournament.matches.filter(m => m.status === 'assigned')
  const completedMatches = tournament.matches.filter(m => m.status === 'completed')
  const pendingMatches = tournament.matches.filter(m => m.status === 'pending')

  return (
    <div className="page-container">

      {/* Cabecera */}
      <div className="flex flex-between align-center mb-1">
        <div>
          <h1>{tournament.name} — Manage</h1>
          <p className="text-muted m-0">
            Status: <strong>{tournament.status}</strong> ·
            Type: <strong>{tournament.type}</strong> ·
            Max players: <strong>{tournament.max_players}</strong>
          </p>
        </div>
        <div className="card-actions">
          <button className="button" onClick={() => navigate(`/tournaments/${id}`)}>
            View Public Page
          </button>
          {(isOwner || user.role === 'admin') && (
            <button className="button" onClick={() => navigate(`/tournaments/${id}/owner`)}>
              Owner Settings
            </button>
          )}
        </div>
      </div>

      {/* Jugadores pendientes de aprobación */}
      {tournament.status === 'planned' && (
        <section className="section">
          <h2>Pending Registrations ({pendingPlayers.length})</h2>
          {pendingPlayers.length === 0 ? (
            <p className="text-muted">No pending registrations.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPlayers.map(p => (
                    <tr key={p.id}>
                      <td>{p.username}</td>
                      <td>
                        <div className="card-actions">
                          <button className="text-green" onClick={() => handlePlayerStatus(p.id, 'approved')}>
                            Approve
                          </button>
                          <button className="text-red" onClick={() => handlePlayerStatus(p.id, 'rejected')}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Jugadores aprobados */}
      <section className="section">
        <h2>Approved Players ({approvedPlayers.length} / {tournament.max_players})</h2>
        {approvedPlayers.length === 0 ? (
          <p className="text-muted">No approved players yet.</p>
        ) : (
          <ul>
            {approvedPlayers.map(p => (
              <li key={p.id}>{p.username}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Partidas pendientes de asignación */}
      {pendingMatches.length > 0 && (
        <section className="section">
          <h2>Pending Matches ({pendingMatches.length})</h2>
          <p className="text-muted">These matches will be assigned when the tournament starts.</p>
        </section>
      )}

      {/* Partidas asignadas — introducir resultados */}
      {assignedMatches.length > 0 && (
        <section className="section">
          <h2>Matches to Play ({assignedMatches.length})</h2>
          {assignedMatches.map(m => {
            const p1 = tournament.players.find(p => p.id === m.player1_id)
            const p2 = tournament.players.find(p => p.id === m.player2_id)
            const inputs = matchInputs[m.id] || {}

            return (
              <div key={m.id} className="card">
                <p className="text-muted mb-05 font-bold">
                  {m.round || 'Match'} — {p1?.username || '?'} vs {p2?.username || '?'}
                </p>
                <div className="flex gap-05 flex-wrap align-center">
                  <select
                    value={inputs.winner_id || ''}
                    onChange={(e) => handleMatchInputChange(m.id, 'winner_id', e.target.value)}
                    className="form-control form-control-sm"
                  >
                    <option value="">Select winner</option>
                    {p1 && <option value={p1.id}>{p1.username}</option>}
                    {p2 && <option value={p2.id}>{p2.username}</option>}
                  </select>
                  <input
                    type="number"
                    placeholder={`${p1?.username || 'P1'} score`}
                    value={inputs.score_player1 || ''}
                    onChange={(e) => handleMatchInputChange(m.id, 'score_player1', e.target.value)}
                    className="form-control form-control-sm"
                    min={0}
                  />
                  <input
                    type="number"
                    placeholder={`${p2?.username || 'P2'} score`}
                    value={inputs.score_player2 || ''}
                    onChange={(e) => handleMatchInputChange(m.id, 'score_player2', e.target.value)}
                    className="form-control form-control-sm"
                    min={0}
                  />
                  <button className="button" onClick={() => handleMatchSubmit(m)}>
                    Save Result
                  </button>
                </div>
                {matchErrors[m.id] && (
                  <p className="text-error mt-05">{matchErrors[m.id]}</p>
                )}
                {matchSuccess[m.id] && (
                  <p className="text-success mt-05">{matchSuccess[m.id]}</p>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* Partidas completadas */}
      {completedMatches.length > 0 && (
        <section className="section">
          <h2>Completed Matches ({completedMatches.length})</h2>
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
                {completedMatches.map(m => {
                  const p1 = tournament.players.find(p => p.id === m.player1_id)
                  const p2 = tournament.players.find(p => p.id === m.player2_id)
                  const winner = tournament.players.find(p => p.id === m.winner_id)
                  return (
                    <tr key={m.id}>
                      <td>{m.round || '—'}</td>
                      <td>{p1?.username || '—'}</td>
                      <td>{p2?.username || '—'}</td>
                      <td>
                        {m.score_player1 !== null && m.score_player2 !== null
                          ? `${m.score_player1} - ${m.score_player2}` : '—'}
                      </td>
                      <td>{winner?.username || '—'}</td>
                      <td>{matchStatusLabel(m.status)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  )
}

export default TournamentManagePage