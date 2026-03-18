import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Hash, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';
import { formatDistanceToNow } from '../../lib/platformHelpers';

interface TrendingHashtag {
  id: string;
  tag: string;
  usage_count_24h: number;
  usage_count_7d: number;
  rank: number;
}

interface RecommendedUser {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  follower_count: number;
}

interface Tweet {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  retweet_count: number;
  author: {
    handle: string;
    display_name: string;
    avatar_url: string;
    verified_badge: boolean;
  };
}

export default function Trending() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'trending' | 'for-you' | 'topics'>('trending');
  const [loading, setLoading] = useState(true);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [trendingTweets, setTrendingTweets] = useState<Tweet[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);

  useEffect(() => {
    loadTrending();
  }, [activeTab]);

  const loadTrending = async () => {
    setLoading(true);

    const { data: hashtags } = await supabase
      .from('switter_trending_hashtags')
      .select(`
        *,
        hashtag:switter_hashtags(id, tag)
      `)
      .order('rank', { ascending: true })
      .limit(10);

    if (hashtags) {
      setTrendingHashtags(hashtags.map((h: any) => ({
        id: h.hashtag.id,
        tag: h.hashtag.tag,
        usage_count_24h: h.usage_count_24h,
        usage_count_7d: h.usage_count_7d,
        rank: h.rank
      })));
    }

    const { data: tweets } = await supabase
      .from('switter_tweets')
      .select(`
        *,
        author:switter_accounts(handle, display_name, avatar_url, verified_badge)
      `)
      .eq('status', 'active')
      .order('like_count', { ascending: false })
      .limit(20);

    if (tweets) {
      setTrendingTweets(tweets.map((t: any) => ({
        id: t.id,
        content: t.content,
        created_at: t.created_at,
        like_count: t.like_count,
        comment_count: t.comment_count,
        retweet_count: t.retweet_count,
        author: t.author
      })));
    }

    const { data: users } = await supabase
      .from('switter_accounts')
      .select('id, handle, display_name, avatar_url, bio, follower_count')
      .order('follower_count', { ascending: false })
      .limit(10);

    if (users) {
      setRecommendedUsers(users);
    }

    setLoading(false);
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

  return (
    <PlatformGuard platform="switter" redirectTo="/switter/join">
      <SwitterLayout showBackButton>
        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="px-4 py-3">
              <h1 className="text-xl font-bold">Explore</h1>
            </div>
            <div className="flex border-t border-gray-200">
              <button
                onClick={() => setActiveTab('trending')}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'trending'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Trending
              </button>
              <button
                onClick={() => setActiveTab('for-you')}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'for-you'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                For You
              </button>
              <button
                onClick={() => setActiveTab('topics')}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'topics'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Topics
              </button>
            </div>
          </div>

          {activeTab === 'trending' && (
            <div>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Trending Hashtags
                </h2>
              </div>
              {trendingHashtags.map((hashtag, index) => (
                <Link
                  key={hashtag.id}
                  to={`/switter/search?q=${encodeURIComponent('#' + hashtag.tag)}`}
                  className="block border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{index + 1} · Trending</p>
                      <p className="font-bold text-lg flex items-center gap-1">
                        <Hash className="w-4 h-4" />
                        {hashtag.tag}
                      </p>
                      <p className="text-sm text-gray-600">{hashtag.usage_count_24h} tweets today</p>
                    </div>
                  </div>
                </Link>
              ))}
              {trendingHashtags.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No trending hashtags yet
                </div>
              )}
            </div>
          )}

          {activeTab === 'for-you' && (
            <div>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold">Recommended for You</h2>
              </div>
              {recommendedUsers.map((user) => (
                <div key={user.id} className="border-b border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <Link to={`/switter/u/${user.handle}`} className="flex gap-3 flex-1">
                      <img
                        src={user.avatar_url || 'https://via.placeholder.com/48'}
                        alt={user.display_name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="font-bold">{user.display_name}</p>
                        <p className="text-gray-500 text-sm">@{user.handle}</p>
                        {user.bio && (
                          <p className="text-sm mt-1">{user.bio}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          <Users className="w-4 h-4 inline mr-1" />
                          {user.follower_count} followers
                        </p>
                      </div>
                    </Link>
                    <Link
                      to={`/switter/u/${user.handle}`}
                      className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'topics' && (
            <div>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold">Top Sweets</h2>
              </div>
              {trendingTweets.map((tweet) => (
                <Link
                  key={tweet.id}
                  to={`/switter/tweet/${tweet.id}`}
                  className="block border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex gap-3">
                    <img
                      src={tweet.author.avatar_url || 'https://via.placeholder.com/48'}
                      alt={tweet.author.display_name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{tweet.author.display_name}</span>
                        {tweet.author.verified_badge && (
                          <span className="text-blue-500">✓</span>
                        )}
                        <span className="text-gray-500">@{tweet.author.handle}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-500 text-sm">
                          {formatDistanceToNow(tweet.created_at)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{tweet.content}</p>
                      <div className="flex gap-6 text-gray-500 text-sm mt-2">
                        <span>{tweet.like_count} likes</span>
                        <span>{tweet.comment_count} comments</span>
                        <span>{tweet.retweet_count} resweets</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
