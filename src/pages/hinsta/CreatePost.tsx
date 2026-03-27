import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHinstaNotification } from '../../contexts/HinstaNotificationContext';
import ImageUpload from '../../components/hinsta/ImageUpload';
import { savePostHashtags } from '../../lib/hinstaHashtagHelpers';

interface CreatePostProps {
  onClose: () => void;
  onPostCreated: () => void;
}

const STORAGE_KEY = 'hinsta_draft_post';

export default function CreatePost({ onClose, onPostCreated }: CreatePostProps) {
  const { user } = useAuth();
  const location = useLocation();
  const { showSuccess, showError } = useHinstaNotification();
  const [caption, setCaption] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [locationText, setLocationText] = useState('');
  const [loading, setLoading] = useState(false);
  const hadContentRef = useRef(false);
  const mountPathRef = useRef(location.pathname);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setCaption(data.caption || '');
        setMediaUrls(data.mediaUrls || []);
        setLocationText(data.location || '');
        if (data.caption || data.mediaUrls?.length > 0 || data.location) {
          hadContentRef.current = true;
        }
      } catch (e) {
        console.error('Error restoring draft:', e);
      }
    }

    return () => {
      if (location.pathname !== mountPathRef.current) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    };
  }, [location.pathname]);

  useEffect(() => {
    if (caption || mediaUrls.length > 0 || locationText) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ caption, mediaUrls, location: locationText }));
      hadContentRef.current = true;
    } else if (hadContentRef.current && !caption && mediaUrls.length === 0 && !locationText) {
      sessionStorage.removeItem(STORAGE_KEY);
      hadContentRef.current = false;
    }
  }, [caption, mediaUrls, locationText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || mediaUrls.length === 0) return;

    setLoading(true);

    try {
      const { data: account } = await supabase
        .from('hinsta_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!account) {
        showError('Please create a Hinsta account first');
        return;
      }

      const { data: newPost, error } = await supabase
        .from('hinsta_posts')
        .insert({
          author_id: account.id,
          caption: caption.trim(),
          media_url: mediaUrls[0],
          media_urls: mediaUrls,
          location: locationText.trim() || null,
          media_type: 'image'
        })
        .select()
        .single();

      if (error) throw error;

      if (newPost) {
        await savePostHashtags(newPost.id, caption);
      }

      sessionStorage.removeItem(STORAGE_KEY);
      showSuccess('Post shared successfully');
      onPostCreated();
    } catch (error: any) {
      console.error('Error creating post:', error);
      showError(error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Create New Post</h2>
          <button onClick={handleClose} className="text-gray-600 hover:text-gray-900">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <ImageUpload
            onMultipleUpload={setMediaUrls}
            bucket="hinsta-posts"
            maxSizeMB={10}
            accept="image/*"
            multiple={true}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              maxLength={2200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {caption.length}/2200 characters
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              Location (Optional)
            </label>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="Add location..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              maxLength={100}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mediaUrls.length === 0 || loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Posting...
                </>
              ) : (
                'Share Post'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
