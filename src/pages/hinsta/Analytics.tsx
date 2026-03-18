import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHinstaAnalytics } from '../../hooks/useHinstaAnalytics';
import MetricCard from '../../components/hinsta/analytics/MetricCard';
import LineChart from '../../components/hinsta/analytics/LineChart';
import BarChart from '../../components/hinsta/analytics/BarChart';
import PieChart from '../../components/hinsta/analytics/PieChart';
import { Eye, Heart, MessageCircle, Share2, Bookmark, Users, TrendingUp, Calendar } from 'lucide-react';

type DateRange = '7' | '28' | '90' | '365' | 'all';

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accountId, setAccountId] = useState<string | null>(null);
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
  const { data, loading, error } = useHinstaAnalytics(accountId, startDate, endDate);

  useEffect(() => {
    async function loadAccount() {
      if (!user) return;

      const { data: account } = await supabase
        .from('hinsta_accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (account) {
        setAccountId(account.id);
      }
    }

    loadAccount();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load analytics'}</p>
          <button
            onClick={() => navigate('/hinsta/feed')}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  const overview = data.overview;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600 mt-1">Track your account performance</p>
            </div>
            <button
              onClick={() => navigate('/hinsta/profile/' + data.account.username)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              View Profile
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
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
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Post Views"
                value={overview.total_post_views.toLocaleString()}
                icon={<Eye className="w-5 h-5" />}
                subtitle="Total impressions"
              />
              <MetricCard
                title="Profile Views"
                value={overview.total_profile_views.toLocaleString()}
                icon={<Users className="w-5 h-5" />}
                subtitle="Profile visits"
              />
              <MetricCard
                title="Total Engagement"
                value={overview.total_engagement.toLocaleString()}
                icon={<TrendingUp className="w-5 h-5" />}
                subtitle="Likes + Comments + Shares + Saves"
              />
              <MetricCard
                title="New Followers"
                value={overview.new_followers.toLocaleString()}
                icon={<Users className="w-5 h-5" />}
                subtitle="In selected period"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Likes"
                value={overview.total_likes.toLocaleString()}
                icon={<Heart className="w-5 h-5" />}
              />
              <MetricCard
                title="Comments"
                value={overview.total_comments.toLocaleString()}
                icon={<MessageCircle className="w-5 h-5" />}
              />
              <MetricCard
                title="Shares"
                value={overview.total_shares.toLocaleString()}
                icon={<Share2 className="w-5 h-5" />}
              />
              <MetricCard
                title="Saves"
                value={overview.total_saves.toLocaleString()}
                icon={<Bookmark className="w-5 h-5" />}
              />
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{data.account.post_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Followers</p>
                  <p className="text-2xl font-bold text-gray-900">{data.account.follower_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Following</p>
                  <p className="text-2xl font-bold text-gray-900">{data.account.following_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg. Engagement Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {overview.total_post_views > 0
                      ? ((overview.total_engagement / overview.total_post_views) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Top Performing Posts</h2>
            {data.top_posts && data.top_posts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.top_posts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => navigate(`/hinsta/post/${post.id}`)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
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
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
                    <p className="text-2xl font-semibold text-green-600">+{overview.new_followers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Growth Rate</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {data.account.follower_count > 0
                        ? ((overview.new_followers / data.account.follower_count) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>

              <PieChart
                title="Engagement Distribution"
                data={[
                  { label: 'Likes', value: overview.total_likes, color: '#ec4899' },
                  { label: 'Comments', value: overview.total_comments, color: '#8b5cf6' },
                  { label: 'Shares', value: overview.total_shares, color: '#3b82f6' },
                  { label: 'Saves', value: overview.total_saves, color: '#10b981' },
                ]}
              />
            </div>

            <BarChart
              title="Engagement by Type"
              data={[
                { label: 'Likes', value: overview.total_likes },
                { label: 'Comments', value: overview.total_comments },
                { label: 'Shares', value: overview.total_shares },
                { label: 'Saves', value: overview.total_saves },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
