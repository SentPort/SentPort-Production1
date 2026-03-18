import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart3, Eye, Users, Clock, TrendingUp, ArrowLeft, Calendar, ExternalLink, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DeleteSubdomainModal from '../components/shared/DeleteSubdomainModal';

interface Subdomain {
  id: string;
  subdomain: string;
  status: string;
  created_at: string;
}

interface PageAnalytics {
  page_id: string | null;
  page_path: string;
  page_title: string;
  page_views: number;
  unique_visitors: number;
  avg_session_duration: number;
  bounce_rate: number;
}

interface DailyStats {
  date: string;
  page_views: number;
  unique_visitors: number;
}

interface ReferrerData {
  source: string;
  count: number;
}

export default function SubdomainAnalytics() {
  const { subdomainId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subdomain, setSubdomain] = useState<Subdomain | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [totalStats, setTotalStats] = useState({
    totalVisitors: 0,
    totalPageViews: 0,
    avgSessionDuration: 0,
    bounceRate: 0,
  });
  const [pageAnalytics, setPageAnalytics] = useState<PageAnalytics[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topReferrers, setTopReferrers] = useState<ReferrerData[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (user && subdomainId) {
      loadSubdomainData();
    }
  }, [user, subdomainId, timeRange]);

  const loadSubdomainData = async () => {
    setLoading(true);
    try {
      const { data: subdomainData, error: subdomainError } = await supabase
        .from('subdomains')
        .select('*')
        .eq('id', subdomainId)
        .eq('owner_id', user?.id)
        .maybeSingle();

      if (subdomainError) throw subdomainError;
      if (!subdomainData) {
        navigate('/dashboard');
        return;
      }

      setSubdomain(subdomainData);

      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: analyticsData, error: analyticsError } = await supabase
        .from('subdomain_analytics_daily')
        .select('*')
        .eq('subdomain_id', subdomainId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (analyticsError) throw analyticsError;

      const overallStats = (analyticsData || []).reduce((acc, record) => {
        acc.totalVisitors += record.unique_visitors || 0;
        acc.totalPageViews += record.page_views || 0;
        acc.totalDuration += record.total_session_duration_seconds || 0;
        acc.totalBounces += record.bounce_count || 0;
        return acc;
      }, { totalVisitors: 0, totalPageViews: 0, totalDuration: 0, totalBounces: 0 });

      setTotalStats({
        totalVisitors: overallStats.totalVisitors,
        totalPageViews: overallStats.totalPageViews,
        avgSessionDuration: overallStats.totalPageViews > 0
          ? Math.round(overallStats.totalDuration / overallStats.totalPageViews)
          : 0,
        bounceRate: overallStats.totalPageViews > 0
          ? Math.round((overallStats.totalBounces / overallStats.totalPageViews) * 100)
          : 0,
      });

      const dailyData = (analyticsData || [])
        .filter(record => !record.page_id)
        .map(record => ({
          date: record.date,
          page_views: record.page_views || 0,
          unique_visitors: record.unique_visitors || 0,
        }))
        .reverse();
      setDailyStats(dailyData);

      const { data: pagesData } = await supabase
        .from('subdomain_pages')
        .select('*')
        .eq('subdomain_id', subdomainId)
        .eq('is_published', true);

      const pageStats = await Promise.all((pagesData || []).map(async (page) => {
        const pageAnalytics = (analyticsData || []).filter(record => record.page_id === page.id);
        const stats = pageAnalytics.reduce((acc, record) => {
          acc.views += record.page_views || 0;
          acc.visitors += record.unique_visitors || 0;
          acc.duration += record.total_session_duration_seconds || 0;
          acc.bounces += record.bounce_count || 0;
          return acc;
        }, { views: 0, visitors: 0, duration: 0, bounces: 0 });

        return {
          page_id: page.id,
          page_path: page.page_path,
          page_title: page.page_title,
          page_views: stats.views,
          unique_visitors: stats.visitors,
          avg_session_duration: stats.views > 0 ? Math.round(stats.duration / stats.views) : 0,
          bounce_rate: stats.views > 0 ? Math.round((stats.bounces / stats.views) * 100) : 0,
        };
      }));

      setPageAnalytics(pageStats.sort((a, b) => b.page_views - a.page_views));

      const referrerMap = new Map<string, number>();
      (analyticsData || []).forEach(record => {
        if (record.referrer_breakdown) {
          Object.entries(record.referrer_breakdown as Record<string, number>).forEach(([source, count]) => {
            referrerMap.set(source, (referrerMap.get(source) || 0) + count);
          });
        }
      });

      const referrerArray = Array.from(referrerMap.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopReferrers(referrerArray);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleSubdomainDeleted = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!subdomain) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-blue-600" />
                Subdomain Analytics
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-lg text-gray-600">{subdomain.subdomain}.sentport.com</p>
                <a
                  href={`https://${subdomain.subdomain}.sentport.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <span className={`ml-2 px-3 py-1 text-xs font-medium rounded-full ${
                  subdomain.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {subdomain.status === 'active' ? 'Published' : 'Unpublished'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm p-1">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  timeRange === '7d'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  timeRange === '30d'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  timeRange === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All Time
              </button>
              </div>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Delete Subdomain
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Visitors</h3>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalStats.totalVisitors.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Unique sessions</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Page Views</h3>
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalStats.totalPageViews.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Total page views</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Avg. Session</h3>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatDuration(totalStats.avgSessionDuration)}</p>
            <p className="text-xs text-gray-500 mt-1">Time on site</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Bounce Rate</h3>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalStats.bounceRate}%</p>
            <p className="text-xs text-gray-500 mt-1">Single page visits</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Traffic Over Time
            </h3>
            {dailyStats.length > 0 ? (
              <div className="space-y-2">
                {dailyStats.slice(0, 10).map((stat, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">{new Date(stat.date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-900">{stat.unique_visitors} visitors</span>
                      <span className="text-sm text-gray-500">{stat.page_views} views</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No traffic data yet</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top Referrers
            </h3>
            {topReferrers.length > 0 ? (
              <div className="space-y-3">
                {topReferrers.map((referrer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-300">{index + 1}</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">{referrer.source}</span>
                    </div>
                    <span className="text-sm text-gray-600">{referrer.count} visits</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No referrer data yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Page Performance</h3>
          {pageAnalytics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visitors
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg. Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bounce Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pageAnalytics.map((page, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{page.page_title}</div>
                          <div className="text-xs text-gray-500">{page.page_path}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {page.page_views.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {page.unique_visitors.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(page.avg_session_duration)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {page.bounce_rate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No published pages yet</p>
              <p className="text-sm text-gray-400 mt-1">Publish pages from your website builder to start tracking analytics</p>
            </div>
          )}
        </div>
      </div>

      <DeleteSubdomainModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        subdomain={subdomain}
        onDeleted={handleSubdomainDeleted}
      />
    </div>
  );
}
