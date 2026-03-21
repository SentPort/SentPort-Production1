import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LayoutDashboard, LogOut, Shield, ShieldCheck, ShieldAlert, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AdminModeToggle from './shared/AdminModeToggle';
import CompactShareButtons from './CompactShareButtons';
import UniversalNavigationDropdown from './shared/UniversalNavigationDropdown';

export default function Header() {
  const { user, isAdmin, userProfile, loading, isRefreshingSession, sessionExpired } = useAuth();
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);

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

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <UniversalNavigationDropdown />
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <img
                src="/sentient-portal-logo.png"
                alt="Sentient Portal - Verified Human-Only Web"
                className="h-10 w-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              <span className="text-gray-900 font-semibold text-lg hidden">Sentient Portal</span>
            </Link>
            <nav className="hidden lg:flex items-center space-x-3">
              <Link
                to="/make-your-own-site"
                className="text-gray-700 hover:text-gray-900 flex items-center space-x-1"
              >
                <span>My Sites</span>
                <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded font-semibold ml-1">
                  3 FREE
                </span>
              </Link>
              <Link to="/heddit" className="text-gray-700 hover:text-gray-900">
                Heddit
              </Link>
              <Link to="/hubook" className="text-gray-700 hover:text-gray-900">
                HuBook
              </Link>
              <Link to="/hutube" className="text-gray-700 hover:text-gray-900">
                HuTube
              </Link>
              <Link to="/hinsta" className="text-gray-700 hover:text-gray-900">
                Hinsta
              </Link>
              <Link to="/switter" className="text-gray-700 hover:text-gray-900">
                Switter
              </Link>
              <Link to="/blog" className="text-gray-700 hover:text-gray-900">
                HuBlog
              </Link>
              <Link to="/about" className="text-gray-700 hover:text-gray-900">
                About
              </Link>
              <Link to="/manifesto" className="text-gray-700 hover:text-gray-900">
                Manifesto
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden lg:block">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Share SentPort"
              >
                <Share2 size={18} />
              </button>
              {showShareMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowShareMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 min-w-[200px]">
                    <p className="text-xs text-gray-600 mb-3 font-medium">Share the Human Internet</p>
                    <CompactShareButtons variant="icons" size="sm" />
                  </div>
                </>
              )}
            </div>
            {!loading && user && (
              <div className="flex items-center gap-2">
                {sessionExpired ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/50 rounded-md">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-300 font-medium">Session Expired</span>
                  </div>
                ) : isRefreshingSession ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-md">
                    <Shield className="w-4 h-4 text-yellow-400 animate-pulse" />
                    <span className="text-xs text-yellow-300 font-medium">Refreshing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 border border-green-500/50 rounded-md">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-300 font-medium">Active</span>
                  </div>
                )}
              </div>
            )}
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
                      <span className="ml-1 px-1 py-0.5 bg-green-500 text-white text-xs font-bold rounded">
                        {pendingAlerts}
                      </span>
                    )}
                  </Link>
                )}
                {userProfile?.is_admin && <AdminModeToggle />}
                <Link
                  to="/dashboard"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                to="/signin"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <User size={18} />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
