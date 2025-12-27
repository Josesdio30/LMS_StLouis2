import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

// Using POST method as requested for delete operation
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const userDetails = await prisma.app_user.findUnique({
            where: { id: parseInt(session.user.id) },
            include: {
                app_user_role: {
                    include: {
                        enumeration: true,
                    },
                },
            },
        });

        if (!userDetails) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const isAdmin = userDetails.app_user_role?.some(
            role => role.enumeration?.name?.toLowerCase() === 'admin' && role.is_active
        );

        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { sessionId } = body;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: 'Session ID is required' },
                { status: 400 }
            );
        }

        // Check if session exists
        const existingSession = await prisma.sessions.findUnique({
            where: { id: parseInt(sessionId) },
        });

        if (!existingSession) {
            return NextResponse.json(
                { success: false, error: 'Session not found' },
                { status: 404 }
            );
        }

        // Delete the session - Prisma cascade will handle related records:
        // - materials (onDelete: Cascade)
        // - resources (onDelete: Cascade)
        // - attendance (onDelete: Cascade)
        // - forums (onDelete: Cascade)
        // - assignments (onDelete: Cascade) -> assignment_submissions, assignment_questions
        await prisma.sessions.delete({
            where: { id: parseInt(sessionId) },
        });

        return NextResponse.json({
            success: true,
            message: 'Session deleted successfully',
        });

    } catch (error) {
        console.error('Error deleting session:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Failed to delete session',
            },
            { status: 500 }
        );
    }
}
