import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User, MessageSquare, Heart, Share2, AlertCircle, Globe, BarChart3, Eye, TrendingUp, Wrench, Trash2, RefreshCw, Settings, Star
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePageTracking } from '../hooks/usePageTracking';
import MyProfile from '../components/shared/MyProfile';
import AdminBanner from '../components/shared/AdminBanner';
import DeleteSubdomainModal from '../components/shared/DeleteSubdomainModal';
import SetPrimarySubdomainModal from '../components/shared/SetPrimarySubdomainModal';
import SubdomainDashboardNotification from '../components/shared/SubdomainDashboardNotification';
import { getUserPlatformsWithStatus, PlatformInfo } from '../lib/platformHelpers';
import { usePlatformNotifications } from '../contexts/PlatformNotificationsContext';

interface PlatformStats {
  platform: string;
  posts: number;
  reactions: number;
  comments: number;
}

interface SubdomainData {
  id: string;
  subdomain: string;
  status: string;
  created_at: string;
  total_views?: number;
  total_visitors?: number;
}

export default function Dashboard() {
  usePageTracking('dashboard');
  const { user, userProfile, isVerified, isAdmin, loading, session, isRefreshingSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [ownedSubdomainCount, setOwnedSubdomainCount] = useState(0);
  const [ownedSubdomains, setOwnedSubdomains] = useState<SubdomainData[]>([]);
  const [loadingSubdomains, setLoadingSubdomains] = useState(true);
  const [selectedSubdomain, setSelectedSubdomain] = useState<SubdomainData | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [subdomainToDelete, setSubdomainToDelete] = useState<SubdomainData | null>(null);
  const [showPrimarySubdomainModal, setShowPrimarySubdomainModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [userPlatforms, setUserPlatforms] = useState<PlatformInfo[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);
  const [platformRefreshTrigger, setPlatformRefreshTrigger] = useState(0);
  const { counts, formatBadge } = usePlatformNotifications();

  useEffect(() => {
    // Only redirect if we're not loading, there's no user, no session,
    // and we're not currently refreshing the session
    if (!loading && !user && !session && !isRefreshingSession) {
      // Add a small delay to prevent race conditions during database operations
      const redirectTimer = setTimeout(() => {
        navigate('/signin');
      }, 100);

      return () => clearTimeout(redirectTimer);
    }
  }, [loading, user, session, isRefreshingSession, navigate]);

  // Redirect non-verified users to get-verified page
  useEffect(() => {
    if (!loading && user && !isVerified && !isAdmin) {
      navigate('/get-verified');
    }
  }, [loading, user, isVerified, isAdmin, navigate]);

  useEffect(() => {
    if (userProfile) {
      fetchUserStats();
      fetchOwnedSubdomains();
      fetchUserPlatforms();
    }
  }, [userProfile, platformRefreshTrigger]);

  useEffect(() => {
    if (location.state?.platformJoined && userProfile) {
      console.log('Platform just joined, forcing refresh...');
      fetchUserPlatforms();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, userProfile]);

  useEffect(() => {
    const handleFocus = () => {
      if (userProfile) {
        fetchUserPlatforms();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [userProfile]);

  const fetchUserPlatforms = async () => {
    setLoadingPlatforms(true);
    try {
      if (userProfile?.id) {
        console.log('Fetching user platforms for user:', userProfile.id);
        const platforms = await getUserPlatformsWithStatus(userProfile.id);
        console.log('Fetched platforms:', platforms);
        setUserPlatforms(platforms);
      }
    } catch (error) {
      console.error('Error fetching user platforms:', error);
    } finally {
      setLoadingPlatforms(false);
    }
  };

  const handleManualRefresh = () => {
    console.log('Manual platform refresh triggered');
    setPlatformRefreshTrigger(prev => prev + 1);
  };

  const fetchOwnedSubdomains = async () => {
    setLoadingSubdomains(true);
    try {
      const { data: subdomains, error, count } = await supabase
        .from('subdomains')
        .select('*', { count: 'exact' })
        .eq('owner_id', userProfile?.id)
        .in('status', ['active', 'inactive'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching subdomains:', error);
      } else {
        setOwnedSubdomainCount(count || 0);

        const subdomainsWithStats = await Promise.all(
          (subdomains || []).map(async (subdomain) => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: analytics } = await supabase
              .from('subdomain_analytics_daily')
              .select('unique_visitors, page_views')
              .eq('subdomain_id', subdomain.id)
              .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

            const stats = (analytics || []).reduce((acc, record) => {
              acc.visitors += record.unique_visitors || 0;
              acc.views += record.page_views || 0;
              return acc;
            }, { visitors: 0, views: 0 });

            return {
              ...subdomain,
              total_views: stats.views,
              total_visitors: stats.visitors,
            };
          })
        );

        setOwnedSubdomains(subdomainsWithStats);
        if (subdomainsWithStats.length > 0 && !selectedSubdomain) {
          setSelectedSubdomain(subdomainsWithStats[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching subdomains:', error);
    } finally {
      setLoadingSubdomains(false);
    }
  };

  const handleDeleteSubdomain = (subdomain: SubdomainData) => {
    setSubdomainToDelete(subdomain);
    setDeleteModalOpen(true);
  };

  const handleSubdomainDeleted = () => {
    setSuccessMessage(`Subdomain "${subdomainToDelete?.subdomain}" has been permanently deleted.`);
    setTimeout(() => setSuccessMessage(''), 5000);
    fetchOwnedSubdomains();
    setSelectedSubdomain(null);
  };

  const handlePrimarySubdomainChanged = () => {
    fetchOwnedSubdomains();
  };

  const fetchUserStats = async () => {
    setLoadingStats(true);
    try {
      const stats: PlatformStats[] = [];

      const { data: hubookProfile } = await supabase
        .from('hubook_profiles')
        .select('id')
        .eq('id', userProfile?.id)
        .maybeSingle();

      if (hubookProfile) {
        const { data: posts } = await supabase
          .from('posts')
          .select('id, post_engagement_metrics(total_reactions, total_comments)')
          .eq('author_id', hubookProfile.id);

        const totalReactions = posts?.reduce((sum, p: any) => sum + (p.post_engagement_metrics?.total_reactions || 0), 0) || 0;
        const totalComments = posts?.reduce((sum, p: any) => sum + (p.post_engagement_metrics?.total_comments || 0), 0) || 0;

        stats.push({
          platform: 'HuBook',
          posts: posts?.length || 0,
          reactions: totalReactions,
          comments: totalComments,
        });
      }

      setPlatformStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-4 mb-8 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back{userProfile.full_name ? `, ${userProfile.full_name}` : ''}!
              </h1>
              <p className="text-sm text-blue-100">Your personal dashboard on SentPort</p>
            </div>
          </div>
        </div>

        {isAdmin && <AdminBanner />}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {!isVerified && !isAdmin && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Verification Required</h3>
                <p className="text-yellow-800 mb-4">
                  To fully participate in the SentPort ecosystem and claim your free subdomain, you need to complete the human verification process.
                </p>
                <Link
                  to="/hubook/get-verified"
                  className="inline-block px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
                >
                  Start Free Verification Process
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <MyProfile
            email={userProfile.email}
            isVerified={isVerified}
            subdomain={userProfile.subdomain}
            createdAt={userProfile.created_at}
            fullName={userProfile.full_name}
            ownedSubdomainCount={ownedSubdomainCount}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Platforms</h2>
            <div className="flex items-center gap-4">
              {!loadingPlatforms && (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-600">
                    {userPlatforms.filter(p => p.joined).length}/6
                  </span>
                  <span className="text-sm text-gray-500">platforms joined</span>
                </div>
              )}
              <button
                onClick={handleManualRefresh}
                disabled={loadingPlatforms}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh platform list"
              >
                <RefreshCw className={`w-4 h-4 ${loadingPlatforms ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {loadingPlatforms ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {userPlatforms.filter(p => p.joined).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">You haven't joined any platforms yet!</p>
                  <p className="text-sm text-gray-500">Explore our platforms below to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                  {userPlatforms
                    .filter(platform => platform.joined)
                    .map((platform) => {
                      const IconComponent = platform.icon;
                      const badge = formatBadge(counts[platform.name as keyof typeof counts] ?? 0);
                      return (
                        <Link
                          key={platform.name}
                          to={platform.route}
                          className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="relative mb-3">
                            <div className={`${platform.iconColor} w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
                              <IconComponent className="w-8 h-8 text-white" />
                            </div>
                            {badge && (
                              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                                {badge}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{platform.displayName}</span>
                        </Link>
                      );
                    })}
                </div>
              )}

              {userPlatforms.filter(p => p.joined).length < 6 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Explore More Platforms ({6 - userPlatforms.filter(p => p.joined).length} remaining)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {userPlatforms
                      .filter(platform => !platform.joined)
                      .map((platform) => {
                        const IconComponent = platform.icon;
                        return (
                          <Link
                            key={platform.name}
                            to={platform.route}
                            className="flex flex-col items-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group border-2 border-dashed border-gray-300"
                          >
                            <div className={`${platform.iconColor} w-16 h-16 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform opacity-75 group-hover:opacity-100`}>
                              <IconComponent className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">{platform.displayName}</span>
                            <span className="text-xs text-gray-500 mt-1">Join now</span>
                          </Link>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {ownedSubdomainCount > 0 && (
          <div id="subdomain-dashboard" className="bg-white rounded-lg shadow-sm p-6 mb-8 scroll-mt-8">
            <div className="mb-6">
              <SubdomainDashboardNotification />
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                My Subdomains Dashboard
              </h2>
              <div className="flex items-center gap-3">
                {ownedSubdomainCount > 1 && (
                  <button
                    onClick={() => setShowPrimarySubdomainModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Star className="w-4 h-4" />
                    Set Primary Subdomain
                  </button>
                )}
                <span className="text-sm text-gray-500">{ownedSubdomainCount} subdomain{ownedSubdomainCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            {loadingSubdomains ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex flex-wrap gap-3">
                    {ownedSubdomains.map((subdomain) => {
                      const isPrimary = subdomain.id === userProfile?.primary_subdomain_id;
                      return (
                        <button
                          key={subdomain.id}
                          onClick={() => setSelectedSubdomain(subdomain)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            selectedSubdomain?.id === subdomain.id
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {isPrimary && (
                            <Star className={`w-4 h-4 fill-current ${
                              selectedSubdomain?.id === subdomain.id ? 'text-yellow-300' : 'text-yellow-500'
                            }`} />
                          )}
                          {subdomain.subdomain}.sentport.com
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedSubdomain && (
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {selectedSubdomain.subdomain}.sentport.com
                        </h3>
                        <div className="flex items-center gap-3">
                          <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                            selectedSubdomain.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : selectedSubdomain.status === 'inactive'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {selectedSubdomain.status === 'active' ? 'Published & Live' : selectedSubdomain.status === 'inactive' ? 'Draft' : selectedSubdomain.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            Created {new Date(selectedSubdomain.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedSubdomain.status === 'active' && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-900 font-medium">Total Views</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-900">{selectedSubdomain.total_views || 0}</p>
                          <p className="text-xs text-blue-700 mt-1">Last 30 days</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-900 font-medium">Visitors</span>
                          </div>
                          <p className="text-2xl font-bold text-green-900">{selectedSubdomain.total_visitors || 0}</p>
                          <p className="text-xs text-green-700 mt-1">Last 30 days</p>
                        </div>
                      </div>
                    )}

                    {selectedSubdomain.status === 'inactive' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-900 font-medium mb-2">
                          Website Not Published Yet
                        </p>
                        <p className="text-sm text-blue-800">
                          This subdomain is in draft mode. Build your website using the editor below, then click the "Publish" button to make it live. Analytics will be collected once you publish your site.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/builder/${selectedSubdomain.id}`}
                        className="flex items-center gap-2 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Wrench className="w-4 h-4" />
                        Edit Site
                      </Link>
                      <Link
                        to={`/subdomain-analytics/${selectedSubdomain.id}`}
                        className="flex items-center gap-2 bg-gray-100 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                      >
                        <BarChart3 className="w-4 h-4" />
                        View Full Analytics
                      </Link>
                      <button
                        onClick={() => handleDeleteSubdomain(selectedSubdomain)}
                        className="flex items-center gap-2 bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-colors font-medium ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Subdomain
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {platformStats.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Activity</h2>
            {loadingStats ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {platformStats.map((stat) => (
                  <div key={stat.platform} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">{stat.platform}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Posts</span>
                        <span className="font-semibold text-gray-900">{stat.posts}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Reactions</span>
                        <span className="font-semibold text-gray-900">{stat.reactions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Comments</span>
                        <span className="font-semibold text-gray-900">{stat.comments}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <DeleteSubdomainModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        subdomain={subdomainToDelete}
        onDeleted={handleSubdomainDeleted}
      />

      <SetPrimarySubdomainModal
        isOpen={showPrimarySubdomainModal}
        onClose={() => setShowPrimarySubdomainModal(false)}
        currentPrimaryId={userProfile?.primary_subdomain_id}
        onPrimaryChanged={handlePrimarySubdomainChanged}
      />
    </div>
  );
}
