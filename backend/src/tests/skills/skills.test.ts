import request from 'supertest'
import {
  buildApp,
  fakeUser,
  fakeEmployee,
  fakeWorkspace,
  fakeMembership,
  fakeEmployeeMembership,
  fakeSkill,
  managerToken,
  employeeToken,
} from '../helpers'
import { prismaMock } from '../setup'

const app = buildApp()
const BASE = `/api/workspaces/${fakeWorkspace.id}/skills`

describe('GET /api/workspaces/:workspaceId/skills', () => {
  it('returns skills list for a manager', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.skill.findMany.mockResolvedValue([fakeSkill])

    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toEqual({ id: fakeSkill.id, name: fakeSkill.name })
  })

  it('returns skills list for an employee', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)
    prismaMock.skill.findMany.mockResolvedValue([fakeSkill])

    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${employeeToken()}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).get(BASE)

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 when not a member of the workspace', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })
})

describe('POST /api/workspaces/:workspaceId/skills', () => {
  it('allows a manager to create a skill', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.skill.findUnique.mockResolvedValue(null)
    prismaMock.skill.create.mockResolvedValue(fakeSkill)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ name: 'Barista' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ id: fakeSkill.id, name: fakeSkill.name })
  })

  it('returns 409 when a skill with that name already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.skill.findUnique.mockResolvedValue(fakeSkill)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ name: 'Barista' })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('CONFLICT')
  })

  it('returns 400 for missing name', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BAD_REQUEST')
  })

  it('returns 403 when an employee tries to create a skill', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${employeeToken()}`)
      .send({ name: 'Barista' })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).post(BASE).send({ name: 'Barista' })

    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/workspaces/:workspaceId/skills/:skillId', () => {
  it('allows a manager to delete a skill', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.skill.findFirst.mockResolvedValue(fakeSkill)
    prismaMock.skill.delete.mockResolvedValue(fakeSkill)

    const res = await request(app)
      .delete(`${BASE}/${fakeSkill.id}`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(204)
  })

  it('returns 404 when skill does not exist in this workspace', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.skill.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .delete(`${BASE}/nonexistent-skill`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })

  it('returns 403 when an employee tries to delete a skill', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)

    const res = await request(app)
      .delete(`${BASE}/${fakeSkill.id}`)
      .set('Authorization', `Bearer ${employeeToken()}`)

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).delete(`${BASE}/${fakeSkill.id}`)

    expect(res.status).toBe(401)
  })
})
