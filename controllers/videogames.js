const videogamesRouter = require('express').Router()
const { videogamesModel, tournamentsModel } = require('../models')
const { requireAuth, requireRole } = require('../utils/middleware')

// GET /api/videogames — público
videogamesRouter.get('/', (req, res, next) => {
  try {
    res.json(videogamesModel.getAllVideogames())
  } catch (err) { next(err) }
})

// GET /api/videogames/:id — público
videogamesRouter.get('/:id', (req, res, next) => {
  try {
    const vg = videogamesModel.getVideogameById(Number(req.params.id))
    if (!vg) return res.status(404).json({ error: 'videogame not found' })
    res.json(vg)
  } catch (err) { next(err) }
})

// POST /api/videogames — solo admin
videogamesRouter.post('/', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const { name, description } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })
    const vg = videogamesModel.createVideogame({ name, description })
    res.status(201).json(vg)
  } catch (err) { next(err) }
})

// PUT /api/videogames/:id — solo admin
videogamesRouter.put('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const vg = videogamesModel.updateVideogame(Number(req.params.id), req.body)
    if (!vg) return res.status(404).json({ error: 'videogame not found' })
    res.json(vg)
  } catch (err) { next(err) }
})

// DELETE /api/videogames/:id — solo admin
videogamesRouter.delete('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const vg = videogamesModel.getVideogameById(Number(req.params.id))
    if (!vg) return res.status(404).json({ error: 'videogame not found' })

    // Comprobar si tiene torneos activos
    const tournaments = tournamentsModel.getTournamentsByVideogame(Number(req.params.id))
    const hasActive = tournaments.some(t => t.status === 'planned' || t.status === 'ongoing')
    if (hasActive) {
      return res.status(400).json({ error: 'cannot delete videogame with active tournaments' })
    }

    videogamesModel.deleteVideogame(Number(req.params.id))
    res.status(204).end()
  } catch (err) { next(err) }
})

module.exports = videogamesRouter
