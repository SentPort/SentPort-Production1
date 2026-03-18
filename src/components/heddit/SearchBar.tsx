import { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface SearchResult {
  type: 'subreddit' | 'post' | 'tag';
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setShowResults(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else if (query.trim()) {
        navigate(`/heddit/search?q=${encodeURIComponent(query.trim())}`);
        setQuery('');
        setResults([]);
        setShowResults(false);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < results.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowResults(false);
      setSelectedIndex(-1);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'subreddit':
        return '📁';
      case 'post':
        return '📄';
      case 'tag':
        return '🏷️';
      default:
        return '📝';
    }
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl">
      <div className="relative flex flex-col gap-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search SubHeddits (h/), posts, or tags..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      {showResults && query.trim().length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-blue-50 border border-blue-200 rounded-lg shadow-sm z-50 p-3">
          <p className="text-xs text-blue-800">
            <span className="font-semibold">Search Tip:</span> Use "h/" for SubHeddits (e.g., h/cooking, h/gaming) - not \"r/"
          </p>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="py-2">
            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 ${
                  index === selectedIndex ? 'bg-gray-100' : ''
                }`}
              >
                <span className="text-2xl">{getResultIcon(result.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {result.title}
                  </div>
                  {result.subtitle && (
                    <div className="text-sm text-gray-500 truncate">
                      {result.subtitle}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400 uppercase">
                  {result.type}
                </span>
              </button>
            ))}
          </div>
          {query.trim() && (
            <div className="border-t border-gray-200 p-2">
              <button
                onClick={() => {
                  navigate(`/heddit/search?q=${encodeURIComponent(query.trim())}`);
                  setQuery('');
                  setResults([]);
                  setShowResults(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                See all results for "{query}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
