import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" />
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="page-container-mid">
        <div className="card-hero">
          <h1>403 - Unauthorized</h1>
          <p className="hero-copy">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute