import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Ban, Flag, CreditCard as Edit3, Merge, ChevronUp, ChevronDown, Check } from 'lucide-react';
import TagMergeModal from './TagMergeModal';
import TagBanModal from './TagBanModal';
import TagFlagModal from './TagFlagModal';
import TagRenameModal from './TagRenameModal';
import ConfirmDialog from '../shared/ConfirmDialog';

interface Tag {
  id: string;
  tag_name: string;
  display_name: string;
  usage_count: number;
  post_usage_count: number;
  subreddit_usage_count: number;
  is_banned: boolean;
  is_flagged: boolean;
  created_at: string;
  last_used_at: string | null;
}

type SortField = 'display_name' | 'usage_count' | 'created_at' | 'last_used_at';
type SortDirection = 'asc' | 'desc';

export default function AllTagsTab() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('usage_count');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [actionTag, setActionTag] = useState<Tag | null>(null);
  const [showBulkBanConfirm, setShowBulkBanConfirm] = useState(false);
  const [showBulkFlagConfirm, setShowBulkFlagConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    filterAndSortTags();
  }, [tags, searchTerm, sortField, sortDirection]);

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from('heddit_custom_tags')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTags = () => {
    let filtered = [...tags];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tag =>
        tag.display_name.toLowerCase().includes(term) ||
        tag.tag_name.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'display_name':
          aVal = a.display_name.toLowerCase();
          bVal = b.display_name.toLowerCase();
          break;
        case 'usage_count':
          aVal = a.usage_count;
          bVal = b.usage_count;
          break;
        case 'created_at':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case 'last_used_at':
          aVal = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
          bVal = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
          break;
        default:
          aVal = a.usage_count;
          bVal = b.usage_count;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredTags(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleTagSelection = (tagId: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTags(newSelected);
  };

  const handleBulkMerge = () => {
    const selected = tags.filter(t => selectedTags.has(t.id));
    if (selected.length < 2) {
      alert('Please select at least 2 tags to merge');
      return;
    }
    setShowMergeModal(true);
  };

  const handleBulkBan = async () => {
    if (selectedTags.size === 0) return;
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const tagId of selectedTags) {
        await supabase.rpc('ban_heddit_tag', {
          p_tag_id: tagId,
          p_banned_by: user.id,
          p_reason: 'Bulk ban operation'
        });
      }

      setSelectedTags(new Set());
      setShowBulkBanConfirm(false);
      loadTags();
    } catch (error) {
      console.error('Error bulk banning tags:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkFlag = async () => {
    if (selectedTags.size === 0) return;
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      for (const tagId of selectedTags) {
        await supabase.rpc('flag_heddit_tag', {
          p_tag_id: tagId,
          p_flagged_by: user.id,
          p_flag_reason: 'manual_review',
          p_flag_notes: 'Bulk flag operation'
        });
      }

      setSelectedTags(new Set());
      setShowBulkFlagConfirm(false);
      loadTags();
    } catch (error) {
      console.error('Error bulk flagging tags:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (loading) {
    return <div className="text-center text-gray-600">Loading tags...</div>;
  }

  const selectedTagsList = tags.filter(t => selectedTags.has(t.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tags by name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <div className="text-sm text-gray-600">
          Showing {filteredTags.length} of {tags.length} tags
        </div>
      </div>

      {selectedTags.size > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-orange-900">
              {selectedTags.size} tag{selectedTags.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkMerge}
                disabled={selectedTags.size < 2}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg font-medium flex items-center gap-2"
              >
                <Merge className="w-4 h-4" />
                Merge
              </button>
              <button
                onClick={() => setShowBulkFlagConfirm(true)}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg font-medium flex items-center gap-2"
              >
                <Flag className="w-4 h-4" />
                Flag
              </button>
              <button
                onClick={() => setShowBulkBanConfirm(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Ban
              </button>
              <button
                onClick={() => setSelectedTags(new Set())}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedTags.size === tags.length && tags.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTags(new Set(tags.map(t => t.id)));
                    } else {
                      setSelectedTags(new Set());
                    }
                  }}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
              </th>
              <th
                onClick={() => handleSort('display_name')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  Tag Name
                  <SortIcon field="display_name" />
                </div>
              </th>
              <th
                onClick={() => handleSort('usage_count')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  Usage
                  <SortIcon field="usage_count" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th
                onClick={() => handleSort('created_at')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  Created
                  <SortIcon field="created_at" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTags.map((tag) => (
              <tr key={tag.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedTags.has(tag.id)}
                    onChange={() => toggleTagSelection(tag.id)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{tag.display_name}</div>
                  <div className="text-sm text-gray-500">{tag.tag_name}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900">{tag.usage_count} total</div>
                  <div className="text-xs text-gray-500">
                    {tag.post_usage_count} posts, {tag.subreddit_usage_count} subreddits
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {tag.is_banned && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                        Banned
                      </span>
                    )}
                    {tag.is_flagged && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                        Flagged
                      </span>
                    )}
                    {!tag.is_banned && !tag.is_flagged && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        Active
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(tag.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => {
                        setActionTag(tag);
                        setShowRenameModal(true);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="Rename"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActionTag(tag);
                        setShowFlagModal(true);
                      }}
                      disabled={tag.is_flagged || tag.is_banned}
                      className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Flag"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActionTag(tag);
                        setShowBanModal(true);
                      }}
                      disabled={tag.is_banned}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Ban"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTags.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? 'No tags match your search' : 'No tags found'}
        </div>
      )}

      {showMergeModal && (
        <TagMergeModal
          sourceTags={selectedTagsList}
          onClose={() => setShowMergeModal(false)}
          onSuccess={() => {
            setSelectedTags(new Set());
            loadTags();
          }}
        />
      )}

      {showBanModal && actionTag && (
        <TagBanModal
          tag={actionTag}
          onClose={() => {
            setShowBanModal(false);
            setActionTag(null);
          }}
          onSuccess={() => {
            setActionTag(null);
            loadTags();
          }}
        />
      )}

      {showFlagModal && actionTag && (
        <TagFlagModal
          tag={actionTag}
          onClose={() => {
            setShowFlagModal(false);
            setActionTag(null);
          }}
          onSuccess={() => {
            setActionTag(null);
            loadTags();
          }}
        />
      )}

      {showRenameModal && actionTag && (
        <TagRenameModal
          tag={actionTag}
          onClose={() => {
            setShowRenameModal(false);
            setActionTag(null);
          }}
          onSuccess={() => {
            setActionTag(null);
            loadTags();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={showBulkBanConfirm}
        onClose={() => setShowBulkBanConfirm(false)}
        onConfirm={handleBulkBan}
        title="Ban Selected Tags"
        message={`Are you sure you want to ban ${selectedTags.size} selected tag${selectedTags.size !== 1 ? 's' : ''}?\n\nThis will hide ${selectedTags.size !== 1 ? 'them' : 'it'} from all users and prevent ${selectedTags.size !== 1 ? 'them' : 'it'} from being used in new content.`}
        confirmText="Ban Tags"
        cancelText="Cancel"
        type="danger"
        isLoading={isProcessing}
      />

      <ConfirmDialog
        isOpen={showBulkFlagConfirm}
        onClose={() => setShowBulkFlagConfirm(false)}
        onConfirm={handleBulkFlag}
        title="Flag Selected Tags"
        message={`Flag ${selectedTags.size} selected tag${selectedTags.size !== 1 ? 's' : ''} for manual review?\n\nFlagged tags will be added to the review queue for admin attention.`}
        confirmText="Flag for Review"
        cancelText="Cancel"
        type="warning"
        isLoading={isProcessing}
      />
    </div>
  );
}
