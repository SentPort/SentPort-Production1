import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Plus, Grid2x2 as Grid, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHinstaNotification } from '../../contexts/HinstaNotificationContext';
import HinstaLayout from '../../components/shared/HinstaLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

interface Collection {
  id: string;
  account_id: string;
  name: string;
  created_at: string;
  post_count: number;
  cover_image: string | null;
}

interface SavedPost {
  id: string;
  post_id: string;
  post: {
    id: string;
    media_urls: string[];
    media_url: string;
    caption: string;
    like_count: number;
    comment_count: number;
  };
}

export default function Saved() {
  const { user } = useAuth();
  const { showSuccess, showError } = useHinstaNotification();
  const [myAccount, setMyAccount] = useState<any>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'all' | string>('all');
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    if (user) {
      loadMyAccount();
    }
  }, [user]);

  useEffect(() => {
    if (myAccount) {
      loadCollections();
      loadSavedPosts();
    }
  }, [myAccount]);

  const loadMyAccount = async () => {
    const { data } = await supabase
      .from('hinsta_accounts')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data) setMyAccount(data);
  };

  const loadCollections = async () => {
    const { data: collData } = await supabase
      .from('hinsta_collections')
      .select('*')
      .eq('account_id', myAccount.id)
      .order('created_at', { ascending: false });

    if (collData) {
      const collectionsWithCounts = await Promise.all(
        collData.map(async (coll) => {
          const { count } = await supabase
            .from('hinsta_collection_posts')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', coll.id);

          const { data: firstPost } = await supabase
            .from('hinsta_collection_posts')
            .select('post_id')
            .eq('collection_id', coll.id)
            .order('added_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let coverImage = null;
          if (firstPost) {
            const { data: postData } = await supabase
              .from('hinsta_posts')
              .select('media_urls, media_url')
              .eq('id', firstPost.post_id)
              .maybeSingle();

            if (postData) {
              coverImage = postData.media_urls?.[0] || postData.media_url;
            }
          }

          return {
            ...coll,
            post_count: count || 0,
            cover_image: coverImage
          };
        })
      );

      setCollections(collectionsWithCounts);
    }
  };

  const loadSavedPosts = async () => {
    setLoading(true);

    const { data: savedData } = await supabase
      .from('hinsta_saved_posts')
      .select(`
        id,
        post_id,
        posts:hinsta_posts(
          id,
          media_urls,
          media_url,
          caption,
          like_count,
          comment_count
        )
      `)
      .eq('account_id', myAccount.id)
      .order('saved_at', { ascending: false });

    if (savedData) {
      setSavedPosts(savedData.map(item => ({
        id: item.id,
        post_id: item.post_id,
        post: item.posts as any
      })));
    }

    setLoading(false);
  };

  const createCollection = async () => {
    if (!newCollectionName.trim() || !myAccount) return;

    try {
      await supabase
        .from('hinsta_collections')
        .insert({
          account_id: myAccount.id,
          name: newCollectionName.trim()
        });

      setNewCollectionName('');
      setShowCreateCollection(false);
      showSuccess('Collection created successfully');
      loadCollections();
    } catch (error) {
      console.error('Error creating collection:', error);
      showError('Failed to create collection');
    }
  };

  const deleteCollection = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;

    try {
      await supabase
        .from('hinsta_collections')
        .delete()
        .eq('id', collectionId);

      showSuccess('Collection deleted successfully');
      loadCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
      showError('Failed to delete collection');
    }
  };

  const unsavePost = async (savedPostId: string) => {
    try {
      await supabase
        .from('hinsta_saved_posts')
        .delete()
        .eq('id', savedPostId);

      setSavedPosts(prev => prev.filter(p => p.id !== savedPostId));
      showSuccess('Post removed from saved');
    } catch (error) {
      console.error('Error unsaving post:', error);
      showError('Failed to unsave post');
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
        <HinstaLayout showBackButton backButtonPath="/hinsta">
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          </div>
        </HinstaLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
      <HinstaLayout showBackButton backButtonPath={`/hinsta/${myAccount?.username}`}>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-4">Saved</h1>

            <div className="flex gap-3 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveView('all')}
                className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  activeView === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Grid className="w-5 h-5 inline mr-2" />
                All Posts ({savedPosts.length})
              </button>

              {collections.map((coll) => (
                <button
                  key={coll.id}
                  onClick={() => setActiveView(coll.id)}
                  className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-colors group relative ${
                    activeView === coll.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {coll.name} ({coll.post_count})
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCollection(coll.id);
                    }}
                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 inline text-red-500 hover:text-red-600" />
                  </button>
                </button>
              ))}

              <button
                onClick={() => setShowCreateCollection(true)}
                className="px-6 py-3 rounded-lg font-semibold whitespace-nowrap bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                New Collection
              </button>
            </div>
          </div>

          {savedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Bookmark className="w-16 h-16 mb-4" />
              <p className="font-semibold">No saved posts yet</p>
              <p className="text-sm mt-2">Save posts to view them later</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {savedPosts.map((saved) => (
                <div key={saved.id} className="aspect-square bg-gray-100 relative group">
                  <Link to={`/hinsta/post/${saved.post_id}`}>
                    {(saved.post.media_urls?.[0] || saved.post.media_url) ? (
                      <img
                        src={saved.post.media_urls?.[0] || saved.post.media_url}
                        alt={saved.post.caption}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Bookmark className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </Link>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="text-white font-semibold flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        ❤️ {saved.post.like_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        💬 {saved.post.comment_count || 0}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => unsavePost(saved.id)}
                    className="absolute top-2 right-2 bg-white bg-opacity-90 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  >
                    <Bookmark className="w-5 h-5 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreateCollection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Create Collection</h2>
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Collection name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 mb-4"
                autoFocus
                maxLength={50}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateCollection(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createCollection}
                  disabled={!newCollectionName.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </HinstaLayout>
    </PlatformGuard>
  );
}
