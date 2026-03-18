import { useState, useEffect } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface FollowButtonProps {
  currentAccountId: string;
  targetAccountId: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({ currentAccountId, targetAccountId, onFollowChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    checkFollowStatus();
  }, [currentAccountId, targetAccountId]);

  const checkFollowStatus = async () => {
    const { data } = await supabase
      .from('heddit_follows')
      .select('id')
      .eq('follower_id', currentAccountId)
      .eq('following_id', targetAccountId)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    setLoading(true);

    const { error } = await supabase
      .from('heddit_follows')
      .insert({
        follower_id: currentAccountId,
        following_id: targetAccountId
      });

    if (!error) {
      setIsFollowing(true);
      onFollowChange?.(true);
    }

    setLoading(false);
  };

  const handleUnfollow = async () => {
    setLoading(true);

    const { error } = await supabase
      .from('heddit_follows')
      .delete()
      .eq('follower_id', currentAccountId)
      .eq('following_id', targetAccountId);

    if (!error) {
      setIsFollowing(false);
      setShowConfirm(false);
      onFollowChange?.(false);
    }

    setLoading(false);
  };

  if (isFollowing) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-red-500 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          <UserMinus className="w-4 h-4" />
          Following
        </button>

        {showConfirm && (
          <div className="absolute top-full mt-2 right-0 bg-white border-2 border-gray-200 rounded-lg shadow-lg p-4 w-64 z-10">
            <p className="text-sm text-gray-700 mb-3">
              Are you sure you want to unfollow this user?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleUnfollow}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                Unfollow
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
    >
      <UserPlus className="w-4 h-4" />
      Follow
    </button>
  );
}
