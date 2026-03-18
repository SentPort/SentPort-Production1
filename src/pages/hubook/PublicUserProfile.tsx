import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Briefcase, GraduationCap, Heart, UserPlus, UserCheck, Clock, ArrowLeft, Users, MessageCircle, Lock, AlertCircle } from 'lucide-react';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';

export default function PublicUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { hubookProfile } = useHuBook();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [friendship, setFriendship] = useState<any>(null);
  const [mutualFriendsCount, setMutualFriendsCount] = useState(0);
  const [privacySettings, setPrivacySettings] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userId && hubookProfile?.id === userId) {
      navigate('/hubook/profile', { replace: true });
      return;
    }
    if (userId) {
      fetchUser();
      fetchFriendship();
      fetchMutualFriends();
      fetchPrivacySettings();
    }
  }, [userId, hubookProfile]);

  const fetchUser = async () => {
    const { data } = await supabase
      .from('hubook_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    setUser(data);
    setLoading(false);
  };

  const fetchPrivacySettings = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('user_privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    setPrivacySettings(data || {
      friend_request_privacy: 'everyone',
      messaging_privacy: 'everyone'
    });
  };

  const fetchFriendship = async () => {
    if (!hubookProfile || !userId) return;

    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${hubookProfile.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${hubookProfile.id})`)
      .maybeSingle();

    setFriendship(data);
  };

  const fetchMutualFriends = async () => {
    if (!hubookProfile || !userId) return;

    // Get my friends
    const { data: myFriends } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${hubookProfile.id},addressee_id.eq.${hubookProfile.id}`);

    // Get their friends
    const { data: theirFriends } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    const myFriendIds = new Set(
      (myFriends || []).map((f) =>
        f.requester_id === hubookProfile.id ? f.addressee_id : f.requester_id
      )
    );

    const theirFriendIds = new Set(
      (theirFriends || []).map((f) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      )
    );

    const mutual = [...myFriendIds].filter((id) => theirFriendIds.has(id));
    setMutualFriendsCount(mutual.length);
  };

  const sendFriendRequest = async () => {
    if (!hubookProfile || !userId) return;

    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: hubookProfile.id,
        addressee_id: userId,
        status: 'pending'
      });

    if (error) {
      if (error.message.includes('restricted who can send them friend requests')) {
        setErrorMessage('This user has restricted who can send them friend requests.');
      } else {
        setErrorMessage('Failed to send friend request. Please try again.');
      }
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      fetchFriendship();
    }
  };

  const cancelFriendRequest = async () => {
    if (!friendship) return;

    await supabase
      .from('friendships')
      .delete()
      .eq('id', friendship.id);

    setFriendship(null);
  };

  const acceptFriendRequest = async () => {
    if (!friendship) return;

    await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendship.id);

    fetchFriendship();
  };

  const startConversation = async () => {
    if (!hubookProfile || !userId) return;

    // Check if conversation already exists
    const { data: existingConversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', hubookProfile.id);

    if (existingConversations) {
      for (const conv of existingConversations) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.conversation_id);

        if (participants?.length === 2) {
          const userIds = participants.map(p => p.user_id);
          if (userIds.includes(hubookProfile.id) && userIds.includes(userId)) {
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

    if (convError) {
      if (convError.message.includes('restricted who can send them messages')) {
        setErrorMessage('This user has restricted who can message them.');
      } else {
        setErrorMessage('Failed to start conversation. Please try again.');
      }
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    if (newConv) {
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: hubookProfile.id },
          { conversation_id: newConv.id, user_id: userId }
        ]);

      if (participantError) {
        setErrorMessage('Failed to start conversation. Please try again.');
        setTimeout(() => setErrorMessage(null), 5000);
      } else {
        navigate(`/hubook/messages?conversation=${newConv.id}`);
      }
    }
  };

  const canSendFriendRequest = () => {
    if (!privacySettings) return true;
    return privacySettings.friend_request_privacy !== 'no_one';
  };

  const canSendMessage = () => {
    if (!privacySettings) return true;
    if (privacySettings.messaging_privacy === 'no_one') return false;
    if (privacySettings.messaging_privacy === 'friends_only' && friendship?.status !== 'accepted') return false;
    return true;
  };

  const getFriendshipButton = () => {
    if (!friendship) {
      if (!canSendFriendRequest()) {
        return (
          <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-500 font-medium rounded-lg cursor-not-allowed" title="This user is not accepting friend requests">
            <Lock className="w-5 h-5" />
            Not Accepting Requests
          </div>
        );
      }

      return (
        <button
          onClick={sendFriendRequest}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add Friend
        </button>
      );
    }

    if (friendship.status === 'accepted') {
      return (
        <div className="flex items-center gap-2 px-6 py-2.5 bg-green-50 text-green-700 font-medium rounded-lg">
          <UserCheck className="w-5 h-5" />
          Friends
        </div>
      );
    }

    if (friendship.requester_id === hubookProfile?.id) {
      return (
        <button
          onClick={cancelFriendRequest}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Clock className="w-5 h-5" />
          Request Sent
        </button>
      );
    }

    return (
      <div className="flex gap-2">
        <button
          onClick={acceptFriendRequest}
          className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Accept Request
        </button>
        <button
          onClick={cancelFriendRequest}
          className="px-6 py-2.5 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
        >
          Decline
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">User not found</h2>
        <p className="text-gray-600 mb-6">This user doesn't exist or has been removed.</p>
        <Link
          to="/hubook"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to HuBook
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to="/hubook"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to HuBook
      </Link>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="h-48 bg-gradient-to-r from-blue-400 to-blue-600"></div>

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-16 mb-4">
            <div className="flex items-end gap-4">
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={user.display_name}
                  className="w-32 h-32 rounded-full border-4 border-white object-cover bg-white"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-4xl">
                  {user.display_name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{user.display_name}</h1>
                {mutualFriendsCount > 0 && (
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <Users className="w-4 h-4" />
                    {mutualFriendsCount} mutual friend{mutualFriendsCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {hubookProfile?.id !== user.id && (
              <div className="mb-2 flex flex-col gap-2">
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {errorMessage}
                  </div>
                )}
                <div className="flex gap-2">
                  {getFriendshipButton()}
                  {friendship?.status === 'accepted' ? (
                    canSendMessage() ? (
                      <button
                        onClick={startConversation}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Message
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-500 font-medium rounded-lg cursor-not-allowed" title="This user has restricted messaging">
                        <Lock className="w-5 h-5" />
                        Messaging Restricted
                      </div>
                    )
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {user.bio && (
              <p className="text-gray-700">{user.bio}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
              {user.work && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Briefcase className="w-5 h-5 text-gray-500" />
                  <span>{user.work}</span>
                </div>
              )}

              {user.education && (
                <div className="flex items-center gap-3 text-gray-700">
                  <GraduationCap className="w-5 h-5 text-gray-500" />
                  <span>{user.education}</span>
                </div>
              )}

              {user.location && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="w-5 h-5 text-gray-500" />
                  <span>{user.location}</span>
                </div>
              )}

              {user.relationship_status && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Heart className="w-5 h-5 text-gray-500" />
                  <span>{user.relationship_status}</span>
                </div>
              )}
            </div>

            {user.interests && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Interests</h3>
                <p className="text-gray-700">{user.interests}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {friendship?.status === 'accepted' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">About {user.display_name}</h2>
          <p className="text-gray-600">
            You are friends with {user.display_name}. Posts and updates will appear in your news feed.
          </p>
        </div>
      )}
    </div>
  );
}
