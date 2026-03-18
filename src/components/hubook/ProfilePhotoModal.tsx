import { useState } from 'react';
import { X, Camera, Palette } from 'lucide-react';
import { ImageUploadField } from './ImageUploadField';
import { supabase } from '../../lib/supabase';
import { useHuBook } from '../../contexts/HuBookContext';
import CoverDesignEditor from '../shared/CoverDesignEditor';
import ConfirmationDialog from '../shared/ConfirmationDialog';
import { compressImage, formatFileSize } from '../../lib/imageCompression';

interface ProfilePhotoModalProps {
  onClose: () => void;
  currentPhotoUrl?: string;
  photoType: 'profile' | 'cover';
}

export default function ProfilePhotoModal({ onClose, currentPhotoUrl, photoType }: ProfilePhotoModalProps) {
  const { hubookProfile, updateHuBookProfile } = useHuBook();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState(currentPhotoUrl || '');
  const [uploading, setUploading] = useState(false);
  const [showDesignEditor, setShowDesignEditor] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const handleSave = async () => {
    if (!hubookProfile) return;

    setUploading(true);
    try {
      let finalUrl = url;

      if (file) {
        const originalSize = file.size;
        const compressedFile = await compressImage(file, {
          maxSizeMB: photoType === 'profile' ? 0.3 : 0.5,
          maxWidthOrHeight: photoType === 'profile' ? 400 : 1920,
          quality: 0.85
        });

        console.log(`${photoType} photo compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressedFile.size)}`);

        const fileName = `${photoType}-${hubookProfile.id}-${Date.now()}.jpg`;
        const folder = photoType === 'profile' ? 'profiles' : 'covers';
        const filePath = `${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('hubook-profile-media')
          .upload(filePath, compressedFile, { upsert: true });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('hubook-profile-media')
          .getPublicUrl(filePath);

        finalUrl = publicUrl;
      }

      const updateField = photoType === 'profile' ? 'profile_photo_url' : 'cover_photo_url';

      const { error } = await supabase
        .from('hubook_profiles')
        .update({ [updateField]: finalUrl || null })
        .eq('id', hubookProfile.id);

      if (error) throw error;

      await updateHuBookProfile({ [updateField]: finalUrl || null });
      onClose();
    } catch (error) {
      console.error('Error updating photo:', error);
      alert('Failed to update photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveClick = () => {
    setShowConfirmRemove(true);
  };

  const handleConfirmRemove = async () => {
    if (!hubookProfile) return;

    setShowConfirmRemove(false);
    setUploading(true);
    try {
      const updateField = photoType === 'profile' ? 'profile_photo_url' : 'cover_photo_url';

      const { error } = await supabase
        .from('hubook_profiles')
        .update({ [updateField]: null })
        .eq('id', hubookProfile.id);

      if (error) throw error;

      await updateHuBookProfile({ [updateField]: null });
      onClose();
    } catch (error) {
      console.error('Error removing photo:', error);
      alert('Failed to remove photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDesign = async (designData: any) => {
    if (!hubookProfile) return;

    try {
      const { error } = await supabase
        .from('hubook_profiles')
        .update({ cover_design_data: designData })
        .eq('id', hubookProfile.id);

      if (error) throw error;

      await updateHuBookProfile({ cover_design_data: designData });
      setShowDesignEditor(false);
      onClose();
    } catch (error) {
      console.error('Error saving design:', error);
      alert('Failed to save design. Please try again.');
      throw error;
    }
  };

  if (showDesignEditor && photoType === 'cover') {
    return (
      <CoverDesignEditor
        platform="hubook"
        currentCoverData={hubookProfile?.cover_design_data}
        onSave={handleSaveDesign}
        onClose={() => setShowDesignEditor(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Update {photoType === 'profile' ? 'Profile' : 'Cover'} Photo
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {photoType === 'cover' && (
            <div className="mb-4">
              <button
                onClick={() => setShowDesignEditor(true)}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
              >
                <Palette className="w-5 h-5" />
                Design Custom Cover
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                Create a custom cover with photos, filters, and text
              </p>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or upload a simple photo</span>
                </div>
              </div>
            </div>
          )}

          <ImageUploadField
            label={`${photoType === 'profile' ? 'Profile' : 'Cover'} Photo`}
            currentValue={currentPhotoUrl}
            onFileChange={setFile}
            onUrlChange={setUrl}
            type={photoType}
          />

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={uploading || (!file && !url)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Saving...' : 'Save Photo'}
            </button>

            {currentPhotoUrl && (
              <button
                onClick={handleRemoveClick}
                disabled={uploading}
                className="px-4 py-2 bg-red-100 text-red-700 font-semibold rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Remove
              </button>
            )}

            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showConfirmRemove}
        title="Remove Photo"
        message={`Are you sure you want to remove this ${photoType === 'profile' ? 'profile' : 'cover'} photo? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleConfirmRemove}
        onCancel={() => setShowConfirmRemove(false)}
        variant="danger"
      />
    </div>
  );
}
