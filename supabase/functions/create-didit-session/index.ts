import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DiditSessionResponse {
  session_id: string;
  session_token: string;
  url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { initiated_by } = await req.json().catch(() => ({ initiated_by: "user" }));

    const { data: existingPending } = await supabase
      .from("didit_verification_sessions")
      .select("id, session_id, created_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPending) {
      const ageMinutes = (Date.now() - new Date(existingPending.created_at).getTime()) / 60000;
      if (ageMinutes < 30) {
        return new Response(
          JSON.stringify({
            error: "You already have a pending verification session. Please complete or wait 30 minutes before creating a new one.",
            session_id: existingPending.session_id
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const diditApiKey = Deno.env.get("DIDIT_API_KEY");
    const diditWorkflowId = Deno.env.get("DIDIT_WORKFLOW_ID");
    const appUrl = Deno.env.get("APP_URL") || "https://sentport.com";

    if (!diditApiKey || !diditWorkflowId) {
      console.error("Missing Didit configuration");
      return new Response(
        JSON.stringify({ error: "Verification service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const callbackUrl = `${appUrl}/verification-callback`;

    console.log("Creating Didit session for user:", user.id);
    console.log("Callback URL:", callbackUrl);

    const diditResponse = await fetch("https://verification.didit.me/v3/session/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
        "x-api-key": diditApiKey,
      },
      body: JSON.stringify({
        workflow_id: diditWorkflowId,
        callback: callbackUrl,
        vendor_data: user.id,
      }),
    });

    if (!diditResponse.ok) {
      const errorText = await diditResponse.text();
      console.error("Didit API error:", diditResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to create verification session",
          details: `Didit API returned status ${diditResponse.status}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const diditData: DiditSessionResponse = await diditResponse.json();
    console.log("Didit session created:", diditData.session_id);

    const { error: upsertError } = await supabase
      .from("didit_verification_sessions")
      .upsert({
        user_id: user.id,
        session_id: diditData.session_id,
        workflow_id: diditWorkflowId,
        status: "pending",
        initiated_by: initiated_by || "user",
        completed_at: null,
        webhook_received_at: null,
      }, {
        onConflict: 'session_id',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("Failed to save session:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save verification session" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        session_id: diditData.session_id,
        verification_url: diditData.url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-didit-session:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
