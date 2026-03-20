/**
 * @module utc
 * @description
 * UTC-safe date operations for use on both the backend and frontend.
 *
 * All functions use {@link UTCDate} from `@date-fns/utc` instead of the native
 * `Date` constructor to prevent local timezone bleed during calculations.
 *
 * **Rule:** Never import `new Date()` in this file — always use `toUTC()` or `new UTCDate()`.
 *
 * @see {@link https://github.com/date-fns/utc} @date-fns/utc
 */

import { UTCDate } from "@date-fns/utc";
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
} from "date-fns";
import type { DateInput, ISOString, ShiftWindow, TimeString } from "./types.ts";

// ── Core constructors ────────────────────────────────────────────────────────

/**
 * Converts any date input to a {@link UTCDate}.
 * Use this as the entry point for all date operations in this module.
 *
 * @param input - A `Date`, ISO string, or Unix timestamp in milliseconds
 * @returns A `UTCDate` instance safe for UTC arithmetic
 *
 * @example
 * toUTC('2026-03-18T09:00:00.000Z') // UTCDate
 * toUTC(new Date())                  // UTCDate
 */
export const toUTC = (input: DateInput): UTCDate => new UTCDate(input);

/**
 * Returns the current date and time as a {@link UTCDate}.
 *
 * @returns Current UTC timestamp
 *
 * @example
 * const now = nowUTC() // UTCDate representing right now
 */
export const nowUTC = (): UTCDate => new UTCDate();

/**
 * Converts any date input to a UTC ISO 8601 string.
 *
 * @param input - A `Date`, ISO string, or Unix timestamp
 * @returns ISO string e.g. `"2026-03-18T09:00:00.000Z"`
 *
 * @example
 * toISO(new Date('2026-03-18')) // "2026-03-18T00:00:00.000Z"
 */
export const toISO = (input: DateInput): ISOString =>
  toUTC(input).toISOString();

/**
 * Parses an ISO 8601 string into a {@link UTCDate}.
 * Prefer this over `toUTC` when the input is guaranteed to be an ISO string.
 *
 * @param iso - ISO 8601 string e.g. `"2026-03-18T09:00:00.000Z"`
 * @returns A `UTCDate` instance
 *
 * @example
 * parseUTC('2026-03-18T09:00:00.000Z') // UTCDate
 */
export const parseUTC = (iso: ISOString): UTCDate => new UTCDate(parseISO(iso));

/**
 * Returns whether a given date input represents a valid date.
 *
 * @param input - Any date input to validate
 * @returns `true` if the date is valid, `false` otherwise
 *
 * @example
 * isValidDate('2026-03-18T09:00:00.000Z') // true
 * isValidDate('not-a-date')               // false
 */
export const isValidDate = (input: DateInput): boolean => isValid(toUTC(input));

// ── Week helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the start of the ISO week (Monday) containing the given date, in UTC.
 *
 * @param input - Any date input
 * @returns `UTCDate` set to Monday 00:00:00.000Z of the containing week
 *
 * @example
 * getWeekStart('2026-03-18T00:00:00.000Z') // UTCDate for Mon 2026-03-16
 */
export const getWeekStart = (input: DateInput): UTCDate =>
  new UTCDate(startOfWeek(toUTC(input), { weekStartsOn: 1 }));

/**
 * Returns the end of the ISO week (Sunday) containing the given date, in UTC.
 *
 * @param input - Any date input
 * @returns `UTCDate` set to Sunday 23:59:59.999Z of the containing week
 *
 * @example
 * getWeekEnd('2026-03-18T00:00:00.000Z') // UTCDate for Sun 2026-03-22
 */
export const getWeekEnd = (input: DateInput): UTCDate =>
  new UTCDate(endOfWeek(toUTC(input), { weekStartsOn: 1 }));

/**
 * Returns all 7 days (Mon–Sun) of the ISO week containing the given date.
 * Used by the scheduler to enumerate days when generating a weekly schedule.
 *
 * @param input - Any date within the target week
 * @returns Array of 7 `UTCDate` instances, one per day Mon–Sun
 *
 * @example
 * getWeekDays('2026-03-18T00:00:00.000Z').map(toISO)
 * // ["2026-03-16T00:00:00.000Z", "2026-03-17T00:00:00.000Z", ...]
 */
export const getWeekDays = (input: DateInput): UTCDate[] =>
  eachDayOfInterval({
    start: getWeekStart(input),
    end: getWeekEnd(input),
  }).map((d) => new UTCDate(d));

// ── Arithmetic ───────────────────────────────────────────────────────────────

/**
 * Adds a number of calendar days to a date, returning a new {@link UTCDate}.
 *
 * @param input - The base date
 * @param amount - Number of days to add (negative to subtract)
 * @returns New `UTCDate` with days added
 *
 * @example
 * addUTCDays('2026-03-18T00:00:00.000Z', 3) // UTCDate for 2026-03-21
 */
export const addUTCDays = (input: DateInput, amount: number): UTCDate =>
  new UTCDate(addDays(toUTC(input), amount));

/**
 * Adds a number of minutes to a date, returning a new {@link UTCDate}.
 *
 * @param input - The base date
 * @param amount - Number of minutes to add (negative to subtract)
 * @returns New `UTCDate` with minutes added
 *
 * @example
 * addUTCMinutes('2026-03-18T09:00:00.000Z', 90) // UTCDate for 10:30
 */
export const addUTCMinutes = (input: DateInput, amount: number): UTCDate =>
  new UTCDate(addMinutes(toUTC(input), amount));

/**
 * Returns the number of whole minutes between two dates.
 * Always returns a positive number when `end` is after `start`.
 *
 * @param end - The later date
 * @param start - The earlier date
 * @returns Difference in whole minutes
 *
 * @example
 * diffMinutes('2026-03-18T17:00:00.000Z', '2026-03-18T09:00:00.000Z') // 480
 */
export const diffMinutes = (end: DateInput, start: DateInput): number =>
  differenceInMinutes(toUTC(end), toUTC(start));

// ── Shift helpers ────────────────────────────────────────────────────────────

/**
 * Builds a {@link ShiftWindow} from a UTC date and UTC time strings.
 *
 * Both `startTime` and `endTime` must be UTC `"HH:mm"` strings — convert from
 * local time first using `localTimeToUTC` in the display layer if needed.
 *
 * @param dateISO - ISO date string for the shift day e.g. `"2026-03-18T00:00:00.000Z"`
 * @param startTime - UTC start time as `"HH:mm"` e.g. `"09:00"`
 * @param endTime - UTC end time as `"HH:mm"` e.g. `"17:00"`
 * @returns A `ShiftWindow` with `start`, `end`, and `durationMinutes`
 *
 * @example
 * buildShiftWindow('2026-03-18T00:00:00.000Z', '09:00', '17:00')
 * // { start: UTCDate(09:00), end: UTCDate(17:00), durationMinutes: 480 }
 */
export const buildShiftWindow = (
  dateISO: ISOString,
  startTime: TimeString,
  endTime: TimeString,
): ShiftWindow => {
  const base = dateISO.slice(0, 10); // "2026-03-18"
  const start = new UTCDate(`${base}T${startTime}:00.000Z`);
  const end = new UTCDate(`${base}T${endTime}:00.000Z`);
  return { start, end, durationMinutes: diffMinutes(end, start) };
};

/**
 * Returns whether two shift windows overlap in time.
 * Used by the constraint engine to detect scheduling conflicts.
 *
 * @param a - First shift window
 * @param b - Second shift window
 * @returns `true` if the shifts overlap, `false` if they are disjoint
 *
 * @example
 * const a = buildShiftWindow('2026-03-18T00:00:00.000Z', '09:00', '17:00')
 * const b = buildShiftWindow('2026-03-18T00:00:00.000Z', '14:00', '22:00')
 * doShiftsOverlap(a, b) // true — 14:00–17:00 overlaps
 */
export const doShiftsOverlap = (a: ShiftWindow, b: ShiftWindow): boolean =>
  isWithinInterval(toUTC(a.start), {
    start: toUTC(b.start),
    end: toUTC(b.end),
  }) ||
  isWithinInterval(toUTC(b.start), {
    start: toUTC(a.start),
    end: toUTC(a.end),
  });

/**
 * Returns whether there is sufficient rest time between two consecutive shifts.
 * Used by the constraint engine to enforce minimum rest rules (default 8 hours).
 *
 * @param endOfFirst - End time of the first shift
 * @param startOfNext - Start time of the next shift
 * @param minHours - Minimum required rest in hours (default: `8`)
 * @returns `true` if rest period meets the minimum, `false` otherwise
 *
 * @example
 * const shiftA = buildShiftWindow('2026-03-18T00:00:00.000Z', '09:00', '17:00')
 * const shiftB = buildShiftWindow('2026-03-18T00:00:00.000Z', '18:00', '23:00')
 * hasMinRest(shiftA.end, shiftB.start)    // false — only 1hr gap
 * hasMinRest(shiftA.end, shiftB.start, 1) // true  — 1hr gap ≥ 1hr minimum
 */
export const hasMinRest = (
  endOfFirst: DateInput,
  startOfNext: DateInput,
  minHours = 8,
): boolean => diffMinutes(startOfNext, endOfFirst) >= minHours * 60;
