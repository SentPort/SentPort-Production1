import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FolderPlus, Check, Plus } from 'lucide-react';

interface Collection {
  id: string;
  name: string;
  is_public: boolean;
}

interface AddToCollectionButtonProps {
  postId: string;
  variant?: 'icon' | 'button';
  onSuccess?: () => void;
}

export default function AddToCollectionButton({ postId, variant = 'icon', onSuccess }: AddToCollectionButtonProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (showModal && user?.id) {
      fetchCollections();
    }
  }, [showModal, user?.id]);

  async function fetchCollections() {
    try {
      setLoading(true);

      const { data: collectionsData, error: collectionsError } = await supabase
        .from('blog_collections')
        .select('id, name, is_public')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (collectionsError) throw collectionsError;

      setCollections(collectionsData || []);

      const { data: itemsData, error: itemsError } = await supabase
        .from('blog_collection_items')
        .select('collection_id')
        .eq('post_id', postId)
        .in('collection_id', (collectionsData || []).map(c => c.id));

      if (itemsError) throw itemsError;

      const existingCollections = new Set(itemsData?.map(item => item.collection_id) || []);
      setSelectedCollections(existingCollections);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleCollection(collectionId: string) {
    const newSelected = new Set(selectedCollections);

    if (newSelected.has(collectionId)) {
      newSelected.delete(collectionId);
    } else {
      newSelected.add(collectionId);
    }

    setSelectedCollections(newSelected);
  }

  async function handleSave() {
    try {
      setSaving(true);

      const currentIds = Array.from(selectedCollections);

      const { data: existingItems, error: fetchError } = await supabase
        .from('blog_collection_items')
        .select('collection_id')
        .eq('post_id', postId)
        .in('collection_id', collections.map(c => c.id));

      if (fetchError) throw fetchError;

      const existingIds = new Set(existingItems?.map(item => item.collection_id) || []);

      const toAdd = currentIds.filter(id => !existingIds.has(id));
      const toRemove = Array.from(existingIds).filter(id => !currentIds.includes(id));

      if (toAdd.length > 0) {
        const itemsToInsert = toAdd.map(collectionId => ({
          collection_id: collectionId,
          post_id: postId
        }));

        const { error: insertError } = await supabase
          .from('blog_collection_items')
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('blog_collection_items')
          .delete()
          .eq('post_id', postId)
          .in('collection_id', toRemove);

        if (deleteError) throw deleteError;
      }

      setShowModal(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving to collections:', error);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={() => setShowModal(true)}
          className="p-2 text-gray-400 hover:text-pink-600 hover:bg-slate-700/50 rounded-lg transition-all"
          title="Add to collection"
        >
          <FolderPlus className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg transition-all flex items-center gap-2"
        >
          <FolderPlus className="w-4 h-4" />
          Add to Collection
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-600/50">
              <h2 className="text-2xl font-bold text-white">Add to Collection</h2>
              <p className="text-gray-300 text-sm mt-1">
                Select collections to save this story
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="text-center text-gray-300 py-8">Loading collections...</div>
              ) : collections.length === 0 ? (
                <div className="text-center py-8">
                  <FolderPlus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-gray-300 mb-4">You don't have any collections yet</p>
                  <a
                    href="/blog/collections"
                    className="inline-block px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium rounded-lg hover:from-pink-700 hover:to-rose-700 transition-all"
                  >
                    Create Collection
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  {collections.map(collection => {
                    const isSelected = selectedCollections.has(collection.id);
                    return (
                      <button
                        key={collection.id}
                        onClick={() => handleToggleCollection(collection.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                          isSelected
                            ? 'border-pink-600 bg-pink-600/10'
                            : 'border-slate-600/50 bg-slate-700/30 hover:bg-slate-700/50'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'border-pink-600 bg-pink-600'
                              : 'border-slate-500'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">{collection.name}</div>
                          <div className="text-xs text-gray-400">
                            {collection.is_public ? 'Public' : 'Private'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-600/50 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-xl transition-all font-medium"
                disabled={saving}
              >
                Cancel
              </button>
              {collections.length > 0 && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium rounded-xl hover:from-pink-700 hover:to-rose-700 transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
