# Lessons

Written by /aar-loop after each session's After Action Review. Read this file before starting a new task in this project. Every entry should be concrete and checkable, never vague.

## 2026-08-02 -- Before writing a Supabase edge function, query information_schema.columns for every table it will touch and include the actual column names in the implementation prompt. Do not assume column names from frontend code or CLAUDE.md — the DB is the source of truth.
- Expected: Weekly digest edge function would work on first deploy.
- Actual: Failed 7 times. Used wrong column names: RESEND_API_KEY (actual: RESEND_KEY), holiday_name (actual: name), member_name (not a column — use dependant_id + join), email_queue.type (not a column — use email_key), camp_start_date (not a column on camp_bookings).
- Why: The subagent that wrote the function assumed column names from context and frontend code patterns. Nobody queried the actual DB schema before writing the SQL/PostgREST calls.
- tags: supabase,edge-functions,schema

## 2026-08-02 -- Before modifying any page that has a matching public/*.js script (like enhance.js), grep for DOM-injecting scripts that may duplicate React-rendered content. Check public/enhance.js, public/sw.js, and any deferred scripts loaded in index.html.
- Expected: Landing page hero would show one phone mockup after adding the React version.
- Actual: Two phone mockups appeared — the old enhance.js injected one via DOM manipulation after React rendered. Service worker cached the old enhance.js, persisting the duplicate even after the file was updated on the server.
- Why: enhance.js was a legacy vanilla JS file from the pre-React era that injects DOM elements at runtime. It was not in the mental model when the hero was moved to React. The service worker then cached the old version.
- tags: legacy,enhance-js,service-worker,landing-page

## 2026-08-02 -- In Supabase JS v2, .insert() and other query builder methods return a PostgrestFilterBuilder, not a Promise. Calling .catch() on the result throws 'sb.from(...).insert(...).catch is not a function'. Use try/catch around await instead.
- Expected: email_queue logging would silently catch insert failures.
- Actual: The .catch() call itself threw an error, which propagated up and killed the entire per-user email send.
- Why: Supabase JS v2 query builders are thenable but do not expose .catch() directly. The .catch() pattern works in v1 but breaks in v2.
- tags: supabase,edge-functions,javascript,gotcha

## 2026-08-02 -- When a CSS class isn't taking effect on a React component, grep for inline style={{ maxWidth or style={{ width on the element and its parent wrappers before adding more CSS. Inline styles override class-based styles. In Hub.jsx, four hardcoded maxWidth:520 inline styles overrode the app-shell--wide CSS class entirely.
- Expected: Adding .app-shell--wide { max-width: 960px } to global.css would widen the Explore tab on desktop.
- Actual: Explore tab stayed at 520px because Hub.jsx had maxWidth:520 as inline styles on the header, tab bar, and content wrapper. The CSS class had no effect.
- Why: CSS specificity: inline styles beat class selectors. The fix required changing the inline styles to be conditional on the active tab (maxWidth: tab === 'explore' ? 'none' : 520).
- tags: css,inline-styles,react,hub

## 2026-08-02 -- Never auto-save transient sensor data (browser GPS) to a permanent profile field. One bad reading (VPN, WiFi triangulation, cold GPS fix) corrupts the location permanently. Store live GPS in React state only. Use manually-confirmed family_locations (Home, Work) as the source of truth for distance calculations, weekly digest, and 'near you' features.
- Expected: Profile lat/lng would reflect user's actual location in Wicklow.
- Actual: Profile showed Castlebar, Mayo (250km away) because a previous bad browser geolocation reading was auto-saved to profiles.latitude/longitude. All distance-based features (clubs near you, digest suggestions) used the wrong location.
- Why: HubDataContext line 98 ran db('profiles','PATCH',{body:{latitude,longitude}}) on every app load with whatever the browser returned. Browser geolocation is unreliable -- VPN exit nodes, WiFi triangulation errors, and cold GPS fixes can return coordinates hundreds of km away.
- tags: location,gps,profiles,reliability,fix-applied

## 2026-08-19 -- When Resend reports a Receiving MX record as "failed", check which domain is registered in Resend before adding the record it asks for. If the root domain runs Google Workspace, register the inbound subdomain as a separate Resend domain instead. Adding the root MX Resend asks for would take all mail away from Google Workspace.
- Expected: Forwarding a club email to the inbound address would be parsed and added to the app.
- Actual: The mail bounced with "does not exist" before ever reaching the inbound-email edge function.
- Why: Only oneclubview.com was registered in Resend, so Resend checked for an MX on the root domain and marked it failed. The correct MX already existed on in.oneclubview.com at the right priority, but Resend had no domain entry for that subdomain. Registering in.oneclubview.com with receiving enabled verified instantly against DNS that had been correct all along. No DNS change was needed or made.
- tags: resend,dns,mx,inbound-email,google-workspace

## 2026-08-19 -- `supabase functions deploy` defaults verify_jwt to true regardless of the deployed function's current setting. Read the live setting with `supabase functions list` first and pass --no-verify-jwt for every function that has verify_jwt=false, or redeploying will silently start rejecting frontend calls.
- Expected: Redeploying scrape-local to change a constant would preserve its existing config.
- Actual: Would have flipped verify_jwt from false to true, breaking every unauthenticated call from the frontend.
- Why: Deploy flags are not inherited from the deployed function. Of the four functions redeployed, parse-schedule was the only one with verify_jwt=true, so three needed the flag and one did not.
- tags: supabase,edge-functions,deploy,gotcha

## 2026-08-19 -- Supabase `secrets list` returns a sha256 of each secret's plaintext, not a masked value. Hash a candidate value locally and compare digests to check whether a secret already holds the value you expect, without ever reading it back.
- Expected: The RESEND_KEY secret held the same Resend key that was hardcoded in inbound-email.
- Actual: The digests differed, so they were two different keys. Blindly repointing the function at RESEND_KEY would have silently swapped credentials.
- Why: Validated the method first by hashing the known SUPABASE_URL value and matching its stored digest exactly, which confirmed the digest is sha256 of plaintext before trusting the RESEND_KEY comparison.
- tags: supabase,secrets,verification,technique

## 2026-08-19 -- When inbound email on a custom domain silently drops, test with the provider's predefined receiving address first (Resend gives every account one, e.g. <anything>@geovoriofi.resend.app). It isolates provider-side domain config from your own webhook, function, and keys in a single request.
- Expected: Debugging would require guessing between DNS, webhook, edge function, and API keys.
- Actual: One email to the resend.app address went end to end in 5 seconds, proving webhook + function + Anthropic key + DB writes all work, leaving custom domain receiving as the only fault.
- Why: Same account, same webhook, same function, same keys. Only the recipient domain changed, so a pass on one and a silent drop on the other pins the fault precisely. It also proved the ANTHROPIC_KEY env swap worked, which could not be verified any other way without burning a rate-limited function.
- tags: resend,inbound-email,debugging,technique,isolation

## 2026-08-19 -- A Resend-sent email showing last_event "delivered" does NOT mean the recipient system ingested it. For inbound testing, check the receiving side (`GET /emails/receiving` and your own DB), never the sending record.
- Expected: last_event "delivered" to add@in.oneclubview.com meant inbound was fixed.
- Actual: SES accepted the SMTP transaction and dropped the message. Resend's received list stayed empty and no row was written. Reported the fix as working when it was not.
- Why: "delivered" describes the sender's view of an SMTP handoff. SES accepts the connection then applies receipt rules, so acceptance and ingestion are different events. Inbound success is only observable from the receiver's side.
- tags: resend,ses,inbound-email,verification,gotcha
