import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");

  if (!uid) {
    return new Response(unsubscribePage("Invalid link — no user ID provided.", false), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { error } = await supabase
      .from("profiles")
      .update({ digest_opt_out: true })
      .eq("id", uid);

    if (error) {
      console.error("digest-unsubscribe error:", error);
      return new Response(unsubscribePage("Something went wrong. Please try again or contact hello@oneclubview.com.", false), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(unsubscribePage("Unsubscribed. You can re-enable the weekly digest in Settings.", true), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("digest-unsubscribe unexpected error:", err);
    return new Response(unsubscribePage("Something went wrong. Please try again or contact hello@oneclubview.com.", false), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

function unsubscribePage(message: string, success: boolean): string {
  const color = success ? "#16a34a" : "#dc2626";
  const icon = success ? "✓" : "✗";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Weekly Digest — OneClubView</title>
  <style>
    body { margin: 0; padding: 0; background: #f3f4f6; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; padding: 48px 40px; max-width: 420px; width: 90%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .icon { font-size: 48px; color: ${color}; margin-bottom: 16px; }
    h1 { font-size: 20px; color: #1a2a3a; margin: 0 0 12px; }
    p { font-size: 14px; color: #6b7280; margin: 0 0 28px; line-height: 1.6; }
    a { display: inline-block; background: #1a2a3a; color: #fff; text-decoration: none; padding: 11px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>OneClubView</h1>
    <p>${message}</p>
    <a href="https://oneclubview.com">Go to OneClubView</a>
  </div>
</body>
</html>`;
}
