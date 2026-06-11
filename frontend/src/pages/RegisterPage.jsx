import { useState } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'
import { register as registerService, login as loginService } from '../services/authService.js'

function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [usernameError, setUsernameError] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const { user, login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setUsernameError(false)
    setEmailError(false)
    setLoading(true)

    try {
      await registerService(username, email, password)
      const res = await loginService(username, password)
      login(res.data)
      navigate('/')
    } catch (err) {
      const message = err.response?.data?.error || 'Registration failed'
      setError(message)
      const lower = message.toLowerCase()
      setUsernameError(lower.includes('username'))
      setEmailError(lower.includes('email'))
    } finally {
      setLoading(false)
    }
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="page-container-small">
      <h1>Register</h1>
      <p className="text-muted text-small">This form creates a player account.</p>
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
          <label>Email</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailError(false)
            }}
            className={emailError ? 'input-error' : ''}
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
            }}
            required
          />
        </div>
        {error && <p className="text-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Register'}
        </button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  )
}

export default RegisterPage