import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/dashboard/materials - Get recent materials for user's enrolled courses
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const userId = parseInt(session.user.id);
        const userRole = session.user.role;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '5');

        // Find active academic year if present
        const activeAcademicYear = await prisma.academic_years.findFirst({
            where: {
                is_active: true,
            },
        });

        const activeYearFilter: any = {
            is_active: true,
        };

        if (activeAcademicYear) {
            activeYearFilter.classes = {
                year_id: activeAcademicYear.id,
            };
        }

        const getClassCourseIds = async (filter: any) => {
            if (userRole === 'STUDENT') {
                const enrollments = await prisma.enrollments.findMany({
                    where: {
                        student_id: userId,
                        class_courses: filter,
                    },
                    select: {
                        class_course_id: true,
                    },
                });
                return enrollments.map(e => e.class_course_id).filter((id): id is number => id !== null);
            } else if (userRole === 'TEACHER') {
                const teachingCourses = await prisma.class_courses.findMany({
                    where: {
                        ...filter,
                        teacher_id: userId,
                    },
                    select: {
                        id: true,
                    },
                });
                return teachingCourses.map(c => c.id);
            } else if (userRole === 'ADMIN') {
                const allCourses = await prisma.class_courses.findMany({
                    where: filter,
                    select: {
                        id: true,
                    },
                    take: 50,
                });
                return allCourses.map(c => c.id);
            }
            return [];
        };

        let classCourseIds = await getClassCourseIds(activeYearFilter);

        // Fallback: If filtering by active academic year returns no courses, fall back to general active class_courses
        if (classCourseIds.length === 0 && activeAcademicYear) {
            classCourseIds = await getClassCourseIds({ is_active: true });
        }

        if (classCourseIds.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    materials: [],
                    resources: [],
                },
            });
        }

        // Get recent materials (from materials table)
        const recentMaterials = await prisma.materials.findMany({
            where: {
                sessions: {
                    class_course_id: {
                        in: classCourseIds,
                    },
                },
            },
            include: {
                sessions: {
                    include: {
                        class_courses: {
                            include: {
                                courses: {
                                    select: {
                                        course_code: true,
                                        course_name: true,
                                    },
                                },
                                classes: {
                                    select: {
                                        class_name: true,
                                    },
                                },
                                app_user: {
                                    select: {
                                        nama_lengkap: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
            take: limit,
        });

        // Get recent resources (uploaded files)
        const recentResources = await prisma.resources.findMany({
            where: {
                sessions: {
                    class_course_id: {
                        in: classCourseIds,
                    },
                },
            },
            include: {
                sessions: {
                    include: {
                        class_courses: {
                            include: {
                                courses: {
                                    select: {
                                        course_code: true,
                                        course_name: true,
                                    },
                                },
                                classes: {
                                    select: {
                                        class_name: true,
                                    },
                                },
                            },
                        },
                    },
                },
                app_user: {
                    select: {
                        nama_lengkap: true,
                    },
                },
            },
            orderBy: {
                id: 'desc',
            },
            take: limit,
        });

        return NextResponse.json({
            success: true,
            data: {
                materials: recentMaterials.map(m => ({
                    id: m.id,
                    title: m.title,
                    content: m.content?.substring(0, 200),
                    created_at: m.created_at,
                    session_id: m.session_id,
                    session_title: m.sessions?.title,
                    session_number: m.sessions?.session_number,
                    course_code: m.sessions?.class_courses?.courses?.course_code,
                    course_name: m.sessions?.class_courses?.courses?.course_name,
                    class_name: m.sessions?.class_courses?.classes?.class_name,
                    teacher_name: m.sessions?.class_courses?.app_user?.nama_lengkap,
                    type: 'material',
                })),
                resources: recentResources.map(r => ({
                    id: r.id,
                    title: r.file_tittle || r.file_name,
                    file_name: r.file_name,
                    file_url: r.file_url,
                    file_type: r.file_type,
                    file_size: r.file_size,
                    session_id: r.session_id,
                    session_title: r.sessions?.title,
                    session_number: r.sessions?.session_number,
                    course_code: r.sessions?.class_courses?.courses?.course_code,
                    course_name: r.sessions?.class_courses?.courses?.course_name,
                    class_name: r.sessions?.class_courses?.classes?.class_name,
                    uploader_name: r.app_user?.nama_lengkap,
                    type: 'resource',
                })),
            },
        });
    } catch (error) {
        console.error('Error fetching dashboard materials:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch materials' },
            { status: 500 }
        );
    }
}
