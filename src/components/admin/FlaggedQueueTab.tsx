import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Flag, CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import TagUnbanModal from './TagUnbanModal';
import BanTagFromQueueModal from './BanTagFromQueueModal';

interface FlaggedTag {
  id: string;
  tag_name: string;
  usage_count: number;
  is_flagged: boolean;
  flag_reason: string | null;
  flag_notes: string | null;
  flagged_at: string | null;
  flagged_by: string | null;
  created_at: string;
}

interface FlaggedQueueTabProps {
  onStatsUpdate?: () => void;
}

export default function FlaggedQueueTab({ onStatsUpdate }: FlaggedQueueTabProps) {
  const [flaggedTags, setFlaggedTags] = useState<FlaggedTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<FlaggedTag | null>(null);
  const [showUnflagModal, setShowUnflagModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadFlaggedTags();
  }, []);

  const loadFlaggedTags = async () => {
    try {
      const { data, error } = await supabase
        .from('heddit_custom_tags')
        .select('*')
        .eq('is_flagged', true)
        .order('flagged_at', { ascending: false });

      if (error) throw error;
      setFlaggedTags(data || []);
    } catch (error) {
      console.error('Error loading flagged tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnflag = async (tag: FlaggedTag) => {
    setSelectedTag(tag);
    setShowUnflagModal(true);
  };

  const confirmUnflag = async () => {
    if (!selectedTag) return;

    setProcessingId(selectedTag.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from('heddit_custom_tags')
        .update({
          is_flagged: false,
          flag_reason: null,
          flag_notes: null,
          flagged_at: null,
          flagged_by: null
        })
        .eq('id', selectedTag.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('heddit_tag_actions')
        .insert({
          tag_id: selectedTag.id,
          action_type: 'unflagged',
          performed_by: user?.id,
          reason: actionNotes || 'Reviewed and cleared flag'
        });

      if (logError) throw logError;

      await loadFlaggedTags();
      if (onStatsUpdate) onStatsUpdate();
      setShowUnflagModal(false);
      setSelectedTag(null);
      setActionNotes('');
    } catch (error) {
      console.error('Error unflagging tag:', error);
      alert('Failed to unflag tag. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBan = (tag: FlaggedTag) => {
    setSelectedTag(tag);
    setShowBanModal(true);
  };

  const confirmBan = async (banReason: string) => {
    if (!selectedTag) return;

    setProcessingId(selectedTag.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from('heddit_custom_tags')
        .update({
          is_banned: true,
          ban_reason: banReason,
          banned_at: new Date().toISOString(),
          banned_by: user?.id,
          is_flagged: false,
          flag_reason: null,
          flag_notes: null,
          flagged_at: null,
          flagged_by: null
        })
        .eq('id', selectedTag.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('heddit_tag_actions')
        .insert({
          tag_id: selectedTag.id,
          action_type: 'banned',
          performed_by: user?.id,
          reason: `Banned from flagged queue. Reason: ${banReason}`
        });

      if (logError) throw logError;

      await loadFlaggedTags();
      if (onStatsUpdate) onStatsUpdate();
      setShowBanModal(false);
      setSelectedTag(null);
    } catch (error) {
      console.error('Error banning tag:', error);
      alert('Failed to ban tag. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading flagged tags...</div>
      </div>
    );
  }

  if (flaggedTags.length === 0) {
    return (
      <div className="text-center py-12">
        <Flag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Flagged Tags</h3>
        <p className="text-gray-600">All tags have been reviewed and cleared.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(flaggedTags.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTags = flaggedTags.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Flagged Queue ({flaggedTags.length})
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {paginatedTags.map((tag) => (
          <div
            key={tag.id}
            className="border border-yellow-200 bg-yellow-50 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-gray-900">#{tag.tag_name}</h4>
                  <span className="text-sm text-gray-600">
                    Used {tag.usage_count} {tag.usage_count === 1 ? 'time' : 'times'}
                  </span>
                </div>

                <div className="space-y-2">
                  {tag.flag_reason && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Reason: </span>
                      <span className="text-sm text-gray-600">{tag.flag_reason}</span>
                    </div>
                  )}
                  {tag.flag_notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Notes: </span>
                      <span className="text-sm text-gray-600">{tag.flag_notes}</span>
                    </div>
                  )}
                  {tag.flagged_at ? (
                    <div className="text-xs text-gray-500">
                      Flagged {new Date(tag.flagged_at).toLocaleDateString()} at{' '}
                      {new Date(tag.flagged_at).toLocaleTimeString()}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      Flagged (date not recorded)
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleUnflag(tag)}
                  disabled={processingId === tag.id}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Clear Flag
                </button>
                <button
                  onClick={() => handleBan(tag)}
                  disabled={processingId === tag.id}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  <X className="w-4 h-4" />
                  Ban Tag
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, flaggedTags.length)} of {flaggedTags.length} tags
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg ${
                    currentPage === page
                      ? 'bg-orange-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showUnflagModal && selectedTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Clear Flag for "#{selectedTag.tag_name}"
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes (Optional)
              </label>
              <textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={3}
                placeholder="Add notes about why this flag was cleared..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowUnflagModal(false);
                  setSelectedTag(null);
                  setActionNotes('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnflag}
                disabled={processingId === selectedTag.id}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === selectedTag.id ? 'Clearing...' : 'Clear Flag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTag && (
        <BanTagFromQueueModal
          isOpen={showBanModal}
          tagName={selectedTag.tag_name}
          onClose={() => {
            setShowBanModal(false);
            setSelectedTag(null);
          }}
          onConfirm={confirmBan}
          isLoading={processingId === selectedTag.id}
        />
      )}
    </div>
  );
}
