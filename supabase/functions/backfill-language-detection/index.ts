import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-admin-bypass-key, x-admin-user-id",
};

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

function detectLanguage(url: string, title: string, description: string): LanguageDetectionResult {
  const signals: { lang: string; confidence: number }[] = [];

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();

    const wikipediaMatch = domain.match(WIKIPEDIA_PATTERN);
    if (wikipediaMatch) {
      const langCode = wikipediaMatch[1].toLowerCase();
      if (langCode !== 'en' && langCode !== 'www') {
        return { language: langCode, confidence: 0.95 };
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const adminBypassKey = req.headers.get('x-admin-bypass-key');
    const adminUserId = req.headers.get('x-admin-user-id');
    const expectedBypassKey = Deno.env.get('VITE_ADMIN_BYPASS_KEY');
    const expectedUserId = Deno.env.get('VITE_ADMIN_USER_ID');

    if (!adminBypassKey || !adminUserId) {
      console.error('Backfill authentication failed: Missing admin headers');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication failed - Admin credentials required'
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (adminBypassKey !== expectedBypassKey || adminUserId !== expectedUserId) {
      console.error('Backfill authentication failed: Invalid admin credentials');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication failed - Invalid admin credentials'
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log(`Backfill initiated by admin user: ${adminUserId} at ${new Date().toISOString()}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { batchSize = 500 } = await req.json().catch(() => ({ batchSize: 500 }));

    const { data: unprocessedRecords, error: fetchError } = await supabase
      .from('search_index')
      .select('id, url, title, description')
      .or('language_backfill_processed.eq.false,language_backfill_processed.is.null')
      .limit(batchSize);

    if (fetchError) {
      throw fetchError;
    }

    if (!unprocessedRecords || unprocessedRecords.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No records to process',
          processed: 0,
          totalRemaining: 0
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let processedCount = 0;
    let updatedCount = 0;
    let verifiedCount = 0;
    const failedUpdates: string[] = [];

    for (const record of unprocessedRecords) {
      const detection = detectLanguage(
        record.url || '',
        record.title || '',
        record.description || ''
      );

      const { data: updateData, error: updateError } = await supabase
        .from('search_index')
        .update({
          language: detection.language,
          language_confidence: detection.confidence,
          language_backfill_processed: true
        })
        .eq('id', record.id)
        .select('id, language_backfill_processed');

      if (updateError) {
        console.error(`Failed to update record ${record.id}:`, updateError);
        failedUpdates.push(record.id);
      } else if (updateData && updateData.length > 0) {
        if (updateData[0].language_backfill_processed === true) {
          verifiedCount++;
        } else {
          console.error(`Update returned data but flag not set for ${record.id}`);
          failedUpdates.push(record.id);
        }
        updatedCount++;
      } else {
        console.error(`Update succeeded but no data returned for ${record.id}`);
        failedUpdates.push(record.id);
      }

      processedCount++;
    }

    if (processedCount > 0 && verifiedCount === 0) {
      console.error('CRITICAL: All updates failed verification. RLS policy may be blocking updates.');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Updates failed - RLS policy may be blocking updates',
          processed: processedCount,
          updated: updatedCount,
          verified: verifiedCount,
          failedIds: failedUpdates.slice(0, 5)
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { count: remainingCount } = await supabase
      .from('search_index')
      .select('id', { count: 'exact', head: true })
      .or('language_backfill_processed.eq.false,language_backfill_processed.is.null');

    const successRate = processedCount > 0 ? (verifiedCount / processedCount) * 100 : 0;
    console.log(`Batch complete: ${verifiedCount}/${processedCount} verified (${successRate.toFixed(1)}%)`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        updated: updatedCount,
        verified: verifiedCount,
        totalRemaining: remainingCount || 0,
        successRate: successRate.toFixed(1),
        message: `Processed ${processedCount} records, verified ${verifiedCount} updates successfully`
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Backfill error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
