import { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import FollowButton from './FollowButton';
import { Link } from 'react-router-dom';

interface FollowersModalProps {
  accountId: string;
  username: string;
  isOpen: boolean;
  onClose: () => void;
  mode: 'followers' | 'following';
}

interface UserItem {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  follower_count: number;
}

export default function FollowersModal({
  accountId,
  username,
  isOpen,
  onClose,
  mode
}: FollowersModalProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen, accountId, mode]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      if (mode === 'followers') {
        const { data, error } = await supabase
          .from('blog_follows')
          .select(`
            follower:follower_id (
              id,
              username,
              display_name,
              avatar_url,
              bio,
              follower_count
            )
          `)
          .eq('following_id', accountId);

        if (error) throw error;

        setUsers((data || []).map((item: any) => item.follower).filter(Boolean));
      } else {
        const { data, error } = await supabase
          .from('blog_follows')
          .select(`
            following:following_id (
              id,
              username,
              display_name,
              avatar_url,
              bio,
              follower_count
            )
          `)
          .eq('follower_id', accountId);

        if (error) throw error;

        setUsers((data || []).map((item: any) => item.following).filter(Boolean));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      ></div>
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'followers' ? `@${username}'s Followers` : `@${username} is Following`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">
                {mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
              <p className="text-sm mt-2">
                {mode === 'followers'
                  ? 'Be the first to follow!'
                  : 'Discover great writers to follow'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Link to={`/blog/@${user.username}`} onClick={onClose}>
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-white text-xl font-bold">
                        {user.display_name[0]?.toUpperCase()}
                      </div>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/blog/@${user.username}`}
                      onClick={onClose}
                      className="hover:underline"
                    >
                      <h3 className="font-bold text-lg text-gray-900">
                        {user.display_name}
                      </h3>
                      <p className="text-gray-600 text-sm">@{user.username}</p>
                    </Link>
                    {user.bio && (
                      <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                        {user.bio}
                      </p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      {user.follower_count} followers
                    </p>
                  </div>

                  <div>
                    <FollowButton
                      authorId={user.id}
                      authorUsername={user.username}
                      variant="compact"
                      onFollowChange={loadUsers}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
