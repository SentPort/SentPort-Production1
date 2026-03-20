import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import BlogWheel from '../../components/blog/BlogWheel';
import { ArrowLeft, Lock, Globe, Trash2, BookOpen } from 'lucide-react';

interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  account_id: string;
  created_at: string;
  view_count?: number;
  comment_count?: number;
  cover_image_url?: string;
  estimated_read_minutes?: number;
  blog_accounts?: {
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  blog_feed_metrics?: Array<{
    total_comments_30d: number;
    engagement_score: number;
  }>;
  is_pinned?: boolean;
}

export default function CollectionView() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (collectionId) {
      fetchCollectionData();
    }
  }, [collectionId, user?.id]);

  async function fetchCollectionData() {
    try {
      setLoading(true);

      const { data: collectionData, error: collectionError } = await supabase
        .from('blog_collections')
        .select('*')
        .eq('id', collectionId)
        .maybeSingle();

      if (collectionError) throw collectionError;
      if (!collectionData) {
        navigate('/blog/collections');
        return;
      }

      if (!collectionData.is_public && collectionData.user_id !== user?.id) {
        navigate('/blog/collections');
        return;
      }

      setCollection(collectionData);
      setIsOwner(collectionData.user_id === user?.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from('blog_collection_items')
        .select(`
          post_id,
          blog_posts (
            id,
            title,
            content,
            account_id,
            created_at,
            view_count,
            cover_image_url,
            estimated_read_minutes,
            is_pinned,
            blog_accounts (
              username,
              display_name,
              avatar_url
            ),
            blog_feed_metrics (
              total_comments_30d,
              engagement_score
            )
          )
        `)
        .eq('collection_id', collectionId)
        .order('added_at', { ascending: false });

      if (itemsError) throw itemsError;

      const postsData = itemsData
        ?.map(item => item.blog_posts)
        .filter((post): post is BlogPost => post !== null) || [];

      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching collection:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemovePost(postId: string) {
    if (!isOwner) return;

    try {
      const { error } = await supabase
        .from('blog_collection_items')
        .delete()
        .eq('collection_id', collectionId)
        .eq('post_id', postId);

      if (error) throw error;

      setPosts(posts.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error removing post from collection:', error);
    }
  }

  function handlePostClick(postId: string) {
    navigate(`/blog/post/${postId}`);
  }

  if (loading) {
    return (
      <BlogLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-white text-lg">Loading collection...</div>
        </div>
      </BlogLayout>
    );
  }

  if (!collection) {
    return (
      <BlogLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="text-white text-lg">Collection not found</div>
        </div>
      </BlogLayout>
    );
  }

  return (
    <BlogLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/blog/collections"
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collections
          </Link>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-8 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{collection.name}</h1>
                {collection.description && (
                  <p className="text-gray-300 text-lg mb-4">{collection.description}</p>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    {collection.is_public ? (
                      <>
                        <Globe className="w-4 h-4" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Private</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <BookOpen className="w-4 h-4" />
                    <span>{posts.length} {posts.length === 1 ? 'story' : 'stories'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-600/30 rounded-2xl p-12 text-center">
              <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">This collection is empty</h2>
              <p className="text-gray-300 mb-6">
                Start adding stories from the blog feed to build your collection!
              </p>
              <Link
                to="/blog/feed"
                className="inline-block px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium rounded-xl hover:from-pink-700 hover:to-rose-700 transition-all shadow-lg shadow-pink-500/20"
              >
                Explore Stories
              </Link>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">Stories in this collection</h2>
              <BlogWheel
                posts={posts}
                onPostClick={handlePostClick}
                onRemoveFromCollection={isOwner ? handleRemovePost : undefined}
                showRemoveButton={isOwner}
              />
            </div>
          )}
        </div>
      </div>
    </BlogLayout>
  );
}
