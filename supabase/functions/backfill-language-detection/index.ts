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
  batch_size: number;
  status: string;
  current_batch: number;
  started_at: string | null;
  last_batch_at: string | null;
  processing_rate: number;
  lock_acquired_at: string | null;
  lock_holder_id: string | null;
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

interface FailedUrl {
  id: string;
  retry_count: number;
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
        // Release any locks before pausing
        await supabase.rpc('release_backfill_lock');

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

      if (progress.status !== 'paused' && progress.status !== 'completed') {
        return new Response(
          JSON.stringify({ error: 'Can only resume a paused or completed backfill' }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // Recalculate total URLs and processed count from database
      const { count: totalUrls } = await supabase
        .from('search_index')
        .select('id', { count: 'exact', head: true })
        .eq('is_internal', false);

      const { count: processedUrls } = await supabase
        .from('search_index')
        .select('id', { count: 'exact', head: true })
        .eq('is_internal', false)
        .eq('language_backfill_processed', true);

      await supabase
        .from('language_backfill_progress')
        .update({
          status: 'running',
          total_urls: totalUrls || 0,
          processed_count: processedUrls || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', progress.id);

      return new Response(
        JSON.stringify({
          message: 'Backfill resumed',
          progress: {
            ...progress,
            status: 'running',
            total_urls: totalUrls || 0,
            processed_count: processedUrls || 0
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

    if (action === 'reset') {
      const { data: progress } = await supabase
        .from('language_backfill_progress')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (progress) {
        // Release locks before reset
        await supabase.rpc('release_backfill_lock');

        // Delete logs
        await supabase
          .from('language_backfill_log')
          .delete()
          .eq('progress_id', progress.id);

        // Delete failed URLs tracking
        await supabase
          .from('language_backfill_failed_urls')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');

        // Delete progress
        await supabase
          .from('language_backfill_progress')
          .delete()
          .eq('id', progress.id);
      }

      // Reset the tracking column for all URLs
      await supabase
        .from('search_index')
        .update({ language_backfill_processed: false })
        .eq('is_internal', false);

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
      // Generate unique worker ID for this invocation
      const workerId = crypto.randomUUID();

      // Try to acquire advisory lock to prevent concurrent processing
      const { data: lockAcquired } = await supabase
        .rpc('try_acquire_backfill_lock', { holder_id: workerId })
        .maybeSingle();

      if (!lockAcquired) {
        return new Response(
          JSON.stringify({
            message: 'busy',
            reason: 'Another worker is currently processing. Only one worker can run at a time.'
          }),
          {
            status: 409,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      try {
        // Clean up any abandoned locks (held for >2 minutes)
        await supabase.rpc('force_release_abandoned_locks');

        const { data: progress } = await supabase
          .from('language_backfill_progress')
          .select('*')
          .eq('status', 'running')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!progress) {
          await supabase.rpc('release_backfill_lock');
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

        // Query only unprocessed URLs, excluding those that have failed twice
        const { data: urlsToProcess } = await supabase
          .from('search_index')
          .select('id, url, title, description, content_snippet, language, language_confidence')
          .eq('is_internal', false)
          .eq('language_backfill_processed', false)
          .order('created_at', { ascending: true })
          .limit(batchSize);

        if (!urlsToProcess || urlsToProcess.length === 0) {
          // Check completion
          const { count: remainingUrls } = await supabase
            .from('search_index')
            .select('id', { count: 'exact', head: true })
            .eq('is_internal', false)
            .eq('language_backfill_processed', false);

          if (remainingUrls === 0 || !remainingUrls) {
            await supabase
              .from('language_backfill_progress')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', progress.id);

            await supabase.rpc('release_backfill_lock');

            // Get final counts from log aggregation
            const { data: successCount } = await supabase
              .rpc('get_backfill_success_count', { progress_id: progress.id })
              .maybeSingle();

            const { data: failCount } = await supabase
              .rpc('get_backfill_failed_count', { progress_id: progress.id })
              .maybeSingle();

            return new Response(
              JSON.stringify({
                message: 'Backfill completed',
                progress: {
                  ...progress,
                  status: 'completed',
                  successful_count: successCount || 0,
                  failed_count: failCount || 0
                }
              }),
              {
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'application/json',
                }
              }
            );
          } else {
            await supabase.rpc('release_backfill_lock');
            return new Response(
              JSON.stringify({
                error: `No URLs returned in batch, but ${remainingUrls} unprocessed URLs remain. Please retry.`,
                remaining_urls: remainingUrls
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
        }

        let successCount = 0;
        let failCount = 0;
        const errors: any[] = [];

        for (const entry of urlsToProcess as SearchIndexEntry[]) {
          try {
            // Check if this URL has failed before
            const { data: failedEntry } = await supabase
              .from('language_backfill_failed_urls')
              .select('id, retry_count')
              .eq('search_index_id', entry.id)
              .maybeSingle();

            // Skip URLs that have already failed twice
            if (failedEntry && failedEntry.retry_count >= 2) {
              continue;
            }

            const combinedText = `${entry.title || ''} ${entry.description || ''} ${entry.content_snippet || ''}`.trim();

            // Check if content has sufficient SEO quality
            const { data: hasSufficientContent } = await supabase
              .rpc('has_sufficient_seo_content', {
                title: entry.title,
                description: entry.description,
                snippet: entry.content_snippet
              })
              .maybeSingle();

            if (!hasSufficientContent) {
              // Mark as unknown - will be excluded from search
              await supabase
                .from('search_index')
                .update({
                  language: 'unknown',
                  language_confidence: 0.3,
                  language_backfill_processed: true
                })
                .eq('id', entry.id);

              // Remove from failed tracking if it was there
              if (failedEntry) {
                await supabase
                  .from('language_backfill_failed_urls')
                  .delete()
                  .eq('id', failedEntry.id);
              }

              successCount++;
              continue;
            }

            // Use enhanced detection with URL-based fallback
            const { data: langResult } = await supabase
              .rpc('detect_language_enhanced', {
                content: combinedText,
                url: entry.url
              })
              .maybeSingle();

            if (langResult) {
              await supabase
                .from('search_index')
                .update({
                  language: langResult.language || 'unknown',
                  language_confidence: langResult.confidence || 0.3,
                  language_backfill_processed: true
                })
                .eq('id', entry.id);

              // Remove from failed tracking if it was there (recovery)
              if (failedEntry) {
                await supabase
                  .from('language_backfill_failed_urls')
                  .delete()
                  .eq('id', failedEntry.id);
              }

              successCount++;
            } else {
              // Fallback to unknown if detection fails
              await supabase
                .from('search_index')
                .update({
                  language: 'unknown',
                  language_confidence: 0.3,
                  language_backfill_processed: true
                })
                .eq('id', entry.id);

              // Remove from failed tracking if it was there
              if (failedEntry) {
                await supabase
                  .from('language_backfill_failed_urls')
                  .delete()
                  .eq('id', failedEntry.id);
              }

              successCount++;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check current retry count
            const { data: failedEntry } = await supabase
              .from('language_backfill_failed_urls')
              .select('id, retry_count')
              .eq('search_index_id', entry.id)
              .maybeSingle();

            if (!failedEntry) {
              // First failure - track it and don't mark as processed (will retry)
              await supabase
                .from('language_backfill_failed_urls')
                .insert({
                  search_index_id: entry.id,
                  url: entry.url,
                  retry_count: 1,
                  error_message: errorMessage
                });

              // Don't mark as processed yet - will be retried
              failCount++;
              errors.push({
                url: entry.url,
                error: errorMessage,
                retry_count: 1
              });
            } else {
              // Second failure - mark as unknown and processed (no more retries)
              await supabase
                .from('search_index')
                .update({
                  language: 'unknown',
                  language_confidence: 0.2,
                  language_backfill_processed: true
                })
                .eq('id', entry.id);

              await supabase
                .from('language_backfill_failed_urls')
                .update({
                  retry_count: 2,
                  last_failed_at: new Date().toISOString(),
                  error_message: errorMessage,
                  updated_at: new Date().toISOString()
                })
                .eq('id', failedEntry.id);

              failCount++;
              errors.push({
                url: entry.url,
                error: errorMessage,
                retry_count: 2,
                final_failure: true
              });
            }
          }
        }

        const batchProcessingTime = Date.now() - batchStartTime;

        // Query actual database counts
        const { count: actualProcessedCount } = await supabase
          .from('search_index')
          .select('id', { count: 'exact', head: true })
          .eq('is_internal', false)
          .eq('language_backfill_processed', true);

        const { count: actualTotalUrls } = await supabase
          .from('search_index')
          .select('id', { count: 'exact', head: true })
          .eq('is_internal', false);

        const newProcessedCount = actualProcessedCount || 0;
        const newTotalUrls = actualTotalUrls || progress.total_urls;

        // Get aggregated counts from logs
        const { data: totalSuccessCount } = await supabase
          .rpc('get_backfill_success_count', { progress_id: progress.id })
          .maybeSingle();

        const { data: totalFailCount } = await supabase
          .rpc('get_backfill_failed_count', { progress_id: progress.id })
          .maybeSingle();

        const newSuccessfulCount = (totalSuccessCount || 0) + successCount;
        const newFailedCount = (totalFailCount || 0) + failCount;

        const timeSinceStart = progress.started_at
          ? (Date.now() - new Date(progress.started_at).getTime()) / 1000 / 60
          : 1;
        const processingRate = newProcessedCount / timeSinceStart;

        // Log this batch
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

        // Check completion
        const { count: remainingUrls } = await supabase
          .from('search_index')
          .select('id', { count: 'exact', head: true })
          .eq('is_internal', false)
          .eq('language_backfill_processed', false);

        const isComplete = (remainingUrls === 0 || !remainingUrls);

        // Update progress
        await supabase
          .from('language_backfill_progress')
          .update({
            total_urls: newTotalUrls,
            processed_count: newProcessedCount,
            current_batch: progress.current_batch + 1,
            last_batch_at: new Date().toISOString(),
            processing_rate: processingRate,
            status: isComplete ? 'completed' : 'running',
            completed_at: isComplete ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', progress.id);

        // Release lock
        await supabase.rpc('release_backfill_lock');

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
              total_urls: newTotalUrls,
              processed_count: newProcessedCount,
              successful_count: newSuccessfulCount,
              failed_count: newFailedCount,
              remaining: remainingUrls || 0,
              processing_rate: processingRate,
              estimated_minutes_remaining: processingRate > 0 && remainingUrls
                ? remainingUrls / processingRate
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
      } catch (processingError) {
        // Ensure lock is released on error
        await supabase.rpc('release_backfill_lock');
        throw processingError;
      }
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
