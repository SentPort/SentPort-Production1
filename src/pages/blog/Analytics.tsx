import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Clock, Users, TrendingUp, ThumbsUp, MessageSquare, Share2, FileText, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import BlogLayout from '../../components/shared/BlogLayout';
import MetricCard from '../../components/blog/analytics/MetricCard';
import LineChart from '../../components/blog/analytics/LineChart';
import BarChart from '../../components/blog/analytics/BarChart';
import ReadingBehaviorCard from '../../components/blog/analytics/ReadingBehaviorCard';
import PostInsightsTable from '../../components/blog/analytics/PostInsightsTable';

interface BlogAccountData {
  id: string;
  username: string;
}

interface AnalyticsSummary {
  totalViews: number;
  uniqueViewers: number;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  averageEngagementRate: number;
  followerCount: number;
}

interface PostPerformance {
  id: string;
  title: string;
  views: number;
  engagement_rate: number;
  created_at: string;
}

type DateRange = '7d' | '28d' | '90d' | 'year' | 'lifetime';

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<BlogAccountData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('28d');
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'audience'>('overview');
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalViews: 0,
    uniqueViewers: 0,
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    averageEngagementRate: 0,
    followerCount: 0
  });
  const [viewsData, setViewsData] = useState<{ date: string; value: number }[]>([]);
  const [topPosts, setTopPosts] = useState<PostPerformance[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [user, dateRange]);

  const getDaysForRange = () => {
    switch (dateRange) {
      case '7d': return 7;
      case '28d': return 28;
      case '90d': return 90;
      case 'year': return 365;
      case 'lifetime': return 9999;
      default: return 28;
    }
  };

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      const { data: accountData } = await supabase
        .from('blog_accounts')
        .select('id, username')
        .eq('id', user.id)
        .single();

      if (!accountData) {
        setLoading(false);
        return;
      }

      setAccount(accountData);
      const days = getDaysForRange();

      const { data: summaryData } = await supabase.rpc('get_blog_account_analytics_summary', {
        p_account_id: accountData.id,
        p_days: days
      });

      if (summaryData && summaryData.length > 0) {
        const s = summaryData[0];
        setSummary({
          totalViews: parseInt(s.total_views) || 0,
          uniqueViewers: parseInt(s.unique_viewers) || 0,
          totalPosts: parseInt(s.total_posts) || 0,
          totalLikes: parseInt(s.total_likes) || 0,
          totalComments: parseInt(s.total_comments) || 0,
          totalShares: parseInt(s.total_shares) || 0,
          averageEngagementRate: parseFloat(s.average_engagement_rate) || 0,
          followerCount: parseInt(s.follower_count) || 0
        });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: dailyData } = await supabase
        .from('blog_account_analytics_daily')
        .select('date, total_views')
        .eq('account_id', accountData.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (dailyData && dailyData.length > 0) {
        setViewsData(dailyData.map(d => ({ date: d.date, value: d.total_views })));
      } else {
        setViewsData([]);
      }

      const { data: postsData } = await supabase
        .from('blog_posts')
        .select(`
          id,
          title,
          created_at,
          blog_post_analytics (
            total_views,
            engagement_rate
          )
        `)
        .eq('account_id', accountData.id)
        .eq('status', 'published')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (postsData) {
        const performanceData: PostPerformance[] = postsData
          .map(p => ({
            id: p.id,
            title: p.title,
            views: p.blog_post_analytics?.[0]?.total_views || 0,
            engagement_rate: p.blog_post_analytics?.[0]?.engagement_rate || 0,
            created_at: p.created_at
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 5);

        setTopPosts(performanceData);
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <PlatformGuard platform="blog">
        <BlogLayout>
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </BlogLayout>
      </PlatformGuard>
    );
  }

  if (!account) {
    return (
      <PlatformGuard platform="blog">
        <BlogLayout>
          <div className="max-w-2xl mx-auto p-8 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Blog Account</h2>
            <p className="text-gray-600 mb-6">
              You need to create a blog account to view analytics.
            </p>
            <button
              onClick={() => navigate('/blog/join')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Blog Account
            </button>
          </div>
        </BlogLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="blog">
      <BlogLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="text-gray-600 mt-1">Track your blog performance and growth</p>
            </div>

            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="28d">Last 28 days</option>
              <option value="90d">Last 90 days</option>
              <option value="year">Last year</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>

          <div className="flex gap-4 mb-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('audience')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'audience'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Audience
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Views"
                  value={summary.totalViews.toLocaleString()}
                  icon={Eye}
                  color="blue"
                />
                <MetricCard
                  title="Unique Readers"
                  value={summary.uniqueViewers.toLocaleString()}
                  icon={Users}
                  color="green"
                />
                <MetricCard
                  title="Posts Published"
                  value={summary.totalPosts.toLocaleString()}
                  icon={FileText}
                  color="purple"
                />
                <MetricCard
                  title="Followers"
                  value={summary.followerCount.toLocaleString()}
                  icon={TrendingUp}
                  color="orange"
                />
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Views Over Time</h3>
                <LineChart data={viewsData} color="#3b82f6" height={250} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <ThumbsUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Total Likes</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{summary.totalLikes.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Total Comments</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{summary.totalComments.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Share2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Total Shares</h3>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{summary.totalShares.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Average Engagement Rate</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">{summary.averageEngagementRate.toFixed(2)}%</p>
                <p className="text-sm text-gray-600 mt-1">
                  Engagement per view across all posts
                </p>
              </div>
            </div>
          )}

          {activeTab === 'posts' && (
            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performing Posts</h3>
                {topPosts.length > 0 ? (
                  <BarChart
                    data={topPosts.map(p => ({
                      label: p.title,
                      value: p.views
                    }))}
                    color="#3b82f6"
                  />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No posts published in this period
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Post Performance Details</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Post Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Views
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Engagement Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Published
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topPosts.length > 0 ? (
                        topPosts.map((post) => (
                          <tr
                            key={post.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => navigate(`/blog/post/${post.id}`)}
                          >
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900 truncate max-w-md">
                                {post.title}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {post.views.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {post.engagement_rate.toFixed(2)}%
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(post.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                            No posts published in this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audience' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Follower Growth</h3>
                  <div className="text-center py-8">
                    <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <p className="text-4xl font-bold text-gray-900 mb-2">
                      {summary.followerCount.toLocaleString()}
                    </p>
                    <p className="text-gray-600">Total Followers</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Reader Insights</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Readers</span>
                      <span className="font-semibold text-gray-900">
                        {summary.uniqueViewers.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Average Engagement</span>
                      <span className="font-semibold text-gray-900">
                        {summary.averageEngagementRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Posts Published</span>
                      <span className="font-semibold text-gray-900">
                        {summary.totalPosts.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Reader Behavior Insights</h2>
                {account && <ReadingBehaviorCard authorId={account.id} />}
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                {account && <PostInsightsTable authorId={account.id} daysBack={getDaysForRange()} />}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  Understanding Your Reader Analytics
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>
                    <strong>Page-Level Insights:</strong> Track exactly where readers engage most
                    and where they drop off. Use this data to refine your content structure.
                  </p>
                  <p>
                    <strong>Reading Time:</strong> Active reading time shows how long readers
                    actually spend engaging with your content, helping you identify optimal post
                    length.
                  </p>
                  <p>
                    <strong>Completion Rates:</strong> Posts with 60%+ completion are performing
                    well. Lower rates suggest opportunities to improve pacing or restructure content.
                  </p>
                  <p>
                    <strong>Drop-off Analysis:</strong> High drop-off on specific pages indicates
                    where content may need strengthening. Orange highlights show pages needing attention.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </BlogLayout>
    </PlatformGuard>
  );
}
