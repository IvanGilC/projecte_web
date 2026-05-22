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

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>
  if (!tournament) return null
  if (!isOrganizerOf) return <p style={{ padding: '2rem', color: 'red' }}>403 - Forbidden</p>

  const approvedPlayers = tournament.players.filter(p => p.status === 'approved')
  const pendingPlayers = tournament.players.filter(p => p.status === 'pending')
  const assignedMatches = tournament.matches.filter(m => m.status === 'assigned')
  const completedMatches = tournament.matches.filter(m => m.status === 'completed')
  const pendingMatches = tournament.matches.filter(m => m.status === 'pending')

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1>{tournament.name} — Manage</h1>
          <p style={{ color: '#555', margin: 0 }}>
            Status: <strong>{tournament.status}</strong> ·
            Type: <strong>{tournament.type}</strong> ·
            Max players: <strong>{tournament.max_players}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate(`/tournaments/${id}`)}>
            View Public Page
          </button>
          {(isOwner || user.role === 'admin') && (
            <button onClick={() => navigate(`/tournaments/${id}/owner`)}>
              Owner Settings
            </button>
          )}
        </div>
      </div>

      {/* Jugadores pendientes de aprobación */}
      {tournament.status === 'planned' && (
        <section style={{ marginBottom: '2rem' }}>
          <h2>Pending Registrations ({pendingPlayers.length})</h2>
          {pendingPlayers.length === 0 ? (
            <p style={{ color: '#888' }}>No pending registrations.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
                  <th style={{ padding: '0.4rem' }}>Username</th>
                  <th style={{ padding: '0.4rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPlayers.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.4rem' }}>{p.username}</td>
                    <td style={{ padding: '0.4rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handlePlayerStatus(p.id, 'approved')}
                        style={{ color: 'green' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handlePlayerStatus(p.id, 'rejected')}
                        style={{ color: 'red' }}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Jugadores aprobados */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Approved Players ({approvedPlayers.length} / {tournament.max_players})</h2>
        {approvedPlayers.length === 0 ? (
          <p style={{ color: '#888' }}>No approved players yet.</p>
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
        <section style={{ marginBottom: '2rem' }}>
          <h2>Pending Matches ({pendingMatches.length})</h2>
          <p style={{ color: '#888' }}>These matches will be assigned when the tournament starts.</p>
        </section>
      )}

      {/* Partidas asignadas — introducir resultados */}
      {assignedMatches.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2>Matches to Play ({assignedMatches.length})</h2>
          {assignedMatches.map(m => {
            const p1 = tournament.players.find(p => p.id === m.player1_id)
            const p2 = tournament.players.find(p => p.id === m.player2_id)
            const inputs = matchInputs[m.id] || {}

            return (
              <div key={m.id} style={{
                border: '1px solid #ccc', borderRadius: '4px',
                padding: '1rem', marginBottom: '0.75rem'
              }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 'bold' }}>
                  {m.round || 'Match'} — {p1?.username || '?'} vs {p2?.username || '?'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={inputs.winner_id || ''}
                    onChange={(e) => handleMatchInputChange(m.id, 'winner_id', e.target.value)}
                    style={{ padding: '0.4rem' }}
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
                    style={{ padding: '0.4rem', width: '120px' }}
                    min={0}
                  />
                  <input
                    type="number"
                    placeholder={`${p2?.username || 'P2'} score`}
                    value={inputs.score_player2 || ''}
                    onChange={(e) => handleMatchInputChange(m.id, 'score_player2', e.target.value)}
                    style={{ padding: '0.4rem', width: '120px' }}
                    min={0}
                  />
                  <button onClick={() => handleMatchSubmit(m)}>
                    Save Result
                  </button>
                </div>
                {matchErrors[m.id] && (
                  <p style={{ color: 'red', margin: '0.25rem 0 0' }}>{matchErrors[m.id]}</p>
                )}
                {matchSuccess[m.id] && (
                  <p style={{ color: 'green', margin: '0.25rem 0 0' }}>{matchSuccess[m.id]}</p>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* Partidas completadas */}
      {completedMatches.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2>Completed Matches ({completedMatches.length})</h2>
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
              {completedMatches.map(m => {
                const p1 = tournament.players.find(p => p.id === m.player1_id)
                const p2 = tournament.players.find(p => p.id === m.player2_id)
                const winner = tournament.players.find(p => p.id === m.winner_id)
                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.4rem' }}>{m.round || '—'}</td>
                    <td style={{ padding: '0.4rem' }}>{p1?.username || '—'}</td>
                    <td style={{ padding: '0.4rem' }}>{p2?.username || '—'}</td>
                    <td style={{ padding: '0.4rem' }}>
                      {m.score_player1 !== null && m.score_player2 !== null
                        ? `${m.score_player1} - ${m.score_player2}` : '—'}
                    </td>
                    <td style={{ padding: '0.4rem' }}>{winner?.username || '—'}</td>
                    <td style={{ padding: '0.4rem' }}>{matchStatusLabel(m.status)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

    </div>
  )
}

export default TournamentManagePage