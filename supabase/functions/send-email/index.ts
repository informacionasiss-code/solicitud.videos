// Supabase Edge Function to send emails via Resend
// Deploy with: supabase functions deploy send-email
// Set secret: supabase secrets set RESEND_API_KEY=re_RWcSp2Me_L6Pd2m5dW1mca442Rikr7ej6

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailRequest {
    to: string[];
    cc?: string[];
    subject: string;
    html: string;
    text?: string;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY not configured");
        }

        const { to, cc, subject, html, text }: EmailRequest = await req.json();

        if (!to || !subject || !html) {
            throw new Error("Missing required fields: to, subject, html");
        }

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "Notificaciones Video <notificaciones@videosuselroble.online>",
                to,
                cc,
                subject,
                html,
                text,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Resend API error:", data);
            throw new Error(data.message || "Failed to send email");
        }

        return new Response(JSON.stringify({ success: true, data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.error("Error sending email:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
