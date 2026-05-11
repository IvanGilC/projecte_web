process.env.NODE_ENV = "test";
process.env.SECRET = "marcoberuet";
process.env.ADMIN_PASSWORD = "admin1234";
process.env.TEST_SQLITE_URL = ":memory:";
process.env.PORT = "3001";

const { test, describe, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const bcrypt = require('bcrypt')
const app = require('../app')
const db = require('../utils/db')
const { usersModel, tournamentsModel, matchesModel, videogamesModel } = require('../models')

const api = supertest(app)

const loginAs = async (username, password) => {
  const res = await api.post('/api/login').send({ username, password })
  return res.body.token
}

const cleanDb = () => {
  db.exec('DELETE FROM final_standings')
  db.exec('DELETE FROM matches')
  db.exec('DELETE FROM tournament_players')
  db.exec('DELETE FROM tournament_organizers')
  db.exec('DELETE FROM tournaments')
  db.exec('DELETE FROM videogames')
  db.exec("DELETE FROM users WHERE role != 'admin'")
}

describe('matches and tournament flow', () => {
  let organizerToken, vg, players, tournamentElim, tournamentLeague

  beforeEach(async () => {
    cleanDb()

    vg = videogamesModel.createVideogame({ name: 'Test Game' })

    usersModel.createUser({
      username: 'organizer1',
      email: 'org@test.com',
      password_hash: await bcrypt.hash('pass123', 10),
      role: 'organizer'
    })
    organizerToken = await loginAs('organizer1', 'pass123')

    players = []
    for (let i = 1; i <= 4; i++) {
      const player = usersModel.createUser({
        username: `player${i}`,
        email: `player${i}@test.com`,
        password_hash: await bcrypt.hash('pass123', 10),
        role: 'player'
      })
      players.push(player)
    }

    const resElim = await api
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ name: 'Elim Tournament', videogame_id: vg.id, type: 'elimination', start_date: '2026-01-01', max_players: 4 })
    tournamentElim = resElim.body

    const resLeague = await api
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ name: 'League Tournament', videogame_id: vg.id, type: 'league', start_date: '2026-01-01', max_players: 4 })
    tournamentLeague = resLeague.body
  })

  afterEach(() => { cleanDb() })

  // Helper: registrar y aprobar N jugadores en un torneo
  const registerAndApprove = async (tournamentId, numPlayers) => {
    for (let i = 0; i < numPlayers; i++) {
      const playerToken = await loginAs(`player${i + 1}`, 'pass123')
      await api.post(`/api/tournaments/${tournamentId}/register`)
        .set('Authorization', `Bearer ${playerToken}`)
      await api.put(`/api/tournaments/${tournamentId}/players/${players[i].id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'approved' })
    }
  }

  describe('elimination tournament', () => {
    test('creates correct number of matches on tournament creation', () => {
      // 4 jugadores → 3 matches (4-1)
      const matches = matchesModel.getMatchesByTournament(tournamentElim.id)
      assert.strictEqual(matches.length, 3)
    })

    test('matches start as pending', () => {
      const matches = matchesModel.getMatchesByTournament(tournamentElim.id)
      for (const m of matches) {
        assert.strictEqual(m.status, 'pending')
      }
    })

    test('/start assigns 4 players to Round 1 matches', async () => {
      await registerAndApprove(tournamentElim.id, 4)

      await api.post(`/api/tournaments/${tournamentElim.id}/start`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200)

      const matches = matchesModel.getMatchesByTournament(tournamentElim.id)
      const round1 = matches.filter(m => m.round === 'Round 1')

      assert.strictEqual(round1.length, 2)
      assert.ok(round1[0].player1_id)
      assert.ok(round1[0].player2_id)
      assert.strictEqual(round1[0].status, 'assigned')
      assert.ok(round1[1].player1_id)
      assert.ok(round1[1].player2_id)
      assert.strictEqual(round1[1].status, 'assigned')
    })

    test('setting winner advances to next round', async () => {
      await registerAndApprove(tournamentElim.id, 4)
      await api.post(`/api/tournaments/${tournamentElim.id}/start`)
        .set('Authorization', `Bearer ${organizerToken}`)

      const matches = matchesModel.getMatchesByTournament(tournamentElim.id)
      const round1 = matches.filter(m => m.round === 'Round 1')
      const firstMatch = round1[0]

      await api.put(`/api/matches/${firstMatch.id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ winner_id: firstMatch.player1_id, score_player1: 3, score_player2: 1 })
        .expect(200)

      const updatedMatches = matchesModel.getMatchesByTournament(tournamentElim.id)
      const round2 = updatedMatches.find(m => m.round === 'Round 2')

      // El ganador debe estar en la final
      const winnerAssigned = round2.player1_id === firstMatch.player1_id || round2.player2_id === firstMatch.player1_id
      assert.ok(winnerAssigned, 'winner should advance to Round 2')
    })

    test('cannot set winner if match is not assigned', async () => {
      const matches = matchesModel.getMatchesByTournament(tournamentElim.id)
      const pendingMatch = matches[0]

      await api.put(`/api/matches/${pendingMatch.id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ winner_id: players[0].id })
        .expect(400)
    })

    test('cannot modify a completed match', async () => {
      await registerAndApprove(tournamentElim.id, 4)
      await api.post(`/api/tournaments/${tournamentElim.id}/start`)
        .set('Authorization', `Bearer ${organizerToken}`)

      const matches = matchesModel.getMatchesByTournament(tournamentElim.id)
      const match = matches.find(m => m.status === 'assigned')

      await api.put(`/api/matches/${match.id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ winner_id: match.player1_id })

      await api.put(`/api/matches/${match.id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ winner_id: match.player2_id })
        .expect(400)
    })

    test('winner must be one of the two players', async () => {
      await registerAndApprove(tournamentElim.id, 4)
      await api.post(`/api/tournaments/${tournamentElim.id}/start`)
        .set('Authorization', `Bearer ${organizerToken}`)

      const matches = matchesModel.getMatchesByTournament(tournamentElim.id)
      const match = matches.find(m => m.status === 'assigned')

      await api.put(`/api/matches/${match.id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ winner_id: 99999 })
        .expect(400)
    })

    test('full elimination tournament flow ends with standings', async () => {
      await registerAndApprove(tournamentElim.id, 4)
      await api.post(`/api/tournaments/${tournamentElim.id}/start`)
        .set('Authorization', `Bearer ${organizerToken}`)

      let matches = matchesModel.getMatchesByTournament(tournamentElim.id)

      // Completar Round 1
      const round1 = matches.filter(m => m.round === 'Round 1')
      for (const m of round1) {
        await api.put(`/api/matches/${m.id}`)
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({ winner_id: m.player1_id, score_player1: 3, score_player2: 0 })
      }

      // Completar Round 2
      matches = matchesModel.getMatchesByTournament(tournamentElim.id)
      const round2 = matches.filter(m => m.round === 'Round 2')
      for (const m of round2) {
        await api.put(`/api/matches/${m.id}`)
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({ winner_id: m.player1_id, score_player1: 3, score_player2: 0 })
      }

      const res = await api.post(`/api/tournaments/${tournamentElim.id}/finish`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200)

      assert.ok(Array.isArray(res.body.standings))
      assert.ok(res.body.standings.length > 0)
    })
  })

  describe('league tournament', () => {
    test('creates correct number of matches on tournament creation', () => {
      // 4 jugadores → 6 matches (4*3/2)
      const matches = matchesModel.getMatchesByTournament(tournamentLeague.id)
      assert.strictEqual(matches.length, 6)
    })

    test('/start assigns all players to all matches', async () => {
      await registerAndApprove(tournamentLeague.id, 4)

      await api.post(`/api/tournaments/${tournamentLeague.id}/start`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200)

      const matches = matchesModel.getMatchesByTournament(tournamentLeague.id)
      assert.strictEqual(matches.length, 6)

      for (const m of matches) {
        assert.ok(m.player1_id, 'player1_id debe estar asignado')
        assert.ok(m.player2_id, 'player2_id debe estar asignado')
        assert.strictEqual(m.status, 'assigned')
      }
    })

    test('each player appears exactly 3 times across matches', async () => {
      await registerAndApprove(tournamentLeague.id, 4)
      await api.post(`/api/tournaments/${tournamentLeague.id}/start`)
        .set('Authorization', `Bearer ${organizerToken}`)

      const matches = matchesModel.getMatchesByTournament(tournamentLeague.id)
      for (const player of players) {
        const count = matches.filter(m => m.player1_id === player.id || m.player2_id === player.id).length
        assert.strictEqual(count, 3)
      }
    })

    test('full league flow ends with standings', async () => {
      await registerAndApprove(tournamentLeague.id, 4)
      await api.post(`/api/tournaments/${tournamentLeague.id}/start`)
        .set('Authorization', `Bearer ${organizerToken}`)

      const matches = matchesModel.getMatchesByTournament(tournamentLeague.id)
      for (const m of matches) {
        await api.put(`/api/matches/${m.id}`)
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({ winner_id: m.player1_id, score_player1: 3, score_player2: 1 })
      }

      const res = await api.post(`/api/tournaments/${tournamentLeague.id}/finish`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(200)

      assert.ok(Array.isArray(res.body.standings))
      assert.ok(res.body.standings.length > 0)
    })

    test('cannot finish tournament with pending matches', async () => {
      await registerAndApprove(tournamentLeague.id, 4)
      await api.post(`/api/tournaments/${tournamentLeague.id}/start`)
        .set('Authorization', `Bearer ${organizerToken}`)

      await api.post(`/api/tournaments/${tournamentLeague.id}/finish`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(400)
    })
  })
})
