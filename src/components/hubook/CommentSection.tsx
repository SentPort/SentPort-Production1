import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';
import Comment from './Comment';
import CustomMentionTextarea from './CustomMentionTextarea';
import { saveMentions, renderMentionsAsLinks } from '../../lib/mentionHelpers';

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
        await saveMentions('comment', data.id, newComment, hubookProfile.id);
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
    <div className="p-4">
      <form onSubmit={handleSubmitComment} className="mb-4">
        <div className="flex gap-2">
          {hubookProfile?.profile_photo_url ? (
            <img
              src={hubookProfile.profile_photo_url}
              alt={hubookProfile.display_name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-sm font-semibold">
              {hubookProfile?.display_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 flex gap-2">
            <CustomMentionTextarea
              value={newComment}
              onChange={setNewComment}
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || loading}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
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
