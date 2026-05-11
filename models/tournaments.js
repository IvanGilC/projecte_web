const db = require('../utils/db')

const getAllTournaments = () => {
  return db.prepare('SELECT * FROM tournaments').all()
}

const getTournamentById = (id) => {
  return db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id)
}

const createTournament = ({ name, description, videogame_id, owner_id, type, start_date, end_date, max_players }) => {
  const q = db.prepare(`
    INSERT INTO tournaments (name, description, videogame_id, owner_id, type, start_date, end_date, max_players)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const info = q.run(name, description || null, videogame_id, owner_id, type, start_date, end_date || null, max_players)
  return getTournamentById(info.lastInsertRowid)
}

const updateTournament = (id, fields) => {
  const allowed = ['name', 'description', 'start_date', 'end_date', 'status', 'registrations_open']
  const setClauses = []
  const values = []
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      setClauses.push(`${key} = ?`)
      values.push(fields[key])
    }
  }
  if (setClauses.length === 0) return getTournamentById(id)
  values.push(id)
  db.prepare(`UPDATE tournaments SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
  return getTournamentById(id)
}

const deleteTournament = (id) => {
  db.prepare('DELETE FROM tournaments WHERE id = ?').run(id)
}

// Organizers
const addOrganizer = (tournament_id, user_id) => {
  db.prepare('INSERT OR IGNORE INTO tournament_organizers (tournament_id, user_id) VALUES (?, ?)').run(tournament_id, user_id)
}

const removeOrganizer = (tournament_id, user_id) => {
  db.prepare('DELETE FROM tournament_organizers WHERE tournament_id = ? AND user_id = ?').run(tournament_id, user_id)
}

const getOrganizers = (tournament_id) => {
  return db.prepare(`
    SELECT u.id, u.username, u.email FROM users u
    JOIN tournament_organizers o ON u.id = o.user_id
    WHERE o.tournament_id = ?
  `).all(tournament_id)
}

// Players / registrations
const registerPlayer = (tournament_id, user_id) => {
  const q = db.prepare('INSERT INTO tournament_players (tournament_id, user_id) VALUES (?, ?)')
  q.run(tournament_id, user_id)
}

const updateRegistrationStatus = (tournament_id, user_id, status) => {
  db.prepare('UPDATE tournament_players SET status = ? WHERE tournament_id = ? AND user_id = ?').run(status, tournament_id, user_id)
}

const getPlayers = (tournament_id) => {
  return db.prepare(`
    SELECT u.id, u.username, tp.status FROM users u
    JOIN tournament_players tp ON u.id = tp.user_id
    WHERE tp.tournament_id = ?
  `).all(tournament_id)
}

// Final standings
const saveFinalStandings = (tournament_id, standings) => {
  const q = db.prepare('INSERT INTO final_standings (tournament_id, user_id, position, points) VALUES (?, ?, ?, ?)')
  const insertMany = db.transaction((rows) => {
    for (const row of rows) q.run(tournament_id, row.user_id, row.position, row.points)
  })
  insertMany(standings)
}

const getFinalStandings = (tournament_id) => {
  return db.prepare(`
    SELECT fs.position, fs.points, u.id, u.username FROM final_standings fs
    JOIN users u ON u.id = fs.user_id
    WHERE fs.tournament_id = ?
    ORDER BY fs.position ASC
  `).all(tournament_id)
}

const getTournamentsByVideogame = (videogame_id) => {
  return db.prepare('SELECT * FROM tournaments WHERE videogame_id = ?').all(videogame_id)
}

const getPlayerRegistration = (tournament_id, user_id) => {
  return db.prepare(
    'SELECT * FROM tournament_players WHERE tournament_id = ? AND user_id = ?'
  ).get(tournament_id, user_id)
}

module.exports = {
  getAllTournaments, getTournamentById, createTournament, updateTournament, deleteTournament,
  addOrganizer, removeOrganizer, getOrganizers,
  registerPlayer, updateRegistrationStatus, getPlayers,
  saveFinalStandings, getFinalStandings, getTournamentsByVideogame, getPlayerRegistration
}
