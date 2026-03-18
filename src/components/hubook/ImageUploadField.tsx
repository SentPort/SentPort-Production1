import { useState, useRef } from 'react';
import { Upload, X, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

interface ImageUploadFieldProps {
  label: string;
  currentValue?: string;
  onFileChange: (file: File | null) => void;
  onUrlChange: (url: string) => void;
  type: 'profile' | 'cover';
  icon?: React.ReactNode;
}

export function ImageUploadField({
  label,
  currentValue = '',
  onFileChange,
  onUrlChange,
  type,
  icon
}: ImageUploadFieldProps) {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [preview, setPreview] = useState<string | null>(currentValue || null);
  const [urlValue, setUrlValue] = useState(currentValue);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProfile = type === 'profile';
  const maxSize = 5 * 1024 * 1024;
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  const handleFileSelect = (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      alert('Please upload a JPG, PNG, or WebP image');
      return;
    }

    if (file.size > maxSize) {
      alert('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    onFileChange(file);
    setUrlValue('');
    onUrlChange('');
  };

  const handleUrlChange = (url: string) => {
    setUrlValue(url);
    onUrlChange(url);
    if (url) {
      setPreview(url);
      onFileChange(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      setMode('upload');
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = () => {
    setPreview(null);
    setUrlValue('');
    onFileChange(null);
    onUrlChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
        {icon}
        {label}
      </label>

      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            mode === 'url'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <LinkIcon className="w-4 h-4 inline mr-1" />
          Paste URL
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            mode === 'upload'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-1" />
          Upload File
        </button>
      </div>

      {mode === 'url' ? (
        <input
          type="url"
          value={urlValue}
          onChange={(e) => handleUrlChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://example.com/photo.jpg"
        />
      ) : (
        <>
          {!preview ? (
            <div
              className={`relative w-full ${
                isProfile ? 'h-32' : 'h-48'
              } rounded-lg overflow-hidden border-2 border-dashed transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="w-full h-full flex flex-col items-center justify-center">
                <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                <p className="text-gray-600 font-medium text-sm">
                  Drop image here
                </p>
                <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                <p className="text-xs text-gray-400 mt-2">
                  JPG, PNG, or WebP (Max 5MB)
                </p>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                type="button"
                aria-label={`Upload ${label}`}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className={`relative mx-auto overflow-hidden border-2 border-gray-300 ${
                  isProfile
                    ? 'w-48 h-48 rounded-full'
                    : 'w-full h-48 rounded-lg'
                }`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-no-repeat bg-center"
                  style={{
                    backgroundImage: `url(${preview})`
                  }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center gap-1"
                >
                  <Upload className="w-4 h-4" />
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex-1 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Remove
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />
    </div>
  );
}
