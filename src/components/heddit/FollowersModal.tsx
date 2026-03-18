import { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
}

interface FollowersModalProps {
  accountId: string;
  type: 'followers' | 'following';
  onClose: () => void;
}

export function FollowersModal({ accountId, type, onClose }: FollowersModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [accountId, type]);

  const loadUsers = async () => {
    const column = type === 'followers' ? 'following_id' : 'follower_id';
    const selectColumn = type === 'followers' ? 'follower_id' : 'following_id';

    const { data, error } = await supabase
      .from('heddit_follows')
      .select(`
        ${selectColumn},
        heddit_accounts!${selectColumn}(
          id,
          username,
          display_name,
          avatar_url,
          bio,
          follower_count
        )
      `)
      .eq(column, accountId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const usersList = data.map((item: any) => item.heddit_accounts).filter(Boolean);
      setUsers(usersList);
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            {type === 'followers' ? 'Followers' : 'Following'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <Link
                  key={user.id}
                  to={`/heddit/u/${user.username}`}
                  onClick={onClose}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-semibold">
                        {user.display_name[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">
                      {user.display_name}
                    </div>
                    <div className="text-sm text-gray-600">u/{user.username}</div>
                    {user.bio && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {user.bio}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {user.follower_count} followers
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
