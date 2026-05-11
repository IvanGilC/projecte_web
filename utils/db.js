const config = require('./config')
const logger = require('./logger')
const better_sqlite3 = require('better-sqlite3')

const db = better_sqlite3(config.SQLITE_URL, { verbose: logger.debug })

module.exports = db
