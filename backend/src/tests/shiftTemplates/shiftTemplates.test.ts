import request from 'supertest'
import {
  buildApp,
  fakeUser,
  fakeEmployee,
  fakeWorkspace,
  fakeMembership,
  fakeEmployeeMembership,
  fakeShiftTemplate,
  managerToken,
  employeeToken,
} from '../helpers'
import { prismaMock } from '../setup'

const app = buildApp()
const BASE = `/api/workspaces/${fakeWorkspace.id}/shift-templates`

describe('GET /api/workspaces/:workspaceId/shift-templates', () => {
  it('returns shift templates for a manager', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.shiftTemplate.findMany.mockResolvedValue([fakeShiftTemplate])

    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toEqual({
      id: fakeShiftTemplate.id,
      name: fakeShiftTemplate.name,
      startTime: fakeShiftTemplate.startTime,
      endTime: fakeShiftTemplate.endTime,
    })
  })

  it('returns shift templates for an employee', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)
    prismaMock.shiftTemplate.findMany.mockResolvedValue([fakeShiftTemplate])

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

describe('POST /api/workspaces/:workspaceId/shift-templates', () => {
  it('allows a manager to create a shift template', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.shiftTemplate.create.mockResolvedValue(fakeShiftTemplate)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ name: 'Morning', startTime: '06:00', endTime: '14:00' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      id: fakeShiftTemplate.id,
      name: fakeShiftTemplate.name,
      startTime: fakeShiftTemplate.startTime,
      endTime: fakeShiftTemplate.endTime,
    })
  })

  it('returns 400 for an invalid time format', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ name: 'Morning', startTime: '6am', endTime: '2pm' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BAD_REQUEST')
  })

  it('returns 400 for a missing field', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ name: 'Morning', startTime: '06:00' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BAD_REQUEST')
  })

  it('returns 403 when an employee tries to create a template', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${employeeToken()}`)
      .send({ name: 'Morning', startTime: '06:00', endTime: '14:00' })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ name: 'Morning', startTime: '06:00', endTime: '14:00' })

    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/workspaces/:workspaceId/shift-templates/:templateId', () => {
  it('allows a manager to delete a shift template', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.shiftTemplate.findFirst.mockResolvedValue(fakeShiftTemplate)
    prismaMock.shiftTemplate.delete.mockResolvedValue(fakeShiftTemplate)

    const res = await request(app)
      .delete(`${BASE}/${fakeShiftTemplate.id}`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(204)
  })

  it('returns 404 when the template does not exist in this workspace', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.shiftTemplate.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .delete(`${BASE}/nonexistent-template`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })

  it('returns 403 when an employee tries to delete a template', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)

    const res = await request(app)
      .delete(`${BASE}/${fakeShiftTemplate.id}`)
      .set('Authorization', `Bearer ${employeeToken()}`)

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).delete(`${BASE}/${fakeShiftTemplate.id}`)

    expect(res.status).toBe(401)
  })
})
