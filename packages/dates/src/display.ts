/**
 * @module display
 * @description
 * **Presentational layer only — never import this module on the backend.**
 *
 * All functions accept UTC date input and return localised strings or UTC-converted
 * values for storage. Timezone conversion uses the date-fns v4 `{ in: tz() }` option
 * rather than the deprecated `toZonedTime` / `fromZonedTime` helpers.
 *
 * @see {@link https://date-fns.org/v4/docs/format} date-fns v4 format with `in`
 * @see {@link https://github.com/date-fns/tz} @date-fns/tz
 */

// ⚠️  PRESENTATIONAL LAYER ONLY
// This file must never be imported by the backend.
// All functions accept UTC input and output localised strings.

import { UTCDate } from "@date-fns/utc";
import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import type { DateInput, ISOString, TimeString, Timezone } from "./types.ts";

// ── Core formatter ───────────────────────────────────────────────────────────

/**
 * Formats a UTC date into a localised string using the given IANA timezone.
 * This is the core primitive used by all convenience formatters in this module.
 *
 * Uses the date-fns v4 `{ in: tz() }` option — not the deprecated `toZonedTime`.
 *
 * @param input - UTC date input (ISO string, Date, or timestamp)
 * @param fmt - date-fns format string e.g. `"EEE dd MMM, h:mm a"`
 * @param timezone - IANA timezone identifier e.g. `"Australia/Sydney"`
 * @returns Formatted string in the given timezone
 *
 * @example
 * formatInTZ('2026-03-17T22:00:00.000Z', 'h:mm a', 'Australia/Sydney') // "9:00 AM"
 */
export const formatInTZ = (
  input: DateInput,
  fmt: string,
  timezone: Timezone,
): string => format(new UTCDate(input), fmt, { in: tz(timezone) });

// ── Convenience formatters ───────────────────────────────────────────────────

/**
 * Formats a UTC date as a short day-date-month string in the given timezone.
 *
 * @param utc - UTC date input
 * @param timezone - IANA timezone identifier
 * @returns e.g. `"Tue 18 Mar"`
 *
 * @example
 * formatShiftDate('2026-03-17T22:00:00.000Z', 'Australia/Sydney') // "Tue 18 Mar"
 */
export const formatShiftDate = (utc: DateInput, timezone: Timezone): string =>
  formatInTZ(utc, "EEE dd MMM", timezone);

/**
 * Formats a UTC date as a 12-hour time string in the given timezone.
 *
 * @param utc - UTC date input
 * @param timezone - IANA timezone identifier
 * @returns e.g. `"9:00 AM"`
 *
 * @example
 * formatShiftTime('2026-03-17T22:00:00.000Z', 'Australia/Sydney') // "9:00 AM"
 */
export const formatShiftTime = (utc: DateInput, timezone: Timezone): string =>
  formatInTZ(utc, "h:mm a", timezone);

/**
 * Formats a UTC date as a combined day-date-month and 12-hour time string.
 *
 * @param utc - UTC date input
 * @param timezone - IANA timezone identifier
 * @returns e.g. `"Tue 18 Mar, 9:00 AM"`
 *
 * @example
 * formatShiftDateTime('2026-03-17T22:00:00.000Z', 'Australia/Sydney') // "Tue 18 Mar, 9:00 AM"
 */
export const formatShiftDateTime = (
  utc: DateInput,
  timezone: Timezone,
): string => formatInTZ(utc, "EEE dd MMM, h:mm a", timezone);

/**
 * Formats a UTC date as an ISO date string (`yyyy-MM-dd`) in the given timezone.
 * Useful for grouping shifts by local calendar date.
 *
 * @param utc - UTC date input
 * @param timezone - IANA timezone identifier
 * @returns e.g. `"2026-03-18"`
 *
 * @example
 * formatDateISO('2026-03-17T22:00:00.000Z', 'Australia/Sydney') // "2026-03-18"
 */
export const formatDateISO = (utc: DateInput, timezone: Timezone): string =>
  formatInTZ(utc, "yyyy-MM-dd", timezone);

/**
 * Formats a UTC date as a full month and year string in the given timezone.
 * Useful for calendar headers.
 *
 * @param utc - UTC date input
 * @param timezone - IANA timezone identifier
 * @returns e.g. `"March 2026"`
 *
 * @example
 * formatMonthYear('2026-03-17T22:00:00.000Z', 'Australia/Sydney') // "March 2026"
 */
export const formatMonthYear = (utc: DateInput, timezone: Timezone): string =>
  formatInTZ(utc, "MMMM yyyy", timezone);

// ── TZ abbreviation ──────────────────────────────────────────────────────────

/**
 * Returns the timezone abbreviation for a given UTC date and IANA timezone.
 *
 * Falls back to `Intl.DateTimeFormat` because the `zzz` token in date-fns v4
 * `format` with `{ in }` does not yet reliably produce abbreviations.
 *
 * @param utc - UTC date input
 * @param timezone - IANA timezone identifier
 * @returns Timezone abbreviation e.g. `"AEDT"`, `"NZST"`, `"UTC"`
 *
 * @example
 * formatTZAbbr('2026-03-17T22:00:00.000Z', 'Australia/Sydney') // "AEDT"
 */
export const formatTZAbbr = (utc: DateInput, timezone: Timezone): string =>
  new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    timeZoneName: "short",
  })
    .formatToParts(new UTCDate(utc))
    .find((p) => p.type === "timeZoneName")?.value ?? timezone;

// ── Input → UTC conversion ───────────────────────────────────────────────────

/**
 * Converts a local date + time string to a UTC ISO string for API storage.
 *
 * Use this when a manager enters a time in the UI (in their local timezone)
 * and you need to store it as UTC in the database.
 *
 * @param dateISO - Local calendar date as `"yyyy-MM-dd"` e.g. `"2026-03-18"`
 * @param time - Local time as `"HH:mm"` e.g. `"09:00"`
 * @param timezone - The user's IANA timezone e.g. `"Australia/Sydney"`
 * @returns UTC ISO string e.g. `"2026-03-17T22:00:00.000Z"`
 *
 * @example
 * localTimeToUTC('2026-03-18', '09:00', 'Australia/Sydney')
 * // "2026-03-17T22:00:00.000Z"  (Sydney is UTC+11 in March)
 */
export const localTimeToUTC = (
  dateISO: ISOString,
  time: TimeString,
  timezone: Timezone,
): ISOString => {
  const localStr = `${dateISO}T${time}:00`;
  const tzDate = tz(timezone);
  const formatted = format(
    new UTCDate(localStr),
    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    { in: tzDate },
  );
  return new UTCDate(formatted).toISOString();
};
