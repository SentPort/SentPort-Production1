const QUESTION_WORDS = [
  'who', 'what', 'when', 'where', 'why', 'how', 'is', 'are', 'was', 'were',
  'does', 'do', 'did', 'can', 'could', 'would', 'should', 'will', 'shall',
  'may', 'might', 'has', 'have', 'had', 'been', 'being', 'am'
];

const NOISE_WORDS = [
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'as', 'by', 'with', 'from', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'all', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'this', 'that', 'these', 'those'
];

export function normalizeQuery(query: string): string {
  const trimmed = query.trim();

  const words = trimmed.toLowerCase().split(/\s+/);

  const filtered = words.filter((word, index) => {
    if (index === 0 && QUESTION_WORDS.includes(word)) {
      return false;
    }

    if (QUESTION_WORDS.includes(word) && index < 3) {
      return false;
    }

    return true;
  });

  const result = filtered.join(' ').trim();

  return result || trimmed;
}

export function extractEntityFromQuery(query: string): string {
  const trimmed = query.trim();
  const words = trimmed.split(/\s+/);

  const filtered: string[] = [];
  let skipNext = false;

  for (let i = 0; i < words.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }

    const word = words[i].toLowerCase();

    if (i === 0 && QUESTION_WORDS.includes(word)) {
      continue;
    }

    if (QUESTION_WORDS.includes(word) && i < 4) {
      continue;
    }

    if (NOISE_WORDS.includes(word) && filtered.length === 0) {
      continue;
    }

    filtered.push(words[i]);
  }

  const result = filtered.join(' ').trim();
  return result || trimmed;
}

export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  return 1 - (distance / maxLen);
}

export function isFuzzyMatch(query: string, target: string, threshold: number = 0.8): boolean {
  const similarity = calculateSimilarity(query, target);
  return similarity >= threshold;
}

export function findBestFuzzyMatch<T>(
  query: string,
  items: T[],
  extractText: (item: T) => string,
  threshold: number = 0.75
): T | null {
  let bestMatch: T | null = null;
  let bestScore = threshold;

  for (const item of items) {
    const text = extractText(item);
    const similarity = calculateSimilarity(query, text);

    if (similarity > bestScore) {
      bestScore = similarity;
      bestMatch = item;
    }
  }

  return bestMatch;
}

export function generateSearchVariations(query: string): string[] {
  const variations: string[] = [query];

  const normalized = normalizeQuery(query);
  if (normalized !== query) {
    variations.push(normalized);
  }

  const entity = extractEntityFromQuery(query);
  if (entity !== query && entity !== normalized) {
    variations.push(entity);
  }

  const lowerQuery = query.toLowerCase();
  if (lowerQuery !== query) {
    variations.push(lowerQuery);
  }

  return [...new Set(variations)];
}

export function shouldAttemptSpellCorrection(query: string, resultCount: number): boolean {
  if (resultCount > 0) return false;

  if (query.length < 3) return false;

  const words = query.split(/\s+/);
  if (words.length > 5) return false;

  return true;
}

export function cleanSearchQuery(query: string): string {
  let cleaned = query.trim();

  cleaned = cleaned.replace(/[^\w\s\-']/g, ' ');

  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned;
}
