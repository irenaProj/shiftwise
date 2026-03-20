import request from 'supertest'
import { buildApp, fakeUser, fakeWorkspace, fakeMembership } from '../helpers'
import { prismaMock } from '../setup'

const app = buildApp()

describe('POST /api/auth/login', () => {
  it('returns 200 and tokens with valid credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.refreshToken.create.mockResolvedValue({
      id: 'rt-1',
      token: 'refresh-token',
      userId: fakeUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })
    prismaMock.membership.findFirst.mockResolvedValue(fakeMembership)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: fakeUser.email, password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body.user.email).toBe(fakeUser.email)
    expect(res.body.workspace.name).toBe(fakeWorkspace.name)
  })

  it('returns 401 with invalid password', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: fakeUser.email, password: 'wrongpassword' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Invalid credentials')
    expect(res.body.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@demo.com', password: 'password123' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 with invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'password123' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BAD_REQUEST')
  })
})

describe('POST /api/auth/register', () => {
  it('returns 201 and tokens when registering a new user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue(fakeUser)
    prismaMock.refreshToken.create.mockResolvedValue({
      id: 'rt-1',
      token: 'refresh-token',
      userId: fakeUser.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    })

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'new.user@demo.com',
        password: 'password123',
        name: 'New User',
        workspaceName: 'New Workspace',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('accessToken')
  })

  it('returns 409 when email already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: fakeUser.email,
        password: 'password123',
        name: 'Will Power',
        workspaceName: 'Demo Cafe',
      })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('CONFLICT')
  })

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'new@demo.com',
        password: 'short',
        name: 'New User',
      })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BAD_REQUEST')
  })
})

describe('POST /api/auth/logout', () => {
  it('returns 200 and clears cookie', async () => {
    prismaMock.refreshToken.deleteMany.mockResolvedValue({ count: 1 })

    const res = await request(app)
      .post('/api/auth/logout')

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
