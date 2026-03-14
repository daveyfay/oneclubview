# OneClubView

## Stack
- Frontend: React + Babel in single `public/index.html` file
- Backend: Supabase (project: uqihwazheypvmrcrqklg)
- Hosting: Netlify (site: moonlit-haupia-3c2f14)
- Domain: oneclubview.com
- Payments: Stripe
- Email: Resend

## Deploy
```bash
netlify deploy --prod --dir=public
```

## QA Rules
After ANY change to index.html:
1. Run Babel compile check
2. Verify all useState setters match setXxx() calls in Hub component
3. Check no inner </script> tags
4. Check no duplicate function declarations

## Architecture
- 16 React components in one file
- Supabase RLS on all tables (family-aware via get_my_family_user_ids())
- 9 Edge Functions for server logic
- PWA with service worker

## Key Patterns
- `db()` helper for all Supabase REST calls
- `au()` helper for auth calls
- Family data sharing via SECURITY DEFINER functions
- Member filter pills at top of Hub

## Don't
- Don't use localStorage/sessionStorage in React (use state)
- Don't expose secret keys in frontend code
- Don't break the single-file architecture (until migration)
