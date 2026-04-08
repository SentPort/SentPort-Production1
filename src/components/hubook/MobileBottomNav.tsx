import { Link, useLocation } from 'react-router-dom';
import { Home, User, Users, Image, MessageCircle, Menu } from 'lucide-react';
import { useState } from 'react';

interface MobileBottomNavProps {
  unreadMessagesCount: number;
  onMenuClick: () => void;
}

export default function MobileBottomNav({ unreadMessagesCount, onMenuClick }: MobileBottomNavProps) {
  const location = useLocation();
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/hubook', icon: Home, label: 'Home' },
    { path: '/hubook/friends', icon: Users, label: 'Friends' },
    { path: '/hubook/photos', icon: Image, label: 'Photos' },
    { path: '/hubook/messages', icon: MessageCircle, label: 'Messages', badge: unreadMessagesCount },
    { path: '/hubook/profile', icon: User, label: 'Profile' }
  ];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.touches[0].clientY;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      setTouchStart(null);
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 safe-area-inset-bottom"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`relative flex flex-col items-center justify-center flex-1 h-full px-1 transition-colors touch-manipulation ${
              isActive(item.path)
                ? 'text-blue-600'
                : 'text-gray-600 active:text-blue-500'
            }`}
          >
            <div className="relative">
              <item.icon className={`w-6 h-6 ${isActive(item.path) ? 'stroke-[2.5]' : 'stroke-2'}`} />
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className={`text-xs mt-0.5 ${isActive(item.path) ? 'font-semibold' : 'font-medium'}`}>
              {item.label}
            </span>
          </Link>
        ))}
        <button
          onClick={onMenuClick}
          className="relative flex flex-col items-center justify-center flex-1 h-full px-1 text-gray-600 active:text-blue-500 transition-colors touch-manipulation"
        >
          <Menu className="w-6 h-6 stroke-2" />
          <span className="text-xs mt-0.5 font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
