# Graph Report - oneclubview  (2026-08-02)

## Corpus Check
- 92 files · ~107,716 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 512 nodes · 899 edges · 43 communities (36 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `933574e2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- utils.js
- db
- constants.js
- OneClubView Surgical Refactor — Design Spec
- dependencies
- package.json
- devDependencies
- AppDelegate
- OneClubView — Claude Code Context
- HubDataContext.jsx
- Phase 2 — Polish: Implementation Plan
- manifest.json
- Phase 1 — Foundation: Implementation Plan
- Phase 3 — Scale: Implementation Plan
- Fix scrape-local Geocoding — Implementation Plan
- build-blog.js
- enhance.js
- ExampleInstrumentedTest.java
- ExampleUnitTest.java
- gradlew
- OneClubView
- MainActivity.java
- capacitor.config.ts
- Package.swift
- CapApp-SPM/README.md
- sw.js
- index.ts
- OneClubView Worldclass UI/UX Implementation Plan
- Explore + Alerts + Weekly Digest — Design Spec
- Explore + Alerts + Weekly Digest Implementation Plan
- weekly-digest/index.ts

## God Nodes (most connected - your core abstractions)
1. `db()` - 58 edges
2. `showToast()` - 34 edges
3. `track()` - 19 edges
4. `OneClubView — Claude Code Context` - 17 edges
5. `OcvModal()` - 16 edges
6. `useHubData()` - 15 edges
7. `getToken()` - 15 edges
8. `getAge()` - 12 edges
9. `calcKm()` - 12 edges
10. `Phase 2 — Polish: Implementation Plan` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Landing()` --references--> `react`  [EXTRACTED]
  src/pages/Landing.jsx → package.json
- `TestConsumer()` --calls--> `useHubData()`  [EXTRACTED]
  src/contexts/__tests__/HubDataContext.test.jsx → src/hooks/useHubData.js
- `CampCard()` --calls--> `rpc()`  [EXTRACTED]
  src/components/hub/CampCard.jsx → src/lib/supabase.js
- `DiscoverResults()` --calls--> `db()`  [EXTRACTED]
  src/components/hub/DiscoverResults.jsx → src/lib/supabase.js
- `NearbyClubsSection()` --calls--> `db()`  [EXTRACTED]
  src/components/hub/NearbyClubsSection.jsx → src/lib/supabase.js

## Import Cycles
- None detected.

## Communities (43 total, 7 thin omitted)

### Community 0 - "utils.js"
Cohesion: 0.11
Nodes (28): AlertCallout(), SEVERITY, ErrorBoundary, ExploreSidebar(), SECTIONS, CampCard(), DiscoverResults(), catEmoji (+20 more)

### Community 1 - "db"
Cohesion: 0.08
Nodes (50): App(), NOTE: subscription_status is set server-side by the Stripe webhook only —, CancelFeedback(), AddActivityModal(), AddClubModal(), AddEventModal(), DAYF, AddHolidayModal() (+42 more)

### Community 2 - "constants.js"
Cohesion: 0.16
Nodes (10): Logo(), CAT_NAMES, CC, COUNTRY_CONFIG, DAYF, USER_COUNTRY, USER_COUNTRY, COLS (+2 more)

### Community 3 - "OneClubView Surgical Refactor — Design Spec"
Cohesion: 0.06
Nodes (33): 1.1 Decompose Hub.jsx, 1.2 Shared State via React Context + Custom Hooks, 1.3 Semantic CSS Variables, 1.4 Add Testing Infrastructure, 1.5 Error Boundary, 1.6 Cleanup, 2.1 Standardize Modals, 2.2 Loading States (+25 more)

### Community 4 - "dependencies"
Cohesion: 0.06
Nodes (32): @capacitor/android, @capacitor/app, @capacitor/cli, @capacitor/core, @capacitor/haptics, @capacitor/ios, @capacitor/keyboard, @capacitor/push-notifications (+24 more)

### Community 5 - "package.json"
Cohesion: 0.09
Nodes (22): author, bugs, url, description, homepage, keywords, license, main (+14 more)

### Community 6 - "devDependencies"
Cohesion: 0.10
Nodes (21): @babel/core, @babel/plugin-transform-react-jsx, @babel/preset-react, jsdom, devDependencies, @babel/core, @babel/plugin-transform-react-jsx, @babel/preset-react (+13 more)

### Community 7 - "AppDelegate"
Cohesion: 0.13
Nodes (13): Any, Bool, Capacitor, AppDelegate, NSUserActivity, UIApplication, UIApplicationDelegate, UIKit (+5 more)

### Community 8 - "OneClubView — Claude Code Context"
Cohesion: 0.11
Nodes (17): ADMIN DASHBOARD WARNING, Architecture, Build & Test, Credentials, Database Key Tables, Deploy Flow, Edge Functions (12 total), God Nodes (most connected code) (+9 more)

### Community 9 - "HubDataContext.jsx"
Cohesion: 0.21
Nodes (11): HubDataContext, HubDataProvider(), mockProfile, mockUser, TestConsumer(), cacheGet(), cacheInvalidate(), cacheSet() (+3 more)

### Community 10 - "Phase 2 — Polish: Implementation Plan"
Cohesion: 0.13
Nodes (14): File Structure, Files to modify:, New files to create:, Phase 2 — Polish: Implementation Plan, Task 10: Final Verification, Task 1: GDPR Account Deletion — Edge Function, Task 2: Enhance OcvModal with Footer Slot and Dark Mode Fix, Task 3: Migrate Modals to OcvModal (Batch 1 — Simple Modals) (+6 more)

### Community 11 - "manifest.json"
Cohesion: 0.14
Nodes (13): background_color, categories, description, display, icons, lang, name, orientation (+5 more)

### Community 12 - "Phase 1 — Foundation: Implementation Plan"
Cohesion: 0.15
Nodes (12): File Structure, Files to modify:, New files to create:, Phase 1 — Foundation: Implementation Plan, Task 1: Add .superpowers/ to .gitignore, Task 2: Install Testing Infrastructure, Task 3: Create ErrorBoundary Component, Task 4: Create HubDataContext — The Shared Data Layer (+4 more)

### Community 13 - "Phase 3 — Scale: Implementation Plan"
Cohesion: 0.18
Nodes (10): File Structure, Files to modify:, New files to create:, Phase 3 — Scale: Implementation Plan, Task 1: Vite Build Optimization & Code Splitting Config, Task 2: Lazy-Load Tabs and Heavy Modals, Task 3: Data Caching Layer, Task 4: Sentry Error Monitoring (+2 more)

### Community 14 - "Fix scrape-local Geocoding — Implementation Plan"
Cohesion: 0.20
Nodes (9): Chunk 1: Geocoding Post-Processor, Chunk 2: Fix existing bad data (Supabase SQL — manual step for Dave), Chunk 3: Push & deploy, File Structure, Fix scrape-local Geocoding — Implementation Plan, How it works end-to-end, Task 1: Add the geocodeNewItems function, Task 2: One-time geocode fix for existing items with bad coordinates (+1 more)

### Community 15 - "build-blog.js"
Cohesion: 0.46
Nodes (7): blogIndexHtml(), escapeHtml(), formatDate(), fs, main(), path, postHtml()

### Community 16 - "enhance.js"
Cohesion: 0.70
Nodes (4): hexToRgba(), rgbToHex(), tintAllCards(), tintCard()

### Community 17 - "ExampleInstrumentedTest.java"
Cohesion: 0.60
Nodes (3): ExampleInstrumentedTest, Test, RunWith

### Community 19 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 20 - "OneClubView"
Cohesion: 0.50
Nodes (3): Deploy, OneClubView, Stack

### Community 38 - "OneClubView Worldclass UI/UX Implementation Plan"
Cohesion: 0.08
Nodes (23): Chunk 1: Critical Security Fixes (30 min), Chunk 2: OcvModal Hardening (30 min), Chunk 3: Design System & Dark Mode Fixes (1 hr), Chunk 4: Touch Targets & Accessibility (1 hr), Chunk 5: UX Quick Wins (1.5 hrs), Chunk 6: Error Handling & Reliability (30 min), Chunk 7: Final Polish (30 min), OneClubView Worldclass UI/UX Implementation Plan (+15 more)

### Community 39 - "Explore + Alerts + Weekly Digest — Design Spec"
Cohesion: 0.06
Nodes (30): Alert Callouts (per section), Alert Computation, Alert Rendering, Alert Types and Triggers, Architecture, Context, Data Quality Indicators, Database Changes (+22 more)

### Community 40 - "Explore + Alerts + Weekly Digest Implementation Plan"
Cohesion: 0.11
Nodes (17): Chunk 1: Database Migration + AlertCallout Component, Chunk 2: Centralized Alert System in HubDataContext, Chunk 3: Explore Tab Desktop Sidebar, Chunk 4: Weekly Digest Edge Function, Chunk 5: Final Integration + Verification, Explore + Alerts + Weekly Digest Implementation Plan, Summary, Task 10: Final build, test, and graphify update (+9 more)

### Community 41 - "weekly-digest/index.ts"
Cohesion: 0.21
Nodes (6): buildEmailHtml(), DAYS, formatDate(), weatherIcon(), DAY_NAMES, ThingRow

## Knowledge Gaps
- **224 isolated node(s):** `fs`, `path`, `config`, `UIKit`, `Capacitor` (+219 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `Landing()` connect `dependencies` to `db`, `constants.js`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `config` to the rest of the system?**
  _224 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `utils.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1130952380952381 - nodes in this community are weakly interconnected._
- **Should `db` be split into smaller, more focused modules?**
  _Cohesion score 0.08175438596491227 - nodes in this community are weakly interconnected._
- **Should `OneClubView Surgical Refactor — Design Spec` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._