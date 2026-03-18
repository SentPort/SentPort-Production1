import { useState, useRef, useEffect } from 'react';
import { Camera, X, Upload, Move, RotateCcw } from 'lucide-react';

interface Position {
  x: number;
  y: number;
}

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string;
  onPhotoChange: (file: File | null) => void;
  onPositionChange?: (position: Position) => void;
  initialPosition?: Position;
  type?: 'profile' | 'cover';
}

export function ProfilePhotoUpload({
  currentPhotoUrl,
  onPhotoChange,
  onPositionChange,
  initialPosition = { x: 50, y: 50 },
  type = 'profile'
}: ProfilePhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);
  const [position, setPosition] = useState<Position>(initialPosition);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragStartPos, setDragStartPos] = useState<Position | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isProfile = type === 'profile';
  const maxSize = 5 * 1024 * 1024;
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  useEffect(() => {
    setPreview(currentPhotoUrl || null);
  }, [currentPhotoUrl]);

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition.x, initialPosition.y]);

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
    onPhotoChange(file);
    const defaultPos = { x: 50, y: 50 };
    setPosition(defaultPos);
    onPositionChange?.(defaultPos);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
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
    onPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    const defaultPos = { x: 50, y: 50 };
    setPosition(defaultPos);
    onPositionChange?.(defaultPos);
  };

  const handlePositionMouseDown = (e: React.MouseEvent) => {
    if (!preview) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPosition(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartPos({ ...position });
  };

  const handlePositionTouchStart = (e: React.TouchEvent) => {
    if (!preview) return;
    e.stopPropagation();
    const touch = e.touches[0];
    setIsDraggingPosition(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setDragStartPos({ ...position });
  };

  const handlePositionMove = (clientX: number, clientY: number) => {
    if (!isDraggingPosition || !dragStart || !dragStartPos || !containerRef.current) return;

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

  const resetPosition = () => {
    const defaultPos = { x: 50, y: 50 };
    setPosition(defaultPos);
    onPositionChange?.(defaultPos);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handlePositionMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handlePositionMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      setIsDraggingPosition(false);
      setDragStart(null);
      setDragStartPos(null);
    };

    if (isDraggingPosition) {
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
  }, [isDraggingPosition, dragStart, dragStartPos]);

  if (isProfile) {
    return (
      <div className="flex flex-col items-center">
        {!preview ? (
          <div className="relative">
            <div
              className={`w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg ${
                isDragging ? 'ring-4 ring-orange-500' : ''
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <Camera className="w-12 h-12 text-gray-400" />
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-orange-500 text-white p-2 rounded-full shadow-lg hover:bg-orange-600 transition-colors"
              type="button"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3 w-full max-w-xs">
            <div
              ref={containerRef}
              className={`w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg ${
                isDraggingPosition ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onMouseDown={handlePositionMouseDown}
              onTouchStart={handlePositionTouchStart}
            >
              <div
                className="w-full h-full bg-cover bg-no-repeat relative"
                style={{
                  backgroundImage: `url(${preview})`,
                  backgroundPosition: `${position.x}% ${position.y}%`
                }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)',
                    borderRadius: '50%'
                  }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetPosition}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center gap-1"
              >
                <Camera className="w-4 h-4" />
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

        {!preview && (
          <p className="mt-2 text-sm text-gray-600">
            Click or drag to upload (Max 5MB)
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {!preview ? (
        <div
          className={`relative w-full h-48 rounded-lg overflow-hidden border-2 border-dashed ${
            isDragging ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-gray-50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Upload className="w-12 h-12 text-gray-400 mb-2" />
            <p className="text-gray-600 font-medium">Drop cover photo here</p>
            <p className="text-sm text-gray-500 mt-1">or click to browse</p>
            <p className="text-xs text-gray-400 mt-2">JPG, PNG, or WebP (Max 5MB)</p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
            type="button"
            aria-label="Upload cover photo"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div
            ref={containerRef}
            className={`relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-300 ${
              isDraggingPosition ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={handlePositionMouseDown}
            onTouchStart={handlePositionTouchStart}
          >
            <div
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={{
                backgroundImage: `url(${preview})`,
                backgroundPosition: `${position.x}% ${position.y}%`
              }}
            />

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
              Reset
            </button>
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
