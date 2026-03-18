import { X, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmDialog from '../shared/ConfirmDialog';

interface ReviewTag {
  id: string;
  tag_name: string;
  review_count?: number;
}

interface TagManagementModalProps {
  selectedReviews: string[];
  allTags: ReviewTag[];
  onClose: () => void;
}

export default function TagManagementModal({ selectedReviews, allTags, onClose }: TagManagementModalProps) {
  const { userProfile } = useAuth();
  const [newTagName, setNewTagName] = useState('');
  const [existingTagId, setExistingTagId] = useState('');
  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'create' | 'existing' | 'manage'>('create');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<ReviewTag | null>(null);

  useEffect(() => {
    fetchTagsWithCounts();
  }, []);

  const fetchTagsWithCounts = async () => {
    try {
      const { data: tagsData } = await supabase
        .from('review_custom_tags')
        .select('*')
        .order('tag_name');

      if (!tagsData) return;

      // Get counts for each tag
      const tagsWithCounts = await Promise.all(
        tagsData.map(async (tag) => {
          const { count } = await supabase
            .from('review_tag_associations')
            .select('*', { count: 'exact', head: true })
            .eq('tag_id', tag.id);

          return {
            ...tag,
            review_count: count || 0
          };
        })
      );

      setTags(tagsWithCounts);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleCreateAndApply = async () => {
    if (!newTagName.trim() || !userProfile) return;

    setLoading(true);
    try {
      // Check if tag already exists
      const { data: existingTag } = await supabase
        .from('review_custom_tags')
        .select('id')
        .eq('tag_name', newTagName.trim())
        .maybeSingle();

      let tagId: string;

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        // Create new tag
        const { data: newTag, error: createError } = await supabase
          .from('review_custom_tags')
          .insert({
            tag_name: newTagName.trim(),
            created_by: userProfile.id
          })
          .select()
          .single();

        if (createError) throw createError;
        tagId = newTag.id;
      }

      // Apply to selected reviews
      if (selectedReviews.length > 0) {
        const associations = selectedReviews.map(reviewId => ({
          review_id: reviewId,
          tag_id: tagId,
          added_by: userProfile.id
        }));

        await supabase
          .from('review_tag_associations')
          .upsert(associations, { onConflict: 'review_id,tag_id' });
      }

      setNewTagName('');
      fetchTagsWithCounts();
      if (selectedReviews.length > 0) {
        setTimeout(onClose, 500);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyExisting = async () => {
    if (!existingTagId || selectedReviews.length === 0 || !userProfile) return;

    setLoading(true);
    try {
      const associations = selectedReviews.map(reviewId => ({
        review_id: reviewId,
        tag_id: existingTagId,
        added_by: userProfile.id
      }));

      await supabase
        .from('review_tag_associations')
        .upsert(associations, { onConflict: 'review_id,tag_id' });

      setExistingTagId('');
      setTimeout(onClose, 500);
    } catch (error) {
      console.error('Error applying tag:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!tagToDelete) return;

    try {
      // Associations will be deleted automatically due to CASCADE
      await supabase
        .from('review_custom_tags')
        .delete()
        .eq('id', tagToDelete.id);

      fetchTagsWithCounts();
      setShowDeleteConfirm(false);
      setTagToDelete(null);
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Tag Management</h2>
            <p className="text-purple-100">
              {selectedReviews.length > 0
                ? `Apply tags to ${selectedReviews.length} selected review${selectedReviews.length !== 1 ? 's' : ''}`
                : 'Manage custom tags'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {selectedReviews.length > 0 && (
            <>
              {/* Mode Selector */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setMode('create')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    mode === 'create'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Create New Tag
                </button>
                <button
                  onClick={() => setMode('existing')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    mode === 'existing'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Use Existing Tag
                </button>
                <button
                  onClick={() => setMode('manage')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                    mode === 'manage'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Manage All Tags
                </button>
              </div>

              {/* Create New Tag */}
              {mode === 'create' && (
                <div className="bg-purple-50 rounded-lg p-4 mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    New Tag Name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateAndApply();
                      }}
                      placeholder="e.g., AI Generated, Misinformation, Spam..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleCreateAndApply}
                      disabled={!newTagName.trim() || loading}
                      className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Create & Apply
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    If tag already exists, it will be applied to selected reviews
                  </p>
                </div>
              )}

              {/* Apply Existing Tag */}
              {mode === 'existing' && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Existing Tag
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={existingTagId}
                      onChange={(e) => setExistingTagId(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Choose a tag...</option>
                      {tags.map(tag => (
                        <option key={tag.id} value={tag.id}>
                          {tag.tag_name} ({tag.review_count} reviews)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleApplyExisting}
                      disabled={!existingTagId || loading}
                      className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <TagIcon className="w-5 h-5" />
                      Apply to Selected
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Manage All Tags */}
          {(mode === 'manage' || selectedReviews.length === 0) && (
            <div>
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TagIcon className="w-5 h-5" />
                All Tags ({tags.length})
              </h3>

              {/* Create tag without selection */}
              {selectedReviews.length === 0 && (
                <div className="bg-purple-50 rounded-lg p-4 mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Create New Tag
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateAndApply();
                      }}
                      placeholder="Enter tag name..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleCreateAndApply}
                      disabled={!newTagName.trim() || loading}
                      className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Create
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tags.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No tags created yet
                  </div>
                ) : (
                  tags.map(tag => (
                    <div
                      key={tag.id}
                      className="bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                          {tag.tag_name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {tag.review_count} review{tag.review_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setTagToDelete(tag);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setTagToDelete(null);
        }}
        onConfirm={handleDeleteTag}
        title="Delete Tag"
        message={tagToDelete ? `Delete the tag "${tagToDelete.tag_name}"?\n\nThis will remove it from ${tagToDelete.review_count} review${tagToDelete.review_count !== 1 ? 's' : ''}.` : ''}
        confirmText="Delete Tag"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
