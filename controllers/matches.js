const matchesRouter = require('express').Router()
const { matchesModel, tournamentsModel } = require('../models')
const { requireAuth, requireRole } = require('../utils/middleware')

// Helper: comprobar si el usuario organiza el torneo de esta partida
const canManageMatch = (match, user) => {
  if (user.role === 'admin') return true
  const t = tournamentsModel.getTournamentById(match.tournament_id)
  if (!t) return false
  if (t.owner_id === user.id) return true
  const organizers = tournamentsModel.getOrganizers(t.id)
  return organizers.some(o => o.id === user.id)
}

// GET /api/matches/:id — público
matchesRouter.get('/:id', (req, res, next) => {
  try {
    const match = matchesModel.getMatchById(Number(req.params.id))
    if (!match) return res.status(404).json({ error: 'match not found' })
    res.json(match)
  } catch (err) { next(err) }
})

// PUT /api/matches/:id — organizer del torneo
matchesRouter.put('/:id', requireAuth, requireRole('organizer', 'admin'), (req, res, next) => {
  try {
    const match = matchesModel.getMatchById(Number(req.params.id))
    if (!match) return res.status(404).json({ error: 'match not found' })

    if (match.status === 'completed') {
      return res.status(400).json({ error: 'cannot modify a completed match' })
    }

    if (!canManageMatch(match, req.user)) {
      return res.status(403).json({ error: 'forbidden' })
    }

    const { winner_id, score_player1, score_player2 } = req.body

    if (winner_id) {
      // Validar que el match tiene los dos jugadores asignados
      if (match.status !== 'assigned') {
        return res.status(400).json({ error: 'match must have both players assigned before setting a winner' })
      }

      // Validar que el ganador es uno de los dos jugadores
      if (winner_id !== match.player1_id && winner_id !== match.player2_id) {
        return res.status(400).json({ error: 'winner must be one of the two players' })
      }
    }

    const updated = matchesModel.updateMatch(match.id, {
      winner_id,
      score_player1,
      score_player2,
      // Si viene winner_id, forzamos completed automáticamente
      ...(winner_id ? { status: 'completed' } : {})
    })

    if (winner_id) {
      matchesModel.advanceWinnerToNextRound(
        match.tournament_id,
        winner_id,
        match.round
      )
    }

    res.json(updated)
  } catch (err) { next(err) }
})

module.exports = matchesRouter
