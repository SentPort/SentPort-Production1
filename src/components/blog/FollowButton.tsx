import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface FollowButtonProps {
  authorId: string;
  authorUsername: string;
  onFollowChange?: (isFollowing: boolean) => void;
  variant?: 'default' | 'compact';
}

export default function FollowButton({
  authorId,
  authorUsername,
  onFollowChange,
  variant = 'default'
}: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [myBlogAccountId, setMyBlogAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkFollowStatus();
    }
  }, [user, authorId]);

  const checkFollowStatus = async () => {
    if (!user) return;

    try {
      const { data: myAccount } = await supabase
        .from('blog_accounts')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!myAccount) return;

      setMyBlogAccountId(myAccount.id);

      const { data } = await supabase
        .from('blog_follows')
        .select('id')
        .eq('follower_id', myAccount.id)
        .eq('following_id', authorId)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user || !myBlogAccountId || authorId === myBlogAccountId) return;

    setIsLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('blog_follows')
          .delete()
          .eq('follower_id', myBlogAccountId)
          .eq('following_id', authorId);

        if (error) throw error;
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        const { error } = await supabase
          .from('blog_follows')
          .insert({
            follower_id: myBlogAccountId,
            following_id: authorId
          });

        if (error) throw error;
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !myBlogAccountId || authorId === myBlogAccountId) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleFollow}
        disabled={isLoading}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
          isFollowing
            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    );
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className={`px-6 py-2.5 rounded-lg font-semibold transition-all transform hover:scale-105 ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 shadow-lg'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {isFollowing ? 'Unfollowing...' : 'Following...'}
        </span>
      ) : (
        <>
          {isFollowing ? 'Following' : `Follow @${authorUsername}`}
        </>
      )}
    </button>
  );
}
