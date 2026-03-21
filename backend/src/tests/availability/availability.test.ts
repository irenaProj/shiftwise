import request from 'supertest'
import {
  buildApp,
  fakeUser,
  fakeEmployee,
  fakeWorkspace,
  fakeMembership,
  fakeEmployeeMembership,
  fakeAvailability,
  managerToken,
  employeeToken,
} from '../helpers'
import { prismaMock } from '../setup'

const app = buildApp()
const BASE = `/api/workspaces/${fakeWorkspace.id}/employees/${fakeEmployee.id}/availability`

describe('GET /api/workspaces/:workspaceId/employees/:userId/availability', () => {
  it('returns availability windows for a manager', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)            // requireRole
      .mockResolvedValueOnce(fakeEmployeeMembership)    // resolveMembership
    prismaMock.availability.findMany.mockResolvedValue([fakeAvailability])

    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toEqual({
      id: fakeAvailability.id,
      dayOfWeek: fakeAvailability.dayOfWeek,
      startTime: fakeAvailability.startTime,
      endTime: fakeAvailability.endTime,
    })
  })

  it('returns availability windows for an employee', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeEmployeeMembership)    // requireRole
      .mockResolvedValueOnce(fakeEmployeeMembership)    // resolveMembership
    prismaMock.availability.findMany.mockResolvedValue([fakeAvailability])

    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${employeeToken()}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('returns 404 when employee is not in the workspace', async () => {
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

describe('PUT /api/workspaces/:workspaceId/employees/:userId/availability', () => {
  it('creates a new availability window', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)            // requireRole
      .mockResolvedValueOnce(fakeEmployeeMembership)    // resolveMembership
    prismaMock.availability.upsert.mockResolvedValue(fakeAvailability)

    const res = await request(app)
      .put(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      id: fakeAvailability.id,
      dayOfWeek: fakeAvailability.dayOfWeek,
      startTime: fakeAvailability.startTime,
      endTime: fakeAvailability.endTime,
    })
  })

  it('updates an existing window when dayOfWeek + startTime already exist', async () => {
    const updated = { ...fakeAvailability, endTime: '18:00' }
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)            // requireRole
      .mockResolvedValueOnce(fakeEmployeeMembership)    // resolveMembership
    prismaMock.availability.upsert.mockResolvedValue(updated)

    const res = await request(app)
      .put(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ dayOfWeek: 1, startTime: '09:00', endTime: '18:00' })

    expect(res.status).toBe(200)
    expect(res.body.endTime).toBe('18:00')
  })

  it('returns 404 when the employee is not in the workspace', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)  // requireRole
      .mockResolvedValueOnce(null)            // resolveMembership

    const res = await request(app)
      .put(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' })

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })

  it('returns 400 for an invalid time format', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)

    const res = await request(app)
      .put(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ dayOfWeek: 1, startTime: '9am', endTime: '5pm' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BAD_REQUEST')
  })

  it('returns 400 for an invalid day of week', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)

    const res = await request(app)
      .put(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ dayOfWeek: 7, startTime: '09:00', endTime: '17:00' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BAD_REQUEST')
  })

  it('returns 403 when an employee tries to set availability', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)

    const res = await request(app)
      .put(BASE)
      .set('Authorization', `Bearer ${employeeToken()}`)
      .send({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .put(BASE)
      .send({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' })

    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/workspaces/:workspaceId/employees/:userId/availability/:availabilityId', () => {
  it('allows a manager to delete an availability window', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)            // requireRole
      .mockResolvedValueOnce(fakeEmployeeMembership)    // resolveMembership
    prismaMock.availability.findFirst.mockResolvedValue(fakeAvailability)
    prismaMock.availability.delete.mockResolvedValue(fakeAvailability)

    const res = await request(app)
      .delete(`${BASE}/${fakeAvailability.id}`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(204)
  })

  it('returns 404 when the window does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)            // requireRole
      .mockResolvedValueOnce(fakeEmployeeMembership)    // resolveMembership
    prismaMock.availability.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .delete(`${BASE}/nonexistent`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })

  it('returns 404 when the employee is not in the workspace', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)  // requireRole
      .mockResolvedValueOnce(null)            // resolveMembership

    const res = await request(app)
      .delete(`${BASE}/${fakeAvailability.id}`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })

  it('returns 403 when an employee tries to delete a window', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)

    const res = await request(app)
      .delete(`${BASE}/${fakeAvailability.id}`)
      .set('Authorization', `Bearer ${employeeToken()}`)

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).delete(`${BASE}/${fakeAvailability.id}`)

    expect(res.status).toBe(401)
  })
})
