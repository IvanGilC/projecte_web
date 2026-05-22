import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" />
  }

  if (roles && !roles.includes(user.role)) {
    return <div style={{ padding: '2rem' }}><h2>403 - Unauthorized</h2><p>You don't have permission to access this page.</p></div>
  }

  return children
}

export default ProtectedRoute