import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, UserPlus, UserCheck, Clock, Lock } from 'lucide-react';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';

export default function UserSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { hubookProfile } = useHuBook();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendships, setFriendships] = useState<Map<string, any>>(new Map());
  const [privacySettings, setPrivacySettings] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (query) {
      searchUsers(query);
    }
  }, [query, hubookProfile]);

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
    setLoading(true);

    const { data } = await supabase
      .from('hubook_profiles')
      .select('*')
      .or(`display_name.ilike.%${searchQuery}%,work.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,education.ilike.%${searchQuery}%,interests.ilike.%${searchQuery}%`)
      .neq('id', hubookProfile?.id || '')
      .limit(50);

    setResults(data || []);

    // Load privacy settings for all users
    if (data && data.length > 0) {
      const { data: privacyData } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .in('user_id', data.map(u => u.id));

      const privacyMap = new Map();
      (privacyData || []).forEach(setting => {
        privacyMap.set(setting.user_id, setting);
      });
      setPrivacySettings(privacyMap);
    }

    setLoading(false);
  };

  const sendFriendRequest = async (userId: string) => {
    if (!hubookProfile) return;

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: hubookProfile.id,
        addressee_id: userId,
        status: 'pending'
      });

    if (error) {
      // Show user-friendly error message if privacy blocks the request
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

  const getFriendshipStatus = (userId: string) => {
    const friendship = friendships.get(userId);
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
    if (!privacy) return true; // Default to allowing if no settings found

    if (privacy.friend_request_privacy === 'no_one') {
      return false;
    }

    // For friends_of_friends, we'd need to check mutual friends
    // For now, we'll show the button but let the backend validate
    return true;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Search className="w-6 h-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            Search Results for "{query}"
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">Try a different search term</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((user) => {
              const friendshipStatus = getFriendshipStatus(user.id);

              return (
                <div key={user.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <Link to={`/hubook/user/${user.id}`} className="flex items-center gap-4 flex-1">
                    {user.profile_photo_url ? (
                      <img
                        src={user.profile_photo_url}
                        alt={user.display_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xl">
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{user.display_name}</h3>
                      {user.work && <p className="text-sm text-gray-600">{user.work}</p>}
                      {user.location && <p className="text-sm text-gray-500">{user.location}</p>}
                      {user.interests && (
                        <p className="text-sm text-gray-500 mt-1">
                          Interests: {user.interests}
                        </p>
                      )}
                    </div>
                  </Link>

                  <div>
                    {friendshipStatus?.type === 'friends' ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 font-medium rounded-lg">
                        <UserCheck className="w-5 h-5" />
                        Friends
                      </div>
                    ) : friendshipStatus?.type === 'sent' ? (
                      <button
                        onClick={() => cancelFriendRequest(friendshipStatus.friendship.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Clock className="w-5 h-5" />
                        Request Sent
                      </button>
                    ) : friendshipStatus?.type === 'received' ? (
                      <Link
                        to="/hubook/friends?tab=requests"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        Respond to Request
                      </Link>
                    ) : !canSendFriendRequest(user.id) ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 font-medium rounded-lg cursor-not-allowed" title="This user is not accepting friend requests">
                        <Lock className="w-5 h-5" />
                        Not Accepting Requests
                      </div>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(user.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <UserPlus className="w-5 h-5" />
                        Add Friend
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
