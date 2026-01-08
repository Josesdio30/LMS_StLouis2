import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Content type mapping for common file extensions
const CONTENT_TYPE_MAP: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    txt: 'text/plain',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathSegments } = await params;

        // Join path segments and sanitize (remove any attempts to traverse outside)
        const relativePath = path.join(...pathSegments);

        // Construct absolute path to the file in public/uploads
        const absolutePath = path.join(process.cwd(), 'public', 'uploads', relativePath);

        // Basic security check: ensure the resulting path is still within public/uploads
        const uploadsBase = path.join(process.cwd(), 'public', 'uploads');
        if (!absolutePath.startsWith(uploadsBase)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        // Check if file exists
        if (!existsSync(absolutePath)) {
            return new NextResponse('File Not Found', { status: 404 });
        }

        // Get file info
        const fileStats = await stat(absolutePath);
        if (!fileStats.isFile()) {
            return new NextResponse('Not a File', { status: 404 });
        }

        // Determine content type
        const ext = path.extname(absolutePath).toLowerCase().slice(1);
        const contentType = CONTENT_TYPE_MAP[ext] || 'application/octet-stream';

        // Read file and return as response
        const fileBuffer = await readFile(absolutePath);

        return new NextResponse(new Uint8Array(fileBuffer), {
            headers: {
                'Content-Type': contentType,
                'Content-Length': fileStats.size.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });

    } catch (error) {
        console.error('Error serving file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
