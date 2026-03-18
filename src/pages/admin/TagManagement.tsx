import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Tags,
  AlertTriangle,
  Ban,
  TrendingUp,
  Search,
  Flag,
  History,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AllTagsTab from '../../components/admin/AllTagsTab';
import FlaggedQueueTab from '../../components/admin/FlaggedQueueTab';
import BannedListTab from '../../components/admin/BannedListTab';
import ActionHistoryTab from '../../components/admin/ActionHistoryTab';
import AnalyticsTab from '../../components/admin/AnalyticsTab';

interface TagStats {
  totalTags: number;
  activeTags: number;
  bannedTags: number;
  flaggedTags: number;
  emergingTags: number;
}

export default function TagManagement() {
  const [stats, setStats] = useState<TagStats>({
    totalTags: 0,
    activeTags: 0,
    bannedTags: 0,
    flaggedTags: 0,
    emergingTags: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'all' | 'flagged' | 'banned' | 'history' | 'analytics'>('overview');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [total, banned, flagged] = await Promise.all([
        supabase.from('heddit_custom_tags').select('id', { count: 'exact', head: true }),
        supabase.from('heddit_custom_tags').select('id', { count: 'exact', head: true }).eq('is_banned', true),
        supabase.from('heddit_custom_tags').select('id', { count: 'exact', head: true }).eq('is_flagged', true)
      ]);

      const activeTags = (total.count || 0) - (banned.count || 0);

      setStats({
        totalTags: total.count || 0,
        activeTags,
        bannedTags: banned.count || 0,
        flaggedTags: flagged.count || 0,
        emergingTags: 0
      });
    } catch (error) {
      console.error('Error loading tag stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading tag management...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tag Management</h1>
          <p className="text-gray-600">Manage tags across Heddit communities</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Tags className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalTags}</div>
                <div className="text-sm text-gray-600">Total Tags</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Tags className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.activeTags}</div>
                <div className="text-sm text-gray-600">Active Tags</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Flag className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.flaggedTags}</div>
                <div className="text-sm text-gray-600">Flagged Tags</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Ban className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.bannedTags}</div>
                <div className="text-sm text-gray-600">Banned Tags</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Tags
              </button>
              <button
                onClick={() => setActiveTab('flagged')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'flagged'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Flagged Queue
                {stats.flaggedTags > 0 && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {stats.flaggedTags}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('banned')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'banned'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Banned List
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Action History
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'analytics'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Analytics
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'all' && <AllTagsTab />}
            {activeTab === 'flagged' && <FlaggedQueueTab />}
            {activeTab === 'banned' && <BannedListTab />}
            {activeTab === 'history' && <ActionHistoryTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="#"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-orange-600" />
              <div>
                <div className="font-medium text-gray-900">Find Similar Tags</div>
                <div className="text-sm text-gray-600">Detect duplicate tags</div>
              </div>
            </div>
          </Link>

          <Link
            to="#"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="font-medium text-gray-900">Review Flagged</div>
                <div className="text-sm text-gray-600">Process flag queue</div>
              </div>
            </div>
          </Link>

          <Link
            to="#"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">View Trending</div>
                <div className="text-sm text-gray-600">See emerging tags</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">About Tag Management</h3>
        <ul className="space-y-2 text-gray-700 text-sm">
          <li className="flex items-start gap-2">
            <Tags className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>Merge duplicate or similar tags to maintain consistency</span>
          </li>
          <li className="flex items-start gap-2">
            <Ban className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>Ban inappropriate tags completely hiding them from all users</span>
          </li>
          <li className="flex items-start gap-2">
            <Flag className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>Flag tags for review to track potential issues</span>
          </li>
          <li className="flex items-start gap-2">
            <History className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>All actions are logged for accountability and audit trails</span>
          </li>
          <li className="flex items-start gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span>Track tag growth to identify emerging trends and conversations</span>
          </li>
        </ul>
      </div>
    </div>
  );
}


