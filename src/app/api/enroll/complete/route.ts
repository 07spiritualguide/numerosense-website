import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { getCorsHeaders } from '@/lib/cors';
import { signSessionToken } from '@/lib/jwt';

/**
 * Complete enrollment - set password and mark invite code as used
 */

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 3; // requests per minute (strictest for password setting)
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

// Hash password using SHA-256 with salt (matching existing auth implementation)
function hashPasswordSHA256(password: string): string {
    const data = password + 'spiritual_guide_salt_2024';
    return crypto.createHash('sha256').update(data).digest('hex');
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
                { success: false, error: 'Too many attempts. Please try again later.' },
                { status: 429, headers: corsHeaders }
            );
        }

        const body = await request.json();
        const { code, phone, password } = body;

        if (!code || !phone || !password) {
            return NextResponse.json(
                { success: false, error: 'All fields are required' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Password validation
        if (password.length < 4) {
            return NextResponse.json(
                { success: false, error: 'Password must be at least 4 characters' },
                { status: 400, headers: corsHeaders }
            );
        }

        if (password.length > 100) {
            return NextResponse.json(
                { success: false, error: 'Password is too long' },
                { status: 400, headers: corsHeaders }
            );
        }

        const supabase = getSupabaseClient();

        // Get invite code
        const { data: inviteCode, error: codeError } = await supabase
            .from('invite_codes')
            .select('id, student_id, used_at')
            .eq('code', code.trim())
            .single();

        if (codeError || !inviteCode) {
            return NextResponse.json(
                { success: false, error: 'Invalid invite code' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Check if code has been used
        if (inviteCode.used_at) {
            return NextResponse.json(
                { success: false, error: 'This invite code has already been used' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Get student and verify phone
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, name, phone, trial_ends_at')
            .eq('id', inviteCode.student_id)
            .single();

        if (studentError || !student) {
            return NextResponse.json(
                { success: false, error: 'Student not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        // Verify phone matches
        const cleanInputPhone = phone.trim().replace(/\D/g, '');
        const cleanStoredPhone = student.phone.replace(/\D/g, '');

        if (cleanInputPhone !== cleanStoredPhone) {
            return NextResponse.json(
                { success: false, error: 'Phone number verification failed' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Hash password
        const passwordHash = hashPasswordSHA256(password);

        // Update student with password
        const { error: updateError } = await supabase
            .from('students')
            .update({
                password_hash: passwordHash,
                last_login: new Date().toISOString(),
            })
            .eq('id', student.id);

        if (updateError) {
            console.error('Failed to update student:', updateError);
            return NextResponse.json(
                { success: false, error: 'Failed to set password' },
                { status: 500, headers: corsHeaders }
            );
        }

        // Mark invite code as used
        const { error: markUsedError } = await supabase
            .from('invite_codes')
            .update({ used_at: new Date().toISOString() })
            .eq('id', inviteCode.id);

        if (markUsedError) {
            console.error('Failed to mark invite as used:', markUsedError);
            // Don't fail the request - password is already set
        }

        // Generate session token
        const sessionToken = await signSessionToken({
            studentId: student.id,
            phone: student.phone,
            name: student.name,
        });

        return NextResponse.json({
            success: true,
            sessionToken,
            student: {
                id: student.id,
                name: student.name,
                phone: student.phone,
                trial_ends_at: student.trial_ends_at,
                profile_complete: false, // New enrollees haven't completed profile yet
            },
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Enrollment completion error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to complete enrollment' },
            { status: 500, headers: corsHeaders }
        );
    }
}
