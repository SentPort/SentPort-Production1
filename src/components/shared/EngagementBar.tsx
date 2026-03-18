import { ThumbsUp, ThumbsDown, MessageCircle, Share2, Flag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface EngagementBarProps {
  platform: 'hubook' | 'heddit' | 'hutube' | 'hinsta' | 'switter' | 'hublog';
  contentType: string;
  contentId: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialCommentCount: number;
  initialShareCount: number;
  onCommentClick?: () => void;
  onReportClick?: () => void;
  onShareClick?: () => void;
  onCommentCountChange?: (newCount: number) => void;
}

export default function EngagementBar({
  platform,
  contentType,
  contentId,
  initialLikeCount,
  initialDislikeCount,
  initialCommentCount,
  initialShareCount,
  onCommentClick,
  onReportClick,
  onShareClick,
  onCommentCountChange
}: EngagementBarProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [shareCount, setShareCount] = useState(initialShareCount);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCommentCount(initialCommentCount);
  }, [initialCommentCount]);

  useEffect(() => {
    loadUserReactionState();
  }, [contentId]);

  const loadUserReactionState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [likeCheck, dislikeCheck] = await Promise.all([
        supabase
          .from('platform_likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('platform', platform)
          .eq('content_type', contentType)
          .eq('content_id', contentId)
          .maybeSingle(),
        supabase
          .from('platform_dislikes')
          .select('id')
          .eq('user_id', user.id)
          .eq('platform', platform)
          .eq('content_type', contentType)
          .eq('content_id', contentId)
          .maybeSingle()
      ]);

      setHasLiked(!!likeCheck.data);
      setHasDisliked(!!dislikeCheck.data);
    } catch (error) {
      console.error('Error loading user reaction state:', error);
    }
  };

  useEffect(() => {
    if (onCommentCountChange) {
      onCommentCountChange(commentCount);
    }
  }, [commentCount, onCommentCountChange]);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (hasLiked) {
        await supabase
          .from('platform_likes')
          .delete()
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .eq('platform', platform)
          .eq('content_type', contentType)
          .eq('content_id', contentId);

        setLikeCount(prev => prev - 1);
        setHasLiked(false);
      } else {
        if (hasDisliked) {
          await supabase
            .from('platform_dislikes')
            .delete()
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .eq('platform', platform)
            .eq('content_type', contentType)
            .eq('content_id', contentId);

          setDislikeCount(prev => prev - 1);
          setHasDisliked(false);
        }

        await supabase
          .from('platform_likes')
          .insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            platform,
            content_type: contentType,
            content_id: contentId
          });

        setLikeCount(prev => prev + 1);
        setHasLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDislike = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (hasDisliked) {
        await supabase
          .from('platform_dislikes')
          .delete()
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .eq('platform', platform)
          .eq('content_type', contentType)
          .eq('content_id', contentId);

        setDislikeCount(prev => prev - 1);
        setHasDisliked(false);
      } else {
        if (hasLiked) {
          await supabase
            .from('platform_likes')
            .delete()
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .eq('platform', platform)
            .eq('content_type', contentType)
            .eq('content_id', contentId);

          setLikeCount(prev => prev - 1);
          setHasLiked(false);
        }

        await supabase
          .from('platform_dislikes')
          .insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            platform,
            content_type: contentType,
            content_id: contentId
          });

        setDislikeCount(prev => prev + 1);
        setHasDisliked(true);
      }
    } catch (error) {
      console.error('Error toggling dislike:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (onShareClick) {
      onShareClick();
    } else {
      if (loading) return;
      setLoading(true);

      try {
        await supabase
          .from('platform_shares')
          .insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            platform,
            content_type: contentType,
            content_id: contentId
          });

        setShareCount(prev => prev + 1);
      } catch (error) {
        console.error('Error sharing:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleLike}
        disabled={loading}
        className={`flex items-center gap-1 transition-colors ${
          hasLiked ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
        }`}
      >
        <ThumbsUp size={20} fill={hasLiked ? 'currentColor' : 'none'} />
        <span className="text-sm font-medium">{likeCount}</span>
      </button>

      <button
        onClick={handleDislike}
        disabled={loading}
        className={`flex items-center gap-1 transition-colors ${
          hasDisliked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
        }`}
      >
        <ThumbsDown size={20} fill={hasDisliked ? 'currentColor' : 'none'} />
        <span className="text-sm font-medium">{dislikeCount}</span>
      </button>

      <button
        onClick={onCommentClick}
        className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
      >
        <MessageCircle size={20} />
        <span className="text-sm font-medium">{commentCount}</span>
      </button>

      <button
        onClick={handleShare}
        disabled={loading}
        className="flex items-center gap-1 text-gray-600 hover:text-green-600 transition-colors"
      >
        <Share2 size={20} />
        <span className="text-sm font-medium">{shareCount}</span>
      </button>

      <button
        onClick={onReportClick}
        className="flex items-center gap-1 text-gray-600 hover:text-orange-600 transition-colors ml-auto"
      >
        <Flag size={20} />
        <span className="text-sm">Report Fake Content</span>
      </button>
    </div>
  );
}