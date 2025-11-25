import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { targetUrl, method, headers, body } = await req.json();

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing targetUrl' }, { status: 400 });
    }

    const response = await fetch(targetUrl, {
      method: method || 'POST',
      headers: headers || {},
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({ error: `Upstream Error: ${response.status} - ${errorText}` }, { status: response.status });
    }

    // Handle streaming response
    if (headers?.['Accept'] === 'text/event-stream' || 
        response.headers.get('content-type')?.includes('text/event-stream') ||
        body?.stream === true // Explicitly check body for stream flag as OpenAI clients usually set it there but headers might vary
    ) {
        return new Response(response.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');
    const apiKey = req.headers.get('Authorization');

    if (!targetUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'Authorization': apiKey || '',
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
             const errorText = await response.text();
             return NextResponse.json({ error: `Upstream Error: ${response.status} - ${errorText}` }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Proxy GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
