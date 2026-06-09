import api from './api.js'

export const getUserByUsername = (username) => api.get(`/users/${username}`)
export const getUsers = () => api.get('/users')
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const createUser = (data) => api.post('/users', data)
export const deleteUser = (id) => api.delete(`/users/${id}`)
export const getUserRegistrations = (id) => api.get(`/users/${id}/registrations`)
export const getUserTournaments = (id) => api.get(`/users/${id}/tournaments`)