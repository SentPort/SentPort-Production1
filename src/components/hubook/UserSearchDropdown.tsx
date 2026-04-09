import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, UserPlus, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SearchResult {
  profile_id: string;
  user_id: string;
  display_name: string;
  profile_photo_url: string | null;
  work: string | null;
  location: string | null;
  bio: string | null;
  tier: number;
  mutual_friends_count: number;
  activity_score: number;
  match_score: number;
}

interface UserSearchDropdownProps {
  onClose: () => void;
  onNavigate?: () => void;
  isMobile?: boolean;
}

export default function UserSearchDropdown({ onClose, onNavigate, isMobile = false }: UserSearchDropdownProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (!user || searchQuery.trim().length < 2) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_hubook_users_tiered', {
        search_query: searchQuery.trim(),
        current_user_id: user.id,
        result_limit: 8
      });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex === results.length) {
        window.location.href = `/hubook/search?q=${encodeURIComponent(query)}`;
        onNavigate?.();
      } else if (selectedIndex >= 0 && results[selectedIndex]) {
        window.location.href = `/hubook/user/${results[selectedIndex].profile_id}`;
        onNavigate?.();
      } else if (query.trim()) {
        window.location.href = `/hubook/search?q=${encodeURIComponent(query)}`;
        onNavigate?.();
      }
    }
  };

  const getTierBadge = (tier: number) => {
    if (tier === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          <Users className="w-3 h-3" />
          Friend
        </span>
      );
    } else if (tier === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          <UserPlus className="w-3 h-3" />
          Friend of Friend
        </span>
      );
    }
    return null;
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="font-semibold bg-yellow-100">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div
      ref={dropdownRef}
      className={
        isMobile
          ? 'fixed inset-x-0 top-[57px] z-[60] bg-white shadow-2xl border-b border-gray-200 overflow-hidden'
          : 'absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50 max-w-2xl mx-auto'
      }
    >
      <div className="p-3 border-b border-gray-200">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search for people on HuBook..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors"
            />
          </div>
          {isMobile && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors shrink-0 touch-manipulation"
              aria-label="Close search"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      <div className={isMobile ? 'max-h-[70vh] overflow-y-auto' : 'max-h-96 overflow-y-auto'}>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="ml-2 text-gray-600">Searching...</span>
          </div>
        )}

        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-600">
            <p className="font-medium">No results found for "{query}"</p>
            <p className="text-sm mt-1">Try searching for a different name</p>
          </div>
        )}

        {!loading && query.trim().length < 2 && (
          <div className="px-4 py-8 text-center text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Type at least 2 characters to search</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="py-2">
            {results.map((result, index) => (
              <Link
                key={result.profile_id}
                to={`/hubook/user/${result.profile_id}`}
                onClick={() => {
                  onNavigate?.();
                  onClose();
                }}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                  selectedIndex === index ? 'bg-gray-100' : ''
                }`}
              >
                {result.profile_photo_url ? (
                  <img
                    src={result.profile_photo_url}
                    alt={result.display_name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {result.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 truncate">
                      {highlightMatch(result.display_name, query)}
                    </p>
                    {getTierBadge(result.tier)}
                  </div>
                  {(result.work || result.location) && (
                    <p className="text-sm text-gray-600 truncate">
                      {result.work && highlightMatch(result.work, query)}
                      {result.work && result.location && ' • '}
                      {result.location && highlightMatch(result.location, query)}
                    </p>
                  )}
                  {result.tier === 2 && result.mutual_friends_count > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {result.mutual_friends_count} mutual {result.mutual_friends_count === 1 ? 'friend' : 'friends'}
                    </p>
                  )}
                </div>
              </Link>
            ))}

            {query.trim() && (
              <Link
                to={`/hubook/search?q=${encodeURIComponent(query)}`}
                onClick={() => {
                  onNavigate?.();
                  onClose();
                }}
                className={`flex items-center gap-3 px-4 py-3 border-t border-gray-200 hover:bg-gray-50 transition-colors ${
                  selectedIndex === results.length ? 'bg-gray-100' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-blue-600">See all results for "{query}"</p>
                  <p className="text-sm text-gray-600">View complete search results</p>
                </div>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
