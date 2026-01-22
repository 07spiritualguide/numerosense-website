/**
 * CORS utility for API routes
 * 
 * Allows:
 * - numerosense.in and www.numerosense.in (production)
 * - localhost:3000 (development)
 * - Requests with no Origin header (mobile apps, same-origin)
 */

const ALLOWED_ORIGINS = [
    'https://numerosense.in',
    'https://www.numerosense.in',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
];

export function getCorsHeaders(request: Request): Record<string, string> {
    const origin = request.headers.get('origin');

    // If no origin (mobile apps, same-origin requests), allow
    // If origin is in allowed list, return that origin
    // Otherwise, return the first allowed origin (browsers will block anyway)
    let allowedOrigin = ALLOWED_ORIGINS[0];

    if (!origin) {
        // No origin header - likely mobile app or same-origin
        // Return wildcard for these cases
        allowedOrigin = '*';
    } else if (ALLOWED_ORIGINS.includes(origin)) {
        allowedOrigin = origin;
    }

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
    };
}
