import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Video, Trash2, Search, Grid2x2 as Grid, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MediaFile {
  name: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  createdAt: Date;
}

interface MediaManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (url: string, type: 'image' | 'video') => void;
  subdomain: string;
  acceptedTypes?: 'image' | 'video' | 'both';
}

export default function MediaManager({
  isOpen,
  onClose,
  onSelectMedia,
  subdomain,
  acceptedTypes = 'both',
}: MediaManagerProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadMediaFiles();
    }
  }, [isOpen, subdomain]);

  const loadMediaFiles = async () => {
    setLoading(true);
    try {
      const { data: files, error } = await supabase.storage
        .from('builder-media')
        .list(subdomain, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      const mediaFiles: MediaFile[] = files.map((file) => {
        const { data } = supabase.storage.from('builder-media').getPublicUrl(`${subdomain}/${file.name}`);

        const type = file.metadata?.mimetype?.startsWith('video/') ? 'video' : 'image';

        return {
          name: file.name,
          url: data.publicUrl,
          type,
          size: file.metadata?.size || 0,
          createdAt: new Date(file.created_at),
        };
      });

      setMediaFiles(mediaFiles);
    } catch (error) {
      console.error('Error loading media files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate subdomain before attempting upload
    if (!subdomain || subdomain === 'default') {
      alert('Unable to upload: subdomain not configured. Please try reloading the page.');
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${subdomain}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('builder-media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error details:', uploadError);
          throw uploadError;
        }
      }

      await loadMediaFiles();
    } catch (error: any) {
      console.error('Error uploading file:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to upload file. ';
      if (error?.message?.includes('row-level security')) {
        errorMessage += 'You do not have permission to upload to this location. Please ensure you own this subdomain.';
      } else if (error?.message?.includes('already exists')) {
        errorMessage += 'A file with this name already exists.';
      } else if (error?.statusCode === '413') {
        errorMessage += 'File is too large. Maximum size is 10MB.';
      } else {
        errorMessage += error?.message || 'Please try again.';
      }

      alert(errorMessage);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const { error } = await supabase.storage
        .from('builder-media')
        .remove([`${subdomain}/${fileName}`]);

      if (error) throw error;

      await loadMediaFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  const filteredFiles = mediaFiles.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      acceptedTypes === 'both' ||
      (acceptedTypes === 'image' && file.type === 'image') ||
      (acceptedTypes === 'video' && file.type === 'video');
    return matchesSearch && matchesType;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getAcceptedMimeTypes = () => {
    if (acceptedTypes === 'image') return 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml';
    if (acceptedTypes === 'video') return 'video/mp4,video/webm,video/ogg';
    return 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/ogg';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Media Library</h2>
            <p className="text-sm text-gray-500 mt-1">Upload and manage your images and videos</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            <span>{uploading ? 'Uploading...' : 'Upload'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptedMimeTypes()}
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {acceptedTypes === 'video' ? (
                  <Video className="w-12 h-12 text-gray-400" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No media files yet</h3>
              <p className="text-gray-500 mb-4">Upload your first file to get started</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Upload Files
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.name}
                  className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                  onClick={() => {
                    onSelectMedia(file.url, file.type);
                    onClose();
                  }}
                >
                  {file.type === 'image' ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <Video className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <p className="text-white text-xs truncate">{file.name}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
                  onClick={() => {
                    onSelectMedia(file.url, file.type);
                    onClose();
                  }}
                >
                  <div className="w-16 h-16 flex-shrink-0 bg-gray-200 rounded-lg overflow-hidden">
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)} • {file.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
