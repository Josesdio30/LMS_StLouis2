import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

// PUT /api/notifications/[id]/read - Mark notification as read
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const notificationId = parseInt(id);
        const userId = parseInt(session.user.id);

        // Verify notification belongs to user
        const notification = await prisma.notifications.findFirst({
            where: {
                id: notificationId,
                user_id: userId,
            },
        });

        if (!notification) {
            return NextResponse.json(
                { success: false, error: 'Notification not found' },
                { status: 404 }
            );
        }

        // Mark as read
        const updated = await prisma.notifications.update({
            where: { id: notificationId },
            data: {
                is_read: true,
                read_at: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            data: updated,
            message: 'Notification marked as read',
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update notification' },
            { status: 500 }
        );
    }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const notificationId = parseInt(id);
        const userId = parseInt(session.user.id);

        // Verify notification belongs to user
        const notification = await prisma.notifications.findFirst({
            where: {
                id: notificationId,
                user_id: userId,
            },
        });

        if (!notification) {
            return NextResponse.json(
                { success: false, error: 'Notification not found' },
                { status: 404 }
            );
        }

        await prisma.notifications.delete({
            where: { id: notificationId },
        });

        return NextResponse.json({
            success: true,
            message: 'Notification deleted',
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete notification' },
            { status: 500 }
        );
    }
}
