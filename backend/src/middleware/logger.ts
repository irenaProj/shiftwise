/**
 * @module middleware/logger
 * @description
 * HTTP request logger middleware with colour-coded output.
 *
 * Logs each completed request with method, path, status code, and duration.
 * Output is colour-coded by HTTP method and status code for fast visual scanning:
 *
 * - Methods: GET (blue), POST (green), DELETE (red), others (yellow)
 * - Status: 2xx (green), 3xx (cyan), 4xx (yellow), 5xx (red)
 *
 * The logger attaches to the `res.on('finish')` event so duration includes
 * the full round-trip including response serialisation.
 *
 * @example
 * // Output:
 * // POST /api/auth/login 200 43ms
 * // GET  /api/workspaces/abc123/employees 200 12ms
 * // POST /api/auth/refresh 401 3ms
 */

import { Request, Response, NextFunction } from "express";

/**
 * Express middleware that logs each completed HTTP request.
 *
 * Attach early in the middleware chain (after `cookieParser`) so all requests
 * are logged regardless of whether they hit a route or return an error.
 *
 * @param req - Incoming Express request
 * @param res - Express response
 * @param next - Next middleware function
 *
 * @example
 * // In index.ts:
 * app.use(cookieParser())
 * app.use(requestLogger)
 * app.use('/api/auth', authRoutes)
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    const statusColor =
      status >= 500 ? "31" : status >= 400 ? "33" : status >= 300 ? "36" : "32";
    const methodColor =
      method === "GET"
        ? "34"
        : method === "POST"
          ? "32"
          : method === "DELETE"
            ? "31"
            : "33";

    console.log(
      `\x1b[${methodColor}m${method}\x1b[0m ${originalUrl} \x1b[${statusColor}m${status}\x1b[0m \x1b[2m${duration}ms\x1b[0m`,
    );
  });

  next();
}
