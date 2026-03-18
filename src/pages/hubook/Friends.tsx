import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Users, UserPlus, UserMinus, MessageCircle, Search } from 'lucide-react';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function Friends() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'all' | 'requests' | 'sent' | null;
  const { user } = useAuth();
  const { hubookProfile } = useHuBook();
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'sent'>(tabParam || 'all');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (hubookProfile) {
      fetchFriends();
      fetchRequests();
    }
  }, [hubookProfile]);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchFriends = async () => {
    if (!hubookProfile) return;

    const { data } = await supabase
      .from('friendships')
      .select('*, requester:hubook_profiles!requester_id(*), addressee:hubook_profiles!addressee_id(*)')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${hubookProfile.id},addressee_id.eq.${hubookProfile.id}`);

    const friendProfiles = (data || []).map((friendship) => {
      return friendship.requester_id === hubookProfile.id
        ? { ...friendship.addressee, friendship_id: friendship.id }
        : { ...friendship.requester, friendship_id: friendship.id };
    });

    setFriends(friendProfiles);
    setLoading(false);
  };

  const fetchRequests = async () => {
    if (!hubookProfile) return;

    const [pendingRes, sentRes] = await Promise.all([
      supabase
        .from('friendships')
        .select('*, requester:hubook_profiles!requester_id(*)')
        .eq('addressee_id', hubookProfile.id)
        .eq('status', 'pending'),
      supabase
        .from('friendships')
        .select('*, addressee:hubook_profiles!addressee_id(*)')
        .eq('requester_id', hubookProfile.id)
        .eq('status', 'pending')
    ]);

    setPendingRequests(pendingRes.data || []);
    setSentRequests(sentRes.data || []);
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);

    fetchFriends();
    fetchRequests();
  };

  const handleRejectRequest = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    fetchRequests();
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;

    await supabase.from('friendships').delete().eq('id', friendshipId);
    fetchFriends();
  };

  const startConversation = async (friendId: string) => {
    if (!hubookProfile || !user) return;

    // Check if conversation already exists
    const { data: existingConversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (existingConversations) {
      for (const conv of existingConversations) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.conversation_id);

        if (participants?.length === 2) {
          const userIds = participants.map(p => p.user_id);
          if (userIds.includes(user.id) && userIds.includes(friendId)) {
            navigate(`/hubook/messages?conversation=${conv.conversation_id}`);
            return;
          }
        }
      }
    }

    // Create new conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (!convError && newConv) {
      await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: friendId }
        ]);

      navigate(`/hubook/messages?conversation=${newConv.id}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/hubook/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for people to add as friends..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-4 px-6">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              All Friends ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Friend Requests ({pendingRequests.length})
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                activeTab === 'sent'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Sent Requests ({sentRequests.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No friends yet</h3>
                  <p className="text-gray-600">Start connecting with people to build your network!</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    <Link to={`/hubook/user/${friend.id}`} className="flex items-center gap-4 flex-1">
                      {friend.profile_photo_url ? (
                        <img
                          src={friend.profile_photo_url}
                          alt={friend.display_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xl">
                          {friend.display_name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{friend.display_name}</h4>
                        {friend.work && <p className="text-sm text-gray-600">{friend.work}</p>}
                      </div>
                    </Link>

                    <div className="flex gap-2">
                      <button
                        onClick={() => startConversation(friend.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Send message"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend.friendship_id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove friend"
                      >
                        <UserMinus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="space-y-4">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending requests</h3>
                  <p className="text-gray-600">You have no friend requests at the moment.</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    {request.requester.profile_photo_url ? (
                      <img
                        src={request.requester.profile_photo_url}
                        alt={request.requester.display_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold text-xl">
                        {request.requester.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{request.requester.display_name}</h4>
                      {request.requester.work && <p className="text-sm text-gray-600">{request.requester.work}</p>}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'sent' && (
            <div className="space-y-4">
              {sentRequests.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No sent requests</h3>
                  <p className="text-gray-600">You haven't sent any friend requests.</p>
                </div>
              ) : (
                sentRequests.map((request) => (
                  <div key={request.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    {request.addressee.profile_photo_url ? (
                      <img
                        src={request.addressee.profile_photo_url}
                        alt={request.addressee.display_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold text-xl">
                        {request.addressee.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{request.addressee.display_name}</h4>
                      {request.addressee.work && <p className="text-sm text-gray-600">{request.addressee.work}</p>}
                      <p className="text-sm text-gray-500 mt-1">Request pending</p>
                    </div>

                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel Request
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
