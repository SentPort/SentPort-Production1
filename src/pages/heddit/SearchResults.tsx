import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, MessageSquare, FileText, Tag, Trash2, Star, Heart, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';
import { TagChip } from '../../components/heddit/TagChip';
import EngagementBar from '../../components/shared/EngagementBar';
import ConfirmationDialog from '../../components/shared/ConfirmationDialog';
import ShareModal from '../../components/heddit/ShareModal';
import HedditContentRenderer from '../../components/heddit/HedditContentRenderer';
import SharedPostCard from '../../components/heddit/SharedPostCard';

type TabType = 'all' | 'subreddits' | 'posts' | 'tags';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [subreddits, setSubreddits] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [sharingPost, setSharingPost] = useState<any | null>(null);

  useEffect(() => {
    loadCurrentAccount();
  }, []);

  useEffect(() => {
    if (query) {
      searchAll();
    }
  }, [query]);

  const loadCurrentAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('heddit_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setCurrentAccountId(data.id);
    }
  };

  const searchAll = async () => {
    setLoading(true);
    try {
      const searchPattern = `%${query.trim()}%`;
      const [subredditsRes, postsRes, tagsRes] = await Promise.all([
        supabase
          .from('heddit_subreddits')
          .select('*')
          .or(`name.ilike.${searchPattern},display_name.ilike.${searchPattern},description.ilike.${searchPattern}`)
          .order('member_count', { ascending: false })
          .limit(50),
        supabase
          .from('heddit_posts')
          .select(`
            *,
            heddit_subreddits(name, display_name),
            heddit_accounts(username, display_name, karma, kindness, quality_score)
          `)
          .or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .rpc('search_tags_autocomplete', {
            search_query: query.trim(),
            result_limit: 50
          })
      ]);

      if (subredditsRes.data) setSubreddits(subredditsRes.data);
      if (postsRes.data) setPosts(postsRes.data);
      if (tagsRes.data) setTags(tagsRes.data);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalResults = () => {
    return subreddits.length + posts.length + tags.length;
  };

  const handleDeletePost = async () => {
    if (!deletePostId) return;

    const { error } = await supabase
      .from('heddit_posts')
      .delete()
      .eq('id', deletePostId);

    if (!error) {
      setPosts(posts.filter(p => p.id !== deletePostId));
    }

    setDeletePostId(null);
  };

  const renderSubreddits = (items: any[]) => (
    <div className="space-y-4">
      {items.map((sub) => (
        <Link
          key={sub.id}
          to={`/heddit/h/${sub.name}`}
          className="block bg-white rounded-lg border border-gray-300 p-4 hover:border-orange-500 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">h/{sub.name}</h3>
                <p className="text-sm text-gray-600">
                  {sub.member_count.toLocaleString()} members
                </p>
                {sub.description && (
                  <p className="text-sm text-gray-700 mt-1">{sub.description}</p>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );

  const renderPosts = (items: any[]) => (
    <div className="space-y-4">
      {items.map((post) => (
        post.type === 'share' ? (
          <SharedPostCard
            key={post.id}
            sharePost={post}
            currentAccountId={currentAccountId || undefined}
            onDelete={() => {
              setPosts(posts.filter(p => p.id !== post.id));
            }}
          />
        ) : (
          <div key={post.id} className="bg-white rounded-lg border border-gray-300 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Link
                  to={`/heddit/h/${post.heddit_subreddits.name}`}
                  className="font-bold hover:underline"
                >
                  h/{post.heddit_subreddits.name}
                </Link>
                <span>•</span>
                <span>Posted by</span>
                <Link
                  to={`/heddit/user/${post.heddit_accounts.username}`}
                  className="hover:underline"
                >
                  u/{post.heddit_accounts.username}
                </Link>
              </div>
              {currentAccountId === post.author_id && (
                <button
                  onClick={() => setDeletePostId(post.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <Link to={`/heddit/post/${post.id}`}>
              <h2 className="text-xl font-semibold mb-2 hover:text-blue-600 cursor-pointer">
                {post.title}
              </h2>
            </Link>

            {post.content && (
              <HedditContentRenderer
                content={post.content}
                className="text-gray-800 mb-4 line-clamp-3 whitespace-pre-wrap"
              />
            )}

            <div className="pt-4 border-t border-gray-200">
              <EngagementBar
                platform="heddit"
                contentType="post"
                contentId={post.id}
                initialLikeCount={post.like_count}
                initialDislikeCount={post.dislike_count}
                initialCommentCount={post.comment_count}
                initialShareCount={post.share_count}
                onCommentClick={() => window.location.href = `/heddit/post/${post.id}`}
                onShareClick={() => setSharingPost(post)}
              />
            </div>

            {post.heddit_accounts && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">{post.heddit_accounts.karma || 0}</span>
                  <span className="text-gray-500">Karma</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span className="font-medium">{post.heddit_accounts.kindness || 0}</span>
                  <span className="text-gray-500">Kindness</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Trophy className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{post.heddit_accounts.quality_score || 0}</span>
                  <span className="text-gray-500">Quality</span>
                </div>
              </div>
            )}
          </div>
        )
      ))}
    </div>
  );

  const renderTags = (items: any[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((tag) => (
        <Link
          key={tag.id}
          to={`/heddit/tag/${encodeURIComponent(tag.display_name)}`}
          className="block bg-white rounded-lg border border-gray-300 p-4 hover:border-orange-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <Tag className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-bold">{tag.display_name}</h3>
              <p className="text-sm text-gray-600">
                {tag.usage_count} use{tag.usage_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">Searching...</p>
        </div>
      );
    }

    if (getTotalResults() === 0) {
      return (
        <div className="bg-white rounded-lg p-12 text-center">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No results found for "{query}"</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'subreddits':
        return subreddits.length > 0 ? renderSubreddits(subreddits) : (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-600">No SubHeddits found</p>
          </div>
        );
      case 'posts':
        return posts.length > 0 ? renderPosts(posts) : (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-600">No posts found</p>
          </div>
        );
      case 'tags':
        return tags.length > 0 ? renderTags(tags) : (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-600">No tags found</p>
          </div>
        );
      case 'all':
      default:
        return (
          <div className="space-y-8">
            {subreddits.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Communities ({subreddits.length})
                </h3>
                {renderSubreddits(subreddits.slice(0, 5))}
                {subreddits.length > 5 && (
                  <button
                    onClick={() => setActiveTab('subreddits')}
                    className="mt-4 text-orange-600 hover:underline"
                  >
                    See all {subreddits.length} communities
                  </button>
                )}
              </div>
            )}

            {posts.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Posts ({posts.length})
                </h3>
                {renderPosts(posts.slice(0, 5))}
                {posts.length > 5 && (
                  <button
                    onClick={() => setActiveTab('posts')}
                    className="mt-4 text-orange-600 hover:underline"
                  >
                    See all {posts.length} posts
                  </button>
                )}
              </div>
            )}

            {tags.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Tags ({tags.length})
                </h3>
                {renderTags(tags.slice(0, 6))}
                {tags.length > 6 && (
                  <button
                    onClick={() => setActiveTab('tags')}
                    className="mt-4 text-orange-600 hover:underline"
                  >
                    See all {tags.length} tags
                  </button>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton>
        <div className="min-h-screen bg-gray-100 py-6">
          <div className="max-w-5xl mx-auto px-4">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">
                Search Results for "{query}"
              </h1>
              <p className="text-gray-600">
                {getTotalResults()} result{getTotalResults() !== 1 ? 's' : ''} found
              </p>
            </div>

            <div className="flex gap-2 mb-6 border-b border-gray-300 overflow-x-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({getTotalResults()})
              </button>
              <button
                onClick={() => setActiveTab('subreddits')}
                className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'subreddits'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Communities ({subreddits.length})
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'posts'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Posts ({posts.length})
              </button>
              <button
                onClick={() => setActiveTab('tags')}
                className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'tags'
                    ? 'text-orange-600 border-b-2 border-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tags ({tags.length})
              </button>
            </div>

            {renderContent()}
          </div>
        </div>

        {deletePostId && (
          <ConfirmationDialog
            title="Delete Post"
            message="Are you sure you want to delete this post? This action cannot be undone."
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={handleDeletePost}
            onCancel={() => setDeletePostId(null)}
            variant="danger"
          />
        )}

        {sharingPost && (
          <ShareModal
            post={sharingPost}
            onClose={() => setSharingPost(null)}
            onSuccess={() => searchAll()}
          />
        )}
      </HedditLayout>
    </PlatformGuard>
  );
}
