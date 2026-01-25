import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { getCorsHeaders } from '@/lib/cors';

/**
 * Verify OTP API - Step 2
 * Verifies OTP and resets password
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

// Generate random 8-character alphanumeric password (matching existing implementation)
function generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Send new password via SMS
async function sendNewPasswordSms(phone: string, name: string, password: string): Promise<boolean> {
    const apiKey = process.env.NEXT_FAST2SMS_API_KEY;
    if (!apiKey) {
        console.error('NEXT_FAST2SMS_API_KEY not configured');
        return false;
    }

    // Clean phone number
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
        cleanPhone = cleanPhone.slice(-10);
    }

    const message = `Hi ${name}, your new Numerosense password is: ${password}\n\nPlease login and keep this password safe.`;

    const params = new URLSearchParams({
        authorization: apiKey,
        route: 'q',
        message: message,
        language: 'english',
        flash: '0',
        numbers: cleanPhone,
    });

    try {
        const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`, {
            method: 'GET',
        });
        const data = await response.json();
        console.log('New Password SMS Response:', data);
        return data.return === true;
    } catch (error) {
        console.error('Failed to send new password SMS:', error);
        return false;
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
    const corsHeaders = getCorsHeaders(request);

    try {
        const body = await request.json();
        const { phone, otp } = body;

        if (!phone || !otp) {
            return NextResponse.json(
                { error: 'Phone number and OTP are required' },
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

        // OTP is valid - generate new password
        const newPassword = generatePassword();
        const newPasswordHash = hashPassword(newPassword);

        // Get student info for SMS
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, name')
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

        // Send new password via SMS
        const smsSent = await sendNewPasswordSms(cleanPhone, student.name, newPassword);

        return NextResponse.json({
            success: true,
            message: 'Password reset successful! Your new password has been sent via SMS.',
            smsSent,
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Verify OTP error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred. Please try again.' },
            { status: 500, headers: corsHeaders }
        );
    }
}
