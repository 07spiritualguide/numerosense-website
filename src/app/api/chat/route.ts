import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from '@/lib/cors';
import { verifySessionToken, extractTokenFromHeader } from '@/lib/jwt';

/**
 * Validate session token and check student is active
 */
async function validateSession(request: NextRequest, body: any): Promise<string | null> {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization');
    let token = extractTokenFromHeader(authHeader);

    // Fall back to sessionToken in body for backward compatibility
    if (!token) {
        token = body.sessionToken;
    }

    if (!token) {
        return null;
    }

    // Verify JWT token signature and expiration
    const payload = await verifySessionToken(token);
    if (!payload || !payload.studentId) {
        return null;
    }

    // Verify student is still active
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const key = (serviceRoleKey && serviceRoleKey !== 'YOUR_SERVICE_ROLE_KEY_HERE')
        ? serviceRoleKey
        : anonKey;

    const supabase = createClient(supabaseUrl, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: student, error } = await supabase
        .from('students')
        .select('id, is_active')
        .eq('id', payload.studentId)
        .single();

    if (error || !student || !student.is_active) {
        return null;
    }

    return payload.studentId;
}

/**
 * Server-side proxy for OpenRouter AI API
 * This keeps the API key secure on the server
 * Requires valid JWT session token for authentication
 */
export async function POST(request: NextRequest) {
    const corsHeaders = getCorsHeaders(request);

    try {
        const body = await request.json();
        const { messages, model } = body;

        // Validate session token
        const studentId = await validateSession(request, body);
        if (!studentId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401, headers: corsHeaders }
            );
        }

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            console.error('OPENROUTER_API_KEY not configured');
            return NextResponse.json(
                { error: 'AI service not configured' },
                { status: 500, headers: corsHeaders }
            );
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://numerosense.com',
                'X-Title': 'NumeroSense',
            },
            body: JSON.stringify({
                model: model || 'xiaomi/mimo-v2-flash:free',
                messages,
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error('OpenRouter error:', data.error);
            return NextResponse.json(
                { error: data.error.message || 'AI service error' },
                { status: response.status, headers: corsHeaders }
            );
        }

        return NextResponse.json(data, { headers: corsHeaders });
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Failed to process chat request' },
            { status: 500, headers: corsHeaders }
        );
    }
}

// CORS preflight
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: getCorsHeaders(request),
    });
}
