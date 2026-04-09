import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, Trophy, Users, FileText, Bell, Plus } from 'lucide-react';

interface HedditMobileBottomNavProps {
  unreadMessageCount: number;
  unreadNotificationCount?: number;
  showCreateButton?: boolean;
}

export default function HedditMobileBottomNav({ unreadMessageCount, unreadNotificationCount = 0, showCreateButton = false }: HedditMobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const primaryNavItems = [
    { path: '/heddit', icon: Home, label: 'Home', exact: true },
    { path: '/heddit/communities', icon: Users, label: 'Communities' },
    { path: '/heddit/messages', icon: MessageCircle, label: 'Messages', badge: unreadMessageCount },
    { path: '/heddit/leaderboard', icon: Trophy, label: 'Leaderboard' },
  ];

  const draftsItem = { path: '/heddit/drafts', icon: FileText, label: 'Drafts' };

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname === path;
  };

  const isDraftsActive = isItemActive(draftsItem.path);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-14 px-1 border-b border-gray-100">
        {primaryNavItems.map((item) => {
          const active = isItemActive(item.path, item.exact);
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
      <div className="flex items-center justify-around h-11 px-4 gap-3">
        <Link
          to={draftsItem.path}
          className={`relative flex flex-row items-center justify-center gap-2 flex-1 h-full transition-colors touch-manipulation ${
            isDraftsActive ? 'text-orange-500' : 'text-gray-500 active:text-orange-400'
          }`}
        >
          <draftsItem.icon className={`w-5 h-5 ${isDraftsActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className={`text-sm ${isDraftsActive ? 'font-semibold' : 'font-medium'}`}>
            Drafts
          </span>
        </Link>
        {showCreateButton && (
          <button
            onClick={() => navigate('/heddit/create-post')}
            className="flex items-center gap-2 px-4 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors touch-manipulation"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Create Post</span>
          </button>
        )}
      </div>
    </nav>
  );
}
