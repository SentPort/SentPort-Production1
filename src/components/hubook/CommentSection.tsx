import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';
import Comment from './Comment';
import HuBookMentionTextarea from './HuBookMentionTextarea';
import { saveHuBookMentions } from '../../lib/hubookMentionHelpers';

interface CommentSectionProps {
  postId: string;
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const { hubookProfile } = useHuBook();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    setComments(data || []);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !hubookProfile) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.from('comments').insert({
        post_id: postId,
        author_id: hubookProfile.id,
        content: newComment.trim()
      }).select().single();

      if (error) throw error;

      if (data) {
        await saveHuBookMentions('comment', data.id, newComment.trim(), hubookProfile.id);
      }

      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-3">
      <form onSubmit={handleSubmitComment} className="mb-4">
        <div className="flex gap-3 items-start">
          {hubookProfile?.profile_photo_url ? (
            <img
              src={hubookProfile.profile_photo_url}
              alt={hubookProfile.display_name}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {hubookProfile?.display_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <HuBookMentionTextarea
              value={newComment}
              onChange={setNewComment}
              placeholder="Write a comment..."
              className="w-full px-4 py-2 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white"
              hideHelperText={true}
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!newComment.trim() || loading}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {comments.map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            postId={postId}
            onUpdate={fetchComments}
          />
        ))}
      </div>
    </div>
  );
}
