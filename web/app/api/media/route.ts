import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

function getExtensionFromContentType(contentType: string): string {
    if (!contentType) return '';
    const type = contentType.split(';')[0].trim();
    switch (type) {
        case 'image/jpeg': return '.jpg';
        case 'image/png': return '.png';
        case 'image/gif': return '.gif';
        case 'image/webp': return '.webp';
        case 'image/svg+xml': return '.svg';
        case 'video/mp4': return '.mp4';
        case 'video/webm': return '.webm';
        case 'video/quicktime': return '.mov';
        default: return '';
    }
}

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        // Create a stable hash for the filename
        const hash = crypto.createHash('md5').update(targetUrl).digest('hex');
        
        // Check if we already have a file with this hash (any extension)
        const existingFile = fs.readdirSync(DATA_DIR).find(file => file.startsWith(hash));
        
        if (existingFile) {
            const filePath = path.join(DATA_DIR, existingFile);
            const fileBuffer = fs.readFileSync(filePath);
            // Guess content type from extension
            const ext = path.extname(existingFile);
            let contentType = 'application/octet-stream';
            if (ext === '.jpg') contentType = 'image/jpeg';
            else if (ext === '.png') contentType = 'image/png';
            else if (ext === '.webp') contentType = 'image/webp';
            else if (ext === '.gif') contentType = 'image/gif';
            else if (ext === '.mp4') contentType = 'video/mp4';
            
            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                }
            });
        }

        // File not found, download it
        console.log(`Downloading media: ${targetUrl}`);
        
        const response = await fetch(targetUrl);
        if (!response.ok) {
            console.error(`Failed to fetch ${targetUrl}: ${response.status}`);
            return NextResponse.json({ error: `Failed to fetch media: ${response.status}` }, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        let ext = getExtensionFromContentType(contentType);
        
        // If content-type didn't give us an extension, try the URL
        if (!ext) {
            const urlPath = new URL(targetUrl).pathname;
            // Handle cases like /file.webp/0 -> .webp
            // Remove trailing slash and numbers if present?
            // Simple regex to find the last dot extension before any slash
            const cleanPath = urlPath.replace(/\/+\d+$/, ''); 
            ext = path.extname(cleanPath);
        }

        const filename = `${hash}${ext}`;
        const filePath = path.join(DATA_DIR, filename);

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await fs.promises.writeFile(filePath, buffer);
        console.log(`Saved media to ${filePath}`);

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
