import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: deletedSubdomains, error: subdomainError } = await supabase
      .rpc('cleanup_expired_subdomains');

    if (subdomainError) {
      console.error('Error cleaning up subdomains:', subdomainError);
      throw subdomainError;
    }

    const deletedSubdomainCount = deletedSubdomains?.length || 0;

    console.log(`Subdomain cleanup completed: ${deletedSubdomainCount} subdomain(s) deleted`);

    if (deletedSubdomainCount > 0) {
      console.log('Deleted subdomains:', deletedSubdomains.map((s: any) => s.deleted_subdomain).join(', '));
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: accountsToDelete, error: accountsFetchError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, removal_type, removed_by_admin_id')
      .eq('account_status', 'pending_deletion')
      .lt('deletion_scheduled_at', new Date().toISOString());

    if (accountsFetchError) {
      console.error('Error fetching accounts to delete:', accountsFetchError);
    }

    const deletedAccountCount = accountsToDelete?.length || 0;
    const deletedAccounts = [];

    if (deletedAccountCount > 0) {
      console.log(`Found ${deletedAccountCount} account(s) to permanently delete`);

      for (const account of accountsToDelete) {
        try {
          const removalInfo = account.removal_type === 'admin_initiated'
            ? ` (Admin-initiated removal by ${account.removed_by_admin_id})`
            : ' (User-initiated deletion)';

          console.log(`Deleting account: ${account.email} (${account.id})${removalInfo}`);

          await supabase.from('subdomains').delete().eq('owner_id', account.id);
          await supabase.from('hubook_posts').delete().eq('user_id', account.id);
          await supabase.from('hubook_comments').delete().eq('user_id', account.id);
          await supabase.from('hubook_reactions').delete().eq('user_id', account.id);
          await supabase.from('blog_posts').delete().eq('user_id', account.id);
          await supabase.from('blog_comments').delete().eq('user_id', account.id);
          await supabase.from('blog_reactions').delete().eq('user_id', account.id);
          await supabase.from('hutube_videos').delete().eq('user_id', account.id);
          await supabase.from('hutube_comments').delete().eq('user_id', account.id);
          await supabase.from('hutube_reactions').delete().eq('user_id', account.id);
          await supabase.from('switter_posts').delete().eq('user_id', account.id);
          await supabase.from('switter_comments').delete().eq('user_id', account.id);
          await supabase.from('switter_reactions').delete().eq('user_id', account.id);
          await supabase.from('user_feed_history').delete().eq('user_id', account.id);
          await supabase.from('user_profiles').delete().eq('id', account.id);

          const { error: authDeleteError } = await supabase.auth.admin.deleteUser(account.id);

          if (authDeleteError) {
            console.error(`Error deleting auth user ${account.email}:`, authDeleteError);
          } else {
            deletedAccounts.push({
              id: account.id,
              email: account.email,
              removal_type: account.removal_type,
              removed_by_admin_id: account.removed_by_admin_id
            });
            console.log(`Successfully deleted account: ${account.email}${removalInfo}`);
          }
        } catch (deleteError) {
          console.error(`Error deleting account ${account.email}:`, deleteError);
        }
      }
    }

    const response = {
      success: true,
      message: `Cleanup completed successfully`,
      subdomains: {
        deleted_count: deletedSubdomainCount,
        deleted_subdomains: deletedSubdomains || [],
      },
      accounts: {
        deleted_count: deletedAccounts.length,
        deleted_accounts: deletedAccounts,
      },
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
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
