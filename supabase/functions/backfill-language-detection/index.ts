import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Admin-Bypass-Key, X-Admin-User-ID",
};

const ADMIN_USER_ID = '7a8fc53d-ce80-4964-8544-4614d7c0e975';

interface BackfillProgress {
  id: string;
  total_urls: number;
  processed_count: number;
  successful_count: number;
  failed_count: number;
  batch_size: number;
  status: string;
  current_batch: number;
  started_at: string | null;
  last_batch_at: string | null;
  processing_rate: number;
}

interface SearchIndexEntry {
  id: string;
  url: string;
  title: string;
  description: string;
  content_snippet: string;
  language: string;
  language_confidence: number;
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

    // Check for admin bypass key authorization
    const bypassKey = req.headers.get('X-Admin-Bypass-Key');
    const bypassUserId = req.headers.get('X-Admin-User-ID');
    const adminBypassSecret = Deno.env.get('VITE_ADMIN_BYPASS_KEY');

    // Only allow bypass key authorization
    if (!bypassKey || !bypassUserId || bypassUserId !== ADMIN_USER_ID || bypassKey !== adminBypassSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid bypass credentials' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { action = 'process' } = await req.json();

    if (action === 'initialize') {
      const { data: existingProgress } = await supabase
        .from('language_backfill_progress')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingProgress && existingProgress.status === 'running') {
        return new Response(
          JSON.stringify({
            error: 'Backfill already running',
            progress: existingProgress
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const { count: totalUrls } = await supabase
        .from('search_index')
        .select('id', { count: 'exact', head: true })
        .eq('is_internal', false);

      const { data: newProgress } = await supabase
        .from('language_backfill_progress')
        .insert({
          total_urls: totalUrls || 0,
          processed_count: 0,
          successful_count: 0,
          failed_count: 0,
          batch_size: 50,
          status: 'running',
          current_batch: 0,
          started_at: new Date().toISOString(),
          last_batch_at: new Date().toISOString()
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({
          message: 'Backfill initialized',
          progress: newProgress
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    if (action === 'pause') {
      const { data: progress } = await supabase
        .from('language_backfill_progress')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (progress) {
        await supabase
          .from('language_backfill_progress')
          .update({ status: 'paused', updated_at: new Date().toISOString() })
          .eq('id', progress.id);
      }

      return new Response(
        JSON.stringify({ message: 'Backfill paused' }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    if (action === 'resume') {
      const { data: progress } = await supabase
        .from('language_backfill_progress')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!progress) {
        return new Response(
          JSON.stringify({ error: 'No backfill found to resume' }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      if (progress.status !== 'paused') {
        return new Response(
          JSON.stringify({ error: 'Can only resume a paused backfill' }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      await supabase
        .from('language_backfill_progress')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', progress.id);

      return new Response(
        JSON.stringify({ message: 'Backfill resumed', progress: { ...progress, status: 'running' } }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    if (action === 'reset') {
      const { data: progress } = await supabase
        .from('language_backfill_progress')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (progress) {
        await supabase
          .from('language_backfill_log')
          .delete()
          .eq('progress_id', progress.id);

        await supabase
          .from('language_backfill_progress')
          .delete()
          .eq('id', progress.id);
      }

      return new Response(
        JSON.stringify({ message: 'Backfill reset complete' }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    if (action === 'process') {
      const { data: progress } = await supabase
        .from('language_backfill_progress')
        .select('*')
        .eq('status', 'running')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!progress) {
        return new Response(
          JSON.stringify({ error: 'No active backfill found. Please initialize first.' }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      const batchStartTime = Date.now();
      const batchSize = progress.batch_size;

      const { data: urlsToProcess } = await supabase
        .from('search_index')
        .select('id, url, title, description, content_snippet, language, language_confidence')
        .eq('is_internal', false)
        .order('created_at', { ascending: true })
        .range(progress.processed_count, progress.processed_count + batchSize - 1);

      if (!urlsToProcess || urlsToProcess.length === 0) {
        await supabase
          .from('language_backfill_progress')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', progress.id);

        return new Response(
          JSON.stringify({
            message: 'Backfill completed',
            progress: {
              ...progress,
              status: 'completed'
            }
          }),
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
      const errors: any[] = [];

      for (const entry of urlsToProcess as SearchIndexEntry[]) {
        try {
          const combinedText = `${entry.title || ''} ${entry.description || ''} ${entry.content_snippet || ''}`.trim();

          if (combinedText.length < 10) {
            successCount++;
            continue;
          }

          const { data: langResult } = await supabase
            .rpc('detect_language_simple', { input_text: combinedText })
            .maybeSingle();

          if (langResult) {
            await supabase
              .from('search_index')
              .update({
                language: langResult.language || 'en',
                language_confidence: langResult.confidence || 0.7
              })
              .eq('id', entry.id);

            successCount++;
          } else {
            await supabase
              .from('search_index')
              .update({
                language: 'en',
                language_confidence: 0.5
              })
              .eq('id', entry.id);

            successCount++;
          }
        } catch (error) {
          failCount++;
          errors.push({
            url: entry.url,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const batchProcessingTime = Date.now() - batchStartTime;
      const newProcessedCount = progress.processed_count + urlsToProcess.length;
      const newSuccessfulCount = progress.successful_count + successCount;
      const newFailedCount = progress.failed_count + failCount;

      const timeSinceStart = progress.started_at
        ? (Date.now() - new Date(progress.started_at).getTime()) / 1000 / 60
        : 1;
      const processingRate = newProcessedCount / timeSinceStart;

      await supabase
        .from('language_backfill_log')
        .insert({
          progress_id: progress.id,
          batch_number: progress.current_batch + 1,
          urls_processed: urlsToProcess.length,
          successful: successCount,
          failed: failCount,
          errors: errors,
          processing_time_ms: batchProcessingTime
        });

      await supabase
        .from('language_backfill_progress')
        .update({
          processed_count: newProcessedCount,
          successful_count: newSuccessfulCount,
          failed_count: newFailedCount,
          current_batch: progress.current_batch + 1,
          last_batch_at: new Date().toISOString(),
          processing_rate: processingRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', progress.id);

      const isComplete = newProcessedCount >= progress.total_urls;

      if (isComplete) {
        await supabase
          .from('language_backfill_progress')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', progress.id);
      }

      return new Response(
        JSON.stringify({
          message: isComplete ? 'Backfill completed' : 'Batch processed successfully',
          batch: {
            number: progress.current_batch + 1,
            processed: urlsToProcess.length,
            successful: successCount,
            failed: failCount,
            processing_time_ms: batchProcessingTime
          },
          progress: {
            total_urls: progress.total_urls,
            processed_count: newProcessedCount,
            successful_count: newSuccessfulCount,
            failed_count: newFailedCount,
            remaining: progress.total_urls - newProcessedCount,
            processing_rate: processingRate,
            estimated_minutes_remaining: processingRate > 0
              ? (progress.total_urls - newProcessedCount) / processingRate
              : 0,
            is_complete: isComplete
          }
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      {
        status: 400,
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
