import api from './api.js'

export const getTournaments = () => api.get('/tournaments')
export const getTournamentById = (id) => api.get(`/tournaments/${id}`)
export const createTournament = (data) => api.post('/tournaments', data)
export const updateTournament = (id, data) => api.put(`/tournaments/${id}`, data)
export const deleteTournament = (id) => api.delete(`/tournaments/${id}`)
export const registerToTournament = (id) => api.post(`/tournaments/${id}/register`)
export const startTournament = (id) => api.post(`/tournaments/${id}/start`)
export const finishTournament = (id) => api.post(`/tournaments/${id}/finish`)
export const updatePlayerStatus = (tournamentId, userId, status) =>
  api.put(`/tournaments/${tournamentId}/players/${userId}`, { status })
export const updateRegistrations = (id, open) =>
  api.put(`/tournaments/${id}/registrations`, { registrations_open: open })
export const addOrganizer = (tournamentId, userId) =>
  api.post(`/tournaments/${tournamentId}/organizers`, { user_id: userId })
export const removeOrganizer = (tournamentId, userId) =>
  api.delete(`/tournaments/${tournamentId}/organizers/${userId}`)