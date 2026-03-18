import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, Activity, Tag, Calendar } from 'lucide-react';

interface TagAnalytics {
  totalTags: number;
  activeTags: number;
  bannedTags: number;
  flaggedTags: number;
  tagsCreatedToday: number;
  tagsCreatedThisWeek: number;
  tagsCreatedThisMonth: number;
}

interface TrendingTag {
  id: string;
  tag_name: string;
  use_count: number;
  created_at: string;
  growth_rate?: number;
}

interface RecentTag {
  id: string;
  tag_name: string;
  use_count: number;
  created_at: string;
}

export default function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<TagAnalytics>({
    totalTags: 0,
    activeTags: 0,
    bannedTags: 0,
    flaggedTags: 0,
    tagsCreatedToday: 0,
    tagsCreatedThisWeek: 0,
    tagsCreatedThisMonth: 0
  });
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [emergingTags, setEmergingTags] = useState<RecentTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        total,
        banned,
        flagged,
        createdToday,
        createdThisWeek,
        createdThisMonth,
        topTags,
        recentTags
      ] = await Promise.all([
        supabase.from('heddit_custom_tags').select('id', { count: 'exact', head: true }),
        supabase.from('heddit_custom_tags').select('id', { count: 'exact', head: true }).eq('is_banned', true),
        supabase.from('heddit_custom_tags').select('id', { count: 'exact', head: true }).eq('is_flagged', true),
        supabase
          .from('heddit_custom_tags')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase
          .from('heddit_custom_tags')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString()),
        supabase
          .from('heddit_custom_tags')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', monthAgo.toISOString()),
        supabase
          .from('heddit_custom_tags')
          .select('*')
          .eq('is_banned', false)
          .order('use_count', { ascending: false })
          .limit(10),
        supabase
          .from('heddit_custom_tags')
          .select('*')
          .eq('is_banned', false)
          .gte('created_at', weekAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const activeTags = (total.count || 0) - (banned.count || 0);

      setAnalytics({
        totalTags: total.count || 0,
        activeTags,
        bannedTags: banned.count || 0,
        flaggedTags: flagged.count || 0,
        tagsCreatedToday: createdToday.count || 0,
        tagsCreatedThisWeek: createdThisWeek.count || 0,
        tagsCreatedThisMonth: createdThisMonth.count || 0
      });

      setTrendingTags(topTags.data || []);
      setEmergingTags(recentTags.data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tag Growth</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Today</span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {analytics.tagsCreatedToday}
            </div>
            <div className="text-xs text-blue-700 mt-1">New tags created</div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-900">This Week</span>
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900">
              {analytics.tagsCreatedThisWeek}
            </div>
            <div className="text-xs text-green-700 mt-1">New tags created</div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-900">This Month</span>
              <Calendar className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {analytics.tagsCreatedThisMonth}
            </div>
            <div className="text-xs text-purple-700 mt-1">New tags created</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            Top Tags by Usage
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {trendingTags.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No trending tags yet
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {trendingTags.map((tag, index) => (
                  <div key={tag.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-400 w-6">
                          #{index + 1}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            #{tag.tag_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Created {new Date(tag.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {tag.use_count}
                        </div>
                        <div className="text-xs text-gray-500">uses</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Emerging Tags (Last 7 Days)
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {emergingTags.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No new tags this week
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {emergingTags.map((tag) => (
                  <div key={tag.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          #{tag.tag_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created {new Date(tag.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {tag.use_count}
                        </div>
                        <div className="text-xs text-gray-500">uses</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tag Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Active Tags</span>
              <Tag className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {analytics.activeTags}
            </div>
            <div className="text-sm text-gray-600">
              {((analytics.activeTags / analytics.totalTags) * 100).toFixed(1)}% of total
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Moderation Rate</span>
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {analytics.bannedTags + analytics.flaggedTags}
            </div>
            <div className="text-sm text-gray-600">
              {(
                ((analytics.bannedTags + analytics.flaggedTags) / analytics.totalTags) *
                100
              ).toFixed(1)}
              % flagged or banned
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Insights</h3>
        <ul className="space-y-2 text-gray-700 text-sm">
          <li className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>
              Monitor emerging tags to identify growing trends and community interests
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>
              Track tag creation rates to understand platform growth patterns
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Tag className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>
              High use count tags represent established topics and discussions
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
