import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

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
        const { userId } = body;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'User ID is required' },
                { status: 400 }
            );
        }

        const id = parseInt(userId);
        const existingUser = await prisma.app_user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        await prisma.app_user.update({
            where: { id },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: parseInt(session.user.id)
            },
        });

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully',
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Failed to delete user',
            },
            { status: 500 }
        );
    }
}
