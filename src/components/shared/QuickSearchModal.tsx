import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Globe, CheckCircle, FileText, Image, Video, Newspaper, Shield, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { trackSearch } from '../../lib/analytics';
import { useAuth } from '../../contexts/AuthContext';
import { safeGetHostname } from '../../lib/urlHelpers';
import { useSearchPreferences } from '../../hooks/useSearchPreferences';
import { analyzeQuery, QueryAnalysis } from '../../lib/queryAnalyzer';
import { Calculator } from './Calculator';
import { UnitConverter } from './UnitConverter';
import { WikipediaKnowledgePanel } from './WikipediaKnowledgePanel';

interface SearchResult {
  id: string;
  url: string;
  title: string;
  description: string;
  content_snippet: string;
  is_internal: boolean;
  is_verified_external: boolean;
  relevance_score: number;
  last_indexed_at: string;
  content_type?: 'web_page' | 'image' | 'video' | 'news_article';
  source_platform?: string;
  thumbnail_url?: string;
  media_duration?: number;
  publication_date?: string;
  author_name?: string;
  view_count?: number;
  image_width?: number;
  image_height?: number;
  alt_text?: string;
  parent_page_url?: string;
  calculatedScore?: number;
}

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export default function QuickSearchModal({ isOpen, onClose, initialQuery = '' }: QuickSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const { includeExternalContent, setIncludeExternalContent } = useSearchPreferences();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [analysis, setAnalysis] = useState<QueryAnalysis | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const { user } = useAuth();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      if (initialQuery) {
        performSearch(initialQuery);
      }
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setResults([]);
      setQuery('');
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      if (isMountedRef.current) {
        setResults([]);
      }
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      let dbQuery = supabase
        .from('search_index')
        .select('*')
        .abortSignal(currentController.signal);

      if (!includeExternalContent) {
        dbQuery = dbQuery.eq('is_internal', true);
      }

      const searchTermLower = searchTerm.toLowerCase();
      dbQuery = dbQuery.or(`title.ilike.%${searchTermLower}%,description.ilike.%${searchTermLower}%,content_snippet.ilike.%${searchTermLower}%`);

      const { data, error } = await dbQuery;

      if (currentController.signal.aborted || !isMountedRef.current) {
        return;
      }

      let allResults = data || [];

      if (allResults.length < 3 && searchTerm.length >= 3) {
        console.log('[QuickSearch] Few or no exact matches found, trying fuzzy search...');

        const { data: fuzzyData, error: fuzzyError } = await supabase
          .rpc('fuzzy_search_content', {
            search_term: searchTerm.toLowerCase(),
            include_external: includeExternalContent,
            similarity_threshold: 0.25
          })
          .abortSignal(currentController.signal);

        if (currentController.signal.aborted || !isMountedRef.current) {
          return;
        }

        if (fuzzyData && !fuzzyError) {
          console.log(`[QuickSearch] Fuzzy search found ${fuzzyData.length} results`);

          const existingIds = new Set(allResults.map(r => r.id));
          const newFuzzyResults = fuzzyData.filter((r: any) => !existingIds.has(r.id));

          allResults = [...allResults, ...newFuzzyResults];
        }
      }

      if (!error && allResults.length > 0) {
        const scoredResults = allResults.map(result => {
          let score = result.relevance_score || 0;

          const titleMatch = result.title?.toLowerCase().includes(searchTermLower);
          const descMatch = result.description?.toLowerCase().includes(searchTermLower);
          const contentMatch = result.content_snippet?.toLowerCase().includes(searchTermLower);

          if (titleMatch) score += 30;
          if (descMatch) score += 20;
          if (contentMatch) score += 10;

          if ((result as any).similarity_score) {
            score += (result as any).similarity_score * 40;
          }

          if (result.is_internal) {
            score *= 10;
          } else if (result.is_verified_external) {
            score *= 5;
          }

          return { ...result, calculatedScore: score };
        });

        scoredResults.sort((a, b) => b.calculatedScore - a.calculatedScore);

        if (isMountedRef.current && !currentController.signal.aborted) {
          setResults(scoredResults);
        }

        if (user && isMountedRef.current) {
          trackSearch(searchTerm, scoredResults.length);
        }
      }

      if (isMountedRef.current) {
        setLoading(false);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && isMountedRef.current) {
        console.error('Search error:', err);
        setLoading(false);
      }
    }
  }, [includeExternalContent, user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  useEffect(() => {
    if (query) {
      const timer = setTimeout(() => {
        performSearch(query);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      if (isMountedRef.current) {
        setResults([]);
      }
    }
  }, [query, performSearch]);

  const getFilteredResults = () => {
    if (activeTab === 'all') {
      return results.filter(r => !r.content_type || r.content_type === 'web_page');
    } else if (activeTab === 'images') {
      return results.filter(r => r.content_type === 'image');
    } else if (activeTab === 'videos') {
      return results.filter(r => r.content_type === 'video');
    } else if (activeTab === 'news') {
      return results.filter(r => r.content_type === 'news_article' && r.source_platform !== 'heddit');
    }
    return results;
  };

  const filteredResults = getFilteredResults();

  // Analyze query for widgets
  useEffect(() => {
    if (query) {
      const queryAnalysis = analyzeQuery(query, results);
      setAnalysis(queryAnalysis);
      console.log('[QuickSearchModal] Query analysis:', queryAnalysis);
    } else {
      setAnalysis(null);
    }
  }, [query, results]);

  const showCalculator = (analysis?.showCalculator && activeTab === 'all') || false;
  const showUnitConverter = (analysis?.showUnitConverter && activeTab === 'all') || false;
  const showWikipedia = (analysis?.showWikipedia && includeExternalContent && activeTab === 'all') || false;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 px-4" style={{ zIndex: 60 }}>
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col animate-in fade-in slide-in-from-top-4 duration-200"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Search SentPort</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleSearch} className="mb-3">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the Human-Only Web..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-base"
            />
          </form>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeExternalContent}
              onChange={(e) => setIncludeExternalContent(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <Globe className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Include Verified External Content</span>
          </label>
        </div>

        <div className="flex items-center gap-4 px-4 pt-3 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="font-medium text-sm">All</span>
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-colors ${
              activeTab === 'images'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Image className="w-4 h-4" />
            <span className="font-medium text-sm">Images</span>
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-colors ${
              activeTab === 'videos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Video className="w-4 h-4" />
            <span className="font-medium text-sm">Videos</span>
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-colors ${
              activeTab === 'news'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span className="font-medium text-sm">News</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Calculator Widget */}
          {showCalculator && (
            <div className="mb-4">
              <Calculator initialExpression={analysis?.extractedExpression} />
            </div>
          )}

          {/* Unit Converter Widget */}
          {showUnitConverter && (
            <div className="mb-4">
              <UnitConverter initialConversion={analysis?.extractedConversion} />
            </div>
          )}

          {/* Wikipedia Knowledge Panel */}
          {showWikipedia && (
            <div className="mb-4">
              <WikipediaKnowledgePanel query={analysis?.normalizedQuery || query} />
            </div>
          )}

          {/* Separator between widgets and results */}
          {(showCalculator || showUnitConverter || showWikipedia) && filteredResults.length > 0 && (
            <div className="mb-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Search Results</h3>
            </div>
          )}

          {query && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Found <span className="font-semibold text-gray-900">{filteredResults.length}</span> results for{' '}
                <span className="font-semibold text-gray-900">"{query}"</span>
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className={activeTab === 'images' || activeTab === 'videos' ? 'grid grid-cols-2 md:grid-cols-3 gap-3' : 'space-y-4'}>
              {filteredResults.slice(0, 15).map((result) => {
                const getBadgeConfig = () => {
                  if (result.is_internal) {
                    return {
                      icon: Shield,
                      label: 'Verified Internal',
                      bgColor: 'bg-green-100',
                      textColor: 'text-green-800',
                      iconColor: 'text-green-600'
                    };
                  } else if (result.is_verified_external) {
                    return {
                      icon: CheckCircle,
                      label: 'Verified External',
                      bgColor: 'bg-blue-100',
                      textColor: 'text-blue-800',
                      iconColor: 'text-blue-600'
                    };
                  } else {
                    return {
                      icon: Globe,
                      label: 'External',
                      bgColor: 'bg-gray-100',
                      textColor: 'text-gray-700',
                      iconColor: 'text-gray-500'
                    };
                  }
                };

                const badgeConfig = getBadgeConfig();
                const BadgeIcon = badgeConfig.icon;

                if (result.content_type === 'image') {
                  return (
                    <div key={result.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="block">
                        <div className="aspect-square bg-gray-100 relative overflow-hidden">
                          <img
                            src={result.thumbnail_url || result.url}
                            alt={result.alt_text || result.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-900 line-clamp-2">
                            {result.title}
                          </p>
                        </div>
                      </a>
                    </div>
                  );
                }

                if (result.content_type === 'video') {
                  return (
                    <div key={result.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="block">
                        {result.thumbnail_url && (
                          <div className="aspect-video bg-gray-100 relative">
                            <img
                              src={result.thumbnail_url}
                              alt={result.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Video className="w-10 h-10 text-white opacity-70" />
                            </div>
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-900 line-clamp-2">
                            {result.title}
                          </p>
                        </div>
                      </a>
                    </div>
                  );
                }

                return (
                  <div key={result.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <BadgeIcon className={`w-5 h-5 ${badgeConfig.iconColor} flex-shrink-0 mt-1`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badgeConfig.bgColor} ${badgeConfig.textColor}`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badgeConfig.label}
                          </span>
                        </div>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-medium text-blue-600 hover:underline line-clamp-2 flex items-center gap-1"
                        >
                          {result.title || 'Untitled'}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                        <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                          {result.description || result.content_snippet}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {safeGetHostname(result.url, 'Unknown domain')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!loading && filteredResults.length === 0 && query && (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No results found for "{query}"</p>
                  <p className="text-sm text-gray-500 mt-1">Try adjusting your search or enable external content</p>
                </div>
              )}

              {!query && (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Search the Human-Only Web</p>
                  <p className="text-sm text-gray-500 mt-1">Enter a search term to find verified content</p>
                </div>
              )}
            </div>
          )}

          {filteredResults.length > 15 && (
            <div className="mt-4 text-center">
              <a
                href={`/search?q=${encodeURIComponent(query)}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={onClose}
              >
                View All {filteredResults.length} Results
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
