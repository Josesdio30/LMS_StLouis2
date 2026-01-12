import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const unreadOnly = searchParams.get('unreadOnly') === 'true';

        const where: any = {
            user_id: userId,
        };

        if (unreadOnly) {
            where.is_read = false;
        }

        const notifications = await prisma.notifications.findMany({
            where,
            orderBy: {
                created_at: 'desc',
            },
            take: limit,
        });

        // Get unread count
        const unreadCount = await prisma.notifications.count({
            where: {
                user_id: userId,
                is_read: false,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                notifications,
                unreadCount,
            },
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}

// POST /api/notifications - Create notification (internal use)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            user_id,
            user_ids, // Array of user IDs for bulk notifications
            title,
            message,
            notification_type,
            related_entity_type,
            related_entity_id,
        } = body;

        if (!title || !message || !notification_type) {
            return NextResponse.json(
                { success: false, error: 'Title, message, and notification_type are required' },
                { status: 400 }
            );
        }

        // Handle bulk notifications
        if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
            const notifications = await prisma.notifications.createMany({
                data: user_ids.map((uid: number) => ({
                    user_id: uid,
                    title,
                    message,
                    notification_type,
                    related_entity_type,
                    related_entity_id,
                    is_read: false,
                    created_at: new Date(),
                })),
            });

            return NextResponse.json({
                success: true,
                data: { count: notifications.count },
                message: `${notifications.count} notifications created`,
            });
        }

        // Single notification
        if (!user_id) {
            return NextResponse.json(
                { success: false, error: 'user_id or user_ids is required' },
                { status: 400 }
            );
        }

        const notification = await prisma.notifications.create({
            data: {
                user_id,
                title,
                message,
                notification_type,
                related_entity_type,
                related_entity_id,
                is_read: false,
                created_at: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            data: notification,
            message: 'Notification created',
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create notification' },
            { status: 500 }
        );
    }
}
