const db = require('../utils/db')

const getAllUsers = () => {
  return db.prepare('SELECT id, username, email, role FROM users').all()
}

const getUserById = (id) => {
  return db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(id)
}

const getUserByUsername = (username) => {
  // Returns password_hash too — only for login!
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username)
}

const createUser = ({ username, email, password_hash, role }) => {
  const q = db.prepare(`
    INSERT INTO users (username, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `)
  const info = q.run(username, email, password_hash, role)
  return getUserById(info.lastInsertRowid)
}

const updateUser = (id, { email, password_hash }) => {
  const fields = []
  const values = []
  if (email !== undefined) { fields.push('email = ?'); values.push(email) }
  if (password_hash !== undefined) { fields.push('password_hash = ?'); values.push(password_hash) }
  if (fields.length === 0) return getUserById(id)
  values.push(id)
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getUserById(id)
}

const deleteUser = (id) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(id)
}

const getMatchesByUser = (user_id) => {
  return db.prepare(`
    SELECT * FROM matches 
    WHERE player1_id = ? OR player2_id = ?
  `).all(user_id, user_id)
}


//Nuevo endpoint para para la Practica 2

const getRegistrationsByUser = (user_id) => {
  return db.prepare(`
    SELECT t.id, t.name, t.status, t.type, t.start_date, t.videogame_id,
           tp.status as registration_status
    FROM tournament_players tp
    JOIN tournaments t ON t.id = tp.tournament_id
    WHERE tp.user_id = ?
    ORDER BY t.start_date DESC
  `).all(user_id)
}
 
const getTournamentsByOwner = (owner_id) => {
  return db.prepare(`
    SELECT * FROM tournaments WHERE owner_id = ?
    ORDER BY start_date DESC
  `).all(owner_id)
}

module.exports = {
  getAllUsers,
  getUserById,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  getMatchesByUser,
  getRegistrationsByUser,
  getTournamentsByOwner
}