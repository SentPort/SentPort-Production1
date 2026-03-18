import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface FollowersModalProps {
  accountId: string;
  type: 'followers' | 'following';
  onClose: () => void;
}

interface FollowUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  isFollowing: boolean;
}

export default function FollowersModal({ accountId, type, onClose }: FollowersModalProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myAccount, setMyAccount] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadMyAccount();
    }
  }, [user]);

  useEffect(() => {
    if (myAccount) {
      loadUsers();
    }
  }, [myAccount, accountId, type]);

  const loadMyAccount = async () => {
    const { data } = await supabase
      .from('hinsta_accounts')
      .select('id')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (data) setMyAccount(data);
  };

  const loadUsers = async () => {
    setLoading(true);

    let query;
    if (type === 'followers') {
      query = supabase
        .from('hinsta_follows')
        .select('follower_id')
        .eq('following_id', accountId);
    } else {
      query = supabase
        .from('hinsta_follows')
        .select('following_id')
        .eq('follower_id', accountId);
    }

    const { data: followData } = await query;

    if (followData) {
      const userIds = type === 'followers'
        ? followData.map(f => f.follower_id)
        : followData.map(f => f.following_id);

      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from('hinsta_accounts')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds);

      if (userData) {
        const usersWithFollowStatus = await Promise.all(
          userData.map(async (u) => {
            if (u.id === myAccount.id) {
              return { ...u, isFollowing: false };
            }

            const { data: followCheck } = await supabase
              .from('hinsta_follows')
              .select('id')
              .eq('follower_id', myAccount.id)
              .eq('following_id', u.id)
              .maybeSingle();

            return {
              ...u,
              isFollowing: !!followCheck
            };
          })
        );

        setUsers(usersWithFollowStatus);
      }
    }

    setLoading(false);
  };

  const toggleFollow = async (targetUserId: string, currentlyFollowing: boolean) => {
    if (!myAccount || targetUserId === myAccount.id) return;

    try {
      if (currentlyFollowing) {
        await supabase
          .from('hinsta_follows')
          .delete()
          .eq('follower_id', myAccount.id)
          .eq('following_id', targetUserId);
      } else {
        await supabase
          .from('hinsta_follows')
          .insert({
            follower_id: myAccount.id,
            following_id: targetUserId
          });
      }

      setUsers(prev =>
        prev.map(u =>
          u.id === targetUserId ? { ...u, isFollowing: !currentlyFollowing } : u
        )
      );
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold capitalize">{type}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No {type} yet
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <Link
                    to={`/hinsta/${user.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 flex-1 hover:opacity-80"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5 flex-shrink-0">
                      <div className="w-full h-full rounded-full bg-white p-0.5">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={user.username}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                            {user.username[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{user.username}</div>
                      <div className="text-sm text-gray-500 truncate">{user.display_name}</div>
                    </div>
                  </Link>
                  {user.id !== myAccount.id && (
                    <button
                      onClick={() => toggleFollow(user.id, user.isFollowing)}
                      className={`px-6 py-1.5 rounded-lg font-semibold text-sm flex-shrink-0 ${
                        user.isFollowing
                          ? 'border border-gray-300 hover:bg-gray-50'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                      }`}
                    >
                      {user.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
