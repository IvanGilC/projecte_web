const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginRouter = require('express').Router()
const { usersModel } = require('../models')
const config = require('../utils/config')

loginRouter.post('/', async (req, res, next) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' })
    }

    const user = usersModel.getUserByUsername(username)
    const passwordCorrect = user
      ? await bcrypt.compare(password, user.password_hash)
      : false

    if (!user || !passwordCorrect) {
      return res.status(401).json({ error: 'invalid username or password' })
    }

    const tokenPayload = { id: user.id, username: user.username, role: user.role }
    const token = jwt.sign(tokenPayload, config.SECRET, { expiresIn: '24h' })

    res.status(200).json({
      token,
      id: user.id,
      username: user.username,
      role: user.role
    })
  } catch (err) { next(err) }
})

module.exports = loginRouter
