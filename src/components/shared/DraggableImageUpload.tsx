import { useState, useRef, useEffect } from 'react';
import { Upload, RotateCcw, Move } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface DraggableImageUploadProps {
  value?: string | null;
  onChange?: (file: File | null) => void;
  currentImageUrl?: string | null;
  onUpload?: (file: File) => Promise<void>;
  onFileSelect?: (file: File) => void;
  onPositionChange?: (position: Position) => void;
  initialPosition?: Position;
  cropShape?: 'circle' | 'rectangle';
  shape?: 'circle' | 'rectangle';
  aspectRatio?: number;
  label?: string;
  className?: string;
  maxWidth?: string;
  uploading?: boolean;
}

export default function DraggableImageUpload({
  value,
  onChange,
  currentImageUrl,
  onUpload,
  onFileSelect,
  onPositionChange,
  initialPosition = { x: 50, y: 50 },
  cropShape,
  shape,
  aspectRatio = 1,
  label = 'Upload Photo',
  className = '',
  maxWidth,
  uploading = false
}: DraggableImageUploadProps) {
  const finalShape = shape || cropShape || 'circle';
  const imageUrl = currentImageUrl !== undefined ? currentImageUrl : value;
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Position | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl || null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(imageUrl || null);
  }, [imageUrl]);

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
      setPosition({ x: 50, y: 50 });
      onPositionChange?.({ x: 50, y: 50 });
    };
    reader.readAsDataURL(file);

    if (onFileSelect) {
      onFileSelect(file);
    } else if (onUpload) {
      await onUpload(file);
    } else if (onChange) {
      onChange(file);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!previewUrl) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartPos({ ...position });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!previewUrl) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setDragStartPos({ ...position });
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging || !dragStart || !dragStartPos || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;

      const deltaXPercent = (deltaX / rect.width) * 100;
      const deltaYPercent = (deltaY / rect.height) * 100;

      const newX = Math.max(0, Math.min(100, dragStartPos.x + deltaXPercent));
      const newY = Math.max(0, Math.min(100, dragStartPos.y + deltaYPercent));

      const newPosition = { x: Math.round(newX), y: Math.round(newY) };
      setPosition(newPosition);
      onPositionChange?.(newPosition);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      setIsDragging(false);
      setDragStart(null);
      setDragStartPos(null);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, dragStart, dragStartPos, onPositionChange]);

  const resetPosition = () => {
    const defaultPos = { x: 50, y: 50 };
    setPosition(defaultPos);
    onPositionChange?.(defaultPos);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange?.(null);
    setPosition({ x: 50, y: 50 });
    onPositionChange?.({ x: 50, y: 50 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className} style={maxWidth ? { maxWidth } : undefined}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!previewUrl ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`w-full border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed ${finalShape === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
          style={{ aspectRatio }}
        >
          <Upload className="w-8 h-8" />
          <span className="text-sm font-medium">{uploading ? 'Uploading...' : label}</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div
            ref={containerRef}
            className={`relative w-full overflow-hidden border-2 border-gray-300 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            } ${finalShape === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
            style={{ aspectRatio }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={{
                backgroundImage: `url(${previewUrl})`,
                backgroundPosition: `${position.x}% ${position.y}%`
              }}
            />

            {finalShape === 'circle' && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
                  borderRadius: '50%'
                }}
              />
            )}

            <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1 pointer-events-none">
              <Move className="w-3 h-3" />
              Drag to reposition
            </div>

            <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium pointer-events-none">
              {position.x}%, {position.y}%
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetPosition}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Position
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center gap-1"
            >
              <Upload className="w-4 h-4" />
              Change Photo
            </button>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="w-full px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
          >
            Remove Photo
          </button>
        </div>
      )}
    </div>
  );
}
