import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { getUserByUsername, updateUser } from '../services/usersService.js'

function ProfilePage() {
  const { username } = useParams()
  const { user, login } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refresh, setRefresh] = useState(0)

  // Formulario de edición
  const [showForm, setShowForm] = useState(false)
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const res = await getUserByUsername(username)
        if (!cancelled) setProfile(res.data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'User not found')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [username, refresh])

  const isOwnProfile = user && profile && user.username === profile.username

  const handleOpenForm = () => {
    setFormEmail(profile.email || '')
    setFormPassword('')
    setFormError(null)
    setFormSuccess(null)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setFormError(null)
    setFormSuccess(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setFormLoading(true)

    const updates = {}
    if (formEmail && formEmail !== profile.email) updates.email = formEmail
    if (formPassword) updates.password = formPassword

    if (Object.keys(updates).length === 0) {
      setFormError('No changes to save.')
      setFormLoading(false)
      return
    }

    try {
      const res = await updateUser(profile.id, updates)
      setFormSuccess('Profile updated successfully.')
      // Si es el propio usuario actualizamos el contexto de auth y localStorage
      if (isOwnProfile) {
        const updated = res.data
        const newAuth = {
          token: user.token,
          id: updated.id ?? user.id,
          username: updated.username ?? user.username,
          role: updated.role ?? user.role
        }
        if (newAuth.username) localStorage.setItem('username', newAuth.username)
        if (newAuth.role) localStorage.setItem('role', newAuth.role)
        if (newAuth.id) localStorage.setItem('id', newAuth.id)
        login(newAuth)
      }
      setRefresh(r => r + 1)
      // Cerramos el form tras un momento
      setTimeout(() => {
        setShowForm(false)
        setFormSuccess(null)
      }, 1500)
    } catch (err) {
      setFormError(err.response?.data?.error || 'Error updating profile')
    } finally {
      setFormLoading(false)
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
  if (!profile) return null

  return (
    <div className="page-container-mid">

      {/* Cabecera del perfil */}
      <div className="flex flex-between align-start mb-15">
        <div>
          <h1 className="section-title">{profile.username}</h1>
          <p className="text-muted m-0">
            Role: <strong>{profile.role}</strong>
          </p>
          <p className="text-muted mt-05">
            Email: {profile.email}
          </p>
        </div>
        {(isOwnProfile || user?.role === 'admin') && (
          <button className="button" onClick={handleOpenForm}>
            Edit Profile
          </button>
        )}
      </div>

      {/* Historial de partidas */}
      <section className="section">
        <h2>Match History</h2>
        {profile.matches.length === 0 ? (
          <p className="text-muted">No matches played yet.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Match ID</th>
                  <th>Tournament</th>
                  <th>Round</th>
                  <th>Score</th>
                  <th>Result</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {profile.matches.map(m => {
                  const isPlayer1 = m.player1_id === profile.id
                  const myScore = isPlayer1 ? m.score_player1 : m.score_player2
                  const theirScore = isPlayer1 ? m.score_player2 : m.score_player1
                  const isWinner = m.winner_id === profile.id
                  const isCompleted = m.status === 'completed'

                  return (
                    <tr key={m.id}>
                      <td>#{m.id}</td>
                      <td>#{m.tournament_id}</td>
                      <td>{m.round || '—'}</td>
                      <td>
                        {myScore !== null && theirScore !== null
                          ? `${myScore} - ${theirScore}`
                          : '—'}
                      </td>
                      <td>
                        {isCompleted
                          ? isWinner ? '🏆 Win' : '❌ Loss'
                          : '—'}
                      </td>
                      <td>{matchStatusLabel(m.status)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de edición */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit Profile</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label><br />
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>New Password <span className="text-muted text-small">(leave blank to keep current)</span></label><br />
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="form-control"
                />
              </div>
              {formError && <p className="text-error">{formError}</p>}
              {formSuccess && <p className="text-success">{formSuccess}</p>}
              <div className="form-actions">
                <button type="button" onClick={handleCloseForm} disabled={formLoading}>
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage