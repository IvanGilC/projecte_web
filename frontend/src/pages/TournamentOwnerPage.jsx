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
  addOrganizer,
  removeOrganizer
} from '../services/tournamentsService.js'

function TournamentOwnerPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refresh, setRefresh] = useState(0)

  // Editar datos del torneo
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editError, setEditError] = useState(null)
  const [editSuccess, setEditSuccess] = useState(null)
  const [editLoading, setEditLoading] = useState(false)

  // Añadir organizer
  const [newOrganizerId, setNewOrganizerId] = useState('')
  const [orgError, setOrgError] = useState(null)
  const [orgSuccess, setOrgSuccess] = useState(null)
  const [orgLoading, setOrgLoading] = useState(false)

  // Acciones del torneo
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

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

  const isOwner = tournament && user && (
    tournament.owner_id === Number(user.id) || user.role === 'admin'
  )

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
    if (!newOrganizerId) {
      setOrgError('Please enter a user ID.')
      return
    }
    setOrgLoading(true)
    try {
      await addOrganizer(id, Number(newOrganizerId))
      setOrgSuccess('Organizer added successfully.')
      setNewOrganizerId('')
      setRefresh(r => r + 1)
    } catch (err) {
      setOrgError(err.response?.data?.error || 'Error adding organizer')
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

  if (loading) return <p className="page-container">Loading...</p>
  if (error) return <p className="text-error page-container">{error}</p>
  if (!tournament) return null
  if (!isOwner) return <p className="text-error page-container">403 - Only the owner can access this page.</p>

  return (
    <div className="page-container-mid">

      {/* Cabecera */}
      <div className="flex flex-between align-center mb-15">
        <h1>{tournament.name} — Owner Settings</h1>
        <div className="card-actions">
          <button className="button" onClick={() => navigate(`/tournaments/${id}`)}>
            View Public Page
          </button>
          <button className="button" onClick={() => navigate(`/tournaments/${id}/manage`)}>
            Manage
          </button>
        </div>
      </div>

      {/* Editar datos del torneo */}
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

      {/* Acciones del torneo */}
      <section className="card mb-15">
        <h2>Tournament Actions</h2>

        {tournament.status === 'planned' && (
          <div className="mb-1">
            <p>
              Registrations are currently: <strong>
                {tournament.registrations_open === 1 ? '🟢 Open' : '🔴 Closed'}
              </strong>
            </p>
            <button className="button" onClick={handleToggleRegistrations} disabled={actionLoading}>
              {tournament.registrations_open === 1 ? 'Close Registrations' : 'Open Registrations'}
            </button>
          </div>
        )}

        {tournament.status === 'planned' && (
          <div className="mb-1">
            <p className="text-muted text-small">
              Starting the tournament will assign all approved players to their matches.
            </p>
            <button className="button" onClick={handleStart} disabled={actionLoading}>
              🚀 Start Tournament
            </button>
          </div>
        )}

        {tournament.status === 'ongoing' && (
          <div className="mb-1">
            <p className="text-muted text-small">
              All matches must be completed before finishing the tournament.
            </p>
            <button className="button" onClick={handleFinish} disabled={actionLoading}>
              🏁 Finish Tournament
            </button>
          </div>
        )}

        {actionError && <p className="text-error">{actionError}</p>}
        {actionSuccess && <p className="text-success">{actionSuccess}</p>}

        <div className="mt-15 pt-1 border-top">
          <p className="text-muted text-small">
            Deleting the tournament will remove all matches, registrations and standings permanently.
          </p>
          <button
            className="button-danger"
            onClick={handleDelete}
          >
            🗑️ Delete Tournament
          </button>
        </div>
      </section>

      {/* Organizers de soporte */}
      <section className="card mb-15">
        <h2>Support Organizers</h2>

        {tournament.organizers.length === 0 ? (
          <p className="text-muted">No support organizers yet.</p>
        ) : (
          <ul className="mb-1">
            {tournament.organizers.map(o => (
              <li key={o.id} className="flex flex-between align-center mb-05">
                <span>{o.username} (ID: {o.id})</span>
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
            <label className="text-muted text-small">User ID</label><br />
            <input
              type="number"
              value={newOrganizerId}
              onChange={(e) => setNewOrganizerId(e.target.value)}
              placeholder="Enter user ID"
              className="form-control form-control-sm"
            />
          </div>
          {orgError && <p className="text-error">{orgError}</p>}
          {orgSuccess && <p className="text-success">{orgSuccess}</p>}
          <button type="submit" disabled={orgLoading} className="button">
            {orgLoading ? 'Adding...' : 'Add Organizer'}
          </button>
        </form>
      </section>

    </div>
  )
}

export default TournamentOwnerPage