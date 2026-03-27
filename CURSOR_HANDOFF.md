# Cursor Account Handoff - Marcus Opportunist Vault

This file is a quick handoff so work can continue from another Cursor account without losing context.

## Repo + Deployment

- GitHub repo: https://github.com/Torchline-Group/marcus-opportunist-vault
- Main branch is current and synced.
- Latest known commit before this handoff: `d59e041` (`Fix Supabase bootstrap to use public tables`)
- Current verified deployment URL: `https://marcus-opportunist-vault-bsa98abm6-torchline-group.vercel.app/`

## Verified Endpoints

- `GET /api/health` -> `{"ok":true}`
- `POST /api/opportunist/seed-from-vault` -> inserts ideas from `vault.md`
- `GET /api/opportunist/bootstrap` -> returns dashboard state

## Current Architecture

- Frontend: Next.js App Router in `src/app/page.tsx`
- Data loading:
  - Primary: Supabase through API routes
  - Fallback: localStorage (`src/lib/dashboardStorage.ts`)
- Main API routes:
  - `src/app/api/scrape/route.ts`
  - `src/app/api/opportunist/bootstrap/route.ts`
  - `src/app/api/opportunist/seed-from-vault/route.ts`
- Supabase client for server routes:
  - `src/lib/supabaseAdmin.ts` (service role key)

## Database Status (Supabase)

- Tables were moved to `public` schema and API queries were updated accordingly.
- Service role privileges were granted on relevant public tables.
- Default tenant exists: `name = 'default'`.
- Storage buckets created:
  - `opportunist-product-photos`
  - `opportunist-brand-assets`

## Env Vars Required

Add these in Vercel and local `.env.local`:

- `FIRECRAWL_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WRITE_VAULT=false` (recommended default)

Optional existing vars (if used in your workflow):

- `VERCEL_TOKEN`
- `SHOPIFY_STORE`
- `SHOPIFY_KEY`

## Key Product Direction Captured

- Dashboard with tabs for:
  - Dashboard
  - Ideas & Projects
  - Products
  - Tech / SaaS
- Planned/expanded areas:
  - AI Agent Center
  - Finished Brands
- Psychology feature direction:
  - Explain why products/brands work (color, typography, emotion, luxury vs playful cues, positioning)
  - Compute a changing score out of 100 (no decimals)
  - Compare against niche/category averages
  - Provide competitive recommendations

## Highest-Priority Next Tasks

1. Wire UI for **AI Agent Center** to Supabase tables.
2. Wire UI for **Finished Brands** to Supabase tables.
3. Implement full CRUD API routes for stores/products/ideas/tech projects.
4. Add Supabase Storage upload flows for product and brand assets.
5. Implement product psychology analysis persistence (`product_psychology_insights`).
6. Add classification suggestion + manual override UX (NAICS/SIC/trademark/etc).

## Notes for the Next Cursor Session

- If module alias issues occur in API routes, use explicit relative imports (current code already does this where needed).
- If permission errors occur in Supabase again, verify grants for `service_role` on `public` tables.
- If Vercel shows old code, verify latest commit is pushed and deployment points to `main`.

