const db = require('../utils/db')

const getMatchesByTournament = (tournament_id) => {
  return db.prepare('SELECT * FROM matches WHERE tournament_id = ?').all(tournament_id)
}

const getMatchById = (id) => {
  return db.prepare('SELECT * FROM matches WHERE id = ?').get(id)
}

const createMatch = ({ tournament_id, round }) => {
  const q = db.prepare('INSERT INTO matches (tournament_id, round) VALUES (?, ?)')
  const info = q.run(tournament_id, round || null)
  return getMatchById(info.lastInsertRowid)
}

const updateMatch = (id, fields) => {
  const allowed = ['player1_id', 'player2_id', 'winner_id', 'status', 'score_player1', 'score_player2']
  const setClauses = []
  const values = []
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      setClauses.push(`${key} = ?`)
      values.push(fields[key])
    }
  }
  if (setClauses.length === 0) return getMatchById(id)
  values.push(id)
  db.prepare(`UPDATE matches SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
  return getMatchById(id)
}

const createMatchesForTournament = db.transaction((tournament_id, numMatches, rounds) => {
  const q = db.prepare('INSERT INTO matches (tournament_id, round) VALUES (?, ?)')
  for (let i = 0; i < numMatches; i++) {
    q.run(tournament_id, rounds[i] || null)
  }
})

const assignAllPlayersToMatches = (tournament_id, tournament_type) => {
  const matches = getMatchesByTournament(tournament_id)
  const approvedPlayers = db.prepare(`
    SELECT user_id FROM tournament_players 
    WHERE tournament_id = ? AND status = 'approved'
  `).all(tournament_id).map(r => r.user_id)

  if (tournament_type === 'elimination') {
    // Asignar jugadores a matches de Round 1 secuencialmente
    const round1Matches = matches.filter(m => m.round === 'Round 1')
    let playerIndex = 0
    for (const match of round1Matches) {
      const p1 = approvedPlayers[playerIndex++]
      const p2 = approvedPlayers[playerIndex++]
      updateMatch(match.id, { player1_id: p1, player2_id: p2, status: 'assigned' })
    }

  } else if (tournament_type === 'league') {
    // Cada jugador contra cada otro exactamente una vez
    let matchIndex = 0
    for (let i = 0; i < approvedPlayers.length; i++) {
      for (let j = i + 1; j < approvedPlayers.length; j++) {
        updateMatch(matches[matchIndex++].id, {
          player1_id: approvedPlayers[i],
          player2_id: approvedPlayers[j],
          status: 'assigned'
        })
      }
    }
  }
}

const advanceWinnerToNextRound = (tournament_id, winner_id, current_round) => {
  const allMatches = getMatchesByTournament(tournament_id)
  
  // Buscar el siguiente partido pendiente (sin los dos jugadores asignados)
  // que sea de una ronda posterior
  const nextMatch = allMatches.find(m => 
    m.round !== current_round &&
    m.status === 'pending' &&
    (!m.player1_id || !m.player2_id)
  )
  
  if (!nextMatch) return // Final ya jugada o no hay siguiente ronda

  const field = !nextMatch.player1_id ? 'player1_id' : 'player2_id'
  const updateData = { [field]: winner_id }

  // Si al asignar este ganador el partido queda completo, marcarlo como 'assigned'
  if ((field === 'player1_id' && nextMatch.player2_id) || 
      (field === 'player2_id' && nextMatch.player1_id)) {
    updateData.status = 'assigned'
  }

  updateMatch(nextMatch.id, updateData)
}

module.exports = { getMatchesByTournament, getMatchById, createMatch, updateMatch, createMatchesForTournament, assignAllPlayersToMatches, advanceWinnerToNextRound }
