import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[PopulateWordDictionary] Starting dictionary population...');

    const { data, error } = await supabase.rpc('populate_word_dictionary');

    if (error) {
      console.error('[PopulateWordDictionary] Error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
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

    console.log('[PopulateWordDictionary] Success:', data);

    const wordsAdded = data?.[0]?.words_added || 0;
    const wordsUpdated = data?.[0]?.words_updated || 0;

    console.log('[PopulateWordDictionary] Marking common words...');
    const { data: commonWordsData, error: commonWordsError } = await supabase.rpc(
      'mark_common_words',
      { top_n: 10000 }
    );

    if (commonWordsError) {
      console.error('[PopulateWordDictionary] Error marking common words:', commonWordsError);
    } else {
      console.log(`[PopulateWordDictionary] Marked ${commonWordsData} common words`);
    }

    console.log('[PopulateWordDictionary] Running auto-learn corrections...');
    const { data: learnedData, error: learnedError } = await supabase.rpc(
      'auto_learn_corrections',
      { min_clicks: 5 }
    );

    if (learnedError) {
      console.error('[PopulateWordDictionary] Error auto-learning:', learnedError);
    } else {
      const learnedCount = learnedData?.length || 0;
      console.log(`[PopulateWordDictionary] Auto-learned ${learnedCount} corrections`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        words_added: wordsAdded,
        words_updated: wordsUpdated,
        common_words_marked: commonWordsData || 0,
        corrections_learned: learnedData?.length || 0,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[PopulateWordDictionary] Exception:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
