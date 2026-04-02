import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SentPortPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function SentPortPagination({
  currentPage,
  totalPages,
  onPageChange,
}: SentPortPaginationProps) {
  const PAGES_PER_CHUNK = 8;

  // Calculate which chunk we're in (0-indexed)
  const currentChunk = Math.floor((currentPage - 1) / PAGES_PER_CHUNK);

  // Calculate start and end page for current chunk
  const chunkStartPage = currentChunk * PAGES_PER_CHUNK + 1;
  const chunkEndPage = Math.min(chunkStartPage + PAGES_PER_CHUNK - 1, totalPages);

  // Calculate total number of pages in current chunk
  const pagesInChunk = chunkEndPage - chunkStartPage + 1;

  const handlePrevious = () => {
    // Jump to the last page of the previous chunk
    if (currentChunk > 0) {
      const prevChunkEnd = chunkStartPage - 1;
      onPageChange(prevChunkEnd);
    }
  };

  const handleNext = () => {
    // Jump to the first page of the next chunk
    if (chunkEndPage < totalPages) {
      const nextChunkStart = chunkEndPage + 1;
      onPageChange(nextChunkStart);
    }
  };

  const renderOs = () => {
    return Array.from({ length: pagesInChunk }, (_, index) => {
      const pageNum = chunkStartPage + index;
      const isActive = pageNum === currentPage;

      return (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          className="flex flex-col items-center justify-center gap-0.5 group"
          aria-label={`Go to page ${pageNum}`}
          aria-current={isActive ? 'page' : undefined}
        >
          <span
            className={`transition-all duration-200 ${
              isActive
                ? 'text-blue-600 font-bold text-2xl scale-110'
                : 'text-gray-400 group-hover:text-blue-500 text-xl'
            }`}
          >
            o
          </span>
          <span
            className={`transition-all duration-200 leading-none ${
              isActive
                ? 'text-blue-600 font-bold text-sm'
                : 'text-gray-500 text-xs'
            }`}
          >
            {pageNum}
          </span>
        </button>
      );
    });
  };

  return (
    <div className="flex flex-col items-center gap-2 py-8">
      <div className="flex items-center justify-center gap-1">
        {currentChunk > 0 && (
          <button
            onClick={handlePrevious}
            className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:text-blue-700 transition-colors"
            aria-label="Previous chunk"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Previous</span>
          </button>
        )}

        <div className="flex items-start text-2xl mx-4">
          <span className="text-blue-600 font-bold leading-none pt-1">Sent</span>
          <span className="text-blue-600 font-bold leading-none pt-1">P</span>
          {renderOs()}
          <span className="text-blue-600 font-bold leading-none pt-1">rt</span>
        </div>

        {chunkEndPage < totalPages && (
          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:text-blue-700 transition-colors"
            aria-label="Next chunk"
          >
            <span className="text-sm font-medium">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="text-sm text-gray-500">
        {chunkStartPage}-{chunkEndPage} of {totalPages}
      </div>
    </div>
  );
}
