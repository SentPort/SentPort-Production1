import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Album {
  id: string;
  album_name: string;
  media_count?: number;
}

interface DeleteAlbumModalProps {
  album: Album;
  onClose: () => void;
  onAlbumDeleted: () => void;
}

export default function DeleteAlbumModal({ album, onClose, onAlbumDeleted }: DeleteAlbumModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      // First, get all media to clean up storage files
      const { data: media } = await supabase
        .from('album_media')
        .select('media_url')
        .eq('album_id', album.id);

      // Clean up storage files before deleting database records
      if (media && media.length > 0) {
        const filePaths = media.map(m => {
          const url = new URL(m.media_url);
          return url.pathname.split('/').slice(-3).join('/');
        });

        await supabase.storage
          .from('hubook-albums')
          .remove(filePaths);
      }

      // Delete the album - CASCADE constraints will automatically delete:
      // - album_media records
      // - album_upload_batches records
      // This avoids trigger conflicts that occur when manually deleting child records
      const { error: albumError } = await supabase
        .from('albums')
        .delete()
        .eq('id', album.id);

      if (albumError) throw albumError;

      onAlbumDeleted();
      onClose();
    } catch (err: any) {
      console.error('Error deleting album:', err);
      setError(err.message || 'Failed to delete album');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Delete Album</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Warning</h3>
              <p className="text-sm text-red-700">
                This will permanently delete the album "{album.album_name}" and all {album.media_count || 0} items in it. This action cannot be undone.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Album
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
