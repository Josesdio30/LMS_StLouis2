import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

// DELETE - Soft delete a forum post
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ code: string; forumId: string; postId: string }> }
) {
    try {
        const { postId } = await params;
        const postIdNum = parseInt(postId);

        console.log('=== DELETE FORUM POST REQUEST ===');
        console.log('Post ID:', postId);
        console.log('=================================');

        if (isNaN(postIdNum)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid post ID',
                    message: 'Post ID must be a number',
                },
                { status: 400 }
            );
        }

        // Get user from session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized',
                    message: 'Authentication required to delete post',
                },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id);
        const userRole = session.user.role;

        // Find the post
        const post = await prisma.forum_posts.findUnique({
            where: { id: postIdNum },
            select: {
                id: true,
                user_id: true,
                is_deleted: true,
            },
        });

        if (!post) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Post not found',
                    message: 'Forum post not found',
                },
                { status: 404 }
            );
        }

        if (post.is_deleted) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Post already deleted',
                    message: 'This post has already been deleted',
                },
                { status: 400 }
            );
        }

        // Check permission: only post owner, teacher, or admin can delete
        const isOwner = post.user_id === userId;
        const isTeacherOrAdmin = userRole === 'TEACHER' || userRole === 'ADMIN';

        if (!isOwner && !isTeacherOrAdmin) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Forbidden',
                    message: 'You do not have permission to delete this post',
                },
                { status: 403 }
            );
        }

        // Soft delete the post
        await prisma.forum_posts.update({
            where: { id: postIdNum },
            data: {
                is_deleted: true,
                updated_at: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Post deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting forum post:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Database error',
                message: 'Failed to delete forum post',
            },
            { status: 500 }
        );
    }
}

// PUT - Update a forum post
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ code: string; forumId: string; postId: string }> }
) {
    try {
        const { postId } = await params;
        const postIdNum = parseInt(postId);
        const body = await request.json();

        console.log('=== UPDATE FORUM POST REQUEST ===');
        console.log('Post ID:', postId);
        console.log('Request Body:', body);
        console.log('=================================');

        if (isNaN(postIdNum)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid post ID',
                    message: 'Post ID must be a number',
                },
                { status: 400 }
            );
        }

        // Get user from session
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Unauthorized',
                    message: 'Authentication required to update post',
                },
                { status: 401 }
            );
        }

        const userId = parseInt(session.user.id);

        // Find the post
        const post = await prisma.forum_posts.findUnique({
            where: { id: postIdNum },
            select: {
                id: true,
                user_id: true,
                is_deleted: true,
            },
        });

        if (!post) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Post not found',
                    message: 'Forum post not found',
                },
                { status: 404 }
            );
        }

        if (post.is_deleted) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Post deleted',
                    message: 'Cannot update a deleted post',
                },
                { status: 400 }
            );
        }

        // Only post owner can edit
        if (post.user_id !== userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Forbidden',
                    message: 'You can only edit your own posts',
                },
                { status: 403 }
            );
        }

        // Update the post
        const updatedPost = await prisma.forum_posts.update({
            where: { id: postIdNum },
            data: {
                title: body.title,
                content: body.content,
                updated_at: new Date(),
            },
            include: {
                app_user: {
                    select: {
                        id: true,
                        nama_lengkap: true,
                        profile_picture_url: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                post: {
                    id: updatedPost.id,
                    title: updatedPost.title,
                    content: updatedPost.content,
                    content_type: updatedPost.content_type,
                    created_at: updatedPost.created_at,
                    updated_at: updatedPost.updated_at,
                    author: {
                        id: updatedPost.app_user?.id,
                        nama_lengkap: updatedPost.app_user?.nama_lengkap,
                        profile_picture_url: updatedPost.app_user?.profile_picture_url,
                    },
                },
            },
            message: 'Post updated successfully',
        });
    } catch (error) {
        console.error('Error updating forum post:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Database error',
                message: 'Failed to update forum post',
            },
            { status: 500 }
        );
    }
}
