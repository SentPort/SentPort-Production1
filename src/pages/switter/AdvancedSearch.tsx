import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Calendar, Users as UsersIcon, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';
import TweetCard from '../../components/switter/TweetCard';
import { formatDistanceToNow } from '../../lib/platformHelpers';

interface Tweet {
  id: string;
  content: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  retweet_count: number;
  share_count: number;
  media_url?: string;
  author_id: string;
  author: {
    handle: string;
    display_name: string;
    avatar_url: string;
    verified_badge: boolean;
  };
}

interface User {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  verified_badge: boolean;
  follower_count: number;
}

export default function AdvancedSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState<'top' | 'latest' | 'people' | 'media'>('top');
  const [loading, setLoading] = useState(false);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    fromUser: '',
    minLikes: '',
    hasMedia: false,
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);

    let tweetQuery = supabase
      .from('switter_tweets')
      .select(`
        *,
        author:switter_accounts(handle, display_name, avatar_url, verified_badge)
      `)
      .eq('status', 'active')
      .ilike('content', `%${searchQuery}%`);

    if (filters.fromUser) {
      tweetQuery = tweetQuery.ilike('author.handle', `%${filters.fromUser}%`);
    }

    if (filters.minLikes) {
      tweetQuery = tweetQuery.gte('like_count', parseInt(filters.minLikes));
    }

    if (filters.hasMedia) {
      tweetQuery = tweetQuery.not('media_url', 'is', null);
    }

    if (filters.dateFrom) {
      tweetQuery = tweetQuery.gte('created_at', new Date(filters.dateFrom).toISOString());
    }

    if (filters.dateTo) {
      tweetQuery = tweetQuery.lte('created_at', new Date(filters.dateTo).toISOString());
    }

    if (activeTab === 'latest') {
      tweetQuery = tweetQuery.order('created_at', { ascending: false });
    } else if (activeTab === 'top') {
      tweetQuery = tweetQuery.order('like_count', { ascending: false });
    } else if (activeTab === 'media') {
      tweetQuery = tweetQuery.not('media_url', 'is', null);
    }

    const { data: tweetData } = await tweetQuery.limit(50);

    if (tweetData) {
      setTweets(tweetData.map((t: any) => ({
        ...t,
        author: t.author
      })));
    }

    const { data: userData } = await supabase
      .from('switter_accounts')
      .select('*')
      .or(`handle.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .order('follower_count', { ascending: false })
      .limit(20);

    if (userData) setUsers(userData);

    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  return (
    <PlatformGuard platform="switter" redirectTo="/switter/join">
      <SwitterLayout showBackButton>
        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="p-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Switter..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-full transition-colors ${
                    showFilters ? 'bg-blue-500 text-white' : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="w-5 h-5" />
                </button>
              </form>

              {showFilters && (
                <div className="mt-4 p-4 border border-gray-200 rounded-lg space-y-3">
                  <h3 className="font-bold">Filters</h3>
                  <input
                    type="text"
                    placeholder="From user (handle)"
                    value={filters.fromUser}
                    onChange={(e) => setFilters({ ...filters, fromUser: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Minimum likes"
                    value={filters.minLikes}
                    onChange={(e) => setFilters({ ...filters, minLikes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      placeholder="From date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="date"
                      placeholder="To date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.hasMedia}
                      onChange={(e) => setFilters({ ...filters, hasMedia: e.target.checked })}
                      className="rounded"
                    />
                    <span>Only tweets with media</span>
                  </label>
                  <button
                    onClick={() => performSearch(query)}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
                  >
                    Apply Filters
                  </button>
                </div>
              )}
            </div>

            <div className="flex border-t border-gray-200">
              <button
                onClick={() => setActiveTab('top')}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'top'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Top
              </button>
              <button
                onClick={() => setActiveTab('latest')}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'latest'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Latest
              </button>
              <button
                onClick={() => setActiveTab('people')}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'people'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                People
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`flex-1 py-4 text-center font-semibold transition-colors ${
                  activeTab === 'media'
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Media
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : activeTab === 'people' ? (
            users.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <UsersIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No users found</p>
              </div>
            ) : (
              <div>
                {users.map((user) => (
                  <Link
                    key={user.id}
                    to={`/switter/u/${user.handle}`}
                    className="block border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar_url || 'https://via.placeholder.com/48'}
                        alt={user.display_name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{user.display_name}</p>
                          {user.verified_badge && <span className="text-blue-500">✓</span>}
                        </div>
                        <p className="text-gray-500 text-sm">@{user.handle}</p>
                        {user.bio && <p className="text-sm mt-1">{user.bio}</p>}
                        <p className="text-sm text-gray-500 mt-1">{user.follower_count} followers</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : tweets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No sweets found</p>
              <p className="text-sm mt-1">Try different search terms or filters</p>
            </div>
          ) : (
            <div>
              {tweets.map((tweet) => (
                <TweetCard
                  key={tweet.id}
                  tweet={tweet}
                  author={tweet.author}
                />
              ))}
            </div>
          )}
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
