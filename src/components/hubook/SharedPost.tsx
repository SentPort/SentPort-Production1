import { useState } from 'react';
import { Share2, Globe, Users as FriendsIcon, Lock, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import Post from './Post';
import { useNavigate } from 'react-router-dom';
import { useHuBook } from '../../contexts/HuBookContext';
import { supabase } from '../../lib/supabase';
import HuBookMentionTextarea from './HuBookMentionTextarea';
import HuBookContentRenderer from './HuBookContentRenderer';

interface SharedPostProps {
  share: any;
  post: any;
  sharer: any;
  onUpdate?: () => void;
}

export default function SharedPost({ share, post, sharer, onUpdate }: SharedPostProps) {
  const navigate = useNavigate();
  const { hubookProfile } = useHuBook();
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editComment, setEditComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const privacyIcon = {
    public: Globe,
    friends: FriendsIcon,
    private: Lock
  }[share.privacy || 'public'];

  const PrivacyIcon = privacyIcon;

  const handleSharerClick = () => {
    navigate(hubookProfile?.id === sharer.id ? '/hubook/profile' : `/hubook/user/${sharer.id}`);
  };

  const handleDeleteShare = async () => {
    try {
      const { error } = await supabase
        .from('shares')
        .delete()
        .eq('id', share.id)
        .eq('user_id', hubookProfile?.id);

      if (error) throw error;

      setShowDeleteConfirm(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting share:', error);
    }
  };

  const handleEditShare = async () => {
    if (!hubookProfile) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('shares')
        .update({ share_text: editComment.trim() || null })
        .eq('id', share.id)
        .eq('user_id', hubookProfile.id);

      if (error) throw error;

      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating share:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = () => {
    setEditComment(share.share_text || '');
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditComment('');
  };

  const isOwnShare = hubookProfile?.id === share.user_id;

  if (!sharer) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm mb-4">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div
            className="cursor-pointer flex-shrink-0"
            onClick={handleSharerClick}
          >
            {sharer.profile_photo_url ? (
              <img
                src={sharer.profile_photo_url}
                alt={sharer.display_name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold text-sm">
                {sharer.display_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleSharerClick}
                className="font-semibold text-gray-900 hover:underline"
              >
                {sharer.display_name}
              </button>
              <span className="text-gray-500">shared this</span>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>·</span>
                <span>{new Date(share.created_at).toLocaleDateString()}</span>
                <span>·</span>
                <PrivacyIcon className="w-3 h-3" />
              </div>
            </div>

{isEditing ? (
              <div className="mt-2">
                <HuBookMentionTextarea
                  value={editComment}
                  onChange={setEditComment}
                  placeholder="Add a comment about this post (optional)"
                  maxLength={500}
                  rows={3}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditShare}
                    disabled={isSaving}
                    className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              share.share_text && (
                <HuBookContentRenderer
                  content={share.share_text}
                  className="text-gray-700 mt-2"
                />
              )
            )}
          </div>

          {isOwnShare && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-600" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  <button
                    onClick={handleStartEdit}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Share
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Share
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-0">
        <Post post={post} onUpdate={onUpdate} isEmbedded={true} />
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Share?</h3>
            <p className="text-gray-600 mb-6">
              This will remove your share from your profile and feed. The original post will not be affected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteShare}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
