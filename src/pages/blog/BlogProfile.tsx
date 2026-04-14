import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Link as LinkIcon, Heart, Eye, Bookmark, MessageCircle, Mail, UserPlus, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import BlogLayout from '../../components/shared/BlogLayout';
import BlogWheel from '../../components/blog/BlogWheel';
import FollowButton from '../../components/blog/FollowButton';
import FollowersModal from '../../components/blog/FollowersModal';
import CoverRenderer from '../../components/shared/CoverRenderer';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function BlogProfile() {
  return (
    <PlatformGuard platform="blog">
      <BlogProfileContent />
    </PlatformGuard>
  );
}

interface BlogAccount {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  cover_photo_url: string;
  cover_design_data: any;
  tagline: string;
  theme_color: string;
  interests: string[];
  follower_count: number;
  following_count: number;
  joined_at: string;
  total_reads: number;
  social_links: any;
}

interface ProfileStats {
  post_count: number;
  total_views: number;
  total_reactions: number;
  total_comments: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  view_count: number;
  total_reaction_count: number;
  bookmark_count: number;
  comment_count: number;
  blog_accounts: {
    username: string;
    display_name: string;
    avatar_url: string;
    bio: string;
  };
}

function BlogProfileContent() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState<BlogAccount | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersModalMode, setFollowersModalMode] = useState<'followers' | 'following'>('followers');

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    if (username) {
      loadProfile();
    } else {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [username]);

  const loadProfile = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (isMountedRef.current) {
      setIsLoading(true);
    }

    try {
      const cleanUsername = username?.replace('@', '');

      if (!cleanUsername) {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        return;
      }

      const { data: accountData, error: accountError } = await supabase
        .from('blog_accounts')
        .select('*')
        .eq('username', cleanUsername)
        .single();

      if (signal.aborted || !isMountedRef.current) return;

      if (accountError) throw accountError;

      if (isMountedRef.current) {
        setAccount(accountData);
      }

      const [postsData, statsData] = await Promise.all([
        supabase
          .from('blog_posts')
          .select(`
            id,
            title,
            content,
            created_at,
            view_count,
            total_reaction_count,
            bookmark_count,
            comment_count,
            blog_accounts:account_id (
              username,
              display_name,
              avatar_url,
              bio
            )
          `)
          .eq('account_id', accountData.id)
          .eq('status', 'published')
          .eq('privacy', 'public')
          .order('created_at', { ascending: false }),
        supabase.rpc('get_blog_profile_stats', { p_account_id: accountData.id })
      ]);

      if (signal.aborted || !isMountedRef.current) return;

      if (postsData.data && isMountedRef.current && !signal.aborted) {
        setPosts(postsData.data as Post[]);
      }

      if (statsData.data && statsData.data.length > 0 && isMountedRef.current && !signal.aborted) {
        setStats(statsData.data[0]);
      }
    } catch (error) {
      if (!signal.aborted && isMountedRef.current) {
        console.error('Error loading profile:', error);
      }
    } finally {
      if (isMountedRef.current && !signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const startConversation = async () => {
    if (!user || !account) return;

    try {
      const { data, error } = await supabase.rpc('find_or_create_blog_conversation', {
        p_user_a_id: user.id,
        p_user_b_id: account.id,
      });

      if (!error && data) {
        navigate(`/blog/messages?conversation=${data}`);
      } else {
        navigate('/blog/messages');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      navigate('/blog/messages');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  if (isLoading) {
    return (
      <BlogLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </BlogLayout>
    );
  }

  if (!account) {
    return (
      <BlogLayout>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Profile Not Found</h1>
            <p className="text-gray-300 mb-6">The profile you're looking for doesn't exist.</p>
            <Link
              to="/blog/feed"
              className="inline-block px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all"
            >
              Back to Feed
            </Link>
          </div>
        </div>
      </BlogLayout>
    );
  }

  const isOwnProfile = user?.id === account.id;

  return (
    <BlogLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Ambient blur orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-slate-600/20 rounded-full blur-3xl"></div>

        <div className="max-w-6xl mx-auto relative z-10">
        {account.cover_design_data ? (
          <div className="h-64 rounded-b-3xl overflow-hidden">
            <CoverRenderer designData={account.cover_design_data} />
          </div>
        ) : account.cover_photo_url ? (
          <div
            className="h-64 bg-cover bg-center rounded-b-3xl"
            style={{ backgroundImage: `url(${account.cover_photo_url})` }}
          ></div>
        ) : (
          <div
            className="h-64 rounded-b-3xl"
            style={{
              background: `linear-gradient(135deg, ${account.theme_color || '#10b981'} 0%, ${
                account.theme_color ? account.theme_color + '80' : '#14b8a6'
              } 100%)`
            }}
          ></div>
        )}

        <div className="px-6 -mt-20">
          <div className="bg-slate-800/70 backdrop-blur-md rounded-3xl shadow-xl border border-slate-600/50 p-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                {account.avatar_url ? (
                  <img
                    src={account.avatar_url}
                    alt={account.display_name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white text-4xl font-bold border-4 border-slate-700 shadow-lg">
                    {account.display_name[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-white">{account.display_name}</h1>
                    <p className="text-lg text-gray-300">@{account.username}</p>
                    {account.tagline && (
                      <p className="text-gray-300 italic mt-2">{account.tagline}</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {!isOwnProfile && user && (
                      <>
                        <button
                          onClick={startConversation}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all"
                        >
                          <Mail className="w-4 h-4" />
                          Message
                        </button>
                        <FollowButton authorId={account.id} authorUsername={account.username} />
                      </>
                    )}
                    {isOwnProfile && (
                      <>
                        <Link
                          to="/blog/analytics"
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold bg-emerald-600/80 text-white hover:bg-emerald-600 transition-all"
                        >
                          <BarChart3 className="w-4 h-4" />
                          Analytics
                        </Link>
                        <Link
                          to="/blog/edit-profile"
                          className="px-6 py-2.5 rounded-lg font-semibold bg-slate-700/70 text-gray-200 hover:bg-slate-600/70 transition-all"
                        >
                          Edit Profile
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {account.bio && (
                  <p className="text-gray-300 mt-4 leading-relaxed">{account.bio}</p>
                )}

                <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-300">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {formatDate(account.joined_at)}</span>
                  </div>
                  {account.social_links?.website && (
                    <a
                      href={account.social_links.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>Website</span>
                    </a>
                  )}
                </div>

                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => {
                      setFollowersModalMode('followers');
                      setFollowersModalOpen(true);
                    }}
                    className="hover:underline"
                  >
                    <span className="font-bold text-white">{account.follower_count}</span>{' '}
                    <span className="text-gray-300">Followers</span>
                  </button>
                  <button
                    onClick={() => {
                      setFollowersModalMode('following');
                      setFollowersModalOpen(true);
                    }}
                    className="hover:underline"
                  >
                    <span className="font-bold text-white">{account.following_count}</span>{' '}
                    <span className="text-gray-300">Following</span>
                  </button>
                </div>

                {account.interests && account.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {account.interests.map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: `${account.theme_color || '#E07B39'}20`,
                          color: account.theme_color || '#E07B39'
                        }}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-600/50">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{stats.post_count}</div>
                  <div className="text-sm text-gray-300 mt-1">Stories</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Eye className="w-5 h-5 text-cyan-400" />
                    <div className="text-3xl font-bold text-white">
                      {stats.total_views.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 mt-1">Total Views</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Heart className="w-5 h-5 text-rose-400" />
                    <div className="text-3xl font-bold text-white">
                      {stats.total_reactions.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 mt-1">Reactions</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <MessageCircle className="w-5 h-5 text-emerald-400" />
                    <div className="text-3xl font-bold text-white">
                      {stats.total_comments.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 mt-1">Comments</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 mt-12 mb-12">
          {posts.length > 0 ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-6">
                {isOwnProfile ? 'Your Stories' : `Stories by ${account.display_name}`}
              </h2>
              <BlogWheel
                posts={posts}
                onPostClick={(postId) => navigate(`/blog/post/${postId}`)}
                title=""
                subtitle=""
              />
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-slate-500 mb-4">
                <Bookmark className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No stories yet</h3>
              <p className="text-gray-300">
                {isOwnProfile
                  ? 'Start writing your first story to share with the world!'
                  : `${account.display_name} hasn't published any stories yet.`}
              </p>
              {isOwnProfile && (
                <Link
                  to="/blog/create-post"
                  className="inline-block mt-6 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-emerald-500/50"
                >
                  Write Your First Story
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      </div>

      <FollowersModal
        accountId={account.id}
        username={account.username}
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        mode={followersModalMode}
      />
    </BlogLayout>
  );
}
