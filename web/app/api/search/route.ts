import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(req: NextRequest) {
  try {
    const { query, provider, apiKey, extraConfig } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    let searchResults: Array<{title: string, url: string, content: string}> = [];

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    switch (provider) {
        case 'tavily':
            if (!apiKey) return NextResponse.json({ error: 'Missing Tavily API Key' }, { status: 400 });
            const tavilyRes = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: query,
                    search_depth: 'basic',
                    max_results: 5
                })
            });
            if (!tavilyRes.ok) throw new Error('Tavily API Error');
            const tavilyData = await tavilyRes.json();
            searchResults = tavilyData.results.map((r: any) => ({
                title: r.title,
                url: r.url,
                content: r.content
            }));
            break;

        case 'bing_api':
            if (!apiKey) return NextResponse.json({ error: 'Missing Bing API Key' }, { status: 400 });
            const bingRes = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=5`, {
                headers: { 'Ocp-Apim-Subscription-Key': apiKey }
            });
            if (!bingRes.ok) throw new Error('Bing API Error');
            const bingData = await bingRes.json();
            searchResults = bingData.webPages?.value?.map((r: any) => ({
                title: r.name,
                url: r.url,
                content: r.snippet
            })) || [];
            break;

        case 'bing_free':
            const bingHtml = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, {
                headers: { 'User-Agent': userAgent }
            }).then(r => r.text());
            
            const $bing = cheerio.load(bingHtml);
            $bing('li.b_algo').each((i, el) => {
                if (searchResults.length >= 5) return;
                const title = $bing(el).find('h2 a').text();
                const url = $bing(el).find('h2 a').attr('href');
                const content = $bing(el).find('.b_caption p').text();
                if (title && url) {
                    searchResults.push({ title, url, content });
                }
            });
            break;

        case 'google_free':
            const googleHtml = await fetch(`https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`, {
                headers: { 'User-Agent': userAgent }
            }).then(r => r.text());
            
            const $google = cheerio.load(googleHtml);
            $google('.g').each((i, el) => {
                if (searchResults.length >= 5) return;
                const title = $google(el).find('h3').text();
                const url = $google(el).find('a').attr('href');
                const content = $google(el).find('.VwiC3b').text() || $google(el).find('.IsZvec').text(); // Common snippets classes
                if (title && url && url.startsWith('http')) {
                    searchResults.push({ title, url, content });
                }
            });
            break;

        case 'baidu_free':
            const baiduHtml = await fetch(`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`, {
                headers: { 'User-Agent': userAgent }
            }).then(r => r.text());
            
            const $baidu = cheerio.load(baiduHtml);
            $baidu('.result.c-container').each((i, el) => {
                if (searchResults.length >= 5) return;
                const title = $baidu(el).find('h3 a').text();
                const url = $baidu(el).find('h3 a').attr('href'); // Baidu URLs are encrypted/redirects usually
                const content = $baidu(el).find('.c-abstract').text();
                if (title && url) {
                    searchResults.push({ title, url, content });
                }
            });
            break;
            
        case 'searxng':
            const searxngUrl = extraConfig?.searxngUrl || 'https://searx.be'; // Default public instance fallback
            const searxUrl = `${searxngUrl}/search?q=${encodeURIComponent(query)}&format=json`;
            const searxRes = await fetch(searxUrl, {
                headers: { 'User-Agent': userAgent }
            });
            if (!searxRes.ok) throw new Error('Searxng Error');
            const searxData = await searxRes.json();
            searchResults = searxData.results?.slice(0, 5).map((r: any) => ({
                title: r.title,
                url: r.url,
                content: r.content
            })) || [];
            break;

        default:
            return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    // Format the string output
    const formattedResults = searchResults.map((r, i) => 
        `[${i + 1}] ${r.title}\nSource: ${r.url}\nSummary: ${r.content}`
    ).join('\n\n');

    return NextResponse.json({ 
        results: formattedResults,
        data: searchResults // Return structured data too if needed later
    });

  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: error.message || 'Search failed' }, { status: 500 });
  }
}
