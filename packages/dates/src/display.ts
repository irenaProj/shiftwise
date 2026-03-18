// ⚠️  PRESENTATIONAL LAYER ONLY
// This file must never be imported by the backend.
// All functions accept UTC input and output localised strings.

import { UTCDate } from "@date-fns/utc";
import { tz } from "@date-fns/tz";
import { format } from "date-fns";
import type { DateInput, ISOString, TimeString, Timezone } from "./types.ts";

// ── Core formatter ───────────────────────────────────────────────────────────

export const formatInTZ = (
  input: DateInput,
  fmt: string,
  timezone: Timezone,
): string => format(new UTCDate(input), fmt, { in: tz(timezone) });

// ── Convenience formatters ───────────────────────────────────────────────────

// "Tue 18 Mar"
export const formatShiftDate = (utc: DateInput, timezone: Timezone): string =>
  formatInTZ(utc, "EEE dd MMM", timezone);

// "9:00 AM"
export const formatShiftTime = (utc: DateInput, timezone: Timezone): string =>
  formatInTZ(utc, "h:mm a", timezone);

// "Tue 18 Mar, 9:00 AM"
export const formatShiftDateTime = (
  utc: DateInput,
  timezone: Timezone,
): string => formatInTZ(utc, "EEE dd MMM, h:mm a", timezone);

// "2026-03-18"
export const formatDateISO = (utc: DateInput, timezone: Timezone): string =>
  formatInTZ(utc, "yyyy-MM-dd", timezone);

// "March 2026"
export const formatMonthYear = (utc: DateInput, timezone: Timezone): string =>
  formatInTZ(utc, "MMMM yyyy", timezone);

// ── TZ abbreviation ──────────────────────────────────────────────────────────
// format() with { in } does not yet support the zzz token reliably in v4
// so we fall back to Intl for the abbreviation only

export const formatTZAbbr = (utc: DateInput, timezone: Timezone): string =>
  new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    timeZoneName: "short",
  })
    .formatToParts(new UTCDate(utc))
    .find((p) => p.type === "timeZoneName")?.value ?? timezone;

// ── Input → UTC conversion ───────────────────────────────────────────────────
// Use when a manager picks a time in the UI and we need to store it as UTC.
// e.g. manager picks "09:00" in Sydney → "2026-03-17T22:00:00.000Z"

export const localTimeToUTC = (
  dateISO: ISOString, // "2026-03-18"
  time: TimeString, // "09:00"
  timezone: Timezone, // "Australia/Sydney"
): ISOString => {
  // Build a UTC date that represents the given local time
  const localStr = `${dateISO}T${time}:00`;
  const tzDate = tz(timezone);
  // Use format to get the UTC equivalent via the tz context
  const formatted = format(
    new UTCDate(localStr),
    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
    {
      in: tzDate,
    },
  );
  return new UTCDate(formatted).toISOString();
};
