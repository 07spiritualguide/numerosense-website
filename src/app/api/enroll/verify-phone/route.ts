import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from '@/lib/cors';

/**
 * Verify phone number matches the student for this invite code
 * Stricter rate limiting to prevent phone enumeration
 */

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // requests per minute (stricter for phone verification)
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
        // Rate limiting (stricter for phone verification)
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { valid: false, error: 'Too many attempts. Please try again later.' },
                { status: 429, headers: corsHeaders }
            );
        }

        const body = await request.json();
        const { code, phone } = body;

        if (!code || !phone) {
            return NextResponse.json(
                { valid: false, error: 'Invite code and phone number are required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const supabase = getSupabaseClient();

        // Get invite code and associated student
        const { data: inviteCode, error: codeError } = await supabase
            .from('invite_codes')
            .select('id, student_id, used_at')
            .eq('code', code.trim())
            .single();

        if (codeError || !inviteCode) {
            return NextResponse.json(
                { valid: false, error: 'Invalid invite code' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Check if code has been used
        if (inviteCode.used_at) {
            return NextResponse.json(
                { valid: false, reason: 'used', error: 'This invite code has already been used.' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Get student and verify phone matches
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, name, phone')
            .eq('id', inviteCode.student_id)
            .single();

        if (studentError || !student) {
            return NextResponse.json(
                { valid: false, error: 'Student not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Clean phone numbers for comparison (remove non-digits)
        const cleanInputPhone = phone.trim().replace(/\D/g, '');
        const cleanStoredPhone = student.phone.replace(/\D/g, '');

        if (cleanInputPhone !== cleanStoredPhone) {
            // Generic error to prevent phone enumeration
            return NextResponse.json(
                { valid: false, error: 'Phone number does not match our records' },
                { status: 400, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            { valid: true, studentName: student.name },
            { headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('Phone verification error:', error);
        return NextResponse.json(
            { valid: false, error: 'Failed to verify phone number' },
            { status: 500, headers: corsHeaders }
        );
    }
}
