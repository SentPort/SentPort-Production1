import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Search, Activity, Calendar, Globe, DollarSign, Target, Clock, Zap, Video, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import { InfoTooltip } from '../../components/shared/InfoTooltip';

type TimeRange = 'today' | 'week' | 'month' | 'all';

interface DAUMAUMetrics {
  totalDau: number;
  totalMau: number;
  dauMauRatio: number;
  hubookDau: number;
  blogDau: number;
  hedditDau: number;
  hinstaDau: number;
  switterDau: number;
  hutubeDau: number;
  subdomainDau: number;
}

interface SearchMetrics {
  dailySearches: number;
  monthlySearches: number;
  uniqueDailySearchers: number;
  topSearchQueries: Array<{ query: string; count: number }>;
  avgResultsPerSearch: number;
  mainSearchCount: number;
  hedditSearchCount: number;
  peakSearchHour: number;
}

interface SubdomainMetrics {
  totalSubdomains: number;
  activeSubdomains: number;
  monthlyTraffic: number;
  avgTrafficPerSubdomain: number;
  growthRate: number;
  estimatedAdRevenueLow: number;
  estimatedAdRevenueMid: number;
  estimatedAdRevenueHigh: number;
}

interface DemographicMetrics {
  ageDistribution: Array<{ ageGroup: string; count: number; percentage: number }>;
  genderDistribution: Array<{ gender: string; count: number; percentage: number }>;
  topLocations: Array<{ location: string; count: number; percentage: number }>;
  topInterests: Array<{ interest: string; count: number }>;
  relationshipStatus: Array<{ status: string; count: number; percentage: number }>;
  totalUsers: number;
  avgAge: number;
}

interface TopSubdomain {
  subdomainName: string;
  ownerEmail: string;
  monthlyVisitors: number;
  monthlyPageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  estimatedAdValueLow: number;
  estimatedAdValueMid: number;
  estimatedAdValueHigh: number;
  topPages: Array<{ pagePath: string; pageViews: number }>;
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [dauMauMetrics, setDauMauMetrics] = useState<DAUMAUMetrics>({
    totalDau: 0,
    totalMau: 0,
    dauMauRatio: 0,
    hubookDau: 0,
    blogDau: 0,
    hedditDau: 0,
    hinstaDau: 0,
    switterDau: 0,
    hutubeDau: 0,
    subdomainDau: 0
  });
  const [searchMetrics, setSearchMetrics] = useState<SearchMetrics>({
    dailySearches: 0,
    monthlySearches: 0,
    uniqueDailySearchers: 0,
    topSearchQueries: [],
    avgResultsPerSearch: 0,
    mainSearchCount: 0,
    hedditSearchCount: 0,
    peakSearchHour: 0
  });
  const [subdomainMetrics, setSubdomainMetrics] = useState<SubdomainMetrics>({
    totalSubdomains: 0,
    activeSubdomains: 0,
    monthlyTraffic: 0,
    avgTrafficPerSubdomain: 0,
    growthRate: 0,
    estimatedAdRevenueLow: 0,
    estimatedAdRevenueMid: 0,
    estimatedAdRevenueHigh: 0
  });
  const [demographicMetrics, setDemographicMetrics] = useState<DemographicMetrics>({
    ageDistribution: [],
    genderDistribution: [],
    topLocations: [],
    topInterests: [],
    relationshipStatus: [],
    totalUsers: 0,
    avgAge: 0
  });
  const [topSubdomains, setTopSubdomains] = useState<TopSubdomain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllMetrics();
  }, [timeRange]);

  const fetchAllMetrics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDAUMAUMetrics(),
        fetchSearchMetrics(),
        fetchSubdomainMetrics(),
        fetchDemographicMetrics(),
        fetchTopSubdomains()
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        return { startDate: now.toISOString().split('T')[0], days: 1 };
      case 'week':
        return {
          startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          days: 7
        };
      case 'month':
        return {
          startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          days: 30
        };
      case 'all':
        return { startDate: '2020-01-01', days: null };
      default:
        return {
          startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          days: 30
        };
    }
  };

  const fetchDAUMAUMetrics = async () => {
    try {
      const { startDate, days } = getDateRange();

      const { data: summaries } = await supabase
        .from('daily_active_users_summary')
        .select('*')
        .gte('summary_date', startDate)
        .order('summary_date', { ascending: false });

      if (!summaries || summaries.length === 0) {
        setDauMauMetrics({
          totalDau: 0,
          totalMau: 0,
          dauMauRatio: 0,
          hubookDau: 0,
          blogDau: 0,
          hedditDau: 0,
          hinstaDau: 0,
          switterDau: 0,
          hutubeDau: 0,
          subdomainDau: 0
        });
        return;
      }

      const avgDau = Math.round(summaries.reduce((sum, s) => sum + (s.total_dau || 0), 0) / summaries.length);
      const avgMau = Math.round(summaries.reduce((sum, s) => sum + (s.total_mau || 0), 0) / summaries.length);
      const avgHubook = Math.round(summaries.reduce((sum, s) => sum + (s.hubook_dau || 0), 0) / summaries.length);
      const avgBlog = Math.round(summaries.reduce((sum, s) => sum + (s.blog_dau || 0), 0) / summaries.length);
      const avgHeddit = Math.round(summaries.reduce((sum, s) => sum + (s.heddit_dau || 0), 0) / summaries.length);
      const avgHinsta = Math.round(summaries.reduce((sum, s) => sum + (s.hinsta_dau || 0), 0) / summaries.length);
      const avgSwitter = Math.round(summaries.reduce((sum, s) => sum + (s.switter_dau || 0), 0) / summaries.length);
      const avgHutube = Math.round(summaries.reduce((sum, s) => sum + (s.hutube_dau || 0), 0) / summaries.length);
      const avgSubdomain = Math.round(summaries.reduce((sum, s) => sum + (s.subdomain_dau || 0), 0) / summaries.length);
      const avgRatio = avgMau > 0 ? (avgDau / avgMau) * 100 : 0;

      setDauMauMetrics({
        totalDau: avgDau,
        totalMau: avgMau,
        dauMauRatio: avgRatio,
        hubookDau: avgHubook,
        blogDau: avgBlog,
        hedditDau: avgHeddit,
        hinstaDau: avgHinsta,
        switterDau: avgSwitter,
        hutubeDau: avgHutube,
        subdomainDau: avgSubdomain
      });
    } catch (error) {
      console.error('Error fetching DAU/MAU metrics:', error);
    }
  };

  const fetchSearchMetrics = async () => {
    try {
      const { startDate } = getDateRange();

      const { data: rangeMetrics } = await supabase
        .from('search_advertising_metrics')
        .select('*')
        .gte('metric_date', startDate);

      if (!rangeMetrics || rangeMetrics.length === 0) {
        setSearchMetrics({
          dailySearches: 0,
          monthlySearches: 0,
          uniqueDailySearchers: 0,
          topSearchQueries: [],
          avgResultsPerSearch: 0,
          mainSearchCount: 0,
          hedditSearchCount: 0,
          peakSearchHour: 12
        });
        return;
      }

      const totalSearches = rangeMetrics.reduce((sum, m) => sum + (m.total_searches || 0), 0);
      const avgDailySearches = Math.round(totalSearches / rangeMetrics.length);
      const avgDailySearchers = Math.round(rangeMetrics.reduce((sum, m) => sum + (m.unique_searchers || 0), 0) / rangeMetrics.length);
      const avgResults = rangeMetrics.reduce((sum, m) => sum + (m.avg_results_per_search || 0), 0) / rangeMetrics.length;
      const avgMainSearch = Math.round(rangeMetrics.reduce((sum, m) => sum + (m.main_search_count || 0), 0) / rangeMetrics.length);
      const avgHedditSearch = Math.round(rangeMetrics.reduce((sum, m) => sum + (m.heddit_search_count || 0), 0) / rangeMetrics.length);

      const { data: topQueries } = await supabase
        .from('top_search_queries')
        .select('query_text, search_count')
        .order('search_count', { ascending: false })
        .limit(10);

      const { data: hourlyDist } = await supabase
        .from('search_hourly_distribution')
        .select('*')
        .order('total_searches', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSearchMetrics({
        dailySearches: avgDailySearches,
        monthlySearches: totalSearches,
        uniqueDailySearchers: avgDailySearchers,
        topSearchQueries: topQueries?.map(q => ({ query: q.query_text, count: q.search_count })) || [],
        avgResultsPerSearch: avgResults,
        mainSearchCount: avgMainSearch,
        hedditSearchCount: avgHedditSearch,
        peakSearchHour: hourlyDist?.hour_of_day || 12
      });
    } catch (error) {
      console.error('Error fetching search metrics:', error);
    }
  };

  const fetchSubdomainMetrics = async () => {
    try {
      const { startDate } = getDateRange();

      const { data: rangeMetrics } = await supabase
        .from('subdomain_advertising_metrics')
        .select('*')
        .gte('metric_date', startDate)
        .order('metric_date', { ascending: false });

      if (!rangeMetrics || rangeMetrics.length === 0) {
        setSubdomainMetrics({
          totalSubdomains: 0,
          activeSubdomains: 0,
          monthlyTraffic: 0,
          avgTrafficPerSubdomain: 0,
          growthRate: 0,
          estimatedAdRevenueLow: 0,
          estimatedAdRevenueMid: 0,
          estimatedAdRevenueHigh: 0
        });
        return;
      }

      const latestMetric = rangeMetrics[0];
      const totalTraffic = rangeMetrics.reduce((sum, m) => sum + (m.total_subdomain_visits || 0), 0);
      const avgTraffic = rangeMetrics.reduce((sum, m) => sum + (m.avg_traffic_per_subdomain || 0), 0) / rangeMetrics.length;

      const estimatedAdRevenueLow = (totalTraffic / 1000) * 1;
      const estimatedAdRevenueMid = (totalTraffic / 1000) * 5;
      const estimatedAdRevenueHigh = (totalTraffic / 1000) * 15;

      setSubdomainMetrics({
        totalSubdomains: latestMetric?.total_subdomains || 0,
        activeSubdomains: latestMetric?.active_subdomains || 0,
        monthlyTraffic: totalTraffic,
        avgTrafficPerSubdomain: avgTraffic,
        growthRate: latestMetric?.subdomain_growth_rate || 0,
        estimatedAdRevenueLow,
        estimatedAdRevenueMid,
        estimatedAdRevenueHigh
      });
    } catch (error) {
      console.error('Error fetching subdomain metrics:', error);
    }
  };

  const fetchDemographicMetrics = async () => {
    try {
      const { data: ageData } = await supabase.rpc('get_age_distribution');
      const { data: genderData } = await supabase.rpc('get_gender_distribution');
      const { data: locationData } = await supabase.rpc('get_location_distribution', { p_limit: 10 });
      const { data: interestData } = await supabase.rpc('get_top_interests', { p_limit: 20 });
      const { data: relationshipData } = await supabase.rpc('get_relationship_status_distribution');
      const { data: summaryData } = await supabase.rpc('get_comprehensive_demographics');

      const totalUsers = summaryData?.find(m => m.metric_name === 'Total HuBook Users')?.metric_value || '0';
      const avgAge = summaryData?.find(m => m.metric_name === 'Average Age')?.metric_value || '0';

      setDemographicMetrics({
        ageDistribution: ageData?.map(a => ({
          ageGroup: a.age_group,
          count: a.user_count,
          percentage: a.percentage
        })) || [],
        genderDistribution: genderData?.map(g => ({
          gender: g.gender_category,
          count: g.user_count,
          percentage: g.percentage
        })) || [],
        topLocations: locationData?.map(l => ({
          location: l.location_name,
          count: l.user_count,
          percentage: l.percentage
        })) || [],
        topInterests: interestData?.map(i => ({
          interest: i.interest_name,
          count: i.user_count
        })) || [],
        relationshipStatus: relationshipData?.map(r => ({
          status: r.relationship_category,
          count: r.user_count,
          percentage: r.percentage
        })) || [],
        totalUsers: parseInt(totalUsers),
        avgAge: parseFloat(avgAge)
      });
    } catch (error) {
      console.error('Error fetching demographic metrics:', error);
    }
  };

  const fetchTopSubdomains = async () => {
    try {
      const { startDate } = getDateRange();

      const { data: subdomainAnalytics } = await supabase
        .from('subdomain_analytics_daily')
        .select(`
          subdomain_id,
          unique_visitors,
          page_views,
          total_session_duration_seconds,
          bounce_count
        `)
        .gte('date', startDate)
        .is('page_id', null);

      if (!subdomainAnalytics) return;

      const aggregated = subdomainAnalytics.reduce((acc, row) => {
        if (!acc[row.subdomain_id]) {
          acc[row.subdomain_id] = {
            totalVisitors: 0,
            totalPageViews: 0,
            totalSessionSeconds: 0,
            totalBounces: 0
          };
        }
        acc[row.subdomain_id].totalVisitors += row.unique_visitors || 0;
        acc[row.subdomain_id].totalPageViews += row.page_views || 0;
        acc[row.subdomain_id].totalSessionSeconds += row.total_session_duration_seconds || 0;
        acc[row.subdomain_id].totalBounces += row.bounce_count || 0;
        return acc;
      }, {} as Record<string, any>);

      const subdomainIds = Object.keys(aggregated);

      const { data: subdomains } = await supabase
        .from('subdomains')
        .select(`
          id,
          subdomain_name,
          user_profiles!subdomains_owner_id_fkey(email)
        `)
        .in('id', subdomainIds);

      if (!subdomains) return;

      const { data: topPages } = await supabase
        .from('subdomain_analytics_daily')
        .select(`
          subdomain_id,
          page_id,
          page_views,
          subdomain_pages!inner(page_path)
        `)
        .gte('date', startDate)
        .not('page_id', 'is', null)
        .in('subdomain_id', subdomainIds)
        .order('page_views', { ascending: false });

      const topSubdomainsList: TopSubdomain[] = subdomains
        .map(subdomain => {
          const stats = aggregated[subdomain.id];
          const monthlyPageViews = stats.totalPageViews;
          const avgSessionDuration = stats.totalVisitors > 0
            ? stats.totalSessionSeconds / stats.totalVisitors
            : 0;
          const bounceRate = stats.totalPageViews > 0
            ? (stats.totalBounces / stats.totalPageViews) * 100
            : 0;

          const subdomainTopPages = topPages
            ?.filter(p => p.subdomain_id === subdomain.id)
            .slice(0, 3)
            .map(p => ({
              pagePath: (p.subdomain_pages as any)?.page_path || 'Unknown',
              pageViews: p.page_views || 0
            })) || [];

          return {
            subdomainName: subdomain.subdomain_name,
            ownerEmail: (subdomain.user_profiles as any)?.email || 'Unknown',
            monthlyVisitors: stats.totalVisitors,
            monthlyPageViews,
            avgSessionDuration: Math.round(avgSessionDuration),
            bounceRate: Math.round(bounceRate),
            estimatedAdValueLow: (monthlyPageViews / 1000) * 1,
            estimatedAdValueMid: (monthlyPageViews / 1000) * 5,
            estimatedAdValueHigh: (monthlyPageViews / 1000) * 15,
            topPages: subdomainTopPages
          };
        })
        .sort((a, b) => b.monthlyPageViews - a.monthlyPageViews)
        .slice(0, 10);

      setTopSubdomains(topSubdomainsList);
    } catch (error) {
      console.error('Error fetching top subdomains:', error);
    }
  };

  const timeRangeButtons: { label: string; value: TimeRange; icon: typeof Calendar }[] = [
    { label: 'Today', value: 'today', icon: Calendar },
    { label: 'Last 7 Days', value: 'week', icon: Calendar },
    { label: 'Last 30 Days', value: 'month', icon: Calendar },
    { label: 'All Time', value: 'all', icon: Calendar }
  ];

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'today':
        return 'today';
      case 'week':
        return 'in last 7 days';
      case 'month':
        return 'in last 30 days';
      case 'all':
        return 'all time';
      default:
        return 'in last 30 days';
    }
  };

  const getPeriodLabel = () => {
    switch (timeRange) {
      case 'today':
        return 'Today';
      case 'week':
        return 'Last 7 days';
      case 'month':
        return 'Last 30 days';
      case 'all':
        return 'All time';
      default:
        return 'Last 30 days';
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600 mt-2">Comprehensive advertising metrics and audience insights</p>
              </div>
              <div className="flex gap-3">
                <Link
                  to="/admin/hinsta-analytics"
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Camera className="w-5 h-5" />
                  Hinsta Analytics
                </Link>
                <Link
                  to="/admin/hutube-analytics"
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Video className="w-5 h-5" />
                  HuTube Analytics
                </Link>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-8">
            {timeRangeButtons.map(({ label, value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  timeRange === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">User Activity Metrics</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Daily Active Users</span>
                        <InfoTooltip
                          title="Daily Active Users (DAU)"
                          description="Unique users who visit the platform each day. Higher numbers mean more advertising impressions available daily."
                          advertiserValue="More DAU means your ads reach a larger audience every single day. Daily engagement is the gold standard for advertising value."
                        />
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-blue-600 mb-1">
                      {dauMauMetrics.totalDau.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{timeRange === 'today' ? 'Active today' : `Avg active ${getTimeRangeLabel()}`}</div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Monthly Active Users</span>
                        <InfoTooltip
                          title="Monthly Active Users (MAU)"
                          description="Unique users who visit within 30 days. Shows total potential monthly reach for campaigns."
                          advertiserValue="MAU represents your total addressable audience. The larger the MAU, the more flexibility advertisers have in campaign targeting."
                        />
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-green-600 mb-1">
                      {dauMauMetrics.totalMau.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{timeRange === 'today' ? 'Active last 30 days' : `Avg MAU ${getTimeRangeLabel()}`}</div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Stickiness Ratio</span>
                        <InfoTooltip
                          title="DAU/MAU Ratio (Stickiness)"
                          description="Percentage of monthly users who return daily. Higher ratios mean more engaged audiences who see ads repeatedly."
                          advertiserValue="High stickiness means users come back often, seeing your ads multiple times. This increases brand recall and conversion rates significantly."
                        />
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-orange-600 mb-1">
                      {dauMauMetrics.dauMauRatio.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">User retention</div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Platform Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">HuBook</div>
                      <div className="text-2xl font-bold text-blue-600">{dauMauMetrics.hubookDau}</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Heddit</div>
                      <div className="text-2xl font-bold text-green-600">{dauMauMetrics.hedditDau}</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">HuTube</div>
                      <div className="text-2xl font-bold text-yellow-600">{dauMauMetrics.hutubeDau}</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Blog</div>
                      <div className="text-2xl font-bold text-red-600">{dauMauMetrics.blogDau}</div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Switter</div>
                      <div className="text-2xl font-bold text-purple-600">{dauMauMetrics.switterDau}</div>
                    </div>
                    <div className="p-3 bg-pink-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Hinsta</div>
                      <div className="text-2xl font-bold text-pink-600">{dauMauMetrics.hinstaDau}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Search Advertising Inventory</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-600">{timeRange === 'today' ? 'Daily Searches' : 'Avg Daily Searches'}</span>
                      <InfoTooltip
                        title="Daily Search Volume"
                        description="Number of searches performed each day. Each search is a prime advertising opportunity with high user intent."
                        advertiserValue="Search traffic is the most valuable advertising inventory. Users actively searching are ready to take action, making them perfect for conversion-focused campaigns."
                      />
                    </div>
                    <div className="text-4xl font-bold text-blue-600 mb-1">
                      {searchMetrics.dailySearches.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{timeRange === 'today' ? 'Searches today' : `Avg searches/day ${getTimeRangeLabel()}`}</div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-600">Total Searches</span>
                      <InfoTooltip
                        title="Monthly Search Volume"
                        description="Total searches performed per month. Shows massive advertising inventory similar to Google Ads."
                        advertiserValue="High monthly search volume means consistent, scalable advertising opportunities. You can run large campaigns with confidence."
                      />
                    </div>
                    <div className="text-4xl font-bold text-green-600 mb-1">
                      {searchMetrics.monthlySearches.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{getPeriodLabel()}</div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-600">{timeRange === 'today' ? 'Daily Searchers' : 'Avg Daily Searchers'}</span>
                      <InfoTooltip
                        title="Unique Daily Search Users"
                        description="Unique users performing searches each day. Shows breadth of audience actively looking for content."
                        advertiserValue="Unique searchers show how many different people you can reach. More unique searchers means broader demographic targeting options."
                      />
                    </div>
                    <div className="text-4xl font-bold text-orange-600 mb-1">
                      {searchMetrics.uniqueDailySearchers.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{timeRange === 'today' ? 'Unique users today' : `Avg unique searchers/day ${getTimeRangeLabel()}`}</div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-600">Avg Results</span>
                      <InfoTooltip
                        title="Average Results Per Search"
                        description="Shows content quality and ad placement potential. More results mean more ad placement opportunities per search."
                        advertiserValue="Higher results per search create more ad placement slots. Your ads appear alongside quality content, increasing trust and click-through rates."
                      />
                    </div>
                    <div className="text-4xl font-bold text-red-600 mb-1">
                      {searchMetrics.avgResultsPerSearch.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">Results per query</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">Top Search Keywords</h3>
                      <InfoTooltip
                        title="Popular Search Queries"
                        description="Most frequent search queries. Enables keyword-targeted advertising like Google AdWords."
                        advertiserValue="Target ads to specific keywords your audience is actively searching for. Keyword targeting delivers the highest ROI in digital advertising."
                      />
                    </div>
                    {searchMetrics.topSearchQueries.length > 0 ? (
                      <div className="space-y-2">
                        {searchMetrics.topSearchQueries.map((query, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-gray-900 font-medium">{query.query}</span>
                            <span className="text-blue-600 font-semibold">{query.count} searches</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No search data yet</p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-gray-900">Search Insights</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-gray-600">Peak Search Hour</span>
                          <InfoTooltip
                            title="Search Traffic Patterns"
                            description="Times when search volume is highest. Helps advertisers schedule campaigns for maximum visibility."
                            advertiserValue="Run ads during peak hours for maximum exposure, or target off-peak hours for lower costs and less competition."
                          />
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {searchMetrics.peakSearchHour}:00 - {searchMetrics.peakSearchHour + 1}:00
                        </div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Platform Distribution</div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-700">Main Search</span>
                            <span className="font-semibold text-green-600">{searchMetrics.mainSearchCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-700">Heddit Search</span>
                            <span className="font-semibold text-green-600">{searchMetrics.hedditSearchCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Subdomain Advertising Network</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-600">Total Subdomains</span>
                      <InfoTooltip
                        title="Total Subdomain Inventory"
                        description="Number of user-created websites. Each subdomain is potential advertising placement space."
                        advertiserValue="Every subdomain is a mini-website where ads can appear. This creates a massive distributed advertising network across thousands of properties."
                      />
                    </div>
                    <div className="text-4xl font-bold text-blue-600 mb-1">
                      {subdomainMetrics.totalSubdomains.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Digital properties</div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-600">Active Subdomains</span>
                      <InfoTooltip
                        title="Active Advertising Properties"
                        description="Subdomains with recent traffic. Shows currently available advertising real estate."
                        advertiserValue="Active subdomains have engaged audiences visiting regularly. Your ads appear on sites people actively use and trust."
                      />
                    </div>
                    <div className="text-4xl font-bold text-green-600 mb-1">
                      {subdomainMetrics.activeSubdomains.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">With active traffic</div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-600">Total Traffic</span>
                      <InfoTooltip
                        title="Subdomain Network Visitors"
                        description="Total monthly visitors across all user subdomains. Represents extended advertising reach beyond main platforms."
                        advertiserValue="Subdomain traffic extends your reach far beyond the main platform. Tap into niche communities and targeted audiences across the network."
                      />
                    </div>
                    <div className="text-4xl font-bold text-orange-600 mb-1">
                      {subdomainMetrics.monthlyTraffic.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Total visitors {getTimeRangeLabel()}</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg shadow-sm p-6 border border-blue-200">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-900">Estimated Ad Revenue Potential</h3>
                    <InfoTooltip
                      title="Revenue Calculator"
                      description="Estimated monthly ad revenue based on industry-standard CPM rates and current traffic."
                      advertiserValue="These are conservative estimates. With premium targeting and engaged audiences, actual revenue can exceed projections significantly."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                      <div className="text-sm text-gray-600 mb-1">Conservative ($1 CPM)</div>
                      <div className="text-3xl font-bold text-green-600">
                        ${subdomainMetrics.estimatedAdRevenueLow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{getPeriodLabel().toLowerCase()}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                      <div className="text-sm text-gray-600 mb-1">Moderate ($5 CPM)</div>
                      <div className="text-3xl font-bold text-blue-600">
                        ${subdomainMetrics.estimatedAdRevenueMid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{getPeriodLabel().toLowerCase()}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500">
                      <div className="text-sm text-gray-600 mb-1">Premium ($15 CPM)</div>
                      <div className="text-3xl font-bold text-orange-600">
                        ${subdomainMetrics.estimatedAdRevenueHigh.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{getPeriodLabel().toLowerCase()}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Top Performing Subdomains</h2>
                  <InfoTooltip
                    title="Subdomain Performance Rankings"
                    description="Top subdomains ranked by traffic and engagement. Shows your most valuable advertising real estate and top creators."
                    advertiserValue="Target premium ad placements on high-traffic subdomains. These are proven properties with engaged audiences - perfect for high-value campaigns."
                  />
                </div>

                {topSubdomains.length > 0 ? (
                  <div className="space-y-4">
                    {topSubdomains.map((subdomain, idx) => (
                      <div key={idx} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{subdomain.subdomainName}</h3>
                                <p className="text-sm text-gray-600">Owner: {subdomain.ownerEmail}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Estimated Ad Value ({getPeriodLabel()})</div>
                            <div className="text-2xl font-bold text-green-600">
                              ${subdomain.estimatedAdValueMid.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              ${subdomain.estimatedAdValueLow.toFixed(2)} - ${subdomain.estimatedAdValueHigh.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-xs text-gray-600 mb-1">Visitors ({getPeriodLabel()})</div>
                            <div className="text-lg font-bold text-blue-600">
                              {subdomain.monthlyVisitors.toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-xs text-gray-600 mb-1">Page Views ({getPeriodLabel()})</div>
                            <div className="text-lg font-bold text-green-600">
                              {subdomain.monthlyPageViews.toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3">
                            <div className="text-xs text-gray-600 mb-1">Avg Session (sec)</div>
                            <div className="text-lg font-bold text-orange-600">
                              {subdomain.avgSessionDuration}
                            </div>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3">
                            <div className="text-xs text-gray-600 mb-1">Bounce Rate</div>
                            <div className="text-lg font-bold text-red-600">
                              {subdomain.bounceRate}%
                            </div>
                          </div>
                        </div>

                        {subdomain.topPages.length > 0 && (
                          <div>
                            <div className="text-sm font-semibold text-gray-700 mb-2">Top Pages:</div>
                            <div className="flex flex-wrap gap-2">
                              {subdomain.topPages.map((page, pageIdx) => (
                                <div key={pageIdx} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                                  <span className="text-gray-700">{page.pagePath}</span>
                                  <span className="text-gray-500 ml-2">({page.pageViews.toLocaleString()} views)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg shadow-lg p-6 text-white">
                      <h3 className="text-xl font-bold mb-2">Premium Ad Placement Opportunities</h3>
                      <p className="text-green-100 mb-4">
                        These top subdomains represent the highest-value advertising inventory. Target specific creators and audiences for maximum campaign ROI.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                          <div className="text-green-100 text-xs mb-1">Total Top 10 Traffic ({getPeriodLabel()})</div>
                          <div className="text-2xl font-bold">
                            {topSubdomains.reduce((sum, s) => sum + s.monthlyPageViews, 0).toLocaleString()}
                          </div>
                          <div className="text-green-200 text-xs">page views</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                          <div className="text-green-100 text-xs mb-1">Combined Ad Value (Mid CPM)</div>
                          <div className="text-2xl font-bold">
                            ${topSubdomains.reduce((sum, s) => sum + s.estimatedAdValueMid, 0).toFixed(2)}
                          </div>
                          <div className="text-green-200 text-xs">{getPeriodLabel().toLowerCase()}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                          <div className="text-green-100 text-xs mb-1">Avg Session Duration</div>
                          <div className="text-2xl font-bold">
                            {Math.round(topSubdomains.reduce((sum, s) => sum + s.avgSessionDuration, 0) / topSubdomains.length)}s
                          </div>
                          <div className="text-green-200 text-xs">highly engaged</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No subdomain traffic data available yet</p>
                    <p className="text-gray-400 text-sm mt-2">Analytics will appear here once users create subdomains and generate traffic</p>
                  </div>
                )}
              </div>

              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Demographic Insights</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">Age Distribution</h3>
                      <InfoTooltip
                        title="Age Demographics"
                        description="Breakdown of user ages. Helps advertisers target specific age groups for their products."
                        advertiserValue="Target your ads to the exact age groups most likely to buy your product. Age targeting dramatically improves conversion rates and ROI."
                      />
                    </div>
                    {demographicMetrics.ageDistribution.length > 0 ? (
                      <div className="space-y-3">
                        {demographicMetrics.ageDistribution.map((age, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700 font-medium">{age.ageGroup} years</span>
                              <span className="text-gray-600">{age.count} ({age.percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${age.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No age data yet</p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-gray-900">Gender Distribution</h3>
                      <InfoTooltip
                        title="Gender Demographics"
                        description="Percentage breakdown of user genders. Enables gender-targeted advertising campaigns."
                        advertiserValue="Gender targeting helps you reach the right audience with gender-specific products and messaging for better conversion rates."
                      />
                    </div>
                    {demographicMetrics.genderDistribution.length > 0 ? (
                      <div className="space-y-3">
                        {demographicMetrics.genderDistribution.map((gender, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700 font-medium capitalize">{gender.gender}</span>
                              <span className="text-gray-600">{gender.count} ({gender.percentage.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${gender.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No gender data yet</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold text-gray-900">Top Locations</h3>
                      <InfoTooltip
                        title="Geographic Distribution"
                        description="Where your users are located. Valuable for local or region-specific advertising."
                        advertiserValue="Target ads by location for local businesses, regional campaigns, or exclude areas where you don't operate. Geographic precision maximizes ad spend efficiency."
                      />
                    </div>
                    {demographicMetrics.topLocations.length > 0 ? (
                      <div className="space-y-2">
                        {demographicMetrics.topLocations.slice(0, 10).map((location, idx) => (
                          <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                            <span className="text-gray-900">{location.location}</span>
                            <span className="text-orange-600 font-semibold">{location.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No location data yet</p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-red-600" />
                      <h3 className="font-semibold text-gray-900">Top Interests</h3>
                      <InfoTooltip
                        title="User Interest Targeting"
                        description="Most common interests from user profiles. Perfect for interest-based ad targeting and niche marketing."
                        advertiserValue="Interest targeting is one of the most powerful tools in advertising. Reach users who are already passionate about topics related to your product."
                      />
                    </div>
                    {demographicMetrics.topInterests.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {demographicMetrics.topInterests.slice(0, 20).map((interest, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-200"
                          >
                            {interest.interest} ({interest.count})
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No interest data yet</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg shadow-lg p-8 text-white">
                <h2 className="text-3xl font-bold mb-4">Total Advertising Ecosystem Value</h2>
                <p className="text-blue-100 mb-6 text-lg">
                  Combining user activity, search inventory, subdomain network, and demographic targeting creates an unparalleled advertising platform
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                    <div className="text-blue-100 text-sm mb-2">Total Monthly Reach</div>
                    <div className="text-4xl font-bold mb-1">
                      {(dauMauMetrics.totalMau + subdomainMetrics.monthlyTraffic).toLocaleString()}
                    </div>
                    <div className="text-blue-200 text-xs">Unique users across all properties</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                    <div className="text-blue-100 text-sm mb-2">Monthly Ad Opportunities</div>
                    <div className="text-4xl font-bold mb-1">
                      {(searchMetrics.monthlySearches * 3).toLocaleString()}
                    </div>
                    <div className="text-blue-200 text-xs">Search ads + display inventory</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                    <div className="text-blue-100 text-sm mb-2">Network Properties</div>
                    <div className="text-4xl font-bold mb-1">
                      {(subdomainMetrics.totalSubdomains + 6).toLocaleString()}
                    </div>
                    <div className="text-blue-200 text-xs">Platforms + subdomains</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
