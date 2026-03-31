export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  isEnglish: boolean;
  detectedSignals: string[];
}

const LANGUAGE_PATTERNS = {
  cjk: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/,
  cyrillic: /[\u0400-\u04FF]/,
  arabic: /[\u0600-\u06FF\u0750-\u077F]/,
  thai: /[\u0E00-\u0E7F]/,
  hebrew: /[\u0590-\u05FF]/,
  devanagari: /[\u0900-\u097F]/,
  greek: /[\u0370-\u03FF]/,
};

const URL_LANGUAGE_CODES = [
  { pattern: /\/ja[\/\-_]|\.jp$/i, lang: 'ja', name: 'Japanese' },
  { pattern: /\/zh[\/\-_]|\/cn[\/\-_]|\.cn$/i, lang: 'zh', name: 'Chinese' },
  { pattern: /\/ko[\/\-_]|\.kr$/i, lang: 'ko', name: 'Korean' },
  { pattern: /\/ru[\/\-_]|\.ru$/i, lang: 'ru', name: 'Russian' },
  { pattern: /\/fr[\/\-_]|\.fr$/i, lang: 'fr', name: 'French' },
  { pattern: /\/de[\/\-_]|\.de$/i, lang: 'de', name: 'German' },
  { pattern: /\/es[\/\-_]|\.es$/i, lang: 'es', name: 'Spanish' },
  { pattern: /\/pt[\/\-_]|\.pt$/i, lang: 'pt', name: 'Portuguese' },
  { pattern: /\/it[\/\-_]|\.it$/i, lang: 'it', name: 'Italian' },
  { pattern: /\/ar[\/\-_]|\.sa$|\.ae$/i, lang: 'ar', name: 'Arabic' },
  { pattern: /\/nl[\/\-_]|\.nl$/i, lang: 'nl', name: 'Dutch' },
  { pattern: /\/pl[\/\-_]|\.pl$/i, lang: 'pl', name: 'Polish' },
  { pattern: /\/tr[\/\-_]|\.tr$/i, lang: 'tr', name: 'Turkish' },
  { pattern: /\/th[\/\-_]|\.th$/i, lang: 'th', name: 'Thai' },
  { pattern: /\/vi[\/\-_]|\.vn$/i, lang: 'vi', name: 'Vietnamese' },
  { pattern: /\/he[\/\-_]|\.il$/i, lang: 'he', name: 'Hebrew' },
  { pattern: /\/hi[\/\-_]|\.in$/i, lang: 'hi', name: 'Hindi' },
  { pattern: /\/en[\/\-_]/i, lang: 'en', name: 'English' },
];

const WIKIPEDIA_PATTERN = /^([a-z]{2,3})\.wikipedia\.org/i;

const COMMON_NON_ENGLISH_WORDS = [
  { words: ['メ', 'ジ', 'ャ', 'ー', 'リ', 'ー', 'グ'], lang: 'ja' },
  { words: ['wikipédia', 'aller', 'menu', 'principal', 'article', 'rechercher'], lang: 'fr' },
  { words: ['artykuł', 'kategorie', 'przejdź', 'strona'], lang: 'pl' },
  { words: ['статья', 'главная', 'категория'], lang: 'ru' },
  { words: ['artikel', 'hauptseite', 'kategorie'], lang: 'de' },
  { words: ['artículo', 'categoría', 'página'], lang: 'es' },
  { words: ['artigo', 'categoria', 'página'], lang: 'pt' },
];

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return '';
  }
}

function detectScriptType(text: string): { script: string; percentage: number } | null {
  if (!text || text.length < 5) return null;

  const totalChars = text.replace(/[\s\d\p{P}]/gu, '').length;
  if (totalChars === 0) return null;

  for (const [scriptName, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    const matches = text.match(new RegExp(pattern, 'g'));
    if (matches && matches.length > 0) {
      const percentage = (matches.length / totalChars) * 100;
      if (percentage > 10) {
        return { script: scriptName, percentage };
      }
    }
  }

  return null;
}

function detectLanguageFromUrl(url: string): { lang: string; confidence: number; signal: string } | null {
  const domain = extractDomain(url);

  const wikipediaMatch = domain.match(WIKIPEDIA_PATTERN);
  if (wikipediaMatch) {
    const langCode = wikipediaMatch[1].toLowerCase();
    if (langCode !== 'en' && langCode !== 'www') {
      return { lang: langCode, confidence: 0.9, signal: `Wikipedia subdomain: ${langCode}` };
    }
  }

  for (const { pattern, lang, name } of URL_LANGUAGE_CODES) {
    if (pattern.test(url) || pattern.test(domain)) {
      const confidence = lang === 'en' ? 0.3 : 0.7;
      return { lang, confidence, signal: `URL pattern: ${name}` };
    }
  }

  return null;
}

function detectLanguageFromText(text: string): { lang: string; confidence: number; signal: string } | null {
  if (!text || text.length < 10) return null;

  const lowerText = text.toLowerCase();

  for (const { words, lang } of COMMON_NON_ENGLISH_WORDS) {
    const matchCount = words.filter(word => lowerText.includes(word.toLowerCase())).length;
    if (matchCount >= 2) {
      return { lang, confidence: 0.6, signal: `Common words detected: ${lang}` };
    }
  }

  const scriptDetection = detectScriptType(text);
  if (scriptDetection) {
    const langMap: { [key: string]: string } = {
      cjk: 'ja',
      cyrillic: 'ru',
      arabic: 'ar',
      thai: 'th',
      hebrew: 'he',
      devanagari: 'hi',
      greek: 'el',
    };

    const lang = langMap[scriptDetection.script] || 'unknown';
    const confidence = scriptDetection.percentage > 70 ? 0.95 : 0.7;

    return { lang, confidence, signal: `Script: ${scriptDetection.script} (${scriptDetection.percentage.toFixed(1)}%)` };
  }

  return null;
}

export function detectLanguage(
  title: string,
  description: string,
  url: string
): LanguageDetectionResult {
  const signals: string[] = [];
  let detectedLang = 'en';
  let totalConfidence = 0;
  let signalCount = 0;

  const combinedText = `${title} ${description}`.trim();

  if (!combinedText || combinedText.length < 10) {
    return {
      language: 'unknown',
      confidence: 0.0,
      isEnglish: false,
      detectedSignals: ['Insufficient text content'],
    };
  }

  const urlDetection = detectLanguageFromUrl(url);
  if (urlDetection) {
    signals.push(urlDetection.signal);
    if (urlDetection.lang !== 'en') {
      detectedLang = urlDetection.lang;
      totalConfidence += urlDetection.confidence;
      signalCount++;
    } else if (urlDetection.confidence > 0.5) {
      totalConfidence += urlDetection.confidence;
      signalCount++;
    }
  }

  const textDetection = detectLanguageFromText(combinedText);
  if (textDetection) {
    signals.push(textDetection.signal);
    if (textDetection.lang !== 'unknown') {
      detectedLang = textDetection.lang;
      totalConfidence += textDetection.confidence;
      signalCount++;
    }
  }

  if (signalCount === 0) {
    const hasNonAscii = /[^\x00-\x7F]/.test(combinedText);
    if (hasNonAscii) {
      const accentPattern = /[àáâãäåèéêëìíîïòóôõöùúûüýÿñçæœ]/i;
      if (accentPattern.test(combinedText)) {
        signals.push('European diacritics detected');
        return {
          language: 'other',
          confidence: 0.5,
          isEnglish: false,
          detectedSignals: signals,
        };
      }
    }

    signals.push('Default: English (no non-English signals detected)');
    return {
      language: 'en',
      confidence: 0.6,
      isEnglish: true,
      detectedSignals: signals,
    };
  }

  const avgConfidence = totalConfidence / signalCount;

  if (detectedLang !== 'en' && avgConfidence < 0.4) {
    detectedLang = 'unknown';
  }

  const isEnglish = detectedLang === 'en' && avgConfidence >= 0.5;

  return {
    language: detectedLang,
    confidence: Math.min(avgConfidence, 1.0),
    isEnglish,
    detectedSignals: signals.length > 0 ? signals : ['No clear language signals'],
  };
}

export function isLikelyEnglish(
  title: string,
  description: string,
  url: string,
  language?: string | null,
  languageBackfillProcessed?: boolean
): boolean {
  if (languageBackfillProcessed && language === 'en') {
    return true;
  }

  if (languageBackfillProcessed && language !== 'en') {
    return false;
  }

  const detection = detectLanguage(title, description, url);

  if (detection.language === 'unknown' && detection.confidence < 0.3) {
    return false;
  }

  return detection.isEnglish && detection.confidence >= 0.5;
}

export function shouldIncludeInEnglishSearch(result: {
  title: string;
  description: string;
  url: string;
  language?: string | null;
  language_backfill_processed?: boolean;
}): boolean {
  if (result.language_backfill_processed && result.language === 'en') {
    return true;
  }

  if (result.language_backfill_processed && result.language !== 'en') {
    return false;
  }

  return isLikelyEnglish(
    result.title,
    result.description,
    result.url,
    result.language,
    result.language_backfill_processed
  );
}
