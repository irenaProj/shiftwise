import { UTCDate } from '@date-fns/utc'
import {
  addDays,
  addMinutes,
  differenceInMinutes,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
  isValid,
} from 'date-fns'
import type { DateInput, ISOString, ShiftWindow, TimeString } from './types.ts'

// ── Core constructors ────────────────────────────────────────────────────────

export const toUTC = (input: DateInput): UTCDate =>
  new UTCDate(input)

export const nowUTC = (): UTCDate =>
  new UTCDate()

export const toISO = (input: DateInput): ISOString =>
  toUTC(input).toISOString()

export const parseUTC = (iso: ISOString): UTCDate =>
  new UTCDate(parseISO(iso))

export const isValidDate = (input: DateInput): boolean =>
  isValid(toUTC(input))

// ── Week helpers ─────────────────────────────────────────────────────────────

export const getWeekStart = (input: DateInput): UTCDate =>
  new UTCDate(startOfWeek(toUTC(input), { weekStartsOn: 1 }))

export const getWeekEnd = (input: DateInput): UTCDate =>
  new UTCDate(endOfWeek(toUTC(input), { weekStartsOn: 1 }))

export const getWeekDays = (input: DateInput): UTCDate[] =>
  eachDayOfInterval({
    start: getWeekStart(input),
    end: getWeekEnd(input),
  }).map((d) => new UTCDate(d))

// ── Arithmetic ───────────────────────────────────────────────────────────────

export const addUTCDays = (input: DateInput, amount: number): UTCDate =>
  new UTCDate(addDays(toUTC(input), amount))

export const addUTCMinutes = (input: DateInput, amount: number): UTCDate =>
  new UTCDate(addMinutes(toUTC(input), amount))

export const diffMinutes = (end: DateInput, start: DateInput): number =>
  differenceInMinutes(toUTC(end), toUTC(start))

// ── Shift helpers ────────────────────────────────────────────────────────────

// startTime and endTime are UTC "HH:mm" strings
export const buildShiftWindow = (
  dateISO: ISOString,
  startTime: TimeString,
  endTime: TimeString
): ShiftWindow => {
  const base = dateISO.slice(0, 10) // "2026-03-18"
  const start = new UTCDate(`${base}T${startTime}:00.000Z`)
  const end = new UTCDate(`${base}T${endTime}:00.000Z`)
  return { start, end, durationMinutes: diffMinutes(end, start) }
}

export const doShiftsOverlap = (a: ShiftWindow, b: ShiftWindow): boolean =>
  isWithinInterval(toUTC(a.start), {
    start: toUTC(b.start),
    end: toUTC(b.end),
  }) ||
  isWithinInterval(toUTC(b.start), {
    start: toUTC(a.start),
    end: toUTC(a.end),
  })

export const hasMinRest = (
  endOfFirst: DateInput,
  startOfNext: DateInput,
  minHours = 8
): boolean => diffMinutes(startOfNext, endOfFirst) >= minHours * 60
