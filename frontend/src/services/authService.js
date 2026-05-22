import api from './api.js'

export const login = (username, password) =>
  api.post('/login', { username, password })

export const register = (username, email, password) =>
  api.post('/users', { username, email, password })