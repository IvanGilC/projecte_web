import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #ccc' }}>
      <Link to="/">Home</Link>
      <Link to="/videogames">Videogames</Link>
      <Link to="/tournaments">Tournaments</Link>

      {!user && (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}

      {user && (
        <>
          <Link to={`/profile/${user.username}`}>Profile ({user.role})</Link>

          {user.role === 'player' && (
            <Link to={`/profile/${user.username}`}>My Registrations</Link>
          )}

          {user.role === 'organizer' && (
            <>
              <Link to="/tournaments/new">New Tournament</Link>
              <Link to="/my-tournaments">My Tournaments</Link>
            </>
          )}

          {user.role === 'admin' && (
            <>
              <Link to="/users">Users</Link>
              <Link to="/users/new">New User</Link>
            </>
          )}

          <button onClick={handleLogout}>Logout</button>
        </>
      )}
    </nav>
  )
}

export default Navbar