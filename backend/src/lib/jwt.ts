/**
 * @module jwt
 * @description
 * JWT token signing and verification utilities.
 *
 * Two separate secrets are used — one for access tokens and one for refresh tokens.
 * This means a compromised refresh secret cannot be used to forge access tokens,
 * and vice versa.
 *
 * Access tokens are short-lived (15 minutes) and sent in the `Authorization` header.
 * Refresh tokens are long-lived (7 days) and stored as httpOnly cookies.
 *
 * @see {@link https://jwt.io} JWT specification
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-in-prod";
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-prod";

/**
 * The payload encoded inside every JWT issued by ShiftWise.
 * Contains only the minimum identity data needed to authenticate requests.
 */
export interface AccessTokenPayload {
  /** The user's database ID (cuid) */
  userId: string;
  /** The user's email address */
  email: string;
}

/**
 * Signs a short-lived access token (15 minutes).
 *
 * The resulting token is returned in the login/register response body and
 * attached to every API request as `Authorization: Bearer <token>`.
 * It is never persisted — it lives in memory (Zustand store) only.
 *
 * @param payload - The user identity to encode
 * @returns Signed JWT string valid for 15 minutes
 *
 * @example
 * const token = signAccessToken({ userId: user.id, email: user.email })
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

/**
 * Verifies an access token and returns its decoded payload.
 *
 * Throws a `JsonWebTokenError` or `TokenExpiredError` if the token is
 * invalid or expired — the `requireAuth` middleware catches these and
 * returns a `401` response.
 *
 * @param token - The raw JWT string from the `Authorization` header
 * @returns Decoded `AccessTokenPayload`
 * @throws `JsonWebTokenError` if the token is malformed or has an invalid signature
 * @throws `TokenExpiredError` if the token has expired
 *
 * @example
 * const payload = verifyAccessToken(token)
 * console.log(payload.userId) // "cmmyfipza0000g8iq..."
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Signs a long-lived refresh token (7 days).
 *
 * The resulting token is stored as a database record and set as an
 * `httpOnly`, `Secure`, `SameSite=Strict` cookie — inaccessible to JavaScript
 * and automatically sent by the browser on requests to `/api/auth/refresh`.
 *
 * Refresh tokens are rotated on every use — the old token is deleted and a
 * new one issued, limiting the window of exposure if a token is stolen.
 *
 * @param payload - The user identity to encode
 * @returns Signed JWT string valid for 7 days
 *
 * @example
 * const refreshToken = signRefreshToken({ userId: user.id, email: user.email })
 */
export function signRefreshToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}

/**
 * Verifies a refresh token and returns its decoded payload.
 *
 * Called in the `/api/auth/refresh` route after checking the token exists
 * in the database and has not expired.
 *
 * @param token - The raw JWT string from the `refreshToken` cookie
 * @returns Decoded `AccessTokenPayload`
 * @throws `JsonWebTokenError` if the token is malformed or has an invalid signature
 * @throws `TokenExpiredError` if the token has expired
 *
 * @example
 * const payload = verifyRefreshToken(cookieToken)
 */
export function verifyRefreshToken(token: string): AccessTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as AccessTokenPayload;
}

/**
 * Generates a cryptographically random opaque token (80 hex characters).
 *
 * Available as an alternative to JWT refresh tokens — an opaque token has no
 * decodable payload and must be looked up in the database on every use.
 * Currently unused but available for future use cases such as email verification
 * or password reset links.
 *
 * @returns 80-character random hex string
 *
 * @example
 * const resetToken = generateOpaqueToken()
 * // "a3f8c2e1d9b4..."  (80 chars)
 */
export function generateOpaqueToken(): string {
  return crypto.randomBytes(40).toString("hex");
}
