import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pin, Heart, MessageCircle, Repeat2, Share2, Bookmark } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';
import EngagementBar from '../../components/shared/EngagementBar';
import ReportContentModal from '../../components/shared/ReportContentModal';
import { formatDistanceToNow } from '../../lib/platformHelpers';
import JuryPoolVolunteerButton from '../../components/shared/JuryPoolVolunteerButton';

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
  is_pinned: boolean;
  pinned_at: string | null;
  switter_accounts: {
    handle: string;
    display_name: string;
    avatar_url: string;
    verified_badge: boolean;
  };
}

export default function SwitterFeed() {
  const { user } = useAuth();
  const [pinnedTweets, setPinnedTweets] = useState<Tweet[]>([]);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportingTweet, setReportingTweet] = useState<string | null>(null);
  const [feedType, setFeedType] = useState<'all' | 'following'>('all');

  useEffect(() => {
    loadTweets();
  }, [feedType, user]);

  const loadTweets = async () => {
    setLoading(true);

    const [pinnedRes, tweetsRes] = await Promise.all([
      supabase
        .from('switter_tweets')
        .select(`
          *,
          switter_accounts(handle, display_name, avatar_url, verified_badge)
        `)
        .eq('is_pinned', true)
        .eq('status', 'active')
        .order('pinned_at', { ascending: false }),
      supabase
        .from('switter_tweets')
        .select(`
          *,
          switter_accounts(handle, display_name, avatar_url, verified_badge)
        `)
        .eq('is_pinned', false)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    if (pinnedRes.data) setPinnedTweets(pinnedRes.data);
    if (tweetsRes.data) setTweets(tweetsRes.data);
    setLoading(false);
  };

  const handleReaction = async (tweetId: string, reactionType: string) => {
    if (!user) return;

    const { data: existing } = await supabase
      .from('platform_reactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', tweetId)
      .eq('platform', 'switter')
      .eq('reaction_type', reactionType)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('platform_reactions')
        .delete()
        .eq('id', existing.id);

      await supabase.rpc('decrement', {
        row_id: tweetId,
        table_name: 'switter_tweets',
        column_name: 'like_count'
      });
    } else {
      await supabase
        .from('platform_reactions')
        .insert({
          user_id: user.id,
          content_id: tweetId,
          platform: 'switter',
          reaction_type: reactionType
        });

      await supabase.rpc('increment', {
        row_id: tweetId,
        table_name: 'switter_tweets',
        column_name: 'like_count'
      });
    }

    loadTweets();
  };

  const renderTweet = (tweet: Tweet) => (
    <div key={tweet.id} className="bg-white border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors">
      {tweet.is_pinned && (
        <div className="flex items-center gap-2 mb-2 text-orange-600 text-sm">
          <Pin className="w-4 h-4" />
          <span className="font-semibold">Pinned by Admin</span>
        </div>
      )}

      <div className="flex gap-3">
        <Link to={`/switter/u/${tweet.switter_accounts.handle}`}>
          <img
            src={tweet.switter_accounts.avatar_url || 'https://via.placeholder.com/48'}
            alt={tweet.switter_accounts.display_name}
            className="w-12 h-12 rounded-full"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={`/switter/u/${tweet.switter_accounts.handle}`}
              className="font-bold text-gray-900 hover:underline"
            >
              {tweet.switter_accounts.display_name}
            </Link>
            {tweet.switter_accounts.verified_badge && (
              <span className="text-blue-500">✓</span>
            )}
            <span className="text-gray-500">@{tweet.switter_accounts.handle}</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500 text-sm">
              {formatDistanceToNow(tweet.created_at)}
            </span>
          </div>

          <Link to={`/switter/tweet/${tweet.id}`} className="block">
            <p className="text-gray-900 mb-2 whitespace-pre-wrap">{tweet.content}</p>

            {tweet.media_urls && tweet.media_urls.length > 0 && (
              <div className={`grid gap-2 mb-2 ${tweet.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {tweet.media_urls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt=""
                    className="rounded-lg w-full object-cover max-h-80"
                  />
                ))}
              </div>
            )}
          </Link>

          <div className="flex items-center gap-8 mt-3 text-gray-500">
            <Link
              to={`/switter/tweet/${tweet.id}`}
              className="flex items-center gap-2 hover:text-blue-500 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{tweet.comment_count}</span>
            </Link>

            <button className="flex items-center gap-2 hover:text-green-500 transition-colors">
              <Repeat2 className="w-5 h-5" />
              <span className="text-sm">{tweet.retweet_count}</span>
            </button>

            <button
              onClick={() => handleReaction(tweet.id, 'like')}
              className="flex items-center gap-2 hover:text-red-500 transition-colors"
            >
              <Heart className="w-5 h-5" />
              <span className="text-sm">{tweet.like_count}</span>
            </button>

            <button className="flex items-center gap-2 hover:text-blue-500 transition-colors">
              <Share2 className="w-5 h-5" />
            </button>

            <button className="flex items-center gap-2 hover:text-blue-500 transition-colors">
              <Bookmark className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PlatformGuard platform="switter" redirectTo="/switter/join">
      <SwitterLayout showCreateButton>
        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="sticky top-16 z-10 bg-white border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setFeedType('all')}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  feedType === 'all'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                For You
              </button>
              <button
                onClick={() => setFeedType('following')}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  feedType === 'following'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Following
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-gray-200">
            <JuryPoolVolunteerButton variant="compact" requireVerified={false} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {pinnedTweets.map(renderTweet)}
              {tweets.map(renderTweet)}
            </>
          )}

          {reportingTweet && (
            <ReportContentModal
              contentId={reportingTweet}
              contentType="tweet"
              platform="switter"
              onClose={() => setReportingTweet(null)}
            />
          )}
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
