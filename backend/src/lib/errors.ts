export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Convenience factories
export const BadRequest = (msg = "Bad request") =>
  new AppError(400, msg, "BAD_REQUEST");
export const Unauthorized = (msg = "Unauthorized") =>
  new AppError(401, msg, "UNAUTHORIZED");
export const Forbidden = (msg = "Forbidden") =>
  new AppError(403, msg, "FORBIDDEN");
export const NotFound = (msg = "Not found") =>
  new AppError(404, msg, "NOT_FOUND");
export const Conflict = (msg = "Conflict") =>
  new AppError(409, msg, "CONFLICT");
export const Internal = (msg = "Internal server error") =>
  new AppError(500, msg, "INTERNAL_ERROR");
