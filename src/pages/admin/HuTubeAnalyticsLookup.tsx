import { useState, useEffect } from 'react';
import { Search, Eye, Clock, Users, TrendingUp, Video, Download, ArrowLeft, User, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/Header';
import MetricCard from '../../components/hutube/analytics/MetricCard';
import LineChart from '../../components/hutube/analytics/LineChart';
import BarChart from '../../components/hutube/analytics/BarChart';
import Heatmap from '../../components/hutube/analytics/Heatmap';

interface ChannelSearchResult {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  subscriber_count: number;
  user_id: string;
  email: string;
  full_name: string | null;
  video_count: number;
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

export default function HuTubeAnalyticsLookup() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChannelSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
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
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        searchChannels();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedChannel) {
      loadAnalytics();
    }
  }, [selectedChannel, dateRange]);

  const searchChannels = async () => {
    setSearching(true);
    try {
      const query = searchQuery.trim();

      const { data: channels, error: channelsError } = await supabase
        .from('hutube_channels')
        .select('id, handle, display_name, avatar_url, subscriber_count, user_id')
        .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);

      if (channelsError) {
        console.error('Channel search error:', channelsError);
        throw channelsError;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .limit(20);

      if (profilesError) {
        console.error('Profile search error:', profilesError);
      }

      const channelsByHandle = channels || [];
      const profileIds = (profiles || []).map(p => p.id);

      let channelsByEmail: any[] = [];
      if (profileIds.length > 0) {
        const { data: emailChannels } = await supabase
          .from('hutube_channels')
          .select('id, handle, display_name, avatar_url, subscriber_count, user_id')
          .in('user_id', profileIds);

        channelsByEmail = emailChannels || [];
      }

      const allChannels = [...channelsByHandle, ...channelsByEmail];
      const uniqueChannels = Array.from(
        new Map(allChannels.map(c => [c.id, c])).values()
      );

      const channelIds = uniqueChannels.map(c => c.id);
      const userIds = uniqueChannels.map(c => c.user_id);

      const { data: videoCounts } = await supabase
        .from('hutube_videos')
        .select('channel_id')
        .in('channel_id', channelIds);

      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const videoCountMap = (videoCounts || []).reduce((acc, v) => {
        acc[v.channel_id] = (acc[v.channel_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const profileMap = (userProfiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);

      const results: ChannelSearchResult[] = uniqueChannels.map(channel => {
        const profile = profileMap[channel.user_id];
        return {
          id: channel.id,
          handle: channel.handle,
          display_name: channel.display_name,
          avatar_url: channel.avatar_url,
          subscriber_count: channel.subscriber_count,
          user_id: channel.user_id,
          email: profile?.email || 'Unknown',
          full_name: profile?.full_name || null,
          video_count: videoCountMap[channel.id] || 0
        };
      });

      setSearchResults(results);

    } catch (error) {
      console.error('Error searching channels:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

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
    if (!selectedChannel) return;

    setLoading(true);
    try {
      const { start, end } = getDateRange();

      const { data: summaryData } = await supabase.rpc('get_channel_analytics_summary_with_fallback', {
        p_channel_id: selectedChannel.id,
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
        .eq('channel_id', selectedChannel.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      if (dailyData) {
        setViewsData(dailyData.map(d => ({ date: d.date, value: d.views })));
      }

      const { data: videosData } = await supabase
        .from('hutube_videos')
        .select('id, title, thumbnail_url, view_count, created_at')
        .eq('channel_id', selectedChannel.id)
        .order('view_count', { ascending: false })
        .limit(10);

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

  const exportToCSV = () => {
    if (!selectedChannel) return;

    const csvData = [
      ['Channel Analytics Export'],
      ['Channel', selectedChannel.display_name],
      ['Handle', `@${selectedChannel.handle}`],
      ['Email', selectedChannel.email],
      ['Date Range', dateRange],
      [''],
      ['Metric', 'Value'],
      ['Total Views', summary.totalViews],
      ['Watch Time (hours)', Math.floor(summary.totalWatchTime / 3600)],
      ['Subscribers', summary.subscribers],
      ['Avg View Duration (seconds)', summary.avgViewDuration],
      ['Subscriber Gains', summary.subscriberGains],
      ['Subscriber Losses', summary.subscriberLosses],
      [''],
      ['Top Videos'],
      ['Title', 'Views', 'Published'],
      ...topVideos.map(v => [v.title, v.views, new Date(v.created_at).toLocaleDateString()])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedChannel.handle}_analytics_${dateRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (selectedChannel) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button
              onClick={() => setSelectedChannel(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Search
            </button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-4">
                {selectedChannel.avatar_url ? (
                  <img
                    src={selectedChannel.avatar_url}
                    alt={selectedChannel.display_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">
                    Viewing Analytics for {selectedChannel.display_name}
                  </h2>
                  <p className="text-gray-600">@{selectedChannel.handle} • {selectedChannel.email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Channel Analytics</h1>
                <p className="text-gray-600 mt-1">Admin view of creator performance and growth</p>
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
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <>
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
                            className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50"
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
                    <h2 className="text-xl font-bold text-gray-900 mb-6">All Videos Performance</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Video</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">Published</th>
                            <th className="text-right py-3 px-4 font-medium text-gray-700">Views</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topVideos.map((video) => (
                            <tr key={video.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                      <h2 className="text-xl font-bold text-gray-900 mb-6">When Viewers Are Active</h2>
                      <p className="text-sm text-gray-600 mb-4">
                        Understanding when the audience is most active
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
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">HuTube Creator Analytics Access</h1>
            <p className="text-gray-600 mt-2">Search for creators by name, email, or channel handle</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by creator name, email, or @handle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {searching && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          )}

          {!searching && searchResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((channel) => (
                <div
                  key={channel.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4 mb-4">
                    {channel.avatar_url ? (
                      <img
                        src={channel.avatar_url}
                        alt={channel.display_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{channel.display_name}</h3>
                      <p className="text-sm text-gray-600 truncate">@{channel.handle}</p>
                      <p className="text-xs text-gray-500 truncate">{channel.email}</p>
                      {channel.full_name && (
                        <p className="text-xs text-gray-500 truncate">{channel.full_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600">Subscribers</div>
                      <div className="text-lg font-bold text-gray-900">
                        {channel.subscriber_count.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-600">Videos</div>
                      <div className="text-lg font-bold text-gray-900">
                        {channel.video_count}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedChannel(channel)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    View Analytics
                  </button>
                </div>
              ))}
            </div>
          )}

          {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No channels found</h3>
              <p className="text-gray-600">
                Try searching with a different name, email, or handle
              </p>
            </div>
          )}

          {searchQuery.trim().length === 0 && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200 p-8 text-center">
              <Search className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Search for Creator Analytics</h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Enter a creator's name, email address, or channel handle to access their full HuTube analytics dashboard.
                You'll be able to view all metrics, export data, and track their channel performance.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
