import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, Clock, ThumbsUp, MessageSquare, Share2, TrendingUp, ArrowLeft, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HuTubeLayout from '../../components/shared/HuTubeLayout';
import MetricCard from '../../components/hutube/analytics/MetricCard';
import LineChart from '../../components/hutube/analytics/LineChart';
import PieChart from '../../components/hutube/analytics/PieChart';
import RetentionGraph from '../../components/hutube/analytics/RetentionGraph';
import BarChart from '../../components/hutube/analytics/BarChart';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  channel_id: string;
}

interface VideoAnalyticsSummary {
  totalViews: number;
  watchTime: number;
  avgDuration: number;
  likes: number;
  comments: number;
  shares: number;
}

type DateRange = '7d' | '28d' | '90d' | 'lifetime';

export default function VideoAnalytics() {
  const { videoId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<Video | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('28d');
  const [summary, setSummary] = useState<VideoAnalyticsSummary>({
    totalViews: 0,
    watchTime: 0,
    avgDuration: 0,
    likes: 0,
    comments: 0,
    shares: 0
  });
  const [viewsData, setViewsData] = useState<{ date: string; value: number }[]>([]);
  const [trafficSources, setTrafficSources] = useState<{ label: string; value: number }[]>([]);
  const [retentionData, setRetentionData] = useState<{ timestamp: number; percentage: number }[]>([]);
  const [deviceData, setDeviceData] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    loadVideoAnalytics();
  }, [videoId, dateRange]);

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
      case 'lifetime':
        start.setFullYear(2020, 0, 1);
        break;
    }

    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
  };

  const loadVideoAnalytics = async () => {
    if (!user || !videoId) return;

    try {
      const { data: videoData, error: videoError } = await supabase
        .from('hutube_videos')
        .select('*, hutube_channels!inner(user_id)')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;

      if (videoData.hutube_channels.user_id !== user.id) {
        navigate('/hutube/analytics');
        return;
      }

      setVideo(videoData);
      const { start, end } = getDateRange();

      const { data: summaryData } = await supabase.rpc('get_video_analytics_summary_with_fallback', {
        p_video_id: videoId,
        p_start_date: start,
        p_end_date: end
      });

      if (summaryData && summaryData.length > 0) {
        const s = summaryData[0];
        setSummary({
          totalViews: parseInt(s.total_views) || 0,
          watchTime: parseInt(s.total_watch_time_seconds) || 0,
          avgDuration: parseInt(s.avg_view_duration_seconds) || 0,
          likes: parseInt(s.total_likes) || 0,
          comments: parseInt(s.total_comments) || 0,
          shares: parseInt(s.total_shares) || 0
        });
      }

      const { data: dailyData } = await supabase
        .from('hutube_video_analytics_daily')
        .select('date, views')
        .eq('video_id', videoId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      if (dailyData) {
        setViewsData(dailyData.map(d => ({ date: d.date, value: d.views })));
      }

      const { data: trafficData } = await supabase
        .from('hutube_traffic_sources')
        .select('source_type, views')
        .eq('video_id', videoId)
        .gte('date', start)
        .lte('date', end);

      if (trafficData) {
        const aggregated = trafficData.reduce((acc, curr) => {
          const existing = acc.find(item => item.label === curr.source_type);
          if (existing) {
            existing.value += curr.views;
          } else {
            acc.push({ label: curr.source_type, value: curr.views });
          }
          return acc;
        }, [] as { label: string; value: number }[]);
        setTrafficSources(aggregated);
      }

      const { data: retentionDataRaw } = await supabase
        .from('hutube_audience_retention')
        .select('timestamp_seconds, retention_percentage')
        .eq('video_id', videoId)
        .order('timestamp_seconds', { ascending: true });

      if (retentionDataRaw) {
        setRetentionData(retentionDataRaw.map(d => ({
          timestamp: d.timestamp_seconds,
          percentage: parseFloat(d.retention_percentage)
        })));
      }

      const { data: deviceDataRaw } = await supabase
        .from('hutube_watch_sessions')
        .select('device_type')
        .eq('video_id', videoId)
        .gte('created_at', start)
        .lte('created_at', end);

      if (deviceDataRaw) {
        const deviceCounts = deviceDataRaw.reduce((acc, curr) => {
          const device = curr.device_type || 'other';
          acc[device] = (acc[device] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        setDeviceData(Object.entries(deviceCounts).map(([label, value]) => ({ label, value })));
      }

    } catch (error) {
      console.error('Error loading video analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  if (!video) {
    return (
      <PlatformGuard platform="hutube">
        <HuTubeLayout>
          <div className="max-w-4xl mx-auto px-4 py-16 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Video Not Found</h2>
            <button
              onClick={() => navigate('/hutube/analytics')}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Back to Analytics
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
          <button
            onClick={() => navigate('/hutube/analytics')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Analytics
          </button>

          <div className="flex items-start gap-6 mb-8">
            <img
              src={video.thumbnail_url || 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400'}
              alt={video.title}
              className="w-48 h-27 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
              <p className="text-gray-600 mt-2">
                Published {new Date(video.created_at).toLocaleDateString()} • {formatDuration(video.duration)}
              </p>
              <div className="flex items-center gap-4 mt-4">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="28d">Last 28 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MetricCard
                title="Views"
                value={summary.totalViews}
                icon={Eye}
                iconColor="text-blue-600"
                formatValue={(v) => v.toLocaleString()}
              />
              <MetricCard
                title="Watch Time"
                value={formatWatchTime(summary.watchTime)}
                icon={Clock}
                iconColor="text-purple-600"
                subtitle={`Avg: ${formatDuration(summary.avgDuration)}`}
              />
              <MetricCard
                title="Likes"
                value={summary.likes}
                icon={ThumbsUp}
                iconColor="text-green-600"
                formatValue={(v) => v.toLocaleString()}
              />
              <MetricCard
                title="Comments"
                value={summary.comments}
                icon={MessageSquare}
                iconColor="text-orange-600"
                formatValue={(v) => v.toLocaleString()}
              />
              <MetricCard
                title="Shares"
                value={summary.shares}
                icon={Share2}
                iconColor="text-pink-600"
                formatValue={(v) => v.toLocaleString()}
              />
              <MetricCard
                title="Engagement Rate"
                value={`${summary.totalViews > 0 ? ((summary.likes + summary.comments + summary.shares) / summary.totalViews * 100).toFixed(2) : 0}%`}
                icon={TrendingUp}
                iconColor="text-indigo-600"
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

            {retentionData.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Audience Retention</h2>
                <RetentionGraph
                  data={retentionData}
                  duration={video.duration}
                  height={300}
                />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {trafficSources.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Traffic Sources</h2>
                  <PieChart
                    data={trafficSources}
                    size={250}
                    formatValue={(v) => v.toLocaleString()}
                  />
                </div>
              )}

              {deviceData.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Device Types</h2>
                  <BarChart
                    data={deviceData}
                    height={300}
                    formatValue={(v) => v.toLocaleString()}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </HuTubeLayout>
    </PlatformGuard>
  );
}
