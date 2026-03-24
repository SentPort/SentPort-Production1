import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface HedditMediaGalleryProps {
  mediaUrls: string[];
  mediaTypes: string[];
  className?: string;
}

export default function HedditMediaGallery({
  mediaUrls,
  mediaTypes,
  className = ''
}: HedditMediaGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!mediaUrls || mediaUrls.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextMedia = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaUrls.length);
  };

  const prevMedia = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  };

  const downloadMedia = (url: string) => {
    window.open(url, '_blank');
  };

  const renderMediaItem = (url: string, type: string, index: number, isPreview: boolean = false) => {
    if (type === 'video') {
      return (
        <video
          src={url}
          controls={!isPreview}
          className={`w-full h-full object-cover ${isPreview ? 'cursor-pointer' : ''}`}
          onClick={() => isPreview && openLightbox(index)}
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    return (
      <img
        src={url}
        alt={`Media ${index + 1}`}
        className={`w-full h-full object-cover ${isPreview ? 'cursor-pointer' : ''}`}
        onClick={() => isPreview && openLightbox(index)}
      />
    );
  };

  // Single media item
  if (mediaUrls.length === 1) {
    return (
      <>
        <div className={`relative rounded-lg overflow-hidden bg-gray-100 ${className}`}>
          <div className="max-h-[500px] flex items-center justify-center">
            {renderMediaItem(mediaUrls[0], mediaTypes[0] || 'image', 0, true)}
          </div>
        </div>

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadMedia(mediaUrls[currentIndex]);
              }}
              className="absolute top-4 right-16 text-white hover:text-gray-300 transition-colors"
            >
              <Download className="w-8 h-8" />
            </button>

            <div
              className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {renderMediaItem(mediaUrls[currentIndex], mediaTypes[currentIndex] || 'image', currentIndex, false)}
            </div>
          </div>
        )}
      </>
    );
  }

  // Multiple media items - Grid layout
  return (
    <>
      <div className={`grid gap-2 ${className}`}>
        {/* Main preview */}
        <div className="relative rounded-lg overflow-hidden bg-gray-100">
          <div className="max-h-[400px] flex items-center justify-center">
            {renderMediaItem(mediaUrls[0], mediaTypes[0] || 'image', 0, true)}
          </div>
          {mediaUrls.length > 1 && (
            <div className="absolute bottom-3 right-3 px-3 py-1 bg-black bg-opacity-70 text-white text-sm rounded-full">
              1 / {mediaUrls.length}
            </div>
          )}
        </div>

        {/* Thumbnail grid */}
        {mediaUrls.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {mediaUrls.slice(1, Math.min(4, mediaUrls.length)).map((url, idx) => {
              const actualIndex = idx + 1;
              const type = mediaTypes[actualIndex] || 'image';

              return (
                <div
                  key={actualIndex}
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openLightbox(actualIndex)}
                >
                  {renderMediaItem(url, type, actualIndex, false)}

                  {/* Show "+X more" overlay on last thumbnail if there are more items */}
                  {idx === 2 && mediaUrls.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                      <span className="text-white text-xl font-semibold">
                        +{mediaUrls.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              downloadMedia(mediaUrls[currentIndex]);
            }}
            className="absolute top-4 right-16 text-white hover:text-gray-300 transition-colors z-10"
          >
            <Download className="w-8 h-8" />
          </button>

          {mediaUrls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevMedia();
                }}
                className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10"
              >
                <ChevronLeft className="w-12 h-12" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextMedia();
                }}
                className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10"
              >
                <ChevronRight className="w-12 h-12" />
              </button>

              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black bg-opacity-70 text-white text-sm rounded-full">
                {currentIndex + 1} / {mediaUrls.length}
              </div>
            </>
          )}

          <div
            className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {renderMediaItem(mediaUrls[currentIndex], mediaTypes[currentIndex] || 'image', currentIndex, false)}
          </div>
        </div>
      )}
    </>
  );
}
