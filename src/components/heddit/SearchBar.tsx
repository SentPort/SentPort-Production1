import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface SearchResult {
  type: 'subreddit' | 'post' | 'tag';
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target as Node)) {
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
    const searchContent = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      try {
        const searchPattern = `%${query.trim()}%`;
        const [subredditsRes, postsRes, tagsRes] = await Promise.all([
          supabase
            .from('heddit_subreddits')
            .select('id, name, display_name, description, member_count')
            .or(`name.ilike.${searchPattern},display_name.ilike.${searchPattern},description.ilike.${searchPattern}`)
            .limit(5),
          supabase
            .from('heddit_posts')
            .select('id, title, heddit_subreddits(name)')
            .or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`)
            .limit(5),
          supabase
            .rpc('search_tags_autocomplete', {
              search_query: query.trim(),
              result_limit: 5
            })
        ]);

        const searchResults: SearchResult[] = [];

        if (subredditsRes.data) {
          subredditsRes.data.forEach(sub => {
            searchResults.push({
              type: 'subreddit',
              id: sub.id,
              title: `h/${sub.name}`,
              subtitle: `${sub.member_count.toLocaleString()} members`,
              url: `/heddit/h/${sub.name}`
            });
          });
        }

        if (postsRes.data) {
          postsRes.data.forEach((post: any) => {
            searchResults.push({
              type: 'post',
              id: post.id,
              title: post.title,
              subtitle: `in h/${post.heddit_subreddits.name}`,
              url: `/heddit/post/${post.id}`
            });
          });
        }

        if (tagsRes.data) {
          tagsRes.data.forEach((tag: any) => {
            searchResults.push({
              type: 'tag',
              id: tag.id,
              title: tag.display_name,
              subtitle: `${tag.usage_count} uses`,
              url: `/heddit/tag/${encodeURIComponent(tag.display_name)}`
            });
          });
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Error searching:', error);
      }
    };

    const debounce = setTimeout(searchContent, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else if (query.trim()) {
        navigate(`/heddit/search?q=${encodeURIComponent(query.trim())}`);
        onClose();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'subreddit': return '📁';
      case 'post': return '📄';
      case 'tag': return '🏷️';
      default: return '📝';
    }
  };

  return (
    <div className="fixed inset-x-0 top-[64px] z-[60] flex justify-center px-4 pointer-events-none">
      <div
        ref={overlayRef}
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden pointer-events-auto"
      >
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search SubHeddits, posts, or tags..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent focus:bg-white transition-colors text-sm"
            />
          </div>
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {query.trim().length < 2 && (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Type at least 2 characters to search</p>
              <p className="text-xs text-blue-600 mt-2">
                Tip: No need to type "h/" - just search by name!
              </p>
            </div>
          )}

          {query.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">
              <p className="font-medium text-gray-700">No results found for "{query}"</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                    index === selectedIndex ? 'bg-gray-100' : ''
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{getResultIcon(result.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-sm text-gray-500 truncate">{result.subtitle}</div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 uppercase flex-shrink-0">{result.type}</span>
                </button>
              ))}
            </div>
          )}

          {query.trim() && (
            <div className="border-t border-gray-100 p-2">
              <button
                onClick={() => {
                  navigate(`/heddit/search?q=${encodeURIComponent(query.trim())}`);
                  onClose();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Search className="w-4 h-4 flex-shrink-0" />
                See all results for "{query}"
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SearchBar() {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <div className="relative flex-1 max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          readOnly
          placeholder="Search Heddit..."
          onClick={() => setShowOverlay(true)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-full bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer hover:bg-white hover:border-orange-400 transition-colors text-sm text-gray-500"
        />
      </div>

      {showOverlay && <SearchOverlay onClose={() => setShowOverlay(false)} />}
    </div>
  );
}
