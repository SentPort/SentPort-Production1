import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CrawlerQueueItem {
  id: string;
  url: string;
  priority: number;
  attempts: number;
  priority_crawl: boolean;
}

interface ContentTypeData {
  contentType: 'web_page' | 'image' | 'video' | 'news_article';
  sourcePlatform: string | null;
  thumbnailUrl: string | null;
  mediaDuration: number | null;
  publicationDate: string | null;
  authorName: string | null;
  viewCount: number | null;
}

interface ExtractedImage {
  url: string;
  title: string;
  description: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  isInternal: boolean;
  sourcePlatform: string | null;
}

interface LanguageDetectionResult {
  language: string;
  confidence: number;
}

const LANGUAGE_PATTERNS = {
  cjk: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/g,
  cyrillic: /[\u0400-\u04FF]/g,
  arabic: /[\u0600-\u06FF\u0750-\u077F]/g,
  thai: /[\u0E00-\u0E7F]/g,
  hebrew: /[\u0590-\u05FF]/g,
  devanagari: /[\u0900-\u097F]/g,
  greek: /[\u0370-\u03FF]/g,
};

const URL_LANGUAGE_CODES = [
  { pattern: /\/ja[\/\-_]|\.jp$/i, lang: 'ja' },
  { pattern: /\/zh[\/\-_]|\/cn[\/\-_]|\.cn$/i, lang: 'zh' },
  { pattern: /\/ko[\/\-_]|\.kr$/i, lang: 'ko' },
  { pattern: /\/ru[\/\-_]|\.ru$/i, lang: 'ru' },
  { pattern: /\/fr[\/\-_]|\.fr$/i, lang: 'fr' },
  { pattern: /\/de[\/\-_]|\.de$/i, lang: 'de' },
  { pattern: /\/es[\/\-_]|\.es$/i, lang: 'es' },
  { pattern: /\/pt[\/\-_]|\.pt$/i, lang: 'pt' },
  { pattern: /\/it[\/\-_]|\.it$/i, lang: 'it' },
  { pattern: /\/ar[\/\-_]|\.sa$|\.ae$/i, lang: 'ar' },
  { pattern: /\/nl[\/\-_]|\.nl$/i, lang: 'nl' },
  { pattern: /\/pl[\/\-_]|\.pl$/i, lang: 'pl' },
  { pattern: /\/tr[\/\-_]|\.tr$/i, lang: 'tr' },
  { pattern: /\/th[\/\-_]|\.th$/i, lang: 'th' },
  { pattern: /\/vi[\/\-_]|\.vn$/i, lang: 'vi' },
  { pattern: /\/he[\/\-_]|\.il$/i, lang: 'he' },
  { pattern: /\/hi[\/\-_]|\.in$/i, lang: 'hi' },
  { pattern: /\/en[\/\-_]/i, lang: 'en' },
];

const WIKIPEDIA_PATTERN = /^([a-z]{2,3})\.wikipedia\.org/i;

function detectLanguageFromHtml(url: string, html: string, title: string, description: string): LanguageDetectionResult {
  const signals: { lang: string; confidence: number }[] = [];

  const langAttrMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  if (langAttrMatch) {
    const htmlLang = langAttrMatch[1].toLowerCase().split('-')[0];
    signals.push({ lang: htmlLang, confidence: 0.9 });
  }

  const metaLangMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:locale|language)["']\s+content=["']([^"']+)["']/i);
  if (metaLangMatch) {
    const metaLang = metaLangMatch[1].toLowerCase().split(/[-_]/)[0];
    signals.push({ lang: metaLang, confidence: 0.8 });
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();

    const wikipediaMatch = domain.match(WIKIPEDIA_PATTERN);
    if (wikipediaMatch) {
      const langCode = wikipediaMatch[1].toLowerCase();
      if (langCode !== 'en' && langCode !== 'www') {
        signals.push({ lang: langCode, confidence: 0.95 });
      }
    }

    for (const { pattern, lang } of URL_LANGUAGE_CODES) {
      if (pattern.test(url) || pattern.test(domain)) {
        const confidence = lang === 'en' ? 0.3 : 0.7;
        signals.push({ lang, confidence });
        break;
      }
    }
  } catch (e) {
  }

  const combinedText = `${title} ${description}`.trim();
  if (combinedText.length > 10) {
    const totalChars = combinedText.replace(/[\s\d\p{P}]/gu, '').length;

    if (totalChars > 0) {
      const langMap: { [key: string]: string } = {
        cjk: 'ja',
        cyrillic: 'ru',
        arabic: 'ar',
        thai: 'th',
        hebrew: 'he',
        devanagari: 'hi',
        greek: 'el',
      };

      for (const [scriptName, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
        const matches = combinedText.match(pattern);
        if (matches && matches.length > 0) {
          const percentage = (matches.length / totalChars) * 100;
          if (percentage > 10) {
            const lang = langMap[scriptName] || 'unknown';
            const confidence = percentage > 70 ? 0.95 : 0.7;
            signals.push({ lang, confidence });
            break;
          }
        }
      }
    }
  }

  if (signals.length === 0) {
    return { language: 'en', confidence: 0.6 };
  }

  const langCounts: { [key: string]: { count: number; totalConf: number } } = {};
  for (const signal of signals) {
    if (!langCounts[signal.lang]) {
      langCounts[signal.lang] = { count: 0, totalConf: 0 };
    }
    langCounts[signal.lang].count++;
    langCounts[signal.lang].totalConf += signal.confidence;
  }

  let bestLang = 'en';
  let bestScore = 0;

  for (const [lang, data] of Object.entries(langCounts)) {
    const avgConfidence = data.totalConf / data.count;
    const score = avgConfidence * data.count;
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  const avgConfidence = langCounts[bestLang].totalConf / langCounts[bestLang].count;

  return {
    language: bestLang,
    confidence: Math.min(avgConfidence, 1.0)
  };
}

function extractBaseDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname;

    domain = domain.replace(/^www\./i, '');

    return domain.toLowerCase();
  } catch {
    return '';
  }
}

// Detect content type and extract metadata
async function detectContentType(url: string, html: string, bodyHtml: string, supabase: any): Promise<ContentTypeData> {
  const urlLower = url.toLowerCase();
  const urlObj = new URL(url);
  const domain = urlObj.hostname;
  const baseDomain = extractBaseDomain(url);

  // PRIORITY 0: Direct image URL detection (check for dimension patterns and image extensions)
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
  const dimensionPattern = /\/(\d+)x(\d+)\//;
  const dimensionMatch = url.match(dimensionPattern);

  // If URL has dimension pattern AND image extension, OR has common CDN image indicators
  if ((dimensionMatch && imageExtensions.test(url)) ||
      (url.includes('/filters:') && imageExtensions.test(url)) ||
      (url.includes('max_bytes(') && imageExtensions.test(url))) {

    return {
      contentType: 'image',
      sourcePlatform: baseDomain.includes('investopedia.com') ? 'investopedia' :
                      baseDomain.includes('medium.com') ? 'medium' : 'generic_web',
      thumbnailUrl: url,
      mediaDuration: null,
      publicationDate: null,
      authorName: null,
      viewCount: null
    };
  }

  // PRIORITY 1: Check admin-defined domain rules first
  const { data: domainRule } = await supabase
    .from('content_type_domain_rules')
    .select('content_type')
    .eq('domain', baseDomain)
    .maybeSingle();

  if (domainRule) {
    // Admin has explicitly set the content type for this domain
    const thumbnailMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : null;

    const dateMatch = html.match(/<meta\s+(?:property|name)=["'](?:article:published_time|published_date|datePublished|uploadDate)["']\s+content=["']([^"']+)["']/i);
    const pubDate = dateMatch ? dateMatch[1] : null;

    const authorMatch = html.match(/<meta\s+(?:property|name)=["']author["']\s+content=["']([^"']+)["']/i);
    const author = authorMatch ? authorMatch[1] : null;

    let platform = 'generic_web';
    if (baseDomain.includes('wikipedia.org')) platform = 'wikipedia';
    else if (baseDomain.includes('investopedia.com')) platform = 'investopedia';
    else if (baseDomain.includes('britannica.com')) platform = 'britannica';
    else if (baseDomain.includes('imdb.com')) platform = 'imdb';
    else if (baseDomain.includes('medium.com')) platform = 'medium';
    else if (baseDomain.includes('cnn.com')) platform = 'cnn';
    else if (baseDomain.includes('bbc.com') || baseDomain.includes('bbc.co.uk')) platform = 'bbc';
    else if (baseDomain.includes('nytimes.com')) platform = 'nytimes';

    return {
      contentType: domainRule.content_type,
      sourcePlatform: platform,
      thumbnailUrl: thumbnail,
      mediaDuration: null,
      publicationDate: pubDate,
      authorName: author,
      viewCount: null
    };
  }

  // PRIORITY 2: YouTube video detection
  if (domain.includes('youtube.com') && (urlObj.pathname.includes('/watch') || urlObj.pathname.includes('/shorts/'))) {
    const thumbnailMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : null;

    const dateMatch = html.match(/<meta\s+(?:property|name)=["'](?:uploadDate|datePublished)["']\s+content=["']([^"']+)["']/i);
    const pubDate = dateMatch ? dateMatch[1] : null;

    const authorMatch = html.match(/<meta\s+(?:property|name)=["'](?:author|video:creator)["']\s+content=["']([^"']+)["']/i);
    const author = authorMatch ? authorMatch[1] : null;

    return {
      contentType: 'video',
      sourcePlatform: 'youtube',
      thumbnailUrl: thumbnail,
      mediaDuration: null,
      publicationDate: pubDate,
      authorName: author,
      viewCount: null
    };
  }

  // Generic video detection (video tags, embedded players)
  if (bodyHtml.includes('<video') || bodyHtml.includes('youtube.com/embed') ||
      bodyHtml.includes('vimeo.com/video') || urlLower.match(/\.(mp4|webm|ogg|mov)$/)) {
    const thumbnailMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : null;

    return {
      contentType: 'video',
      sourcePlatform: 'generic_web',
      thumbnailUrl: thumbnail,
      mediaDuration: null,
      publicationDate: null,
      authorName: null,
      viewCount: null
    };
  }

  // Reference/Encyclopedia sites detection (should be web_page, not news)
  const referenceSites = [
    'wikipedia.org',
    'investopedia.com',
    'britannica.com',
    'dictionary.com',
    'merriam-webster.com',
    'thesaurus.com',
    'archive.org',
    'imdb.com'
  ];

  const isReferenceSite = referenceSites.some(site => domain.includes(site));

  if (isReferenceSite) {
    const thumbnailMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : null;

    let platform = 'generic_web';
    if (domain.includes('wikipedia.org')) platform = 'wikipedia';
    else if (domain.includes('investopedia.com')) platform = 'investopedia';
    else if (domain.includes('britannica.com')) platform = 'britannica';
    else if (domain.includes('imdb.com')) platform = 'imdb';

    return {
      contentType: 'web_page',
      sourcePlatform: platform,
      thumbnailUrl: thumbnail,
      mediaDuration: null,
      publicationDate: null,
      authorName: null,
      viewCount: null
    };
  }

  // News article detection (only for actual news sites)
  const newsSites = [
    'cnn.com',
    'bbc.com',
    'bbc.co.uk',
    'reuters.com',
    'nytimes.com',
    'washingtonpost.com',
    'theguardian.com',
    'apnews.com',
    'bloomberg.com',
    'forbes.com',
    'wsj.com',
    'cnbc.com',
    'nbcnews.com',
    'abcnews.go.com',
    'cbsnews.com',
    'foxnews.com',
    'usatoday.com',
    'time.com',
    'newsweek.com',
    'politico.com',
    'thehill.com',
    'axios.com',
    'techcrunch.com',
    'theverge.com',
    'engadget.com',
    'arstechnica.com',
    'wired.com'
  ];

  const isNewsSite = newsSites.some(site => domain.includes(site));

  // News article detection
  const hasArticleTag = bodyHtml.includes('<article') || html.includes('type="article"');
  const hasNewsKeywords = html.match(/<meta\s+(?:property|name)=["'](?:article:|news:|og:type)["']/i);
  const hasByline = bodyHtml.match(/<(?:span|div|p)[^>]*class=["'][^"']*(?:byline|author|published)[^"']*["']/i);

  // Only classify as news if it's from a known news site OR has strong news indicators
  if ((isNewsSite && (hasArticleTag || hasNewsKeywords || hasByline)) ||
      (hasNewsKeywords && hasByline && hasArticleTag)) {
    const thumbnailMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : null;

    const dateMatch = html.match(/<meta\s+(?:property|name)=["'](?:article:published_time|published_date|datePublished)["']\s+content=["']([^"']+)["']/i);
    const pubDate = dateMatch ? dateMatch[1] : null;

    const authorMatch = html.match(/<meta\s+(?:property|name)=["']author["']\s+content=["']([^"']+)["']/i);
    const author = authorMatch ? authorMatch[1] : null;

    let platform = 'generic_web';
    if (domain.includes('medium.com')) platform = 'medium';
    else if (domain.includes('cnn.com')) platform = 'cnn';
    else if (domain.includes('bbc.com') || domain.includes('bbc.co.uk')) platform = 'bbc';
    else if (domain.includes('nytimes.com')) platform = 'nytimes';

    return {
      contentType: 'news_article',
      sourcePlatform: platform,
      thumbnailUrl: thumbnail,
      mediaDuration: null,
      publicationDate: pubDate,
      authorName: author,
      viewCount: null
    };
  }

  // Default: web page
  let platform = 'generic_web';
  if (domain.includes('wikipedia.org')) platform = 'wikipedia';
  else if (domain.includes('github.com')) platform = 'github';

  return {
    contentType: 'web_page',
    sourcePlatform: platform,
    thumbnailUrl: null,
    mediaDuration: null,
    publicationDate: null,
    authorName: null,
    viewCount: null
  };
}

// Extract images from a page
function extractImages(pageUrl: string, html: string, bodyHtml: string, isInternal: boolean): ExtractedImage[] {
  const images: ExtractedImage[] = [];
  const pageUrlObj = new URL(pageUrl);
  const pageDomain = pageUrlObj.hostname;

  // Extract og:image (primary image)
  const ogImageMatch = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogImageMatch) {
    const imageUrl = resolveUrl(ogImageMatch[1], pageUrl);
    if (imageUrl && isValidImageUrl(imageUrl)) {
      const titleMatch = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i);
      const descMatch = html.match(/<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']+)["']/i);

      images.push({
        url: imageUrl,
        title: titleMatch ? titleMatch[1] : 'Image from ' + pageDomain,
        description: descMatch ? descMatch[1] : '',
        altText: 'Open Graph image',
        width: null,
        height: null,
        isInternal: new URL(imageUrl).hostname.includes('sentport.com'),
        sourcePlatform: pageDomain.includes('wikipedia.org') ? 'wikipedia' : 'generic_web'
      });
    }
  }

  // Extract img tags (limit to first 10 significant images)
  const imgMatches = bodyHtml.matchAll(/<img[^>]+>/gi);
  let imgCount = 0;

  for (const match of imgMatches) {
    if (imgCount >= 10) break;

    const imgTag = match[0];
    const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
    if (!srcMatch) continue;

    const imageUrl = resolveUrl(srcMatch[1], pageUrl);
    if (!imageUrl || !isValidImageUrl(imageUrl)) continue;

    // Skip small images (likely icons/logos)
    const widthMatch = imgTag.match(/width=["']?(\d+)/i);
    const heightMatch = imgTag.match(/height=["']?(\d+)/i);
    const width = widthMatch ? parseInt(widthMatch[1]) : null;
    const height = heightMatch ? parseInt(heightMatch[1]) : null;

    if (width && width < 100 || height && height < 100) continue;

    // Skip if already added (og:image might be duplicate)
    if (images.some(img => img.url === imageUrl)) continue;

    const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
    const altText = altMatch ? altMatch[1] : null;

    images.push({
      url: imageUrl,
      title: altText || 'Image from ' + pageDomain,
      description: altText || '',
      altText,
      width,
      height,
      isInternal: new URL(imageUrl).hostname.includes('sentport.com'),
      sourcePlatform: pageDomain.includes('wikipedia.org') ? 'wikipedia' : 'generic_web'
    });

    imgCount++;
  }

  return images;
}

// Resolve relative URLs to absolute
function resolveUrl(url: string, baseUrl: string): string | null {
  try {
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      const baseUrlObj = new URL(baseUrl);
      return `${baseUrlObj.protocol}//${baseUrlObj.host}${url}`;
    }
    return new URL(url, baseUrl).href;
  } catch {
    return null;
  }
}

// Validate if URL is a valid image
function isValidImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  const urlLower = url.toLowerCase();

  // Check file extension
  if (imageExtensions.some(ext => urlLower.includes(ext))) {
    return true;
  }

  // Check for common image CDN patterns
  if (urlLower.includes('image') || urlLower.includes('img') || urlLower.includes('photo')) {
    return true;
  }

  return false;
}

// Check if URL is a social platform page that should be skipped
function shouldSkipUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  const socialPlatformPaths = [
    '/hutube/',
    '/heddit/',
    '/switter/',
    '/hubook/',
    '/hinsta/',
    '/blog/'
  ];

  return socialPlatformPaths.some(path => urlLower.includes(path));
}

// Normalize URL by ensuring it has a protocol
function normalizeUrl(url: string): string {
  if (!url || !url.trim()) {
    throw new Error('URL cannot be empty');
  }

  const trimmedUrl = url.trim();

  // If URL already has a protocol, return it
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }

  // If URL starts with //, prepend https:
  if (trimmedUrl.startsWith('//')) {
    return 'https:' + trimmedUrl;
  }

  // Otherwise, prepend https://
  return 'https://' + trimmedUrl;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check authorization: either CRON_SECRET (for automated jobs) or admin user (for manual triggers)
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');

    let isAuthorized = false;
    let userId: string | null = null;

    // Check if it's a cron job with the secret
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true;
    } else if (authHeader?.startsWith('Bearer ')) {
      // Check if it's an authenticated admin user
      const token = authHeader.replace('Bearer ', '');

      // Create a client with the user's token to verify their session
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      });

      const { data: { user }, error } = await userClient.auth.getUser();

      if (user && !error) {
        // Check if user is an admin using the service role client
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData?.is_admin === true) {
          isAuthorized = true;
          userId = user.id;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { batchSize = 100, triggeredBy = null } = await req.json();

    // Check if auto-crawler is enabled (only for automatic crawls)
    if (!triggeredBy) {
      const { data: settingData } = await supabase
        .from('crawler_settings')
        .select('value')
        .eq('key', 'auto_crawl_enabled')
        .maybeSingle();

      if (settingData && settingData.value === 'false') {
        return new Response(
          JSON.stringify({ message: 'Auto-crawler is paused. Skipping automatic crawl.' }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            }
          }
        );
      }
    }

    // Check if link collection is enabled
    const { data: linkCollectionData } = await supabase
      .from('crawler_settings')
      .select('value')
      .eq('key', 'link_collection_enabled')
      .maybeSingle();

    const linkCollectionEnabled = linkCollectionData?.value !== 'false';

    const { data: historyRecord } = await supabase
      .from('crawler_history')
      .insert({
        crawl_type: triggeredBy ? 'manual' : 'automatic',
        batch_size: batchSize,
        triggered_by: triggeredBy,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    // Fetch priority crawl URLs first (up to batchSize)
    const { data: priorityUrls } = await supabase
      .from('crawler_queue')
      .select('*')
      .eq('status', 'pending')
      .eq('priority_crawl', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(batchSize);

    let queuedUrls = priorityUrls || [];

    // If we have less than batchSize priority URLs, fill with regular pending URLs
    if (queuedUrls.length < batchSize) {
      const remaining = batchSize - queuedUrls.length;
      const { data: regularUrls } = await supabase
        .from('crawler_queue')
        .select('*')
        .eq('status', 'pending')
        .eq('priority_crawl', false)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(remaining);

      if (regularUrls && regularUrls.length > 0) {
        queuedUrls = [...queuedUrls, ...regularUrls];
      }
    }

    if (!queuedUrls || queuedUrls.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No URLs in queue to process' }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    let successCount = 0;
    let failCount = 0;

    for (const item of queuedUrls as CrawlerQueueItem[]) {
      // Skip social platform URLs
      if (shouldSkipUrl(item.url)) {
        await supabase
          .from('crawler_queue')
          .delete()
          .eq('id', item.id);

        successCount++;
        continue;
      }

      await supabase
        .from('crawler_queue')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', item.id);

      try {
        // Normalize URL to ensure it has a protocol
        let normalizedUrl: string;
        try {
          normalizedUrl = normalizeUrl(item.url);
        } catch (normalizeError) {
          throw new Error(`Invalid URL: '${item.url}'`);
        }

        // Validate URL format
        let urlObj: URL;
        try {
          urlObj = new URL(normalizedUrl);
        } catch (urlError) {
          throw new Error(`Invalid URL: '${item.url}'`);
        }

        const startTime = Date.now();
        const response = await fetch(normalizedUrl, {
          headers: {
            'User-Agent': 'SentPort-Crawler/1.0 (Human-Verified Content)'
          },
          signal: AbortSignal.timeout(10000)
        });

        const responseTime = Date.now() - startTime;
        const html = await response.text();

        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : '';

        const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        const metaDesc = metaDescMatch ? metaDescMatch[1] : '';

        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const bodyHtml = bodyMatch ? bodyMatch[1] : '';
        const bodyText = bodyHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);

        const domain = urlObj.hostname;
        const isInternal = domain.endsWith('.sentport.com') || domain === 'sentport.com';

        // Detect content type and extract metadata (pass supabase client for domain rules lookup)
        const contentTypeData = await detectContentType(normalizedUrl, html, bodyHtml, supabase);

        // Detect language
        const languageDetection = detectLanguageFromHtml(normalizedUrl, html, title, metaDesc);

        await supabase.from('crawled_pages').upsert({
          url: normalizedUrl,
          title,
          meta_description: metaDesc,
          content: bodyText,
          domain,
          is_internal: isInternal,
          http_status: response.status,
          response_time_ms: responseTime,
          last_crawled_at: new Date().toISOString()
        });

        // Insert main page into search index
        await supabase.from('search_index').upsert({
          url: normalizedUrl,
          title,
          description: metaDesc,
          content_snippet: bodyText.slice(0, 500),
          is_internal: isInternal,
          relevance_score: isInternal ? 10 : 1,
          content_type: contentTypeData.contentType,
          source_platform: contentTypeData.sourcePlatform,
          thumbnail_url: contentTypeData.thumbnailUrl,
          media_duration: contentTypeData.mediaDuration,
          publication_date: contentTypeData.publicationDate,
          author_name: contentTypeData.authorName,
          view_count: contentTypeData.viewCount,
          language: languageDetection.language,
          language_confidence: languageDetection.confidence,
          language_backfill_processed: true,
          last_indexed_at: new Date().toISOString()
        });

        // Extract and index images from the page
        if (contentTypeData.contentType !== 'image') {
          const images = extractImages(normalizedUrl, html, bodyHtml, isInternal);
          for (const image of images) {
            await supabase.from('search_index').upsert({
              url: image.url,
              title: image.title,
              description: image.description,
              content_snippet: image.altText || '',
              is_internal: image.isInternal,
              relevance_score: image.isInternal ? 8 : 1,
              content_type: 'image',
              source_platform: image.sourcePlatform,
              thumbnail_url: image.url,
              image_width: image.width,
              image_height: image.height,
              alt_text: image.altText,
              parent_page_url: normalizedUrl,
              language: languageDetection.language,
              language_confidence: languageDetection.confidence,
              language_backfill_processed: true,
              last_indexed_at: new Date().toISOString()
            });
          }
        }

        // Only process links if link collection is enabled
        if (linkCollectionEnabled) {
          const linkMatches = bodyHtml.matchAll(/<a[^>]+href=["']([^"']+)["']/gi);
          const links: string[] = [];

          for (const match of linkMatches) {
            const href = match[1];
            if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
              links.push(href);
              if (links.length >= 50) break;
            }
          }

          for (const link of links) {
            // Skip social platform URLs in link discovery
            if (shouldSkipUrl(link)) {
              continue;
            }

            await supabase.from('crawler_links').insert({
              source_url: normalizedUrl,
              destination_url: link,
              discovered_at: new Date().toISOString()
            });

            const linkUrl = new URL(link);
            const linkDomain = linkUrl.hostname;
            const isInternal = linkDomain.endsWith('.sentport.com') || linkDomain === 'sentport.com';

            let calculatedPriority = 5;

            if (isInternal) {
              calculatedPriority = 9;
              const pathSegments = linkUrl.pathname.split('/').filter(s => s.length > 0);
              if (pathSegments.length === 0 || pathSegments.length === 1) {
                calculatedPriority = 10;
              }
            } else {
              const parentPriority = item.priority;
              calculatedPriority = Math.max(1, parentPriority - 2);

              const isHomepage = linkUrl.pathname === '/' || linkUrl.pathname === '';
              if (isHomepage) {
                calculatedPriority = Math.min(10, calculatedPriority + 2);
              }

              const highAuthorityDomains = [
                'wikipedia.org', 'github.com', 'stackoverflow.com',
                'medium.com', 'reddit.com', 'youtube.com'
              ];

              if (highAuthorityDomains.some(domain => linkDomain.includes(domain))) {
                calculatedPriority = Math.min(10, calculatedPriority + 2);
              }
            }

            const { data: existingUrl } = await supabase
              .from('crawler_queue')
              .select('id, manual_priority')
              .eq('url', link)
              .maybeSingle();

            if (existingUrl) {
              if (!existingUrl.manual_priority) {
                await supabase
                  .from('crawler_queue')
                  .update({
                    priority: calculatedPriority,
                    source_type: isInternal ? 'internal' : 'external',
                    scheduled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingUrl.id);
              }
            } else {
              await supabase.from('crawler_queue').insert({
                url: link,
                priority: calculatedPriority,
                manual_priority: false,
                source_type: isInternal ? 'internal' : 'external',
                status: 'pending',
                scheduled_at: new Date().toISOString()
              });
            }
          }
        }

        await supabase
          .from('crawler_queue')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
            attempts: item.attempts + 1,
            priority_crawl: false,
            priority_crawl_failed: false
          })
          .eq('id', item.id);

        successCount++;
      } catch (error) {
        await supabase
          .from('crawler_queue')
          .update({
            status: 'failed',
            last_error: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString(),
            attempts: item.attempts + 1,
            priority_crawl: false,
            priority_crawl_failed: item.priority_crawl
          })
          .eq('id', item.id);

        failCount++;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (historyRecord) {
      await supabase
        .from('crawler_history')
        .update({
          successful_count: successCount,
          failed_count: failCount,
          status: failCount > 0 && successCount === 0 ? 'failed' : 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', historyRecord.id);
    }

    const { count: completedCount } = await supabase
      .from('crawler_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { count: failedCount } = await supabase
      .from('crawler_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed');

    const { count: pendingCount } = await supabase
      .from('crawler_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const totalCrawled = (completedCount || 0) + (failedCount || 0);

    const { data: currentStats } = await supabase
      .from('crawler_stats')
      .select('*')
      .single();

    if (currentStats) {
      await supabase
        .from('crawler_stats')
        .update({
          total_crawled: totalCrawled,
          successful: completedCount || 0,
          failed: failedCount || 0,
          in_queue: pendingCount || 0,
          last_crawl_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentStats.id);
    }

    return new Response(
      JSON.stringify({
        message: 'Crawl complete',
        successCount,
        failCount,
        totalProcessed: queuedUrls.length
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );
  }
});
