import { prisma } from '@/lib/prisma';

interface CreateNotificationParams {
    userId: number;
    title: string;
    message: string;
    notificationType: 'material' | 'forum' | 'forum_reply' | 'assignment' | 'announcement' | 'general';
    relatedEntityType?: string;
    relatedEntityId?: number;
}

interface CreateBulkNotificationParams {
    userIds: number[];
    title: string;
    message: string;
    notificationType: 'material' | 'forum' | 'forum_reply' | 'assignment' | 'announcement' | 'general';
    relatedEntityType?: string;
    relatedEntityId?: number;
}

/**
 * Create a single notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
    const { userId, title, message, notificationType, relatedEntityType, relatedEntityId } = params;

    return await prisma.notifications.create({
        data: {
            user_id: userId,
            title,
            message,
            notification_type: notificationType,
            related_entity_type: relatedEntityType,
            related_entity_id: relatedEntityId,
            is_read: false,
            created_at: new Date(),
        },
    });
}

/**
 * Create notifications for multiple users (bulk)
 */
export async function createBulkNotifications(params: CreateBulkNotificationParams) {
    const { userIds, title, message, notificationType, relatedEntityType, relatedEntityId } = params;

    if (userIds.length === 0) return { count: 0 };

    return await prisma.notifications.createMany({
        data: userIds.map(userId => ({
            user_id: userId,
            title,
            message,
            notification_type: notificationType,
            related_entity_type: relatedEntityType,
            related_entity_id: relatedEntityId,
            is_read: false,
            created_at: new Date(),
        })),
    });
}

/**
 * Get all student IDs enrolled in a class course
 */
export async function getEnrolledStudentIds(classCourseId: number): Promise<number[]> {
    const enrollments = await prisma.enrollments.findMany({
        where: {
            class_course_id: classCourseId,
        },
        select: {
            student_id: true,
        },
    });

    return enrollments
        .map(e => e.student_id)
        .filter((id): id is number => id !== null);
}

/**
 * Get class course ID from session ID
 */
export async function getClassCourseFromSession(sessionId: number) {
    const session = await prisma.sessions.findUnique({
        where: { id: sessionId },
        include: {
            class_courses: {
                include: {
                    courses: true,
                    classes: true,
                },
            },
        },
    });

    return session?.class_courses;
}

/**
 * Notify all students in a class when new material is added
 */
export async function notifyNewMaterial(
    sessionId: number,
    materialTitle: string,
    teacherName: string
) {
    const classCourse = await getClassCourseFromSession(sessionId);
    if (!classCourse) return;

    const studentIds = await getEnrolledStudentIds(classCourse.id);
    if (studentIds.length === 0) return;

    const courseName = classCourse.courses?.course_name || 'Course';
    const className = classCourse.classes?.class_name || '';

    await createBulkNotifications({
        userIds: studentIds,
        title: `📚 Materi Baru: ${materialTitle}`,
        message: `${teacherName} menambahkan materi baru di ${courseName} (${className})`,
        notificationType: 'material',
        relatedEntityType: 'session',
        relatedEntityId: sessionId,
    });
}

/**
 * Notify all students in a class when new resource is uploaded
 */
export async function notifyNewResource(
    sessionId: number,
    resourceTitle: string,
    uploaderName: string
) {
    const classCourse = await getClassCourseFromSession(sessionId);
    if (!classCourse) return;

    const studentIds = await getEnrolledStudentIds(classCourse.id);
    if (studentIds.length === 0) return;

    const courseName = classCourse.courses?.course_name || 'Course';
    const className = classCourse.classes?.class_name || '';

    await createBulkNotifications({
        userIds: studentIds,
        title: `📁 File Baru: ${resourceTitle}`,
        message: `${uploaderName} mengupload file baru di ${courseName} (${className})`,
        notificationType: 'material',
        relatedEntityType: 'session',
        relatedEntityId: sessionId,
    });
}

/**
 * Notify user when someone replies to their forum post
 */
export async function notifyForumReply(
    postOwnerId: number,
    postTitle: string,
    replierName: string,
    forumId: number
) {
    await createNotification({
        userId: postOwnerId,
        title: `💬 Balasan Baru`,
        message: `${replierName} membalas postingan "${postTitle}"`,
        notificationType: 'forum_reply',
        relatedEntityType: 'forum',
        relatedEntityId: forumId,
    });
}

/**
 * Notify all students in a class when new assignment is created
 */
export async function notifyNewAssignment(
    classCourseId: number,
    assignmentTitle: string,
    teacherName: string,
    dueDate: Date
) {
    const studentIds = await getEnrolledStudentIds(classCourseId);
    if (studentIds.length === 0) return;

    const classCourse = await prisma.class_courses.findUnique({
        where: { id: classCourseId },
        include: {
            courses: true,
            classes: true,
        },
    });

    const courseName = classCourse?.courses?.course_name || 'Course';
    const className = classCourse?.classes?.class_name || '';
    const dueDateStr = dueDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    await createBulkNotifications({
        userIds: studentIds,
        title: `📝 Tugas Baru: ${assignmentTitle}`,
        message: `${teacherName} membuat tugas baru di ${courseName} (${className}). Deadline: ${dueDateStr}`,
        notificationType: 'assignment',
        relatedEntityType: 'assignment',
        relatedEntityId: classCourseId,
    });
}
