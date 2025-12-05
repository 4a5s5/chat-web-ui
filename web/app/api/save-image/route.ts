import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Directory to store generated images
const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
        console.error('Failed to create data directory:', e);
    }
}

/**
 * POST /api/save-image
 * Saves a base64 image to the server and returns a URL
 * 
 * Body: { image: "data:image/png;base64,..." } or { image: "base64string" }
 * Returns: { url: "/api/media?url=file:///path/to/image.png" } or { localUrl: "/data/hash.png" }
 */
export async function POST(req: NextRequest) {
    try {
        const { image } = await req.json();

        if (!image || typeof image !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid image data' }, { status: 400 });
        }

        // Parse base64 data
        let base64Data = image;
        let ext = '.png';

        if (image.startsWith('data:')) {
            // Parse data URI: data:image/png;base64,xxxxx
            const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
            if (matches) {
                const format = matches[1];
                base64Data = matches[2];
                ext = format === 'jpeg' ? '.jpg' : `.${format}`;
            } else {
                return NextResponse.json({ error: 'Invalid data URI format' }, { status: 400 });
            }
        }

        // Generate filename from hash of content
        const hash = crypto.createHash('md5').update(base64Data).digest('hex');
        const filename = `${hash}${ext}`;
        const filePath = path.join(DATA_DIR, filename);

        // Check if file already exists
        if (fs.existsSync(filePath)) {
            console.log(`Image already exists: ${filename}`);
            return NextResponse.json({
                url: `/data/${filename}`,
                filename
            });
        }

        // Save file
        const buffer = Buffer.from(base64Data, 'base64');
        await fs.promises.writeFile(filePath, buffer);
        console.log(`Saved generated image: ${filename} (${buffer.length} bytes)`);

        return NextResponse.json({
            url: `/data/${filename}`,
            filename
        });

    } catch (error: any) {
        console.error('Save image error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
