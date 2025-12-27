import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

// Using POST method as requested for edit operation
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
        const {
            sessionId,
            title,
            description,
            startTime,
            endTime,
            date,
            sessionNumber,
            isCompleted,
            courseCode,
            teacherId,
            classId
        } = body;

        if (!sessionId) {
            return NextResponse.json(
                { success: false, error: 'Session ID is required' },
                { status: 400 }
            );
        }

        // Check if session exists
        const existingSession = await prisma.sessions.findUnique({
            where: { id: parseInt(sessionId) },
            include: {
                class_courses: true,
            },
        });

        if (!existingSession) {
            return NextResponse.json(
                { success: false, error: 'Session not found' },
                { status: 404 }
            );
        }

        // Build update data object for session
        const updateData: any = {};

        if (title !== undefined && title !== '') {
            updateData.title = title;
        }

        if (description !== undefined) {
            updateData.description = description;
        }

        if (sessionNumber !== undefined && sessionNumber !== '') {
            updateData.session_number = parseInt(sessionNumber);
        }

        if (isCompleted !== undefined) {
            updateData.is_completed = isCompleted;
            if (isCompleted) {
                updateData.completed_at = new Date();
            } else {
                updateData.completed_at = null;
            }
        }

        // Update date and time if provided
        if (date && startTime) {
            updateData.start_time = new Date(`${date}T${startTime}`);
        }

        if (date && endTime) {
            updateData.end_time = new Date(`${date}T${endTime}`);
        }

        // Validate time range if both are being updated
        if (updateData.start_time && updateData.end_time) {
            if (updateData.start_time >= updateData.end_time) {
                return NextResponse.json(
                    { success: false, error: 'End time must be after start time' },
                    { status: 400 }
                );
            }
        }

        // If course, teacher, or class is being changed, we need to update class_course_id
        if (courseCode && teacherId && classId) {
            // Find or create the class_course
            const course = await prisma.courses.findUnique({
                where: { course_code: courseCode },
            });

            if (!course) {
                return NextResponse.json(
                    { success: false, error: 'Course not found' },
                    { status: 404 }
                );
            }

            let classCourse = await prisma.class_courses.findFirst({
                where: {
                    course_id: course.id,
                    class_id: parseInt(classId),
                    is_active: true,
                },
            });

            if (!classCourse) {
                // Create new class_course
                try {
                    classCourse = await prisma.class_courses.create({
                        data: {
                            course_id: course.id,
                            class_id: parseInt(classId),
                            teacher_id: parseInt(teacherId),
                            start_date: new Date(),
                            end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                            is_active: true,
                        },
                    });
                } catch (err: any) {
                    if (err.code === 'P2002') {
                        classCourse = await prisma.class_courses.findFirst({
                            where: {
                                course_id: course.id,
                                class_id: parseInt(classId),
                                is_active: true,
                            },
                        });
                    } else {
                        throw err;
                    }
                }
            }

            if (classCourse) {
                // Update teacher if different
                if (classCourse.teacher_id !== parseInt(teacherId)) {
                    await prisma.class_courses.update({
                        where: { id: classCourse.id },
                        data: { teacher_id: parseInt(teacherId) },
                    });
                }
                updateData.class_course_id = classCourse.id;
            }
        } else if (teacherId && existingSession.class_courses) {
            // Only updating teacher for existing class_course
            await prisma.class_courses.update({
                where: { id: existingSession.class_courses.id },
                data: { teacher_id: parseInt(teacherId) },
            });
        }

        // Update the session
        const updatedSession = await prisma.sessions.update({
            where: { id: parseInt(sessionId) },
            data: updateData,
            include: {
                class_courses: {
                    include: {
                        courses: true,
                        classes: true,
                        app_user: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: updatedSession.id,
                title: updatedSession.title,
                description: updatedSession.description,
                start_time: updatedSession.start_time,
                end_time: updatedSession.end_time,
                session_number: updatedSession.session_number,
                is_completed: updatedSession.is_completed,
                course_code: updatedSession.class_courses?.courses?.course_code,
                class_name: updatedSession.class_courses?.classes?.class_name,
                teacher_name: updatedSession.class_courses?.app_user?.nama_lengkap,
            },
            message: 'Session updated successfully',
        });

    } catch (error) {
        console.error('Error updating session:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                message: 'Failed to update session',
            },
            { status: 500 }
        );
    }
}
