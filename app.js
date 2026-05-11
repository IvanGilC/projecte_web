const express = require('express')
const { initDb } = require('./models')
const middleware = require('./utils/middleware')

const loginRouter = require('./controllers/login')
const usersRouter = require('./controllers/users')
const videogamesRouter = require('./controllers/videogames')
const tournamentsRouter = require('./controllers/tournaments')
const matchesRouter = require('./controllers/matches')

const app = express()

initDb()

app.use(express.json())
app.use(middleware.requestLogger)

app.use('/api/login', loginRouter)
app.use('/api/users', usersRouter)
app.use('/api/videogames', videogamesRouter)
app.use('/api/tournaments', tournamentsRouter)
app.use('/api/matches', matchesRouter)

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app
