import api from './api.js'

export const getVideogames = () => api.get('/videogames')
export const getVideogameById = (id) => api.get(`/videogames/${id}`)