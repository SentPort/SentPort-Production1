import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-didit-signature, x-didit-timestamp",
};

interface DiditWebhookPayload {
  session_id: string;
  status: string;
  webhook_type: string;
  vendor_data: string;
  decision?: {
    id_verifications?: unknown[];
    liveness_checks?: unknown[];
    face_matches?: unknown[];
  };
}

async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string
): Promise<boolean> {
  const currentTime = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp, 10);

  if (Math.abs(currentTime - webhookTime) > 300) {
    console.error("Webhook timestamp too old or in future");
    return false;
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(rawBody);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqual(expectedSignature, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const signature = req.headers.get("x-didit-signature");
    const timestamp = req.headers.get("x-didit-timestamp");

    if (!signature || !timestamp) {
      console.error("Missing webhook signature or timestamp");
      return new Response(
        JSON.stringify({ error: "Missing required headers" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rawBody = await req.text();
    const webhookSecret = Deno.env.get("DIDIT_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isValid = await verifyWebhookSignature(rawBody, signature, timestamp, webhookSecret);

    if (!isValid) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload: DiditWebhookPayload = JSON.parse(rawBody);
    console.log("Webhook received:", { session_id: payload.session_id, status: payload.status, type: payload.webhook_type });

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
      .eq("session_id", payload.session_id)
      .maybeSingle();

    if (sessionError || !session) {
      console.error("Session not found:", payload.session_id);
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const normalizedStatus = payload.status.toLowerCase().replace(/\s+/g, '_');

    let finalStatus: string;
    if (normalizedStatus === "approved" || normalizedStatus === "verified") {
      finalStatus = "approved";
    } else if (normalizedStatus === "declined" || normalizedStatus === "rejected") {
      finalStatus = "declined";
    } else if (normalizedStatus === "abandoned" || normalizedStatus === "cancelled") {
      finalStatus = "abandoned";
    } else if (normalizedStatus === "in_review" || normalizedStatus === "pending" || normalizedStatus.includes("review")) {
      finalStatus = "pending";
    } else {
      console.log("Unknown status received:", payload.status, "- defaulting to pending");
      finalStatus = "pending";
    }

    const updateData: Record<string, unknown> = {
      status: finalStatus,
      webhook_received_at: new Date().toISOString(),
    };

    if (["approved", "declined", "abandoned"].includes(finalStatus)) {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("didit_verification_sessions")
      .update(updateData)
      .eq("id", session.id);

    if (updateError) {
      console.error("Failed to update session:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update session" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (finalStatus === "approved") {
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          is_verified: true,
          last_verification_at: new Date().toISOString(),
        })
        .eq("id", session.user_id);

      if (profileError) {
        console.error("Failed to update user profile:", profileError);
      } else {
        console.log("User verified successfully:", session.user_id);
      }
    } else if (finalStatus === "declined" || finalStatus === "abandoned") {
      console.log("Verification not approved:", { status: finalStatus, user_id: session.user_id });
    }

    return new Response(
      JSON.stringify({ success: true, session_id: payload.session_id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in didit-webhook:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
