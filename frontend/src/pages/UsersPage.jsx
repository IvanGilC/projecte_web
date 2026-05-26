import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsers, deleteUser } from '../services/usersService.js'

function UsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        const res = await getUsers()
        if (!cancelled) setUsers(res.data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Error loading users')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [refresh])

  const filtered = users.filter(u => {
    const matchName = u.username.toLowerCase().includes(filter.toLowerCase())
    const matchRole = filterRole === '' || u.role === filterRole
    return matchName && matchRole
  })

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return
    try {
      await deleteUser(u.id)
      setRefresh(r => r + 1)
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting user')
    }
  }

  const roleLabel = (role) => {
    if (role === 'admin') return '🔴 Admin'
    if (role === 'organizer') return '🟡 Organizer'
    if (role === 'player') return '🟢 Player'
    return role
  }

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Users</h1>
        <button onClick={() => navigate('/users/new')}>
          + New User
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by username..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1, minWidth: '160px', padding: '0.5rem' }}
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={{ flex: 1, minWidth: '140px', padding: '0.5rem' }}
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="organizer">Organizer</option>
          <option value="player">Player</option>
        </select>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p>No users found.</p>
      )}

      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>ID</th>
              <th style={{ padding: '0.5rem' }}>Username</th>
              <th style={{ padding: '0.5rem' }}>Email</th>
              <th style={{ padding: '0.5rem' }}>Role</th>
              <th style={{ padding: '0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem', color: '#888' }}>#{u.id}</td>
                <td style={{ padding: '0.5rem' }}>
                  <strong>{u.username}</strong>
                </td>
                <td style={{ padding: '0.5rem' }}>{u.email}</td>
                <td style={{ padding: '0.5rem' }}>{roleLabel(u.role)}</td>
                <td style={{ padding: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => navigate(`/profile/${u.username}`)}>
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      style={{ color: 'red' }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default UsersPage