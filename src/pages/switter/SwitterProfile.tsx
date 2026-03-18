import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Link as LinkIcon, Heart, MessageCircle, Palette, Repeat2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';
import CoverDesignEditor from '../../components/shared/CoverDesignEditor';
import CoverRenderer from '../../components/shared/CoverRenderer';
import { formatDistanceToNow } from '../../lib/platformHelpers';

interface Profile {
  id: string;
  user_id: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  cover_photo_url: string;
  cover_design_data: any;
  location: string;
  website: string;
  follower_count: number;
  following_count: number;
  tweet_count: number;
  verified_badge: boolean;
  created_at: string;
}

interface Tweet {
  id: string;
  content: string;
  media_urls: string[] | null;
  like_count: number;
  comment_count: number;
  retweet_count: number;
  created_at: string;
  retweet_of_id?: string;
  retweet_of?: {
    id: string;
    content: string;
    media_urls: string[] | null;
    like_count: number;
    comment_count: number;
    created_at: string;
    author: {
      handle: string;
      display_name: string;
      avatar_url: string;
      verified_badge: boolean;
    };
  };
}

export default function SwitterProfile() {
  const { handle } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'sweets' | 'replies' | 'media' | 'likes' | 'resweets'>('sweets');
  const [showCoverEditor, setShowCoverEditor] = useState(false);

  useEffect(() => {
    if (handle) {
      loadProfile();
    }
  }, [handle]);

  useEffect(() => {
    if (profile) {
      loadTweets(profile.id);
    }
  }, [activeTab, profile]);

  const loadProfile = async () => {
    const { data: profileData } = await supabase
      .from('switter_accounts')
      .select('*')
      .eq('handle', handle)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
      loadTweets(profileData.id);
      checkFollowStatus(profileData.user_id);
    }
    setLoading(false);
  };

  const loadTweets = async (authorId: string) => {
    if (activeTab === 'likes') {
      const { data: reactions } = await supabase
        .from('platform_reactions')
        .select('content_id')
        .eq('user_id', profile!.user_id)
        .eq('platform', 'switter')
        .eq('reaction_type', 'like')
        .order('created_at', { ascending: false })
        .limit(20);

      if (reactions && reactions.length > 0) {
        const tweetIds = reactions.map(r => r.content_id);
        const { data: likedTweets } = await supabase
          .from('switter_tweets')
          .select('*')
          .in('id', tweetIds)
          .eq('status', 'active');

        if (likedTweets) {
          setTweets(likedTweets);
        }
      } else {
        setTweets([]);
      }
      return;
    }

    if (activeTab === 'resweets') {
      const { data } = await supabase
        .from('switter_tweets')
        .select(`
          *,
          retweet_of:switter_tweets!switter_tweets_retweet_of_id_fkey(
            id,
            content,
            media_urls,
            like_count,
            comment_count,
            created_at,
            author:switter_accounts(handle, display_name, avatar_url, verified_badge)
          )
        `)
        .eq('author_id', authorId)
        .eq('status', 'active')
        .not('retweet_of_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setTweets(data);
      }
      return;
    }

    let query = supabase
      .from('switter_tweets')
      .select('*')
      .eq('author_id', authorId)
      .eq('status', 'active');

    if (activeTab === 'sweets') {
      query = query.is('reply_to_id', null).is('retweet_of_id', null);
    } else if (activeTab === 'replies') {
      query = query.not('reply_to_id', 'is', null);
    } else if (activeTab === 'media') {
      query = query.not('media_urls', 'is', null);
    }

    const { data } = await query
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setTweets(data);
    }
  };

  const checkFollowStatus = async (profileUserId: string) => {
    if (!user) return;

    const { data } = await supabase
      .from('switter_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profileUserId)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!user || !profile) return;

    if (isFollowing) {
      await supabase
        .from('switter_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profile.user_id);
    } else {
      await supabase
        .from('switter_follows')
        .insert({
          follower_id: user.id,
          following_id: profile.user_id
        });
    }

    setIsFollowing(!isFollowing);
    loadProfile();
  };

  const handleSaveCoverDesign = async (designData: any) => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('switter_accounts')
        .update({
          cover_design_data: designData,
          cover_photo_url: null
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, cover_design_data: designData, cover_photo_url: '' });
      setShowCoverEditor(false);
    } catch (error) {
      console.error('Error saving cover design:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="switter" redirectTo="/switter/join">
        <SwitterLayout showBackButton>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </SwitterLayout>
      </PlatformGuard>
    );
  }

  if (!profile) {
    return (
      <PlatformGuard platform="switter" redirectTo="/switter/join">
        <SwitterLayout showBackButton>
          <div className="text-center py-12">
            <p className="text-gray-500">Profile not found</p>
          </div>
        </SwitterLayout>
      </PlatformGuard>
    );
  }

  const isOwnProfile = user?.id === profile.user_id;

  return (
    <PlatformGuard platform="switter" redirectTo="/switter/join">
      <SwitterLayout showBackButton>
        {showCoverEditor && (
          <CoverDesignEditor
            platform="switter"
            currentCoverData={profile.cover_design_data}
            onSave={handleSaveCoverDesign}
            onClose={() => setShowCoverEditor(false)}
          />
        )}

        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="relative group z-0">
            {profile.cover_design_data ? (
              <div className="h-48">
                <CoverRenderer
                  designData={profile.cover_design_data}
                  aspectRatio={33.33}
                />
              </div>
            ) : (
              <div
                className="h-48 bg-gradient-to-r from-blue-400 to-blue-600"
                style={profile.cover_photo_url ? {
                  backgroundImage: `url(${profile.cover_photo_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                } : {}}
              />
            )}

            {isOwnProfile && (
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => setShowCoverEditor(true)}
                  className="px-4 py-2 bg-gray-900 bg-opacity-75 text-white rounded-lg hover:bg-opacity-90 transition-all flex items-center gap-2"
                >
                  <Palette className="w-4 h-4" />
                  Edit Cover
                </button>
              </div>
            )}
          </div>

          <div className="px-4 pb-4">
            <div className="flex justify-between items-start -mt-16 mb-4">
              <img
                src={profile.avatar_url || 'https://via.placeholder.com/128'}
                alt={profile.display_name}
                className="w-32 h-32 rounded-full border-4 border-white relative z-10"
              />

              {isOwnProfile ? (
                <Link
                  to="/switter/settings"
                  className="mt-20 px-4 py-2 border border-gray-300 rounded-full font-semibold hover:bg-gray-50 transition-colors bg-white relative z-10"
                >
                  Edit Profile
                </Link>
              ) : (
                <button
                  onClick={handleFollow}
                  className={`mt-20 px-4 py-2 rounded-full font-semibold transition-colors relative z-10 ${
                    isFollowing
                      ? 'border border-gray-300 hover:bg-red-50 hover:text-red-600 bg-white'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold">{profile.display_name}</h1>
                {profile.verified_badge && (
                  <span className="text-blue-500 text-lg">✓</span>
                )}
              </div>
              <p className="text-gray-500">@{profile.handle}</p>
            </div>

            {profile.bio && (
              <p className="mb-3 whitespace-pre-wrap">{profile.bio}</p>
            )}

            <div className="flex flex-wrap gap-4 text-gray-500 text-sm mb-3">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="w-4 h-4" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {profile.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            <div className="flex gap-4 text-sm mb-4">
              <Link to={`/switter/u/${profile.handle}/following`} className="hover:underline">
                <span className="font-bold">{profile.following_count}</span>
                <span className="text-gray-500"> Following</span>
              </Link>
              <Link to={`/switter/u/${profile.handle}/followers`} className="hover:underline">
                <span className="font-bold">{profile.follower_count}</span>
                <span className="text-gray-500"> Followers</span>
              </Link>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {[
                { key: 'sweets', label: 'Sweets' },
                { key: 'resweets', label: 'ReSweets' },
                { key: 'replies', label: 'Replies' },
                { key: 'media', label: 'Media' },
                { key: 'likes', label: 'Likes' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex-1 py-4 px-2 text-center font-semibold transition-colors whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'text-blue-500 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            {tweets.map((tweet) => (
              <div
                key={tweet.id}
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                {tweet.retweet_of_id && tweet.retweet_of ? (
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                      <Repeat2 className="w-4 h-4" />
                      <span>ReSweeted</span>
                    </div>
                    <Link
                      to={`/switter/tweet/${tweet.retweet_of.id}`}
                      className="block"
                    >
                      <div className="flex gap-3">
                        <img
                          src={tweet.retweet_of.author.avatar_url || 'https://via.placeholder.com/48'}
                          alt={tweet.retweet_of.author.display_name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">{tweet.retweet_of.author.display_name}</span>
                            {tweet.retweet_of.author.verified_badge && (
                              <span className="text-blue-500">✓</span>
                            )}
                            <span className="text-gray-500">@{tweet.retweet_of.author.handle}</span>
                            <span className="text-gray-500">·</span>
                            <span className="text-gray-500 text-sm">
                              {formatDistanceToNow(tweet.retweet_of.created_at)}
                            </span>
                          </div>
                          <p className="mb-2 whitespace-pre-wrap">{tweet.retweet_of.content}</p>
                          {tweet.retweet_of.media_urls && tweet.retweet_of.media_urls.length > 0 && (
                            <div className={`grid gap-2 mb-2 ${tweet.retweet_of.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                              {tweet.retweet_of.media_urls.map((url, idx) => (
                                <img
                                  key={idx}
                                  src={url}
                                  alt=""
                                  className="rounded-lg w-full object-cover max-h-64"
                                />
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-6 text-gray-500 text-sm">
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              {tweet.retweet_of.comment_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              {tweet.retweet_of.like_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ) : (
                  <Link
                    to={`/switter/tweet/${tweet.id}`}
                    className="block p-4"
                  >
                    <p className="mb-2 whitespace-pre-wrap">{tweet.content}</p>
                    {tweet.media_urls && tweet.media_urls.length > 0 && (
                      <div className={`grid gap-2 mb-2 ${tweet.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {tweet.media_urls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt=""
                            className="rounded-lg w-full object-cover max-h-64"
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-6 text-gray-500 text-sm">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        {tweet.comment_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {tweet.like_count}
                      </span>
                      <span className="text-gray-400">
                        {formatDistanceToNow(tweet.created_at)}
                      </span>
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
