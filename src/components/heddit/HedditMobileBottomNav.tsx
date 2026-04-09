import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Trophy, Users, FileText, Bell } from 'lucide-react';

interface HedditMobileBottomNavProps {
  unreadMessageCount: number;
  unreadNotificationCount?: number;
}

export default function HedditMobileBottomNav({ unreadMessageCount, unreadNotificationCount = 0 }: HedditMobileBottomNavProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { path: '/heddit', icon: Home, label: 'Home', exact: true },
    { path: '/heddit/communities', icon: Users, label: 'Communities' },
    { path: '/heddit/messages', icon: MessageCircle, label: 'Messages', badge: unreadMessageCount },
    { path: '/heddit/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { path: '/heddit/drafts', icon: FileText, label: 'Drafts' },
  ];

  const isItemActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname === item.path;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const active = isItemActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center flex-1 h-full px-1 transition-colors touch-manipulation ${
                active ? 'text-orange-500' : 'text-gray-500 active:text-orange-400'
              }`}
            >
              <div className="relative">
                <item.icon className={`w-6 h-6 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs mt-0.5 ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
