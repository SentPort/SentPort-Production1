import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pin, X, Search, Calendar, Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AdminRoute from '../../components/shared/AdminRoute';

interface SwitterTweet {
  id: string;
  content: string;
  media_urls: string[] | null;
  author_id: string;
  like_count: number;
  comment_count: number;
  created_at: string;
  is_pinned: boolean;
  pinned_at: string | null;
  switter_accounts: {
    handle: string;
    display_name: string;
  };
}

export default function SwitterPinsManagement() {
  const navigate = useNavigate();
  const [tweets, setTweets] = useState<SwitterTweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pinningTweetId, setPinningTweetId] = useState<string | null>(null);

  useEffect(() => {
    loadTweets();
  }, []);

  const loadTweets = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('switter_tweets')
        .select(`
          *,
          switter_accounts(handle, display_name)
        `)
        .order('is_pinned', { ascending: false })
        .order('pinned_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTweets(data || []);
    } catch (error) {
      console.error('Error loading tweets:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (tweetId: string, currentlyPinned: boolean) => {
    try {
      setPinningTweetId(tweetId);

      const { error } = await supabase.rpc('pin_switter_tweet', {
        tweet_id: tweetId,
        should_pin: !currentlyPinned
      });

      if (error) {
        if (error.message.includes('Maximum of 5')) {
          alert('You can only pin up to 5 tweets at a time. Please unpin another tweet first.');
        } else {
          throw error;
        }
      } else {
        await loadTweets();
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      alert('Failed to update pin status');
    } finally {
      setPinningTweetId(null);
    }
  };

  const filteredTweets = tweets.filter(tweet => {
    const searchLower = searchTerm.toLowerCase();
    return (
      tweet.content.toLowerCase().includes(searchLower) ||
      tweet.switter_accounts.handle.toLowerCase().includes(searchLower) ||
      tweet.switter_accounts.display_name.toLowerCase().includes(searchLower)
    );
  });

  const pinnedTweets = filteredTweets.filter(t => t.is_pinned);
  const unpinnedTweets = filteredTweets.filter(t => !t.is_pinned);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (!content || content.length <= maxLength) return content || '';
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">Loading tweets...</div>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/admin/pins-management')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Manage Pinned Content
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Switter Pinned Tweets Management</h1>
            <p className="text-gray-600">Pin important tweets to appear at the top of the Switter feed</p>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tweets by content, handle, or display name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {pinnedTweets.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Pin className="w-5 h-5 text-blue-600" />
                Pinned Tweets ({pinnedTweets.length}/5)
              </h2>
              <div className="space-y-4">
                {pinnedTweets.map(tweet => (
                  <div
                    key={tweet.id}
                    className="bg-white border-2 border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <Pin className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-gray-900">
                                {tweet.switter_accounts.display_name}
                              </span>
                              <span className="text-gray-600">
                                @{tweet.switter_accounts.handle}
                              </span>
                            </div>
                            <p className="text-gray-800 mb-4 whitespace-pre-wrap">{truncateContent(tweet.content)}</p>

                            {tweet.media_urls && tweet.media_urls.length > 0 && (
                              <div className="flex gap-2 mb-4">
                                {tweet.media_urls.slice(0, 2).map((url, idx) => (
                                  <img
                                    key={idx}
                                    src={url}
                                    alt=""
                                    className="w-24 h-24 object-cover rounded"
                                  />
                                ))}
                                {tweet.media_urls.length > 2 && (
                                  <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-gray-600 text-sm font-semibold">
                                    +{tweet.media_urls.length - 2}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Heart className="w-4 h-4" />
                                <span>{tweet.like_count.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle className="w-4 h-4" />
                                <span>{tweet.comment_count.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>Created {formatDate(tweet.created_at)}</span>
                              </div>
                              {tweet.pinned_at && (
                                <div className="flex items-center gap-1 text-blue-600">
                                  <Pin className="w-4 h-4" />
                                  <span>Pinned {formatDate(tweet.pinned_at)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => togglePin(tweet.id, tweet.is_pinned)}
                        disabled={pinningTweetId === tweet.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                      >
                        <X className="w-4 h-4" />
                        Unpin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              All Tweets
            </h2>
            {unpinnedTweets.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center text-gray-500">
                {searchTerm ? 'No tweets match your search' : 'No tweets available'}
              </div>
            ) : (
              <div className="space-y-4">
                {unpinnedTweets.slice(0, 50).map(tweet => (
                  <div
                    key={tweet.id}
                    className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-gray-900">
                            {tweet.switter_accounts.display_name}
                          </span>
                          <span className="text-gray-600">
                            @{tweet.switter_accounts.handle}
                          </span>
                        </div>
                        <p className="text-gray-800 mb-4 whitespace-pre-wrap">{truncateContent(tweet.content)}</p>

                        {tweet.media_urls && tweet.media_urls.length > 0 && (
                          <div className="flex gap-2 mb-4">
                            {tweet.media_urls.slice(0, 2).map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt=""
                                className="w-24 h-24 object-cover rounded"
                              />
                            ))}
                            {tweet.media_urls.length > 2 && (
                              <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-gray-600 text-sm font-semibold">
                                +{tweet.media_urls.length - 2}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            <span>{tweet.like_count.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{tweet.comment_count.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Created {formatDate(tweet.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => togglePin(tweet.id, tweet.is_pinned)}
                        disabled={pinningTweetId === tweet.id}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                      >
                        <Pin className="w-4 h-4" />
                        Pin
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}
