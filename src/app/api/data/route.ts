import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side API routes for secure data mutations
 * Uses service_role key to bypass RLS (we validate session manually)
 */

// Create a Supabase client (service role preferred, falls back to anon for dev)
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Use service role key if available, otherwise fall back to anon key
    // (anon key works because RLS policies still allow mutations during migration)
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

// Validate that the request includes a valid student session
async function validateSession(request: NextRequest): Promise<{ studentId: string } | null> {
    try {
        const body = await request.clone().json();
        const { studentId, sessionToken } = body;

        if (!studentId) {
            return null;
        }

        // For now, we trust the studentId from the client
        // In future, we can add JWT validation here
        const supabase = getSupabaseClient();

        // Verify student exists and is active
        const { data: student, error } = await supabase
            .from('students')
            .select('id, is_active')
            .eq('id', studentId)
            .single();

        if (error || !student || !student.is_active) {
            return null;
        }

        return { studentId };
    } catch {
        return null;
    }
}

// Helper for CORS
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
    try {
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json(
                { error: 'Invalid or expired session' },
                { status: 401, headers: corsHeaders() }
            );
        }

        const body = await request.json();
        const { action, data } = body;

        const supabase = getSupabaseClient();

        switch (action) {
            case 'upsert-basic-info': {
                const { data: existing } = await supabase
                    .from('basic_info')
                    .select('id')
                    .eq('student_id', session.studentId)
                    .single();

                if (existing) {
                    const { error } = await supabase
                        .from('basic_info')
                        .update({ ...data, updated_at: new Date().toISOString() })
                        .eq('student_id', session.studentId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('basic_info')
                        .insert({ student_id: session.studentId, ...data });
                    if (error) throw error;
                }
                return NextResponse.json({ success: true }, { headers: corsHeaders() });
            }

            case 'upsert-mahadasha': {
                const { data: existing } = await supabase
                    .from('mahadasha')
                    .select('id')
                    .eq('student_id', session.studentId)
                    .single();

                if (existing) {
                    const { error } = await supabase
                        .from('mahadasha')
                        .update({ timeline: data.timeline, updated_at: new Date().toISOString() })
                        .eq('student_id', session.studentId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('mahadasha')
                        .insert({ student_id: session.studentId, timeline: data.timeline });
                    if (error) throw error;
                }
                return NextResponse.json({ success: true }, { headers: corsHeaders() });
            }

            case 'upsert-antardasha': {
                const { data: existing } = await supabase
                    .from('antardasha')
                    .select('id')
                    .eq('student_id', session.studentId)
                    .single();

                if (existing) {
                    const { error } = await supabase
                        .from('antardasha')
                        .update({ timeline: data.timeline, updated_at: new Date().toISOString() })
                        .eq('student_id', session.studentId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('antardasha')
                        .insert({ student_id: session.studentId, timeline: data.timeline });
                    if (error) throw error;
                }
                return NextResponse.json({ success: true }, { headers: corsHeaders() });
            }

            case 'upsert-pratyantardasha': {
                const { data: existing } = await supabase
                    .from('pratyantardasha')
                    .select('id')
                    .eq('student_id', session.studentId)
                    .single();

                if (existing) {
                    const { error } = await supabase
                        .from('pratyantardasha')
                        .update({ timeline: data.timeline, updated_at: new Date().toISOString() })
                        .eq('student_id', session.studentId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('pratyantardasha')
                        .insert({ student_id: session.studentId, timeline: data.timeline });
                    if (error) throw error;
                }
                return NextResponse.json({ success: true }, { headers: corsHeaders() });
            }

            case 'update-student-profile': {
                const { error } = await supabase
                    .from('students')
                    .update({ ...data, updated_at: new Date().toISOString() })
                    .eq('id', session.studentId);
                if (error) throw error;
                return NextResponse.json({ success: true }, { headers: corsHeaders() });
            }

            case 'update-last-login': {
                const { error } = await supabase
                    .from('students')
                    .update({ last_login: new Date().toISOString() })
                    .eq('id', session.studentId);
                if (error) throw error;
                return NextResponse.json({ success: true }, { headers: corsHeaders() });
            }

            case 'create-chat-session': {
                const { data: newSession, error } = await supabase
                    .from('chat_sessions')
                    .insert({
                        student_id: session.studentId,
                        title: data.title || 'New Chat',
                    })
                    .select()
                    .single();
                if (error) throw error;
                return NextResponse.json({ success: true, data: newSession }, { headers: corsHeaders() });
            }

            case 'update-chat-session': {
                // Verify ownership
                const { data: existing } = await supabase
                    .from('chat_sessions')
                    .select('id')
                    .eq('id', data.sessionId)
                    .eq('student_id', session.studentId)
                    .single();

                if (!existing) {
                    return NextResponse.json(
                        { error: 'Session not found' },
                        { status: 404, headers: corsHeaders() }
                    );
                }

                const { error } = await supabase
                    .from('chat_sessions')
                    .update({
                        title: data.title,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', data.sessionId);
                if (error) throw error;
                return NextResponse.json({ success: true }, { headers: corsHeaders() });
            }

            case 'delete-chat-session': {
                // Verify ownership before delete
                const { data: existing } = await supabase
                    .from('chat_sessions')
                    .select('id')
                    .eq('id', data.sessionId)
                    .eq('student_id', session.studentId)
                    .single();

                if (!existing) {
                    return NextResponse.json(
                        { error: 'Session not found' },
                        { status: 404, headers: corsHeaders() }
                    );
                }

                const { error } = await supabase
                    .from('chat_sessions')
                    .delete()
                    .eq('id', data.sessionId);
                if (error) throw error;
                return NextResponse.json({ success: true }, { headers: corsHeaders() });
            }

            case 'add-chat-message': {
                // Verify session ownership
                const { data: existingSession } = await supabase
                    .from('chat_sessions')
                    .select('id')
                    .eq('id', data.sessionId)
                    .eq('student_id', session.studentId)
                    .single();

                if (!existingSession) {
                    return NextResponse.json(
                        { error: 'Session not found' },
                        { status: 404, headers: corsHeaders() }
                    );
                }

                const { data: newMessage, error } = await supabase
                    .from('chat_messages')
                    .insert({
                        session_id: data.sessionId,
                        student_id: session.studentId,
                        role: data.role,
                        content: data.content,
                    })
                    .select()
                    .single();
                if (error) throw error;

                // Update session's updated_at
                await supabase
                    .from('chat_sessions')
                    .update({ updated_at: new Date().toISOString() })
                    .eq('id', data.sessionId);

                return NextResponse.json({ success: true, data: newMessage }, { headers: corsHeaders() });
            }

            default:
                return NextResponse.json(
                    { error: 'Unknown action' },
                    { status: 400, headers: corsHeaders() }
                );
        }
    } catch (error: any) {
        console.error('Data mutation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process request' },
            { status: 500, headers: corsHeaders() }
        );
    }
}
