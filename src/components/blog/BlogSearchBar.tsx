import { useState, useEffect, useRef } from 'react';
import { Search, User, FileText, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface SearchResult {
  type: 'author' | 'post' | 'interest';
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  metadata?: {
    avatar?: string;
    followerCount?: number;
    postCount?: number;
    viewCount?: number;
    readingTime?: number;
  };
}

export function BlogSearchBar() {
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

        const [authorsRes, postsRes, interestsRes] = await Promise.all([
          supabase
            .from('blog_accounts')
            .select('id, username, display_name, avatar_url, follower_count, post_count')
            .or(`username.ilike.${searchPattern},display_name.ilike.${searchPattern}`)
            .limit(5),
          supabase
            .from('blog_posts')
            .select(`
              id,
              title,
              excerpt,
              view_count,
              reading_time_minutes,
              blog_accounts!inner(username, display_name)
            `)
            .eq('status', 'published')
            .eq('privacy', 'public')
            .or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('blog_interests')
            .select('id, category')
            .ilike('category', searchPattern)
            .limit(3)
        ]);

        const searchResults: SearchResult[] = [];

        if (authorsRes.data) {
          authorsRes.data.forEach(author => {
            searchResults.push({
              type: 'author',
              id: author.id,
              title: author.display_name || author.username,
              subtitle: `@${author.username}`,
              url: `/blog/@${author.username}`,
              metadata: {
                avatar: author.avatar_url,
                followerCount: author.follower_count || 0,
                postCount: author.post_count || 0
              }
            });
          });
        }

        if (postsRes.data) {
          postsRes.data.forEach((post: any) => {
            searchResults.push({
              type: 'post',
              id: post.id,
              title: post.title,
              subtitle: `by ${post.blog_accounts.display_name || post.blog_accounts.username}`,
              url: `/blog/post/${post.id}`,
              metadata: {
                viewCount: post.view_count || 0,
                readingTime: post.reading_time_minutes || 0
              }
            });
          });
        }

        if (interestsRes.data) {
          interestsRes.data.forEach((interest: any) => {
            searchResults.push({
              type: 'interest',
              id: interest.id,
              title: interest.category,
              subtitle: 'Category',
              url: `/blog/search?q=${encodeURIComponent(interest.category)}&filter=interest`
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
        navigate(`/blog/search?q=${encodeURIComponent(query.trim())}`);
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
      case 'author':
        return <User className="w-5 h-5 text-emerald-600" />;
      case 'post':
        return <FileText className="w-5 h-5 text-gray-600" />;
      case 'interest':
        return <Tag className="w-5 h-5 text-blue-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
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
          placeholder="Search stories, authors, or topics..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
        />
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="py-2">
            {results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                  index === selectedIndex ? 'bg-emerald-50' : ''
                }`}
              >
                <div className="flex-shrink-0">
                  {result.type === 'author' && result.metadata?.avatar ? (
                    <img
                      src={result.metadata.avatar}
                      alt={result.title}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      {getResultIcon(result.type)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {result.title}
                  </div>
                  {result.subtitle && (
                    <div className="text-sm text-gray-500 truncate">
                      {result.subtitle}
                    </div>
                  )}
                  {result.type === 'author' && result.metadata && (
                    <div className="text-xs text-gray-400 mt-1">
                      {result.metadata.postCount} posts • {result.metadata.followerCount} followers
                    </div>
                  )}
                  {result.type === 'post' && result.metadata && (
                    <div className="text-xs text-gray-400 mt-1">
                      {result.metadata.readingTime} min read • {result.metadata.viewCount} views
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400 uppercase flex-shrink-0">
                  {result.type}
                </span>
              </button>
            ))}
          </div>
          {query.trim() && (
            <div className="border-t border-gray-200 p-2">
              <button
                onClick={() => {
                  navigate(`/blog/search?q=${encodeURIComponent(query.trim())}`);
                  setQuery('');
                  setResults([]);
                  setShowResults(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded flex items-center gap-2 transition-colors"
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
