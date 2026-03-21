import request from 'supertest'
import {
  buildApp,
  fakeUser,
  fakeEmployee,
  fakeWorkspace,
  fakeMembership,
  fakeEmployeeMembership,
  fakeSkill,
  fakeMembershipSkill,
  managerToken,
  employeeToken,
} from '../helpers'
import { prismaMock } from '../setup'

const app = buildApp()
const BASE = `/api/workspaces/${fakeWorkspace.id}/employees/${fakeEmployee.id}/skills`

describe('GET /api/workspaces/:workspaceId/employees/:userId/skills', () => {
  it('returns the skill list for an employee', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)             // requireRole (manager)
      .mockResolvedValueOnce(fakeEmployeeMembership)     // resolveMembership
    prismaMock.membershipSkill.findMany.mockResolvedValue([
      { ...fakeMembershipSkill, skill: fakeSkill },
    ] as any)

    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toEqual({ id: fakeSkill.id, name: fakeSkill.name })
  })

  it('returns 404 when the employee is not in the workspace', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)  // requireRole
      .mockResolvedValueOnce(null)            // resolveMembership

    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).get(BASE)

    expect(res.status).toBe(401)
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

describe('POST /api/workspaces/:workspaceId/employees/:userId/skills', () => {
  it('allows a manager to assign a skill to an employee', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)          // requireRole
      .mockResolvedValueOnce(fakeEmployeeMembership)  // resolveMembership
    prismaMock.skill.findFirst.mockResolvedValue(fakeSkill)
    prismaMock.membershipSkill.findUnique.mockResolvedValue(null)
    prismaMock.membershipSkill.create.mockResolvedValue(fakeMembershipSkill)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ skillId: fakeSkill.id })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ id: fakeSkill.id, name: fakeSkill.name })
  })

  it('returns 409 when the employee already has the skill', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)          // requireRole
      .mockResolvedValueOnce(fakeEmployeeMembership)  // resolveMembership
    prismaMock.skill.findFirst.mockResolvedValue(fakeSkill)
    prismaMock.membershipSkill.findUnique.mockResolvedValue(fakeMembershipSkill)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ skillId: fakeSkill.id })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('CONFLICT')
  })

  it('returns 404 when the skill does not belong to this workspace', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)          // requireRole
      .mockResolvedValueOnce(fakeEmployeeMembership)  // resolveMembership
    prismaMock.skill.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ skillId: 'wrong-skill' })

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })

  it('returns 400 for missing skillId', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BAD_REQUEST')
  })

  it('returns 403 when an employee tries to assign a skill', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${employeeToken()}`)
      .send({ skillId: fakeSkill.id })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).post(BASE).send({ skillId: fakeSkill.id })

    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/workspaces/:workspaceId/employees/:userId/skills/:skillId', () => {
  it('allows a manager to remove a skill from an employee', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)          // requireRole
      .mockResolvedValueOnce(fakeEmployeeMembership)  // resolveMembership
    prismaMock.membershipSkill.findUnique.mockResolvedValue(fakeMembershipSkill)
    prismaMock.membershipSkill.delete.mockResolvedValue(fakeMembershipSkill)

    const res = await request(app)
      .delete(`${BASE}/${fakeSkill.id}`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(204)
  })

  it('returns 404 when the employee does not have the skill', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)          // requireRole
      .mockResolvedValueOnce(fakeEmployeeMembership)  // resolveMembership
    prismaMock.membershipSkill.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .delete(`${BASE}/${fakeSkill.id}`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })

  it('returns 403 when an employee tries to remove a skill', async () => {
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
