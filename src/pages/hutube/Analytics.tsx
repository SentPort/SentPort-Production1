import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Clock, Users, TrendingUp, Video, ThumbsUp, MessageSquare, Share2, Calendar, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import MetricCard from '../../components/hutube/analytics/MetricCard';
import LineChart from '../../components/hutube/analytics/LineChart';
import BarChart from '../../components/hutube/analytics/BarChart';
import Heatmap from '../../components/hutube/analytics/Heatmap';

interface ChannelData {
  id: string;
  handle: string;
}

interface AnalyticsSummary {
  totalViews: number;
  totalWatchTime: number;
  subscribers: number;
  avgViewDuration: number;
  subscriberGains: number;
  subscriberLosses: number;
}

interface VideoPerformance {
  id: string;
  title: string;
  thumbnail_url: string;
  views: number;
  watchTime: number;
  avgDuration: number;
  created_at: string;
}

type DateRange = '7d' | '28d' | '90d' | 'year' | 'lifetime';

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('28d');
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'audience'>('overview');
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalViews: 0,
    totalWatchTime: 0,
    subscribers: 0,
    avgViewDuration: 0,
    subscriberGains: 0,
    subscriberLosses: 0
  });
  const [viewsData, setViewsData] = useState<{ date: string; value: number }[]>([]);
  const [topVideos, setTopVideos] = useState<VideoPerformance[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [user, dateRange]);

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '28d':
        start.setDate(end.getDate() - 28);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'lifetime':
        start.setFullYear(2020, 0, 1);
        break;
    }

    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };

  const loadAnalytics = async () => {
    if (!user) return;

    try {
      const { data: channelData } = await supabase
        .from('hutube_channels')
        .select('id, handle')
        .eq('user_id', user.id)
        .single();

      if (!channelData) {
        setLoading(false);
        return;
      }

      setChannel(channelData);
      const { start, end } = getDateRange();

      const { data: summaryData } = await supabase.rpc('get_channel_analytics_summary_with_fallback', {
        p_channel_id: channelData.id,
        p_start_date: start,
        p_end_date: end
      });

      if (summaryData && summaryData.length > 0) {
        const s = summaryData[0];
        setSummary({
          totalViews: parseInt(s.total_views) || 0,
          totalWatchTime: parseInt(s.total_watch_time_seconds) || 0,
          subscribers: parseInt(s.current_subscribers) || 0,
          avgViewDuration: parseInt(s.avg_view_duration_seconds) || 0,
          subscriberGains: parseInt(s.subscriber_gains) || 0,
          subscriberLosses: parseInt(s.subscriber_losses) || 0
        });
      }

      const { data: dailyData } = await supabase
        .from('hutube_channel_analytics_daily')
        .select('date, views')
        .eq('channel_id', channelData.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      if (dailyData) {
        setViewsData(dailyData.map(d => ({ date: d.date, value: d.views })));
      }

      const { data: videosData } = await supabase
        .from('hutube_videos')
        .select('id, title, thumbnail_url, view_count, created_at')
        .eq('channel_id', channelData.id)
        .order('view_count', { ascending: false })
        .limit(5);

      if (videosData) {
        setTopVideos(videosData.map(v => ({
          id: v.id,
          title: v.title,
          thumbnail_url: v.thumbnail_url,
          views: v.view_count,
          watchTime: 0,
          avgDuration: 0,
          created_at: v.created_at
        })));
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    if (hours > 1000) return `${(hours / 1000).toFixed(1)}K hours`;
    return `${hours.toLocaleString()} hours`;
  };

  if (loading) {
    return (
      <PlatformGuard platform="hutube">
        <HuTubeLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading analytics...</p>
            </div>
          </div>
        </HuTubeLayout>
      </PlatformGuard>
    );
  }

  if (!channel) {
    return (
      <PlatformGuard platform="hutube">
        <HuTubeLayout>
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Channel Found</h2>
            <p className="text-gray-600 mb-6">You need to create a HuTube channel to view analytics.</p>
            <button
              onClick={() => navigate('/hutube/join')}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Create Channel
            </button>
          </div>
        </HuTubeLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hutube">
      <HuTubeLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Channel Analytics</h1>
              <p className="text-gray-600 mt-1">Track your channel performance and growth</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="7d">Last 7 days</option>
                <option value="28d">Last 28 days</option>
                <option value="90d">Last 90 days</option>
                <option value="year">Last year</option>
                <option value="lifetime">Lifetime</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          <div className="flex gap-4 mb-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'videos'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Videos
            </button>
            <button
              onClick={() => setActiveTab('audience')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'audience'
                  ? 'text-red-600 border-b-2 border-red-600'
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
                  value={summary.totalViews}
                  icon={Eye}
                  iconColor="text-blue-600"
                  formatValue={(v) => v.toLocaleString()}
                />
                <MetricCard
                  title="Watch Time"
                  value={formatWatchTime(summary.totalWatchTime)}
                  icon={Clock}
                  iconColor="text-purple-600"
                  subtitle={`Avg: ${formatDuration(summary.avgViewDuration)}`}
                />
                <MetricCard
                  title="Subscribers"
                  value={summary.subscribers}
                  icon={Users}
                  iconColor="text-green-600"
                  formatValue={(v) => v.toLocaleString()}
                  change={summary.subscriberGains > 0 ? ((summary.subscriberGains - summary.subscriberLosses) / Math.max(summary.subscribers - summary.subscriberGains, 1)) * 100 : 0}
                />
                <MetricCard
                  title="Subscriber Growth"
                  value={`+${summary.subscriberGains - summary.subscriberLosses}`}
                  icon={TrendingUp}
                  iconColor="text-orange-600"
                  subtitle={`${summary.subscriberGains} gained, ${summary.subscriberLosses} lost`}
                />
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Views Over Time</h2>
                <LineChart
                  data={viewsData}
                  height={300}
                  color="#dc2626"
                  formatValue={(v) => v.toLocaleString()}
                />
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Top Performing Videos</h2>
                <div className="space-y-4">
                  {topVideos.map((video, i) => (
                    <div
                      key={video.id}
                      onClick={() => navigate(`/hutube/analytics/video/${video.id}`)}
                      className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="text-2xl font-bold text-gray-400 w-8">{i + 1}</div>
                      <img
                        src={video.thumbnail_url || 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400'}
                        alt={video.title}
                        className="w-32 h-18 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 line-clamp-1">{video.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(video.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-gray-900 font-medium">
                          <Eye className="w-4 h-4" />
                          {video.views.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">All Videos Performance</h2>
                <input
                  type="text"
                  placeholder="Search videos..."
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Video</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Published</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Views</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Watch Time</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Avg Duration</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVideos.map((video) => (
                      <tr
                        key={video.id}
                        onClick={() => navigate(`/hutube/analytics/video/${video.id}`)}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={video.thumbnail_url || 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400'}
                              alt={video.title}
                              className="w-20 h-12 object-cover rounded"
                            />
                            <span className="font-medium text-gray-900 line-clamp-2">{video.title}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(video.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {video.views.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatWatchTime(video.watchTime)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatDuration(video.avgDuration)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-green-600">
                          {video.views > 0 ? ((video.avgDuration / 100) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'audience' && (
            <div className="space-y-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Subscriber Growth</h2>
                <LineChart
                  data={viewsData.map(d => ({ date: d.date, value: Math.floor(d.value * 0.05) }))}
                  height={300}
                  color="#10b981"
                  formatValue={(v) => v.toLocaleString()}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Viewer Demographics</h2>
                  <BarChart
                    data={[
                      { label: '18-24', value: 1250 },
                      { label: '25-34', value: 2100 },
                      { label: '35-44', value: 1800 },
                      { label: '45-54', value: 950 },
                      { label: '55+', value: 600 }
                    ]}
                    height={300}
                    formatValue={(v) => v.toLocaleString()}
                  />
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Top Locations</h2>
                  <div className="space-y-4">
                    {[
                      { country: 'United States', views: 5200, percentage: 42 },
                      { country: 'United Kingdom', views: 2100, percentage: 17 },
                      { country: 'Canada', views: 1800, percentage: 15 },
                      { country: 'Australia', views: 1200, percentage: 10 },
                      { country: 'Germany', views: 950, percentage: 8 }
                    ].map((location, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-32 text-sm font-medium text-gray-700">{location.country}</div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-100 rounded-full h-6">
                            <div
                              className="bg-blue-600 h-6 rounded-full flex items-center justify-end px-3 text-white text-xs font-medium"
                              style={{ width: `${location.percentage}%` }}
                            >
                              {location.views.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">When Your Viewers Are Active</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Understanding when your audience is most active can help you schedule your uploads for maximum impact.
                </p>
                <Heatmap
                  data={[
                    [120, 85, 65, 45, 35, 40, 80, 150, 180, 165, 140, 135, 145, 160, 175, 190, 210, 230, 245, 220, 200, 180, 160, 140],
                    [110, 75, 55, 40, 30, 35, 70, 140, 170, 155, 130, 125, 135, 150, 165, 180, 200, 220, 235, 210, 190, 170, 150, 130],
                    [100, 70, 50, 38, 28, 33, 65, 135, 165, 150, 125, 120, 130, 145, 160, 175, 195, 215, 230, 205, 185, 165, 145, 125],
                    [95, 68, 48, 36, 26, 31, 62, 130, 160, 145, 120, 115, 125, 140, 155, 170, 190, 210, 225, 200, 180, 160, 140, 120],
                    [105, 73, 53, 39, 29, 34, 68, 138, 168, 153, 128, 123, 133, 148, 163, 178, 198, 218, 233, 208, 188, 168, 148, 128],
                    [115, 80, 60, 43, 33, 38, 75, 145, 175, 160, 135, 130, 140, 155, 170, 185, 205, 225, 240, 215, 195, 175, 155, 135],
                    [125, 90, 70, 50, 40, 45, 85, 155, 185, 170, 145, 140, 150, 165, 180, 195, 215, 235, 250, 225, 205, 185, 165, 145]
                  ]}
                  rowLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
                  columnLabels={Array.from({ length: 24 }, (_, i) => `${i}:00`)}
                  formatValue={(v) => v.toLocaleString()}
                  title=""
                />
              </div>
            </div>
          )}
        </div>
      </HuTubeLayout>
    </PlatformGuard>
  );
}
