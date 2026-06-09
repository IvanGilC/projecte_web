const bcrypt = require('bcrypt')
const usersRouter = require('express').Router()
const { usersModel } = require('../models')
const { requireAuth, requireRole } = require('../utils/middleware')

// GET /api/users — solo admin
usersRouter.get('/', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    res.json(usersModel.getAllUsers())
  } catch (err) { next(err) }
})

// GET /api/users/:username — público (sin password_hash)
usersRouter.get('/:username', (req, res, next) => {
  try {
    const user = usersModel.getUserByUsername(req.params.username)
    if (!user) return res.status(404).json({ error: 'user not found' })
    const { password_hash, ...safeUser } = user
    const matches = usersModel.getMatchesByUser(user.id)
    res.json({ ...safeUser, matches })
  } catch (err) { next(err) }
})

// POST /api/users — registro público (solo player)
// Si hay token de admin, puede crear cualquier rol
usersRouter.post('/', async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' })
    }

    // Determinar rol: si viene rol en el body, necesita ser admin
    let assignedRole = 'player'
    if (role && role !== 'player') {
      // Verificar que hay token de admin
      const authorization = req.get('authorization')
      if (!authorization || !authorization.startsWith('Bearer ')) {
        return res.status(403).json({ error: 'only admins can assign non-player roles' })
      }
      const jwt = require('jsonwebtoken')
      const config = require('../utils/config')
      const decoded = jwt.verify(authorization.replace('Bearer ', ''), config.SECRET)
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'only admins can assign non-player roles' })
      }
      assignedRole = role
    }

    const password_hash = await bcrypt.hash(password, 10)
    const user = usersModel.createUser({ username, email, password_hash, role: assignedRole })
    res.status(201).json(user)
  } catch (err) { next(err) }
})

// PUT /api/users/:id — el propio usuario o admin
usersRouter.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const targetId = Number(req.params.id)
    // Solo puede editar su propio perfil, o ser admin
    if (req.user.id !== targetId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' })
    }
    const { email, password } = req.body
    const updates = {}
    if (email) updates.email = email
    if (password) updates.password_hash = await bcrypt.hash(password, 10)
    const user = usersModel.updateUser(targetId, updates)
    if (!user) return res.status(404).json({ error: 'user not found' })
    res.json(user)
  } catch (err) { next(err) }
})

// DELETE /api/users/:id — solo admin
usersRouter.delete('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    usersModel.deleteUser(Number(req.params.id))
    res.status(204).end()
  } catch (err) { next(err) }
})

// GET /api/users/:id/registrations — el propio usuario o admin
// NUEVO: devuelve los torneos en los que está inscrito el usuario con su estado
usersRouter.get('/:id/registrations', requireAuth, (req, res, next) => {
  try {
    const targetId = Number(req.params.id)
    if (req.user.id !== targetId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' })
    }
    const registrations = usersModel.getRegistrationsByUser(targetId)
    res.json(registrations)
  } catch (err) { next(err) }
})
 
// GET /api/users/:id/tournaments — el propio organizador o admin
// NUEVO: devuelve los torneos de los que el usuario es propietario
usersRouter.get('/:id/tournaments', requireAuth, requireRole('organizer', 'admin'), (req, res, next) => {
  try {
    const targetId = Number(req.params.id)
    if (req.user.id !== targetId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' })
    }
    const tournaments = usersModel.getTournamentsByOwner(targetId)
    res.json(tournaments)
  } catch (err) { next(err) }
})

module.exports = usersRouter
