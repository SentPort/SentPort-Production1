import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tag, TrendingUp, Star, Heart, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';
import { TagChip } from '../../components/heddit/TagChip';
import EngagementBar from '../../components/shared/EngagementBar';
import ShareModal from '../../components/heddit/ShareModal';
import HedditContentRenderer from '../../components/heddit/HedditContentRenderer';

export default function TagDetail() {
  const { tagName } = useParams();
  const decodedTagName = tagName ? decodeURIComponent(tagName) : '';
  const [tagInfo, setTagInfo] = useState<any>(null);
  const [subreddits, setSubreddits] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharingPost, setSharingPost] = useState<any | null>(null);

  useEffect(() => {
    if (decodedTagName) {
      loadTagData();
    }
  }, [decodedTagName]);

  const loadTagData = async () => {
    setLoading(true);
    try {
      const { data: tagData } = await supabase
        .from('heddit_custom_tags')
        .select('*')
        .ilike('display_name', decodedTagName)
        .maybeSingle();

      if (tagData) {
        setTagInfo(tagData);

        const [subredditsRes, postsRes] = await Promise.all([
          supabase
            .from('heddit_subreddit_custom_tags')
            .select(`
              heddit_subreddits(
                id,
                name,
                display_name,
                description,
                member_count
              )
            `)
            .eq('tag_id', tagData.id),
          supabase
            .from('heddit_post_tags')
            .select(`
              heddit_posts(
                id,
                title,
                content,
                type,
                url,
                like_count,
                dislike_count,
                comment_count,
                share_count,
                created_at,
                heddit_subreddits(name, display_name),
                heddit_accounts(username, display_name, karma, kindness, quality_score)
              )
            `)
            .eq('tag_id', tagData.id)
        ]);

        if (subredditsRes.data) {
          setSubreddits(subredditsRes.data.map((item: any) => item.heddit_subreddits));
        }

        if (postsRes.data) {
          const postsList = postsRes.data.map((item: any) => item.heddit_posts).filter(Boolean);
          // Sort by created_at descending (most recent first)
          postsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setPosts(postsList);
        }
      }
    } catch (error) {
      console.error('Error loading tag data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="heddit">
        <HedditLayout showBackButton>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </HedditLayout>
      </PlatformGuard>
    );
  }

  if (!tagInfo) {
    return (
      <PlatformGuard platform="heddit">
        <HedditLayout showBackButton>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <p className="text-gray-600">Tag not found</p>
          </div>
        </HedditLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton>
        <div className="min-h-screen bg-gray-100 py-6">
          <div className="max-w-6xl mx-auto px-4">
            <div className="bg-white rounded-lg border border-gray-300 p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <Tag className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{tagInfo.display_name}</h1>
                  <p className="text-gray-600 mt-1">
                    {tagInfo.usage_count} total use{tagInfo.usage_count !== 1 ? 's' : ''} •
                    {' '}{tagInfo.subreddit_usage_count} communit{tagInfo.subreddit_usage_count !== 1 ? 'ies' : 'y'} •
                    {' '}{tagInfo.post_usage_count} post{tagInfo.post_usage_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-4">Recent Posts</h2>
                  {posts.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center">
                      <p className="text-gray-600">No posts with this tag yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map((post) => (
                        <div key={post.id} className="bg-white rounded-lg border border-gray-300 p-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
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
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-300 p-4">
                  <h3 className="font-bold text-lg mb-4">Communities Using This Tag</h3>
                  {subreddits.length === 0 ? (
                    <p className="text-sm text-gray-600">No communities yet</p>
                  ) : (
                    <div className="space-y-3">
                      {subreddits.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/heddit/h/${sub.name}`}
                          className="block hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        >
                          <div className="font-semibold">h/{sub.name}</div>
                          <div className="text-sm text-gray-600">
                            {sub.member_count.toLocaleString()} members
                          </div>
                          {sub.description && (
                            <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                              {sub.description}
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-lg border border-gray-300 p-4">
                  <h3 className="font-bold text-lg mb-4">Tag Stats</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Uses:</span>
                      <span className="font-semibold">{tagInfo.usage_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Communities:</span>
                      <span className="font-semibold">{tagInfo.subreddit_usage_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Posts:</span>
                      <span className="font-semibold">{tagInfo.post_usage_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-semibold">
                        {new Date(tagInfo.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {sharingPost && (
          <ShareModal
            post={sharingPost}
            onClose={() => setSharingPost(null)}
            onSuccess={() => loadTagData()}
          />
        )}
      </HedditLayout>
    </PlatformGuard>
  );
}
