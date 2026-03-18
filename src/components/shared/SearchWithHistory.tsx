import { useState, useRef, useEffect } from 'react';
import { Search, Clock, X, Trash2 } from 'lucide-react';
import { useSearchHistory } from '../../hooks/useSearchHistory';

interface SearchWithHistoryProps {
  platform?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  variant?: 'main' | 'platform';
  initialValue?: string;
}

export function SearchWithHistory({
  platform = 'main',
  onSearch,
  placeholder = 'Search the Human-Only Web',
  className = '',
  inputClassName = '',
  variant = 'main',
  initialValue = '',
}: SearchWithHistoryProps) {
  const [query, setQuery] = useState(initialValue);
  const [showHistory, setShowHistory] = useState(false);
  const { history, addToHistory, deleteHistoryItem, clearAllHistory } = useSearchHistory(platform);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    addToHistory(trimmedQuery);
    onSearch(trimmedQuery);
    setShowHistory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    handleSearch(historyQuery);
  };

  const handleDeleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteHistoryItem(id);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearAllHistory();
  };

  const isMainVariant = variant === 'main';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className={`relative ${isMainVariant ? 'group' : ''}`}>
          <Search
            className={`absolute ${isMainVariant ? 'left-6 top-1/2 -translate-y-1/2' : 'left-4 top-1/2 -translate-y-1/2'} ${
              isMainVariant ? 'w-5 h-5 text-gray-400' : 'w-4 h-4 text-gray-500'
            }`}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            placeholder={placeholder}
            className={
              inputClassName ||
              (isMainVariant
                ? 'w-full pl-14 pr-6 py-4 text-base bg-white rounded-full border-2 border-blue-200 focus:border-blue-500 focus:outline-none shadow-lg transition-all'
                : 'w-full pl-10 pr-4 py-2 text-sm bg-white rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none transition-all')
            }
          />
        </div>
      </form>

      {showHistory && history.length > 0 && (
        <div
          className={`absolute z-50 w-full ${
            isMainVariant ? 'mt-2' : 'mt-1'
          } bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden`}
        >
          <div className="max-h-80 overflow-y-auto">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleHistoryClick(item.query)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{item.query}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteItem(e, item.id)}
                  className="ml-2 p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  aria-label="Delete this search"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </button>
            ))}
          </div>

          <div className="border-t border-gray-200">
            <button
              type="button"
              onClick={handleClearAll}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-gray-600"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Clear all history</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
