import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Link as LinkIcon, Calendar, Settings, MessageCircle, Award, TrendingUp, Users, Trash2, Trophy, Star, Heart, Sparkles, Info, ArrowBigUp, ArrowBigDown, Share2, Flag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PlatformGuard from '../../components/shared/PlatformGuard';
import HedditLayout from '../../components/shared/HedditLayout';
import { FollowButton } from '../../components/heddit/FollowButton';
import { FollowersModal } from '../../components/heddit/FollowersModal';
import { TagChip } from '../../components/heddit/TagChip';
import CrossPostBadge from '../../components/heddit/CrossPostBadge';
import CoverRenderer from '../../components/shared/CoverRenderer';
import ConfirmationDialog from '../../components/shared/ConfirmationDialog';
import ReportContentModal from '../../components/shared/ReportContentModal';
import ShareModal from '../../components/heddit/ShareModal';
import HedditContentRenderer from '../../components/heddit/HedditContentRenderer';
import SharedPostCard from '../../components/heddit/SharedPostCard';
import GiveKindnessModal from '../../components/heddit/GiveKindnessModal';
import BadgeShowcaseModal from '../../components/heddit/BadgeShowcaseModal';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  cover_photo_url: string | null;
  location: string | null;
  website: string | null;
  karma: number;
  kindness: number;
  quality_score: number;
  follower_count: number;
  following_count: number;
  post_count: number;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  type: string;
  url: string | null;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  heddit_subreddits: { name: string; display_name: string };
  tags?: string[];
  quality_score?: number;
}

interface PostVote {
  [postId: string]: 'up' | 'down' | null;
}

interface Community {
  id: string;
  name: string;
  display_name: string;
  description: string;
  member_count: number;
}

interface Interest {
  id: string;
  tag_name: string;
  display_name: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  dislike_count: number;
  post_id: string;
  post_title: string;
  subreddit_name: string;
  subreddit_display_name: string;
  parent_id: string | null;
}

type TabType = 'posts' | 'comments' | 'communities' | 'about';

export default function HedditProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following' | null>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [reportingPost, setReportingPost] = useState<string | null>(null);
  const [sharingPost, setSharingPost] = useState<any | null>(null);
  const [showGiveKindnessModal, setShowGiveKindnessModal] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [hasGivenKindness, setHasGivenKindness] = useState(false);
  const [postVotes, setPostVotes] = useState<PostVote>({});
  const [postLikeCounts, setPostLikeCounts] = useState<{ [postId: string]: number }>({});
  const [postDislikeCounts, setPostDislikeCounts] = useState<{ [postId: string]: number }>({});

  useEffect(() => {
    loadCurrentAccount();
    loadProfile();
  }, [username]);


  useEffect(() => {
    if (profile) {
      loadTabData();
      if (currentAccountId && currentAccountId !== profile.id) {
        checkKindnessGift();
      }
    }
  }, [activeTab, profile, currentAccountId]);

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

  const loadProfile = async () => {
    const { data, error } = await supabase
      .from('heddit_accounts')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error || !data) {
      setLoading(false);
      return;
    }

    setProfile(data);
    loadInterests(data.id);
    checkFollowStatus(data.id);
    setLoading(false);
  };

  const loadInterests = async (accountId: string) => {
    const { data } = await supabase
      .from('heddit_user_interests')
      .select(`
        heddit_custom_tags(id, tag_name, display_name)
      `)
      .eq('user_id', accountId)
      .limit(20);

    if (data) {
      const interestsList = data
        .map((item: any) => item.heddit_custom_tags)
        .filter(Boolean);
      setInterests(interestsList);
    }
  };

  const checkFollowStatus = async (targetAccountId: string) => {
    if (!currentAccountId) return;

    const { data } = await supabase
      .from('heddit_follows')
      .select('id')
      .eq('follower_id', currentAccountId)
      .eq('following_id', targetAccountId)
      .maybeSingle();

    setIsFollowingUser(!!data);
  };

  const checkKindnessGift = async () => {
    if (!currentAccountId || !profile) return;

    const { data } = await supabase
      .from('heddit_kindness_gifts')
      .select('id')
      .eq('giver_id', currentAccountId)
      .eq('receiver_id', profile.id)
      .maybeSingle();

    setHasGivenKindness(!!data);
  };

  const loadTabData = async () => {
    if (!profile) return;

    if (activeTab === 'posts') {
      const { data } = await supabase
        .from('heddit_posts')
        .select(`
          *,
          heddit_subreddits(name, display_name),
          heddit_quality_signals(calculated_quality_score),
          heddit_accounts(username, display_name, avatar_url, karma, kindness, quality_score)
        `)
        .eq('author_id', profile.id)
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        const postsWithQuality = data.map((post) => {
          const qualityScore = post.heddit_quality_signals?.calculated_quality_score;
          return { ...post, quality_score: qualityScore };
        });

        setPosts(postsWithQuality);
        const likes: { [key: string]: number } = {};
        const dislikes: { [key: string]: number } = {};
        postsWithQuality.forEach(p => {
          likes[p.id] = p.like_count || 0;
          dislikes[p.id] = p.dislike_count || 0;
        });
        setPostLikeCounts(likes);
        setPostDislikeCounts(dislikes);
        loadUserVotes(postsWithQuality.map(p => p.id));
      }
    } else if (activeTab === 'communities') {
      const { data } = await supabase
        .from('heddit_subreddit_members')
        .select(`
          heddit_subreddits(id, name, display_name, description, member_count)
        `)
        .eq('account_id', profile.id);

      if (data) {
        const communitiesList = data
          .map((item: any) => item.heddit_subreddits)
          .filter(Boolean);
        setCommunities(communitiesList);
      }
    } else if (activeTab === 'comments') {
      const { data: commentsData } = await supabase
        .from('platform_comments')
        .select('*')
        .eq('platform', 'heddit')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (commentsData) {
        const commentsWithContext = await Promise.all(
          commentsData.map(async (comment) => {
            const { data: postData } = await supabase
              .from('heddit_posts')
              .select(`
                id,
                title,
                heddit_subreddits(name, display_name)
              `)
              .eq('id', comment.content_id)
              .maybeSingle();

            return {
              id: comment.id,
              content: comment.content,
              created_at: comment.created_at,
              like_count: comment.like_count,
              dislike_count: comment.dislike_count,
              parent_id: comment.parent_id,
              post_id: postData?.id || '',
              post_title: postData?.title || 'Unknown Post',
              subreddit_name: postData?.heddit_subreddits?.name || '',
              subreddit_display_name: postData?.heddit_subreddits?.display_name || ''
            };
          })
        );

        setComments(commentsWithContext);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  const startConversation = async () => {
    if (!currentAccountId || !profile) return;

    const participantOne = currentAccountId < profile.id ? currentAccountId : profile.id;
    const participantTwo = currentAccountId < profile.id ? profile.id : currentAccountId;

    const { data: existingConv } = await supabase
      .from('heddit_conversations')
      .select('id')
      .eq('participant_one_id', participantOne)
      .eq('participant_two_id', participantTwo)
      .maybeSingle();

    if (existingConv) {
      navigate(`/heddit/messages?conversation=${existingConv.id}`);
    } else {
      const { data: newConv } = await supabase
        .from('heddit_conversations')
        .insert({
          participant_one_id: participantOne,
          participant_two_id: participantTwo
        })
        .select()
        .single();

      if (newConv) {
        navigate(`/heddit/messages?conversation=${newConv.id}`);
      }
    }
  };

  const loadUserVotes = async (postIds: string[]) => {
    if (!currentAccountId || postIds.length === 0) return;

    const { data: userResponse } = await supabase
      .from('heddit_accounts')
      .select('user_id')
      .eq('id', currentAccountId)
      .maybeSingle();

    if (!userResponse?.user_id) return;

    const { data } = await supabase
      .from('heddit_votes')
      .select('post_id, vote_type')
      .eq('user_id', userResponse.user_id)
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
    if (!currentAccountId) return;

    const { data: userResponse } = await supabase
      .from('heddit_accounts')
      .select('user_id')
      .eq('id', currentAccountId)
      .maybeSingle();

    if (!userResponse?.user_id) return;

    const userId = userResponse.user_id;
    const currentVote = postVotes[postId];
    const previousLikes = postLikeCounts[postId] || 0;
    const previousDislikes = postDislikeCounts[postId] || 0;

    try {
      if (currentVote === voteType) {
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
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        const { error: updateError } = await supabase.rpc(
          voteType === 'up' ? 'decrement_heddit_like_count' : 'decrement_heddit_dislike_count',
          { post_id: postId }
        );

        if (updateError) throw updateError;
      } else {
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
            .eq('user_id', userId);

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
              user_id: userId,
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

  const handleDeleteComment = async () => {
    if (!deleteCommentId || !profile) return;

    const { error } = await supabase
      .from('platform_comments')
      .delete()
      .eq('id', deleteCommentId)
      .eq('user_id', profile.user_id);

    if (!error) {
      setComments(comments.filter(c => c.id !== deleteCommentId));
    }

    setDeleteCommentId(null);
  };

  if (loading) {
    return (
      <PlatformGuard platform="heddit">
        <HedditLayout showBackButton>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-gray-500">Loading profile...</div>
          </div>
        </HedditLayout>
      </PlatformGuard>
    );
  }

  if (!profile) {
    return (
      <PlatformGuard platform="heddit">
        <HedditLayout showBackButton>
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">User not found</h2>
              <p className="text-gray-600">u/{username} doesn't exist</p>
            </div>
          </div>
        </HedditLayout>
      </PlatformGuard>
    );
  }

  const isOwnProfile = currentAccountId === profile.id;

  return (
    <PlatformGuard platform="heddit">
      <HedditLayout showBackButton>
        <div className="min-h-screen bg-gray-100">
          <div className="bg-white border-b border-gray-200">
            <div className="relative">
              <div className="h-36 sm:h-48 w-full overflow-hidden">
                {(profile as any).cover_design_data ? (
                  <CoverRenderer
                    designData={(profile as any).cover_design_data}
                    aspectRatio={33.33}
                  />
                ) : profile.cover_photo_url ? (
                  <img
                    src={profile.cover_photo_url}
                    alt="Cover"
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-orange-400 to-red-400" />
                )}
              </div>

              <div className="max-w-5xl mx-auto px-3 sm:px-4">
                <div className="relative -mt-12 sm:-mt-16 pb-4">
                  <div className="flex items-end gap-3">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white bg-gray-200 flex-shrink-0 shadow-md">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-gray-400">
                          {profile.display_name[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pt-12 sm:pt-16">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                            {profile.display_name}
                          </h1>
                          <p className="text-sm text-gray-600 truncate">u/{profile.username}</p>
                        </div>

                        <div className="flex-shrink-0 flex gap-1.5">
                          {isOwnProfile ? (
                            <Link
                              to="/heddit/settings"
                              className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </Link>
                          ) : (
                            <>
                              {currentAccountId && (
                                <>
                                  <button
                                    onClick={startConversation}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    title="Message"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </button>
                                  <FollowButton
                                    currentAccountId={currentAccountId}
                                    targetAccountId={profile.id}
                                    onFollowChange={setIsFollowingUser}
                                  />
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    {profile.bio && (
                      <p className="text-gray-700 text-sm sm:text-base">{profile.bio}</p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                      {profile.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{profile.location}</span>
                        </div>
                      )}
                      {profile.website && (
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-orange-600 hover:underline min-w-0"
                        >
                          <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate max-w-[160px]">{profile.website.replace(/^https?:\/\//, '')}</span>
                        </a>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        Joined {formatDate(profile.created_at)}
                      </div>
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className="flex items-center gap-4 text-sm">
                        <button
                          onClick={() => setFollowersModalType('followers')}
                          className="hover:underline"
                        >
                          <span className="font-bold text-gray-900">
                            {profile.follower_count}
                          </span>{' '}
                          <span className="text-gray-600">followers</span>
                        </button>
                        <button
                          onClick={() => setFollowersModalType('following')}
                          className="hover:underline"
                        >
                          <span className="font-bold text-gray-900">
                            {profile.following_count}
                          </span>{' '}
                          <span className="text-gray-600">following</span>
                        </button>
                        <div>
                          <span className="font-bold text-gray-900">
                            {profile.post_count}
                          </span>{' '}
                          <span className="text-gray-600">posts</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-700">Quality Metrics</h3>
                          <Link
                            to="/heddit/karma-guide"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            <Info className="w-3 h-3" />
                            How it works
                          </Link>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-0.5 border-2 border-yellow-200">
                            <div className="bg-white/80 rounded-md p-2">
                              <div className="flex items-center gap-1 mb-1">
                                <Star className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
                                <span className="text-xs font-semibold text-gray-900 uppercase">Karma</span>
                              </div>
                              <div className="text-xl font-bold text-gray-900 leading-tight">
                                {profile.karma.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 leading-tight">Through actions</div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-0.5 border-2 border-pink-200">
                            <div className="bg-white/80 rounded-md p-2">
                              <div className="flex items-center gap-1 mb-1">
                                <Heart className="w-3.5 h-3.5 text-pink-600 flex-shrink-0" />
                                <span className="text-xs font-semibold text-gray-900 uppercase">Kindness</span>
                              </div>
                              <div className="text-xl font-bold text-gray-900 leading-tight">
                                {profile.kindness.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 leading-tight">From community</div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-0.5 border-2 border-blue-200">
                            <div className="bg-white/80 rounded-md p-2">
                              <div className="flex items-center gap-1 mb-1">
                                <Trophy className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                <span className="text-xs font-semibold text-gray-900 uppercase">Quality</span>
                              </div>
                              <div className="text-xl font-bold text-gray-900 leading-tight">
                                {profile.quality_score.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 leading-tight">Exp. score</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {!isOwnProfile && currentAccountId && (
                        <button
                          onClick={() => setShowGiveKindnessModal(true)}
                          disabled={hasGivenKindness}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all text-sm ${
                            hasGivenKindness
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 shadow-md'
                          }`}
                        >
                          {hasGivenKindness ? (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>Kindness Given</span>
                            </>
                          ) : (
                            <>
                              <Heart className="w-4 h-4" />
                              <span>Give Kindness</span>
                            </>
                          )}
                        </button>
                      )}

                      {isOwnProfile && (
                        <button
                          onClick={() => setShowBadgesModal(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md text-sm"
                        >
                          <Trophy className="w-4 h-4" />
                          <span>View Badges</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex border-t border-gray-200 mt-2">
                {(['posts', 'comments', 'communities', 'about'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-1 py-3 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'text-orange-600 border-b-2 border-orange-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4">
            {activeTab === 'posts' && (
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <div className="bg-white rounded-lg p-8 text-center">
                    <p className="text-gray-500">No posts yet</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    post.type === 'share' ? (
                      <SharedPostCard
                        key={post.id}
                        sharePost={post}
                        currentAccountId={profile?.id}
                        onDelete={() => {
                          setPosts(posts.filter(p => p.id !== post.id));
                        }}
                      />
                    ) : (
                      <div key={post.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="flex">
                          <div className="w-10 bg-gray-50 flex flex-col items-center py-3 gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => handleVote(post.id, 'up', post)}
                              className={`p-0.5 rounded hover:bg-gray-200 transition-colors ${
                                postVotes[post.id] === 'up' ? 'text-orange-600' : 'text-gray-400'
                              }`}
                            >
                              <ArrowBigUp className="w-5 h-5" fill={postVotes[post.id] === 'up' ? 'currentColor' : 'none'} />
                            </button>
                            <span className={`text-xs font-bold ${postVotes[post.id] === 'up' ? 'text-orange-600' : 'text-gray-600'}`}>
                              {postLikeCounts[post.id] || 0}
                            </span>
                            <span className={`text-xs font-bold ${postVotes[post.id] === 'down' ? 'text-blue-600' : 'text-gray-400'}`}>
                              {postDislikeCounts[post.id] || 0}
                            </span>
                            <button
                              onClick={() => handleVote(post.id, 'down', post)}
                              className={`p-0.5 rounded hover:bg-gray-200 transition-colors ${
                                postVotes[post.id] === 'down' ? 'text-blue-600' : 'text-gray-400'
                              }`}
                            >
                              <ArrowBigDown className="w-5 h-5" fill={postVotes[post.id] === 'down' ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0 p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-gray-500 min-w-0">
                                <Link
                                  to={`/heddit/h/${post.heddit_subreddits.name}`}
                                  className="font-semibold hover:underline text-gray-700 truncate"
                                >
                                  h/{post.heddit_subreddits.name}
                                </Link>
                                <span>·</span>
                                <span className="whitespace-nowrap">
                                  {new Date(post.created_at).toLocaleDateString()}
                                </span>
                                {post.quality_score && (
                                  <div className="flex items-center gap-0.5">
                                    <TrendingUp className="w-3 h-3 text-blue-500" />
                                    <span className="text-blue-600 font-medium">
                                      {post.quality_score.toFixed(0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {isOwnProfile && (
                                <button
                                  onClick={() => setDeletePostId(post.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                                  title="Delete post"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <Link
                              to={`/heddit/post/${post.id}`}
                              className="block group"
                            >
                              <h3 className="text-base font-semibold text-gray-900 group-hover:text-orange-600 mb-1.5 leading-snug">
                                {post.title}
                              </h3>
                              {post.content && (
                                <HedditContentRenderer
                                  content={post.content}
                                  className="text-gray-600 text-sm line-clamp-3 mb-2"
                                />
                              )}
                            </Link>

                            <div className="flex items-center gap-1 text-xs text-gray-500 flex-wrap">
                              <Link to={`/heddit/post/${post.id}`} className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors">
                                <MessageCircle className="w-4 h-4" />
                                <span className="font-medium">{post.comment_count || 0}</span>
                                <span className="hidden sm:inline">Comments</span>
                              </Link>
                              <button
                                onClick={() => setSharingPost(post)}
                                className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                              >
                                <Share2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Share</span>
                                {post.share_count > 0 && <span className="font-medium">({post.share_count})</span>}
                              </button>
                              <button
                                onClick={() => setReportingPost(post.id)}
                                className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                              >
                                <Flag className="w-4 h-4" />
                                <span className="hidden sm:inline">Report</span>
                              </button>
                            </div>

                            {post.heddit_accounts && (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                                  <span className="font-medium">{post.heddit_accounts.karma || 0}</span>
                                  <span>Karma</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart className="w-3.5 h-3.5 text-pink-500" />
                                  <span className="font-medium">{post.heddit_accounts.kindness || 0}</span>
                                  <span>Kindness</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Trophy className="w-3.5 h-3.5 text-blue-500" />
                                  <span className="font-medium">{post.heddit_accounts.quality_score || 0}</span>
                                  <span>Quality</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  ))
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="bg-white rounded-lg p-8 text-center">
                    <p className="text-gray-500">No comments yet</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-white rounded-lg border border-gray-200 p-3">
                      <div className="mb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs text-gray-500 mb-0.5">Commented on</div>
                          {isOwnProfile && (
                            <button
                              onClick={() => setDeleteCommentId(comment.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                              title="Delete comment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm">
                          {comment.post_id ? (
                            <Link
                              to={`/heddit/post/${comment.post_id}`}
                              className="font-semibold hover:underline text-gray-900 leading-snug"
                            >
                              {comment.post_title}
                            </Link>
                          ) : (
                            <span className="font-semibold text-gray-400 leading-snug italic">
                              {comment.post_title}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                          {comment.subreddit_name && (
                            <>
                              <span>in</span>
                              <Link
                                to={`/heddit/h/${comment.subreddit_name}`}
                                className="font-semibold hover:underline text-orange-600"
                              >
                                h/{comment.subreddit_name}
                              </Link>
                              <span>·</span>
                            </>
                          )}
                          <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <HedditContentRenderer
                        content={comment.content}
                        className="text-gray-700 text-sm mb-2"
                      />

                      {comment.post_id && (
                        <Link
                          to={`/heddit/post/${comment.post_id}`}
                          className="text-xs text-orange-600 hover:underline"
                        >
                          View context
                        </Link>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-500" />
                          <span className="font-medium">{profile.karma || 0}</span>
                          <span>Karma</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5 text-pink-500" />
                          <span className="font-medium">{profile.kindness || 0}</span>
                          <span>Kindness</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-medium">{profile.quality_score || 0}</span>
                          <span>Quality</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'communities' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {communities.length === 0 ? (
                  <div className="col-span-2 bg-white rounded-lg p-8 text-center">
                    <p className="text-gray-500">Not a member of any communities yet</p>
                  </div>
                ) : (
                  communities.map((community) => (
                    <Link
                      key={community.id}
                      to={`/heddit/h/${community.name}`}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-orange-500 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-orange-500" />
                        <h3 className="font-bold text-gray-900">
                          h/{community.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {community.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {community.member_count.toLocaleString()} members
                      </p>
                    </Link>
                  ))
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Interests</h3>
                {interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {interests.map((interest) => (
                      <TagChip
                        key={interest.id}
                        tag={interest.display_name || interest.tag_name}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 mb-6">No interests added yet</p>
                )}

                <h3 className="font-bold text-gray-900 mb-4">Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {profile.post_count}
                    </div>
                    <div className="text-sm text-gray-600">Posts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {profile.karma}
                    </div>
                    <div className="text-sm text-gray-600">Karma</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {profile.quality_score.toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-600">Quality Score</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {communities.length}
                    </div>
                    <div className="text-sm text-gray-600">Communities</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {followersModalType && (
          <FollowersModal
            accountId={profile.id}
            type={followersModalType}
            onClose={() => setFollowersModalType(null)}
          />
        )}

        <ConfirmationDialog
          isOpen={!!deletePostId}
          title="Delete Post"
          message="Are you sure you want to delete this post? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeletePost}
          onCancel={() => setDeletePostId(null)}
          variant="danger"
        />

        <ConfirmationDialog
          isOpen={!!deleteCommentId}
          title="Delete Comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteComment}
          onCancel={() => setDeleteCommentId(null)}
          variant="danger"
        />

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
            onSuccess={() => loadTabData()}
          />
        )}

        {showGiveKindnessModal && profile && currentAccountId && (
          <GiveKindnessModal
            isOpen={showGiveKindnessModal}
            onClose={() => setShowGiveKindnessModal(false)}
            receiverUsername={profile.username}
            receiverDisplayName={profile.display_name}
            receiverAccountId={profile.id}
            giverAccountId={currentAccountId}
            receiverCurrentKindness={profile.kindness}
            onSuccess={() => {
              setHasGivenKindness(true);
              loadProfile();
            }}
          />
        )}

        {showBadgesModal && profile && (
          <BadgeShowcaseModal
            isOpen={showBadgesModal}
            onClose={() => setShowBadgesModal(false)}
            userAccountId={profile.id}
            currentKarma={profile.karma}
            currentKindness={profile.kindness}
            currentQuality={profile.quality_score}
          />
        )}
      </HedditLayout>
    </PlatformGuard>
  );
}
