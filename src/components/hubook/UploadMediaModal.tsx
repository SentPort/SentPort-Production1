import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Video, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import SelectAlbumCoverModal from './SelectAlbumCoverModal';

interface UploadMediaModalProps {
  albumId: string;
  albumName: string;
  onClose: () => void;
  onMediaUploaded: () => void;
}

interface UploadFile {
  file: File;
  preview: string;
  caption: string;
  uploading: boolean;
  progress: number;
  error: string;
}

export default function UploadMediaModal({ albumId, albumName, onClose, onMediaUploaded }: UploadMediaModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCoverSelection, setShowCoverSelection] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ id: string; media_url: string; caption: string | null }[]>([]);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = [];
    Array.from(selectedFiles).forEach((file) => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        newFiles.push({
          file,
          preview: URL.createObjectURL(file),
          caption: '',
          uploading: false,
          progress: 0,
          error: ''
        });
      }
    });

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleUpload = async () => {
    if (!user || files.length === 0) return;

    console.log('Starting upload for album:', albumId, 'Files:', files.length);
    setUploading(true);

    let successCount = 0;
    let failCount = 0;
    const newPhotos: { id: string; media_url: string; caption: string | null }[] = [];

    // Check if album already has a cover before uploading
    const { data: existingCover } = await supabase
      .from('album_media')
      .select('id')
      .eq('album_id', albumId)
      .eq('is_album_cover', true)
      .maybeSingle();

    const albumHasCover = !!existingCover;

    for (let i = 0; i < files.length; i++) {
      const uploadFile = files[i];

      setFiles(prev => prev.map((f, idx) =>
        idx === i ? { ...f, uploading: true, error: '' } : f
      ));

      try {
        const fileExt = uploadFile.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${albumId}/${fileName}`;

        console.log(`Uploading file ${i + 1}/${files.length} to storage:`, filePath);

        const { error: uploadError } = await supabase.storage
          .from('hubook-albums')
          .upload(filePath, uploadFile.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('hubook-albums')
          .getPublicUrl(filePath);

        console.log('File uploaded to storage, public URL:', publicUrl);

        const mediaType = uploadFile.file.type.startsWith('video/') ? 'video' : 'image';

        console.log('Inserting into album_media table:', {
          album_id: albumId,
          media_type: mediaType,
          caption: uploadFile.caption.trim() || null
        });

        const { data: insertedMedia, error: insertError } = await supabase
          .from('album_media')
          .insert({
            album_id: albumId,
            media_url: publicUrl,
            media_type: mediaType,
            caption: uploadFile.caption.trim() || null,
            display_order: i
          })
          .select()
          .single();

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw insertError;
        }

        console.log(`File ${i + 1} uploaded successfully`);
        successCount++;

        // Collect photos (not videos) for cover selection
        if (mediaType === 'image' && insertedMedia) {
          newPhotos.push({
            id: insertedMedia.id,
            media_url: insertedMedia.media_url,
            caption: insertedMedia.caption
          });
        }

        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, uploading: false, progress: 100 } : f
        ));
      } catch (err: any) {
        console.error('Error uploading file:', err);
        failCount++;
        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, uploading: false, error: err.message || 'Upload failed' } : f
        ));
      }
    }

    setUploading(false);

    console.log(`Upload complete. Success: ${successCount}, Failed: ${failCount}`);

    // Only close and refresh if at least one file succeeded
    if (successCount > 0) {
      console.log('Refreshing album media...');
      // Wait a moment for database consistency
      await new Promise(resolve => setTimeout(resolve, 500));

      // Finalize pending album batches to create posts
      try {
        await supabase.rpc('finalize_pending_album_batches', { force_immediate: true });
      } catch (error) {
        console.error('Error finalizing album batches:', error);
      }

      // Check if we need to show cover selection modal
      // Show if: no existing cover AND multiple new photos uploaded
      if (!albumHasCover && newPhotos.length > 1) {
        setUploadedPhotos(newPhotos);
        setShowCoverSelection(true);
      } else {
        // Otherwise just refresh and close
        onMediaUploaded();
        if (failCount === 0) {
          onClose();
        }
      }
    } else {
      // All uploads failed, show error message
      alert('All uploads failed. Please check the errors and try again.');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  };

  return (
    <>
      {showCoverSelection ? (
        <SelectAlbumCoverModal
          albumId={albumId}
          albumName={albumName}
          newPhotos={uploadedPhotos}
          onClose={() => {
            setShowCoverSelection(false);
            onMediaUploaded();
            onClose();
          }}
          onCoverSelected={() => {
            setShowCoverSelection(false);
            onMediaUploaded();
            onClose();
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Upload Photos & Videos</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {files.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-600 bg-blue-100'
                  : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
              }`}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragging ? 'Drop files here' : 'Click to upload photos and videos'}
              </p>
              <p className="text-sm text-gray-600">
                Supports JPG, PNG, WebP, GIF, MP4, WebM, MOV
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Max file size: 100MB
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {files.map((uploadFile, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {uploadFile.file.type.startsWith('video/') ? (
                        <div className="relative w-full h-full">
                          <video
                            src={uploadFile.preview}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                            <Video className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={uploadFile.preview}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                      {uploadFile.uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <Loader className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    {!uploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <input
                      type="text"
                      value={uploadFile.caption}
                      onChange={(e) => {
                        setFiles(prev => prev.map((f, idx) =>
                          idx === index ? { ...f, caption: e.target.value } : f
                        ));
                      }}
                      placeholder="Add a caption..."
                      disabled={uploading}
                      className="w-full mt-2 px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                    {uploadFile.error && (
                      <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                disabled={uploading}
                className={`w-full py-3 border-2 border-dashed rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-blue-600 text-blue-600 bg-blue-100'
                    : 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <Upload className="w-5 h-5" />
                {isDragging ? 'Drop files here' : 'Add More Files'}
              </button>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="border-t border-gray-200 p-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {files.length} {files.length === 1 ? 'file' : 'files'} selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
          </div>
        </div>
      )}
    </>
  );
}
