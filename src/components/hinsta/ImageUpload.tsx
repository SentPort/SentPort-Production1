import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useHinstaNotification } from '../../contexts/HinstaNotificationContext';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  bucket?: string;
  maxSizeMB?: number;
  accept?: string;
  multiple?: boolean;
  onMultipleUpload?: (urls: string[]) => void;
}

export default function ImageUpload({
  onUpload,
  bucket = 'hinsta-posts',
  maxSizeMB = 10,
  accept = 'image/*',
  multiple = false,
  onMultipleUpload
}: ImageUploadProps) {
  const { user } = useAuth();
  const { showError } = useHinstaNotification();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
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
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!user) return;

    const fileArray = Array.isArray(files) ? files : Array.from(files);
    const maxSize = maxSizeMB * 1024 * 1024;

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        showError(`${file.name} is not an image file`);
        return;
      }
      if (file.size > maxSize) {
        showError(`File ${file.name} is too large. Maximum size is ${maxSizeMB}MB`);
        return;
      }
    }

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of fileArray) {
        const compressedFile = file.type.startsWith('image/')
          ? await compressImage(file)
          : file;

        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, compressedFile);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        uploadedUrls.push(publicUrl);
      }

      if (multiple && onMultipleUpload) {
        setPreviews(uploadedUrls);
        onMultipleUpload(uploadedUrls);
      } else if (uploadedUrls.length > 0) {
        setPreview(uploadedUrls[0]);
        onUpload(uploadedUrls[0]);
      }
    } catch (error: any) {
      showError(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    await processFiles(files);
  };

  const removePreview = (index?: number) => {
    if (multiple && index !== undefined) {
      const newPreviews = previews.filter((_, i) => i !== index);
      setPreviews(newPreviews);
      if (onMultipleUpload) {
        onMultipleUpload(newPreviews);
      }
    } else {
      setPreview(null);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!preview && previews.length === 0 && (
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full h-64 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${
            uploading ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            isDragging
              ? 'border-pink-500 bg-pink-100'
              : 'border-gray-300 hover:border-pink-500 hover:bg-pink-50'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
              <span className="text-gray-600">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className={`w-12 h-12 ${isDragging ? 'text-pink-500' : 'text-gray-400'}`} />
              <span className="text-gray-600 font-medium">
                {isDragging
                  ? 'Drop images here'
                  : multiple
                  ? 'Click to upload images'
                  : 'Click to upload image'}
              </span>
              {!isDragging && (
                <>
                  <span className="text-sm text-gray-500">or drag and drop</span>
                  <span className="text-sm text-gray-500">Max {maxSizeMB}MB</span>
                </>
              )}
            </>
          )}
        </div>
      )}

      {preview && !multiple && (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-auto rounded-lg"
          />
          <button
            type="button"
            onClick={() => removePreview()}
            className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {multiple && previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {previews.map((url, index) => (
            <div key={index} className="relative">
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removePreview(index)}
                className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {previews.length < 10 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-pink-500 hover:bg-pink-50 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-600">Add more</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
