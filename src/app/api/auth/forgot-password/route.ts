import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { getCorsHeaders } from '@/lib/cors';

/**
 * Forgot Password API - Step 1
 * Generates OTP and sends via SMS
 */

// Create Supabase client with service role for password_reset_tokens access
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

// Generate 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP using SHA-256
function hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp + 'numerosense_otp_salt').digest('hex');
}

// Send SMS via Fast2SMS OTP Route (uses pre-approved DLT template)
async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
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

    // Use OTP route - delivers as "Your OTP is {otp}"
    const params = new URLSearchParams({
        authorization: apiKey,
        route: 'otp',
        variables_values: otp,
        flash: '0',
        numbers: cleanPhone,
    });

    try {
        const response = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`, {
            method: 'GET',
        });
        const data = await response.json();
        console.log('OTP SMS Response:', data);
        return data.return === true;
    } catch (error) {
        console.error('Failed to send OTP SMS:', error);
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
        const { phone } = body;

        if (!phone) {
            return NextResponse.json(
                { error: 'Phone number is required' },
                { status: 400, headers: corsHeaders }
            );
        }

        const cleanPhone = phone.trim();
        const supabase = getSupabaseClient();

        // Check if student exists (don't reveal in response for security)
        const { data: student } = await supabase
            .from('students')
            .select('id, name, is_active')
            .eq('phone', cleanPhone)
            .single();

        // Always return success message to prevent phone enumeration
        // But only actually send OTP if student exists and is active
        if (!student || !student.is_active) {
            // Return success anyway to prevent enumeration attacks
            return NextResponse.json({
                success: true,
                message: 'If this phone number is registered, you will receive an OTP shortly.',
            }, { headers: corsHeaders });
        }

        // Rate limiting: Check recent requests for this phone (max 3 per hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentTokens, error: countError } = await supabase
            .from('password_reset_tokens')
            .select('id')
            .eq('phone', cleanPhone)
            .gte('created_at', oneHourAgo);

        if (recentTokens && recentTokens.length >= 3) {
            return NextResponse.json(
                { error: 'Too many reset attempts. Please try again in an hour.' },
                { status: 429, headers: corsHeaders }
            );
        }

        // Generate OTP and hash it
        const otp = generateOTP();
        const otpHash = hashOTP(otp);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        // Store OTP token
        const { error: insertError } = await supabase
            .from('password_reset_tokens')
            .insert({
                phone: cleanPhone,
                otp_hash: otpHash,
                expires_at: expiresAt,
                attempts: 0,
                used: false,
            });

        if (insertError) {
            console.error('Failed to store OTP token:', insertError);
            return NextResponse.json(
                { error: 'Failed to process request. Please try again.' },
                { status: 500, headers: corsHeaders }
            );
        }

        // Send OTP via SMS
        const smsSent = await sendOtpSms(cleanPhone, otp);

        if (!smsSent) {
            console.error('Failed to send OTP SMS to:', cleanPhone);
            // Still return success to not reveal if SMS failed
        }

        return NextResponse.json({
            success: true,
            message: 'If this phone number is registered, you will receive an OTP shortly.',
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred. Please try again.' },
            { status: 500, headers: corsHeaders }
        );
    }
}
