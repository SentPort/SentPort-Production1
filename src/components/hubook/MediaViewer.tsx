import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Trash2, CreditCard as Edit2, ZoomIn, ZoomOut, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DeleteMediaModal from './DeleteMediaModal';
import MediaCommentSection from './MediaCommentSection';
import ReactionPicker, { ReactionType } from './ReactionPicker';
import { useAuth } from '../../contexts/AuthContext';

interface Media {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  uploaded_at: string;
  is_album_cover?: boolean;
}

interface MediaViewerProps {
  media: Media[];
  initialIndex: number;
  albumId?: string;
  onClose: () => void;
  onDelete: (mediaId: string) => void;
  onUpdate: () => void;
  canEdit: boolean;
  canComment?: boolean;
}

export default function MediaViewer({ media, initialIndex, albumId, onClose, onDelete, onUpdate, canEdit, canComment = false }: MediaViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [settingCover, setSettingCover] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<ReactionType | null>(null);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [loadingReaction, setLoadingReaction] = useState(false);

  const currentMedia = media[currentIndex];

  useEffect(() => {
    setCaption(currentMedia.caption || '');
    setEditingCaption(false);
    setZoom(1);
    fetchReactions();
  }, [currentIndex, currentMedia]);

  const fetchReactions = async () => {
    if (!user) return;

    try {
      const { data: reactionData, error: reactionError } = await supabase
        .from('album_media_reactions')
        .select('reaction_type')
        .eq('media_id', currentMedia.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (reactionError) throw reactionError;
      setCurrentReaction(reactionData?.reaction_type as ReactionType || null);

      const { data: countsData, error: countsError } = await supabase
        .from('album_media_reactions')
        .select('reaction_type')
        .eq('media_id', currentMedia.id);

      if (countsError) throw countsError;

      const counts: Record<string, number> = {};
      countsData?.forEach((r) => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
      });
      setReactionCounts(counts);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentMedia.media_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `media-${currentMedia.id}.${currentMedia.media_type === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading media:', error);
    }
  };

  const handleSaveCaption = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('album_media')
        .update({ caption: caption.trim() || null })
        .eq('id', currentMedia.id);

      if (error) throw error;

      setEditingCaption(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating caption:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSetAsAlbumCover = async () => {
    if (!albumId || currentMedia.media_type !== 'photo') return;

    setSettingCover(true);
    try {
      // First, clear is_album_cover from all other photos in this album
      const { error: clearError } = await supabase
        .from('album_media')
        .update({ is_album_cover: false })
        .eq('album_id', albumId)
        .neq('id', currentMedia.id);

      if (clearError) throw clearError;

      // Then set this photo as the album cover
      const { error: setError } = await supabase
        .from('album_media')
        .update({ is_album_cover: true })
        .eq('id', currentMedia.id);

      if (setError) throw setError;

      onUpdate();
    } catch (error) {
      console.error('Error setting album cover:', error);
      alert('Failed to set album cover. Please try again.');
    } finally {
      setSettingCover(false);
    }
  };

  const handleReaction = async (type: ReactionType) => {
    if (!user || loadingReaction) return;

    setLoadingReaction(true);
    try {
      if (currentReaction === type) {
        const { error } = await supabase
          .from('album_media_reactions')
          .delete()
          .eq('media_id', currentMedia.id)
          .eq('user_id', user.id);

        if (error) throw error;
        setCurrentReaction(null);

        setReactionCounts((prev) => {
          const newCounts = { ...prev };
          newCounts[type] = Math.max(0, (newCounts[type] || 0) - 1);
          if (newCounts[type] === 0) delete newCounts[type];
          return newCounts;
        });
      } else {
        const { error } = await supabase
          .from('album_media_reactions')
          .upsert({
            media_id: currentMedia.id,
            user_id: user.id,
            reaction_type: type
          });

        if (error) throw error;

        setReactionCounts((prev) => {
          const newCounts = { ...prev };
          if (currentReaction) {
            newCounts[currentReaction] = Math.max(0, (newCounts[currentReaction] || 0) - 1);
            if (newCounts[currentReaction] === 0) delete newCounts[currentReaction];
          }
          newCounts[type] = (newCounts[type] || 0) + 1;
          return newCounts;
        });
        setCurrentReaction(type);
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    } finally {
      setLoadingReaction(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-4 bg-black bg-opacity-80">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-white text-sm">
              {currentIndex + 1} / {media.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentMedia.media_type === 'photo' && (
              <>
                <button
                  onClick={() => setZoom(Math.max(1, zoom - 0.25))}
                  disabled={zoom <= 1}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                  disabled={zoom >= 3}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={handleDownload}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
            {canEdit && albumId && currentMedia.media_type === 'photo' && (
              <button
                onClick={handleSetAsAlbumCover}
                disabled={settingCover || currentMedia.is_album_cover}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 px-3 ${
                  currentMedia.is_album_cover
                    ? 'bg-blue-600 bg-opacity-80 text-white cursor-default'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
                title={currentMedia.is_album_cover ? 'Current album cover' : 'Set as album cover'}
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-sm">
                  {settingCover ? 'Setting...' : currentMedia.is_album_cover ? 'Album Cover' : 'Set as Cover'}
                </span>
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 text-white hover:bg-red-600 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-hidden relative">
          {media.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 z-10 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 z-10 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="max-w-7xl max-h-full flex items-center justify-center p-4">
            {currentMedia.media_type === 'video' ? (
              <video
                key={currentMedia.id}
                src={currentMedia.media_url}
                controls
                autoPlay
                className="max-w-full max-h-full"
              />
            ) : (
              <img
                key={currentMedia.id}
                src={currentMedia.media_url}
                alt={currentMedia.caption || ''}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            )}
          </div>
        </div>

        <div className="p-4 bg-black bg-opacity-80 space-y-4">
          {editingCaption && canEdit ? (
            <div className="flex items-center gap-2 max-w-4xl mx-auto">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="flex-1 px-4 py-2 bg-white bg-opacity-20 text-white placeholder-gray-400 border border-white border-opacity-30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={500}
                autoFocus
              />
              <button
                onClick={handleSaveCaption}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setCaption(currentMedia.caption || '');
                  setEditingCaption(false);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-2 max-w-4xl mx-auto">
              <p className="flex-1 text-white text-center">
                {currentMedia.caption || 'No caption'}
              </p>
              {canEdit && (
                <button
                  onClick={() => setEditingCaption(true)}
                  className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div className="max-w-4xl mx-auto border-t border-white border-opacity-20 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm">Reactions</h3>
              {Object.keys(reactionCounts).length > 0 && (
                <span className="text-sm text-gray-300">
                  {Object.values(reactionCounts).reduce((a, b) => a + b, 0)} reactions
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ReactionPicker
                onReact={handleReaction}
                currentReaction={currentReaction}
              />
              {Object.keys(reactionCounts).length > 0 && (
                <div className="flex items-center gap-2 ml-2 flex-wrap">
                  {Object.entries(reactionCounts).map(([type, count]) => {
                    const reactionEmojis: Record<string, string> = {
                      like: '👍',
                      love: '❤️',
                      laugh: '😂',
                      wow: '😮',
                      sad: '😢',
                      angry: '😠',
                      care: '🤗'
                    };
                    return (
                      <div key={type} className="flex items-center gap-1 text-sm bg-white bg-opacity-10 px-2 py-1 rounded-full">
                        <span>{reactionEmojis[type]}</span>
                        <span className="text-white font-medium">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-96 bg-white overflow-y-auto">
        <div className="p-4">
          <MediaCommentSection
            mediaId={currentMedia.id}
            canComment={canComment}
          />
        </div>
      </div>

      {showDeleteModal && (
        <DeleteMediaModal
          onConfirm={() => {
            setShowDeleteModal(false);
            onDelete(currentMedia.id);
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
