import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, Pin, CheckCircle2, Trash2, Star, Heart, Trophy, ArrowBigUp, ArrowBigDown, MessageCircle, Share2, Flag, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';
import ReportContentModal from '../../components/shared/ReportContentModal';
import CrossPostBadge from '../../components/heddit/CrossPostBadge';
import { TagChip } from '../../components/heddit/TagChip';
import { TrendingTagsWidget } from '../../components/heddit/TrendingTagsWidget';
import ConfirmationDialog from '../../components/shared/ConfirmationDialog';
import ShareModal from '../../components/heddit/ShareModal';
import SharedPostCard from '../../components/heddit/SharedPostCard';
import HedditContentRenderer from '../../components/heddit/HedditContentRenderer';
import HedditMediaGallery from '../../components/heddit/HedditMediaGallery';
import LeaderboardWidget from '../../components/heddit/LeaderboardWidget';
import JuryPoolVolunteerButton from '../../components/shared/JuryPoolVolunteerButton';

interface Post {
  id: string;
  title: string;
  content: string;
  type: string;
  url: string;
  author_id: string;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  is_pinned?: boolean;
  pinned_at?: string;
  heddit_subreddits: { name: string; display_name: string };
  heddit_accounts: { username: string; display_name: string };
  tags?: string[];
}

interface PostVote {
  [postId: string]: 'up' | 'down' | null;
}

export default function HedditFeed() {
  const location = useLocation();
  const { user } = useAuth();
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [subreddits, setSubreddits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportingPost, setReportingPost] = useState<string | null>(null);
  const [sharingPost, setSharingPost] = useState<any | null>(null);
  const [postTags, setPostTags] = useState<{ [key: string]: string[] }>({});
  const [subredditTags, setSubredditTags] = useState<{ [key: string]: string[] }>({});
  const [showWelcome, setShowWelcome] = useState(false);
  const [userAccountId, setUserAccountId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postVotes, setPostVotes] = useState<PostVote>({});
  const [postLikeCounts, setPostLikeCounts] = useState<{ [postId: string]: number }>({});
  const [postDislikeCounts, setPostDislikeCounts] = useState<{ [postId: string]: number }>({});

  useEffect(() => {
    loadData();
    if (user) {
      loadUserAccount();
    }
    if (location.state?.justJoined) {
      setShowWelcome(true);
      setTimeout(() => setShowWelcome(false), 5000);
      window.history.replaceState({}, document.title);
    }
  }, [user]);


  const loadData = async () => {
    const [pinnedRes, postsRes, subredditsRes] = await Promise.all([
      supabase
        .from('heddit_posts')
        .select(`
          *,
          heddit_subreddits(name, display_name),
          heddit_accounts(username, display_name, karma, kindness, quality_score)
        `)
        .eq('is_pinned', true)
        .eq('is_draft', false)
        .order('pinned_at', { ascending: false }),
      supabase
        .from('heddit_posts')
        .select(`
          *,
          heddit_subreddits(name, display_name),
          heddit_accounts(username, display_name, karma, kindness, quality_score)
        `)
        .eq('is_pinned', false)
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('heddit_subreddits')
        .select('*')
        .order('member_count', { ascending: false })
        .limit(10)
    ]);

    if (pinnedRes.data) {
      const validPinned = pinnedRes.data.filter(p => p.heddit_subreddits && p.heddit_accounts);
      setPinnedPosts(validPinned);
      loadTagsForPosts(validPinned.map(p => p.id));
      const likes: { [key: string]: number } = {};
      const dislikes: { [key: string]: number } = {};
      validPinned.forEach(p => {
        likes[p.id] = p.like_count || 0;
        dislikes[p.id] = p.dislike_count || 0;
      });
      setPostLikeCounts(prev => ({ ...prev, ...likes }));
      setPostDislikeCounts(prev => ({ ...prev, ...dislikes }));
    }
    if (postsRes.data) {
      const validPosts = postsRes.data.filter(p => p.heddit_subreddits && p.heddit_accounts);
      setPosts(validPosts);
      loadTagsForPosts(validPosts.map(p => p.id));
      const likes: { [key: string]: number } = {};
      const dislikes: { [key: string]: number } = {};
      validPosts.forEach(p => {
        likes[p.id] = p.like_count || 0;
        dislikes[p.id] = p.dislike_count || 0;
      });
      setPostLikeCounts(prev => ({ ...prev, ...likes }));
      setPostDislikeCounts(prev => ({ ...prev, ...dislikes }));

      const validPinned = pinnedRes.data?.filter(p => p.heddit_subreddits && p.heddit_accounts) || [];
      const allFetchedIds = [
        ...validPinned.map(p => p.id),
        ...validPosts.map(p => p.id)
      ];
      loadUserVotes(allFetchedIds);
    }
    if (subredditsRes.data) {
      setSubreddits(subredditsRes.data);
      loadTagsForSubreddits(subredditsRes.data.map(s => s.id));
    }
    setLoading(false);
  };

  const loadTagsForPosts = async (postIds: string[]) => {
    if (postIds.length === 0) return;

    const { data } = await supabase
      .from('heddit_post_tags')
      .select('post_id, heddit_custom_tags(display_name)')
      .in('post_id', postIds);

    if (data) {
      const tagsByPost: { [key: string]: string[] } = {};
      data.forEach((item: any) => {
        if (!tagsByPost[item.post_id]) {
          tagsByPost[item.post_id] = [];
        }
        if (item.heddit_custom_tags) {
          tagsByPost[item.post_id].push(item.heddit_custom_tags.display_name);
        }
      });
      setPostTags(prev => ({ ...prev, ...tagsByPost }));
    }
  };

  const loadTagsForSubreddits = async (subredditIds: string[]) => {
    if (subredditIds.length === 0) return;

    const { data } = await supabase
      .from('heddit_subreddit_custom_tags')
      .select('subreddit_id, heddit_custom_tags(display_name)')
      .in('subreddit_id', subredditIds);

    if (data) {
      const tagsBySubreddit: { [key: string]: string[] } = {};
      data.forEach((item: any) => {
        if (!tagsBySubreddit[item.subreddit_id]) {
          tagsBySubreddit[item.subreddit_id] = [];
        }
        if (item.heddit_custom_tags) {
          tagsBySubreddit[item.subreddit_id].push(item.heddit_custom_tags.display_name);
        }
      });
      setSubredditTags(prev => ({ ...prev, ...tagsBySubreddit }));
    }
  };

  const loadUserAccount = async () => {
    if (!user) return;

    const { data: account } = await supabase
      .from('heddit_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (account) {
      setUserAccountId(account.id);
    }
  };

  const loadUserVotes = async (postIds: string[]) => {
    if (!user || postIds.length === 0) return;

    const { data } = await supabase
      .from('heddit_votes')
      .select('post_id, vote_type')
      .eq('user_id', user.id)
      .in('post_id', postIds);

    if (data) {
      const votes: PostVote = {};
      data.forEach(vote => {
        votes[vote.post_id] = vote.vote_type;
      });
      setPostVotes(prev => ({ ...prev, ...votes }));
    }
  };

  const handleVote = async (postId: string, voteType: 'up' | 'down', currentPost: Post) => {
    if (!user) return;

    const currentVote = postVotes[postId];
    const previousLikes = postLikeCounts[postId] || 0;
    const previousDislikes = postDislikeCounts[postId] || 0;

    try {
      if (currentVote === voteType) {
        // Removing vote - optimistic UI update
        setPostVotes(prev => ({ ...prev, [postId]: null }));
        if (voteType === 'up') {
          setPostLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) - 1) }));
        } else {
          setPostDislikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) - 1) }));
        }

        const { error: deleteError } = await supabase
          .from('heddit_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        const { error: updateError } = await supabase.rpc(
          voteType === 'up' ? 'decrement_heddit_like_count' : 'decrement_heddit_dislike_count',
          { post_id: postId }
        );

        if (updateError) throw updateError;
      } else {
        // Switching or adding vote - optimistic UI update
        setPostVotes(prev => ({ ...prev, [postId]: voteType }));
        if (voteType === 'up') {
          setPostLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
          if (currentVote === 'down') {
            setPostDislikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) - 1) }));
          }
        } else {
          setPostDislikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
          if (currentVote === 'up') {
            setPostLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) - 1) }));
          }
        }

        if (currentVote) {
          const { error: updateVoteError } = await supabase
            .from('heddit_votes')
            .update({ vote_type: voteType })
            .eq('post_id', postId)
            .eq('user_id', user.id);

          if (updateVoteError) throw updateVoteError;

          const { error: updateCountsError } = await supabase.rpc('switch_heddit_vote', {
            post_id: postId,
            new_vote_type: voteType
          });

          if (updateCountsError) throw updateCountsError;
        } else {
          const { error: insertError } = await supabase
            .from('heddit_votes')
            .insert({
              post_id: postId,
              user_id: user.id,
              vote_type: voteType
            });

          if (insertError) throw insertError;

          const { error: incrementError } = await supabase.rpc(
            voteType === 'up' ? 'increment_heddit_like_count' : 'increment_heddit_dislike_count',
            { post_id: postId }
          );

          if (incrementError) throw incrementError;
        }
      }
    } catch (error) {
      console.error('Error voting:', error);
      setPostVotes(prev => ({ ...prev, [postId]: currentVote }));
      setPostLikeCounts(prev => ({ ...prev, [postId]: previousLikes }));
      setPostDislikeCounts(prev => ({ ...prev, [postId]: previousDislikes }));
    }
  };

  const handleDeletePost = async () => {
    if (!deletingPostId) return;

    try {
      const { error } = await supabase
        .from('heddit_posts')
        .delete()
        .eq('id', deletingPostId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== deletingPostId));
      setPinnedPosts(pinnedPosts.filter(p => p.id !== deletingPostId));
      setShowDeleteModal(false);
      setDeletingPostId(null);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout>
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {showWelcome && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-green-900 font-medium">Welcome to Heddit!</p>
                <p className="text-green-700 text-sm">Your account has been created. Check your dashboard to see all your platforms.</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
              {loading ? (
                <div className="text-center py-12">
                  <div className="text-gray-600">Loading posts...</div>
                </div>
              ) : pinnedPosts.length === 0 && posts.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center">
                  <p className="text-gray-600">No posts yet. Be the first to post!</p>
                </div>
              ) : (
                <>
                  {pinnedPosts.map((post) => (
                    post.type === 'share' ? (
                      <div key={post.id} className="border-l-4 border-l-orange-500">
                        <div className="bg-orange-50 px-4 py-2 flex items-center gap-2 text-sm text-orange-600 font-semibold">
                          <Pin size={16} className="fill-orange-600" />
                          <span>Pinned by Admin</span>
                        </div>
                        <SharedPostCard
                          sharePost={post}
                          currentAccountId={userAccountId || undefined}
                          onDelete={() => {
                            setPosts(posts.filter(p => p.id !== post.id));
                            setPinnedPosts(pinnedPosts.filter(p => p.id !== post.id));
                          }}
                        />
                      </div>
                    ) : (
                      <div key={post.id} className="bg-white rounded-lg border-l-4 border-l-orange-500 border-t border-r border-b border-gray-300 overflow-hidden min-w-0 hover:border-gray-400 transition-colors">
                        <div className="flex min-w-0">
                          <div className="w-12 flex-shrink-0 bg-gray-50 flex flex-col items-center py-2 gap-0.5">
                            <button
                              onClick={() => handleVote(post.id, 'up', post)}
                              className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                postVotes[post.id] === 'up' ? 'text-orange-600' : 'text-gray-400'
                              }`}
                            >
                              <ArrowBigUp className="w-6 h-6" fill={postVotes[post.id] === 'up' ? 'currentColor' : 'none'} />
                            </button>
                            <span className={`text-sm font-bold ${postVotes[post.id] === 'up' ? 'text-orange-600' : 'text-gray-600'}`}>
                              {postLikeCounts[post.id] || 0}
                            </span>
                            <button
                              onClick={() => handleVote(post.id, 'down', post)}
                              className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                postVotes[post.id] === 'down' ? 'text-blue-600' : 'text-gray-400'
                              }`}
                            >
                              <ArrowBigDown className="w-6 h-6" fill={postVotes[post.id] === 'down' ? 'currentColor' : 'none'} />
                            </button>
                            <span className={`text-sm font-bold ${postVotes[post.id] === 'down' ? 'text-blue-600' : 'text-gray-400'}`}>
                              {postDislikeCounts[post.id] || 0}
                            </span>
                          </div>
                        <div className="flex-1 p-4 min-w-0">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 min-w-0">
                              <div className="flex items-center gap-1 text-orange-600 font-semibold">
                                <Pin size={16} className="fill-orange-600" />
                                <span>Pinned by Admin</span>
                              </div>
                              <span>•</span>
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
                            {userAccountId === post.author_id && (
                              <button
                                onClick={() => {
                                  setDeletingPostId(post.id);
                                  setShowDeleteModal(true);
                                }}
                                className="flex items-center gap-1 text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                title="Delete post"
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            )}
                          </div>

                          <Link to={`/heddit/post/${post.id}`}>
                            <h2 className="text-xl font-semibold mb-2 hover:text-blue-600 cursor-pointer">{post.title}</h2>
                          </Link>

                          {post.content && (
                            <HedditContentRenderer
                              content={post.content}
                              className="text-gray-800 mb-4 whitespace-pre-wrap"
                              hasRichFormatting={post.has_rich_formatting}
                            />
                          )}

                          {post.type === 'link' && post.url && (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {post.url}
                            </a>
                          )}

                          {(post.type === 'image' || post.type === 'video') && post.media_urls && post.media_urls.length > 0 && (
                            <HedditMediaGallery
                              mediaUrls={post.media_urls}
                              mediaTypes={post.media_types || []}
                              className="mb-4"
                            />
                          )}

                          {post.type === 'image' && post.url && (!post.media_urls || post.media_urls.length === 0) && (
                            <img
                              src={post.url}
                              alt={post.title}
                              className="max-w-full rounded-lg mb-4"
                            />
                          )}

                          <CrossPostBadge postId={post.id} currentSubredditName={post.heddit_subreddits.name} />

                          {postTags[post.id] && postTags[post.id].length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {postTags[post.id].map((tag) => (
                                <TagChip key={tag} tag={tag} size="sm" />
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-4 pt-4 border-t border-gray-200">
                            <Link to={`/heddit/post/${post.id}`} className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors">
                              <MessageCircle className="w-5 h-5" />
                              <span className="font-medium">{post.comment_count || 0}</span>
                              <span>Comments</span>
                            </Link>
                            <button
                              onClick={() => setSharingPost(post)}
                              className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                            >
                              <Share2 className="w-5 h-5" />
                              <span>Share</span>
                              {post.share_count > 0 && <span className="font-medium">({post.share_count})</span>}
                            </button>
                            <button
                              onClick={() => setReportingPost(post.id)}
                              className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                            >
                              <Flag className="w-5 h-5" />
                              <span>Report</span>
                            </button>
                          </div>

                          {post.heddit_accounts && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-gray-100 text-sm">
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
                        </div>
                      </div>
                    )
                  ))}
                  {posts.map((post) => (
                    post.type === 'share' ? (
                      <SharedPostCard
                        key={post.id}
                        sharePost={post}
                        currentAccountId={userAccountId || undefined}
                        onDelete={() => {
                          setPosts(posts.filter(p => p.id !== post.id));
                          setPinnedPosts(pinnedPosts.filter(p => p.id !== post.id));
                        }}
                      />
                    ) : (
                      <div key={post.id} className="bg-white rounded-lg border border-gray-300 overflow-hidden min-w-0 hover:border-gray-400 transition-colors">
                        <div className="flex min-w-0">
                          <div className="w-12 flex-shrink-0 bg-gray-50 flex flex-col items-center py-2 gap-0.5">
                            <button
                              onClick={() => handleVote(post.id, 'up', post)}
                              className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                postVotes[post.id] === 'up' ? 'text-orange-600' : 'text-gray-400'
                              }`}
                            >
                              <ArrowBigUp className="w-6 h-6" fill={postVotes[post.id] === 'up' ? 'currentColor' : 'none'} />
                            </button>
                            <span className={`text-sm font-bold ${postVotes[post.id] === 'up' ? 'text-orange-600' : 'text-gray-600'}`}>
                              {postLikeCounts[post.id] || 0}
                            </span>
                            <button
                              onClick={() => handleVote(post.id, 'down', post)}
                              className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                postVotes[post.id] === 'down' ? 'text-blue-600' : 'text-gray-400'
                              }`}
                            >
                              <ArrowBigDown className="w-6 h-6" fill={postVotes[post.id] === 'down' ? 'currentColor' : 'none'} />
                            </button>
                            <span className={`text-sm font-bold ${postVotes[post.id] === 'down' ? 'text-blue-600' : 'text-gray-400'}`}>
                              {postDislikeCounts[post.id] || 0}
                            </span>
                          </div>
                        <div className="flex-1 p-4 min-w-0">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 min-w-0">
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
                            {userAccountId === post.author_id && (
                              <button
                                onClick={() => {
                                  setDeletingPostId(post.id);
                                  setShowDeleteModal(true);
                                }}
                                className="flex items-center gap-1 text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                title="Delete post"
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            )}
                          </div>

                          <Link to={`/heddit/post/${post.id}`}>
                            <h2 className="text-xl font-semibold mb-2 hover:text-blue-600 cursor-pointer">{post.title}</h2>
                          </Link>

                          {post.content && (
                            <HedditContentRenderer
                              content={post.content}
                              className="text-gray-800 mb-4 whitespace-pre-wrap"
                              hasRichFormatting={post.has_rich_formatting}
                            />
                          )}

                          {post.type === 'link' && post.url && (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {post.url}
                            </a>
                          )}

                          {(post.type === 'image' || post.type === 'video') && post.media_urls && post.media_urls.length > 0 && (
                            <HedditMediaGallery
                              mediaUrls={post.media_urls}
                              mediaTypes={post.media_types || []}
                              className="mb-4"
                            />
                          )}

                          {post.type === 'image' && post.url && (!post.media_urls || post.media_urls.length === 0) && (
                            <img
                              src={post.url}
                              alt={post.title}
                              className="max-w-full rounded-lg mb-4"
                            />
                          )}

                          <CrossPostBadge postId={post.id} currentSubredditName={post.heddit_subreddits.name} />

                          {postTags[post.id] && postTags[post.id].length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {postTags[post.id].map((tag) => (
                                <TagChip key={tag} tag={tag} size="sm" />
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-4 pt-4 border-t border-gray-200">
                            <Link to={`/heddit/post/${post.id}`} className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors">
                              <MessageCircle className="w-5 h-5" />
                              <span className="font-medium">{post.comment_count || 0}</span>
                              <span>Comments</span>
                            </Link>
                            <button
                              onClick={() => setSharingPost(post)}
                              className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                            >
                              <Share2 className="w-5 h-5" />
                              <span>Share</span>
                              {post.share_count > 0 && <span className="font-medium">({post.share_count})</span>}
                            </button>
                            <button
                              onClick={() => setReportingPost(post.id)}
                              className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                            >
                              <Flag className="w-5 h-5" />
                              <span>Report</span>
                            </button>
                          </div>

                          {post.heddit_accounts && (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-gray-100 text-sm">
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
                        </div>
                      </div>
                    )
                  ))}
                </>
              )}
            </div>

            <div className="space-y-4 order-1 lg:order-2">
              <Link
                to="/heddit/communities"
                className="hidden sm:flex items-center gap-3 bg-white rounded-lg border border-gray-300 p-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                  <Users size={20} className="text-orange-500" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Communities</div>
                  <div className="text-sm text-gray-500">Browse & manage your communities</div>
                </div>
              </Link>

              <JuryPoolVolunteerButton variant="compact" requireVerified={false} />

              <LeaderboardWidget />

              <TrendingTagsWidget />

              <div className="bg-white rounded-lg border border-gray-300 p-4">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <TrendingUp size={20} />
                  Trending Communities
                </h3>
                <div className="space-y-3">
                  {subreddits.map((sub) => (
                    <div key={sub.id} className="hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <Link
                        to={`/heddit/h/${sub.name}`}
                        className="block"
                      >
                        <div className="font-semibold">h/{sub.name}</div>
                        <div className="text-sm text-gray-600">
                          {sub.member_count.toLocaleString()} members
                        </div>
                      </Link>
                      {subredditTags[sub.id] && subredditTags[sub.id].length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {subredditTags[sub.id].slice(0, 3).map((tag) => (
                            <TagChip key={tag} tag={tag} size="sm" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {reportingPost && (
          <ReportContentModal
            platform="heddit"
            contentType="post"
            contentId={reportingPost}
            onClose={() => setReportingPost(null)}
          />
        )}

        {sharingPost && (
          <ShareModal
            post={sharingPost}
            onClose={() => setSharingPost(null)}
            onSuccess={() => loadData()}
          />
        )}

        {showDeleteModal && (
          <ConfirmationDialog
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setDeletingPostId(null);
            }}
            onConfirm={handleDeletePost}
            title="Delete Post"
            message="Are you sure you want to delete this post? This action cannot be undone."
            confirmText="Delete"
            confirmStyle="danger"
          />
        )}
      </div>
      </HedditLayout>
    </PlatformGuard>
  );
}