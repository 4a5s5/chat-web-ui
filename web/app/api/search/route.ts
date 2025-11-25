import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { query, provider, apiKey } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    let searchResults = '';

    if (provider === 'tavily') {
        if (!apiKey) return NextResponse.json({ error: 'Missing Tavily API Key' }, { status: 400 });
        
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: 'basic',
                include_answer: false,
                include_images: false,
                max_results: 5
            })
        });
        
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Tavily Error: ${err}`);
        }
        
        const data = await response.json();
        searchResults = data.results.map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join('\n\n');

    } else if (provider === 'bing') {
        if (!apiKey) return NextResponse.json({ error: 'Missing Bing API Key' }, { status: 400 });
        
        const response = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=5`, {
            headers: { 'Ocp-Apim-Subscription-Key': apiKey }
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Bing Error: ${err}`);
        }

        const data = await response.json();
        searchResults = data.webPages?.value?.map((r: any) => `Title: ${r.name}\nURL: ${r.url}\nSnippet: ${r.snippet}`).join('\n\n') || 'No results';
    } else {
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    return NextResponse.json({ results: searchResults });

  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

