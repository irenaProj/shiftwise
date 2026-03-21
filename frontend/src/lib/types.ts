export type Role = 'OWNER' | 'MANAGER' | 'EMPLOYEE'

export interface Employee {
  id: string
  name: string
  email: string
  timezone: string
  role: Role
  joinedAt: string
}

export interface Skill {
  id: string
  name: string
}

export interface ShiftTemplate {
  id: string
  name: string
  startTime: string
  endTime: string
}

export interface ForecastSlot {
  id: string
  dayOfWeek: number
  time: string
  required: number
}

export interface Availability {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
}
