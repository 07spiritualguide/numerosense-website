import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { getCorsHeaders } from '@/lib/cors';

/**
 * Server-side password verification API
 * This keeps password hashing secure on the server
 */

// Create a Supabase client (service role preferred, falls back to anon for dev)
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Use service role key if available, otherwise fall back to anon key
    // (anon key works because RLS policies still allow SELECT on students)
    const key = (serviceRoleKey && serviceRoleKey !== 'YOUR_SERVICE_ROLE_KEY_HERE')
        ? serviceRoleKey
        : anonKey;

    return createClient(supabaseUrl, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

// Hash password using SHA-256 with salt (matching current implementation)
function hashPasswordSHA256(password: string): string {
    const data = password + 'spiritual_guide_salt_2024';
    return crypto.createHash('sha256').update(data).digest('hex');
}

// In future: bcrypt comparison for upgraded passwords
// async function verifyBcrypt(password: string, hash: string): Promise<boolean> {
//     const bcrypt = require('bcrypt');
//     return bcrypt.compare(password, hash);
// }

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
    const corsHeaders = getCorsHeaders(request);

    try {
        const body = await request.json();
        const { phone, password } = body;

        if (!phone || !password) {
            return NextResponse.json(
                { error: 'Phone and password are required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const supabase = getSupabaseClient();

        // Fetch student by phone
        const { data: student, error } = await supabase
            .from('students')
            .select('id, name, phone, password_hash, is_active, trial_ends_at, profile_complete')
            .eq('phone', phone.trim())
            .single();

        if (error || !student) {
            // Don't reveal whether phone exists
            return NextResponse.json(
                { valid: false, error: 'Invalid phone number or password' },
                { status: 401, headers: corsHeaders }
            );
        }

        if (!student.is_active) {
            return NextResponse.json(
                { valid: false, error: 'Your account has been deactivated. Please contact support.' },
                { status: 401, headers: corsHeaders }
            );
        }

        // Verify password (SHA-256 for now, bcrypt support can be added later)
        const passwordHash = hashPasswordSHA256(password);

        if (passwordHash !== student.password_hash) {
            return NextResponse.json(
                { valid: false, error: 'Invalid phone number or password' },
                { status: 401, headers: corsHeaders }
            );
        }

        // Update last login
        await supabase
            .from('students')
            .update({ last_login: new Date().toISOString() })
            .eq('id', student.id);

        // Return session data (never send password_hash to client)
        return NextResponse.json({
            valid: true,
            student: {
                id: student.id,
                name: student.name,
                phone: student.phone,
                trial_ends_at: student.trial_ends_at,
                profile_complete: student.profile_complete,
            },
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Auth verification error:', error);
        return NextResponse.json(
            { valid: false, error: 'Authentication failed' },
            { status: 500, headers: corsHeaders }
        );
    }
}
