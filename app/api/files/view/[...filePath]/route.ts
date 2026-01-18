import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

// GET - Serve file inline (for viewing in browser)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ filePath: string[] }> }
) {
    try {
        const { filePath } = await params;
        const fullPath = filePath.join('/');

        // Construct the full file path
        const absolutePath = path.join(process.cwd(), 'public', 'uploads', fullPath);

        // Read the file
        const fileBuffer = await readFile(absolutePath);

        // Determine content type based on extension
        const ext = path.extname(absolutePath).toLowerCase();
        const contentTypes: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';
        const fileName = path.basename(absolutePath);

        // Determine if file should be displayed inline or downloaded
        const inlineTypes = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.txt', '.html', '.mp4', '.webm', '.mp3', '.wav'];
        const disposition = inlineTypes.includes(ext) ? 'inline' : 'attachment';

        return new NextResponse(new Uint8Array(fileBuffer), {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `${disposition}; filename="${fileName}"`,
                'Content-Length': fileBuffer.length.toString(),
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);

        if (error instanceof Error && 'code' in error && (error as any).code === 'ENOENT') {
            return NextResponse.json(
                { success: false, error: 'File not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Failed to serve file' },
            { status: 500 }
        );
    }
}
