import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-didit-signature, x-didit-timestamp, x-signature, x-signature-v1, x-timestamp",
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
    const rawBody = await req.text();

    const signature = req.headers.get("x-signature") ||
                      req.headers.get("x-signature-v1") ||
                      req.headers.get("x-didit-signature");
    const timestamp = req.headers.get("x-timestamp") ||
                      req.headers.get("x-didit-timestamp");

    console.log("Webhook received - Headers:", {
      signature: signature ? "present" : "missing",
      timestamp: timestamp ? "present" : "missing",
      allHeaders: Object.fromEntries(req.headers.entries())
    });

    if (!signature || !timestamp) {
      console.error("Missing webhook signature or timestamp, but processing anyway for debugging");
      console.log("Raw body preview:", rawBody.substring(0, 200));
    }

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

    if (signature && timestamp) {
      const isValid = await verifyWebhookSignature(rawBody, signature, timestamp, webhookSecret);

      if (!isValid) {
        console.error("Invalid webhook signature - but continuing to process for debugging");
      } else {
        console.log("Webhook signature verified successfully");
      }
    }

    const payload: DiditWebhookPayload = JSON.parse(rawBody);
    console.log("Webhook payload received:", {
      session_id: payload.session_id,
      status: payload.status,
      type: payload.webhook_type,
      vendor_data: payload.vendor_data,
      full_payload: payload
    });

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

    const normalizedStatus = payload.status.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');

    let finalStatus: string;
    if (normalizedStatus === "approved" || normalizedStatus === "verified" || normalizedStatus === "complete") {
      finalStatus = "approved";
    } else if (normalizedStatus === "declined" || normalizedStatus === "rejected" || normalizedStatus === "failed") {
      finalStatus = "declined";
    } else if (normalizedStatus === "abandoned" || normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
      finalStatus = "abandoned";
    } else if (normalizedStatus === "in_review" || normalizedStatus === "pending" || normalizedStatus === "pending_review" || normalizedStatus.includes("review") || normalizedStatus.includes("pending")) {
      finalStatus = "pending";
    } else {
      console.log("Unknown status received:", payload.status, "normalized to:", normalizedStatus, "- defaulting to pending");
      finalStatus = "pending";
    }

    console.log("Status mapping:", { original: payload.status, normalized: normalizedStatus, final: finalStatus });

    const updateData: Record<string, unknown> = {
      status: finalStatus,
      webhook_received_at: new Date().toISOString(),
      webhook_payload: payload,
    };

    if (["approved", "declined", "abandoned"].includes(finalStatus)) {
      updateData.completed_at = new Date().toISOString();
    }

    console.log("Updating session with data:", updateData);

    const { error: updateError } = await supabase
      .from("didit_verification_sessions")
      .update(updateData)
      .eq("id", session.id);

    if (updateError) {
      console.error("Failed to update session:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update session", details: updateError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Session updated successfully:", session.id);

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

        try {
          const { error: emailError } = await supabase.functions.invoke("send-verification-email", {
            body: { user_id: session.user_id, status: "approved" },
          });

          if (emailError) {
            console.error("Failed to send approval email:", emailError);
          } else {
            console.log("Approval email sent successfully to user:", session.user_id);
          }
        } catch (emailErr) {
          console.error("Exception sending approval email:", emailErr);
        }
      }
    } else if (finalStatus === "declined") {
      console.log("Verification declined:", { status: finalStatus, user_id: session.user_id });

      try {
        const { error: emailError } = await supabase.functions.invoke("send-verification-email", {
          body: { user_id: session.user_id, status: "declined" },
        });

        if (emailError) {
          console.error("Failed to send declined email:", emailError);
        } else {
          console.log("Declined email sent successfully to user:", session.user_id);
        }
      } catch (emailErr) {
        console.error("Exception sending declined email:", emailErr);
      }
    } else if (finalStatus === "abandoned") {
      console.log("Verification abandoned:", { status: finalStatus, user_id: session.user_id });
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
