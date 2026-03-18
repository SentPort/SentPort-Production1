import { useState, useEffect } from 'react';
import { Search, Eye, Heart, Users, TrendingUp, Image, ArrowLeft, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHinstaAnalytics } from '../../hooks/useHinstaAnalytics';
import Header from '../../components/Header';
import MetricCard from '../../components/hinsta/analytics/MetricCard';
import LineChart from '../../components/hinsta/analytics/LineChart';
import BarChart from '../../components/hinsta/analytics/BarChart';
import PieChart from '../../components/hinsta/analytics/PieChart';

interface AccountSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  follower_count: number;
  post_count: number;
  user_id: string;
  email: string;
  full_name: string | null;
}

type DateRange = '7' | '28' | '90' | '365' | 'all';

export default function HinstaAnalyticsLookup() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AccountSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountSearchResult | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('28');
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'audience'>('overview');

  const getDateRange = () => {
    if (dateRange === 'all') return { startDate: undefined, endDate: undefined };
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));
    return { startDate: startDate.toISOString().split('T')[0], endDate };
  };

  const { startDate, endDate } = getDateRange();
  const { data, loading } = useHinstaAnalytics(selectedAccount?.id || null, startDate, endDate);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        searchAccounts();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchAccounts = async () => {
    setSearching(true);
    try {
      const query = searchQuery.trim();

      const { data: accounts, error: accountsError } = await supabase
        .from('hinsta_accounts')
        .select('id, username, display_name, avatar_url, follower_count, post_count, user_id')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);

      if (accountsError) {
        console.error('Account search error:', accountsError);
        throw accountsError;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(20);

      if (profilesError) {
        console.error('Profile search error:', profilesError);
      }

      const accountsByUsername = accounts || [];
      const profileIds = (profiles || []).map(p => p.id);

      let accountsByEmail: any[] = [];
      if (profileIds.length > 0) {
        const { data: emailAccounts } = await supabase
          .from('hinsta_accounts')
          .select('id, username, display_name, avatar_url, follower_count, post_count, user_id')
          .in('user_id', profileIds);

        accountsByEmail = emailAccounts || [];
      }

      const allAccounts = [...accountsByUsername, ...accountsByEmail];
      const uniqueAccounts = Array.from(
        new Map(allAccounts.map(a => [a.id, a])).values()
      );

      const userIds = uniqueAccounts.map(a => a.user_id);

      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap = (userProfiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);

      const results: AccountSearchResult[] = uniqueAccounts.map(account => {
        const profile = profileMap[account.user_id];
        return {
          ...account,
          email: profile?.email || 'N/A',
          full_name: profile?.full_name || null,
        };
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching accounts:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectAccount = (account: AccountSearchResult) => {
    setSelectedAccount(account);
    setSearchQuery('');
    setSearchResults([]);
  };

  const clearSelection = () => {
    setSelectedAccount(null);
    setSearchQuery('');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            {selectedAccount && (
              <button
                onClick={clearSelection}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Search
              </button>
            )}
            <div className="flex items-center gap-2">
              <Camera className="w-8 h-8 text-pink-500" />
              <h1 className="text-3xl font-bold text-gray-900">Hinsta Analytics Lookup</h1>
            </div>
          </div>

          {!selectedAccount && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username, display name, email, or full name..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {searching && (
                <div className="mt-4 text-center text-gray-600">
                  <div className="inline-block w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-2">Searching...</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-gray-600 font-medium">{searchResults.length} result(s) found</p>
                  {searchResults.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => selectAccount(account)}
                      className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5 flex-shrink-0">
                        <div className="w-full h-full rounded-full bg-white p-0.5">
                          {account.avatar_url ? (
                            <img
                              src={account.avatar_url}
                              alt={account.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xl">
                              {account.username[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">@{account.username}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-600">{account.display_name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {account.email}
                          {account.full_name && ` • ${account.full_name}`}
                        </div>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-gray-600">
                            <span className="font-semibold text-gray-900">{account.post_count}</span> posts
                          </span>
                          <span className="text-gray-600">
                            <span className="font-semibold text-gray-900">{account.follower_count}</span> followers
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="mt-4 text-center text-gray-600">
                  No accounts found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        {selectedAccount && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-1 flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-white p-1">
                    {selectedAccount.avatar_url ? (
                      <img
                        src={selectedAccount.avatar_url}
                        alt={selectedAccount.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-3xl">
                        {selectedAccount.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">@{selectedAccount.username}</h2>
                    <span className="text-gray-500">•</span>
                    <span className="text-xl text-gray-700">{selectedAccount.display_name}</span>
                  </div>
                  <div className="text-gray-600">
                    {selectedAccount.email}
                    {selectedAccount.full_name && ` • ${selectedAccount.full_name}`}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="7">Last 7 days</option>
                <option value="28">Last 28 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
                <option value="all">All time</option>
              </select>
            </div>

            <div className="flex gap-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'overview'
                    ? 'text-pink-600 border-b-2 border-pink-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'posts'
                    ? 'text-pink-600 border-b-2 border-pink-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab('audience')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'audience'
                    ? 'text-pink-600 border-b-2 border-pink-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Audience
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading analytics...</p>
              </div>
            ) : data ? (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <MetricCard
                        title="Post Views"
                        value={data.overview.total_post_views.toLocaleString()}
                        icon={<Eye className="w-5 h-5" />}
                        subtitle="Total impressions"
                      />
                      <MetricCard
                        title="Profile Views"
                        value={data.overview.total_profile_views.toLocaleString()}
                        icon={<Users className="w-5 h-5" />}
                        subtitle="Profile visits"
                      />
                      <MetricCard
                        title="Total Engagement"
                        value={data.overview.total_engagement.toLocaleString()}
                        icon={<TrendingUp className="w-5 h-5" />}
                        subtitle="Likes + Comments + Shares + Saves"
                      />
                      <MetricCard
                        title="New Followers"
                        value={data.overview.new_followers.toLocaleString()}
                        icon={<Users className="w-5 h-5" />}
                        subtitle="In selected period"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <MetricCard
                        title="Likes"
                        value={data.overview.total_likes.toLocaleString()}
                        icon={<Heart className="w-5 h-5" />}
                      />
                      <MetricCard
                        title="Comments"
                        value={data.overview.total_comments.toLocaleString()}
                        icon={<Users className="w-5 h-5" />}
                      />
                      <MetricCard
                        title="Shares"
                        value={data.overview.total_shares.toLocaleString()}
                        icon={<TrendingUp className="w-5 h-5" />}
                      />
                      <MetricCard
                        title="Saves"
                        value={data.overview.total_saves.toLocaleString()}
                        icon={<Image className="w-5 h-5" />}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'posts' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-900">Top Performing Posts</h2>
                    {data.top_posts && data.top_posts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.top_posts.map((post: any) => (
                          <div
                            key={post.id}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                          >
                            <img
                              src={post.media_url}
                              alt="Post"
                              className="w-full h-64 object-cover"
                            />
                            <div className="p-4">
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                {post.caption || 'No caption'}
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-gray-500">Views</p>
                                  <p className="font-semibold">{post.view_count.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Engagement</p>
                                  <p className="font-semibold">{post.engagement_rate}%</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Likes</p>
                                  <p className="font-semibold">{post.like_count.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Comments</p>
                                  <p className="font-semibold">{post.comment_count.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg p-12 text-center shadow-sm border border-gray-200">
                        <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No posts data available for this period</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'audience' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Follower Growth</h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-gray-600">Current Followers</p>
                            <p className="text-3xl font-bold text-gray-900">{data.account.follower_count}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">New Followers ({dateRange} days)</p>
                            <p className="text-2xl font-semibold text-green-600">+{data.overview.new_followers}</p>
                          </div>
                        </div>
                      </div>

                      <PieChart
                        title="Engagement Distribution"
                        data={[
                          { label: 'Likes', value: data.overview.total_likes, color: '#ec4899' },
                          { label: 'Comments', value: data.overview.total_comments, color: '#8b5cf6' },
                          { label: 'Shares', value: data.overview.total_shares, color: '#3b82f6' },
                          { label: 'Saves', value: data.overview.total_saves, color: '#10b981' },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">No analytics data available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
