const tournamentsRouter = require('express').Router()
const { tournamentsModel, matchesModel, videogamesModel  } = require('../models')
const { requireAuth, requireRole } = require('../utils/middleware')

// Helper: comprobar si el usuario es owner o organizer de soporte del torneo
const isOrganizerOf = (tournament, userId) => {
  if (tournament.owner_id === userId) return true
  const organizers = tournamentsModel.getOrganizers(tournament.id)
  return organizers.some(o => o.id === userId)
}

// GET /api/tournaments — público
tournamentsRouter.get('/', (req, res, next) => {
  try {
    res.json(tournamentsModel.getAllTournaments())
  } catch (err) { next(err) }
})

// GET /api/tournaments/:id — público
tournamentsRouter.get('/:id', (req, res, next) => {
  try {
    const t = tournamentsModel.getTournamentById(Number(req.params.id))
    if (!t) return res.status(404).json({ error: 'tournament not found' })
    const players = tournamentsModel.getPlayers(t.id)
    const organizers = tournamentsModel.getOrganizers(t.id)
    const matches = matchesModel.getMatchesByTournament(t.id)
    const standings = t.status === 'finished' ? tournamentsModel.getFinalStandings(t.id) : null
    res.json({ ...t, players, organizers, matches, standings })
  } catch (err) { next(err) }
})

// POST /api/tournaments — solo organizer
tournamentsRouter.post('/', requireAuth, requireRole('organizer'), (req, res, next) => {
  try {
    const { name, description, videogame_id, type, start_date, end_date, max_players } = req.body
    if (!name || !videogame_id || !type || !start_date || !max_players) {
      return res.status(400).json({ error: 'name, videogame_id, type, start_date and max_players are required' })
    }

    const vg = videogamesModel.getVideogameById(videogame_id)
    if (!vg) return res.status(400).json({ error: 'videogame not found' })

    if (start_date && end_date && new Date(end_date) <= new Date(start_date)) {
      return res.status(400).json({ error: 'end_date must be after start_date' })
    }

    const tournament = tournamentsModel.createTournament({
      name, description, videogame_id,
      owner_id: req.user.id,
      type, start_date, end_date, max_players
    })

    // Crear partidas automáticamente
    let numMatches
    let rounds = []
    if (type === 'elimination') {
      numMatches = max_players - 1
      // Calcular rondas
      let roundSize = max_players / 2
      let roundNum = 1
      while (roundSize >= 1) {
        for (let i = 0; i < roundSize; i++) rounds.push(`Round ${roundNum}`)
        roundSize /= 2
        roundNum++
      }
    } else if (type === 'league') {
      numMatches = (max_players * (max_players - 1)) / 2
      rounds = Array(numMatches).fill('Liga')
    }

    matchesModel.createMatchesForTournament(tournament.id, numMatches, rounds)

    res.status(201).json(tournament)
  } catch (err) { next(err) }
})

// PUT /api/tournaments/:id — solo owner
tournamentsRouter.put('/:id', requireAuth, requireRole('organizer', 'admin'), (req, res, next) => {
  try {
    const t = tournamentsModel.getTournamentById(Number(req.params.id))

    if (!t) return res.status(404).json({ error: 'tournament not found' })
    if (t.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'only the tournament owner can edit it' })
    }

    const { start_date, end_date } = req.body
    const effectiveStartDate = start_date || t.start_date
    const effectiveEndDate = end_date || t.end_date

    if (effectiveEndDate && new Date(effectiveEndDate) <= new Date(effectiveStartDate)) {
      return res.status(400).json({ error: 'end_date must be after start_date' })
    }

    const updated = tournamentsModel.updateTournament(t.id, req.body)
    res.json(updated)
  } catch (err) { next(err) }
})

// DELETE /api/tournaments/:id — solo owner
tournamentsRouter.delete('/:id', requireAuth, requireRole('organizer', 'admin'), (req, res, next) => {
  try {
    const t = tournamentsModel.getTournamentById(Number(req.params.id))
    if (!t) return res.status(404).json({ error: 'tournament not found' })
    if (t.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'only the tournament owner can delete it' })
    }
    tournamentsModel.deleteTournament(t.id)
    res.status(204).end()
  } catch (err) { next(err) }
})

// POST /api/tournaments/:id/register — jugador se inscribe
tournamentsRouter.post('/:id/register', requireAuth, requireRole('player'), (req, res, next) => {
  try {
    const t = tournamentsModel.getTournamentById(Number(req.params.id))
    if (!t) return res.status(404).json({ error: 'tournament not found' })
    if (!t.registrations_open) {
      return res.status(400).json({ error: 'registrations are closed' })
    }

    if (t.status !== 'planned') {
      return res.status(400).json({ error: 'cannot register in a tournament that is not in planned status' })
    }

    tournamentsModel.registerPlayer(t.id, req.user.id)
    res.status(201).json({ message: 'registration submitted, pending approval' })
  } catch (err) { next(err) }
})

// PUT /api/tournaments/:id/players/:userId
tournamentsRouter.put('/:id/players/:userId', requireAuth, requireRole('organizer', 'admin'), (req, res, next) => {
  try {
    const t = tournamentsModel.getTournamentById(Number(req.params.id))
    if (!t) return res.status(404).json({ error: 'tournament not found' })
    if (!isOrganizerOf(t, req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' })
    }

    const { status } = req.body
    const targetUserId = Number(req.params.userId)

    if (status === 'approved') {
      const registration = tournamentsModel.getPlayerRegistration(t.id, targetUserId)
      
      if (!registration) {
        return res.status(404).json({ error: 'player is not registered in this tournament' })
      }

      if (registration.status === 'approved') {
        return res.status(400).json({ error: 'player already approved' })
      }
    }

    tournamentsModel.updateRegistrationStatus(t.id, targetUserId, status)
    res.json({ message: `player ${status}` })
  } catch (err) { next(err) }
})

// PUT /api/tournaments/:id/registrations — owner abre/cierra inscripciones
tournamentsRouter.put('/:id/registrations', requireAuth, requireRole('organizer', 'admin'), (req, res, next) => {
  try {
    const t = tournamentsModel.getTournamentById(Number(req.params.id))
    if (!t) return res.status(404).json({ error: 'tournament not found' })
    if (t.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'only the owner can change registration status' })
    }
    const { registrations_open } = req.body
    if (registrations_open === undefined) {
      return res.status(400).json({ error: 'registrations_open is required' })
    }
    const updated = tournamentsModel.updateTournament(t.id, { registrations_open: registrations_open ? 1 : 0 })
    res.json(updated)
  } catch (err) { next(err) }
})

// POST /api/tournaments/:id/organizers — owner añade organizer de soporte
tournamentsRouter.post('/:id/organizers', requireAuth, requireRole('organizer', 'admin'), (req, res, next) => {
  try {
    const t = tournamentsModel.getTournamentById(Number(req.params.id))
    if (!t) return res.status(404).json({ error: 'tournament not found' })
    if (t.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'only the owner can add organizers' })
    }
    const { user_id } = req.body
    if (!user_id) return res.status(400).json({ error: 'user_id is required' })
    tournamentsModel.addOrganizer(t.id, user_id)
    res.status(201).json({ message: 'organizer added' })
  } catch (err) { next(err) }
})

// DELETE /api/tournaments/:id/organizers/:userId — owner elimina organizer de soporte
tournamentsRouter.delete('/:id/organizers/:userId', requireAuth, requireRole('organizer', 'admin'), (req, res, next) => {
  try {
    const t = tournamentsModel.getTournamentById(Number(req.params.id))
    if (!t) return res.status(404).json({ error: 'tournament not found' })
    if (t.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'only the owner can remove organizers' })
    }
    tournamentsModel.removeOrganizer(t.id, Number(req.params.userId))
    res.status(204).end()
  } catch (err) { next(err) }
})

// POST /api/tournaments/:id/start — owner arranca el torneo
tournamentsRouter.post('/:id/start', requireAuth, requireRole('organizer', 'admin'), (req, res, next) => {
  try {
    const t = tournamentsModel.getTournamentById(Number(req.params.id))
    if (!t) return res.status(404).json({ error: 'tournament not found' })
    if (t.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'only the owner can start the tournament' })
    }
    if (t.status !== 'planned') {
      return res.status(400).json({ error: 'tournament must be in planned status to start' })
    }

    matchesModel.assignAllPlayersToMatches(t.id, t.type)
    const updated = tournamentsModel.updateTournament(t.id, { status: 'ongoing' })
    res.json(updated)
  } catch (err) { next(err) }
})

// POST /api/tournaments/:id/finish — owner cierra el torneo y calcula clasificación
tournamentsRouter.post('/:id/finish', requireAuth, requireRole('organizer', 'admin'), (req, res, next) => {
  try {
    const t = tournamentsModel.getTournamentById(Number(req.params.id))
    if (!t) return res.status(404).json({ error: 'tournament not found' })
    if (t.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'only the owner can finish the tournament' })
    }
    
    if (t.status === 'finished') {
      return res.status(400).json({ error: 'tournament is already finished' })
    }
    
    // Calcular clasificación por victorias
    const matches = matchesModel.getMatchesByTournament(t.id)

    const pendingMatches = matches.filter(m => m.status !== 'completed')
    if (pendingMatches.length > 0) {
      return res.status(400).json({ error: `there are ${pendingMatches.length} matches not completed yet` })
    }
    
    const points = {}
    for (const match of matches) {
      if (match.winner_id) {
        points[match.winner_id] = (points[match.winner_id] || 0) + 1
      }
    }
    const standings = Object.entries(points)
      .sort((a, b) => b[1] - a[1])
      .map(([user_id, pts], i) => ({ user_id: Number(user_id), position: i + 1, points: pts }))

    tournamentsModel.saveFinalStandings(t.id, standings)
    tournamentsModel.updateTournament(t.id, { status: 'finished' })

    res.json({ message: 'tournament finished', standings })
  } catch (err) { next(err) }
})

module.exports = tournamentsRouter
