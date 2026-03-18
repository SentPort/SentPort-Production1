import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    const authHeader = req.headers.get('Authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const timeoutMinutes = 15;
    const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

    const { data: incompleteCrawls, error: fetchError } = await supabase
      .from('crawler_history')
      .select('id, started_at, batch_size')
      .is('completed_at', null)
      .eq('status', 'in_progress')
      .lt('started_at', timeoutThreshold);

    if (fetchError) {
      console.error('Error fetching incomplete crawls:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch incomplete crawls', details: fetchError.message }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    if (!incompleteCrawls || incompleteCrawls.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No incomplete crawls to clean up',
          checked_at: new Date().toISOString()
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    const crawlIds = incompleteCrawls.map(c => c.id);

    const { error: updateError } = await supabase
      .from('crawler_history')
      .update({
        status: 'timeout',
        completed_at: new Date().toISOString()
      })
      .in('id', crawlIds);

    if (updateError) {
      console.error('Error updating incomplete crawls:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update incomplete crawls', details: updateError.message }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: 'Successfully cleaned up incomplete crawls',
        cleaned_count: incompleteCrawls.length,
        crawl_ids: crawlIds,
        timeout_threshold_minutes: timeoutMinutes,
        completed_at: new Date().toISOString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
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
