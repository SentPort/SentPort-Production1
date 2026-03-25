import { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, Link as LinkIcon, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  file?: File;
  uploading?: boolean;
}

interface HedditMediaUploaderProps {
  onMediaChange: (mediaUrls: string[], mediaTypes: string[]) => void;
  maxFiles?: number;
  initialMedia?: { urls: string[]; types: string[] };
}

export default function HedditMediaUploader({
  onMediaChange,
  maxFiles = 10,
  initialMedia
}: HedditMediaUploaderProps) {
  const { user } = useAuth();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlType, setUrlType] = useState<'image' | 'video'>('image');
  const [isInitialized, setIsInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize media items from props when editing a draft
  useEffect(() => {
    if (initialMedia && !isInitialized && initialMedia.urls.length > 0) {
      const items: MediaItem[] = initialMedia.urls.map((url, index) => ({
        url,
        type: (initialMedia.types[index] || 'image') as 'image' | 'video'
      }));
      setMediaItems(items);
      setIsInitialized(true);
    }
  }, [initialMedia, isInitialized]);

  // Sync state with parent component when media items change
  useEffect(() => {
    const completedItems = mediaItems.filter(item => !item.uploading);
    onMediaChange(
      completedItems.map(item => item.url),
      completedItems.map(item => item.type)
    );
  }, [mediaItems, onMediaChange]);

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const img = new window.Image();
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDimension = 1920;

                if (width > height && width > maxDimension) {
                  height = (height / width) * maxDimension;
                  width = maxDimension;
                } else if (height > maxDimension) {
                  width = (width / height) * maxDimension;
                  height = maxDimension;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                  (blob) => {
                    if (blob) {
                      resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    } else {
                      resolve(file);
                    }
                  },
                  'image/jpeg',
                  0.9
                );
              } catch (error) {
                console.error('Error during image compression:', error);
                resolve(file);
              }
            };
            img.onerror = () => {
              console.error('Error loading image for compression');
              resolve(file);
            };
            img.src = e.target?.result as string;
          } catch (error) {
            console.error('Error creating image:', error);
            resolve(file);
          }
        };
        reader.onerror = () => {
          console.error('Error reading file');
          resolve(file);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error in compressImage:', error);
        resolve(file);
      }
    });
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!user) return null;

    try {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        alert('Please upload only images or videos');
        return null;
      }

      // Validate file size
      const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for image
      if (file.size > maxSize) {
        alert(`File too large. Maximum size: ${isVideo ? '100MB' : '10MB'}`);
        return null;
      }

      // Compress image if needed
      const fileToUpload = isImage ? await compressImage(file) : file;

      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('heddit-media')
        .upload(fileName, fileToUpload);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Failed to upload file');
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('heddit-media')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
      return null;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.isArray(files) ? files : Array.from(files);

    if (mediaItems.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Create placeholder items
    const newItems: MediaItem[] = fileArray.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      file,
      uploading: true
    }));

    setMediaItems(prev => [...prev, ...newItems]);

    // Upload files
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      if (item.file) {
        const uploadedUrl = await uploadFile(item.file);

        setMediaItems(prev => {
          const updated = [...prev];
          const index = updated.findIndex(m => m.url === item.url);
          if (index !== -1) {
            if (uploadedUrl) {
              updated[index] = { ...updated[index], url: uploadedUrl, uploading: false };
            } else {
              updated.splice(index, 1);
            }
          }
          return updated;
        });
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeMedia = (index: number) => {
    setMediaItems(prev => prev.filter((_, i) => i !== index));
  };

  const addUrlMedia = () => {
    if (!urlInput.trim()) return;

    if (mediaItems.length >= maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setMediaItems(prev => [...prev, { url: urlInput, type: urlType }]);
    setUrlInput('');
    setShowUrlInput(false);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-orange-500 bg-orange-50'
            : 'border-gray-300 hover:border-orange-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />

        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />

        <p className="text-gray-700 mb-2">
          Drag and drop images or videos here
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse (max {maxFiles} files, 10MB for images, 100MB for videos)
        </p>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Browse Files
          </button>

          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            <LinkIcon className="w-4 h-4" />
            Add URL
          </button>
        </div>
      </div>

      {/* URL Input */}
      {showUrlInput && (
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setUrlType('image')}
              className={`flex-1 py-2 rounded transition-colors ${
                urlType === 'image'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ImageIcon className="w-4 h-4 inline mr-2" />
              Image
            </button>
            <button
              type="button"
              onClick={() => setUrlType('video')}
              className={`flex-1 py-2 rounded transition-colors ${
                urlType === 'video'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <VideoIcon className="w-4 h-4 inline mr-2" />
              Video
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={`Enter ${urlType} URL`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addUrlMedia();
                }
              }}
            />
            <button
              type="button"
              onClick={addUrlMedia}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Media Preview Grid */}
      {mediaItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {mediaItems.map((item, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-300">
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <VideoIcon className="w-12 h-12 text-white" />
                  </div>
                )}

                {item.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              {!item.uploading && (
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                {item.type === 'image' ? 'Image' : 'Video'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Counter */}
      {mediaItems.length > 0 && (
        <p className="text-sm text-gray-600 text-center">
          {mediaItems.filter(item => !item.uploading).length} / {maxFiles} files
        </p>
      )}
    </div>
  );
}
