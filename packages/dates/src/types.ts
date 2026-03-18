export type DateInput = string | number | Date

// Always a full ISO 8601 UTC string e.g. "2026-03-18T09:00:00.000Z"
export type ISOString = string

// "HH:mm" string e.g. "09:00"
export type TimeString = string

// IANA timezone string e.g. "Australia/Sydney"
export type Timezone = string

export interface ShiftWindow {
  start: Date
  end: Date
  durationMinutes: number
}
