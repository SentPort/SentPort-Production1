import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, Hash, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PlatformGuard from '../../components/shared/PlatformGuard';
import SwitterLayout from '../../components/shared/SwitterLayout';
import { SearchWithHistory } from '../../components/shared/SearchWithHistory';

interface SearchResult {
  type: 'user' | 'tweet' | 'hashtag';
  data: any;
}

export default function SwitterSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'top' | 'people' | 'hashtags'>('top');

  useEffect(() => {
    if (query.length > 1) {
      const timer = setTimeout(() => {
        performSearch();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query, activeTab]);

  const performSearch = async () => {
    setLoading(true);

    const searchResults: SearchResult[] = [];

    if (activeTab === 'top' || activeTab === 'people') {
      const { data: users } = await supabase
        .from('switter_accounts')
        .select('*')
        .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (users) {
        users.forEach(user => {
          searchResults.push({ type: 'user', data: user });
        });
      }
    }

    if (activeTab === 'top') {
      const { data: tweets } = await supabase
        .from('switter_tweets')
        .select('*, switter_accounts(handle, display_name, avatar_url)')
        .textSearch('content', query)
        .eq('status', 'active')
        .limit(10);

      if (tweets) {
        tweets.forEach(tweet => {
          searchResults.push({ type: 'tweet', data: tweet });
        });
      }
    }

    if (activeTab === 'top' || activeTab === 'hashtags') {
      const { data: hashtags } = await supabase
        .from('switter_hashtags')
        .select('*')
        .ilike('tag', `%${query}%`)
        .order('usage_count', { ascending: false })
        .limit(10);

      if (hashtags) {
        hashtags.forEach(hashtag => {
          searchResults.push({ type: 'hashtag', data: hashtag });
        });
      }
    }

    setResults(searchResults);
    setLoading(false);
  };

  return (
    <PlatformGuard platform="switter" redirectTo="/switter/join">
      <SwitterLayout showBackButton>
        <div className="max-w-2xl mx-auto min-h-screen bg-white border-x border-gray-200">
          <div className="sticky top-16 z-10 bg-white border-b border-gray-200">
            <div className="p-4">
              <SearchWithHistory
                value={query}
                onChange={setQuery}
                platform="switter"
                placeholder="Search Switter"
              />
            </div>

            <div className="flex border-t border-gray-200">
              {['top', 'people', 'hashtags'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`flex-1 py-3 text-center font-semibold capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-blue-500 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : results.length === 0 && query.length > 1 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              results.map((result, index) => {
                if (result.type === 'user') {
                  return (
                    <Link
                      key={`user-${index}`}
                      to={`/switter/u/${result.data.handle}`}
                      className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-200 transition-colors"
                    >
                      <img
                        src={result.data.avatar_url || 'https://via.placeholder.com/48'}
                        alt={result.data.display_name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold truncate">{result.data.display_name}</p>
                          {result.data.verified_badge && (
                            <span className="text-blue-500">✓</span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm truncate">@{result.data.handle}</p>
                        {result.data.bio && (
                          <p className="text-gray-700 text-sm truncate mt-1">{result.data.bio}</p>
                        )}
                      </div>
                      <Users className="w-5 h-5 text-gray-400" />
                    </Link>
                  );
                } else if (result.type === 'hashtag') {
                  return (
                    <Link
                      key={`hashtag-${index}`}
                      to={`/switter/hashtag/${result.data.tag}`}
                      className="flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-200 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <Hash className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold">#{result.data.tag}</p>
                        <p className="text-gray-500 text-sm">
                          {result.data.usage_count} tweets
                        </p>
                      </div>
                    </Link>
                  );
                } else {
                  return (
                    <Link
                      key={`tweet-${index}`}
                      to={`/switter/tweet/${result.data.id}`}
                      className="block p-4 hover:bg-gray-50 border-b border-gray-200 transition-colors"
                    >
                      <div className="flex gap-3">
                        <img
                          src={result.data.switter_accounts.avatar_url || 'https://via.placeholder.com/48'}
                          alt={result.data.switter_accounts.display_name}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold truncate">
                              {result.data.switter_accounts.display_name}
                            </span>
                            <span className="text-gray-500 truncate">
                              @{result.data.switter_accounts.handle}
                            </span>
                          </div>
                          <p className="text-gray-900 whitespace-pre-wrap line-clamp-3">
                            {result.data.content}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                }
              })
            )}

            {query.length <= 1 && (
              <div className="text-center py-12 text-gray-500">
                <SearchIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Try searching for people, tweets, or hashtags</p>
              </div>
            )}
          </div>
        </div>
      </SwitterLayout>
    </PlatformGuard>
  );
}
