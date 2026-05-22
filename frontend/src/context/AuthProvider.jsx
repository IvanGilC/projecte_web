import { useState } from 'react'
import { AuthContext } from './AuthContext.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token')
    const username = localStorage.getItem('username')
    const role = localStorage.getItem('role')
    const id = localStorage.getItem('id')
    if (token) return { token, username, role, id }
    return null
  })

  const login = (userData) => {
    localStorage.setItem('token', userData.token)
    localStorage.setItem('username', userData.username)
    localStorage.setItem('role', userData.role)
    localStorage.setItem('id', userData.id)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
    localStorage.removeItem('id')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}