import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * GET /data/[filename]
 * Serves static files from the data directory
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { filename } = await params;

    if (!filename) {
        return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
    }

    // Security: prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(DATA_DIR, safeName);

    try {
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(safeName).toLowerCase();

        let contentType = 'application/octet-stream';
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.webp') contentType = 'image/webp';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.mp4') contentType = 'video/mp4';
        else if (ext === '.webm') contentType = 'video/webm';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            }
        });

    } catch (error: any) {
        console.error('Data file serve error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
