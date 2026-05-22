import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3001/api'
})

// Interceptor: añade el token JWT a todas las peticiones si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api