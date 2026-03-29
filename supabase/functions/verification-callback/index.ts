import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("VerificationSessionId");
    const status = url.searchParams.get("status");

    console.log("Verification callback received:", { sessionId, status });

    if (!sessionId) {
      console.error("No session ID provided in callback");
      return Response.redirect(
        `${Deno.env.get("APP_URL") || "https://sentport.com"}/verification-return?error=missing_session`,
        302
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: session, error: sessionError } = await supabase
      .from("didit_verification_sessions")
      .select("id, user_id, status")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      console.error("Session not found:", sessionId, sessionError);
      return Response.redirect(
        `${Deno.env.get("APP_URL") || "https://sentport.com"}/verification-return?error=session_not_found`,
        302
      );
    }

    const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_') || "unknown";

    let redirectStatus = "pending";
    if (normalizedStatus === "approved" || normalizedStatus === "verified") {
      redirectStatus = "approved";
    } else if (normalizedStatus === "declined" || normalizedStatus === "rejected") {
      redirectStatus = "declined";
    } else if (normalizedStatus === "in_review" || normalizedStatus === "pending" || normalizedStatus.includes("review")) {
      redirectStatus = "in_review";
    } else if (normalizedStatus === "abandoned" || normalizedStatus === "cancelled") {
      redirectStatus = "abandoned";
    }

    const appUrl = Deno.env.get("APP_URL") || "https://sentport.com";
    const redirectUrl = `${appUrl}/verification-return?status=${redirectStatus}&session_id=${sessionId}`;

    console.log("Redirecting user to:", redirectUrl);

    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error("Error in verification-callback:", error);
    return Response.redirect(
      `${Deno.env.get("APP_URL") || "https://sentport.com"}/verification-return?error=internal_error`,
      302
    );
  }
});
