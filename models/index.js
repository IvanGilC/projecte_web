const db = require('../utils/db')
const usersModel = require('./users')
const videogamesModel = require('./videogames')
const tournamentsModel = require('./tournaments')
const matchesModel = require('./matches')

const initDb = () => {
  // Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('player', 'admin', 'organizer'))
    )
  `)

  // Videogames
  db.exec(`
    CREATE TABLE IF NOT EXISTS videogames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    )
  `)

  // Tournaments
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      videogame_id INTEGER NOT NULL,
      owner_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('elimination', 'league')),
      status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned', 'ongoing', 'finished')),
      start_date TEXT NOT NULL,
      end_date TEXT,
      max_players INTEGER NOT NULL,
      registrations_open INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(videogame_id) REFERENCES videogames(id) ON DELETE CASCADE,
      FOREIGN KEY(owner_id) REFERENCES users(id)
    )
  `)
  
  // Support organizers (many-to-many)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_organizers (
      tournament_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY(tournament_id, user_id),
      FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `)

  // Player registrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      UNIQUE(tournament_id, user_id),
      FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `)

  // Matches
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      player1_id INTEGER,
      player2_id INTEGER,
      winner_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'completed')),
      round TEXT,
      score_player1 INTEGER,
      score_player2 INTEGER,
      FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY(player1_id) REFERENCES users(id),
      FOREIGN KEY(player2_id) REFERENCES users(id),
      FOREIGN KEY(winner_id) REFERENCES users(id)
    )
  `)

  // Final standings
  db.exec(`
    CREATE TABLE IF NOT EXISTS final_standings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      points INTEGER DEFAULT 0,
      FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `)

  // Seed default admin if not exists
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get()
  if (!adminExists) {
    const bcrypt = require('bcrypt')
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin1234', 10)
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, 'admin')
    `).run('admin', 'admin@tournament.app', hash)
  }
}

module.exports = { initDb, usersModel, videogamesModel, tournamentsModel, matchesModel }
