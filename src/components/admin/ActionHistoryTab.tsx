import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { History, Filter, Calendar } from 'lucide-react';

interface ActionHistoryItem {
  id: string;
  tag_id: string;
  action_type: string;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
  tag_name?: string;
  admin_email?: string;
}

export default function ActionHistoryTab() {
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ActionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filterType, dateRange, history]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('heddit_tag_actions')
        .select(`
          *,
          heddit_custom_tags(tag_name, display_name),
          user_profiles(email, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => {
        let tag_name = item.heddit_custom_tags?.display_name || item.heddit_custom_tags?.tag_name;
        if (!tag_name && item.metadata) {
          if (item.action_type === 'merge') {
            const src = item.metadata.source_tag;
            const tgt = item.metadata.target_tag;
            tag_name = src && tgt ? `${src} → ${tgt}` : (src || tgt || 'Unknown Tag');
          } else if (item.action_type === 'rename') {
            const old_name = item.metadata.old_display_name || item.metadata.tag_name;
            const new_name = item.metadata.new_display_name;
            tag_name = old_name && new_name ? `${old_name} → ${new_name}` : (old_name || new_name || 'Unknown Tag');
          }
        }
        return {
          id: item.id,
          tag_id: item.tag_id,
          action_type: item.action_type,
          performed_by: item.performed_by,
          notes: item.reason,
          created_at: item.created_at,
          tag_name,
          admin_email: item.user_profiles?.email || item.user_profiles?.full_name
        };
      });

      setHistory(formattedData);
      setFilteredHistory(formattedData);
    } catch (error) {
      console.error('Error loading action history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...history];

    if (filterType !== 'all') {
      filtered = filtered.filter((item) => item.action_type === filterType);
    }

    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();

      switch (dateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(
        (item) => new Date(item.created_at) >= cutoff
      );
    }

    setFilteredHistory(filtered);
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'rename':
        return 'bg-blue-100 text-blue-800';
      case 'merge':
        return 'bg-green-100 text-green-800';
      case 'flag':
        return 'bg-yellow-100 text-yellow-800';
      case 'unflag':
        return 'bg-green-100 text-green-800';
      case 'ban':
      case 'bulk_ban':
        return 'bg-red-100 text-red-800';
      case 'unban':
        return 'bg-orange-100 text-orange-800';
      case 'bulk_flag':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      merge: 'Merged',
      rename: 'Renamed',
      flag: 'Flagged',
      unflag: 'Unflagged',
      ban: 'Banned',
      unban: 'Unbanned',
      bulk_ban: 'Bulk Banned',
      bulk_flag: 'Bulk Flagged',
    };
    return labels[actionType] ?? (actionType.charAt(0).toUpperCase() + actionType.slice(1));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading action history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Action History ({filteredHistory.length})
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="all">All Actions</option>
              <option value="rename">Renamed</option>
              <option value="merge">Merged</option>
              <option value="flag">Flagged</option>
              <option value="unflag">Unflagged</option>
              <option value="ban">Banned</option>
              <option value="unban">Unbanned</option>
              <option value="bulk_ban">Bulk Banned</option>
              <option value="bulk_flag">Bulk Flagged</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No History Found</h3>
          <p className="text-gray-600">
            {filterType !== 'all' || dateRange !== 'all'
              ? 'Try adjusting your filters.'
              : 'No actions have been recorded yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 bg-white rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(
                        item.action_type
                      )}`}
                    >
                      {getActionLabel(item.action_type)}
                    </span>
                    <span className="font-medium text-gray-900">
                      #{item.tag_name || 'Unknown Tag'}
                    </span>
                  </div>

                  {item.notes && (
                    <div className="text-sm text-gray-600 mb-2">{item.notes}</div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {new Date(item.created_at).toLocaleDateString()} at{' '}
                      {new Date(item.created_at).toLocaleTimeString()}
                    </span>
                    {item.admin_email && (
                      <span>by {item.admin_email}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredHistory.length > 0 && (
        <div className="text-center text-sm text-gray-500 pt-4">
          Showing {filteredHistory.length} of {history.length} total actions
        </div>
      )}
    </div>
  );
}
