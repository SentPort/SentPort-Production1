import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface BookmarkButtonProps {
  postId: string;
  onBookmarkChange?: (isBookmarked: boolean) => void;
  variant?: 'default' | 'compact';
  showCount?: boolean;
}

export default function BookmarkButton({
  postId,
  onBookmarkChange,
  variant = 'default',
  showCount = true
}: BookmarkButtonProps) {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [myBlogAccountId, setMyBlogAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadBookmarkData();
    }
  }, [user, postId]);

  const loadBookmarkData = async () => {
    if (!user) return;

    try {
      const { data: myAccount } = await supabase
        .from('blog_accounts')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!myAccount) return;
      setMyBlogAccountId(myAccount.id);

      const [bookmarkData, countData] = await Promise.all([
        supabase
          .from('blog_bookmarks')
          .select('id')
          .eq('post_id', postId)
          .eq('account_id', myAccount.id)
          .maybeSingle(),
        supabase
          .from('blog_posts')
          .select('bookmark_count')
          .eq('id', postId)
          .single()
      ]);

      setIsBookmarked(!!bookmarkData.data);
      if (countData.data) {
        setBookmarkCount(countData.data.bookmark_count || 0);
      }
    } catch (error) {
      console.error('Error loading bookmark data:', error);
    }
  };

  const handleBookmark = async () => {
    if (!user || !myBlogAccountId || isLoading) return;

    setIsLoading(true);
    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from('blog_bookmarks')
          .delete()
          .eq('post_id', postId)
          .eq('account_id', myBlogAccountId);

        if (error) throw error;

        setIsBookmarked(false);
        setBookmarkCount(prev => Math.max(0, prev - 1));
        onBookmarkChange?.(false);
      } else {
        const { error } = await supabase
          .from('blog_bookmarks')
          .insert({
            post_id: postId,
            account_id: myBlogAccountId
          });

        if (error) throw error;

        setIsBookmarked(true);
        setBookmarkCount(prev => prev + 1);
        onBookmarkChange?.(true);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !myBlogAccountId) {
    if (showCount && bookmarkCount > 0) {
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <Bookmark className="w-5 h-5" />
          <span className="text-sm">{bookmarkCount}</span>
        </div>
      );
    }
    return null;
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={handleBookmark}
        disabled={isLoading}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
          isBookmarked
            ? 'bg-amber-100 text-amber-700'
            : 'hover:bg-gray-100 text-gray-600'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isBookmarked ? 'Remove bookmark' : 'Save for later'}
      >
        <Bookmark
          className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`}
        />
        {showCount && bookmarkCount > 0 && (
          <span className="text-sm font-medium">{bookmarkCount}</span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleBookmark}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border ${
        isBookmarked
          ? 'bg-amber-100 border-amber-300 text-amber-700'
          : 'border-gray-200 hover:bg-gray-100 text-gray-600'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isBookmarked ? 'Remove bookmark' : 'Save for later'}
    >
      <Bookmark
        className={`w-5 h-5 ${isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`}
      />
      <span className="font-medium">
        {isBookmarked ? 'Saved' : 'Save'}
      </span>
      {showCount && bookmarkCount > 0 && (
        <span className="ml-1 text-sm">({bookmarkCount})</span>
      )}
    </button>
  );
}
