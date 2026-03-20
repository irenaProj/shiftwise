/**
 * @module errors
 * @description
 * Centralised HTTP error handling for the ShiftWise API.
 *
 * All route handlers throw `AppError` instances (or use the convenience
 * factory functions) instead of calling `res.status().json()` directly.
 * The global error handler in `index.ts` catches everything and returns
 * a consistent `{ error, code }` JSON response.
 *
 * @example
 * // In a route handler:
 * if (!user) throw Unauthorized('Invalid credentials')
 * if (exists) throw Conflict('Email already in use')
 */

/**
 * Base HTTP error class for all application errors.
 *
 * Extends the native `Error` class with an HTTP `statusCode` and a
 * machine-readable `code` string. The global error handler checks
 * `instanceof AppError` to distinguish known errors from unexpected ones.
 *
 * @example
 * throw new AppError(422, 'Validation failed', 'VALIDATION_ERROR')
 */
export class AppError extends Error {
  constructor(
    /** HTTP status code e.g. `400`, `401`, `403` */
    public statusCode: number,
    /** Human-readable error message returned to the client */
    message: string,
    /** Machine-readable error code e.g. `"UNAUTHORIZED"` */
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Creates a `400 Bad Request` error.
 * Use for invalid input, failed Zod validation, or malformed requests.
 *
 * @param msg - Error message (default: `"Bad request"`)
 * @returns `AppError` with status `400` and code `BAD_REQUEST`
 *
 * @example
 * if (!parsed.success) return next(BadRequest('Invalid email format'))
 */
export const BadRequest = (msg = "Bad request") =>
  new AppError(400, msg, "BAD_REQUEST");

/**
 * Creates a `401 Unauthorized` error.
 * Use when authentication is missing, invalid, or expired.
 *
 * @param msg - Error message (default: `"Unauthorized"`)
 * @returns `AppError` with status `401` and code `UNAUTHORIZED`
 *
 * @example
 * if (!token) return next(Unauthorized('Missing or invalid Authorization header'))
 */
export const Unauthorized = (msg = "Unauthorized") =>
  new AppError(401, msg, "UNAUTHORIZED");

/**
 * Creates a `403 Forbidden` error.
 * Use when the user is authenticated but lacks the required role or permission.
 *
 * @param msg - Error message (default: `"Forbidden"`)
 * @returns `AppError` with status `403` and code `FORBIDDEN`
 *
 * @example
 * if (membership.role === 'EMPLOYEE') return next(Forbidden('Managers only'))
 */
export const Forbidden = (msg = "Forbidden") =>
  new AppError(403, msg, "FORBIDDEN");

/**
 * Creates a `404 Not Found` error.
 * Use when a requested resource does not exist.
 *
 * @param msg - Error message (default: `"Not found"`)
 * @returns `AppError` with status `404` and code `NOT_FOUND`
 *
 * @example
 * if (!schedule) return next(NotFound('Schedule not found'))
 */
export const NotFound = (msg = "Not found") =>
  new AppError(404, msg, "NOT_FOUND");

/**
 * Creates a `409 Conflict` error.
 * Use when a resource already exists or a unique constraint would be violated.
 *
 * @param msg - Error message (default: `"Conflict"`)
 * @returns `AppError` with status `409` and code `CONFLICT`
 *
 * @example
 * if (existing) return next(Conflict('Email already in use'))
 */
export const Conflict = (msg = "Conflict") =>
  new AppError(409, msg, "CONFLICT");

/**
 * Creates a `500 Internal Server Error`.
 * Use for unexpected errors that shouldn't normally occur.
 * Prefer throwing the error directly and letting the global handler catch it.
 *
 * @param msg - Error message (default: `"Internal server error"`)
 * @returns `AppError` with status `500` and code `INTERNAL_ERROR`
 */
export const Internal = (msg = "Internal server error") =>
  new AppError(500, msg, "INTERNAL_ERROR");
