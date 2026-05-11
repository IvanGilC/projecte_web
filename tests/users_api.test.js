process.env.NODE_ENV = "test";
process.env.SECRET = "marcoberuet";
process.env.ADMIN_PASSWORD = "admin1234";
process.env.TEST_SQLITE_URL = ":memory:";
process.env.PORT = "3001";

const { test, describe, beforeEach, after } = require('node:test')
const assert = require('node:assert')
const supertest = require('supertest')
const app = require('../app')
const db = require('../utils/db')

const api = supertest(app)

describe('users API', () => {
  beforeEach(() => {
    db.exec('DELETE FROM users')
    // Recrear admin por defecto
    const bcrypt = require('bcrypt')
    const hash = bcrypt.hashSync('admin1234', 10)
    db.prepare(`INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')`)
      .run('admin', 'admin@tournament.app', hash)
  })

  describe('registration', () => {
    test('player can register with valid data', async () => {
      const res = await api
        .post('/api/users')
        .send({ username: 'player1', email: 'p1@test.com', password: '123456' })
        .expect(201)
        .expect('Content-Type', /application\/json/)

      assert.strictEqual(res.body.username, 'player1')
      assert.strictEqual(res.body.role, 'player')
      assert(!res.body.password_hash) // no debe devolver el hash
    })

    test('fails if username is missing', async () => {
      await api
        .post('/api/users')
        .send({ email: 'p1@test.com', password: '123456' })
        .expect(400)
    })

    test('fails if username already taken', async () => {
      await api.post('/api/users').send({ username: 'player1', email: 'p1@test.com', password: '123456' })
      const res = await api
        .post('/api/users')
        .send({ username: 'player1', email: 'other@test.com', password: '123456' })
        .expect(400)

      assert(res.body.error.includes('username already taken'))
    })
  })

  describe('login', () => {
    test('returns token with valid credentials', async () => {
      await api.post('/api/users').send({ username: 'player1', email: 'p1@test.com', password: '123456' })
      const res = await api
        .post('/api/login')
        .send({ username: 'player1', password: '123456' })
        .expect(200)

      assert(res.body.token)
      assert.strictEqual(res.body.username, 'player1')
    })

    test('fails with wrong password', async () => {
      await api.post('/api/users').send({ username: 'player1', email: 'p1@test.com', password: '123456' })
      await api
        .post('/api/login')
        .send({ username: 'player1', password: 'wrong' })
        .expect(401)
    })
  })

  describe('profile', () => {
    test('public can view profile without password_hash', async () => {
      await api.post('/api/users').send({ username: 'player1', email: 'p1@test.com', password: '123456' })
      const res = await api.get('/api/users/player1').expect(200)
      assert.strictEqual(res.body.username, 'player1')
      assert(!res.body.password_hash)
    })

    test('returns 404 for unknown user', async () => {
      await api.get('/api/users/nobody').expect(404)
    })
  })

  describe('admin creates organizer', () => {
    test('admin can create organizer role', async () => {
      const loginRes = await api.post('/api/login').send({ username: 'admin', password: 'admin1234' })
      const token = loginRes.body.token

      const res = await api
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'org1', email: 'org1@test.com', password: '123456', role: 'organizer' })
        .expect(201)

      assert.strictEqual(res.body.role, 'organizer')
    })

    test('player cannot create organizer role', async () => {
      await api.post('/api/users').send({ username: 'player1', email: 'p1@test.com', password: '123456' })
      const loginRes = await api.post('/api/login').send({ username: 'player1', password: '123456' })
      const token = loginRes.body.token

      await api
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'org1', email: 'org1@test.com', password: '123456', role: 'organizer' })
        .expect(403)
    })
  })
})
