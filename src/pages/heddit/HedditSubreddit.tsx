import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Users, Calendar, Hash, Plus, Pin, TrendingUp, Trash2, MoreVertical, Star, Heart, Trophy, ArrowBigUp, ArrowBigDown, MessageCircle, Share2, Flag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';
import ReportContentModal from '../../components/shared/ReportContentModal';
import CrossPostBadge from '../../components/heddit/CrossPostBadge';
import { TagChip } from '../../components/heddit/TagChip';
import ModeratorToolsPanel from '../../components/heddit/ModeratorToolsPanel';
import ModeratorManagementModal from '../../components/heddit/ModeratorManagementModal';
import CommunitySettingsModal from '../../components/heddit/CommunitySettingsModal';
import DeleteCommunityModal from '../../components/heddit/DeleteCommunityModal';
import PostModeratorActions from '../../components/heddit/PostModeratorActions';
import ModeratorBadge from '../../components/heddit/ModeratorBadge';
import ConfirmationDialog from '../../components/shared/ConfirmationDialog';
import ShareModal from '../../components/heddit/ShareModal';
import HedditContentRenderer from '../../components/heddit/HedditContentRenderer';
import SharedPostCard from '../../components/heddit/SharedPostCard';
import HedditMediaGallery from '../../components/heddit/HedditMediaGallery';

interface Community {
  id: string;
  name: string;
  display_name: string;
  description: string;
  creator_id: string;
  member_count: number;
  created_at: string;
  topics: string[];
}

interface Post {
  id: string;
  title: string;
  content: string;
  type: string;
  url: string;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  author_id: string;
  is_pinned?: boolean;
  pinned_at?: string;
  heddit_subreddits: { name: string; display_name: string };
  heddit_accounts: { username: string; display_name: string };
}

interface PostVote {
  [postId: string]: 'up' | 'down' | null;
}

export default function HedditSubreddit() {
  const { subredditName } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const communityIdRef = useRef<string | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [reportingPost, setReportingPost] = useState<string | null>(null);
  const [sharingPost, setSharingPost] = useState<any | null>(null);
  const [postTags, setPostTags] = useState<{ [key: string]: string[] }>({});
  const [communityTags, setCommunityTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
  const [isModerator, setIsModerator] = useState(false);
  const [moderatorPermissions, setModeratorPermissions] = useState<any>(null);
  const [moderatorRole, setModeratorRole] = useState<'creator' | 'moderator' | null>(null);
  const [showModManagement, setShowModManagement] = useState(false);
  const [showCommunitySettings, setShowCommunitySettings] = useState(false);
  const [postModerators, setPostModerators] = useState<{ [key: string]: { role: 'creator' | 'moderator' } }>({});
  const [userAccountId, setUserAccountId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteCommunityModal, setShowDeleteCommunityModal] = useState(false);
  const [postCount, setPostCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [moderatorCount, setModeratorCount] = useState(0);
  const [postVotes, setPostVotes] = useState<PostVote>({});
  const [voteScores, setVoteScores] = useState<{ [postId: string]: number }>({});

  useEffect(() => {
    if (subredditName) {
      loadCommunity();
    }
  }, [subredditName]);

  useEffect(() => {
    if (authLoading) return;
    if (!communityIdRef.current) return;
    loadUserAuthData(communityIdRef.current);
  }, [user, authLoading]);

  useEffect(() => {
    if (user && posts.length > 0) {
      loadUserVotes();
    }
  }, [user, posts]);

  const loadUserAuthData = async (subredditId: string) => {
    if (!user) {
      setIsMember(false);
      setIsModerator(false);
      setModeratorPermissions(null);
      setModeratorRole(null);
      setUserAccountId(null);
      return;
    }

    const { data: account } = await supabase
      .from('heddit_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) return;

    setUserAccountId(account.id);

    const { data: membershipData } = await supabase
      .from('heddit_subreddit_members')
      .select('id')
      .eq('subreddit_id', subredditId)
      .eq('account_id', account.id)
      .maybeSingle();

    setIsMember(!!membershipData);

    const { data: isMod, error: modError } = await supabase.rpc('is_community_moderator', {
      p_subreddit_id: subredditId,
      p_user_id: user.id
    });

    if (modError) {
      console.error('Error checking moderator status:', modError);
    }

    setIsModerator(!!isMod);

    if (isMod) {
      const { data: perms, error: permsError } = await supabase.rpc('get_moderator_permissions', {
        p_subreddit_id: subredditId,
        p_user_id: user.id
      });

      if (permsError) {
        console.error('Error fetching moderator permissions:', permsError);
      }

      setModeratorPermissions(perms);

      const { data: modData } = await supabase
        .from('heddit_subreddit_moderators')
        .select('role')
        .eq('subreddit_id', subredditId)
        .eq('account_id', account.id)
        .maybeSingle();

      if (modData) {
        setModeratorRole(modData.role);
      }
    } else {
      setModeratorPermissions(null);
      setModeratorRole(null);
    }
  };

  const loadCommunity = async () => {
    setLoading(true);

    const { data: communityData } = await supabase
      .from('heddit_subreddits')
      .select('*')
      .eq('name', subredditName)
      .maybeSingle();

    if (!communityData) {
      setLoading(false);
      return;
    }

    setCommunity(communityData);
    setMemberCount(communityData.member_count || 0);
    communityIdRef.current = communityData.id;

    const { count } = await supabase
      .from('heddit_post_subreddits')
      .select('*', { count: 'exact', head: true })
      .eq('subreddit_id', communityData.id);

    setPostCount(count || 0);

    const { count: modCount } = await supabase
      .from('heddit_subreddit_moderators')
      .select('*', { count: 'exact', head: true })
      .eq('subreddit_id', communityData.id);

    setModeratorCount(modCount || 0);

    if (!authLoading) {
      await loadUserAuthData(communityData.id);
    }

    const { data: crossPostData } = await supabase
      .from('heddit_post_subreddits')
      .select('post_id')
      .eq('subreddit_id', communityData.id);

    const crossPostIds = (crossPostData || []).map((r: any) => r.post_id);

    const allPostIds = crossPostIds.length > 0 ? crossPostIds : ['00000000-0000-0000-0000-000000000000'];

    const { data: communityPinsData } = await supabase
      .from('heddit_community_pins')
      .select('post_id, pinned_at')
      .eq('subreddit_id', communityData.id)
      .order('pinned_at', { ascending: false });

    const pinnedPostIds = (communityPinsData || []).map((r: any) => r.post_id);
    const pinnedPostIdSet = new Set(pinnedPostIds);
    const unpinnedPostIds = allPostIds.filter((id: string) => !pinnedPostIdSet.has(id));

    const pinnedQueryIds = pinnedPostIds.length > 0 ? pinnedPostIds : ['00000000-0000-0000-0000-000000000000'];
    const unpinnedQueryIds = unpinnedPostIds.length > 0 ? unpinnedPostIds : ['00000000-0000-0000-0000-000000000000'];

    const [pinnedRes, postsRes] = await Promise.all([
      supabase
        .from('heddit_posts')
        .select(`
          *,
          heddit_subreddits(name, display_name),
          heddit_accounts(username, display_name, karma, kindness, quality_score)
        `)
        .in('id', pinnedQueryIds)
        .eq('is_draft', false),
      supabase
        .from('heddit_posts')
        .select(`
          *,
          heddit_subreddits(name, display_name),
          heddit_accounts(username, display_name, karma, kindness, quality_score)
        `)
        .in('id', unpinnedQueryIds)
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(20)
    ]);

    if (pinnedRes.data) {
      const pinTimeMap: { [key: string]: string } = {};
      (communityPinsData || []).forEach((r: any) => { pinTimeMap[r.post_id] = r.pinned_at; });
      const sortedPinned = [...pinnedRes.data].sort((a, b) => {
        const ta = pinTimeMap[a.id] || '';
        const tb = pinTimeMap[b.id] || '';
        return tb.localeCompare(ta);
      });
      setPinnedPosts(sortedPinned);
      loadTagsForPosts(sortedPinned.map(p => p.id));
      loadPostModerators(sortedPinned);
      const scores: { [key: string]: number } = {};
      sortedPinned.forEach(p => {
        scores[p.id] = (p.like_count || 0) - (p.dislike_count || 0);
      });
      setVoteScores(prev => ({ ...prev, ...scores }));
    }
    if (postsRes.data) {
      setPosts(postsRes.data);
      loadTagsForPosts(postsRes.data.map(p => p.id));
      loadPostModerators([...pinnedRes.data || [], ...postsRes.data]);
      const scores: { [key: string]: number } = {};
      postsRes.data.forEach(p => {
        scores[p.id] = (p.like_count || 0) - (p.dislike_count || 0);
      });
      setVoteScores(prev => ({ ...prev, ...scores }));
    }

    const { data: tagsData } = await supabase
      .from('heddit_subreddit_custom_tags')
      .select('heddit_custom_tags(display_name)')
      .eq('subreddit_id', communityData.id);

    if (tagsData) {
      setCommunityTags(tagsData.map((t: any) => t.heddit_custom_tags.display_name));
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
        tagsByPost[item.post_id].push(item.heddit_custom_tags.display_name);
      });
      setPostTags(prev => ({ ...prev, ...tagsByPost }));
    }
  };

  const loadPostModerators = async (posts: Post[]) => {
    if (!community) return;

    const authorIds = [...new Set(posts.map(p => p.heddit_accounts))];
    const { data } = await supabase
      .from('heddit_subreddit_moderators')
      .select('account_id, role')
      .eq('subreddit_id', community.id);

    if (data) {
      const modMap: { [key: string]: { role: 'creator' | 'moderator' } } = {};
      data.forEach((mod: any) => {
        modMap[mod.account_id] = { role: mod.role };
      });
      setPostModerators(modMap);
    }
  };

  const loadUserVotes = async () => {
    if (!user) return;

    const allPostIds = [...pinnedPosts, ...posts].map(p => p.id);
    if (allPostIds.length === 0) return;

    const { data } = await supabase
      .from('heddit_votes')
      .select('post_id, vote_type')
      .eq('user_id', user.id)
      .in('post_id', allPostIds);

    if (data) {
      const votes: PostVote = {};
      data.forEach(vote => {
        votes[vote.post_id] = vote.vote_type;
      });
      setPostVotes(votes);
    }
  };

  const handleVote = async (postId: string, voteType: 'up' | 'down', currentPost: Post) => {
    if (!user) return;

    const currentVote = postVotes[postId];
    const previousScore = voteScores[postId] || 0;

    try {
      if (currentVote === voteType) {
        // Removing vote - optimistic UI update
        setPostVotes(prev => ({ ...prev, [postId]: null }));
        setVoteScores(prev => ({ ...prev, [postId]: prev[postId] + (voteType === 'up' ? -1 : 1) }));

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
        setVoteScores(prev => {
          const current = prev[postId] || 0;
          if (currentVote) {
            return { ...prev, [postId]: current + (voteType === 'up' ? 2 : -2) };
          } else {
            return { ...prev, [postId]: current + (voteType === 'up' ? 1 : -1) };
          }
        });
        setPostVotes(prev => ({ ...prev, [postId]: voteType }));

        if (currentVote) {
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
    } catch (error) {
      console.error('Error voting:', error);
      // Rollback optimistic updates on error
      setPostVotes(prev => ({ ...prev, [postId]: currentVote }));
      setVoteScores(prev => ({ ...prev, [postId]: previousScore }));
    }
  };

  const handleJoinLeave = async () => {
    if (!user || !community) return;

    const { data: account } = await supabase
      .from('heddit_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) return;

    if (isMember) {
      await supabase
        .from('heddit_subreddit_members')
        .delete()
        .eq('subreddit_id', community.id)
        .eq('account_id', account.id);

      setIsMember(false);
    } else {
      await supabase
        .from('heddit_subreddit_members')
        .insert({ subreddit_id: community.id, account_id: account.id });

      setIsMember(true);
    }

    const { data: updated } = await supabase
      .from('heddit_subreddits')
      .select('member_count')
      .eq('id', community.id)
      .maybeSingle();

    if (updated) {
      setCommunity({ ...community, member_count: updated.member_count });
      setMemberCount(updated.member_count);
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

  const handleDeleteCommunity = () => {
    setShowDeleteCommunityModal(true);
  };

  const handleDeleteCommunitySuccess = () => {
    navigate('/heddit');
  };

  if (loading) {
    return (
      <PlatformGuard platform="heddit">
        <HedditLayout showBackButton>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-gray-600">Loading community...</div>
          </div>
        </HedditLayout>
      </PlatformGuard>
    );
  }

  if (!community) {
    return (
      <PlatformGuard platform="heddit">
        <HedditLayout showBackButton>
          <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto bg-white rounded-lg p-12 text-center">
              <h1 className="text-2xl font-bold mb-2">Community Not Found</h1>
              <p className="text-gray-600 mb-6">The community h/{subredditName} does not exist.</p>
              <Link
                to="/heddit/feed"
                className="inline-block bg-orange-600 text-white px-6 py-2 rounded-full hover:bg-orange-700"
              >
                Back to Feed
              </Link>
            </div>
          </div>
        </HedditLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton>
        <div className="min-h-screen bg-gray-100">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 h-32"></div>

          <div className="max-w-6xl mx-auto px-4 -mt-16 overflow-hidden">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">h/{community.name}</h1>
                  {community.display_name && (
                    <p className="text-lg sm:text-xl text-gray-700 mb-2 break-words">{community.display_name}</p>
                  )}
                  <p className="text-gray-600 mb-4 break-words">{community.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users size={16} />
                      <span className="font-semibold">{community.member_count.toLocaleString()}</span>
                      <span>members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      <span>Created {new Date(community.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {community.topics && community.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {community.topics.map((topic) => (
                        <span key={topic} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}

                  {communityTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {communityTags.map((tag) => (
                        <TagChip key={tag} tag={tag} size="sm" />
                      ))}
                    </div>
                  )}

                  {user && (
                    <div className="flex flex-wrap gap-3 mt-4 sm:hidden">
                      <button
                        onClick={handleJoinLeave}
                        className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                          isMember
                            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                        }`}
                      >
                        {isMember ? 'Joined' : 'Join'}
                      </button>
                      {isMember && (
                        <button
                          onClick={() => navigate('/heddit/create-post', { state: { subredditName: community.name } })}
                          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700"
                        >
                          <Plus size={18} />
                          Create Post
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="hidden sm:flex flex-col gap-3 ml-4">
                  {user && (
                    <button
                      onClick={handleJoinLeave}
                      className={`px-6 py-2 rounded-full font-semibold transition-colors ${
                        isMember
                          ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                      }`}
                    >
                      {isMember ? 'Joined' : 'Join'}
                    </button>
                  )}
                  {user && isMember && (
                    <button
                      onClick={() => navigate('/heddit/create-post', { state: { subredditName: community.name } })}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700"
                    >
                      <Plus size={18} />
                      Create Post
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg mb-4">
                  <div className="flex border-b">
                    <button
                      onClick={() => setActiveTab('posts')}
                      className={`flex-1 py-3 px-4 font-semibold ${
                        activeTab === 'posts'
                          ? 'text-orange-600 border-b-2 border-orange-600'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Posts
                    </button>
                    <button
                      onClick={() => setActiveTab('about')}
                      className={`flex-1 py-3 px-4 font-semibold ${
                        activeTab === 'about'
                          ? 'text-orange-600 border-b-2 border-orange-600'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      About
                    </button>
                  </div>
                </div>

                {activeTab === 'posts' && (
                  <div className="space-y-4 min-w-0 overflow-hidden">
                    {pinnedPosts.length === 0 && posts.length === 0 ? (
                      <div className="bg-white rounded-lg p-12 text-center">
                        <p className="text-gray-600 mb-4">No posts yet in this community.</p>
                        {user && isMember && (
                          <button
                            onClick={() => navigate('/heddit/create-post', { state: { subredditName: community.name } })}
                            className="inline-flex items-center gap-2 bg-orange-600 text-white px-6 py-2 rounded-full hover:bg-orange-700"
                          >
                            <Plus size={18} />
                            Create the First Post
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {pinnedPosts.map((post) => (
                          post.type === 'share' ? (
                            <div key={post.id} className="border-l-4 border-l-orange-500 rounded-lg overflow-hidden">
                              <div className="flex items-center gap-2 bg-white px-4 pt-3 pb-2 border-t border-r border-b border-gray-200">
                                <Pin size={16} className="fill-orange-600 text-orange-600" />
                                <span className="text-sm font-semibold text-orange-600">Pinned</span>
                              </div>
                              <SharedPostCard
                                sharePost={post}
                                currentAccountId={userAccountId || undefined}
                                onDelete={() => {
                                  setPinnedPosts(pinnedPosts.filter(p => p.id !== post.id));
                                }}
                                isModerator={isModerator}
                                moderatorPermissions={moderatorPermissions || undefined}
                                subredditId={community.id}
                                onUpdate={loadCommunity}
                              />
                            </div>
                          ) : (
                          <div key={post.id} className="bg-white rounded-lg border-l-4 border-l-orange-500 border-t border-r border-b border-gray-300 overflow-hidden hover:border-gray-400 transition-colors w-full">
                            <div className="flex min-w-0">
                              <div className="w-12 flex-shrink-0 bg-gray-50 flex flex-col items-center py-2 gap-1">
                                <button
                                  onClick={() => handleVote(post.id, 'up', post)}
                                  className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                    postVotes[post.id] === 'up' ? 'text-orange-600' : 'text-gray-400'
                                  }`}
                                >
                                  <ArrowBigUp className="w-6 h-6" fill={postVotes[post.id] === 'up' ? 'currentColor' : 'none'} />
                                </button>
                                <span className={`text-sm font-bold ${
                                  (voteScores[post.id] || 0) > 0 ? 'text-orange-600' : (voteScores[post.id] || 0) < 0 ? 'text-blue-600' : 'text-gray-600'
                                }`}>
                                  {voteScores[post.id] || 0}
                                </span>
                                <button
                                  onClick={() => handleVote(post.id, 'down', post)}
                                  className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                    postVotes[post.id] === 'down' ? 'text-blue-600' : 'text-gray-400'
                                  }`}
                                >
                                  <ArrowBigDown className="w-6 h-6" fill={postVotes[post.id] === 'down' ? 'currentColor' : 'none'} />
                                </button>
                              </div>
                            <div className="flex-1 min-w-0 p-4 overflow-hidden">
                              <div className="flex items-center justify-between mb-2 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 min-w-0">
                                  <div className="flex items-center gap-1 text-orange-600 font-semibold">
                                    <Pin size={16} className="fill-orange-600" />
                                    <span>Pinned</span>
                                  </div>
                                  <span>•</span>
                                  <span>Posted by</span>
                                  <Link
                                    to={`/heddit/user/${post.heddit_accounts.username}`}
                                    className="hover:underline"
                                  >
                                    u/{post.heddit_accounts.username}
                                  </Link>
                                  {postModerators[post.author_id] && (
                                    <ModeratorBadge role={postModerators[post.author_id].role} size="sm" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
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
                                  {isModerator && moderatorPermissions && (
                                    <PostModeratorActions
                                      postId={post.id}
                                      subredditId={community.id}
                                      isPinned={true}
                                      permissions={moderatorPermissions}
                                      onUpdate={loadCommunity}
                                    />
                                  )}
                                </div>
                              </div>

                              <Link to={`/heddit/post/${post.id}`}>
                                <h2 className="text-lg sm:text-xl font-semibold mb-2 hover:text-blue-600 cursor-pointer break-words">{post.title}</h2>
                              </Link>

                              {post.content && (
                                <HedditContentRenderer
                                  content={post.content}
                                  className="text-gray-800 mb-4 whitespace-pre-wrap break-words overflow-hidden"
                                  hasRichFormatting={post.has_rich_formatting}
                                />
                              )}

                              {post.type === 'link' && post.url && (
                                <a
                                  href={post.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm break-all"
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
                                <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-sm">
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
                              }}
                              isModerator={isModerator}
                              moderatorPermissions={moderatorPermissions || undefined}
                              subredditId={community.id}
                              onUpdate={loadCommunity}
                            />
                          ) : (
                            <div key={post.id} className="bg-white rounded-lg border border-gray-300 overflow-hidden hover:border-gray-400 transition-colors w-full">
                              <div className="flex min-w-0">
                                <div className="w-12 flex-shrink-0 bg-gray-50 flex flex-col items-center py-2 gap-1">
                                  <button
                                    onClick={() => handleVote(post.id, 'up', post)}
                                    className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                      postVotes[post.id] === 'up' ? 'text-orange-600' : 'text-gray-400'
                                    }`}
                                  >
                                    <ArrowBigUp className="w-6 h-6" fill={postVotes[post.id] === 'up' ? 'currentColor' : 'none'} />
                                  </button>
                                  <span className={`text-sm font-bold ${
                                    (voteScores[post.id] || 0) > 0 ? 'text-orange-600' : (voteScores[post.id] || 0) < 0 ? 'text-blue-600' : 'text-gray-600'
                                  }`}>
                                    {voteScores[post.id] || 0}
                                  </span>
                                  <button
                                    onClick={() => handleVote(post.id, 'down', post)}
                                    className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                      postVotes[post.id] === 'down' ? 'text-blue-600' : 'text-gray-400'
                                    }`}
                                  >
                                    <ArrowBigDown className="w-6 h-6" fill={postVotes[post.id] === 'down' ? 'currentColor' : 'none'} />
                                  </button>
                                </div>
                              <div className="flex-1 min-w-0 p-4 overflow-hidden">
                                <div className="flex items-center justify-between mb-2 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 min-w-0">
                                    <span>Posted by</span>
                                    <Link
                                      to={`/heddit/user/${post.heddit_accounts.username}`}
                                      className="hover:underline"
                                    >
                                      u/{post.heddit_accounts.username}
                                    </Link>
                                    {postModerators[post.author_id] && (
                                      <ModeratorBadge role={postModerators[post.author_id].role} size="sm" />
                                    )}
                                    <span>•</span>
                                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
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
                                    {isModerator && moderatorPermissions && (
                                      <PostModeratorActions
                                        postId={post.id}
                                        subredditId={community.id}
                                        isPinned={false}
                                        permissions={moderatorPermissions}
                                        onUpdate={loadCommunity}
                                      />
                                    )}
                                  </div>
                                </div>

                              <Link to={`/heddit/post/${post.id}`}>
                                <h2 className="text-lg sm:text-xl font-semibold mb-2 hover:text-blue-600 cursor-pointer break-words">{post.title}</h2>
                              </Link>

                              {post.content && (
                                <HedditContentRenderer
                                  content={post.content}
                                  className="text-gray-800 mb-4 whitespace-pre-wrap break-words overflow-hidden"
                                  hasRichFormatting={post.has_rich_formatting}
                                />
                              )}

                              {post.type === 'link' && post.url && (
                                <a
                                  href={post.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm break-all"
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
                                <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-sm">
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
                )}

                {activeTab === 'about' && (
                  <div className="bg-white rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">About h/{community.name}</h2>
                    <p className="text-gray-700 mb-6">{community.description}</p>

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Community Stats</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>{community.member_count.toLocaleString()} members</p>
                          <p>Created {new Date(community.created_at).toLocaleDateString()}</p>
                          <p>{pinnedPosts.length + posts.length} posts</p>
                        </div>
                      </div>

                      {community.topics && community.topics.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Topics</h3>
                          <div className="flex flex-wrap gap-2">
                            {community.topics.map((topic) => (
                              <span key={topic} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {communityTags.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Tags</h3>
                          <div className="flex flex-wrap gap-2">
                            {communityTags.map((tag) => (
                              <TagChip key={tag} tag={tag} size="sm" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {isModerator && moderatorPermissions && (
                  <ModeratorToolsPanel
                    communityId={community.id}
                    communityName={community.name}
                    permissions={moderatorPermissions}
                    onEditCommunity={() => setShowCommunitySettings(true)}
                    onManageModerators={() => setShowModManagement(true)}
                    onDeleteCommunity={handleDeleteCommunity}
                  />
                )}

                <div className="bg-white rounded-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-3">About Community</h3>
                  <p className="text-sm text-gray-600 mb-4">{community.description}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Users size={16} />
                    <span className="font-semibold">{community.member_count.toLocaleString()}</span>
                    <span>Members</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} />
                    <span>Created {new Date(community.created_at).toLocaleDateString()}</span>
                  </div>
                  {user && (
                    <button
                      onClick={handleJoinLeave}
                      className={`w-full mt-4 px-4 py-2 rounded-full font-semibold transition-colors ${
                        isMember
                          ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                      }`}
                    >
                      {isMember ? 'Leave Community' : 'Join Community'}
                    </button>
                  )}
                </div>

                {!user && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-bold text-orange-900 mb-2">Join Heddit</h3>
                    <p className="text-sm text-orange-800 mb-3">
                      Create an account to join this community and start posting.
                    </p>
                    <Link
                      to="/heddit/join"
                      className="block w-full text-center bg-orange-600 text-white px-4 py-2 rounded-full hover:bg-orange-700"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
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
            onSuccess={() => loadCommunity()}
          />
        )}

        {showModManagement && (
          <ModeratorManagementModal
            communityId={community.id}
            communityName={community.name}
            onClose={() => setShowModManagement(false)}
          />
        )}

        {showCommunitySettings && (
          <CommunitySettingsModal
            communityId={community.id}
            communityName={community.name}
            currentDisplayName={community.display_name}
            currentDescription={community.description}
            currentTopics={community.topics}
            canDelete={moderatorPermissions?.delete_community || false}
            postCount={postCount}
            memberCount={memberCount}
            onClose={() => setShowCommunitySettings(false)}
            onUpdate={loadCommunity}
            onDelete={handleDeleteCommunity}
          />
        )}

        {showDeleteCommunityModal && (
          <DeleteCommunityModal
            communityId={community.id}
            communityName={community.name}
            postCount={postCount}
            memberCount={memberCount}
            moderatorCount={moderatorCount}
            onClose={() => setShowDeleteCommunityModal(false)}
            onSuccess={handleDeleteCommunitySuccess}
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
      </HedditLayout>
    </PlatformGuard>
  );
}
