const jwt = require('jsonwebtoken')
const logger = require('./logger')
const config = require('./config')

const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method)
  logger.info('Path:  ', request.path)
  logger.info('Body:  ', request.body)
  logger.info('---')
  next()
}

// Extrae el token del header Authorization: Bearer <token>
// Lo mete en req.user si es válido, si no lanza error que captura errorHandler
const requireAuth = (request, response, next) => {
  const authorization = request.get('authorization')
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }
  const token = authorization.replace('Bearer ', '')
  const decoded = jwt.verify(token, config.SECRET) // lanza JsonWebTokenError si falla
  request.user = decoded // { id, username, role }
  next()
}

// Fábrica de middleware de rol — uso: requireRole('admin') o requireRole('admin', 'organizer')
const requireRole = (...roles) => (request, response, next) => {
  if (!request.user) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }
  if (!roles.includes(request.user.role)) {
    return response.status(403).json({ error: 'forbidden: insufficient role' })
  }
  next()
}

const unknownEndpoint = (request, response) => {
  response.status(404).json({ error: 'unknown endpoint' })
}

const errorHandler = (error, request, response, next) => {
  logger.error('Error:', error.message)

  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    if (error.message.includes('users.username')) {
      return response.status(400).json({ error: 'username already taken' })
    }
    if (error.message.includes('users.email')) {
      return response.status(400).json({ error: 'email already taken' })
    }
    if (error.message.includes('tournament_players')) {
      return response.status(400).json({ error: 'you are already registered in this tournament' })
    }
    if (error.message.includes('videogames.name')) {
      return response.status(400).json({ error: 'videogame name already taken' })
    }
    return response.status(400).json({ error: 'unique constraint failed' })
  }

  if (error.name === 'JsonWebTokenError') {
    return response.status(401).json({ error: 'token missing or invalid' })
  }

  if (error.name === 'TokenExpiredError') {
    return response.status(401).json({ error: 'token expired' })
  }

  response.status(500).json({ error: error.message })
  next(error)
}

module.exports = { requestLogger, unknownEndpoint, errorHandler, requireAuth, requireRole }
