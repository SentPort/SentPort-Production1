import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Folder, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';
import { formatDistanceToNow } from '../../lib/platformHelpers';

interface Collection {
  id: string;
  name: string;
  description: string;
  bookmark_count: number;
}

interface BookmarkedTweet {
  id: string;
  tweet: {
    id: string;
    content: string;
    created_at: string;
    like_count: number;
    comment_count: number;
    author: {
      handle: string;
      display_name: string;
      avatar_url: string;
      verified_badge: boolean;
    };
  };
}

export default function Bookmarks() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [bookmarkedTweets, setBookmarkedTweets] = useState<BookmarkedTweet[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDesc, setNewCollectionDesc] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedCollection]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    const { data: account } = await supabase
      .from('switter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) {
      setLoading(false);
      return;
    }

    const { data: colls } = await supabase
      .from('switter_bookmark_collections')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false });

    if (colls) setCollections(colls);

    if (selectedCollection) {
      const { data: items } = await supabase
        .from('switter_collection_items')
        .select(`
          id,
          tweet:switter_tweets(
            id,
            content,
            created_at,
            like_count,
            comment_count,
            author:switter_accounts(handle, display_name, avatar_url, verified_badge)
          )
        `)
        .eq('collection_id', selectedCollection)
        .order('added_at', { ascending: false });

      if (items) setBookmarkedTweets(items);
    } else {
      const { data: bookmarks } = await supabase
        .from('switter_bookmarks')
        .select(`
          id,
          tweet:switter_tweets(
            id,
            content,
            created_at,
            like_count,
            comment_count,
            author:switter_accounts(handle, display_name, avatar_url, verified_badge)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookmarks) setBookmarkedTweets(bookmarks);
    }

    setLoading(false);
  };

  const createCollection = async () => {
    if (!user || !newCollectionName.trim()) return;

    const { data: account } = await supabase
      .from('switter_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account) return;

    await supabase
      .from('switter_bookmark_collections')
      .insert({
        account_id: account.id,
        name: newCollectionName,
        description: newCollectionDesc
      });

    setNewCollectionName('');
    setNewCollectionDesc('');
    setShowNewCollection(false);
    loadData();
  };

  return (
    <PlatformGuard platform="switter" redirectTo="/switter/join">
      <SwitterLayout showBackButton>
        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="border-b border-gray-200 sticky top-0 bg-white z-10 px-4 py-3">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bookmark className="w-5 h-5" />
              Bookmarks
            </h1>
          </div>

          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">Collections</h2>
              <button
                onClick={() => setShowNewCollection(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {showNewCollection && (
              <div className="mb-4 p-4 border border-gray-200 rounded-lg">
                <input
                  type="text"
                  placeholder="Collection name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={createCollection}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowNewCollection(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCollection(null)}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  selectedCollection === null
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Bookmarks
              </button>
              {collections.map((coll) => (
                <button
                  key={coll.id}
                  onClick={() => setSelectedCollection(coll.id)}
                  className={`px-4 py-2 rounded-full font-medium flex items-center gap-2 transition-colors ${
                    selectedCollection === coll.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  {coll.name} ({coll.bookmark_count})
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : bookmarkedTweets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bookmark className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No bookmarks yet</p>
              <p className="text-sm mt-1">Save tweets to read later</p>
            </div>
          ) : (
            <div>
              {bookmarkedTweets.map((item) => (
                <Link
                  key={item.id}
                  to={`/switter/tweet/${item.tweet.id}`}
                  className="block border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex gap-3">
                    <img
                      src={item.tweet.author.avatar_url || 'https://via.placeholder.com/48'}
                      alt={item.tweet.author.display_name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">{item.tweet.author.display_name}</span>
                        {item.tweet.author.verified_badge && (
                          <span className="text-blue-500">✓</span>
                        )}
                        <span className="text-gray-500">@{item.tweet.author.handle}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-500 text-sm">
                          {formatDistanceToNow(item.tweet.created_at)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{item.tweet.content}</p>
                      <div className="flex gap-6 text-gray-500 text-sm mt-2">
                        <span>{item.tweet.like_count} likes</span>
                        <span>{item.tweet.comment_count} comments</span>
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
