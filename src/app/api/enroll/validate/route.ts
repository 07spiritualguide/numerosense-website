import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from '@/lib/cors';

/**
 * Validate invite code API
 * Checks if code exists and hasn't been used
 */

// Simple in-memory rate limiting (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return true;
    }

    if (entry.count >= RATE_LIMIT) {
        return false;
    }

    entry.count++;
    return true;
}

function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const key = (serviceRoleKey && serviceRoleKey !== 'YOUR_SERVICE_ROLE_KEY_HERE')
        ? serviceRoleKey
        : anonKey;

    return createClient(supabaseUrl, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
    const corsHeaders = getCorsHeaders(request);

    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { valid: false, error: 'Too many requests. Please try again later.' },
                { status: 429, headers: corsHeaders }
            );
        }

        const body = await request.json();
        const { code } = body;

        if (!code || typeof code !== 'string') {
            return NextResponse.json(
                { valid: false, error: 'Invite code is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const supabase = getSupabaseClient();

        // Check if code exists
        const { data: inviteCode, error } = await supabase
            .from('invite_codes')
            .select('id, used_at')
            .eq('code', code.trim())
            .single();

        if (error || !inviteCode) {
            return NextResponse.json(
                { valid: false, error: 'Invalid invite code' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Check if code has been used
        if (inviteCode.used_at) {
            return NextResponse.json(
                { valid: false, reason: 'used', error: 'This invite code has already been used. Please log in instead.' },
                { status: 400, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            { valid: true },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('Invite validation error:', error);
        return NextResponse.json(
            { valid: false, error: 'Failed to validate invite code' },
            { status: 500, headers: corsHeaders }
        );
    }
}
