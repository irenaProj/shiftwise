import request from 'supertest'
import {
  buildApp,
  fakeUser,
  fakeEmployee,
  fakeWorkspace,
  fakeMembership,
  fakeEmployeeMembership,
  managerToken,
  employeeToken,
} from '../helpers'
import { prismaMock } from '../setup'

const app = buildApp()

describe('GET /api/workspaces/:workspaceId/employees', () => {
  it('returns employee list for a manager', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.membership.findMany.mockResolvedValue([
      { ...fakeMembership, user: fakeUser },
      { ...fakeEmployeeMembership, user: fakeEmployee },
    ] as any)

    const res = await request(app)
      .get(`/api/workspaces/${fakeWorkspace.id}/employees`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].email).toBe(fakeUser.email)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .get(`/api/workspaces/${fakeWorkspace.id}/employees`)

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('UNAUTHORIZED')
  })

  it('returns 403 when not a member of the workspace', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get(`/api/workspaces/${fakeWorkspace.id}/employees`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })
})

describe('POST /api/workspaces/:workspaceId/employees', () => {
  it('allows a manager to add a new employee', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(fakeUser)    // requireAuth lookup
      .mockResolvedValueOnce(null)        // check if new employee email exists
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.user.create.mockResolvedValue(fakeEmployee)
    prismaMock.membership.create.mockResolvedValue({
      ...fakeEmployeeMembership,
      user: fakeEmployee,
    } as any)

    const res = await request(app)
      .post(`/api/workspaces/${fakeWorkspace.id}/employees`)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({
        email: 'new.employee@demo.com',
        name: 'New Employee',
        role: 'EMPLOYEE',
        password: 'password123',
      })

    expect(res.status).toBe(201)
    expect(res.body.email).toBe(fakeEmployee.email)
  })

  it('returns 409 when employee is already a member', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(fakeUser)       // requireAuth lookup
      .mockResolvedValueOnce(fakeEmployee)   // employee already exists
    prismaMock.membership.findUnique
      .mockResolvedValueOnce(fakeMembership)        // manager membership check
      .mockResolvedValueOnce(fakeEmployeeMembership) // employee already a member
    
    const res = await request(app)
      .post(`/api/workspaces/${fakeWorkspace.id}/employees`)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({
        email: fakeEmployee.email,
        name: fakeEmployee.name,
        role: 'EMPLOYEE',
        password: 'password123',
      })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('CONFLICT')
  })

  it('returns 403 when an employee tries to add a member', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)

    const res = await request(app)
      .post(`/api/workspaces/${fakeWorkspace.id}/employees`)
      .set('Authorization', `Bearer ${employeeToken()}`)
      .send({
        email: 'another@demo.com',
        name: 'Another Person',
        role: 'EMPLOYEE',
        password: 'password123',
      })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('FORBIDDEN')
  })

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post(`/api/workspaces/${fakeWorkspace.id}/employees`)
      .send({
        email: 'new@demo.com',
        name: 'New Person',
        role: 'EMPLOYEE',
        password: 'password123',
      })

    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/workspaces/:workspaceId/employees/:userId', () => {
  it('allows a manager to remove an employee', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.membership.delete.mockResolvedValue(fakeEmployeeMembership)

    const res = await request(app)
      .delete(`/api/workspaces/${fakeWorkspace.id}/employees/${fakeEmployee.id}`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(204)
  })

  it('returns 400 when manager tries to remove themselves', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)

    const res = await request(app)
      .delete(`/api/workspaces/${fakeWorkspace.id}/employees/${fakeUser.id}`)
      .set('Authorization', `Bearer ${managerToken()}`)

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('BAD_REQUEST')
  })

  it('returns 403 when an employee tries to delete', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeEmployee)
    prismaMock.membership.findUnique.mockResolvedValue(fakeEmployeeMembership)

    const res = await request(app)
      .delete(`/api/workspaces/${fakeWorkspace.id}/employees/${fakeUser.id}`)
      .set('Authorization', `Bearer ${employeeToken()}`)

    expect(res.status).toBe(403)
  })
})
