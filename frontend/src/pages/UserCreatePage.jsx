import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUser } from '../services/usersService.js'

function UserCreatePage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('player')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createUser({ username, email, password, role })
      navigate('/users')
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container-small">
      <h1>Create User</h1>
      <form onSubmit={handleSubmit}>

        <div className="form-group">
          <label>Username *</label><br />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Email *</label><br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Password *</label><br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Role *</label><br />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="player">Player</option>
            <option value="organizer">Organizer</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {error && <p className="text-error">{error}</p>}

        <div className="form-actions gap-05">
          <button
            type="button"
            onClick={() => navigate('/users')}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>

      </form>
    </div>
  )
}

export default UserCreatePage