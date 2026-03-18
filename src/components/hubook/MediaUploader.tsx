import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Video as VideoIcon, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  file?: File;
  uploading?: boolean;
  error?: string;
}

interface MediaUploaderProps {
  onMediaChange: (urls: string[]) => void;
  maxFiles?: number;
}

export default function MediaUploader({ onMediaChange, maxFiles = 10 }: MediaUploaderProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('hubook-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('hubook-media')
      .getPublicUrl(uploadData.path);

    return publicUrl;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).slice(0, maxFiles - mediaItems.length);

    for (const file of newFiles) {
      if (file.size > 104857600) {
        alert(`File ${file.name} is too large. Maximum size is 100MB.`);
        continue;
      }

      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      const tempId = Math.random().toString(36);
      const tempUrl = URL.createObjectURL(file);

      setMediaItems(prev => [...prev, {
        id: tempId,
        url: tempUrl,
        type: mediaType,
        file,
        uploading: true
      }]);

      try {
        const uploadedUrl = await uploadFile(file);

        setMediaItems(prev => prev.map(item =>
          item.id === tempId
            ? { ...item, url: uploadedUrl, uploading: false, file: undefined }
            : item
        ));

        URL.revokeObjectURL(tempUrl);

        setMediaItems(current => {
          const urls = current
            .filter(item => !item.uploading && !item.error)
            .map(item => item.url);
          onMediaChange(urls);
          return current;
        });

      } catch (error) {
        console.error('Upload error:', error);
        setMediaItems(prev => prev.map(item =>
          item.id === tempId
            ? { ...item, uploading: false, error: 'Upload failed' }
            : item
        ));
      }
    }
  };

  const handleUrlAdd = () => {
    if (!urlInput.trim()) return;

    const mediaType = urlInput.match(/\.(mp4|mov|avi|webm)$/i) ? 'video' : 'image';
    const newItem: MediaItem = {
      id: Math.random().toString(36),
      url: urlInput.trim(),
      type: mediaType
    };

    setMediaItems(prev => [...prev, newItem]);
    onMediaChange([...mediaItems.map(item => item.url), newItem.url]);
    setUrlInput('');
    setShowUrlInput(false);
  };

  const handleRemove = (id: string) => {
    setMediaItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      onMediaChange(updated.map(item => item.url));
      return updated;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {mediaItems.map((item) => (
            <div key={item.id} className="relative group aspect-square">
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt="Upload preview"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
                  <VideoIcon className="w-12 h-12 text-white" />
                </div>
              )}

              {item.uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}

              {item.error && (
                <div className="absolute inset-0 bg-red-500 bg-opacity-75 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs px-2 text-center">{item.error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                disabled={item.uploading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {mediaItems.length < maxFiles && (
        <div className="space-y-3">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              Images or videos (max {maxFiles} files, 100MB each)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showUrlInput ? 'Hide URL input' : 'Or add media by URL'}
            </button>
          </div>

          {showUrlInput && (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Enter image or video URL"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleUrlAdd}
                disabled={!urlInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
