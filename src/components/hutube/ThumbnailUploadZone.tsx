import { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, AlertCircle } from 'lucide-react';

interface ThumbnailUploadZoneProps {
  onThumbnailSelected: (file: File | null, url: string | null) => void;
  thumbnailFile: File | null;
  thumbnailUrl: string;
  onUrlChange: (url: string) => void;
  uploadProgress: number;
}

export default function ThumbnailUploadZone({
  onThumbnailSelected,
  thumbnailFile,
  thumbnailUrl,
  onUrlChange,
  uploadProgress
}: ThumbnailUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [error, setError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  const validateImageFile = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'Invalid file format. Please upload JPG, PNG, WebP, or GIF images.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 5MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`;
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    onThumbnailSelected(file, null);
    onUrlChange('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    onThumbnailSelected(null, null);
    setPreviewUrl('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const displayPreview = previewUrl || thumbnailUrl;

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Thumbnail (optional)
          </label>
          <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUploadMethod('file')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              uploadMethod === 'file'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setUploadMethod('url')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              uploadMethod === 'url'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Use URL
          </button>
        </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Recommended size:</span> 1280x720 pixels (16:9 aspect ratio) for optimal display quality
          </p>
        </div>
      </div>

      {uploadMethod === 'file' ? (
        <div>
          {!thumbnailFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isDragging ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <Upload className={`w-6 h-6 ${isDragging ? 'text-red-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {isDragging ? 'Drop thumbnail here' : 'Drag and drop thumbnail'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    or click to browse
                  </p>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  <p>JPG, PNG, WebP, or GIF</p>
                  <p>Maximum file size: 5MB</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {thumbnailFile.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatFileSize(thumbnailFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-red-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {previewUrl && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                  <div className="relative w-full max-w-md mx-auto aspect-video bg-black rounded-lg overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            type="url"
            value={thumbnailUrl}
            onChange={(e) => {
              onUrlChange(e.target.value);
              onThumbnailSelected(null, e.target.value);
              setPreviewUrl('');
            }}
            placeholder="https://example.com/thumbnail.jpg"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
          <p className="text-sm text-gray-500 mt-2">
            Provide a direct link to your thumbnail image
          </p>
          {thumbnailUrl && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
              <div className="relative w-full max-w-md mx-auto aspect-video bg-black rounded-lg overflow-hidden">
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover"
                  onError={() => {
                    setError('Failed to load thumbnail from URL');
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
