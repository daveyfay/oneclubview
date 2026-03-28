import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the user from their JWT using anon key
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const userId = user.id;
    const userEmail = user.email;

    // Delete user data in order (respecting foreign keys)
    await supabase.from("manual_events").delete().eq("user_id", userId);
    await supabase.from("recurring_events").delete().eq("user_id", userId);
    await supabase.from("camp_bookings").delete().eq("user_id", userId);
    await supabase.from("payment_reminders").delete().eq("user_id", userId);
    await supabase.from("family_locations").delete().eq("user_id", userId);
    await supabase.from("family_invites").delete().eq("invited_by", userId);
    await supabase.from("hub_subscriptions").delete().eq("user_id", userId);
    await supabase.from("user_school_holidays").delete().eq("user_id", userId);
    await supabase.from("inbound_messages").delete().eq("user_id", userId);
    await supabase.from("dependants").delete().eq("parent_user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);

    // Delete auth user
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
    if (deleteErr) console.error("Auth delete failed:", deleteErr);

    // Send confirmation email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && userEmail) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "OneClubView <hello@oneclubview.com>",
          to: userEmail,
          subject: "Your OneClubView account has been deleted",
          html: "<p>Hi,</p><p>Your OneClubView account and all associated data have been permanently deleted as requested.</p><p>If you didn't request this, please contact hello@oneclubview.com immediately.</p><p>— The OneClubView Team</p>",
        }),
      });
    }

    return new Response(JSON.stringify({ status: "deleted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
