/**
 * @module responses
 * @description
 * Convenience helpers for sending consistent HTTP success responses.
 *
 * These complement the `errors` module — together they replace all direct
 * `res.status().json()` calls in route handlers with named, intention-revealing
 * functions.
 *
 * @example
 * // Instead of:
 * res.status(201).json({ id: user.id })
 *
 * // Use:
 * Created(res, { id: user.id })
 */

import { Response } from "express";

/**
 * Sends a `200 OK` response with a JSON body.
 * Use for successful GET requests and non-creating POST/PUT operations.
 *
 * @param res - Express response object
 * @param data - Any JSON-serialisable value to send as the response body
 *
 * @example
 * Ok(res, { accessToken, user, workspace })
 * Ok(res, employees.map(formatEmployee))
 */
export const Ok = (res: Response, data: unknown) => res.status(200).json(data);

/**
 * Sends a `201 Created` response with a JSON body.
 * Use when a new resource has been successfully created.
 *
 * @param res - Express response object
 * @param data - The newly created resource or a confirmation payload
 *
 * @example
 * Created(res, { id: user.id, email: user.email, role: membership.role })
 */
export const Created = (res: Response, data: unknown) =>
  res.status(201).json(data);

/**
 * Sends a `204 No Content` response with no body.
 * Use for successful DELETE operations or updates where no data needs returning.
 *
 * @param res - Express response object
 *
 * @example
 * await prisma.membership.delete({ where: { ... } })
 * NoContent(res)
 */
export const NoContent = (res: Response) => res.status(204).send();
