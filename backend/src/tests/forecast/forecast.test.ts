import request from 'supertest'
import {
  buildApp,
  fakeUser,
  fakeEmployee,
  fakeWorkspace,
  fakeMembership,
  fakeEmployeeMembership,
  fakeForecastSlot,
  managerToken,
  employeeToken,
} from '../helpers'
import { prismaMock } from '../setup'

const app = buildApp()
const BASE = `/api/workspaces/${fakeWorkspace.id}/forecast`

describe('GET /api/workspaces/:workspaceId/forecast', () => {
  it('returns forecast slots for a manager', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.forecastSlot.findMany.mockResolvedValue([fakeForecastSlot])

    const res = await request(app)
      .get(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0]).toEqual({
      id: fakeForecastSlot.id,
      dayOfWeek: fakeForecastSlot.dayOfWeek,
      time: fakeForecastSlot.time,
      required: fakeForecastSlot.required,
    })
  })

  it('returns forecast slots for an employee', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)
    prismaMock.forecastSlot.findMany.mockResolvedValue([fakeForecastSlot])

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

describe('PUT /api/workspaces/:workspaceId/forecast', () => {
  it('creates a new forecast slot', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.forecastSlot.upsert.mockResolvedValue(fakeForecastSlot)

    const res = await request(app)
      .put(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ dayOfWeek: 1, time: '09:00', required: 3 })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      id: fakeForecastSlot.id,
      dayOfWeek: fakeForecastSlot.dayOfWeek,
      time: fakeForecastSlot.time,
      required: fakeForecastSlot.required,
    })
  })

  it('updates an existing slot when dayOfWeek + time already exist', async () => {
    const updated = { ...fakeForecastSlot, required: 5 }
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.forecastSlot.upsert.mockResolvedValue(updated)

    const res = await request(app)
      .put(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ dayOfWeek: 1, time: '09:00', required: 5 })

    expect(res.status).toBe(200)
    expect(res.body.required).toBe(5)
  })

  it('returns 400 for an invalid day of week', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)

    const res = await request(app)
      .put(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ dayOfWeek: 7, time: '09:00', required: 3 })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BAD_REQUEST')
  })

  it('returns 400 for an invalid time format', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)

    const res = await request(app)
      .put(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ dayOfWeek: 1, time: '9am', required: 3 })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BAD_REQUEST')
  })

  it('returns 400 when required is less than 1', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)

    const res = await request(app)
      .put(BASE)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ dayOfWeek: 1, time: '09:00', required: 0 })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BAD_REQUEST')
  })

  it('returns 403 when an employee tries to upsert a slot', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)

    const res = await request(app)
      .put(BASE)
      .set('Authorization', `Bearer ${employeeToken()}`)
      .send({ dayOfWeek: 1, time: '09:00', required: 3 })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .put(BASE)
      .send({ dayOfWeek: 1, time: '09:00', required: 3 })

    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/workspaces/:workspaceId/forecast/:slotId', () => {
  it('allows a manager to delete a forecast slot', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.forecastSlot.findFirst.mockResolvedValue(fakeForecastSlot)
    prismaMock.forecastSlot.delete.mockResolvedValue(fakeForecastSlot)

    const res = await request(app)
      .delete(`${BASE}/${fakeForecastSlot.id}`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(204)
  })

  it('returns 404 when the slot does not exist in this workspace', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.forecastSlot.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .delete(`${BASE}/nonexistent-slot`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })

  it('returns 403 when an employee tries to delete a slot', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)

    const res = await request(app)
      .delete(`${BASE}/${fakeForecastSlot.id}`)
      .set('Authorization', `Bearer ${employeeToken()}`)

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).delete(`${BASE}/${fakeForecastSlot.id}`)

    expect(res.status).toBe(401)
  })
})
