// Simple password generation and hashing utilities

/**
 * Generate a random 8-character alphanumeric password
 */
export function generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * Simple hash function for passwords (using Web Crypto API)
 * In production, use bcrypt on the server side
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'spiritual_guide_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}

/**
 * Student session type
 */
export interface StudentSession {
    id: string;
    name: string;
    phone: string;
    trial_ends_at: string | null;
}

const STUDENT_SESSION_KEY = 'student_session';
const SESSION_TOKEN_KEY = 'session_token';

/**
 * Get student session from localStorage
 */
export function getStudentSession(): StudentSession | null {
    if (typeof window === 'undefined') return null;
    const session = localStorage.getItem(STUDENT_SESSION_KEY);
    if (!session) return null;
    try {
        return JSON.parse(session);
    } catch {
        return null;
    }
}

/**
 * Set student session in localStorage
 */
export function setStudentSession(session: StudentSession): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
}

/**
 * Get session token (JWT) from localStorage
 */
export function getSessionToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(SESSION_TOKEN_KEY);
}

/**
 * Set session token (JWT) in localStorage
 */
export function setSessionToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_TOKEN_KEY, token);
}

/**
 * Clear student session and token
 */
export function clearStudentSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STUDENT_SESSION_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
}

