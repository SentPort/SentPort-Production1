import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, UserPlus, UserCheck, Clock, Lock, Users, Filter, X } from 'lucide-react';
import { useHuBook } from '../../contexts/HuBookContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SearchResult {
  profile_id: string;
  user_id: string;
  display_name: string;
  profile_photo_url: string | null;
  work: string | null;
  location: string | null;
  bio: string | null;
  tier: number;
  mutual_friends_count: number;
  activity_score: number;
  match_score: number;
}

export default function UserSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { user } = useAuth();
  const { hubookProfile } = useHuBook();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendships, setFriendships] = useState<Map<string, any>>(new Map());
  const [privacySettings, setPrivacySettings] = useState<Map<string, any>>(new Map());
  const [filterTier, setFilterTier] = useState<number | null>(null);

  useEffect(() => {
    if (query && user) {
      searchUsers(query);
    }
  }, [query, user]);

  useEffect(() => {
    if (hubookProfile) {
      fetchFriendships();
    }
  }, [hubookProfile]);

  const fetchFriendships = async () => {
    if (!hubookProfile) return;

    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${hubookProfile.id},addressee_id.eq.${hubookProfile.id}`);

    const friendshipMap = new Map();
    (data || []).forEach((friendship) => {
      const otherId = friendship.requester_id === hubookProfile.id
        ? friendship.addressee_id
        : friendship.requester_id;
      friendshipMap.set(otherId, friendship);
    });

    setFriendships(friendshipMap);
  };

  const searchUsers = async (searchQuery: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_hubook_users_tiered', {
        search_query: searchQuery.trim(),
        current_user_id: user.id,
        result_limit: 100
      });

      if (error) throw error;
      setResults(data || []);

      // Load privacy settings for all users
      if (data && data.length > 0) {
        const { data: privacyData } = await supabase
          .from('user_privacy_settings')
          .select('*')
          .in('user_id', data.map((u: SearchResult) => u.user_id));

        const privacyMap = new Map();
        (privacyData || []).forEach(setting => {
          privacyMap.set(setting.user_id, setting);
        });
        setPrivacySettings(privacyMap);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (profileId: string) => {
    if (!hubookProfile) return;

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: hubookProfile.id,
        addressee_id: profileId,
        status: 'pending'
      });

    if (error) {
      if (error.message.includes('restricted who can send them friend requests')) {
        alert('This user has restricted who can send them friend requests.');
      } else {
        alert('Failed to send friend request. Please try again.');
      }
    } else {
      fetchFriendships();
    }
  };

  const cancelFriendRequest = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    fetchFriendships();
  };

  const getFriendshipStatus = (profileId: string) => {
    const friendship = friendships.get(profileId);
    if (!friendship) return null;

    if (friendship.status === 'accepted') {
      return { type: 'friends', friendship };
    } else if (friendship.requester_id === hubookProfile?.id) {
      return { type: 'sent', friendship };
    } else {
      return { type: 'received', friendship };
    }
  };

  const canSendFriendRequest = (userId: string) => {
    const privacy = privacySettings.get(userId);
    if (!privacy) return true;

    if (privacy.friend_request_privacy === 'no_one') {
      return false;
    }

    return true;
  };

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 1: return 'Your Friends';
      case 2: return 'Friends of Friends';
      case 3: return 'Other People';
      default: return 'Results';
    }
  };

  const getTierBadge = (tier: number, mutualFriends: number) => {
    if (tier === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
          <Users className="w-3 h-3" />
          Friend
        </span>
      );
    } else if (tier === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
          <Users className="w-3 h-3" />
          Friend of Friend {mutualFriends > 0 && `• ${mutualFriends} mutual`}
        </span>
      );
    }
    return null;
  };

  const filteredResults = filterTier !== null
    ? results.filter(r => r.tier === filterTier)
    : results;

  const tier1Results = results.filter(r => r.tier === 1);
  const tier2Results = results.filter(r => r.tier === 2);
  const tier3Results = results.filter(r => r.tier === 3);

  const renderUserCard = (user: SearchResult) => {
    const friendshipStatus = getFriendshipStatus(user.profile_id);

    return (
      <div key={user.profile_id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all">
        <Link to={`/hubook/user/${user.profile_id}`} className="flex items-center gap-4 flex-1 min-w-0">
          {user.profile_photo_url ? (
            <img
              src={user.profile_photo_url}
              alt={user.display_name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-lg truncate">{user.display_name}</h3>
              {getTierBadge(user.tier, user.mutual_friends_count)}
            </div>
            {user.work && <p className="text-sm text-gray-700 truncate">{user.work}</p>}
            {user.location && <p className="text-sm text-gray-500 truncate">{user.location}</p>}
            {user.bio && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{user.bio}</p>}
          </div>
        </Link>

        <div className="flex-shrink-0">
          {friendshipStatus?.type === 'friends' ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 font-semibold rounded-lg border border-green-200">
              <UserCheck className="w-5 h-5" />
              Friends
            </div>
          ) : friendshipStatus?.type === 'sent' ? (
            <button
              onClick={() => cancelFriendRequest(friendshipStatus.friendship.id)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
            >
              <Clock className="w-5 h-5" />
              Pending
            </button>
          ) : friendshipStatus?.type === 'received' ? (
            <Link
              to="/hubook/friends?tab=requests"
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
            >
              Respond
            </Link>
          ) : !canSendFriendRequest(user.user_id) ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 font-semibold rounded-lg cursor-not-allowed border border-gray-300" title="This user is not accepting friend requests">
              <Lock className="w-5 h-5" />
              Restricted
            </div>
          ) : (
            <button
              onClick={() => sendFriendRequest(user.profile_id)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <UserPlus className="w-5 h-5" />
              Add Friend
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Search className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Search Results
            </h1>
          </div>

          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterTier(null)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterTier === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All ({results.length})
                </button>
                {tier1Results.length > 0 && (
                  <button
                    onClick={() => setFilterTier(1)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filterTier === 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Friends ({tier1Results.length})
                  </button>
                )}
                {tier2Results.length > 0 && (
                  <button
                    onClick={() => setFilterTier(2)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filterTier === 2
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Friends of Friends ({tier2Results.length})
                  </button>
                )}
                {tier3Results.length > 0 && (
                  <button
                    onClick={() => setFilterTier(3)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      filterTier === 3
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Others ({tier3Results.length})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {query && (
          <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              Searching for: <span className="font-semibold">"{query}"</span>
              {results.length > 0 && (
                <span className="ml-2">• Found {results.length} {results.length === 1 ? 'result' : 'results'}</span>
              )}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Searching...</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600 mb-4">We couldn't find anyone matching "{query}"</p>
            <p className="text-sm text-gray-500">Try searching for:</p>
            <ul className="text-sm text-gray-500 mt-2 space-y-1">
              <li>• A different name or spelling</li>
              <li>• Their workplace or location</li>
              <li>• Their interests or education</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-8">
            {filterTier === null ? (
              <>
                {tier1Results.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-blue-200">
                      <Users className="w-5 h-5 text-blue-600" />
                      <h2 className="text-lg font-bold text-blue-900">Your Friends</h2>
                      <span className="ml-auto text-sm text-gray-600">{tier1Results.length} {tier1Results.length === 1 ? 'result' : 'results'}</span>
                    </div>
                    <div className="space-y-3">
                      {tier1Results.map(renderUserCard)}
                    </div>
                  </div>
                )}

                {tier2Results.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-green-200">
                      <Users className="w-5 h-5 text-green-600" />
                      <h2 className="text-lg font-bold text-green-900">Friends of Friends</h2>
                      <span className="ml-auto text-sm text-gray-600">{tier2Results.length} {tier2Results.length === 1 ? 'result' : 'results'}</span>
                    </div>
                    <div className="space-y-3">
                      {tier2Results.map(renderUserCard)}
                    </div>
                  </div>
                )}

                {tier3Results.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-gray-200">
                      <Search className="w-5 h-5 text-gray-600" />
                      <h2 className="text-lg font-bold text-gray-900">Other People</h2>
                      <span className="ml-auto text-sm text-gray-600">{tier3Results.length} {tier3Results.length === 1 ? 'result' : 'results'}</span>
                    </div>
                    <div className="space-y-3">
                      {tier3Results.map(renderUserCard)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-blue-200">
                  <h2 className="text-lg font-bold text-gray-900">{getTierLabel(filterTier)}</h2>
                  <span className="ml-auto text-sm text-gray-600">
                    {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'}
                  </span>
                </div>
                <div className="space-y-3">
                  {filteredResults.map(renderUserCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
