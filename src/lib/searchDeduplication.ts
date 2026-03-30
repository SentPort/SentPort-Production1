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

interface DedupedResult extends SearchResult {
  duplicateCount: number;
  domain: string;
  canonicalUrl: string;
  hiddenUrls?: string[];
}

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname;
    domain = domain.replace(/^www\./i, '');
    return domain.toLowerCase();
  } catch {
    return '';
  }
}

export function generateCanonicalUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let canonical = url;

    // Remove anchor fragments
    canonical = canonical.replace(/#.*$/, '');

    // For Wikipedia redirect URLs, they all point to the same page
    // Extract the actual canonical form by removing the redirect wrapper
    if (urlObj.hostname.includes('wikipedia.org') && urlObj.pathname.includes('/w/index.php')) {
      const titleParam = urlObj.searchParams.get('title');
      const redirectParam = urlObj.searchParams.get('redirect');

      // If it's a redirect URL, use just the domain + title parameter as canonical
      if (titleParam && redirectParam === 'no') {
        // All redirects to the same page should share the same canonical form
        // We'll normalize by removing the title parameter entirely and using the path
        canonical = `${urlObj.protocol}//${urlObj.hostname}/w/index.php`;
      }
    }

    // Remove tracking and version parameters
    canonical = canonical.replace(/[?&](utm_[^&]+|redirect=[^&]+|oldid=[^&]+|title=[^&]+)/g, '');
    canonical = canonical.replace(/[?&]$/, '');
    canonical = canonical.replace(/\?$/, '');

    return canonical;
  } catch {
    return url;
  }
}

export function deduplicateSearchResults(
  results: SearchResult[],
  options: {
    maxPerDomain?: number;
    showDuplicates?: boolean;
  } = {}
): DedupedResult[] {
  const { maxPerDomain = 5, showDuplicates = false } = options;

  if (showDuplicates) {
    return results.map(r => ({
      ...r,
      duplicateCount: 1,
      domain: extractDomain(r.url),
      canonicalUrl: generateCanonicalUrl(r.url),
    }));
  }

  const duplicateGroups = new Map<string, SearchResult[]>();
  const domainCounts = new Map<string, number>();

  for (const result of results) {
    const domain = extractDomain(result.url);
    const canonical = generateCanonicalUrl(result.url);
    const groupKey = `${result.title}|||${canonical}`;

    if (!duplicateGroups.has(groupKey)) {
      duplicateGroups.set(groupKey, []);
    }
    duplicateGroups.get(groupKey)!.push(result);
  }

  const dedupedResults: DedupedResult[] = [];

  duplicateGroups.forEach((group) => {
    group.sort((a, b) => {
      const aIsCanonical = a.url === generateCanonicalUrl(a.url) ? 1 : 0;
      const bIsCanonical = b.url === generateCanonicalUrl(b.url) ? 1 : 0;
      if (aIsCanonical !== bIsCanonical) return bIsCanonical - aIsCanonical;
      return (b.calculatedScore || 0) - (a.calculatedScore || 0);
    });

    const best = group[0];
    const domain = extractDomain(best.url);
    const currentDomainCount = domainCounts.get(domain) || 0;

    if (currentDomainCount < maxPerDomain) {
      domainCounts.set(domain, currentDomainCount + 1);

      dedupedResults.push({
        ...best,
        duplicateCount: group.length,
        domain,
        canonicalUrl: generateCanonicalUrl(best.url),
        hiddenUrls: group.length > 1 ? group.slice(1).map(r => r.url) : undefined,
      });
    }
  });

  dedupedResults.sort((a, b) => (b.calculatedScore || 0) - (a.calculatedScore || 0));

  return dedupedResults;
}

export function groupResultsByDomain(results: DedupedResult[]): Map<string, DedupedResult[]> {
  const domainGroups = new Map<string, DedupedResult[]>();

  for (const result of results) {
    if (!domainGroups.has(result.domain)) {
      domainGroups.set(result.domain, []);
    }
    domainGroups.get(result.domain)!.push(result);
  }

  return domainGroups;
}

export function getDomainStats(results: DedupedResult[]): {
  domain: string;
  count: number;
  totalDuplicates: number;
}[] {
  const domainMap = new Map<string, { count: number; totalDuplicates: number }>();

  for (const result of results) {
    const existing = domainMap.get(result.domain) || { count: 0, totalDuplicates: 0 };
    domainMap.set(result.domain, {
      count: existing.count + 1,
      totalDuplicates: existing.totalDuplicates + (result.duplicateCount - 1),
    });
  }

  return Array.from(domainMap.entries())
    .map(([domain, stats]) => ({ domain, ...stats }))
    .sort((a, b) => b.count - a.count);
}
