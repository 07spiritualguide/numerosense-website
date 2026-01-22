import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from '@/lib/cors';

/**
 * Validate that the studentId exists and is active
 */
async function validateStudent(studentId: string): Promise<boolean> {
    if (!studentId) return false;

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
        .eq('id', studentId)
        .single();

    return !error && student && student.is_active;
}

/**
 * Server-side proxy for OpenRouter AI API
 * This keeps the API key secure on the server
 * Requires valid studentId for authentication
 */
export async function POST(request: NextRequest) {
    const corsHeaders = getCorsHeaders(request);

    try {
        const body = await request.json();
        const { messages, model, studentId } = body;

        // Validate student authentication
        if (!studentId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401, headers: corsHeaders }
            );
        }

        const isValidStudent = await validateStudent(studentId);
        if (!isValidStudent) {
            return NextResponse.json(
                { error: 'Invalid or inactive account' },
                { status: 403, headers: corsHeaders }
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
