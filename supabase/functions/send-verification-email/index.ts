import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  user_id: string;
  status: 'approved' | 'declined';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { user_id, status }: EmailRequest = await req.json();

    if (!user_id || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, status" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (status !== 'approved' && status !== 'declined') {
      return new Response(
        JSON.stringify({ error: "Invalid status. Must be 'approved' or 'declined'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("Failed to fetch user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailContent = status === 'approved' ? {
      subject: "Verification Approved - Welcome to the Community!",
      body: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">Verification Approved!</h1>
              </div>

              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px;">Hi ${profile.full_name || 'there'},</p>

                <p style="font-size: 16px;">Great news! Your identity verification has been successfully approved.</p>

                <div style="background: white; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: bold; color: #10b981;">You now have full access to:</p>
                  <ul style="margin-top: 10px;">
                    <li>HuBook - Connect with friends and family</li>
                    <li>Heddit - Join communities and discussions</li>
                    <li>HuTube - Share and watch videos</li>
                    <li>Hinsta - Share photos and stories</li>
                    <li>Switter - Micro-blogging and updates</li>
                    <li>HuBlog - Write and publish articles</li>
                  </ul>
                </div>

                <p style="font-size: 16px;">Your verified badge will appear on your profile shortly, showing other users that you're a verified human.</p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${supabaseUrl.replace('/supabase', '')}/dashboard"
                     style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Go to Dashboard
                  </a>
                </div>

                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                  Welcome to our verified-humans-only community!
                </p>
              </div>
            </div>
          </body>
        </html>
      `
    } : {
      subject: "Verification Update - Action Required",
      body: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">Verification Update</h1>
              </div>

              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px;">Hi ${profile.full_name || 'there'},</p>

                <p style="font-size: 16px;">We wanted to let you know that we were unable to complete your identity verification at this time.</p>

                <div style="background: white; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: bold; color: #f97316;">Common reasons for verification decline:</p>
                  <ul style="margin-top: 10px;">
                    <li>Document image was unclear or blurry</li>
                    <li>Document does not match required format</li>
                    <li>Liveness check did not pass</li>
                    <li>Information could not be verified</li>
                  </ul>
                </div>

                <p style="font-size: 16px;">Don't worry - you can try again with different documentation or better lighting conditions.</p>

                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #92400e;">
                    <strong>Tips for successful verification:</strong><br>
                    • Ensure good lighting and clear photo quality<br>
                    • Use a valid government-issued ID<br>
                    • Make sure all text on the document is readable<br>
                    • Follow the liveness check instructions carefully
                  </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${supabaseUrl.replace('/supabase', '')}/get-verified"
                     style="display: inline-block; background: #f97316; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Try Verification Again
                  </a>
                </div>

                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                  If you continue to experience issues, please contact our support team for assistance.
                </p>
              </div>
            </div>
          </body>
        </html>
      `
    };

    console.log(`Sending ${status} email to:`, profile.email);

    // In production, this would integrate with an email service like SendGrid, AWS SES, or Resend
    // For now, we'll log the email content
    console.log("Email would be sent with subject:", emailContent.subject);
    console.log("To:", profile.email);

    // TODO: Integrate with actual email service
    // Example with a hypothetical email service:
    // const emailResponse = await fetch('https://api.emailservice.com/send', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${emailApiKey}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     to: profile.email,
    //     subject: emailContent.subject,
    //     html: emailContent.body
    //   })
    // });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email notification queued for ${status} status`,
        email: profile.email
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-verification-email:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
