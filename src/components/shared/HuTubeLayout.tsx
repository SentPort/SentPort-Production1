import { ReactNode, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, ArrowUp, Search, TrendingUp, Bell, History, Clock, Menu, List, Video, ThumbsUp, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PlatformHeaderDropdown from './PlatformHeaderDropdown';
import PlatformBackButton from './PlatformBackButton';
import UniversalNavigationDropdown from './UniversalNavigationDropdown';
import SubscriptionsSidebarSection from '../hutube/SubscriptionsSidebarSection';
import SubscriptionsMobileSection from '../hutube/SubscriptionsMobileSection';
import NotificationBellDropdown from '../hutube/NotificationBellDropdown';
import { HuTubeNotificationProvider } from '../../contexts/HuTubeNotificationContext';

interface HuTubeLayoutProps {
  children: ReactNode;
  showUploadButton?: boolean;
  showBackButton?: boolean;
  backButtonPath?: string;
  darkMode?: boolean;
  collapsedSidebar?: boolean;
}

export default function HuTubeLayout({
  children,
  showUploadButton = true,
  showBackButton = false,
  backButtonPath = '/hutube',
  darkMode = false,
  collapsedSidebar = false
}: HuTubeLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [channelHandle, setChannelHandle] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('hutube-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (user) {
      fetchChannelHandle();
    }
  }, [user]);

  const fetchChannelHandle = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('hutube_channels')
      .select('handle')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setChannelHandle(data.handle);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/hutube/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const toggleSidebar = () => {
    const newValue = !isSidebarCollapsed;
    setIsSidebarCollapsed(newValue);
    localStorage.setItem('hutube-sidebar-collapsed', JSON.stringify(newValue));
  };

  return (
    <HuTubeNotificationProvider>
      <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
      <header className={`sticky top-0 z-50 ${darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'} border-b shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {showBackButton && (
                <PlatformBackButton fallbackPath={backButtonPath} />
              )}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`lg:hidden p-2 ${darkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100'} rounded-lg`}
              >
                <Menu size={24} />
              </button>
              <button
                onClick={toggleSidebar}
                className={`hidden lg:block p-2 ${darkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-600'} rounded-lg transition-colors`}
                title="Toggle sidebar"
              >
                <Menu size={24} />
              </button>
              <UniversalNavigationDropdown currentPlatform="hutube" />
              <Link to="/hutube" className="flex items-center gap-2 group">
                <div className="relative w-10 h-10 rounded-full transition-all duration-300 group-hover:scale-110"
                     style={{
                       background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8C42 25%, #FFA94D 50%, #FF7F66 75%, #FF5E7D 100%)',
                       boxShadow: '0 4px 12px rgba(255, 107, 107, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
                     }}>
                  <Play className="w-5 h-5 text-white fill-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ml-0.5"
                        style={{
                          filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))'
                        }} />
                </div>
                <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} group-hover:opacity-80 transition-opacity`}>HuTube</span>
              </Link>
            </div>

            <div className="flex items-center gap-3 flex-1 max-w-2xl mx-4">
              <form onSubmit={handleSearch} className="hidden md:flex flex-1">
                <div className="flex w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search videos..."
                    className={`flex-1 px-4 py-2 border rounded-l-full focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      darkMode
                        ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 focus:border-transparent'
                    }`}
                  />
                  <button
                    type="submit"
                    className={`px-6 py-2 border border-l-0 rounded-r-full transition-colors ${
                      darkMode
                        ? 'bg-gray-900 border-gray-700 text-white hover:bg-gray-800'
                        : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <Search size={20} />
                  </button>
                </div>
              </form>
            </div>

            <div className="flex items-center gap-3">
              {showUploadButton && user && (
                <button
                  onClick={() => navigate('/hutube/upload')}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-white transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8C42 25%, #FFA94D 50%, #FF7F66 75%, #FF5E7D 100%)',
                    boxShadow: '0 6px 16px rgba(255, 107, 107, 0.5), 0 3px 8px rgba(0, 0, 0, 0.25), inset 0 -3px 6px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(255, 107, 107, 0.6), 0 6px 12px rgba(0, 0, 0, 0.3), inset 0 -3px 6px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 107, 0.5), 0 3px 8px rgba(0, 0, 0, 0.25), inset 0 -3px 6px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(255, 255, 255, 0.4)';
                  }}
                >
                  <ArrowUp className="w-5 h-5" style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))' }} />
                  <span className="hidden sm:inline" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>Launch</span>
                </button>
              )}
              {user && <NotificationBellDropdown />}
              <PlatformHeaderDropdown platform="hutube" />
            </div>
          </div>
        </div>

        {showMobileMenu && (
          <div className={`lg:hidden border-t ${darkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'}`}>
            <div className="px-4 py-2">
              <form onSubmit={handleSearch} className="mb-2">
                <div className="flex">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search videos..."
                    className={`flex-1 px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                      darkMode
                        ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                        : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="submit"
                    className={`px-4 py-2 border border-l-0 rounded-r-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-900 border-gray-700 text-white hover:bg-gray-800'
                        : 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                    }`}
                  >
                    <Search size={20} />
                  </button>
                </div>
              </form>
              <nav className="space-y-1">
                <Link
                  to="/hutube/trending"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <TrendingUp size={20} />
                  <span>Trending</span>
                </Link>
                {user && (
                  <>
                    {channelHandle && (
                      <>
                        <Link
                          to={`/hutube/channel/${channelHandle}`}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          onClick={() => setShowMobileMenu(false)}
                        >
                          <Video size={20} />
                          <span>My Channel</span>
                        </Link>
                        <Link
                          to="/hutube/analytics"
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          onClick={() => setShowMobileMenu(false)}
                        >
                          <BarChart3 size={20} />
                          <span>Analytics</span>
                        </Link>
                      </>
                    )}

                    {/* Subscriptions Section with Channel List */}
                    <SubscriptionsMobileSection
                      darkMode={darkMode}
                      onNavigate={() => setShowMobileMenu(false)}
                    />

                    <Link
                      to="/hutube/history"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <History size={20} />
                      <span>History</span>
                    </Link>
                    <Link
                      to="/hutube/watch-later"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Clock size={20} />
                      <span>Watch Later</span>
                    </Link>
                    <Link
                      to="/hutube/liked-videos"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <ThumbsUp size={20} />
                      <span>Liked videos</span>
                    </Link>
                    <Link
                      to="/hutube/playlists"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <List size={20} />
                      <span>Playlists</span>
                    </Link>
                    <Link
                      to="/hutube/notifications"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Bell size={20} />
                      <span>Notifications</span>
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        )}
      </header>

      <div className="flex">
        <aside
          className={`hidden lg:block ${
            isSidebarCollapsed ? 'w-16' : 'w-64'
          } min-h-screen ${
            darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-200'
          } border-r sticky top-16 transition-all duration-200`}
        >
          <nav className={`${isSidebarCollapsed ? 'p-2' : 'p-4'} space-y-1`}>
            <Link
              to="/hutube"
              className={`flex items-center ${
                isSidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2'
              } ${
                darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
              } rounded-lg transition-colors group relative`}
              title={isSidebarCollapsed ? 'Home' : ''}
            >
              <Play size={20} />
              {!isSidebarCollapsed && <span>Home</span>}
              {isSidebarCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                  Home
                </span>
              )}
            </Link>
            <Link
              to="/hutube/trending"
              className={`flex items-center ${
                isSidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2'
              } ${
                darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
              } rounded-lg transition-colors group relative`}
              title={isSidebarCollapsed ? 'Trending' : ''}
            >
              <TrendingUp size={20} />
              {!isSidebarCollapsed && <span>Trending</span>}
              {isSidebarCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                  Trending
                </span>
              )}
            </Link>
            {user && (
              <>
                <div className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'} my-2`}></div>
                {channelHandle && (
                  <>
                    <Link
                      to={`/hutube/channel/${channelHandle}`}
                      className={`flex items-center ${
                        isSidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2'
                      } ${
                        darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                      } rounded-lg transition-colors group relative`}
                      title={isSidebarCollapsed ? 'My Channel' : ''}
                    >
                      <Video size={20} />
                      {!isSidebarCollapsed && <span>My Channel</span>}
                      {isSidebarCollapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                          My Channel
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/hutube/analytics"
                      className={`flex items-center ${
                        isSidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2'
                      } ${
                        darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                      } rounded-lg transition-colors group relative`}
                      title={isSidebarCollapsed ? 'Analytics' : ''}
                    >
                      <BarChart3 size={20} />
                      {!isSidebarCollapsed && <span>Analytics</span>}
                      {isSidebarCollapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                          Analytics
                        </span>
                      )}
                    </Link>
                  </>
                )}

                {/* Subscriptions Section with Channel List */}
                <SubscriptionsSidebarSection darkMode={darkMode} collapsedSidebar={isSidebarCollapsed} />

                <Link
                  to="/hutube/history"
                  className={`flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2'
                  } ${
                    darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                  } rounded-lg transition-colors group relative`}
                  title={isSidebarCollapsed ? 'History' : ''}
                >
                  <History size={20} />
                  {!isSidebarCollapsed && <span>History</span>}
                  {isSidebarCollapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                      History
                    </span>
                  )}
                </Link>
                <Link
                  to="/hutube/watch-later"
                  className={`flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2'
                  } ${
                    darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                  } rounded-lg transition-colors group relative`}
                  title={isSidebarCollapsed ? 'Watch Later' : ''}
                >
                  <Clock size={20} />
                  {!isSidebarCollapsed && <span>Watch Later</span>}
                  {isSidebarCollapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                      Watch Later
                    </span>
                  )}
                </Link>
                <Link
                  to="/hutube/liked-videos"
                  className={`flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2'
                  } ${
                    darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                  } rounded-lg transition-colors group relative`}
                  title={isSidebarCollapsed ? 'Liked videos' : ''}
                >
                  <ThumbsUp size={20} />
                  {!isSidebarCollapsed && <span>Liked videos</span>}
                  {isSidebarCollapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                      Liked videos
                    </span>
                  )}
                </Link>
                <Link
                  to="/hutube/playlists"
                  className={`flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2'
                  } ${
                    darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                  } rounded-lg transition-colors group relative`}
                  title={isSidebarCollapsed ? 'Playlists' : ''}
                >
                  <List size={20} />
                  {!isSidebarCollapsed && <span>Playlists</span>}
                  {isSidebarCollapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                      Playlists
                    </span>
                  )}
                </Link>
                <Link
                  to="/hutube/notifications"
                  className={`flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2'
                  } ${
                    darkMode ? 'text-white hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
                  } rounded-lg transition-colors group relative`}
                  title={isSidebarCollapsed ? 'Notifications' : ''}
                >
                  <Bell size={20} />
                  {!isSidebarCollapsed && <span>Notifications</span>}
                  {isSidebarCollapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                      Notifications
                    </span>
                  )}
                </Link>
              </>
            )}
          </nav>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
    </HuTubeNotificationProvider>
  );
}
