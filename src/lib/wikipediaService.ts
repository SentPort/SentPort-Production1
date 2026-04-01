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
  if (cached) return cached;

  try {
    const response = await fetch(
      `${WIKIPEDIA_API_BASE}/page/summary/${encodeURIComponent(title)}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Wikipedia API error: ${response.status}`);
    }

    const data: WikipediaSummary = await response.json();

    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Error fetching Wikipedia summary:', error);
    return null;
  }
}

export async function findExactWikipediaMatch(query: string): Promise<WikipediaSummary | null> {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return null;
  }

  const summary = await getWikipediaSummary(normalizedQuery);

  if (summary && summary.type !== 'disambiguation') {
    return summary;
  }

  const searchResults = await searchWikipediaTitles(normalizedQuery);

  if (searchResults.length === 0) {
    return null;
  }

  const exactMatch = searchResults.find(
    result => result.title.toLowerCase() === normalizedQuery.toLowerCase()
  );

  if (exactMatch) {
    return await getWikipediaSummary(exactMatch.title);
  }

  const firstResult = searchResults[0];
  if (firstResult && firstResult.title.toLowerCase().includes(normalizedQuery.toLowerCase())) {
    return await getWikipediaSummary(firstResult.title);
  }

  return null;
}
