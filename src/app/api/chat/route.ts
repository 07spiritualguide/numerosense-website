import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for OpenRouter AI API
 * This keeps the API key secure on the server
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { messages, model } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array is required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            console.error('OPENROUTER_API_KEY not configured');
            return NextResponse.json(
                { error: 'AI service not configured' },
                { status: 500 }
            );
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://numerosense.com',
                'X-Title': 'NumeroSense',
            },
            body: JSON.stringify({
                model: model || 'nvidia/nemotron-3-nano-30b-a3b:free',
                messages,
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error('OpenRouter error:', data.error);
            return NextResponse.json(
                { error: data.error.message || 'AI service error' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Failed to process chat request' },
            { status: 500 }
        );
    }
}

// CORS headers for mobile app
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
