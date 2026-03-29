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
    const status = url.searchParams.get("status");
    const sessionId = url.searchParams.get("session_id");

    console.log("Verification callback received - redirecting user back to app. Status from URL:", status, "Session ID:", sessionId);

    let appUrl = Deno.env.get("APP_URL");

    if (!appUrl || appUrl === "https://sentport.com") {
      appUrl = "http://localhost:5173";
      console.log("APP_URL not configured or set to sentport.com - using localhost for development");
    }

    const redirectUrl = `${appUrl}/verification-return${sessionId ? `?session_id=${sessionId}` : ''}`;

    console.log("Redirecting user to:", redirectUrl);

    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error("Error in verification-callback:", error);
    let appUrl = Deno.env.get("APP_URL");

    if (!appUrl || appUrl === "https://sentport.com") {
      appUrl = "http://localhost:5173";
    }

    return Response.redirect(
      `${appUrl}/verification-return`,
      302
    );
  }
});
