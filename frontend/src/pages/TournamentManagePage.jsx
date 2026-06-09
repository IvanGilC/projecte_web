import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import {
  getTournamentById,
  updateTournament,
  deleteTournament,
  startTournament,
  finishTournament,
  updateRegistrations,
  updatePlayerStatus,
  addOrganizer,
  removeOrganizer
} from '../services/tournamentsService.js'
import { getUserByUsername } from '../services/usersService.js'
import { updateMatch } from '../services/matchesService.js'

function TournamentManagePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refresh, setRefresh] = useState(0)

  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editError, setEditError] = useState(null)
  const [editSuccess, setEditSuccess] = useState(null)
  const [editLoading, setEditLoading] = useState(false)

  const [newOrganizerUsername, setNewOrganizerUsername] = useState('')
  const [orgError, setOrgError] = useState(null)
  const [orgSuccess, setOrgSuccess] = useState(null)
  const [orgLoading, setOrgLoading] = useState(false)

  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [playerActionLoading, setPlayerActionLoading] = useState({})
  const [matchEdits, setMatchEdits] = useState({})
  const [matchActionLoading, setMatchActionLoading] = useState({})
  const [matchActionError, setMatchActionError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const res = await getTournamentById(id)
        if (!cancelled) {
          setTournament(res.data)
          setEditName(res.data.name)
          setEditDescription(res.data.description || '')
          setEditStartDate(res.data.start_date)
          setEditEndDate(res.data.end_date || '')
        }
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
  const isSupportOrganizer = tournament && user && tournament.organizers.some(o => o.id === Number(user.id))
  const isAdmin = user?.role === 'admin'
  const canManage = Boolean(tournament && user && (isOwner || isSupportOrganizer || isAdmin))

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditError(null)
    setEditSuccess(null)
    setEditLoading(true)
    try {
      await updateTournament(id, {
        name: editName,
        description: editDescription,
        start_date: editStartDate,
        end_date: editEndDate || undefined
      })
      setEditSuccess('Tournament updated successfully.')
      setRefresh(r => r + 1)
    } catch (err) {
      setEditError(err.response?.data?.error || 'Error updating tournament')
    } finally {
      setEditLoading(false)
    }
  }

  const handleToggleRegistrations = async () => {
    setActionError(null)
    setActionSuccess(null)
    setActionLoading(true)
    try {
      await updateRegistrations(id, tournament.registrations_open === 0 ? true : false)
      setActionSuccess(
        tournament.registrations_open === 0
          ? 'Registrations opened.'
          : 'Registrations closed.'
      )
      setRefresh(r => r + 1)
    } catch (err) {
      setActionError(err.response?.data?.error || 'Error updating registrations')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStart = async () => {
    if (!window.confirm('Start the tournament? Players will be assigned to matches.')) return
    setActionError(null)
    setActionSuccess(null)
    setActionLoading(true)
    try {
      await startTournament(id)
      setActionSuccess('Tournament started!')
      setRefresh(r => r + 1)
    } catch (err) {
      setActionError(err.response?.data?.error || 'Error starting tournament')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinish = async () => {
    if (!window.confirm('Finish the tournament? This will calculate the final standings.')) return
    setActionError(null)
    setActionSuccess(null)
    setActionLoading(true)
    try {
      await finishTournament(id)
      setActionSuccess('Tournament finished! Final standings calculated.')
      setRefresh(r => r + 1)
    } catch (err) {
      setActionError(err.response?.data?.error || 'Error finishing tournament')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this tournament? This action cannot be undone.')) return
    try {
      await deleteTournament(id)
      navigate('/tournaments')
    } catch (err) {
      setActionError(err.response?.data?.error || 'Error deleting tournament')
    }
  }

  const handleAddOrganizer = async (e) => {
    e.preventDefault()
    setOrgError(null)
    setOrgSuccess(null)
    if (!newOrganizerUsername.trim()) {
      setOrgError('Please enter a username.')
      return
    }
    setOrgLoading(true)
    try {
      const userRes = await getUserByUsername(newOrganizerUsername.trim())
      const foundUser = userRes.data
      if (!foundUser) {
        setOrgError('User not found.')
        return
      }
      // Allow adding by username regardless of the user's global role;
      // backend should enforce or adjust roles if necessary.
      await addOrganizer(id, foundUser.id)
      setOrgSuccess(`Organizer "${foundUser.username}" added successfully.`)
      setNewOrganizerUsername('')
      setRefresh(r => r + 1)
    } catch (err) {
      if (err.response?.status === 404) {
        setOrgError('User not found.')
      } else {
        setOrgError(err.response?.data?.error || 'Error adding organizer')
      }
    } finally {
      setOrgLoading(false)
    }
  }

  const handleRemoveOrganizer = async (orgId) => {
    if (!window.confirm('Remove this organizer?')) return
    try {
      await removeOrganizer(id, orgId)
      setRefresh(r => r + 1)
    } catch (err) {
      alert(err.response?.data?.error || 'Error removing organizer')
    }
  }

  const handlePlayerStatus = async (playerId, status) => {
    setPlayerActionLoading(prev => ({ ...prev, [playerId]: true }))
    setActionError(null)
    setActionSuccess(null)
    try {
      await updatePlayerStatus(id, playerId, status)
      setActionSuccess(`Player ${status}.`)
      setRefresh(r => r + 1)
    } catch (err) {
      setActionError(err.response?.data?.error || 'Error updating player status')
    } finally {
      setPlayerActionLoading(prev => ({ ...prev, [playerId]: false }))
    }
  }

  const handleMatchEditChange = (matchId, field, value) => {
    setMatchEdits(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }))
  }

  const handleSaveMatch = async (match) => {
    const edit = matchEdits[match.id] || {}
    const payload = {}

    if (edit.score_player1 !== undefined) payload.score_player1 = Number(edit.score_player1)
    if (edit.score_player2 !== undefined) payload.score_player2 = Number(edit.score_player2)
    if (edit.winner_id) payload.winner_id = Number(edit.winner_id)

    if (Object.keys(payload).length === 0) {
      setMatchActionError('Fill in a score or winner before saving.')
      return
    }

    setMatchActionError(null)
    setMatchActionLoading(prev => ({ ...prev, [match.id]: true }))
    try {
      await updateMatch(match.id, payload)
      setActionSuccess('Match updated successfully.')
      setRefresh(r => r + 1)
    } catch (err) {
      setMatchActionError(err.response?.data?.error || 'Error saving match result')
    } finally {
      setMatchActionLoading(prev => ({ ...prev, [match.id]: false }))
    }
  }

  if (loading) return <p className="page-container">Loading...</p>
  if (error) return <p className="text-error page-container">{error}</p>
  if (!tournament) return null
  if (!canManage) return <p className="text-error page-container">403 - Unauthorized to manage this tournament.</p>

  return (
    <div className="page-container-mid">
      <div className="flex flex-between align-center mb-15">
        <div>
          <h1>{tournament.name}</h1>
          <p className="text-muted m-0">Manage tournament</p>
        </div>
        <div className="card-actions">
          <button className="button" onClick={() => navigate(`/tournaments/${id}`)}>
            View Public Page
          </button>
        </div>
      </div>

      <section className="card mb-15">
        <h2>Registrations</h2>
        {tournament.players.length === 0 ? (
          <p className="text-muted">No player registrations yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                    <td>
                      {p.status === 'pending' ? (
                        <div className="flex gap-05">
                          <button
                            className="button"
                            onClick={() => handlePlayerStatus(p.id, 'approved')}
                            disabled={playerActionLoading[p.id]}
                          >
                            Approve
                          </button>
                          <button
                            className="button-danger"
                            onClick={() => handlePlayerStatus(p.id, 'rejected')}
                            disabled={playerActionLoading[p.id]}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card mb-15">
        <h2>Matches</h2>
        {tournament.matches.length === 0 ? (
          <p className="text-muted">No matches have been created yet.</p>
        ) : (
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tournament.matches.map(match => {
                  const player1 = tournament.players.find(p => p.id === match.player1_id)
                  const player2 = tournament.players.find(p => p.id === match.player2_id)
                  const edit = matchEdits[match.id] || {}
                  const canEditMatch = match.status !== 'completed'
                  return (
                    <tr key={match.id}>
                      <td>{match.round || '—'}</td>
                      <td>{player1?.username || '—'}</td>
                      <td>{player2?.username || '—'}</td>
                      <td>
                        {match.score_player1 !== null && match.score_player2 !== null
                          ? `${match.score_player1} - ${match.score_player2}`
                          : '—'}
                      </td>
                      <td>{match.winner_id ? (tournament.players.find(p => p.id === match.winner_id)?.username || '—') : '—'}</td>
                      <td>{match.status}</td>
                      <td>
                        {canEditMatch ? (
                          <div className="flex flex-column gap-05">
                            <input
                              type="number"
                              min={0}
                              placeholder="P1 score"
                              value={edit.score_player1 ?? ''}
                              onChange={(e) => handleMatchEditChange(match.id, 'score_player1', e.target.value)}
                              className="form-control form-control-sm"
                            />
                            <input
                              type="number"
                              min={0}
                              placeholder="P2 score"
                              value={edit.score_player2 ?? ''}
                              onChange={(e) => handleMatchEditChange(match.id, 'score_player2', e.target.value)}
                              className="form-control form-control-sm"
                            />
                            <select
                              value={edit.winner_id ?? ''}
                              onChange={(e) => handleMatchEditChange(match.id, 'winner_id', e.target.value)}
                              className="form-control form-control-sm"
                            >
                              <option value="">Select winner</option>
                              {player1 && <option value={player1.id}>{player1.username}</option>}
                              {player2 && <option value={player2.id}>{player2.username}</option>}
                            </select>
                            <button
                              className="button"
                              onClick={() => handleSaveMatch(match)}
                              disabled={matchActionLoading[match.id]}
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted">Completed</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {matchActionError && <p className="text-error">{matchActionError}</p>}
          </div>
        )}
      </section>

      {isOwner && (
        <section className="card mb-15">
          <h2>Edit Tournament Data</h2>
          <form onSubmit={handleEditSubmit}>
            <div className="form-group">
              <label>Name *</label><br />
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Description</label><br />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Start Date *</label><br />
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                required
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>End Date <span className="text-muted text-small">(optional)</span></label><br />
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="form-control"
              />
            </div>
            {editError && <p className="text-error">{editError}</p>}
            {editSuccess && <p className="text-success">{editSuccess}</p>}
            <button type="submit" disabled={editLoading} className="button">
              {editLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </section>
      )}
      {(isOwner || isAdmin || isSupportOrganizer) && (
        <section className="card mb-15">
          <h2>Tournament Overview</h2>
          <div className="meta-inline text-muted mb-1">
            <span>
              Registrations: {tournament.registrations_open === 1 ? '🟢 Open' : '🔴 Closed'}
            </span>
            <span>Status: {tournament.status}</span>
            <span>Type: {tournament.type}</span>
            <span>Max players: {tournament.max_players}</span>
          </div>
          {isOwner ? (
            <div className="flex flex-column gap-05">
              {tournament.status === 'planned' && (
                <button className="button" onClick={handleToggleRegistrations} disabled={actionLoading}>
                  {tournament.registrations_open === 1 ? 'Close Registrations' : 'Open Registrations'}
                </button>
              )}
              {tournament.status === 'planned' && (
                <button className="button" onClick={handleStart} disabled={actionLoading}>
                  🚀 Start Tournament
                </button>
              )}
              {tournament.status === 'ongoing' && (
                <button className="button" onClick={handleFinish} disabled={actionLoading}>
                  🏁 Finish Tournament
                </button>
              )}
              <button className="button-danger" onClick={handleDelete} disabled={actionLoading}>
                🗑️ Delete Tournament
              </button>
              {actionError && <p className="text-error">{actionError}</p>}
              {actionSuccess && <p className="text-success">{actionSuccess}</p>}
            </div>
          ) : (
            <p className="text-muted">Only the tournament owner can perform registration, start/finish, and delete actions.</p>
          )}
        </section>
      )}
      {isOwner && (
        <section className="card mb-15">
          <h2>Support Organizers</h2>

          {tournament.organizers.length === 0 ? (
            <p className="text-muted">No support organizers yet.</p>
          ) : (
            <ul className="mb-1">
              {tournament.organizers.map(o => (
                <li key={o.id} className="flex flex-between align-center mb-05">
                  <span>{o.username}</span>
                  <button
                    className="button-danger"
                    onClick={() => handleRemoveOrganizer(o.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddOrganizer}>
            <p className="section-title mb-05">Add Support Organizer</p>
            <div className="form-group">
              <label className="text-muted text-small">Search by username</label><br />
              <input
                type="text"
                value={newOrganizerUsername}
                onChange={(e) => setNewOrganizerUsername(e.target.value)}
                placeholder="Enter organizer username"
                className="form-control form-control-sm"
              />
            </div>
            {orgError && <p className="text-error">{orgError}</p>}
            {orgSuccess && <p className="text-success">{orgSuccess}</p>}
            <button type="submit" disabled={orgLoading} className="button">
              {orgLoading ? 'Searching...' : 'Add Organizer'}
            </button>
          </form>
        </section>
      )}
    </div>
  )
}

export default TournamentManagePage
