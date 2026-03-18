import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Media {
  id: string;
  media_url: string;
  caption: string | null;
}

interface SelectAlbumCoverModalProps {
  albumId: string;
  albumName: string;
  newPhotos: Media[];
  onClose: () => void;
  onCoverSelected: () => void;
}

export default function SelectAlbumCoverModal({
  albumId,
  albumName,
  newPhotos,
  onClose,
  onCoverSelected
}: SelectAlbumCoverModalProps) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>(newPhotos[0]?.id || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedPhotoId) return;

    setSaving(true);
    try {
      // First, clear is_album_cover from all other photos in this album
      const { error: clearError } = await supabase
        .from('album_media')
        .update({ is_album_cover: false })
        .eq('album_id', albumId)
        .neq('id', selectedPhotoId);

      if (clearError) throw clearError;

      // Then set the selected photo as the album cover
      const { error: setError } = await supabase
        .from('album_media')
        .update({ is_album_cover: true })
        .eq('id', selectedPhotoId);

      if (setError) throw setError;

      onCoverSelected();
      onClose();
    } catch (error) {
      console.error('Error setting album cover:', error);
      alert('Failed to set album cover. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    // Just use the first photo as the default
    setSaving(true);
    try {
      const firstPhotoId = newPhotos[0]?.id;
      if (firstPhotoId) {
        // Clear is_album_cover from all other photos in this album
        const { error: clearError } = await supabase
          .from('album_media')
          .update({ is_album_cover: false })
          .eq('album_id', albumId)
          .neq('id', firstPhotoId);

        if (clearError) throw clearError;

        // Set the first photo as the album cover
        const { error: setError } = await supabase
          .from('album_media')
          .update({ is_album_cover: true })
          .eq('id', firstPhotoId);

        if (setError) throw setError;
      }

      onCoverSelected();
      onClose();
    } catch (error) {
      console.error('Error setting default album cover:', error);
      alert('Failed to set album cover. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Choose Album Cover</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select a photo to use as the cover for "{albumName}"
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {newPhotos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedPhotoId(photo.id)}
                className={`relative aspect-square rounded-lg overflow-hidden border-4 transition-all ${
                  selectedPhotoId === photo.id
                    ? 'border-blue-600 shadow-lg'
                    : 'border-transparent hover:border-blue-300'
                }`}
              >
                <img
                  src={photo.media_url}
                  alt={photo.caption || ''}
                  className="w-full h-full object-cover"
                />
                {selectedPhotoId === photo.id && (
                  <div className="absolute inset-0 bg-blue-600 bg-opacity-20 flex items-center justify-center">
                    <div className="bg-blue-600 rounded-full p-2">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 flex items-center justify-between gap-4">
          <button
            onClick={handleSkip}
            disabled={saving}
            className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Use First Photo
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedPhotoId}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Setting Cover...' : 'Set as Cover'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
