'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Spinner, Button, Input, ScrollShadow } from '@heroui/react';
import { supabase } from '@/lib/supabase';
import { getStudentSession, getSessionToken, StudentSession } from '@/lib/auth';
import StudentNavbar from '@/components/StudentNavbar';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

interface ChatSession {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

interface UserContext {
    full_name: string;
    dob: string;
    root_number: number | null;
    destiny_number: number | null;
    name_number: number | null;
    lucky_color: string | null;
    lucky_direction: string | null;
    lucky_dates: string[] | null;
    favorable_days: string[] | null;
    positive_traits: string[] | null;
    negative_traits: string[] | null;
    mahadasha: any;
    antardasha: any;
    pratyantardasha: any;
}

// Destiny theme colors
const DESTINY_THEME: Record<number, { bg: string; card: string; accent: string; primary: string; gridBg: string; gridBorder: string }> = {
    1: { bg: '#FEF5C3', card: '#FFFEF5', accent: '#D4A017', primary: '#FFE44E', gridBg: '#FFFADB', gridBorder: '#FFF4B8' },
    2: { bg: '#E2FF90', card: '#F5FFF0', accent: '#4CAF50', primary: '#BCFF00', gridBg: '#F1FFCA', gridBorder: '#E6FFA1' },
    3: { bg: '#FEE5F3', card: '#FFF5FB', accent: '#E91E63', primary: '#FF77C3', gridBg: '#FFECF7', gridBorder: '#FFE0F2' },
    4: { bg: '#D5E4FF', card: '#F0F5FF', accent: '#2196F3', primary: '#5995FF', gridBg: '#E6EFFF', gridBorder: '#CFE0FF' },
    5: { bg: '#C9FFC4', card: '#F0FFF0', accent: '#8BC34A', primary: '#6FFF62', gridBg: '#E1FFDE', gridBorder: '#BDFFB7' },
    6: { bg: '#D5FCFF', card: '#F0FFFF', accent: '#00BCD4', primary: '#51F3FF', gridBg: '#DFFDFF', gridBorder: '#BDFAFF' },
    7: { bg: '#FFFBD4', card: '#FFFFF5', accent: '#FFC107', primary: '#FFF163', gridBg: '#FFFCE3', gridBorder: '#FFF9BD' },
    8: { bg: '#E6D1A2', card: '#FFF8F0', accent: '#795548', primary: '#FBB821', gridBg: '#FFF6E3', gridBorder: '#FFEFCC' },
    9: { bg: '#FFC2C3', card: '#FFF5F5', accent: '#F44336', primary: '#FF4E51', gridBg: '#FFF5F5', gridBorder: '#FFE2E2' },
};

const DAILY_MESSAGE_LIMIT = 5;

export default function NumeroAIChatPage() {
    const router = useRouter();
    const [session, setSession] = useState<StudentSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [userContext, setUserContext] = useState<UserContext | null>(null);
    const [dailyCount, setDailyCount] = useState(0);
    const [destinyNumber, setDestinyNumber] = useState<number>(1);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const theme = DESTINY_THEME[destinyNumber] || DESTINY_THEME[1];

    // Apply cached theme immediately on mount to prevent flash
    useEffect(() => {
        const cachedDestiny = localStorage.getItem('destiny_number');
        if (cachedDestiny) {
            const num = parseInt(cachedDestiny, 10);
            if (DESTINY_THEME[num]) {
                setDestinyNumber(num);
            }
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (session?.id) {
            loadUserData();
            loadSessions();
            loadDailyCount();
        }
    }, [session]);

    useEffect(() => {
        if (activeSessionId) {
            loadMessages(activeSessionId);
        }
    }, [activeSessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const checkAuth = async () => {
        const studentSession = getStudentSession();
        if (!studentSession) {
            router.push('/login');
            return;
        }
        setSession(studentSession);
        setIsLoading(false);
    };

    const loadUserData = async () => {
        if (!session?.id) return;

        const { data: basicInfo } = await supabase
            .from('basic_info')
            .select('*')
            .eq('student_id', session.id)
            .maybeSingle();

        if (basicInfo?.destiny_number) {
            setDestinyNumber(basicInfo.destiny_number);
        }

        const { data: mahadasha } = await supabase
            .from('mahadasha')
            .select('timeline')
            .eq('student_id', session.id)
            .maybeSingle();

        const { data: antardasha } = await supabase
            .from('antardasha')
            .select('timeline')
            .eq('student_id', session.id)
            .maybeSingle();

        const { data: pratyantardasha } = await supabase
            .from('pratyantardasha')
            .select('timeline')
            .eq('student_id', session.id)
            .maybeSingle();

        const { data: student } = await supabase
            .from('students')
            .select('full_name, date_of_birth')
            .eq('id', session.id)
            .single();

        setUserContext({
            full_name: student?.full_name || '',
            dob: student?.date_of_birth || '',
            root_number: basicInfo?.root_number || null,
            destiny_number: basicInfo?.destiny_number || null,
            name_number: basicInfo?.name_number || null,
            lucky_color: basicInfo?.lucky_color || null,
            lucky_direction: basicInfo?.lucky_direction || null,
            lucky_dates: basicInfo?.lucky_dates || null,
            favorable_days: basicInfo?.favorable_days || null,
            positive_traits: basicInfo?.positive_traits || null,
            negative_traits: basicInfo?.negative_traits || null,
            mahadasha: mahadasha?.timeline || null,
            antardasha: antardasha?.timeline || null,
            pratyantardasha: pratyantardasha?.timeline || null,
        });
    };

    const loadSessions = async () => {
        if (!session?.id) return;

        const { data } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('student_id', session.id)
            .order('updated_at', { ascending: false });

        if (data) {
            setSessions(data);
            if (data.length > 0 && !activeSessionId) {
                setActiveSessionId(data[0].id);
            }
        }
    };

    const loadMessages = async (sessionId: string) => {
        const { data } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data);
        }
    };

    const loadDailyCount = async () => {
        if (!session?.id) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', session.id)
            .eq('role', 'user')
            .gte('created_at', today.toISOString());

        setDailyCount(count || 0);
    };

    const createNewSession = async () => {
        if (!session?.id) return;

        const { data, error } = await supabase
            .from('chat_sessions')
            .insert({
                student_id: session.id,
                title: 'New Chat',
            })
            .select()
            .single();

        if (data) {
            setSessions((prev) => [data, ...prev]);
            setActiveSessionId(data.id);
            setMessages([]);
        }
    };

    const deleteSession = async (sessionId: string) => {
        if (!confirm('Are you sure you want to delete this chat?')) return;

        await supabase.from('chat_sessions').delete().eq('id', sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
            setActiveSessionId(null);
            setMessages([]);
        }
    };

    const buildSystemPrompt = () => {
        if (!userContext) return 'You are Numero AI, a friendly numerology expert. Be concise and helpful.';

        const now = new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const currentDateTime = `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} at ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

        const currentMahadasha = userContext.mahadasha?.find((m: any) => {
            return new Date(m.startDate) <= now && new Date(m.endDate) >= now;
        });

        const currentAntardasha = userContext.antardasha?.find((a: any) => {
            return new Date(a.startDate) <= now && new Date(a.endDate) >= now;
        });

        return `You are Numero AI, a friendly numerology assistant. Be conversational and direct.

CURRENT DATE & TIME: ${currentDateTime}

CORE PRINCIPLES:
1. Answer only what's asked - no extra information
2. Keep responses to 1-2 sentences unless more detail is specifically requested
3. Be warm and natural, not formal or robotic
4. For simple greetings ("Hi", "Hello"), respond: "How can I help you today?"

RESPONSE GUIDELINES:
- If asked about lucky days → mention only days
- If asked about colors → mention only colors
- If asked about numbers → explain only those numbers
- Don't volunteer related information unless it directly answers the question

EXAMPLE:
❌ User: "What's my lucky color?"
Bad: "Your lucky color is Blue! Also, your lucky direction is North and favorable days are Monday and Friday."
✅ Good: "Your lucky color is Blue."

USER PROFILE (reference only when relevant):
Name: ${userContext.full_name}
DOB: ${userContext.dob}
Core Numbers: Root ${userContext.root_number || 'N/A'}, Destiny ${userContext.destiny_number || 'N/A'}, Name ${userContext.name_number || 'N/A'}
Favorable Days: ${userContext.favorable_days?.join(', ') || 'N/A'}
Lucky Dates: ${userContext.lucky_dates?.join(', ') || 'N/A'}
Lucky Color: ${userContext.lucky_color || 'N/A'}
Lucky Direction: ${userContext.lucky_direction || 'N/A'}
Current Mahadasha: ${currentMahadasha ? `Number ${currentMahadasha.number}` : 'N/A'}
Current Antardasha: ${currentAntardasha ? `Number ${currentAntardasha.number}` : 'N/A'}`;
    };

    const sendMessage = async () => {
        if (!inputText.trim() || isSending || !session?.id) return;

        if (dailyCount >= DAILY_MESSAGE_LIMIT) {
            alert(`You've used all ${DAILY_MESSAGE_LIMIT} messages for today. Come back tomorrow!`);
            return;
        }

        let sessionId = activeSessionId;

        if (!sessionId) {
            const { data } = await supabase
                .from('chat_sessions')
                .insert({
                    student_id: session.id,
                    title: inputText.slice(0, 50),
                })
                .select()
                .single();

            if (data) {
                sessionId = data.id;
                setSessions((prev) => [data, ...prev]);
                setActiveSessionId(data.id);
            } else {
                return;
            }
        }

        const userMessage = inputText.trim();
        setInputText('');
        setIsSending(true);

        const tempUserMsg: Message = {
            id: `temp-${Date.now()}`,
            role: 'user',
            content: userMessage,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempUserMsg]);

        try {
            const { data: savedUserMsg } = await supabase
                .from('chat_messages')
                .insert({
                    session_id: sessionId,
                    student_id: session.id,
                    role: 'user',
                    content: userMessage,
                })
                .select()
                .single();

            if (savedUserMsg) {
                setMessages((prev) =>
                    prev.map((m) => (m.id === tempUserMsg.id ? savedUserMsg : m))
                );
            }

            setDailyCount((prev) => prev + 1);

            if (messages.length === 0) {
                await supabase
                    .from('chat_sessions')
                    .update({ title: userMessage.slice(0, 50) })
                    .eq('id', sessionId);
                setSessions((prev) =>
                    prev.map((s) =>
                        s.id === sessionId ? { ...s, title: userMessage.slice(0, 50) } : s
                    )
                );
            }

            const conversationHistory = [
                { role: 'system', content: buildSystemPrompt() },
                ...messages.map((m) => ({ role: m.role, content: m.content })),
                { role: 'user', content: userMessage },
            ];

            // Use secure server-side proxy with JWT authentication
            const sessionToken = getSessionToken();
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {}),
                },
                body: JSON.stringify({
                    sessionToken,
                    model: 'nvidia/nemotron-3-nano-30b-a3b:free',
                    messages: conversationHistory,
                }),
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message || 'API Error');
            }

            const assistantContent =
                data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

            const { data: savedAssistantMsg } = await supabase
                .from('chat_messages')
                .insert({
                    session_id: sessionId,
                    student_id: session.id,
                    role: 'assistant',
                    content: assistantContent,
                })
                .select()
                .single();

            if (savedAssistantMsg) {
                setMessages((prev) => [...prev, savedAssistantMsg]);
            }

            await supabase
                .from('chat_sessions')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', sessionId);

        } catch (error: any) {
            alert(error.message || 'Failed to send message');
            setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
            setDailyCount((prev) => Math.max(0, prev - 1));
        } finally {
            setIsSending(false);
        }
    };

    const remainingMessages = DAILY_MESSAGE_LIMIT - dailyCount;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg }}>
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: theme.bg }}>
            <StudentNavbar />

            <div className="flex h-[calc(100vh-64px)]">
                {/* Sidebar */}
                <div
                    className="w-72 border-r flex flex-col"
                    style={{ backgroundColor: theme.card, borderColor: theme.gridBorder }}
                >
                    <div className="p-4">
                        <Button
                            className="w-full font-semibold"
                            style={{ backgroundColor: theme.accent, color: '#fff' }}
                            onPress={createNewSession}
                        >
                            + New Chat
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {sessions.map((s) => (
                            <div
                                key={s.id}
                                className={`mx-2 mb-1 p-3 rounded-lg cursor-pointer group flex justify-between items-center transition-colors ${activeSessionId === s.id ? '' : 'hover:opacity-80'
                                    }`}
                                style={{
                                    backgroundColor: activeSessionId === s.id ? theme.gridBg : 'transparent',
                                }}
                                onClick={() => setActiveSessionId(s.id)}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="truncate font-medium" style={{ color: '#1a1a1a' }}>
                                        {s.title}
                                    </p>
                                    <p className="text-xs text-default-400">
                                        {new Date(s.updated_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    className="opacity-0 group-hover:opacity-100 ml-2 text-red-500 hover:text-red-700"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSession(s.id);
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Daily limit indicator */}
                    <div className="p-4 border-t" style={{ borderColor: theme.gridBorder }}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-default-500">Today's messages</span>
                            <span
                                className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                                style={{ backgroundColor: remainingMessages > 0 ? theme.accent : '#EF4444' }}
                            >
                                {remainingMessages}/{DAILY_MESSAGE_LIMIT}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col">
                    {/* Messages */}
                    <ScrollShadow className="flex-1 p-6 overflow-y-auto">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                                    style={{ backgroundColor: theme.accent + '20' }}
                                >
                                    <span className="text-3xl" style={{ color: theme.accent }}>✦</span>
                                </div>
                                <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a1a1a' }}>
                                    Numero AI
                                </h2>
                                <p className="text-default-500 max-w-sm text-sm">
                                    Ask me anything about numerology
                                </p>
                            </div>
                        )}

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] p-4 rounded-2xl ${message.role === 'user'
                                        ? 'rounded-br-sm text-white'
                                        : 'rounded-bl-sm'
                                        }`}
                                    style={{
                                        backgroundColor: message.role === 'user' ? theme.accent : theme.gridBg,
                                        color: message.role === 'user' ? '#fff' : '#1a1a1a',
                                    }}
                                >
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                </div>
                            </div>
                        ))}

                        {isSending && (
                            <div className="flex justify-start mb-4">
                                <div
                                    className="p-4 rounded-2xl rounded-bl-sm"
                                    style={{ backgroundColor: theme.gridBg }}
                                >
                                    <Spinner size="sm" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </ScrollShadow>

                    {/* Input Area */}
                    <div
                        className="p-4 border-t"
                        style={{ backgroundColor: theme.card, borderColor: theme.gridBorder }}
                    >
                        <div className="flex gap-3 max-w-4xl mx-auto">
                            <Input
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={
                                    remainingMessages > 0
                                        ? 'Ask about numerology...'
                                        : 'Daily limit reached'
                                }
                                isDisabled={remainingMessages <= 0 || isSending}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                classNames={{
                                    inputWrapper: 'bg-default-100',
                                }}
                                size="lg"
                            />
                            <Button
                                isIconOnly
                                size="lg"
                                isDisabled={!inputText.trim() || isSending || remainingMessages <= 0}
                                onPress={sendMessage}
                                style={{
                                    backgroundColor: inputText.trim() && remainingMessages > 0 ? theme.accent : theme.gridBorder,
                                    color: '#fff',
                                }}
                            >
                                ↑
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
