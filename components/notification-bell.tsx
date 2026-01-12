'use client';

import { useState, useEffect, useRef } from 'react';
import { FaBell, FaBook, FaComments, FaTasks, FaBullhorn, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

interface Notification {
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    notification_type: string;
    related_entity_type?: string;
    related_entity_id?: number;
    created_at: string;
    read_at?: string;
}

interface NotificationBellProps {
    className?: string;
}

const getNotificationIcon = (type: string) => {
    switch (type) {
        case 'material':
            return <FaBook className="text-blue-500" />;
        case 'forum':
        case 'forum_reply':
            return <FaComments className="text-green-500" />;
        case 'assignment':
            return <FaTasks className="text-orange-500" />;
        case 'announcement':
            return <FaBullhorn className="text-purple-500" />;
        default:
            return <FaBell className="text-gray-500" />;
    }
};

const NotificationBell = ({ className }: NotificationBellProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/notifications?limit=10');
            const result = await response.json();

            if (result.success) {
                setNotifications(result.data.notifications);
                setUnreadCount(result.data.unreadCount);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: number) => {
        try {
            const response = await fetch(`/api/notifications/${id}`, {
                method: 'PUT',
            });

            if (response.ok) {
                setNotifications(prev =>
                    prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetch('/api/notifications/read-all', {
                method: 'PUT',
            });

            if (response.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }

        // Navigate to related entity if available
        if (notification.related_entity_type && notification.related_entity_id) {
            let url = '';
            switch (notification.related_entity_type) {
                case 'session':
                    url = `/course?sessionId=${notification.related_entity_id}`;
                    break;
                case 'forum':
                    url = `/forum/${notification.related_entity_id}`;
                    break;
                case 'assignment':
                    url = `/assignment/${notification.related_entity_id}`;
                    break;
                default:
                    break;
            }
            if (url) {
                window.location.href = url;
            }
        }

        setIsOpen(false);
    };

    useEffect(() => {
        fetchNotifications();

        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) fetchNotifications();
                }}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                title="Notifikasi"
            >
                <FaBell className="text-xl" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[70vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <h3 className="font-semibold text-gray-800">Notifikasi</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                                <FaCheckDouble className="text-xs" />
                                Tandai semua dibaca
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto max-h-[50vh]">
                        {loading && notifications.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                                <FaBell className="text-4xl mb-2 text-gray-300" />
                                <p>Tidak ada notifikasi</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${!notification.is_read ? 'bg-blue-50' : ''
                                        }`}
                                >
                                    <div className="flex-shrink-0 mt-1">
                                        {getNotificationIcon(notification.notification_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'} text-gray-900 truncate`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {formatDistanceToNow(new Date(notification.created_at), {
                                                addSuffix: true,
                                                locale: id,
                                            })}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
                                        <div className="flex-shrink-0">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                            <a
                                href="/notifications"
                                className="text-sm text-blue-600 hover:text-blue-800 block text-center"
                            >
                                Lihat semua notifikasi
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
