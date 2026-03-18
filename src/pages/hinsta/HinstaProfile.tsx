import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Settings, Grid2x2 as Grid, Bookmark, User, Loader2, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import HinstaLayout from '../../components/shared/HinstaLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';
import FollowersModal from '../../components/hinsta/FollowersModal';

export default function HinstaProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myAccount, setMyAccount] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [showFollowersModal, setShowFollowersModal] = useState<'followers' | 'following' | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadMyAccount();
    }
  }, [username, user]);

  useEffect(() => {
    if (profile && user && !isOwnProfile) {
      trackProfileView();
    }
  }, [profile, user, isOwnProfile]);

  const trackProfileView = async () => {
    if (!profile) return;

    try {
      const referrer = document.referrer || 'direct';

      await supabase.rpc('record_hinsta_profile_view', {
        p_account_id: profile.id,
        p_visitor_id: user?.id || null,
        p_visit_duration: 0,
        p_referrer: referrer,
      });
    } catch (error) {
      console.error('Error tracking profile view:', error);
    }
  };

  const loadMyAccount = async () => {
    const { data } = await supabase
      .from('hinsta_accounts')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data) setMyAccount(data);
  };

  const loadProfile = async () => {
    setLoading(true);

    const { data: profileData } = await supabase
      .from('hinsta_accounts')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (!profileData) {
      navigate('/hinsta');
      return;
    }

    setProfile(profileData);
    setIsOwnProfile(profileData.user_id === user?.id);

    if (!isOwnProfile && myAccount) {
      const { data: followData } = await supabase
        .from('hinsta_follows')
        .select('id')
        .eq('follower_id', myAccount.id)
        .eq('following_id', profileData.id)
        .maybeSingle();

      setIsFollowing(!!followData);
    }

    let postsQuery = supabase
      .from('hinsta_posts')
      .select('*')
      .eq('author_id', profileData.id)
      .eq('is_archived', false);

    if (profileData.user_id !== user?.id) {
      postsQuery = postsQuery.neq('status', 'paused');
    }

    const { data: postsData } = await postsQuery.order('created_at', { ascending: false });

    setPosts(postsData || []);
    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!myAccount || !profile) return;

    try {
      if (isFollowing) {
        await supabase
          .from('hinsta_follows')
          .delete()
          .eq('follower_id', myAccount.id)
          .eq('following_id', profile.id);

        setIsFollowing(false);
        setProfile({
          ...profile,
          follower_count: Math.max(0, profile.follower_count - 1)
        });
      } else {
        await supabase
          .from('hinsta_follows')
          .insert({
            follower_id: myAccount.id,
            following_id: profile.id
          });

        setIsFollowing(true);
        setProfile({
          ...profile,
          follower_count: profile.follower_count + 1
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  if (loading || !profile) {
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
      <HinstaLayout showBackButton backButtonPath="/hinsta">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-8 mb-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-1 flex-shrink-0">
                <div className="w-full h-full rounded-full bg-white p-1">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-4xl">
                      {profile.username[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-2xl font-semibold">{profile.username}</h1>
                  {isOwnProfile ? (
                    <>
                      <Link
                        to="/hinsta/settings"
                        className="px-4 py-1.5 border border-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors"
                      >
                        Edit Profile
                      </Link>
                      <Link
                        to="/hinsta/analytics"
                        className="px-4 py-1.5 border border-gray-300 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        View Analytics
                      </Link>
                    </>
                  ) : (
                    <button
                      onClick={toggleFollow}
                      className={`px-6 py-1.5 rounded-lg font-semibold text-sm ${
                        isFollowing
                          ? 'border border-gray-300 hover:bg-gray-50'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>

                <div className="flex gap-8 mb-4">
                  <div className="text-center">
                    <div className="font-semibold text-lg">{profile.post_count || 0}</div>
                    <div className="text-gray-600 text-sm">posts</div>
                  </div>
                  <button
                    onClick={() => setShowFollowersModal('followers')}
                    className="text-center hover:opacity-70 transition-opacity"
                  >
                    <div className="font-semibold text-lg">{profile.follower_count || 0}</div>
                    <div className="text-gray-600 text-sm">followers</div>
                  </button>
                  <button
                    onClick={() => setShowFollowersModal('following')}
                    className="text-center hover:opacity-70 transition-opacity"
                  >
                    <div className="font-semibold text-lg">{profile.following_count || 0}</div>
                    <div className="text-gray-600 text-sm">following</div>
                  </button>
                </div>

                <div>
                  <div className="font-semibold mb-1">{profile.display_name}</div>
                  {profile.bio && <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                      {profile.website}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isOwnProfile && (
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('posts')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 font-semibold ${
                  activeTab === 'posts'
                    ? 'border-b-2 border-gray-900 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Grid className="w-5 h-5" />
                POSTS
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 font-semibold ${
                  activeTab === 'saved'
                    ? 'border-b-2 border-gray-900 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Bookmark className="w-5 h-5" />
                SAVED
              </button>
            </div>
          )}

          {activeTab === 'posts' && (
            posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <User className="w-16 h-16 mb-4" />
                <p className="font-semibold">No Posts Yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/hinsta/post/${post.id}`}
                    className="aspect-square bg-gray-100 relative group overflow-hidden"
                  >
                    {(post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : post.media_url) ? (
                      <img
                        src={post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : post.media_url}
                        alt={post.caption}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <User className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="text-white font-semibold flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          ❤️ {post.like_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          💬 {post.comment_count || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}

          {showFollowersModal && (
            <FollowersModal
              accountId={profile.id}
              type={showFollowersModal}
              onClose={() => setShowFollowersModal(null)}
            />
          )}
        </div>
      </HinstaLayout>
    </PlatformGuard>
  );
}