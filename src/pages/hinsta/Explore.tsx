import { useState, useEffect } from 'react';
import { Search, TrendingUp, Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import HinstaLayout from '../../components/shared/HinstaLayout';
import PlatformGuard from '../../components/shared/PlatformGuard';

export default function Explore() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadTrendingAndSuggested();
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadTrendingAndSuggested = async () => {
    setLoading(true);

    const { data: postsData } = await supabase
      .from('hinsta_posts')
      .select('*')
      .eq('is_archived', false)
      .neq('status', 'paused')
      .order('like_count', { ascending: false })
      .limit(12);

    const { data: myAccount } = await supabase
      .from('hinsta_accounts')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();

    let suggestedQuery = supabase
      .from('hinsta_accounts')
      .select('*')
      .order('follower_count', { ascending: false })
      .limit(5);

    if (myAccount) {
      const { data: followingData } = await supabase
        .from('hinsta_follows')
        .select('following_id')
        .eq('follower_id', myAccount.id);

      const followingIds = followingData?.map(f => f.following_id) || [];
      followingIds.push(myAccount.id);

      suggestedQuery = suggestedQuery.not('id', 'in', `(${followingIds.join(',')})`);
    }

    const { data: usersData } = await suggestedQuery;

    setTrendingPosts(postsData || []);
    setSuggestedUsers(usersData || []);
    setLoading(false);
  };

  const performSearch = async () => {
    setSearching(true);

    const query = searchQuery.trim().toLowerCase();

    const { data: usersData } = await supabase
      .from('hinsta_accounts')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(10);

    setSearchResults(usersData || []);
    setSearching(false);
  };

  return (
    <PlatformGuard platform="hinsta" redirectTo="/hinsta/join">
      <HinstaLayout>
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-12 pr-4 py-3 bg-gray-100 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>

            {searchQuery && (
              <div className="mt-4 bg-white border border-gray-200 rounded-lg divide-y">
                {searching ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-8 text-center text-gray-600">
                    No users found
                  </div>
                ) : (
                  searchResults.map((account) => (
                    <Link
                      key={account.id}
                      to={`/hinsta/profile/${account.username}`}
                      className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
                        <div className="w-full h-full rounded-full bg-white p-0.5">
                          {account.avatar_url ? (
                            <img src={account.avatar_url} alt={account.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                              {account.username[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{account.username}</p>
                        <p className="text-sm text-gray-600">{account.display_name}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          {!searchQuery && (
            <>
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-gray-700" />
                  <h2 className="text-xl font-bold">Suggested for you</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestedUsers.map((account) => (
                    <div key={account.id} className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5 mx-auto mb-4">
                        <div className="w-full h-full rounded-full bg-white p-0.5">
                          {account.avatar_url ? (
                            <img src={account.avatar_url} alt={account.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-2xl">
                              {account.username[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <Link to={`/hinsta/profile/${account.username}`} className="font-semibold hover:opacity-70">
                        {account.username}
                      </Link>
                      <p className="text-sm text-gray-600 mb-1">{account.display_name}</p>
                      <p className="text-xs text-gray-500 mb-4">{account.follower_count} followers</p>
                      <Link
                        to={`/hinsta/profile/${account.username}`}
                        className="block w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600"
                      >
                        View Profile
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-gray-700" />
                  <h2 className="text-xl font-bold">Trending posts</h2>
                </div>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {trendingPosts.map((post) => (
                      <Link
                        key={post.id}
                        to={`/hinsta/post/${post.id}`}
                        className="aspect-square bg-gray-100 relative group overflow-hidden"
                      >
                        {(post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : post.media_url) ? (
                          <img
                            src={post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : post.media_url}
                            alt={post.caption}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200" />
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="text-white font-semibold flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              ❤️ {post.like_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              💬 {post.comment_count || 0}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </HinstaLayout>
    </PlatformGuard>
  );
}
