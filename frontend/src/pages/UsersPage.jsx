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
    <div className="page-container">
      <div className="flex flex-between mb-1">
        <h1>Users</h1>
        <button className="button" onClick={() => navigate('/users/new')}>
          + New User
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-1 mb-15 flex-wrap">
        <input
          type="text"
          placeholder="Search by username..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="form-control"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="form-control"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="organizer">Organizer</option>
          <option value="player">Player</option>
        </select>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-error">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p>No users found.</p>
      )}

      {!loading && !error && (
        <div className="table-responsive">
          <table className="table table-compact">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td className="text-muted">#{u.id}</td>
                  <td>
                    <strong>{u.username}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>{roleLabel(u.role)}</td>
                  <td>
                    <div className="card-actions">
                      <button onClick={() => navigate(`/profile/${u.username}`)}>
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="button-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default UsersPage