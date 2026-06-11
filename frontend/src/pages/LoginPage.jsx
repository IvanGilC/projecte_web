import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { login as loginService } from '../services/authService.js'

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [usernameError, setUsernameError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setUsernameError(false)
    setPasswordError(false)
    setLoading(true)

    try {
      const res = await loginService(username, password)
      login(res.data)
      navigate('/')
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed'
      setError(message)
      const lower = message.toLowerCase()
      setUsernameError(lower.includes('username'))
      setPasswordError(lower.includes('password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container-small">
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <br />
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setUsernameError(false)
            }}
            className={usernameError ? 'input-error' : ''}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <br />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setPasswordError(false)
            }}
            className={passwordError ? 'input-error' : ''}
            required
          />
        </div>
        {error && <p className="text-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
      <p>Don't have an account? <Link to="/register">Register</Link></p>
    </div>
  )
}

export default LoginPage