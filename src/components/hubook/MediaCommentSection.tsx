import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';
import MediaComment from './MediaComment';
import MentionTextarea from './MentionTextarea';
import { saveMentions } from '../../lib/mentionHelpers';

interface MediaCommentSectionProps {
  mediaId: string;
  canComment: boolean;
}

export default function MediaCommentSection({ mediaId, canComment }: MediaCommentSectionProps) {
  const { hubookProfile } = useHuBook();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    fetchComments();
  }, [mediaId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('album_media_comments')
        .select('*')
        .eq('media_id', mediaId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);

      const { count } = await supabase
        .from('album_media_comments')
        .select('*', { count: 'exact', head: true })
        .eq('media_id', mediaId);

      setCommentCount(count || 0);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !hubookProfile || !canComment) return;

    setIsSubmitting(true);
    try {
      const { data: comment, error } = await supabase
        .from('album_media_comments')
        .insert({
          media_id: mediaId,
          author_id: hubookProfile.id,
          content: newComment.trim()
        })
        .select()
        .single();

      if (error) throw error;

      if (comment) {
        await saveMentions('media_comment', comment.id, newComment.trim(), hubookProfile.id);
      }

      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-gray-900 hover:text-blue-600 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">
            {commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}
          </span>
        </button>
      </div>

      {showComments && (
        <div className="space-y-4">
          {canComment && hubookProfile && (
            <div className="mb-4">
              <div className="flex gap-2">
                <div className="flex-shrink-0">
                  {hubookProfile.profile_photo_url ? (
                    <img
                      src={hubookProfile.profile_photo_url}
                      alt={hubookProfile.display_name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-semibold">
                      {hubookProfile.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-2xl p-2">
                    <MentionTextarea
                      value={newComment}
                      onChange={setNewComment}
                      placeholder="Write a comment..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  {newComment.trim() && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSubmitComment}
                        disabled={isSubmitting}
                        className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Posting...' : 'Post'}
                      </button>
                      <button
                        onClick={() => setNewComment('')}
                        className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-full hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No comments yet</p>
              {canComment && <p className="text-xs mt-1">Be the first to comment</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <MediaComment
                  key={comment.id}
                  comment={comment}
                  mediaId={mediaId}
                  onUpdate={fetchComments}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
