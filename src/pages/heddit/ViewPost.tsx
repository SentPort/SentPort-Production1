import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowBigUp, ArrowBigDown, Share2, Flag, CreditCard as Edit3, Trash2, Star, Heart, Trophy, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';
import UniversalCommentSection from '../../components/shared/UniversalCommentSection';
import ReportContentModal from '../../components/shared/ReportContentModal';
import CrossPostBadge from '../../components/heddit/CrossPostBadge';
import { TagChip } from '../../components/heddit/TagChip';
import { EditTagsModal } from '../../components/heddit/EditTagsModal';
import ConfirmationDialog from '../../components/shared/ConfirmationDialog';
import ShareModal from '../../components/heddit/ShareModal';
import HedditContentRenderer from '../../components/heddit/HedditContentRenderer';

export default function ViewPost() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<any>(null);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [voteScore, setVoteScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [editTagsModalOpen, setEditTagsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sharingPost, setSharingPost] = useState<any | null>(null);
  const [postTags, setPostTags] = useState<string[]>([]);
  const [isAuthor, setIsAuthor] = useState(false);
  const [userAccountId, setUserAccountId] = useState<string | null>(null);

  // Fetch user account ID immediately when user is available
  useEffect(() => {
    if (user) {
      fetchUserAccountId();
    }
  }, [user]);

  // Load post and related data
  useEffect(() => {
    if (postId) {
      loadPost();
      loadPostTags();
      if (user) {
        loadUserVote();
      }
    }
  }, [postId, user]);

  // Check if user is author after both user account and post are loaded
  useEffect(() => {
    if (userAccountId && post) {
      setIsAuthor(post.author_id === userAccountId);
    }
  }, [userAccountId, post]);

  const loadPost = async () => {
    const { data, error } = await supabase
      .from('heddit_posts')
      .select(`
        *,
        heddit_subreddits(name, display_name),
        heddit_accounts(username, display_name, karma, kindness, quality_score)
      `)
      .eq('id', postId)
      .maybeSingle();

    if (error) {
      console.error('Error loading post:', error);
      navigate('/heddit/feed');
      return;
    }

    setPost(data);
    setVoteScore((data?.like_count || 0) - (data?.dislike_count || 0));
    setLoading(false);
  };

  const loadUserVote = async () => {
    if (!user || !postId) return;

    const { data } = await supabase
      .from('heddit_votes')
      .select('vote_type')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setUserVote(data.vote_type);
    }
  };

  const loadPostTags = async () => {
    if (!postId) return;

    const { data } = await supabase
      .from('heddit_post_tags')
      .select('heddit_custom_tags(display_name)')
      .eq('post_id', postId);

    if (data) {
      setPostTags(data.map((t: any) => t.heddit_custom_tags.display_name));
    }
  };

  const fetchUserAccountId = async () => {
    if (!user) return;

    try {
      const { data: hedditAccount, error } = await supabase
        .from('heddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching heddit account:', error);
        return;
      }

      if (hedditAccount) {
        console.log('Heddit account ID fetched:', hedditAccount.id);
        setUserAccountId(hedditAccount.id);
      } else {
        console.warn('No heddit account found for user:', user.id);
      }
    } catch (error) {
      console.error('Error in fetchUserAccountId:', error);
    }
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user || !postId) return;

    const previousVote = userVote;
    const previousScore = voteScore;

    try {
      if (userVote === voteType) {
        // Removing vote - optimistic UI update
        setUserVote(null);
        setVoteScore(prev => prev + (voteType === 'up' ? -1 : 1));

        // Delete vote record
        const { error: deleteError } = await supabase
          .from('heddit_votes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Use SQL to decrement count (prevents race condition with stale data)
        const { error: updateError } = await supabase.rpc(
          voteType === 'up' ? 'decrement_heddit_like_count' : 'decrement_heddit_dislike_count',
          { post_id: postId }
        );

        if (updateError) throw updateError;
      } else {
        // Switching or adding vote - optimistic UI update
        setVoteScore(prev => {
          if (userVote) {
            // Switching: remove old, add new (net change = 2)
            return prev + (voteType === 'up' ? 2 : -2);
          } else {
            // New vote
            return prev + (voteType === 'up' ? 1 : -1);
          }
        });
        setUserVote(voteType);

        if (userVote) {
          // Update existing vote
          const { error: updateVoteError } = await supabase
            .from('heddit_votes')
            .update({ vote_type: voteType })
            .eq('post_id', postId)
            .eq('user_id', user.id);

          if (updateVoteError) throw updateVoteError;

          // Use SQL to switch counts (increment new, decrement old)
          const { error: updateCountsError } = await supabase.rpc('switch_heddit_vote', {
            post_id: postId,
            new_vote_type: voteType
          });

          if (updateCountsError) throw updateCountsError;
        } else {
          // Insert new vote
          const { error: insertError } = await supabase
            .from('heddit_votes')
            .insert({
              post_id: postId,
              user_id: user.id,
              vote_type: voteType
            });

          if (insertError) throw insertError;

          // Use SQL to increment count
          const { error: incrementError } = await supabase.rpc(
            voteType === 'up' ? 'increment_heddit_like_count' : 'increment_heddit_dislike_count',
            { post_id: postId }
          );

          if (incrementError) throw incrementError;
        }
      }

      // Refresh post data after successful vote
      loadPost();
    } catch (error) {
      console.error('Error voting:', error);
      // Rollback optimistic updates on error
      setUserVote(previousVote);
      setVoteScore(previousScore);
    }
  };

  const handleDeletePost = async () => {
    if (!postId || !isAuthor) return;

    try {
      const { error } = await supabase
        .from('heddit_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      navigate(`/heddit/h/${post.heddit_subreddits.name}`);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="heddit">
        <HedditLayout showBackButton>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
        </HedditLayout>
      </PlatformGuard>
    );
  }

  if (!post) {
    return (
      <PlatformGuard platform="heddit">
        <HedditLayout showBackButton>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-gray-600">Post not found</div>
        </div>
        </HedditLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton>
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
            <div className="flex">
              <div className="w-12 bg-gray-50 flex flex-col items-center py-2 gap-1">
                <button
                  onClick={() => handleVote('up')}
                  className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                    userVote === 'up' ? 'text-orange-600' : 'text-gray-400'
                  }`}
                >
                  <ArrowBigUp className="w-6 h-6" fill={userVote === 'up' ? 'currentColor' : 'none'} />
                </button>
                <span className={`text-sm font-bold ${
                  voteScore > 0 ? 'text-orange-600' : voteScore < 0 ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {voteScore}
                </span>
                <button
                  onClick={() => handleVote('down')}
                  className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                    userVote === 'down' ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <ArrowBigDown className="w-6 h-6" fill={userVote === 'down' ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="flex-1 p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
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
                  <span>•</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>

                <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

                {post.content && (
                  <div className="prose max-w-none mb-4">
                    <HedditContentRenderer
                      content={post.content}
                      className="text-gray-800 whitespace-pre-wrap"
                    />
                  </div>
                )}

                {post.type === 'link' && post.url && (
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-block mb-4"
                  >
                    {post.url}
                  </a>
                )}

                {post.type === 'image' && post.url && (
                  <img
                    src={post.url}
                    alt={post.title}
                    className="max-w-full rounded-lg mb-4"
                  />
                )}

                <CrossPostBadge postId={post.id} currentSubredditName={post.heddit_subreddits.name} />

                {postTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {postTags.map((tag) => (
                      <TagChip key={tag} tag={tag} />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium">{post.comment_count || 0}</span>
                    <span>Comments</span>
                  </div>
                  <button
                    onClick={() => setSharingPost(post)}
                    className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                    <span>Share</span>
                    {post.share_count > 0 && <span className="font-medium">({post.share_count})</span>}
                  </button>
                  <button
                    onClick={() => setReportModalOpen(true)}
                    className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                  >
                    <Flag className="w-5 h-5" />
                    <span>Report</span>
                  </button>
                </div>

                {post.heddit_accounts && (
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-sm mb-4">
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

                {isAuthor && (
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setEditTagsModalOpen(true)}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Tags
                    </button>
                    <button
                      onClick={() => setDeleteModalOpen(true)}
                      className="flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200">
              <UniversalCommentSection
                platform="heddit"
                contentType="post"
                contentId={postId!}
                accountId={userAccountId || undefined}
              />
            </div>
          </div>
        </div>

        {reportModalOpen && (
          <ReportContentModal
            platform="heddit"
            contentType="post"
            contentId={postId!}
            onClose={() => setReportModalOpen(false)}
          />
        )}

        {editTagsModalOpen && (
          <EditTagsModal
            postId={postId!}
            currentTags={postTags}
            onClose={() => setEditTagsModalOpen(false)}
            onSave={(newTags) => setPostTags(newTags)}
            subredditId={post?.subreddit_id}
            maxTags={5}
          />
        )}

        {deleteModalOpen && (
          <ConfirmationDialog
            isOpen={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            onConfirm={handleDeletePost}
            title="Delete Post"
            message="Are you sure you want to delete this post? This action cannot be undone. All comments under this post will also be deleted, and everyone who commented will lose karma for their deleted comments. You will lose 15 karma from this deletion."
            confirmText="Delete"
            confirmStyle="danger"
          />
        )}

        {sharingPost && (
          <ShareModal
            post={sharingPost}
            onClose={() => setSharingPost(null)}
            onSuccess={() => loadPost()}
          />
        )}
      </div>
      </HedditLayout>
    </PlatformGuard>
  );
}
