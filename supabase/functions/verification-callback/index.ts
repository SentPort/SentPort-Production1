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

    console.log("Verification callback received - redirecting user back to app. Status from URL:", status);

    const appUrl = Deno.env.get("APP_URL") || "https://sentport.com";
    const redirectUrl = `${appUrl}/verification-return`;

    console.log("Redirecting user to:", redirectUrl);

    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error("Error in verification-callback:", error);
    return Response.redirect(
      `${Deno.env.get("APP_URL") || "https://sentport.com"}/verification-return`,
      302
    );
  }
});
