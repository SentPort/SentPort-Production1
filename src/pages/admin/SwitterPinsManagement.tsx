import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pin, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AdminRoute from '../../components/shared/AdminRoute';
import { formatDistanceToNow } from '../../lib/platformHelpers';

interface PinnedTweet {
  id: string;
  content: string;
  media_urls: string[] | null;
  author_id: string;
  like_count: number;
  comment_count: number;
  pinned_at: string;
  pinned_by: string;
  switter_accounts: {
    handle: string;
    display_name: string;
  };
}

export default function SwitterPinsManagement() {
  const { user } = useAuth();
  const [pinnedTweets, setPinnedTweets] = useState<PinnedTweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [unpinning, setUnpinning] = useState<string | null>(null);

  useEffect(() => {
    loadPinnedTweets();
  }, []);

  const loadPinnedTweets = async () => {
    const { data } = await supabase
      .from('switter_tweets')
      .select(`
        *,
        switter_accounts(handle, display_name)
      `)
      .eq('is_pinned', true)
      .order('pinned_at', { ascending: false });

    if (data) setPinnedTweets(data);
    setLoading(false);
  };

  const handleUnpin = async (tweetId: string) => {
    setUnpinning(tweetId);

    try {
      const { error } = await supabase.rpc('pin_switter_tweet', {
        p_tweet_id: tweetId,
        p_should_pin: false
      });

      if (error) throw error;

      await loadPinnedTweets();
    } catch (err: any) {
      alert(err.message || 'Failed to unpin tweet');
    } finally {
      setUnpinning(null);
    }
  };

  if (loading) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          </div>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              to="/admin/pins"
              className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block"
            >
              ← Back to Pins Management
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Switter Pinned Tweets</h1>
                <p className="text-gray-600 mt-1">
                  {pinnedTweets.length} of 5 tweets pinned
                </p>
              </div>
            </div>
          </div>

          {pinnedTweets.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Pin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No tweets are currently pinned</p>
              <p className="text-sm text-gray-500 mt-2">
                Go to any tweet and use the pin option to feature it at the top of the feed
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pinnedTweets.map((tweet) => (
                <div
                  key={tweet.id}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Pin className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-orange-600 font-semibold">
                          Pinned {formatDistanceToNow(tweet.pinned_at)}
                        </span>
                      </div>

                      <Link
                        to={`/switter/tweet/${tweet.id}`}
                        className="block mb-2 hover:underline"
                      >
                        <p className="font-semibold text-lg text-gray-900">
                          @{tweet.switter_accounts.handle}
                        </p>
                        <p className="text-gray-700 mt-1 whitespace-pre-wrap line-clamp-3">
                          {tweet.content}
                        </p>
                      </Link>

                      {tweet.media_urls && tweet.media_urls.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {tweet.media_urls.slice(0, 2).map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt=""
                              className="w-20 h-20 object-cover rounded"
                            />
                          ))}
                          {tweet.media_urls.length > 2 && (
                            <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-gray-600 text-sm font-semibold">
                              +{tweet.media_urls.length - 2}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <span>{tweet.like_count} likes</span>
                        <span>{tweet.comment_count} comments</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUnpin(tweet.id)}
                      disabled={unpinning === tweet.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Unpin tweet"
                    >
                      {unpinning === tweet.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pinnedTweets.length > 0 && pinnedTweets.length < 5 && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                You can pin up to {5 - pinnedTweets.length} more tweet{5 - pinnedTweets.length !== 1 ? 's' : ''}.
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminRoute>
  );
}
