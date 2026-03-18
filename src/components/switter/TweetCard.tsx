import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2, Share, Bookmark, MoreHorizontal, Trash2, Pin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from '../../lib/platformHelpers';
import QuoteTweetModal from './QuoteTweetModal';
import SharedContentCard from '../shared/SharedContentCard';

interface TweetCardProps {
  tweet: {
    id: string;
    content: string;
    created_at: string;
    like_count: number;
    comment_count: number;
    retweet_count: number;
    share_count: number;
    media_url?: string;
    is_pinned?: boolean;
    author_id: string;
    shared_from_platform?: string;
    shared_from_content_type?: string;
    shared_from_content_id?: string;
    shared_from_url?: string;
    shared_from_title?: string;
    shared_from_author?: string;
    shared_from_excerpt?: string;
    shared_from_thumbnail?: string;
    share_comment?: string;
  };
  author: {
    handle: string;
    display_name: string;
    avatar_url: string;
    verified_badge: boolean;
  };
  onDelete?: () => void;
  showActions?: boolean;
}

export default function TweetCard({ tweet, author, onDelete, showActions = true }: TweetCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [likeCount, setLikeCount] = useState(tweet.like_count);
  const [retweetCount, setRetweetCount] = useState(tweet.retweet_count);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    checkInteractions();
  }, [user, tweet.id]);

  const checkInteractions = async () => {
    if (!user) return;

    const { data: account } = await supabase
      .from('switter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) return;

    setIsOwner(tweet.author_id === account.id);

    const { data: likeData } = await supabase
      .from('platform_reactions')
      .select('id')
      .eq('content_id', tweet.id)
      .eq('user_id', user.id)
      .eq('platform', 'switter')
      .eq('reaction_type', 'like')
      .maybeSingle();

    setLiked(!!likeData);

    const { data: bookmarkData } = await supabase
      .from('switter_bookmarks')
      .select('id')
      .eq('tweet_id', tweet.id)
      .eq('user_id', user.id)
      .maybeSingle();

    setBookmarked(!!bookmarkData);

    const { data: retweetData } = await supabase
      .from('switter_tweets')
      .select('id')
      .eq('author_id', account.id)
      .eq('retweet_of_id', tweet.id)
      .is('content', null)
      .maybeSingle();

    setRetweeted(!!retweetData);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    if (liked) {
      await supabase
        .from('platform_reactions')
        .delete()
        .eq('content_id', tweet.id)
        .eq('user_id', user.id)
        .eq('platform', 'switter');

      await supabase.rpc('decrement', {
        row_id: tweet.id,
        table_name: 'switter_tweets',
        column_name: 'like_count'
      });

      setLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase
        .from('platform_reactions')
        .insert({
          content_id: tweet.id,
          user_id: user.id,
          platform: 'switter',
          reaction_type: 'like'
        });

      await supabase.rpc('increment', {
        row_id: tweet.id,
        table_name: 'switter_tweets',
        column_name: 'like_count'
      });

      setLiked(true);
      setLikeCount(prev => prev + 1);
    }
  };

  const handleRetweet = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    const { data: account } = await supabase
      .from('switter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) return;

    if (retweeted) {
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

      setRetweeted(false);
      setRetweetCount(prev => Math.max(0, prev - 1));
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

      setRetweeted(true);
      setRetweetCount(prev => prev + 1);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;

    if (bookmarked) {
      await supabase
        .from('switter_bookmarks')
        .delete()
        .eq('tweet_id', tweet.id)
        .eq('user_id', user.id);

      setBookmarked(false);
    } else {
      await supabase
        .from('switter_bookmarks')
        .insert({
          tweet_id: tweet.id,
          user_id: user.id
        });

      setBookmarked(true);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this sweet?')) return;

    await supabase
      .from('switter_tweets')
      .delete()
      .eq('id', tweet.id);

    onDelete?.();
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    await supabase
      .from('switter_tweets')
      .update({ is_pinned: !tweet.is_pinned })
      .eq('id', tweet.id);

    window.location.reload();
  };

  return (
    <>
      <Link
        to={`/switter/tweet/${tweet.id}`}
        className="block border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex gap-3">
          <Link to={`/switter/u/${author.handle}`} onClick={(e) => e.stopPropagation()}>
            <img
              src={author.avatar_url || 'https://via.placeholder.com/48'}
              alt={author.display_name}
              className="w-12 h-12 rounded-full"
            />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Link
                  to={`/switter/u/${author.handle}`}
                  className="font-bold hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {author.display_name}
                </Link>
                {author.verified_badge && (
                  <span className="text-blue-500">✓</span>
                )}
                <span className="text-gray-500">@{author.handle}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-500 text-sm">
                  {formatDistanceToNow(tweet.created_at)}
                </span>
                {tweet.is_pinned && (
                  <>
                    <span className="text-gray-500">·</span>
                    <span className="flex items-center gap-1 text-blue-500 text-sm">
                      <Pin className="w-3 h-3" />
                      Pinned
                    </span>
                  </>
                )}
              </div>

              {isOwner && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(!showMenu);
                    }}
                    className="p-2 hover:bg-blue-50 rounded-full text-gray-500 hover:text-blue-500 transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>

                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowMenu(false);
                        }}
                      />
                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                        <button
                          onClick={handlePin}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                          <Pin className="w-4 h-4" />
                          {tweet.is_pinned ? 'Unpin' : 'Pin to profile'}
                        </button>
                        <button
                          onClick={handleDelete}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {tweet.shared_from_platform ? (
              <>
                {tweet.share_comment && (
                  <p className="whitespace-pre-wrap mb-3">{tweet.share_comment}</p>
                )}
                <div onClick={(e) => e.stopPropagation()}>
                  <SharedContentCard
                    platform={tweet.shared_from_platform}
                    contentType={tweet.shared_from_content_type || 'post'}
                    contentId={tweet.shared_from_content_id || ''}
                    url={tweet.shared_from_url}
                    title={tweet.shared_from_title}
                    author={tweet.shared_from_author}
                    excerpt={tweet.shared_from_excerpt}
                    thumbnail={tweet.shared_from_thumbnail}
                    className="mb-3"
                  />
                </div>
              </>
            ) : (
              <>
                <p className="whitespace-pre-wrap mb-3">{tweet.content}</p>

                {tweet.media_url && (
                  <img
                    src={tweet.media_url}
                    alt=""
                    className="rounded-lg max-h-96 w-full object-cover mb-3"
                  />
                )}
              </>
            )}

            {showActions && (
              <div className="flex items-center justify-between text-gray-500 max-w-md">
                <Link
                  to={`/switter/tweet/${tweet.id}`}
                  className="flex items-center gap-2 hover:text-blue-500 transition-colors group"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <span className="text-sm">{tweet.comment_count}</span>
                </Link>

                <button
                  onClick={handleRetweet}
                  className={`flex items-center gap-2 transition-colors group ${
                    retweeted ? 'text-green-500' : 'hover:text-green-500'
                  }`}
                >
                  <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                    <Repeat2 className="w-5 h-5" />
                  </div>
                  <span className="text-sm">{retweetCount}</span>
                </button>

                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 transition-colors group ${
                    liked ? 'text-red-500' : 'hover:text-red-500'
                  }`}
                >
                  <div className="p-2 rounded-full group-hover:bg-red-50 transition-colors">
                    <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                  </div>
                  <span className="text-sm">{likeCount}</span>
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowQuoteModal(true);
                  }}
                  className="p-2 rounded-full hover:bg-blue-50 hover:text-blue-500 transition-colors"
                >
                  <Share className="w-5 h-5" />
                </button>

                <button
                  onClick={handleBookmark}
                  className={`p-2 rounded-full transition-colors ${
                    bookmarked
                      ? 'text-blue-500'
                      : 'hover:bg-blue-50 hover:text-blue-500'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
                </button>
              </div>
            )}
          </div>
        </div>
      </Link>

      {showQuoteModal && (
        <QuoteTweetModal
          onClose={() => setShowQuoteModal(false)}
          onSuccess={() => window.location.reload()}
          originalTweet={{
            id: tweet.id,
            content: tweet.content,
            created_at: tweet.created_at,
            author
          }}
        />
      )}
    </>
  );
}
