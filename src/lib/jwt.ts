/**
 * JWT utilities for secure session management
 * Uses jose library for JWT operations
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

// Secret key for signing JWTs - must be at least 32 characters
// In production, this should be a strong random key from environment
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'numerosense_jwt_secret_key_2024_change_in_prod'
);

// Token expires in 7 days
const TOKEN_EXPIRY = '7d';

export interface SessionPayload extends JWTPayload {
    studentId: string;
    phone: string;
    name: string;
}

/**
 * Sign a new session token
 */
export async function signSessionToken(payload: {
    studentId: string;
    phone: string;
    name: string;
}): Promise<string> {
    const token = await new SignJWT({
        studentId: payload.studentId,
        phone: payload.phone,
        name: payload.name,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(TOKEN_EXPIRY)
        .setSubject(payload.studentId)
        .sign(JWT_SECRET);

    return token;
}

/**
 * Verify and decode a session token
 * Returns null if token is invalid or expired
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);

        // Validate required fields
        if (!payload.studentId || !payload.sub) {
            return null;
        }

        return payload as SessionPayload;
    } catch (error) {
        // Token is invalid or expired
        return null;
    }
}

/**
 * Extract token from Authorization header
 * Expects format: "Bearer <token>"
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader) return null;

    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return null;
}
