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
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const renderOs = () => {
    return Array.from({ length: totalPages }, (_, index) => {
      const pageNum = index + 1;
      const isActive = pageNum === currentPage;

      return (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          className={`transition-all duration-200 ${
            isActive
              ? 'text-blue-600 font-bold text-2xl scale-110'
              : 'text-gray-400 hover:text-blue-500 text-xl'
          }`}
          aria-label={`Go to page ${pageNum}`}
          aria-current={isActive ? 'page' : undefined}
        >
          o
        </button>
      );
    });
  };

  return (
    <div className="flex items-center justify-center gap-1 py-8">
      {currentPage > 1 && (
        <button
          onClick={handlePrevious}
          className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:text-blue-700 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Previous</span>
        </button>
      )}

      <div className="flex items-center text-2xl mx-4">
        <span className="text-blue-600 font-bold">Sent</span>
        <span className="text-blue-600 font-bold">P</span>
        {renderOs()}
        <span className="text-blue-600 font-bold">rt</span>
      </div>

      {currentPage < totalPages && (
        <button
          onClick={handleNext}
          className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:text-blue-700 transition-colors"
          aria-label="Next page"
        >
          <span className="text-sm font-medium">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
