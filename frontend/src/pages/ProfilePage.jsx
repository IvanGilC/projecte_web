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
      await updateUser(profile.id, updates)
      setFormSuccess('Profile updated successfully.')
      // Si es el propio usuario actualizamos el contexto de auth
      if (isOwnProfile) {
        login({
          token: user.token,
          id: user.id,
          username: user.username,
          role: user.role
        })
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

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>
  if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>
  if (!profile) return null

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1rem' }}>

      {/* Cabecera del perfil */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>{profile.username}</h1>
          <p style={{ color: '#555', margin: 0 }}>
            Role: <strong>{profile.role}</strong>
          </p>
          <p style={{ color: '#555', margin: '0.25rem 0 0' }}>
            Email: {profile.email}
          </p>
        </div>
        {(isOwnProfile || user?.role === 'admin') && (
          <button onClick={handleOpenForm} style={{ padding: '0.5rem 1rem' }}>
            Edit Profile
          </button>
        )}
      </div>

      {/* Historial de partidas */}
      <section>
        <h2>Match History</h2>
        {profile.matches.length === 0 ? (
          <p style={{ color: '#888' }}>No matches played yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
                <th style={{ padding: '0.4rem' }}>Match ID</th>
                <th style={{ padding: '0.4rem' }}>Tournament</th>
                <th style={{ padding: '0.4rem' }}>Round</th>
                <th style={{ padding: '0.4rem' }}>Score</th>
                <th style={{ padding: '0.4rem' }}>Result</th>
                <th style={{ padding: '0.4rem' }}>Status</th>
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
                  <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.4rem' }}>#{m.id}</td>
                    <td style={{ padding: '0.4rem' }}>#{m.tournament_id}</td>
                    <td style={{ padding: '0.4rem' }}>{m.round || '—'}</td>
                    <td style={{ padding: '0.4rem' }}>
                      {myScore !== null && theirScore !== null
                        ? `${myScore} - ${theirScore}`
                        : '—'}
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      {isCompleted
                        ? isWinner ? '🏆 Win' : '❌ Loss'
                        : '—'}
                    </td>
                    <td style={{ padding: '0.4rem' }}>{matchStatusLabel(m.status)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Modal de edición */}
      {showForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white', padding: '2rem', borderRadius: '8px',
            minWidth: '320px', maxWidth: '480px', width: '100%'
          }}>
            <h2>Edit Profile</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label>Email</label><br />
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>New Password <span style={{ color: '#888', fontSize: '0.85rem' }}>(leave blank to keep current)</span></label><br />
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', boxSizing: 'border-box' }}
                />
              </div>
              {formError && <p style={{ color: 'red' }}>{formError}</p>}
              {formSuccess && <p style={{ color: 'green' }}>{formSuccess}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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