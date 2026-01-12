'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import NotificationBell from '@/components/notification-bell';

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();

  const pathTitleMap: Record<string, string> = {
    '/dashboard': 'MY DASHBOARD',
    '/course': 'MY COURSE',
    '/forum': 'MY FORUM',
    '/session': 'MY SESSION',
    '/schedule': 'MY SCHEDULE',
    '/course/[code]': 'MY COURSE DETAIL',
  };

  const pageTitle = pathTitleMap[pathname] || 'MY PAGE';

  return (
    <div className="w-full h-14 bg-white flex items-center justify-between px-4 border-b shadow-sm">
      {/* Left side */}
      <div className="flex items-center space-x-4">
        {/* Mobile Burger Button */}
        <button className="md:hidden" onClick={onMenuClick}>
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <div className="hidden md:flex items-center space-x-2">
          <Image src="/st_louis-2.png" alt="Logo" width={250} height={250} className="object-contain" />
          <span className="text-gray-500 mx-2">|</span>
          <span className="text-sm text-gray-700 font-bold">{pageTitle}</span>
        </div>
      </div>
      {/* Right side - Notification */}
      <div className="flex items-center space-x-6">
        <NotificationBell />
      </div>
    </div>
  );
}
