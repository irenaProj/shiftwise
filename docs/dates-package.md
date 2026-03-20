# @shiftwise/dates

A shared date utility package used by both the backend and frontend. It wraps
`date-fns` v4, `@date-fns/utc`, and `@date-fns/tz` behind an Adapter + Facade
pattern so the underlying library is never imported directly outside this package.

---

## Design principles

- **UTC everywhere except the display layer.** All dates are stored, exchanged,
  and calculated as UTC ISO strings (`"2026-03-18T09:00:00.000Z"`). Timezone
  conversion happens only at the point of display in the UI.
- **`UTCDate` instead of `new Date()`.** All internal operations use `UTCDate`
  from `@date-fns/utc` to prevent local timezone bleed during calculations.
- **`format` with `{ in: tz() }`.** Display formatting uses the date-fns v4
  `{ in }` option rather than deprecated helpers like `toZonedTime`.
- **Swappable internals.** `utc.ts` and `display.ts` are the only files that
  know about the underlying libraries. Swapping `date-fns` for another library
  means editing one file — nothing else changes.

---

## Package structure

```
packages/dates/src/
├── types.ts      # Shared types: DateInput, ISOString, ShiftWindow, Timezone
├── utc.ts        # UTC operations — safe on backend and frontend
├── display.ts    # Localisation — frontend presentational layer only
└── index.ts      # Public facade — the only import consumers use
```

### What lives where

| Module       | Imports                             | Used by   |
| ------------ | ----------------------------------- | --------- |
| `utc.ts`     | `@date-fns/utc`, `date-fns`         | BE + FE   |
| `display.ts` | `@date-fns/tz`, `date-fns` `{ in }` | FE only   |
| `index.ts`   | re-exports both                     | BE + FE   |

---

## Usage

### Backend — scheduler and routes

```typescript
import { buildShiftWindow, doShiftsOverlap, hasMinRest, getWeekDays, toISO } from '@shiftwise/dates'

// Build shift windows from UTC date + time strings
const shiftA = buildShiftWindow('2026-03-18T00:00:00.000Z', '09:00', '17:00')
const shiftB = buildShiftWindow('2026-03-18T00:00:00.000Z', '14:00', '22:00')

doShiftsOverlap(shiftA, shiftB)              // true — 14:00-17:00 overlap
hasMinRest(shiftA.end, shiftB.start)         // false — only 5hr gap, need 8
hasMinRest(shiftA.end, shiftB.start, 4)      // true — 5hr gap > 4hr minimum

// Get all 7 days in a week (Monday-first)
getWeekDays('2026-03-18T00:00:00.000Z').map(toISO)
// ["2026-03-16T00:00:00.000Z", "2026-03-17T00:00:00.000Z", ...]
```

### Frontend — calendar display

```typescript
import { formatShiftTime, formatShiftDate, formatShiftDateTime, localTimeToUTC } from '@shiftwise/dates'

// Display UTC dates in the user's timezone
formatShiftTime('2026-03-17T22:00:00.000Z', 'Australia/Sydney')     // "9:00 AM"
formatShiftDate('2026-03-17T22:00:00.000Z', 'Australia/Sydney')     // "Tue 18 Mar"
formatShiftDateTime('2026-03-17T22:00:00.000Z', 'Australia/Sydney') // "Tue 18 Mar, 9:00 AM"

// Convert manager's UI input to UTC before sending to API
localTimeToUTC('2026-03-18', '09:00', 'Australia/Sydney')
// → "2026-03-17T22:00:00.000Z"
```

---

## Timezone model

Each user and workspace stores an IANA timezone string. User timezone takes
priority over workspace timezone — this handles cases where a manager in one
city is scheduling staff in another.

```
users.timezone      "Australia/Sydney"   (user-level override)
workspaces.timezone "Pacific/Auckland"   (workspace default)
```

The resolution logic (to be implemented in the scheduler):

```typescript
const displayTZ = user.timezone !== 'UTC' ? user.timezone : workspace.timezone
```

---

## End-to-end data flow

```
Manager picks "9:00 AM" on 18 Mar in the UI (Sydney)
  → localTimeToUTC('2026-03-18', '09:00', 'Australia/Sydney')
  → "2026-03-17T22:00:00.000Z"   ← sent to API, stored in DB

Scheduler checks constraints
  → buildShiftWindow("2026-03-17T22:00:00.000Z", ...)
  → utcAdapter.diffMinutes(...)   ← pure UTC arithmetic, no timezone

Auckland employee views their schedule
  → formatShiftTime("2026-03-17T22:00:00.000Z", "Pacific/Auckland")
  → "11:00 AM NZDT"
```

---

## Smoke test

Run this from the repo root to verify the package is working:

```bash
node --input-type=module << 'EOF'
import { toUTC, nowUTC, toISO, getWeekDays, buildShiftWindow, doShiftsOverlap, hasMinRest } from '/workspaces/shiftwise/packages/dates/src/index.ts'

const now = nowUTC()
console.log('nowUTC:       ', toISO(now))
console.log('weekDays:     ', getWeekDays(now).map(toISO))

const shiftA = buildShiftWindow('2026-03-18T00:00:00.000Z', '09:00', '17:00')
const shiftB = buildShiftWindow('2026-03-18T00:00:00.000Z', '14:00', '22:00')
const shiftC = buildShiftWindow('2026-03-18T00:00:00.000Z', '18:00', '23:00')

console.log('A overlaps B: ', doShiftsOverlap(shiftA, shiftB)) // true
console.log('A overlaps C: ', doShiftsOverlap(shiftA, shiftC)) // false
console.log('A→C 8hr rest: ', hasMinRest(shiftA.end, shiftC.start))    // false
console.log('A→C 1hr rest: ', hasMinRest(shiftA.end, shiftC.start, 1)) // true
EOF
```

---

## Updating the package

Since the package points directly at `.ts` source files (no build step),
changes are picked up automatically:

| Change | What to do |
|--------|-----------|
| Edit a `.ts` file | Just save — hot-reloads in `tsx watch` and Vite |
| Add a new export | Just save — available immediately |
| Add a dependency | `npm install` from the monorepo root |
| Typecheck all packages | `npm run typecheck` from the monorepo root |

---

## Highlights

This is an application of two patterns working together — the
**Adapter** hides the third-party library, and the **Facade** exposes a
domain-specific API tailored to shift scheduling. If `date-fns` ships a
breaking change or we need timezone-aware dates via Luxon, we swap one file
and the rest of the codebase is untouched. The `UTCDate` constraint means
timezone bleed is structurally impossible in the calculation layer — it can
only happen intentionally in `display.ts`.
