import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

// Directory to store downloaded media
const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
        console.error('Failed to create data directory:', e);
    }
}

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        // Create a safe filename from the URL hash
        const hash = crypto.createHash('md5').update(targetUrl).digest('hex');
        // Try to guess extension, default to nothing (browser handles it by content-type mostly)
        // or extract from url
        const ext = path.extname(new URL(targetUrl).pathname) || '';
        const filename = `${hash}${ext}`;
        const filePath = path.join(DATA_DIR, filename);

        // Check if file exists locally
        if (fs.existsSync(filePath)) {
            // Serve local file
            const fileBuffer = fs.readFileSync(filePath);
            // Determine content type (simplified)
            let contentType = 'application/octet-stream';
            if (ext === '.png') contentType = 'image/png';
            if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
            if (ext === '.gif') contentType = 'image/gif';
            if (ext === '.webp') contentType = 'image/webp';
            if (ext === '.mp4') contentType = 'video/mp4';
            
            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                }
            });
        }

        // File doesn't exist, download it
        console.log(`Downloading media: ${targetUrl} -> ${filename}`);
        
        const response = await fetch(targetUrl);
        if (!response.ok) {
             return NextResponse.json({ error: `Failed to fetch media: ${response.status}` }, { status: response.status });
        }

        // Get content type from upstream
        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        // Save to file
        // We need to read the body to write it, and also return it.
        // Efficient way: read to buffer (for small files) or write then read.
        // For simplicity and since we need to return it, let's buffer it.
        // Note: For very large videos, this might be memory intensive. 
        // Better: Stream to file, and simultaneous stream to response? 
        // Node Fetch Response body is a stream.
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Write async
        await fs.promises.writeFile(filePath, buffer);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            }
        });

    } catch (error: any) {
        console.error('Media proxy error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

