require('dotenv').config()

const PORT = process.env.PORT || 3001

const SQLITE_URL = process.env.NODE_ENV === 'test'
  ? (process.env.TEST_SQLITE_URL || ':memory:')
  : (process.env.SQLITE_URL || ':memory:')

const SECRET = process.env.SECRET

module.exports = { PORT, SQLITE_URL, SECRET }
