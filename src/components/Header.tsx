import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LayoutDashboard, LogOut, Shield, ShieldCheck, ShieldAlert, Share2, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AdminModeToggle from './shared/AdminModeToggle';
import CompactShareButtons from './CompactShareButtons';
import UniversalNavigationDropdown from './shared/UniversalNavigationDropdown';
import NotificationBadge from './shared/NotificationBadge';
import { usePlatformNotifications } from '../contexts/PlatformNotificationsContext';

export default function Header() {
  const { user, isAdmin, userProfile, loading, isRefreshingSession, sessionExpired } = useAuth();
  const { counts, formatBadge } = usePlatformNotifications();
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingAlerts();

      const channel = supabase
        .channel('admin-alerts')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'admin_report_alerts',
          },
          () => {
            fetchPendingAlerts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const fetchPendingAlerts = async () => {
    try {
      const { count, error } = await supabase
        .from('admin_report_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('reviewed', false);

      if (error) throw error;
      setPendingAlerts(count || 0);
    } catch (error) {
      console.error('Error fetching pending alerts:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const statusBadge = !loading && user ? (
    sessionExpired ? (
      <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 border border-red-500/50 rounded-md">
        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
        <span className="text-xs text-red-300 font-medium hidden sm:inline">Session Expired</span>
      </div>
    ) : isRefreshingSession ? (
      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-md">
        <Shield className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
        <span className="text-xs text-yellow-300 font-medium hidden sm:inline">Refreshing...</span>
      </div>
    ) : (
      <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/50 rounded-md">
        <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
        <span className="text-xs text-green-300 font-medium hidden sm:inline">Active</span>
      </div>
    )
  ) : null;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Left: nav dropdown + logo */}
          <div className="flex items-center gap-2">
            <UniversalNavigationDropdown />
            <Link to="/" className="text-gray-900 font-medium hover:text-gray-700 transition-colors text-sm sm:text-base whitespace-nowrap">
              Human-Only
            </Link>
            {/* Desktop nav links */}
            <nav className="hidden lg:flex items-center space-x-3 ml-2">
              <Link to="/make-your-own-site" className="text-gray-700 hover:text-gray-900 flex items-center space-x-1">
                <span>My Sites</span>
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded font-semibold ml-1">3 FREE</span>
              </Link>
              <Link to="/heddit" className="relative text-gray-700 hover:text-gray-900">
                Heddit
                <NotificationBadge label={formatBadge(counts.heddit)} />
              </Link>
              <Link to="/hubook" className="relative text-gray-700 hover:text-gray-900">
                HuBook
                <NotificationBadge label={formatBadge(counts.hubook)} />
              </Link>
              <Link to="/hutube" className="relative text-gray-700 hover:text-gray-900">
                HuTube
                <NotificationBadge label={formatBadge(counts.hutube)} />
              </Link>
              <Link to="/hinsta" className="relative text-gray-700 hover:text-gray-900">
                Hinsta
                <NotificationBadge label={formatBadge(counts.hinsta)} />
              </Link>
              <Link to="/switter" className="relative text-gray-700 hover:text-gray-900">
                Switter
                <NotificationBadge label={formatBadge(counts.switter)} />
              </Link>
              <Link to="/blog" className="relative text-gray-700 hover:text-gray-900">
                HuBlog
                <NotificationBadge label={formatBadge(counts.hublog)} />
              </Link>
              <Link to="/about" className="text-gray-700 hover:text-gray-900">About</Link>
              <Link to="/manifesto" className="text-gray-700 hover:text-gray-900">Manifesto</Link>
            </nav>
          </div>

          {/* Right: desktop action buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Share SentPort"
              >
                <Share2 size={18} />
              </button>
              {showShareMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                  <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 min-w-[200px]">
                    <p className="text-xs text-gray-600 mb-3 font-medium">Share the Human Internet</p>
                    <CompactShareButtons variant="icons" size="sm" />
                  </div>
                </>
              )}
            </div>
            {statusBadge}
            {!loading && user ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin/review-queue"
                    className="relative px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full border-2 border-white ${pendingAlerts > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
                    <span>Review Queue</span>
                    {pendingAlerts > 0 && (
                      <span className="ml-1 px-1 py-0.5 bg-green-500 text-white text-xs font-bold rounded">{pendingAlerts}</span>
                    )}
                  </Link>
                )}
                {userProfile?.is_admin && <AdminModeToggle />}
                <Link to="/dashboard" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-1.5">
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </Link>
                <button onClick={handleSignOut} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-1.5">
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <Link to="/signin" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
                <User size={18} />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* Mobile right: status dot + compact icons + hamburger */}
          <div className="flex lg:hidden items-center gap-1.5">
            {statusBadge}
            {!loading && user ? (
              <>
                <Link to="/dashboard" className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors" title="Dashboard">
                  <LayoutDashboard size={16} />
                </Link>
                <button onClick={handleSignOut} className="p-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors" title="Sign Out">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link to="/signin" className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors" title="Sign In">
                <User size={16} />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setMobileMenuOpen(false)} />
          <div className="lg:hidden absolute top-full left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
            <nav className="px-4 py-3 flex flex-col gap-1">
              <Link to="/make-your-own-site" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium">
                My Sites
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded font-semibold">3 FREE</span>
              </Link>
              <Link to="/heddit" onClick={() => setMobileMenuOpen(false)} className="relative px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium flex items-center gap-2">
                Heddit
                {formatBadge(counts.heddit) && (
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{formatBadge(counts.heddit)}</span>
                )}
              </Link>
              <Link to="/hubook" onClick={() => setMobileMenuOpen(false)} className="relative px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium flex items-center gap-2">
                HuBook
                {formatBadge(counts.hubook) && (
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{formatBadge(counts.hubook)}</span>
                )}
              </Link>
              <Link to="/hutube" onClick={() => setMobileMenuOpen(false)} className="relative px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium flex items-center gap-2">
                HuTube
                {formatBadge(counts.hutube) && (
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{formatBadge(counts.hutube)}</span>
                )}
              </Link>
              <Link to="/hinsta" onClick={() => setMobileMenuOpen(false)} className="relative px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium flex items-center gap-2">
                Hinsta
                {formatBadge(counts.hinsta) && (
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{formatBadge(counts.hinsta)}</span>
                )}
              </Link>
              <Link to="/switter" onClick={() => setMobileMenuOpen(false)} className="relative px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium flex items-center gap-2">
                Switter
                {formatBadge(counts.switter) && (
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{formatBadge(counts.switter)}</span>
                )}
              </Link>
              <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="relative px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium flex items-center gap-2">
                HuBlog
                {formatBadge(counts.hublog) && (
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{formatBadge(counts.hublog)}</span>
                )}
              </Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium">About</Link>
              <Link to="/manifesto" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium">Manifesto</Link>
              {isAdmin && (
                <Link
                  to="/admin/review-queue"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-white bg-red-600 hover:bg-red-700 font-medium"
                >
                  <div className={`w-2.5 h-2.5 rounded-full border-2 border-white ${pendingAlerts > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
                  Review Queue
                  {pendingAlerts > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-green-500 text-white text-xs font-bold rounded">{pendingAlerts}</span>
                  )}
                </Link>
              )}
              {userProfile?.is_admin && (
                <div className="px-3 py-1.5">
                  <AdminModeToggle />
                </div>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
