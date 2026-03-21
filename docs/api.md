# API Reference

Base URL: `https://shiftwise-0sin.onrender.com`  
Local: `http://localhost:3001`

---

## Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <accessToken>
```

Access tokens are short-lived (15 minutes). Use the refresh endpoint to get a
new one without re-entering credentials. See [Architecture](architecture.md)
for the full auth flow.

---

## Endpoints

### Auth

#### POST `/api/auth/register`

Register a new user and optionally create a workspace.

**Body:**
```json
{
  "email": "will.power@demo.com",
  "password": "password123",
  "name": "Will Power",
  "workspaceName": "Demo Cafe"
}
```

**Response `201`:**
```json
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "email": "will.power@demo.com", "name": "Will Power" }
}
```

---

#### POST `/api/auth/login`

Authenticate and receive tokens.

**Body:**
```json
{
  "email": "will.power@demo.com",
  "password": "password123"
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "email": "will.power@demo.com", "name": "Will Power" },
  "workspace": { "id": "...", "name": "Demo Cafe", "role": "MANAGER" }
}
```

A `refreshToken` httpOnly cookie is also set automatically.

---

#### POST `/api/auth/refresh`

Exchange a refresh token cookie for a new access token. The refresh token is
rotated on each use.

**Requires:** `refreshToken` httpOnly cookie (sent automatically by browser)

**Response `200`:**
```json
{
  "accessToken": "eyJ..."
}
```

---

#### POST `/api/auth/logout`

Invalidate the refresh token and clear the cookie.

**Response `200`:**
```json
{ "ok": true }
```

---

### Workspaces

#### GET `/api/workspaces/:workspaceId/employees`

List all members of a workspace.

**Auth:** Any workspace member  
**Response `200`:**
```json
[
  {
    "id": "...",
    "name": "Will Power",
    "email": "will.power@demo.com",
    "timezone": "Australia/Sydney",
    "role": "MANAGER",
    "joinedAt": "2026-01-01T00:00:00.000Z"
  }
]
```

---

#### POST `/api/workspaces/:workspaceId/employees`

Add a new team member to the workspace. Creates a new user account if the
email doesn't exist yet. New users inherit the workspace timezone.

**Auth:** OWNER or MANAGER only

**Body:**
```json
{
  "email": "lou.poles@demo.com",
  "name": "Lou Poles",
  "role": "EMPLOYEE",
  "password": "changeme123"
}
```

**Response `201`:**
```json
{
  "id": "...",
  "name": "Lou Poles",
  "email": "lou.poles@demo.com",
  "timezone": "Australia/Sydney",
  "role": "EMPLOYEE",
  "joinedAt": "2026-03-18T00:00:00.000Z"
}
```

---

#### DELETE `/api/workspaces/:workspaceId/employees/:userId`

Remove a member from the workspace. Cannot remove yourself.

**Auth:** OWNER or MANAGER only  
**Response `204`:** No content

---

## Error responses

All errors follow a consistent format:

```json
{
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

In development, `500` errors also include a `stack` field.

| Code | Status | Description |
|------|--------|-------------|
| `BAD_REQUEST` | 400 | Invalid input or validation failure |
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired token |
| `FORBIDDEN` | 403 | Authenticated but insufficient role |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

### Skills

#### GET `/api/workspaces/:workspaceId/skills`

List all skills defined in a workspace, ordered alphabetically.

**Auth:** Any workspace member
**Response `200`:**
```json
[{ "id": "...", "name": "Barista" }]
```

---

#### POST `/api/workspaces/:workspaceId/skills`

Create a new skill. Names must be unique within the workspace.

**Auth:** OWNER or MANAGER
**Body:** `{ "name": "Barista" }`
**Response `201`:** `{ "id": "...", "name": "Barista" }`

---

#### DELETE `/api/workspaces/:workspaceId/skills/:skillId`

Delete a skill and remove it from all employees.

**Auth:** OWNER or MANAGER
**Response `204`:** No content

---

### Employee skills

#### GET `/api/workspaces/:workspaceId/employees/:userId/skills`

List skills assigned to a specific employee.

**Auth:** Any workspace member
**Response `200`:** `[{ "id": "...", "name": "Barista" }]`

---

#### POST `/api/workspaces/:workspaceId/employees/:userId/skills`

Assign a workspace skill to an employee.

**Auth:** OWNER or MANAGER
**Body:** `{ "skillId": "..." }`
**Response `201`:** `{ "id": "...", "name": "Barista" }`

---

#### DELETE `/api/workspaces/:workspaceId/employees/:userId/skills/:skillId`

Remove a skill from an employee.

**Auth:** OWNER or MANAGER
**Response `204`:** No content

---

### Shift templates

#### GET `/api/workspaces/:workspaceId/shift-templates`

List all shift templates, ordered by start time.

**Auth:** Any workspace member
**Response `200`:**
```json
[{ "id": "...", "name": "Morning", "startTime": "06:00", "endTime": "14:00" }]
```

---

#### POST `/api/workspaces/:workspaceId/shift-templates`

Create a shift template. Times must be in `HH:mm` format.

**Auth:** OWNER or MANAGER
**Body:** `{ "name": "Morning", "startTime": "06:00", "endTime": "14:00" }`
**Response `201`:** `{ "id": "...", "name": "Morning", "startTime": "06:00", "endTime": "14:00" }`

---

#### DELETE `/api/workspaces/:workspaceId/shift-templates/:templateId`

Delete a shift template.

**Auth:** OWNER or MANAGER
**Response `204`:** No content

---

### Forecast

#### GET `/api/workspaces/:workspaceId/forecast`

List all forecast slots, ordered by day then time.

**Auth:** Any workspace member
**Response `200`:**
```json
[{ "id": "...", "dayOfWeek": 1, "time": "09:00", "required": 3 }]
```

`dayOfWeek`: 0 = Sunday … 6 = Saturday. `time` is the start of a 30-minute window.

---

#### PUT `/api/workspaces/:workspaceId/forecast`

Create or update the demand for a given day + time slot. Identified by the unique `(workspaceId, dayOfWeek, time)` key — sending the same day + time updates `required`.

**Auth:** OWNER or MANAGER
**Body:** `{ "dayOfWeek": 1, "time": "09:00", "required": 3 }`
**Response `200`:** `{ "id": "...", "dayOfWeek": 1, "time": "09:00", "required": 3 }`

---

#### DELETE `/api/workspaces/:workspaceId/forecast/:slotId`

Delete a forecast slot.

**Auth:** OWNER or MANAGER
**Response `204`:** No content

---

### Availability

#### GET `/api/workspaces/:workspaceId/employees/:userId/availability`

List availability windows for an employee, ordered by day then start time.

**Auth:** Any workspace member
**Response `200`:**
```json
[{ "id": "...", "dayOfWeek": 1, "startTime": "07:00", "endTime": "15:00" }]
```

---

#### PUT `/api/workspaces/:workspaceId/employees/:userId/availability`

Create or update an availability window. Identified by `(membershipId, dayOfWeek, startTime)` — sending the same day + start time updates `endTime`.

**Auth:** OWNER or MANAGER
**Body:** `{ "dayOfWeek": 1, "startTime": "07:00", "endTime": "15:00" }`
**Response `200`:** `{ "id": "...", "dayOfWeek": 1, "startTime": "07:00", "endTime": "15:00" }`

---

#### DELETE `/api/workspaces/:workspaceId/employees/:userId/availability/:availabilityId`

Delete an availability window.

**Auth:** OWNER or MANAGER
**Response `204`:** No content

---

## Health check

#### GET `/api/health`

```json
{ "status": "ok", "timestamp": "2026-03-18T09:00:00.000Z" }
```
