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
