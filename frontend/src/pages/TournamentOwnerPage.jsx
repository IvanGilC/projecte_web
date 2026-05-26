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

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>
  if (!tournament) return null
  if (!isOwner) return <p style={{ padding: '2rem', color: 'red' }}>403 - Only the owner can access this page.</p>

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1rem' }}>

      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>{tournament.name} — Owner Settings</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => navigate(`/tournaments/${id}`)}>
            View Public Page
          </button>
          <button onClick={() => navigate(`/tournaments/${id}/manage`)}>
            Manage
          </button>
        </div>
      </div>

      {/* Editar datos del torneo */}
      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2>Edit Tournament Data</h2>
        <form onSubmit={handleEditSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>Name *</label><br />
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Description</label><br />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>Start Date *</label><br />
            <input
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
              required
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>End Date <span style={{ color: '#888', fontSize: '0.85rem' }}>(optional)</span></label><br />
            <input
              type="date"
              value={editEndDate}
              onChange={(e) => setEditEndDate(e.target.value)}
              style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
            />
          </div>
          {editError && <p style={{ color: 'red' }}>{editError}</p>}
          {editSuccess && <p style={{ color: 'green' }}>{editSuccess}</p>}
          <button type="submit" disabled={editLoading}>
            {editLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </section>

      {/* Acciones del torneo */}
      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2>Tournament Actions</h2>

        {tournament.status === 'planned' && (
          <div style={{ marginBottom: '1rem' }}>
            <p>
              Registrations are currently: <strong>
                {tournament.registrations_open === 1 ? '🟢 Open' : '🔴 Closed'}
              </strong>
            </p>
            <button onClick={handleToggleRegistrations} disabled={actionLoading}>
              {tournament.registrations_open === 1 ? 'Close Registrations' : 'Open Registrations'}
            </button>
          </div>
        )}

        {tournament.status === 'planned' && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: '#555', fontSize: '0.9rem' }}>
              Starting the tournament will assign all approved players to their matches.
            </p>
            <button onClick={handleStart} disabled={actionLoading}>
              🚀 Start Tournament
            </button>
          </div>
        )}

        {tournament.status === 'ongoing' && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: '#555', fontSize: '0.9rem' }}>
              All matches must be completed before finishing the tournament.
            </p>
            <button onClick={handleFinish} disabled={actionLoading}>
              🏁 Finish Tournament
            </button>
          </div>
        )}

        {actionError && <p style={{ color: 'red' }}>{actionError}</p>}
        {actionSuccess && <p style={{ color: 'green' }}>{actionSuccess}</p>}

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>
            Deleting the tournament will remove all matches, registrations and standings permanently.
          </p>
          <button
            onClick={handleDelete}
            style={{ color: 'white', background: 'red', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            🗑️ Delete Tournament
          </button>
        </div>
      </section>

      {/* Organizers de soporte */}
      <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2>Support Organizers</h2>

        {tournament.organizers.length === 0 ? (
          <p style={{ color: '#888' }}>No support organizers yet.</p>
        ) : (
          <ul style={{ marginBottom: '1rem' }}>
            {tournament.organizers.map(o => (
              <li key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span>{o.username} (ID: {o.id})</span>
                <button
                  onClick={() => handleRemoveOrganizer(o.id)}
                  style={{ color: 'red' }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddOrganizer}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Add Support Organizer</p>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem' }}>User ID</label><br />
            <input
              type="number"
              value={newOrganizerId}
              onChange={(e) => setNewOrganizerId(e.target.value)}
              placeholder="Enter user ID"
              style={{ padding: '0.4rem', width: '200px' }}
            />
          </div>
          {orgError && <p style={{ color: 'red' }}>{orgError}</p>}
          {orgSuccess && <p style={{ color: 'green' }}>{orgSuccess}</p>}
          <button type="submit" disabled={orgLoading}>
            {orgLoading ? 'Adding...' : 'Add Organizer'}
          </button>
        </form>
      </section>

    </div>
  )
}

export default TournamentOwnerPage