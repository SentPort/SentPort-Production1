import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePostAnalytics } from '../../hooks/usePostAnalytics';
import MetricCard from '../../components/hinsta/analytics/MetricCard';
import LineChart from '../../components/hinsta/analytics/LineChart';
import BarChart from '../../components/hinsta/analytics/BarChart';
import PieChart from '../../components/hinsta/analytics/PieChart';
import { Eye, Heart, MessageCircle, Share2, Bookmark, Users, Clock, ArrowLeft } from 'lucide-react';

type DateRange = '7' | '28' | '90' | 'all';

export default function PostAnalytics() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>('28');

  const getDateRange = () => {
    if (dateRange === 'all') return { startDate: undefined, endDate: undefined };
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));
    return { startDate: startDate.toISOString().split('T')[0], endDate };
  };

  const { startDate, endDate } = getDateRange();
  const { data, loading, error } = usePostAnalytics(postId || null, startDate, endDate);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading post analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load post analytics'}</p>
          <button
            onClick={() => navigate('/hinsta/analytics')}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            Back to Analytics
          </button>
        </div>
      </div>
    );
  }

  const { post, metrics, daily_views, traffic_sources, engagement_rate } = data;

  const deviceData = [
    { label: 'Mobile', value: metrics.mobile_views, color: '#ec4899' },
    { label: 'Desktop', value: metrics.desktop_views, color: '#8b5cf6' },
    { label: 'Tablet', value: metrics.tablet_views, color: '#3b82f6' },
  ];

  const chartData = daily_views.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: item.views,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/hinsta/analytics')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Analytics
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Post Analytics</h1>

          <div className="flex items-center gap-4 mb-6">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="7">Last 7 days</option>
              <option value="28">Last 28 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
            <div className="flex gap-6">
              <img
                src={post.media_url}
                alt="Post"
                className="w-48 h-48 object-cover rounded-lg"
              />
              <div className="flex-1">
                <p className="text-gray-800 mb-4">{post.caption || 'No caption'}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Posted {new Date(post.created_at).toLocaleDateString()}</span>
                  <span>by @{post.author_username}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Views"
              value={post.view_count.toLocaleString()}
              icon={<Eye className="w-5 h-5" />}
              subtitle={`${metrics.unique_viewers} unique`}
            />
            <MetricCard
              title="Engagement Rate"
              value={`${engagement_rate}%`}
              icon={<Users className="w-5 h-5" />}
              subtitle="Interactions per view"
            />
            <MetricCard
              title="Avg. View Time"
              value={`${metrics.avg_view_duration}s`}
              icon={<Clock className="w-5 h-5" />}
              subtitle="Average duration"
            />
            <MetricCard
              title="Total Engagement"
              value={(post.like_count + post.comment_count + post.share_count + post.save_count).toLocaleString()}
              icon={<Heart className="w-5 h-5" />}
              subtitle="All interactions"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Likes"
              value={post.like_count.toLocaleString()}
              icon={<Heart className="w-5 h-5" />}
            />
            <MetricCard
              title="Comments"
              value={post.comment_count.toLocaleString()}
              icon={<MessageCircle className="w-5 h-5" />}
            />
            <MetricCard
              title="Shares"
              value={post.share_count.toLocaleString()}
              icon={<Share2 className="w-5 h-5" />}
            />
            <MetricCard
              title="Saves"
              value={post.save_count.toLocaleString()}
              icon={<Bookmark className="w-5 h-5" />}
            />
          </div>

          <LineChart
            data={chartData}
            title="Views Over Time"
            color="#ec4899"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChart
              title="Views by Device"
              data={deviceData}
            />

            <BarChart
              title="Traffic Sources"
              data={traffic_sources.map((source) => ({
                label: source.source === 'direct' ? 'Direct' : source.source,
                value: source.views,
              }))}
            />
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Like Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {post.view_count > 0 ? ((post.like_count / post.view_count) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Comment Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {post.view_count > 0 ? ((post.comment_count / post.view_count) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Share Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {post.view_count > 0 ? ((post.share_count / post.view_count) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Save Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {post.view_count > 0 ? ((post.save_count / post.view_count) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
