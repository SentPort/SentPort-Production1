import { useState } from 'react';
import { X, Loader2, Type } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHinstaNotification } from '../../contexts/HinstaNotificationContext';
import ImageUpload from './ImageUpload';

interface CreateStoryProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateStory({ onClose, onCreated }: CreateStoryProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useHinstaNotification();
  const [mediaUrl, setMediaUrl] = useState('');
  const [textOverlay, setTextOverlay] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl || !user) return;

    setSubmitting(true);

    try {
      const { data: account } = await supabase
        .from('hinsta_accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!account) throw new Error('Account not found');

      const { error } = await supabase.from('hinsta_stories').insert({
        account_id: account.id,
        media_url: mediaUrl,
        text_overlay: textOverlay || null,
        media_type: 'image'
      });

      if (error) throw error;

      showSuccess('Story created successfully');
      onCreated();
    } catch (error: any) {
      showError(error.message || 'Failed to create story');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Create Story</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <ImageUpload
            onUpload={setMediaUrl}
            bucket="hinsta-stories"
            maxSizeMB={10}
            accept="image/*,video/*"
          />

          {mediaUrl && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Type className="w-4 h-4" />
                Text Overlay (Optional)
              </label>
              <input
                type="text"
                value={textOverlay}
                onChange={(e) => setTextOverlay(e.target.value)}
                placeholder="Add text to your story..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                {textOverlay.length}/100 characters
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!mediaUrl || submitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sharing...
                </>
              ) : (
                'Share to Story'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
