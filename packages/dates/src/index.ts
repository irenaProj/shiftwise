// ── Types ────────────────────────────────────────────────────────────────────
export type {
  DateInput,
  ISOString,
  TimeString,
  Timezone,
  ShiftWindow,
} from "./types.ts";

// ── UTC operations ───────────────────────────────────────────────────────────
// Safe to import on both backend and frontend
export {
  toUTC,
  nowUTC,
  toISO,
  parseUTC,
  isValidDate,
  getWeekStart,
  getWeekEnd,
  getWeekDays,
  addUTCDays,
  addUTCMinutes,
  diffMinutes,
  buildShiftWindow,
  doShiftsOverlap,
  hasMinRest,
} from "./utc.ts";

// ── Display operations ───────────────────────────────────────────────────────
// ⚠️  Import only in frontend presentational components — never on the backend
export {
  formatInTZ,
  formatShiftDate,
  formatShiftTime,
  formatShiftDateTime,
  formatDateISO,
  formatMonthYear,
  formatTZAbbr,
  localTimeToUTC,
} from "./display.ts";
