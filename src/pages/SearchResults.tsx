import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Globe, CheckCircle, FileText, Image, Video, Newspaper, Users, Sparkles, TrendingUp, Shield, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePageTracking } from '../hooks/usePageTracking';
import { trackSearch } from '../lib/analytics';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { SearchWithHistory } from '../components/shared/SearchWithHistory';
import { safeGetHostname } from '../lib/urlHelpers';
import { useSearchPreferencesContext } from '../contexts/SearchPreferencesContext';
import { deduplicateSearchResults, getDomainStats } from '../lib/searchDeduplication';
import { SentPortPagination } from '../components/shared/SentPortPagination';
import { PeopleAlsoSearchFor } from '../components/shared/PeopleAlsoSearchFor';
import { calculatePagination, paginateResults, getPageFromUrl, updatePageInUrl } from '../lib/searchPaginationHelpers';
import { shouldIncludeInEnglishSearch } from '../lib/languageDetection';
import { SearchWidgetContainer } from '../components/shared/SearchWidgetContainer';
import { analyzeQuery } from '../lib/queryAnalyzer';
import { Calculator } from '../components/shared/Calculator';
import { WikipediaKnowledgePanel } from '../components/shared/WikipediaKnowledgePanel';
import { UnitConverter } from '../components/shared/UnitConverter';
import { generateSearchVariations, calculateSimilarity, findBestFuzzyMatch, expandAcronyms, isLikelyAcronym } from '../lib/queryPreprocessing';
import { recordSpellCheckAttempt, getLearnedCorrection } from '../lib/spellCorrection';
import { checkWikipediaSpelling } from '../lib/wikipediaService';
import { DidYouMean } from '../components/shared/DidYouMean';
import { addWikipediaUrlToPriorityQueue } from '../lib/priorityQueueHelper';

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
  language?: string | null;
  language_confidence?: number | null;
  language_backfill_processed?: boolean;
}

interface DedupedResult extends SearchResult {
  duplicateCount: number;
  domain: string;
  canonicalUrl: string;
  hiddenUrls?: string[];
}

export default function SearchResults() {
  usePageTracking('search');
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { includeExternalContent, setIncludeExternalContent } = useSearchPreferencesContext();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showAllDuplicates, setShowAllDuplicates] = useState(false);
  const [expandedDuplicates, setExpandedDuplicates] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredByLanguageCount, setFilteredByLanguageCount] = useState(0);
  const [scientificNotationCalculatorUrls, setScientificNotationCalculatorUrls] = useState<SearchResult[]>([]);
  const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
  const [showingResultsFor, setShowingResultsFor] = useState<string | null>(null);
  const [spellSuggestions, setSpellSuggestions] = useState<Array<{ correctedQuery: string; confidence: number }>>([]);
  const [spellCheckLogId, setSpellCheckLogId] = useState<string | null>(null);
  const { user, isVerified, isAdmin } = useAuth();
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const resultsTopRef = useRef<HTMLDivElement>(null);
  const openSearchCompletedRef = useRef<boolean>(false);
  const suggestionSourceRef = useRef<'opensearch' | 'wikipedia_panel' | null>(null);
  const autoQueuedUrlsRef = useRef<Set<string>>(new Set());

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
    const pageFromUrl = getPageFromUrl(searchParams);
    setCurrentPage(pageFromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query, includeExternalContent]);

  useEffect(() => {
    setCurrentPage(1);
    updatePageInUrl(1, searchParams, setSearchParams);
  }, [query, activeTab, showAllDuplicates, includeExternalContent]);

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

    openSearchCompletedRef.current = false;
    suggestionSourceRef.current = null;

    if (isMountedRef.current) {
      setLoading(true);
    }

    try {
      const acronymExpansion = expandAcronyms(searchTerm);
      const queryIsAcronym = isLikelyAcronym(searchTerm);

      const searchVariations = generateSearchVariations(searchTerm);
      if (acronymExpansion && !searchVariations.includes(acronymExpansion)) {
        searchVariations.push(acronymExpansion);
      }
      console.log('[Search] Search variations:', searchVariations, acronymExpansion ? `(acronym expanded: ${acronymExpansion})` : '');

      const exactResults: SearchResult[] = [];

      const wikipediaSpellCheckPromise = (async () => {
        if (searchTerm.length >= 3) {
          console.log('[Search] ========== WIKIPEDIA SPELL CHECK START ==========');
          console.log('[Search] Search term:', searchTerm);

          // Check database FIRST for learned corrections from Wikipedia
          console.log('[Search] Step 1: Checking database for learned Wikipedia corrections...');
          const learnedCorrection = await getLearnedCorrection(searchTerm);

          if (currentController.signal.aborted || !isMountedRef.current) {
            console.log('[Search] Aborted after database check');
            return null;
          }

          if (learnedCorrection) {
            console.log(`[Search] ✓ Found learned correction: "${learnedCorrection.correction}" (confidence: ${learnedCorrection.confidence})`);
            const result = {
              suggestion: learnedCorrection.correction,
              confidence: learnedCorrection.confidence,
              source: 'wikipedia_opensearch' as const
            };
            console.log('[Search] Returning learned correction:', result);
            return result;
          }

          // If not in database, call Wikipedia OpenSearch API
          console.log('[Search] Step 2: No learned correction, calling Wikipedia API...');
          const wikiSpellCheck = await checkWikipediaSpelling(searchTerm);

          console.log('[Search] Wikipedia API returned:', wikiSpellCheck);

          if (currentController.signal.aborted || !isMountedRef.current) {
            console.log('[Search] Aborted after Wikipedia API call');
            return null;
          }

          if (wikiSpellCheck) {
            console.log(`[Search] ✓ Wikipedia spell suggestion found: "${wikiSpellCheck.suggestion}" (confidence: ${wikiSpellCheck.confidence})`);
            console.log('[Search] ========== WIKIPEDIA SPELL CHECK END (SUCCESS) ==========');
            return wikiSpellCheck;
          } else {
            console.log('[Search] ✗ No Wikipedia spell suggestion');
            console.log('[Search] ========== WIKIPEDIA SPELL CHECK END (NO RESULT) ==========');
          }
        } else {
          console.log('[Search] Query too short for spell check (<3 chars)');
        }
        return null;
      })();

      const exactSearchPromise = (async () => {
        let foundResults = false;
        for (const variation of searchVariations) {
          const isAcronymVariation = acronymExpansion === variation;

          let dbQuery = supabase
            .from('search_index')
            .select('*')
            .abortSignal(currentController.signal);

          if (!includeExternalContent) {
            dbQuery = dbQuery.eq('is_internal', true);
          }

          dbQuery = dbQuery.or('language_backfill_processed.eq.true,language_backfill_processed.eq.false,language_backfill_processed.is.null');

          const searchTermLower = variation.toLowerCase();
          dbQuery = dbQuery.or(`title.ilike.%${searchTermLower}%,description.ilike.%${searchTermLower}%,content_snippet.ilike.%${searchTermLower}%`);

          const { data, error } = await dbQuery;

          if (currentController.signal.aborted || !isMountedRef.current) {
            return;
          }

          if (data && !error) {
            const tagged = data.map(r => ({ ...r, _searchVariation: variation, _isAcronymExpanded: isAcronymVariation }));
            exactResults.push(...tagged);
          }

          if (data && data.length > 0) {
            foundResults = true;
            if (!isAcronymVariation) {
              break;
            }
          }
        }

        if (!foundResults && searchTerm.trim().split(/\s+/).length >= 3) {
          const tokens = searchTerm.trim().toLowerCase().split(/\s+/).filter(t => t.length > 3);
          const tokenQueries = tokens.slice(0, 3).map(token => {
            let q = supabase
              .from('search_index')
              .select('*')
              .abortSignal(currentController.signal);

            if (!includeExternalContent) {
              q = q.eq('is_internal', true);
            }

            q = q.or('language_backfill_processed.eq.true,language_backfill_processed.eq.false,language_backfill_processed.is.null');
            q = q.or(`title.ilike.%${token}%,description.ilike.%${token}%`);

            return q;
          });

          const tokenResults = await Promise.all(tokenQueries);

          if (currentController.signal.aborted || !isMountedRef.current) return;

          const tokenScoreMap = new Map<string, number>();
          tokenResults.forEach(({ data }) => {
            if (data) {
              data.forEach(r => {
                tokenScoreMap.set(r.id, (tokenScoreMap.get(r.id) || 0) + 1);
              });
            }
          });

          const allTokenData: SearchResult[] = [];
          tokenResults.forEach(({ data }) => {
            if (data) allTokenData.push(...data);
          });

          const seenIds = new Set<string>();
          allTokenData.forEach(r => {
            if (!seenIds.has(r.id)) {
              seenIds.add(r.id);
              const tokenHits = tokenScoreMap.get(r.id) || 1;
              exactResults.push({ ...r, _searchVariation: 'token', _tokenHits: tokenHits } as any);
            }
          });
        }
      })();

      const [wikiSpellCheckResult] = await Promise.all([
        wikipediaSpellCheckPromise,
        exactSearchPromise
      ]);

      console.log('[Search] ========== PROCESSING SPELL CHECK RESULT ==========');
      console.log('[Search] wikiSpellCheckResult:', wikiSpellCheckResult);
      console.log('[Search] searchTerm:', searchTerm);

      if (currentController.signal.aborted || !isMountedRef.current) {
        console.log('[Search] Aborted or unmounted, exiting');
        return;
      }

      // Use ONLY Wikipedia suggestions (with database-first check for learned corrections)
      // NO fuzzy matching, NO combining multiple sources
      // IMPORTANT: Use exact string comparison, not case-insensitive
      // We want "Adam Smith" to be suggested when user types "adma smith"
      if (wikiSpellCheckResult && wikiSpellCheckResult.suggestion !== searchTerm && isMountedRef.current) {
        console.log('[Search] ✓ Spell suggestion ACCEPTED - Creating suggestion UI');
        console.log('[Search] Wikipedia spell suggestion accepted:', {
          original: searchTerm,
          suggestion: wikiSpellCheckResult.suggestion,
          confidence: wikiSpellCheckResult.confidence,
          source: wikiSpellCheckResult.source
        });

        const spellSuggestions = [{
          correctedQuery: wikiSpellCheckResult.suggestion,
          confidence: wikiSpellCheckResult.confidence
        }];

        console.log('[Search] Setting spell suggestions state:', spellSuggestions);
        suggestionSourceRef.current = 'opensearch';
        setSpellSuggestions(spellSuggestions);

        const suggestionSource = wikiSpellCheckResult.source === 'wikipedia_direct' ? 'wikipedia' : 'wikipedia_opensearch';
        console.log('[Search] Recording spell check attempt to database...');
        const logId = await recordSpellCheckAttempt(
          searchTerm,
          wikiSpellCheckResult.suggestion,
          wikiSpellCheckResult.confidence,
          0,
          suggestionSource
        );

        console.log('[Search] Spell check log ID:', logId);

        if (logId && isMountedRef.current) {
          setSpellCheckLogId(logId);
        }
        console.log('[Search] ========== SPELL SUGGESTION SETUP COMPLETE ==========');
      } else if (isMountedRef.current) {
        console.log('[Search] ✗ Spell suggestion REJECTED or not available');
        if (wikiSpellCheckResult) {
          console.log('[Search] Rejection reason: matches search term');
          console.log('[Search] Wikipedia suggestion rejected - matches search term:', {
            suggestion: wikiSpellCheckResult.suggestion,
            searchTerm: searchTerm,
            exactMatch: wikiSpellCheckResult.suggestion === searchTerm
          });
        } else {
          console.log('[Search] Rejection reason: no suggestion from Wikipedia');
          console.log('[Search] No Wikipedia spelling suggestion available');
        }

        // Only clear suggestions if OpenSearch was the one that set them
        // Don't clear if Wikipedia panel provided the suggestion
        if (suggestionSourceRef.current !== 'wikipedia_panel') {
          console.log('[Search] Clearing spell suggestions state (no Wikipedia panel suggestion)');
          setSpellSuggestions([]);
          setSpellCheckLogId(null);
          suggestionSourceRef.current = null;
        } else {
          console.log('[Search] NOT clearing suggestions - Wikipedia panel provided them');
        }

        await recordSpellCheckAttempt(searchTerm, null, 0.0, 0, 'wikipedia_opensearch');
        console.log('[Search] ========== NO SPELL SUGGESTION ==========');
      }

      openSearchCompletedRef.current = true;
      console.log('[Search] OpenSearch spell check completed, flag set to true');

      const fuzzyResults: SearchResult[] = [];

      if (exactResults.length < 5 && searchTerm.trim().split(/\s+/).length <= 3 && searchTerm.length >= 3) {
        const fuzzyTerms = [searchTerm];
        if (acronymExpansion) fuzzyTerms.push(acronymExpansion);

        for (const term of fuzzyTerms) {
          if (currentController.signal.aborted || !isMountedRef.current) break;
          try {
            const { data: fuzzyData, error: fuzzyError } = await supabase
              .rpc('fuzzy_search_content', { search_query: term, similarity_threshold: 0.3, max_results: 20 })
              .abortSignal(currentController.signal);

            if (!fuzzyError && fuzzyData && fuzzyData.length > 0) {
              const tagged = fuzzyData.map((r: SearchResult) => ({ ...r, searchSource: 'fuzzy' }));
              fuzzyResults.push(...tagged);
              console.log(`[Search] Fuzzy search for "${term}" returned ${fuzzyData.length} results`);
            }
          } catch (fuzzyErr: any) {
            if (fuzzyErr.name !== 'AbortError') {
              console.log('[Search] Fuzzy search not available or failed:', fuzzyErr.message);
            }
          }
        }
      }

      const allResultsMap = new Map<string, SearchResult>();

      exactResults.forEach(r => {
        if (!allResultsMap.has(r.id)) {
          allResultsMap.set(r.id, { ...r, searchSource: 'exact' } as any);
        }
      });

      fuzzyResults.forEach(r => {
        if (!allResultsMap.has(r.id)) {
          allResultsMap.set(r.id, r);
        }
      });

      let uniqueResults = Array.from(allResultsMap.values());

      console.log(`[Search] Combined results: ${exactResults.length} exact = ${uniqueResults.length} total`);

      if (uniqueResults.length === 0 && searchTerm.length >= 3) {
        console.log('[Search] No results found, checking for auto-search with high-confidence suggestions...');

        if (currentController.signal.aborted || !isMountedRef.current) {
          return;
        }

        const combinedSuggestions: Array<{ correctedQuery: string; confidence: number }> = [];

        // IMPORTANT: Use exact string comparison (not case-insensitive) to catch typos like "adma smith" -> "Adam Smith"
        if (wikiSpellCheckResult && wikiSpellCheckResult.suggestion !== searchTerm) {
          console.log('[Search] Using background Wikipedia suggestion for auto-search:', wikiSpellCheckResult.suggestion);
          combinedSuggestions.push({
            correctedQuery: wikiSpellCheckResult.suggestion,
            confidence: wikiSpellCheckResult.confidence
          });
        }

        combinedSuggestions.sort((a, b) => b.confidence - a.confidence);

        if (isMountedRef.current && combinedSuggestions.length > 0) {
          setSpellSuggestions(combinedSuggestions);
        }
      } else if (isMountedRef.current) {
        setCorrectedQuery(null);
        setShowingResultsFor(null);
      }

      const initialResultCount = uniqueResults.length;

      const englishResults = uniqueResults.filter(result => {
        const searchSource = (result as any).searchSource;
        const similarityScore = (result as any).similarity_score;

        console.log(`[Search] Filtering result: "${result.title}", searchSource: ${searchSource}, similarity_score: ${similarityScore}, language: ${result.language}`);

        if (searchSource === 'fuzzy' && similarityScore && similarityScore > 0.8) {
          console.log(`[Search] Preserving high-scoring fuzzy match regardless of language: "${result.title}" (score: ${similarityScore})`);
          return true;
        }

        const shouldInclude = shouldIncludeInEnglishSearch({
          title: result.title || '',
          description: result.description || '',
          url: result.url,
          language: result.language,
          language_backfill_processed: result.language_backfill_processed,
        });

        console.log(`[Search] shouldIncludeInEnglishSearch for "${result.title}": ${shouldInclude}`);

        return shouldInclude;
      });

      const filteredCount = initialResultCount - englishResults.length;
      if (isMountedRef.current) {
        setFilteredByLanguageCount(filteredCount);
      }

      console.log(`[Search] Language filtering: ${initialResultCount} -> ${englishResults.length} (filtered ${filteredCount})`);

      const searchTermLower = searchTerm.toLowerCase();
      const expandedTermLower = acronymExpansion?.toLowerCase() || null;

      const scoredResults = englishResults.map(result => {
        let score = result.relevance_score || 0;

        const titleLower = result.title?.toLowerCase() || '';
        const descLower = result.description?.toLowerCase() || '';
        const contentLower = result.content_snippet?.toLowerCase() || '';

        const titleMatch = titleLower.includes(searchTermLower);
        const descMatch = descLower.includes(searchTermLower);
        const contentMatch = contentLower.includes(searchTermLower);

        if (titleMatch) score += 30;
        if (descMatch) score += 20;
        if (contentMatch) score += 10;

        if (expandedTermLower) {
          const expandedTitleMatch = titleLower.includes(expandedTermLower);
          const expandedDescMatch = descLower.includes(expandedTermLower);
          const expandedContentMatch = contentLower.includes(expandedTermLower);

          if (expandedTitleMatch) score += 50;
          if (expandedDescMatch) score += 30;
          if (expandedContentMatch) score += 15;
        }

        const titleSimilarity = calculateSimilarity(searchTermLower, titleLower);
        const descSimilarity = calculateSimilarity(searchTermLower, descLower);

        score += titleSimilarity * 25;
        score += descSimilarity * 15;

        const searchSource = (result as any).searchSource;
        if ((result as any).similarity_score) {
          const simScore = (result as any).similarity_score;
          score += simScore * 40;

          if (searchSource === 'fuzzy') {
            score += simScore * 20;
          } else if (searchSource === 'typo') {
            score += simScore * 15;
          }
        }

        const tokenHits: number = (result as any)._tokenHits || 0;
        if (tokenHits > 1) {
          score += tokenHits * 8;
        }

        if (queryIsAcronym && !titleMatch && !descMatch) {
          const titleHasExpanded = expandedTermLower && titleLower.includes(expandedTermLower);
          const descHasExpanded = expandedTermLower && descLower.includes(expandedTermLower);
          if (!titleHasExpanded && !descHasExpanded) {
            score *= 0.3;
          }
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

      if (isMountedRef.current) {
        trackSearch(searchTerm, scoredResults.length);
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
  }, [includeExternalContent]);

  // Filter results by active tab
  const getFilteredResults = () => {
    if (activeTab === 'all') {
      // "All" tab shows only web pages, excluding images, videos, and news (they have dedicated tabs)
      return results.filter(r => !r.content_type || r.content_type === 'web_page');
    } else if (activeTab === 'images') {
      return results.filter(r => r.content_type === 'image');
    } else if (activeTab === 'videos') {
      return results.filter(r => r.content_type === 'video');
    } else if (activeTab === 'news') {
      // News tab: only show news_article content type AND exclude Heddit posts
      return results.filter(r => r.content_type === 'news_article' && r.source_platform !== 'heddit');
    }
    return results;
  };

  const filteredResults = getFilteredResults();

  // Calculate the actual duplicates to determine if toggle button should show
  const groupedResults = deduplicateSearchResults(filteredResults, {
    maxPerDomain: 5,
    showDuplicates: false,
  });
  const actualTotalDuplicates = groupedResults.reduce((sum, r) => sum + (r.duplicateCount - 1), 0);

  // Apply deduplication for better UX
  const dedupedResults = deduplicateSearchResults(filteredResults, {
    maxPerDomain: 5,
    showDuplicates: showAllDuplicates,
  });

  const domainStats = getDomainStats(dedupedResults);
  const totalHiddenDuplicates = dedupedResults.reduce((sum, r) => sum + (r.duplicateCount - 1), 0);

  const paginationInfo = calculatePagination(dedupedResults, currentPage);
  const paginatedResults = paginateResults(dedupedResults, currentPage);

  const toggleDuplicateExpansion = (resultId: string) => {
    setExpandedDuplicates(prev => {
      const next = new Set(prev);
      if (next.has(resultId)) {
        next.delete(resultId);
      } else {
        next.add(resultId);
      }
      return next;
    });
  };

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery });
    }
  };

  const handleIncludeExternalChange = (checked: boolean) => {
    setIncludeExternalContent(checked);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updatePageInUrl(page, searchParams, setSearchParams);

    if (resultsTopRef.current) {
      resultsTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleRelatedSearchClick = (relatedQuery: string) => {
    setSearchParams({ q: relatedQuery });
  };

  const handleWikipediaLoaded = useCallback(async (wikipediaUrl: string) => {
    if (!wikipediaUrl || autoQueuedUrlsRef.current.has(wikipediaUrl)) {
      return;
    }

    if (paginatedResults.length === 0) {
      console.log('[SearchResults] Zero results detected with Wikipedia panel. Auto-adding to priority queue:', wikipediaUrl);
      autoQueuedUrlsRef.current.add(wikipediaUrl);

      const result = await addWikipediaUrlToPriorityQueue(wikipediaUrl);
      if (result.success) {
        console.log('[SearchResults] Successfully auto-queued Wikipedia URL:', result.message, result.action);
      } else {
        console.log('[SearchResults] Failed to auto-queue Wikipedia URL:', result.message);
      }
    }
  }, [paginatedResults]);

  const handleWikipediaSpellingSuggestion = useCallback((suggestion: string, confidence: number) => {
    console.log('[SearchResults] Received Wikipedia panel spelling suggestion:', suggestion, 'confidence:', confidence);
    console.log('[SearchResults] OpenSearch completed:', openSearchCompletedRef.current);

    if (suggestion !== query && isMountedRef.current) {
      setSpellSuggestions(currentSuggestions => {
        console.log('[SearchResults] Current spell suggestions:', currentSuggestions);

        if (currentSuggestions.length > 0) {
          console.log('[SearchResults] OpenSearch already provided a suggestion, not overriding');
          return currentSuggestions;
        }

        console.log('[SearchResults] Using Wikipedia panel suggestion as spell correction');
        suggestionSourceRef.current = 'wikipedia_panel';
        return [{
          correctedQuery: suggestion,
          confidence: confidence
        }];
      });

      setResults(currentResults => {
        recordSpellCheckAttempt(
          query,
          suggestion,
          confidence,
          currentResults.length,
          'wikipedia_direct'
        ).then(logId => {
          if (logId && isMountedRef.current) {
            setSpellCheckLogId(logId);
          }
        }).catch(err => {
          console.error('[SearchResults] Error recording Wikipedia spell check:', err);
        });

        return currentResults;
      });
    }
  }, [query]);

  // Analyze query with current results to determine what widgets to show
  // Use useMemo to recalculate whenever query or results change
  // This ensures Wikipedia panel shows up both initially and when results load
  const analysis = useMemo(() => {
    if (!query) return null;
    return analyzeQuery(query, results);
  }, [query, results]);

  const showCalculator = analysis?.showCalculator || false;
  const showWikipedia = (analysis?.showWikipedia && includeExternalContent) || false;
  const showUnitConverter = analysis?.showUnitConverter || false;
  const showScientificNotationCalculators = (analysis?.showScientificNotationCalculators && includeExternalContent) || false;

  useEffect(() => {
    if (query && analysis) {
      console.log('[SearchResults] Query:', query);
      console.log('[SearchResults] Analysis:', analysis);
      console.log('[SearchResults] Show Calculator:', showCalculator);
      console.log('[SearchResults] Show Wikipedia:', showWikipedia);
      console.log('[SearchResults] Show Unit Converter:', showUnitConverter);
      console.log('[SearchResults] Show Scientific Notation Calculators:', showScientificNotationCalculators);
      console.log('[SearchResults] Include External Content:', includeExternalContent);
    }
  }, [query, analysis, showCalculator, showWikipedia, showUnitConverter, showScientificNotationCalculators, includeExternalContent]);

  useEffect(() => {
    const fetchScientificNotationCalculators = async () => {
      if (!showScientificNotationCalculators) {
        setScientificNotationCalculatorUrls([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('search_index')
          .select('*')
          .eq('is_verified_external', true)
          .or('url.ilike.%calculator.net/scientific-notation%,url.ilike.%inchcalculator.com/scientific-notation%')
          .limit(5);

        if (data && !error) {
          setScientificNotationCalculatorUrls(data);
        }
      } catch (err) {
        console.error('Error fetching scientific notation calculators:', err);
      }
    };

    fetchScientificNotationCalculators();
  }, [showScientificNotationCalculators]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b sticky top-16 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/" className="flex items-center gap-2">
              <Globe className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">SentPort</span>
            </Link>
            <SearchWithHistory
              platform="main"
              onSearch={handleSearch}
              placeholder="Search the Human-Only Web"
              variant="main"
              className="flex-1"
              initialValue={query}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeExternalContent}
                onChange={(e) => handleIncludeExternalChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Globe className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Include Verified External Content</span>
            </label>
            {includeExternalContent && (
              <span className="text-xs text-blue-600">Includes trusted sources like Wikipedia</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-6 mb-6 border-b">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="font-medium">All</span>
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'images'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Image className="w-4 h-4" />
            <span className="font-medium">Images</span>
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'videos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Video className="w-4 h-4" />
            <span className="font-medium">Videos</span>
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === 'news'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            <span className="font-medium">News</span>
          </button>
        </div>

        {query && (
          <div ref={resultsTopRef} className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{paginationInfo.startIndex + 1}-{paginationInfo.endIndex}</span> of{' '}
                  <span className="font-semibold text-gray-900">{dedupedResults.length}</span> human-verified results for{' '}
                  <span className="font-semibold text-gray-900">"{query}"</span>
                  {actualTotalDuplicates > 0 && !showAllDuplicates && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({actualTotalDuplicates} duplicate{actualTotalDuplicates !== 1 ? 's' : ''} hidden)
                    </span>
                  )}
                </p>
                {filteredByLanguageCount > 0 && (
                  <p className="text-xs text-blue-600">
                    {filteredByLanguageCount} non-English result{filteredByLanguageCount !== 1 ? 's' : ''} filtered
                  </p>
                )}
                {showingResultsFor && showingResultsFor.toLowerCase() !== query.toLowerCase() && (
                  <div className="mt-3 text-sm">
                    <p className="text-gray-600">
                      Showing results for <span className="font-semibold text-gray-900">{showingResultsFor}</span>
                    </p>
                    <button
                      onClick={() => {
                        navigate(`/search?q=${encodeURIComponent(query)}`);
                        window.location.reload();
                      }}
                      className="text-blue-600 hover:underline text-sm mt-1"
                    >
                      Search instead for {query}
                    </button>
                  </div>
                )}
              </div>
              {actualTotalDuplicates > 0 && (
                <button
                  onClick={() => setShowAllDuplicates(!showAllDuplicates)}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  {showAllDuplicates ? 'Group Results' : 'Show All Variations'}
                </button>
              )}
            </div>
            {domainStats.length > 1 && !showAllDuplicates && (
              <div className="mt-3 flex flex-wrap gap-2">
                {domainStats.slice(0, 5).map(stat => (
                  <span
                    key={stat.domain}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    <Globe className="w-3 h-3" />
                    {stat.domain}: {stat.count} result{stat.count !== 1 ? 's' : ''}
                    {stat.totalDuplicates > 0 && (
                      <span className="text-gray-500">
                        (+{stat.totalDuplicates} hidden)
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {spellSuggestions.length > 0 && activeTab === 'all' && (
          <div ref={resultsTopRef}>
            <DidYouMean
              originalQuery={query}
              suggestions={spellSuggestions}
              showMultiple={paginatedResults.length === 0}
              spellCheckLogId={spellCheckLogId}
            />
          </div>
        )}

        {showCalculator && activeTab === 'all' && (
          <div className="mb-6">
            <Calculator initialExpression={analysis?.extractedExpression} />
          </div>
        )}

        {showUnitConverter && activeTab === 'all' && (
          <div className="mb-6">
            <UnitConverter initialConversion={analysis?.extractedConversion} />
          </div>
        )}

        {showScientificNotationCalculators && activeTab === 'all' && (
          <div className="mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Scientific Notation Calculators</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Convert between scientific notation, E-notation, and standard decimal format
                  </p>
                  {scientificNotationCalculatorUrls.length > 0 ? (
                    <div className="space-y-3">
                      {scientificNotationCalculatorUrls.slice(0, 3).map(result => (
                        <a
                          key={result.id}
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                        >
                          <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-blue-900 group-hover:underline">
                                {result.title}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-200 text-blue-800 rounded text-xs font-medium">
                                <CheckCircle className="w-3 h-3" />
                                Verified External
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 line-clamp-2">
                              {result.description}
                            </p>
                            <p className="text-xs text-blue-600 mt-1 truncate">
                              {safeGetHostname(result.url, 'Unknown domain')}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Loading calculator tools...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className={activeTab === 'images' || activeTab === 'videos' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-6'}>
              {paginatedResults.map((result) => {
              const getBadgeConfig = () => {
                if (result.is_internal) {
                  return {
                    icon: Shield,
                    label: 'Verified Human Internal',
                    bgColor: 'bg-green-100',
                    textColor: 'text-green-800',
                    iconColor: 'text-green-600'
                  };
                } else if (result.is_verified_external) {
                  return {
                    icon: CheckCircle,
                    label: 'Verified Human External',
                    bgColor: 'bg-blue-100',
                    textColor: 'text-blue-800',
                    iconColor: 'text-blue-600'
                  };
                } else {
                  return {
                    icon: Globe,
                    label: 'External Content',
                    bgColor: 'bg-gray-100',
                    textColor: 'text-gray-700',
                    iconColor: 'text-gray-500'
                  };
                }
              };

              const badgeConfig = getBadgeConfig();
              const BadgeIcon = badgeConfig.icon;

              // Image result card
              if (result.content_type === 'image') {
                return (
                  <div key={result.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="aspect-square bg-gray-100 relative overflow-hidden">
                        <img
                          src={result.thumbnail_url || result.url}
                          alt={result.alt_text || result.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badgeConfig.bgColor} ${badgeConfig.textColor} shadow-sm`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badgeConfig.label}
                          </span>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                          {result.title}
                        </p>
                        {result.image_width && result.image_height && (
                          <p className="text-xs text-gray-500">
                            {result.image_width} × {result.image_height}
                          </p>
                        )}
                        {result.parent_page_url && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            From: {safeGetHostname(result.parent_page_url, 'Unknown source')}
                          </p>
                        )}
                      </div>
                    </a>
                  </div>
                );
              }

              // Video result card
              if (result.content_type === 'video') {
                return (
                  <div key={result.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="block">
                      {result.thumbnail_url && (
                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                          <img
                            src={result.thumbnail_url}
                            alt={result.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                            <Video className="w-12 h-12 text-white opacity-70" />
                          </div>
                          {result.media_duration && (
                            <div className="absolute bottom-1.5 right-1.5 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded text-[10px] font-medium">
                              {Math.floor(result.media_duration / 60)}:{(result.media_duration % 60).toString().padStart(2, '0')}
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badgeConfig.bgColor} ${badgeConfig.textColor} shadow-sm`}>
                              <BadgeIcon className="w-3 h-3" />
                              {badgeConfig.label}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="p-2">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                          {result.title}
                        </h3>
                        {result.author_name && (
                          <p className="text-xs text-gray-600 truncate mb-1">{result.author_name}</p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          {result.view_count !== null && result.view_count !== undefined && (
                            <span>{result.view_count >= 1000 ? `${(result.view_count / 1000).toFixed(1)}K` : result.view_count} views</span>
                          )}
                        </div>
                      </div>
                    </a>
                  </div>
                );
              }

              // News article result card
              if (result.content_type === 'news_article') {
                return (
                  <div key={result.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex gap-4">
                      {result.thumbnail_url && (
                        <a href={result.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={result.thumbnail_url}
                            alt={result.title}
                            className="w-32 h-32 object-cover rounded flex-shrink-0"
                            loading="lazy"
                          />
                        </a>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badgeConfig.bgColor} ${badgeConfig.textColor}`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badgeConfig.label}
                          </span>
                          <span className="text-sm text-gray-600">
                            {safeGetHostname(result.url, 'Unknown domain')}
                          </span>
                        </div>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xl font-medium text-blue-600 hover:underline line-clamp-2 block mb-2"
                        >
                          {result.title || 'Untitled Article'}
                        </a>
                        <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                          {result.description || result.content_snippet}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {result.author_name && <span>By {result.author_name}</span>}
                          {result.publication_date && (
                            <span>
                              {new Date(result.publication_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Default web page result card
              return (
                <div key={result.id}>
                  <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-2">
                      <BadgeIcon className={`w-5 h-5 ${badgeConfig.iconColor} flex-shrink-0 mt-1`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badgeConfig.bgColor} ${badgeConfig.textColor}`}>
                            <BadgeIcon className="w-3 h-3" />
                            {badgeConfig.label}
                          </span>
                          <span className="text-sm text-gray-600">
                            {result.domain || safeGetHostname(result.url, 'Unknown domain')}
                          </span>
                          {result.duplicateCount > 1 && !showAllDuplicates && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              +{result.duplicateCount - 1} variation{result.duplicateCount - 1 !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xl font-medium text-blue-600 hover:underline"
                      >
                        {result.title || 'Untitled Page'}
                      </a>
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                        {result.description || result.content_snippet}
                      </p>
                      <div className="flex items-center gap-4 mt-3 min-w-0">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate min-w-0"
                        >
                          {result.url}
                        </a>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {new Date(result.last_indexed_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        </div>
                        {result.duplicateCount > 1 && result.hiddenUrls && !showAllDuplicates && (
                          <button
                            onClick={() => toggleDuplicateExpansion(result.id)}
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 mt-3"
                          >
                            {expandedDuplicates.has(result.id) ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                Hide {result.duplicateCount - 1} duplicate{result.duplicateCount - 1 !== 1 ? 's' : ''}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                Show {result.duplicateCount - 1} more URL{result.duplicateCount - 1 !== 1 ? 's' : ''}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {expandedDuplicates.has(result.id) && result.hiddenUrls && (
                    <div className="mt-2 ml-12 space-y-1">
                      {result.hiddenUrls.map((hiddenUrl, idx) => (
                        <div key={idx} className="bg-gray-50 rounded p-3 border border-gray-200">
                          <a
                            href={hiddenUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline break-all"
                          >
                            {hiddenUrl}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {!loading && results.length === 0 && query && (
              <div className="max-w-3xl mx-auto">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-10 border-2 border-blue-100 shadow-lg">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full mb-6 shadow-lg">
                      <Users className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      Building the Human-Verified Internet Together
                    </h3>
                    <p className="text-lg text-gray-700 leading-relaxed">
                      No results yet, but your search matters more than you think.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-8 mb-6 border border-blue-100">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Shield className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-3">Why This Search Is Important</h4>
                        <p className="text-gray-700 leading-relaxed mb-3">
                          Every search you perform helps us understand what human-verified content the world needs. In an internet increasingly flooded with bot-generated content and synthetic information, you're helping build a database of authentic, human-created knowledge.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                          Your query for <span className="font-semibold text-blue-600">"{query}"</span> has been recorded. As our community grows and more verified humans publish content, results will appear here.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 mb-6 pt-6 border-t border-gray-100">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-3">Our Database Grows Every Day</h4>
                        <p className="text-gray-700 leading-relaxed">
                          We're continuously indexing human-verified content from verified subdomain owners and trusted external sources. Each day brings new authentic voices and reliable information to our search index, free from bot manipulation and synthetic content.
                        </p>
                      </div>
                    </div>

                    {!includeExternalContent && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Tip:</span> Try enabling "Include Verified External Content" above to search trusted sources like Wikipedia while we continue building our internal database.
                        </p>
                      </div>
                    )}
                  </div>

                  {!user || !isVerified ? (
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-8 text-white">
                      <div className="flex items-start gap-4 mb-6">
                        <Sparkles className="w-8 h-8 flex-shrink-0" />
                        <div>
                          <h4 className="text-2xl font-bold mb-3">Help Us Grow Even Faster</h4>
                          <p className="text-blue-50 leading-relaxed mb-4">
                            The fastest way to build the human-verified internet is for real people like you to contribute. Get verified, claim your free subdomain, and publish your authentic content to help others discover human-created information.
                          </p>
                          <div className="space-y-2 text-blue-50 mb-6">
                            <div className="flex items-start">
                              <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                              <span>Get verified as a real human in minutes</span>
                            </div>
                            <div className="flex items-start">
                              <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                              <span>Claim your free yourname.sentientportal.com subdomain</span>
                            </div>
                            <div className="flex items-start">
                              <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                              <span>Publish content that gets priority in search results</span>
                            </div>
                            <div className="flex items-start">
                              <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                              <span>Help others find trustworthy, human-verified information</span>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(user ? '/dashboard' : '/signin')}
                            className="w-full bg-white text-blue-600 px-6 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
                          >
                            {user ? 'Get Verified & Claim Your Domain' : 'Sign Up & Get Started'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-green-600 to-cyan-600 rounded-xl p-8 text-white">
                      <div className="flex items-start gap-4">
                        <Sparkles className="w-8 h-8 flex-shrink-0" />
                        <div>
                          <h4 className="text-2xl font-bold mb-3">You're Part of the Solution</h4>
                          <p className="text-green-50 leading-relaxed mb-4">
                            As a verified human, every search you perform helps prioritize what content our community needs. Consider claiming a free subdomain and publishing your expertise to help build the human-verified web.
                          </p>
                          <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors"
                          >
                            Claim Your Free Subdomain
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-center mt-6">
                    <p className="text-sm text-gray-600">
                      Together, we're building an internet where authenticity matters and real human voices are heard.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!query && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Search the Human-Only Web</h3>
                <p className="text-gray-600">
                  Enter a search term to find human-verified content
                </p>
              </div>
            )}
                </div>

                {dedupedResults.length > 0 && (
                  <>
                    <PeopleAlsoSearchFor
                      currentQuery={query}
                      onSearchClick={handleRelatedSearchClick}
                    />

                    <SentPortPagination
                      currentPage={paginationInfo.currentPage}
                      totalPages={paginationInfo.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </>
                )}
              </>
            )}
          </div>

          {query && showWikipedia && activeTab === 'all' && (
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <WikipediaKnowledgePanel
                  query={analysis?.normalizedQuery || query}
                  onSpellingSuggestion={handleWikipediaSpellingSuggestion}
                  onWikipediaLoaded={handleWikipediaLoaded}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
