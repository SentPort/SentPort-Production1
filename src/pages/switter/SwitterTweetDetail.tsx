import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2, Share2, Bookmark, Flag, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';
import UniversalCommentSection from '../../components/shared/UniversalCommentSection';
import ReportContentModal from '../../components/shared/ReportContentModal';
import QuoteTweetModal from '../../components/switter/QuoteTweetModal';
import { formatDistanceToNow } from '../../lib/platformHelpers';

interface Tweet {
  id: string;
  content: string;
  media_urls: string[] | null;
  author_id: string;
  like_count: number;
  retweet_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  created_at: string;
  switter_accounts: {
    handle: string;
    display_name: string;
    avatar_url: string;
    verified_badge: boolean;
  };
}

export default function SwitterTweetDetail() {
  const { tweetId } = useParams();
  const { user } = useAuth();
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (tweetId) {
      loadTweet();
      checkInteractions();
      incrementViewCount();
    }
  }, [tweetId]);

  const loadTweet = async () => {
    const { data } = await supabase
      .from('switter_tweets')
      .select(`
        *,
        switter_accounts(handle, display_name, avatar_url, verified_badge)
      `)
      .eq('id', tweetId)
      .maybeSingle();

    if (data) setTweet(data);
    setLoading(false);
  };

  const checkInteractions = async () => {
    if (!user || !tweetId) return;

    const { data: account } = await supabase
      .from('switter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) return;

    const [likeData, retweetData, bookmarkData] = await Promise.all([
      supabase
        .from('platform_reactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', tweetId)
        .eq('platform', 'switter')
        .eq('reaction_type', 'like')
        .maybeSingle(),
      supabase
        .from('switter_tweets')
        .select('id')
        .eq('author_id', account.id)
        .eq('retweet_of_id', tweetId)
        .is('content', null)
        .maybeSingle(),
      supabase
        .from('switter_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('tweet_id', tweetId)
        .maybeSingle()
    ]);

    setLiked(!!likeData.data);
    setRetweeted(!!retweetData.data);
    setBookmarked(!!bookmarkData.data);
  };

  const incrementViewCount = async () => {
    if (!user || !tweetId) return;

    const { data: existing } = await supabase
      .from('switter_tweet_views')
      .select('id')
      .eq('tweet_id', tweetId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from('switter_tweet_views')
        .insert({ tweet_id: tweetId, user_id: user.id });

      await supabase.rpc('increment', {
        row_id: tweetId,
        table_name: 'switter_tweets',
        column_name: 'view_count'
      });
    }
  };

  const handleLike = async () => {
    if (!user || !tweet || actionLoading) return;

    setActionLoading('like');
    const wasLiked = liked;
    setLiked(!liked);

    try {
      if (wasLiked) {
        await supabase
          .from('platform_reactions')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', tweet.id)
          .eq('platform', 'switter')
          .eq('reaction_type', 'like');

        await supabase.rpc('decrement', {
          row_id: tweet.id,
          table_name: 'switter_tweets',
          column_name: 'like_count'
        });
      } else {
        await supabase
          .from('platform_reactions')
          .insert({
            user_id: user.id,
            content_id: tweet.id,
            platform: 'switter',
            reaction_type: 'like'
          });

        await supabase.rpc('increment', {
          row_id: tweet.id,
          table_name: 'switter_tweets',
          column_name: 'like_count'
        });
      }

      await loadTweet();
    } catch (error) {
      console.error('Error liking tweet:', error);
      setLiked(wasLiked);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetweet = async () => {
    if (!user || !tweet || actionLoading) return;

    setActionLoading('retweet');
    const wasRetweeted = retweeted;
    setRetweeted(!retweeted);

    try {
      const { data: account } = await supabase
        .from('switter_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!account) {
        setRetweeted(wasRetweeted);
        setActionLoading(null);
        return;
      }

      if (wasRetweeted) {
        await supabase
          .from('switter_tweets')
          .delete()
          .eq('author_id', account.id)
          .eq('retweet_of_id', tweet.id)
          .is('content', null);

        await supabase.rpc('decrement', {
          row_id: tweet.id,
          table_name: 'switter_tweets',
          column_name: 'retweet_count'
        });
      } else {
        await supabase
          .from('switter_tweets')
          .insert({
            author_id: account.id,
            retweet_of_id: tweet.id,
            content: null
          });

        await supabase.rpc('increment', {
          row_id: tweet.id,
          table_name: 'switter_tweets',
          column_name: 'retweet_count'
        });
      }

      await loadTweet();
    } catch (error) {
      console.error('Error retweeting:', error);
      setRetweeted(wasRetweeted);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBookmark = async () => {
    if (!user || !tweet || actionLoading) return;

    setActionLoading('bookmark');
    const wasBookmarked = bookmarked;
    setBookmarked(!bookmarked);

    try {
      if (wasBookmarked) {
        await supabase
          .from('switter_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('tweet_id', tweet.id);
      } else {
        await supabase
          .from('switter_bookmarks')
          .insert({
            user_id: user.id,
            tweet_id: tweet.id
          });
      }
    } catch (error) {
      console.error('Error bookmarking tweet:', error);
      setBookmarked(wasBookmarked);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <PlatformGuard platform="switter" redirectTo="/switter/join">
        <SwitterLayout showBackButton>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        </SwitterLayout>
      </PlatformGuard>
    );
  }

  if (!tweet) {
    return (
      <PlatformGuard platform="switter" redirectTo="/switter/join">
        <SwitterLayout showBackButton>
          <div className="text-center py-12">
            <p className="text-gray-500">Sweet not found</p>
          </div>
        </SwitterLayout>
      </PlatformGuard>
    );
  }

  return (
    <PlatformGuard platform="switter" redirectTo="/switter/join">
      <SwitterLayout showBackButton>
        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex gap-3 mb-4">
              <Link to={`/switter/u/${tweet.switter_accounts.handle}`}>
                <img
                  src={tweet.switter_accounts.avatar_url || 'https://via.placeholder.com/48'}
                  alt={tweet.switter_accounts.display_name}
                  className="w-12 h-12 rounded-full"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/switter/u/${tweet.switter_accounts.handle}`}
                    className="font-bold text-gray-900 hover:underline"
                  >
                    {tweet.switter_accounts.display_name}
                  </Link>
                  {tweet.switter_accounts.verified_badge && (
                    <span className="text-blue-500">✓</span>
                  )}
                </div>
                <p className="text-gray-500">@{tweet.switter_accounts.handle}</p>
              </div>

              <button
                onClick={() => setShowReportModal(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Flag className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-xl mb-3 whitespace-pre-wrap">{tweet.content}</p>

            {tweet.media_urls && tweet.media_urls.length > 0 && (
              <div className={`grid gap-2 mb-3 ${tweet.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {tweet.media_urls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt=""
                    className="rounded-lg w-full object-cover max-h-96"
                  />
                ))}
              </div>
            )}

            <p className="text-gray-500 text-sm mb-3">
              {new Date(tweet.created_at).toLocaleString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>

            <div className="flex items-center gap-6 text-gray-500 text-sm mb-3 py-3 border-t border-b border-gray-200">
              <span>
                <span className="font-bold text-gray-900">{tweet.view_count}</span> Views
              </span>
              <span>
                <span className="font-bold text-gray-900">{tweet.like_count}</span> Likes
              </span>
              <span>
                <span className="font-bold text-gray-900">{tweet.retweet_count}</span> Resweets
              </span>
            </div>

            <div className="flex items-center justify-around py-2 border-b border-gray-200">
              <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MessageCircle className="w-5 h-5 text-gray-500" />
              </button>

              <button
                onClick={handleRetweet}
                disabled={actionLoading === 'retweet'}
                className={`flex items-center gap-2 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  retweeted ? 'text-green-500' : 'text-gray-500'
                }`}
              >
                {actionLoading === 'retweet' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Repeat2 className={`w-5 h-5 ${retweeted ? 'fill-current' : ''}`} />
                )}
              </button>

              <button
                onClick={handleLike}
                disabled={actionLoading === 'like'}
                className={`flex items-center gap-2 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  liked ? 'text-red-500' : 'text-gray-500'
                }`}
              >
                {actionLoading === 'like' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                )}
              </button>

              <button
                onClick={() => setShowQuoteModal(true)}
                disabled={!!actionLoading}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 className="w-5 h-5 text-gray-500" />
              </button>

              <button
                onClick={handleBookmark}
                disabled={actionLoading === 'bookmark'}
                className={`flex items-center gap-2 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  bookmarked ? 'text-blue-500' : 'text-gray-500'
                }`}
              >
                {actionLoading === 'bookmark' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
                )}
              </button>
            </div>
          </div>

          <UniversalCommentSection
            contentId={tweet.id}
            platform="switter"
            contentType="tweet"
          />

          {showReportModal && (
            <ReportContentModal
              contentId={tweet.id}
              contentType="tweet"
              platform="switter"
              onClose={() => setShowReportModal(false)}
            />
          )}

          {showQuoteModal && (
            <QuoteTweetModal
              originalTweet={{
                id: tweet.id,
                content: tweet.content,
                created_at: tweet.created_at,
                author: {
                  handle: tweet.switter_accounts.handle,
                  display_name: tweet.switter_accounts.display_name,
                  avatar_url: tweet.switter_accounts.avatar_url,
                  verified_badge: tweet.switter_accounts.verified_badge
                }
              }}
              onClose={() => setShowQuoteModal(false)}
              onSuccess={() => loadTweet()}
            />
          )}
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
