import { useState, useRef } from 'react';
import { Upload, Video, X, FileVideo, AlertCircle } from 'lucide-react';

interface VideoUploadZoneProps {
  onVideoSelected: (file: File | null, url: string | null) => void;
  videoFile: File | null;
  videoUrl: string;
  onUrlChange: (url: string) => void;
  uploadProgress: number;
}

export default function VideoUploadZone({
  onVideoSelected,
  videoFile,
  videoUrl,
  onUrlChange,
  uploadProgress
}: VideoUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
  const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ];

  const validateVideoFile = (file: File): string | null => {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return 'Invalid file format. Please upload MP4, WebM, MOV, AVI, or MKV files.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 5GB limit. Your file is ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB.`;
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateVideoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onVideoSelected(file, null);
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
    onVideoSelected(null, null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <label className="block text-sm font-medium text-gray-700">
          Video *
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

      {uploadMethod === 'file' ? (
        <div>
          {!videoFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isDragging ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <Upload className={`w-8 h-8 ${isDragging ? 'text-red-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">
                    {isDragging ? 'Drop video here' : 'Drag and drop video file'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or click to browse your computer
                  </p>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  <p>MP4, WebM, MOV, AVI, or MKV</p>
                  <p>Maximum file size: 5GB</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileVideo className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {videoFile.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatFileSize(videoFile.size)}
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
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
            value={videoUrl}
            onChange={(e) => {
              onUrlChange(e.target.value);
              onVideoSelected(null, e.target.value);
            }}
            placeholder="https://example.com/video.mp4"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
          <p className="text-sm text-gray-500 mt-2">
            Provide a direct link to your video file (MP4, WebM, MOV, etc.)
          </p>
        </div>
      )}
    </div>
  );
}
