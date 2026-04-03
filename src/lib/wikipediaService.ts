export interface WikipediaSearchResult {
  id: number;
  key: string;
  title: string;
  excerpt: string;
  matched_title: string | null;
  description: string | null;
  thumbnail?: {
    mimetype: string;
    size: number | null;
    width: number;
    height: number;
    duration: number | null;
    url: string;
  };
}

export interface WikipediaSummary {
  type: string;
  title: string;
  displaytitle: string;
  namespace: {
    id: number;
    text: string;
  };
  wikibase_item: string;
  titles: {
    canonical: string;
    normalized: string;
    display: string;
  };
  pageid: number;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  originalimage?: {
    source: string;
    width: number;
    height: number;
  };
  lang: string;
  dir: string;
  revision: string;
  tid: string;
  timestamp: string;
  description: string;
  description_source: string;
  content_urls: {
    desktop: {
      page: string;
      revisions: string;
      edit: string;
      talk: string;
    };
    mobile: {
      page: string;
      revisions: string;
      edit: string;
      talk: string;
    };
  };
  extract: string;
  extract_html: string;
}

import { extractEntityFromQuery, calculateSimilarity, findBestFuzzyMatch } from './queryPreprocessing';

const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/api/rest_v1';
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CachedData<any>>();

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_DURATION_MS) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export async function searchWikipediaTitles(query: string): Promise<WikipediaSearchResult[]> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCachedData<WikipediaSearchResult[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${WIKIPEDIA_API_BASE}/page/title/${encodeURIComponent(query)}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Wikipedia API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.items || [];

    setCachedData(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error searching Wikipedia titles:', error);
    return [];
  }
}

export async function getWikipediaSummary(title: string): Promise<WikipediaSummary | null> {
  const cacheKey = `summary:${title.toLowerCase()}`;
  const cached = getCachedData<WikipediaSummary>(cacheKey);
  if (cached) {
    console.log('[Wikipedia] Using cached summary for:', title);
    return cached;
  }

  try {
    const url = `${WIKIPEDIA_API_BASE}/page/summary/${encodeURIComponent(title)}`;
    console.log('[Wikipedia] Fetching summary from:', url);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[Wikipedia] Summary not found (404):', title);
        return null;
      }
      throw new Error(`Wikipedia API error: ${response.status}`);
    }

    const data: WikipediaSummary = await response.json();
    console.log('[Wikipedia] Successfully fetched summary for:', data.title);

    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('[Wikipedia] Error fetching summary:', error);
    return null;
  }
}

export async function findExactWikipediaMatch(query: string): Promise<WikipediaSummary | null> {
  const normalizedQuery = query.trim();

  console.log('[Wikipedia] Searching for:', normalizedQuery);

  if (normalizedQuery.length < 2) {
    console.log('[Wikipedia] Query too short, skipping');
    return null;
  }

  const summary = await getWikipediaSummary(normalizedQuery);

  if (summary && summary.type !== 'disambiguation') {
    console.log('[Wikipedia] Found direct match:', summary.title);
    return summary;
  }

  console.log('[Wikipedia] No direct match, searching titles...');
  const searchResults = await searchWikipediaTitles(normalizedQuery);

  if (searchResults.length === 0) {
    console.log('[Wikipedia] No search results found');
    return null;
  }

  console.log('[Wikipedia] Found', searchResults.length, 'search results');

  const exactMatch = searchResults.find(
    result => result.title.toLowerCase() === normalizedQuery.toLowerCase()
  );

  if (exactMatch) {
    console.log('[Wikipedia] Found exact match from search:', exactMatch.title);
    return await getWikipediaSummary(exactMatch.title);
  }

  const firstResult = searchResults[0];
  if (firstResult && firstResult.title.toLowerCase().includes(normalizedQuery.toLowerCase())) {
    console.log('[Wikipedia] Using first result:', firstResult.title);
    return await getWikipediaSummary(firstResult.title);
  }

  console.log('[Wikipedia] No suitable match found');
  return null;
}

export async function searchWikipediaWithOpenSearch(query: string): Promise<string[]> {
  const cacheKey = `opensearch:${query.toLowerCase()}`;
  const cached = getCachedData<string[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=10&format=json&origin=*`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const suggestions = data[1] || [];

    setCachedData(cacheKey, suggestions);
    return suggestions;
  } catch (error) {
    console.error('[Wikipedia] Error with OpenSearch API:', error);
    return [];
  }
}

export async function getWikipediaSpellingSuggestion(query: string): Promise<string | null> {
  const cacheKey = `spell:${query.toLowerCase()}`;
  const cached = getCachedData<string | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const suggestions = await searchWikipediaWithOpenSearch(query);

    if (suggestions.length > 0) {
      const topSuggestion = suggestions[0];

      if (topSuggestion.toLowerCase() !== query.toLowerCase()) {
        console.log(`[Wikipedia Spell] Suggestion for "${query}": "${topSuggestion}"`);
        setCachedData(cacheKey, topSuggestion);
        return topSuggestion;
      }
    }

    setCachedData(cacheKey, null);
    return null;
  } catch (error) {
    console.error('[Wikipedia] Error getting spelling suggestion:', error);
    return null;
  }
}

export interface WikipediaSpellCheckResult {
  suggestion: string;
  confidence: number;
  source: 'wikipedia_direct' | 'wikipedia_opensearch';
}

export async function checkWikipediaSpelling(query: string): Promise<WikipediaSpellCheckResult | null> {
  const cacheKey = `spellcheck:${query.toLowerCase()}`;
  const cached = getCachedData<WikipediaSpellCheckResult | null>(cacheKey);
  if (cached !== undefined) {
    console.log('[Wikipedia Spell Check] Using cached result for:', query);
    return cached;
  }

  const trimmedQuery = query.trim();
  console.log('[Wikipedia Spell Check] Checking spelling for:', trimmedQuery);

  if (trimmedQuery.length < 3) {
    console.log('[Wikipedia Spell Check] Query too short');
    setCachedData(cacheKey, null);
    return null;
  }

  try {
    const wikipediaData = await findWikipediaWithSmartMatching(trimmedQuery);

    if (wikipediaData) {
      const similarity = calculateSimilarity(trimmedQuery.toLowerCase(), wikipediaData.title.toLowerCase());
      console.log('[Wikipedia Spell Check] Similarity between query and Wikipedia title:', similarity);

      if (similarity < 0.9 && wikipediaData.title.toLowerCase() !== trimmedQuery.toLowerCase()) {
        console.log('[Wikipedia Spell Check] Found spelling suggestion (direct):', wikipediaData.title);
        const result: WikipediaSpellCheckResult = {
          suggestion: wikipediaData.title,
          confidence: 0.95,
          source: 'wikipedia_direct'
        };
        setCachedData(cacheKey, result);
        return result;
      }
    }

    const openSearchSuggestion = await getWikipediaSpellingSuggestion(trimmedQuery);
    if (openSearchSuggestion) {
      console.log('[Wikipedia Spell Check] Found spelling suggestion (OpenSearch):', openSearchSuggestion);
      const result: WikipediaSpellCheckResult = {
        suggestion: openSearchSuggestion,
        confidence: 0.85,
        source: 'wikipedia_opensearch'
      };
      setCachedData(cacheKey, result);
      return result;
    }

    console.log('[Wikipedia Spell Check] No spelling suggestion found');
    setCachedData(cacheKey, null);
    return null;
  } catch (error) {
    console.error('[Wikipedia Spell Check] Error checking spelling:', error);
    setCachedData(cacheKey, null);
    return null;
  }
}

export async function findWikipediaWithSmartMatching(query: string): Promise<WikipediaSummary | null> {
  const trimmedQuery = query.trim();

  console.log('[Wikipedia Smart Match] Original query:', trimmedQuery);

  if (trimmedQuery.length < 2) {
    console.log('[Wikipedia Smart Match] Query too short');
    return null;
  }

  const extractedEntity = extractEntityFromQuery(trimmedQuery);
  console.log('[Wikipedia Smart Match] Extracted entity:', extractedEntity);

  const searchQueries = [extractedEntity, trimmedQuery];

  for (const searchQuery of searchQueries) {
    console.log('[Wikipedia Smart Match] Trying query:', searchQuery);

    const directSummary = await getWikipediaSummary(searchQuery);
    if (directSummary && directSummary.type !== 'disambiguation') {
      console.log('[Wikipedia Smart Match] Found direct match:', directSummary.title);
      return directSummary;
    }

    const titleResults = await searchWikipediaTitles(searchQuery);

    if (titleResults.length > 0) {
      const exactMatch = titleResults.find(
        result => result.title.toLowerCase() === searchQuery.toLowerCase()
      );

      if (exactMatch) {
        console.log('[Wikipedia Smart Match] Found exact title match:', exactMatch.title);
        return await getWikipediaSummary(exactMatch.title);
      }

      const fuzzyMatch = findBestFuzzyMatch(
        searchQuery,
        titleResults,
        (result) => result.title,
        0.7
      );

      if (fuzzyMatch) {
        console.log('[Wikipedia Smart Match] Found fuzzy match:', fuzzyMatch.title);
        return await getWikipediaSummary(fuzzyMatch.title);
      }

      const firstResult = titleResults[0];
      if (firstResult) {
        const similarity = calculateSimilarity(searchQuery, firstResult.title);
        console.log('[Wikipedia Smart Match] Similarity to first result:', similarity);

        if (similarity > 0.5 || firstResult.title.toLowerCase().includes(searchQuery.toLowerCase())) {
          console.log('[Wikipedia Smart Match] Using first result:', firstResult.title);
          return await getWikipediaSummary(firstResult.title);
        }
      }
    }

    const openSearchSuggestions = await searchWikipediaWithOpenSearch(searchQuery);

    if (openSearchSuggestions.length > 0) {
      console.log('[Wikipedia Smart Match] OpenSearch suggestions:', openSearchSuggestions);

      const bestSuggestion = findBestFuzzyMatch(
        searchQuery,
        openSearchSuggestions,
        (suggestion) => suggestion,
        0.65
      );

      if (bestSuggestion) {
        console.log('[Wikipedia Smart Match] Using OpenSearch suggestion:', bestSuggestion);
        const summary = await getWikipediaSummary(bestSuggestion);
        if (summary && summary.type !== 'disambiguation') {
          return summary;
        }
      }

      const firstSuggestion = openSearchSuggestions[0];
      console.log('[Wikipedia Smart Match] Trying first suggestion:', firstSuggestion);
      const summary = await getWikipediaSummary(firstSuggestion);
      if (summary && summary.type !== 'disambiguation') {
        return summary;
      }
    }
  }

  console.log('[Wikipedia Smart Match] No match found');
  return null;
}
