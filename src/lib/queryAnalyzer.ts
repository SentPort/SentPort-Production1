import { parseWordBasedMathExpression, containsMathWords } from './mathExpressionParser';
import { parseConversionQuery, containsConversionQuery, ConversionRequest } from './unitConversionParser';

export type QueryIntent = 'computational' | 'informational' | 'navigational' | 'general';

export interface SearchResult {
  url: string;
  title?: string;
  [key: string]: any;
}

export interface QueryAnalysis {
  intent: QueryIntent;
  showCalculator: boolean;
  showWikipedia: boolean;
  showUnitConverter: boolean;
  showScientificNotationCalculators: boolean;
  extractedExpression?: string;
  extractedConversion?: ConversionRequest;
  extractedScientificNotation?: string;
  normalizedQuery: string;
}

const CALCULATOR_KEYWORDS = [
  'calculator',
  'calculate',
  'compute',
  'solve',
  'math',
  'mathematics',
  'equation',
  'formula',
  'algebra',
  'calculus',
  'trigonometry',
  'geometry',
  'arithmetic',
  'factorial',
  'logarithm',
  'exponential',
  'derivative',
  'integral',
  'quadratic',
  'linear equation',
  'sine',
  'cosine',
  'tangent',
  'sqrt',
  'square root',
  'cube root',
  'power',
  'exponent',
  'plus',
  'minus',
  'multiply',
  'divide',
  'sum',
  'difference',
  'product',
  'quotient',
  'percent',
  'percentage',
  'ratio',
  'proportion',
  'average',
  'mean',
  'median',
  'mode'
];

const MATH_SYMBOLS = /[\+\-\*\/\^\(\)\=\√\π\∑\∫]/;

const NUMERIC_EXPRESSION = /^[\d\s\+\-\*\/\^\(\)\.]+$/;

const WIKIPEDIA_INDICATORS = [
  'what is',
  'who is',
  'who was',
  'what are',
  'define',
  'definition of',
  'meaning of',
  'explain',
  'history of',
  'biography'
];

const COMMON_ENCYCLOPEDIA_TOPICS = [
  'mathematics',
  'physics',
  'chemistry',
  'biology',
  'astronomy',
  'geography',
  'history',
  'philosophy',
  'psychology',
  'economics',
  'sociology',
  'anthropology',
  'archaeology',
  'literature',
  'art',
  'music',
  'architecture',
  'engineering',
  'computer science',
  'medicine',
  'anatomy',
  'genetics',
  'ecology',
  'geology',
  'meteorology',
  'oceanography',
  'paleontology',
  'zoology',
  'botany',
  'mythology',
  'religion',
  'theology',
  'ethics',
  'logic',
  'linguistics',
  'political science',
  'democracy',
  'capitalism',
  'socialism',
  'renaissance',
  'enlightenment',
  'revolution',
  'evolution',
  'photosynthesis',
  'quantum',
  'relativity',
  'thermodynamics',
  'electromagnetism',
  'gravity',
  'universe',
  'galaxy',
  'planet',
  'atom',
  'molecule',
  'element',
  'compound',
  'protein',
  'dna',
  'rna',
  'cell',
  'organism',
  'species',
  'ecosystem',
  'climate'
];

const COMMON_STOPWORDS = [
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'should', 'could', 'may', 'might', 'must', 'can', 'about'
];

const SCIENTIFIC_NOTATION_KEYWORDS = [
  'scientific notation',
  'e notation',
  'e-notation',
  'exponential notation',
  'scientific',
  'notation'
];

const SCIENTIFIC_NOTATION_PATTERN = /\d+\.?\d*[eE][+-]?\d+/;

function containsMathSymbols(query: string): boolean {
  return MATH_SYMBOLS.test(query);
}

function isNumericExpression(query: string): boolean {
  const trimmed = query.trim().replace(/[?!=]+$/, '');
  return NUMERIC_EXPRESSION.test(trimmed) && trimmed.length > 0;
}

function containsCalculatorKeywords(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return CALCULATOR_KEYWORDS.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lowerQuery);
  });
}

function containsWikipediaIndicators(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return WIKIPEDIA_INDICATORS.some(indicator => lowerQuery.startsWith(indicator));
}

function hasWikipediaInResults(results: SearchResult[]): boolean {
  if (!results || results.length === 0) {
    return false;
  }

  return results.some(result => {
    const url = result.url?.toLowerCase() || '';
    return url.includes('wikipedia.org') || url.includes('simple.wikipedia.org');
  });
}

function looksLikeProperNoun(query: string): boolean {
  const trimmed = query.trim();
  const words = trimmed.split(/\s+/);

  if (words.length < 2 || words.length > 4) {
    return false;
  }

  const validWords = words.filter(word => {
    const lowerWord = word.toLowerCase();
    if (COMMON_STOPWORDS.includes(lowerWord)) {
      return false;
    }
    return /^[a-zA-Z]+$/.test(word) && word.length >= 2;
  });

  if (validWords.length < 2) {
    return false;
  }

  const allWordsReasonableLength = validWords.every(word => word.length >= 2 && word.length <= 20);
  if (!allWordsReasonableLength) {
    return false;
  }

  return true;
}

function isProperNoun(query: string): boolean {
  const trimmed = query.trim();
  const words = trimmed.split(/\s+/);

  if (words.length === 1) {
    return /^[A-Z][a-z]+$/.test(trimmed);
  }

  if (words.length >= 2 && words.length <= 4) {
    const allCapitalized = words.every(word => /^[A-Z][a-z]+$/.test(word));
    if (allCapitalized) {
      return true;
    }

    const firstCapitalized = /^[A-Z][a-z]+$/.test(words[0]);
    const restLowercase = words.slice(1).every(word => /^[a-z]+$/.test(word));
    if (firstCapitalized && restLowercase) {
      return true;
    }
  }

  return false;
}

function isEncyclopediaTopic(query: string, searchResults?: SearchResult[]): boolean {
  const lowerQuery = query.toLowerCase().trim();
  const trimmedQuery = query.trim();

  if (searchResults && hasWikipediaInResults(searchResults)) {
    return true;
  }

  if (COMMON_ENCYCLOPEDIA_TOPICS.includes(lowerQuery)) {
    return true;
  }

  if (isProperNoun(trimmedQuery)) {
    return true;
  }

  if (looksLikeProperNoun(trimmedQuery)) {
    return true;
  }

  if (lowerQuery.split(/\s+/).length === 1 && lowerQuery.length >= 3) {
    if (/^[A-Z][a-z]+$/.test(trimmedQuery)) {
      return true;
    }
  }

  if (/^[a-z]+$/.test(lowerQuery) && lowerQuery.length >= 4) {
    return true;
  }

  return false;
}

function extractMathExpression(query: string): string | undefined {
  const trimmed = query.trim();
  const cleaned = trimmed.replace(/[?!=]+$/, '');

  if (isNumericExpression(trimmed)) {
    return cleaned;
  }

  const match = trimmed.match(/^(?:solve|calculate|compute|what\s+is)\s+(.+)$/i);
  if (match && match[1]) {
    const expression = match[1].trim().replace(/[?!.]+$/, '');
    if (containsMathSymbols(expression) || isNumericExpression(expression)) {
      return expression;
    }
  }

  const wordBasedExpression = parseWordBasedMathExpression(trimmed);
  if (wordBasedExpression) {
    return wordBasedExpression;
  }

  return undefined;
}

function normalizeQueryForWikipedia(query: string): string {
  let normalized = query.trim();

  const prefixes = [
    'what is ',
    'what are ',
    'who is ',
    'who was ',
    'who were ',
    'define ',
    'definition of ',
    'meaning of ',
    'explain ',
    'history of ',
    'biography of ',
    'biography '
  ];

  const lowerNormalized = normalized.toLowerCase();
  for (const prefix of prefixes) {
    if (lowerNormalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length);
      break;
    }
  }

  normalized = normalized.replace(/\?+$/, '').trim();

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function containsScientificNotation(query: string): boolean {
  return SCIENTIFIC_NOTATION_PATTERN.test(query);
}

function containsScientificNotationKeywords(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return SCIENTIFIC_NOTATION_KEYWORDS.some(keyword => lowerQuery.includes(keyword));
}

function extractScientificNotation(query: string): string | undefined {
  const match = query.match(SCIENTIFIC_NOTATION_PATTERN);
  return match ? match[0] : undefined;
}

function isScientificNotationQuery(query: string): boolean {
  const hasNotation = containsScientificNotation(query);
  const hasKeywords = containsScientificNotationKeywords(query);
  const lowerQuery = query.toLowerCase();

  const hasWhatIs = lowerQuery.startsWith('what is') || lowerQuery.startsWith('what does');
  const hasCalculatorKeyword = lowerQuery.includes('calculator');

  return (hasNotation && (hasKeywords || hasWhatIs || hasCalculatorKeyword)) ||
         (hasNotation && hasWhatIs) ||
         (hasKeywords && hasCalculatorKeyword && hasNotation) ||
         (hasKeywords && hasNotation);
}

export function analyzeQuery(query: string, searchResults?: SearchResult[]): QueryAnalysis {
  const trimmed = query.trim();

  console.log('[QueryAnalyzer] Analyzing query:', trimmed);
  console.log('[QueryAnalyzer] Search results provided:', !!searchResults, 'count:', searchResults?.length || 0);

  if (trimmed.length === 0) {
    return {
      intent: 'general',
      showCalculator: false,
      showWikipedia: false,
      showUnitConverter: false,
      showScientificNotationCalculators: false,
      normalizedQuery: ''
    };
  }

  const hasConversion = containsConversionQuery(trimmed);
  const extractedConversion = hasConversion ? parseConversionQuery(trimmed) : undefined;

  const hasCalcKeywords = containsCalculatorKeywords(trimmed);
  const hasMathSymbols = containsMathSymbols(trimmed);
  const isNumeric = isNumericExpression(trimmed);
  const hasWikiIndicators = containsWikipediaIndicators(trimmed);
  const isEncyclopedia = isEncyclopediaTopic(trimmed, searchResults);
  const hasMathWords = containsMathWords(trimmed);
  const isScientificNotation = isScientificNotationQuery(trimmed);
  const extractedScientificNotation = extractScientificNotation(trimmed);

  console.log('[QueryAnalyzer] hasConversion:', hasConversion);
  console.log('[QueryAnalyzer] extractedConversion:', extractedConversion);
  console.log('[QueryAnalyzer] hasCalcKeywords:', hasCalcKeywords);
  console.log('[QueryAnalyzer] hasMathSymbols:', hasMathSymbols);
  console.log('[QueryAnalyzer] isNumeric:', isNumeric);
  console.log('[QueryAnalyzer] hasWikiIndicators:', hasWikiIndicators);
  console.log('[QueryAnalyzer] isEncyclopediaTopic:', isEncyclopedia);
  console.log('[QueryAnalyzer] hasMathWords:', hasMathWords);
  console.log('[QueryAnalyzer] isScientificNotation:', isScientificNotation);
  console.log('[QueryAnalyzer] extractedScientificNotation:', extractedScientificNotation);

  const extractedExpression = extractMathExpression(trimmed);

  let intent: QueryIntent = 'general';
  let showCalculator = false;
  let showWikipedia = false;
  let showUnitConverter = false;
  let showScientificNotationCalculators = false;

  if (extractedConversion) {
    showUnitConverter = true;
    intent = 'computational';
  } else if (isNumeric || extractedExpression || hasCalcKeywords || hasMathSymbols || hasMathWords) {
    showCalculator = true;
  }

  if (isScientificNotation) {
    showScientificNotationCalculators = true;
    intent = 'computational';
  }

  if (hasWikiIndicators || isEncyclopedia) {
    showWikipedia = true;
  }

  if (showCalculator && showWikipedia) {
    intent = 'computational';
  } else if (showCalculator) {
    intent = 'computational';
  } else if (showWikipedia && !showUnitConverter) {
    intent = 'informational';
  }

  const normalizedQuery = showWikipedia ? normalizeQueryForWikipedia(trimmed) : trimmed;

  console.log('[QueryAnalyzer] Result - intent:', intent, 'showCalculator:', showCalculator, 'showWikipedia:', showWikipedia, 'showUnitConverter:', showUnitConverter, 'showScientificNotationCalculators:', showScientificNotationCalculators, 'normalizedQuery:', normalizedQuery);

  return {
    intent,
    showCalculator,
    showWikipedia,
    showUnitConverter,
    showScientificNotationCalculators,
    extractedExpression,
    extractedConversion,
    extractedScientificNotation,
    normalizedQuery
  };
}

export function shouldShowCalculator(query: string, searchResults?: SearchResult[]): boolean {
  const analysis = analyzeQuery(query, searchResults);
  return analysis.showCalculator;
}

export function shouldShowWikipedia(query: string, searchResults?: SearchResult[]): boolean {
  const analysis = analyzeQuery(query, searchResults);
  return analysis.showWikipedia;
}
