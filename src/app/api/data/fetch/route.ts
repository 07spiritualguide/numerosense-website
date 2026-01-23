import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders } from '@/lib/cors';
import { verifySessionToken, extractTokenFromHeader } from '@/lib/jwt';

/**
 * Secure data fetching API for mobile app
 * All requests require valid JWT authentication
 * Uses service_role key to bypass RLS
 */

function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Prefer service_role to bypass RLS securely
    const key = (serviceRoleKey && serviceRoleKey !== 'YOUR_SERVICE_ROLE_KEY_HERE')
        ? serviceRoleKey
        : anonKey;

    return createClient(supabaseUrl, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

async function validateSession(request: NextRequest): Promise<{ studentId: string } | null> {
    try {
        const authHeader = request.headers.get('authorization');
        const token = extractTokenFromHeader(authHeader);

        if (!token) return null;

        const payload = await verifySessionToken(token);
        if (!payload || !payload.studentId) return null;

        return { studentId: payload.studentId };
    } catch {
        return null;
    }
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
    const corsHeaders = getCorsHeaders(request);

    try {
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401, headers: corsHeaders }
            );
        }

        const body = await request.json();
        const { action, sessionId } = body;
        const supabase = getSupabaseClient();

        switch (action) {
            case 'get-user-profile': {
                // Fetch student data
                const { data: student, error: studentError } = await supabase
                    .from('students')
                    .select('full_name, date_of_birth, gender, profile_complete, trial_ends_at, name, phone')
                    .eq('id', session.studentId)
                    .single();

                if (studentError) {
                    return NextResponse.json(
                        { error: 'Failed to fetch student data' },
                        { status: 500, headers: corsHeaders }
                    );
                }

                // Fetch basic_info
                const { data: basicInfo } = await supabase
                    .from('basic_info')
                    .select('*')
                    .eq('student_id', session.studentId)
                    .single();

                // Fetch dashas in parallel
                const [mahadashaResult, antardashaResult, pratyantardashaResult] = await Promise.all([
                    supabase.from('mahadasha').select('timeline').eq('student_id', session.studentId).maybeSingle(),
                    supabase.from('antardasha').select('timeline').eq('student_id', session.studentId).maybeSingle(),
                    supabase.from('pratyantardasha').select('timeline').eq('student_id', session.studentId).maybeSingle(),
                ]);

                return NextResponse.json({
                    success: true,
                    data: {
                        student,
                        basicInfo,
                        mahadasha: mahadashaResult.data?.timeline || null,
                        antardasha: antardashaResult.data?.timeline || null,
                        pratyantardasha: pratyantardashaResult.data?.timeline || null,
                    }
                }, { headers: corsHeaders });
            }

            case 'get-chat-sessions': {
                const { data: sessions, error } = await supabase
                    .from('chat_sessions')
                    .select('*')
                    .eq('student_id', session.studentId)
                    .order('updated_at', { ascending: false });

                if (error) {
                    return NextResponse.json(
                        { error: 'Failed to fetch chat sessions' },
                        { status: 500, headers: corsHeaders }
                    );
                }

                return NextResponse.json({
                    success: true,
                    data: sessions || []
                }, { headers: corsHeaders });
            }

            case 'get-chat-messages': {
                if (!sessionId) {
                    return NextResponse.json(
                        { error: 'sessionId is required' },
                        { status: 400, headers: corsHeaders }
                    );
                }

                // Verify session belongs to this student
                const { data: chatSession } = await supabase
                    .from('chat_sessions')
                    .select('id')
                    .eq('id', sessionId)
                    .eq('student_id', session.studentId)
                    .single();

                if (!chatSession) {
                    return NextResponse.json(
                        { error: 'Chat session not found' },
                        { status: 404, headers: corsHeaders }
                    );
                }

                const { data: messages, error } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('session_id', sessionId)
                    .order('created_at', { ascending: true });

                if (error) {
                    return NextResponse.json(
                        { error: 'Failed to fetch messages' },
                        { status: 500, headers: corsHeaders }
                    );
                }

                return NextResponse.json({
                    success: true,
                    data: messages || []
                }, { headers: corsHeaders });
            }

            case 'get-daily-count': {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const { count } = await supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('student_id', session.studentId)
                    .eq('role', 'user')
                    .gte('created_at', today.toISOString());

                return NextResponse.json({
                    success: true,
                    data: { count: count || 0 }
                }, { headers: corsHeaders });
            }

            default:
                return NextResponse.json(
                    { error: 'Unknown action' },
                    { status: 400, headers: corsHeaders }
                );
        }
    } catch (error: any) {
        console.error('Data fetch error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch data' },
            { status: 500, headers: getCorsHeaders(request) }
        );
    }
}
