const db = require('../utils/db')

const getAllVideogames = () => {
  return db.prepare('SELECT * FROM videogames').all()
}

const getVideogameById = (id) => {
  return db.prepare('SELECT * FROM videogames WHERE id = ?').get(id)
}

const createVideogame = ({ name, description }) => {
  const q = db.prepare('INSERT INTO videogames (name, description) VALUES (?, ?)')
  const info = q.run(name, description || null)
  return getVideogameById(info.lastInsertRowid)
}

const updateVideogame = (id, { name, description }) => {
  const fields = []
  const values = []
  if (name !== undefined) { fields.push('name = ?'); values.push(name) }
  if (description !== undefined) { fields.push('description = ?'); values.push(description) }
  if (fields.length === 0) return getVideogameById(id)
  values.push(id)
  db.prepare(`UPDATE videogames SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return getVideogameById(id)
}

const deleteVideogame = (id) => {
  db.prepare('DELETE FROM videogames WHERE id = ?').run(id)
}


module.exports = { getAllVideogames, getVideogameById, createVideogame, updateVideogame, deleteVideogame }
