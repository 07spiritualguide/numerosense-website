import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { getCorsHeaders } from '@/lib/cors';

/**
 * Verify OTP API - Step 2
 * Verifies OTP and sets user-provided password
 */

// Create Supabase client with service role
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

// Hash OTP using SHA-256 (same as forgot-password endpoint)
function hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp + 'numerosense_otp_salt').digest('hex');
}

// Hash password using SHA-256 with salt (matching existing auth implementation)
function hashPassword(password: string): string {
    const data = password + 'spiritual_guide_salt_2024';
    return crypto.createHash('sha256').update(data).digest('hex');
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
    const corsHeaders = getCorsHeaders(request);

    try {
        const body = await request.json();
        const { phone, otp, newPassword } = body;

        if (!phone || !otp) {
            return NextResponse.json(
                { error: 'Phone number and OTP are required' },
                { status: 400, headers: corsHeaders }
            );
        }

        if (!newPassword) {
            return NextResponse.json(
                { error: 'New password is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        if (newPassword.length < 4) {
            return NextResponse.json(
                { error: 'Password must be at least 4 characters' },
                { status: 400, headers: corsHeaders }
            );
        }

        const cleanPhone = phone.trim();
        const cleanOtp = otp.trim();
        const supabase = getSupabaseClient();

        // Find valid token for this phone
        const now = new Date().toISOString();
        const { data: tokens, error: fetchError } = await supabase
            .from('password_reset_tokens')
            .select('*')
            .eq('phone', cleanPhone)
            .eq('used', false)
            .gt('expires_at', now)
            .order('created_at', { ascending: false })
            .limit(1);

        if (fetchError || !tokens || tokens.length === 0) {
            return NextResponse.json(
                { error: 'Invalid or expired OTP. Please request a new one.' },
                { status: 400, headers: corsHeaders }
            );
        }

        const token = tokens[0];

        // Check max attempts
        if (token.attempts >= 3) {
            // Mark token as used to prevent further attempts
            await supabase
                .from('password_reset_tokens')
                .update({ used: true })
                .eq('id', token.id);

            return NextResponse.json(
                { error: 'Too many failed attempts. Please request a new OTP.' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Verify OTP hash
        const otpHash = hashOTP(cleanOtp);
        if (otpHash !== token.otp_hash) {
            // Increment attempt counter
            await supabase
                .from('password_reset_tokens')
                .update({ attempts: token.attempts + 1 })
                .eq('id', token.id);

            const remainingAttempts = 2 - token.attempts;
            return NextResponse.json(
                {
                    error: remainingAttempts > 0
                        ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
                        : 'Invalid OTP. No attempts remaining. Please request a new OTP.'
                },
                { status: 400, headers: corsHeaders }
            );
        }

        // OTP is valid - hash the user-provided password
        const newPasswordHash = hashPassword(newPassword);

        // Get student info
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id')
            .eq('phone', cleanPhone)
            .single();

        if (studentError || !student) {
            return NextResponse.json(
                { error: 'Account not found. Please contact support.' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Update password
        const { error: updateError } = await supabase
            .from('students')
            .update({ password_hash: newPasswordHash })
            .eq('id', student.id);

        if (updateError) {
            console.error('Failed to update password:', updateError);
            return NextResponse.json(
                { error: 'Failed to reset password. Please try again.' },
                { status: 500, headers: corsHeaders }
            );
        }

        // Mark token as used
        await supabase
            .from('password_reset_tokens')
            .update({ used: true })
            .eq('id', token.id);

        return NextResponse.json({
            success: true,
            message: 'Password reset successful! You can now login with your new password.',
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Verify OTP error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred. Please try again.' },
            { status: 500, headers: corsHeaders }
        );
    }
}
