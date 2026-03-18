import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderHeart, Plus, Lock, Globe, BookOpen, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function Collections() {
  return (
    <PlatformGuard platform="blog">
      <CollectionsContent />
    </PlatformGuard>
  );
}

interface Collection {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  created_at: string;
  post_count: number;
}

function CollectionsContent() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionPublic, setNewCollectionPublic] = useState(false);

  useEffect(() => {
    if (user) {
      loadCollections();
    }
  }, [user]);

  const loadCollections = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('blog_collections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        const collectionsWithCounts = await Promise.all(
          data.map(async (collection) => {
            const { count } = await supabase
              .from('blog_collection_items')
              .select('*', { count: 'exact', head: true })
              .eq('collection_id', collection.id);

            return {
              ...collection,
              post_count: count || 0,
            };
          })
        );

        setCollections(collectionsWithCounts);
      }
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async () => {
    if (!user || !newCollectionTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('blog_collections')
        .insert({
          user_id: user.id,
          name: newCollectionTitle.trim(),
          description: newCollectionDescription.trim(),
          is_public: newCollectionPublic,
        });

      if (!error) {
        setShowCreateModal(false);
        setNewCollectionTitle('');
        setNewCollectionDescription('');
        setNewCollectionPublic(false);
        loadCollections();
      }
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  };

  const deleteCollection = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      await supabase.from('blog_collections').delete().eq('id', collectionId);
      loadCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
  };

  return (
    <BlogLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link
            to="/blog/feed"
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Feed</span>
          </Link>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FolderHeart className="w-8 h-8 text-emerald-400" />
              <h1 className="text-3xl font-bold text-white">My Collections</h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md"
            >
              <Plus className="w-5 h-5" />
              New Collection
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : collections.length === 0 ? (
            <div className="bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-lg p-12 text-center">
              <FolderHeart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No collections yet</h3>
              <p className="text-gray-300 mb-6">
                Create collections to organize your favorite stories and share them with others!
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Your First Collection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all hover:border-emerald-400 relative group"
                >
                  <button
                    onClick={() => deleteCollection(collection.id)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2 mb-3">
                    {collection.is_public ? (
                      <Globe className="w-5 h-5 text-green-500" />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-300">
                      {collection.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                    {collection.name}
                  </h3>
                  {collection.description && (
                    <p className="text-gray-300 text-sm mb-4 line-clamp-2">{collection.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-600/50">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <BookOpen className="w-4 h-4" />
                      <span>{collection.post_count} stories</span>
                    </div>
                    <Link
                      to={`/blog/collection/${collection.id}`}
                      className="text-sm text-emerald-400 font-medium hover:text-emerald-300"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/95 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-2xl max-w-lg w-full p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Collection</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Collection Title
                </label>
                <input
                  type="text"
                  value={newCollectionTitle}
                  onChange={(e) => setNewCollectionTitle(e.target.value)}
                  placeholder="e.g., Favorite Sci-Fi Stories"
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-500 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  placeholder="Describe your collection..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-500 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="public-collection"
                  checked={newCollectionPublic}
                  onChange={(e) => setNewCollectionPublic(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="public-collection" className="text-sm text-gray-300">
                  Make this collection public
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 text-gray-300 rounded-lg font-semibold hover:bg-slate-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={createCollection}
                disabled={!newCollectionTitle.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </BlogLayout>
  );
}
