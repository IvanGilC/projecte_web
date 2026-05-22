import api from './api.js'

export const getMatch = (id) => api.get(`/matches/${id}`)
export const updateMatch = (id, data) => api.put(`/matches/${id}`, data)