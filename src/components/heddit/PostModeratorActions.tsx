import { useState } from 'react';
import { MoreVertical, Pin, Trash2, PinOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHedditNotification } from '../../contexts/HedditNotificationContext';

interface PostModeratorActionsProps {
  postId: string;
  subredditId: string;
  isPinned: boolean;
  permissions: {
    pin_posts: boolean;
    delete_posts: boolean;
  };
  onUpdate: () => void;
}

export default function PostModeratorActions({
  postId,
  subredditId,
  isPinned,
  permissions,
  onUpdate
}: PostModeratorActionsProps) {
  const { showError, showSuccess } = useHedditNotification();
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePinToggle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('pin_heddit_post', {
        post_id: postId,
        subreddit_id: subredditId,
        should_pin: !isPinned
      });

      if (error) {
        console.error('Error toggling pin:', error);
        if (error.message?.includes('permission')) {
          showError('You do not have permission to pin posts in this community.');
        } else if (error.message?.includes('Maximum')) {
          showError('Maximum of 5 posts can be pinned at once in this community.');
        } else {
          showError('Failed to pin/unpin post. Please try again.');
        }
      } else {
        showSuccess(isPinned ? 'Post unpinned successfully' : 'Post pinned successfully');
        onUpdate();
      }
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('heddit_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        showError('Failed to delete post. Please try again.');
      } else {
        showSuccess('Post deleted successfully');
        onUpdate();
      }
    } finally {
      setLoading(false);
      setConfirmDelete(false);
      setShowMenu(false);
    }
  };

  if (!permissions.pin_posts && !permissions.delete_posts) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        title="Moderator actions"
      >
        <MoreVertical size={18} className="text-gray-600" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {permissions.pin_posts && (
              <button
                onClick={handlePinToggle}
                disabled={loading}
                className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 text-sm disabled:opacity-50"
              >
                {isPinned ? (
                  <>
                    <PinOff size={16} className="text-orange-600" />
                    <span>Unpin Post</span>
                  </>
                ) : (
                  <>
                    <Pin size={16} className="text-orange-600" />
                    <span>Pin Post</span>
                  </>
                )}
              </button>
            )}

            {permissions.delete_posts && (
              <>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-red-50 text-sm text-red-600"
                  >
                    <Trash2 size={16} />
                    <span>Delete Post</span>
                  </button>
                ) : (
                  <div className="px-4 py-2 border-t">
                    <p className="text-xs text-gray-600 mb-2">Delete this post?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="flex-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
