process.env.NODE_ENV = "test";
process.env.SECRET = "marcoberuet";
process.env.ADMIN_PASSWORD = "admin1234";
process.env.TEST_SQLITE_URL = ":memory:";
process.env.PORT = "3001";

const { test, describe, beforeEach } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../app')
const db = require('../utils/db')

const api = supertest(app)

const loginAs = async (username, password) => {
  const res = await api.post('/api/login').send({ username, password })
  return res.body.token
}

describe('tournaments API', () => {
  let orgToken, playerToken, vgId

  beforeEach(async () => {
    db.exec('DELETE FROM final_standings')
    db.exec('DELETE FROM matches')
    db.exec('DELETE FROM tournament_players')
    db.exec('DELETE FROM tournament_organizers')
    db.exec('DELETE FROM tournaments')
    db.exec('DELETE FROM videogames')
    db.exec('DELETE FROM users')

    const bcrypt = require('bcrypt')
    const hash = bcrypt.hashSync('admin1234', 10)
    db.prepare(`INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')`)
      .run('admin', 'admin@tournament.app', hash)

    const adminToken = await loginAs('admin', 'admin1234')

    await api.post('/api/users').set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'org1', email: 'org1@test.com', password: '123456', role: 'organizer' })
    orgToken = await loginAs('org1', '123456')

    await api.post('/api/users').send({ username: 'player1', email: 'p1@test.com', password: '123456' })
    playerToken = await loginAs('player1', '123456')

    const vgRes = await api.post('/api/videogames')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Street Fighter', description: 'Fighting game' })
    vgId = vgRes.body.id
  })

  test('list of tournaments is public', async () => {
    await api.get('/api/tournaments').expect(200)
  })

  test('organizer can create tournament', async () => {
    const res = await api
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ name: 'Cup 2025', videogame_id: vgId, type: 'elimination', start_date: '2026-01-01', max_players: 4 })
      .expect(201)

    assert.strictEqual(res.body.name, 'Cup 2025')
    assert.strictEqual(res.body.status, 'planned')
  })

  test('player cannot create tournament', async () => {
    await api
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ name: 'Cup 2025', videogame_id: vgId, type: 'elimination', start_date: '2026-01-01', max_players: 4 })
      .expect(403)
  })

  test('unauthenticated cannot create tournament', async () => {
    await api
      .post('/api/tournaments')
      .send({ name: 'Cup 2025', videogame_id: vgId, type: 'elimination', start_date: '2026-01-01', max_players: 4 })
      .expect(401)
  })

  test('tournament info is public', async () => {
    const tRes = await api.post('/api/tournaments')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ name: 'Cup 2025', videogame_id: vgId, type: 'elimination', start_date: '2026-01-01', max_players: 4 })
    const tId = tRes.body.id

    const res = await api.get(`/api/tournaments/${tId}`).expect(200)
    assert.strictEqual(res.body.name, 'Cup 2025')
    assert(Array.isArray(res.body.matches))
    assert(Array.isArray(res.body.players))
  })

  test('returns 404 for unknown tournament', async () => {
    await api.get('/api/tournaments/99999').expect(404)
  })

  test('player can register to open tournament', async () => {
    const tRes = await api.post('/api/tournaments')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ name: 'Cup 2025', videogame_id: vgId, type: 'elimination', start_date: '2026-01-01', max_players: 4 })
    const tId = tRes.body.id

    await api
      .post(`/api/tournaments/${tId}/register`)
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(201)
  })

  test('player cannot register twice to the same tournament', async () => {
    const tRes = await api.post('/api/tournaments')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ name: 'Cup 2025', videogame_id: vgId, type: 'elimination', start_date: '2026-01-01', max_players: 4 })
    const tId = tRes.body.id

    await api.post(`/api/tournaments/${tId}/register`).set('Authorization', `Bearer ${playerToken}`)
    await api.post(`/api/tournaments/${tId}/register`).set('Authorization', `Bearer ${playerToken}`).expect(400)
  })

  test('player cannot register to closed tournament', async () => {
    const tRes = await api.post('/api/tournaments')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ name: 'Cup 2025', videogame_id: vgId, type: 'elimination', start_date: '2026-01-01', max_players: 4 })
    const tId = tRes.body.id

    await api.put(`/api/tournaments/${tId}/registrations`)
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ registrations_open: false })

    await api
      .post(`/api/tournaments/${tId}/register`)
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(400)
  })

  test('only owner can edit tournament', async () => {
    const tRes = await api.post('/api/tournaments')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ name: 'Cup 2025', videogame_id: vgId, type: 'elimination', start_date: '2026-01-01', max_players: 4 })
    const tId = tRes.body.id

    // Otro organizer no puede editar
    const bcrypt = require('bcrypt')
    const adminToken = await loginAs('admin', 'admin1234')
    await api.post('/api/users').set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'org2', email: 'org2@test.com', password: '123456', role: 'organizer' })
    const org2Token = await loginAs('org2', '123456')

    await api.put(`/api/tournaments/${tId}`)
      .set('Authorization', `Bearer ${org2Token}`)
      .send({ name: 'Hacked' })
      .expect(403)
  })

  test('owner can start tournament and matches get assigned', async () => {
    const tRes = await api.post('/api/tournaments')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ name: 'Cup 2025', videogame_id: vgId, type: 'elimination', start_date: '2026-01-01', max_players: 4 })
    const tId = tRes.body.id

    // Registrar y aprobar 4 jugadores
    const adminToken = await loginAs('admin', 'admin1234')
    for (let i = 2; i <= 5; i++) {
      await api.post('/api/users').send({ username: `p${i}`, email: `p${i}@test.com`, password: '123456' })
      const pToken = await loginAs(`p${i}`, '123456')
      const pRes = await api.post('/api/login').send({ username: `p${i}`, password: '123456' })
      const pId = pRes.body.id
      await api.post(`/api/tournaments/${tId}/register`).set('Authorization', `Bearer ${pToken}`)
      await api.put(`/api/tournaments/${tId}/players/${pId}`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ status: 'approved' })
    }

    const res = await api.post(`/api/tournaments/${tId}/start`)
      .set('Authorization', `Bearer ${orgToken}`)
      .expect(200)

    assert.strictEqual(res.body.status, 'ongoing')
  })

  test('owner can delete tournament', async () => {
    const tRes = await api.post('/api/tournaments')
      .set('Authorization', `Bearer ${orgToken}`)
      .send({ name: 'Cup 2025', videogame_id: vgId, type: 'elimination', start_date: '2026-01-01', max_players: 4 })
    const tId = tRes.body.id

    await api.delete(`/api/tournaments/${tId}`)
      .set('Authorization', `Bearer ${orgToken}`)
      .expect(204)

    await api.get(`/api/tournaments/${tId}`).expect(404)
  })
})
