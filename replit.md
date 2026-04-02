# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
│   └── pepewife/           # PEPEWIFE presale platform (React + Vite)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

### `artifacts/pepewife` (`@workspace/pepewife`)

React + Vite single-page crypto presale platform for $PWIFE meme coin on Solana. Bold satirical cartoon meme aesthetic.

- **Stack**: React 19, Vite, Tailwind CSS 4, Recharts, react-icons, lucide-react, shadcn/ui
- **Design Style**: Cartoon meme aesthetic — thick black borders, offset box-shadows, zigzag rainbow dividers, dot-pattern backgrounds, speech bubbles, rotated stickers, degen/meme language
- **Color Palette**: Green `#4CAF50`, Pink `#FF4D9D`, Yellow `#FFD54F`, Purple `#AB47BC`, Blue `#42A5F5`, Dark `#1a1a2e`
- **Fonts**: Display = `Bangers` (meme headers), Body = `Comic Neue`, Fallback = `Space Grotesk`
- **CSS Utilities**: `.meme-card`, `.meme-border`, `.btn-meme`, `.sticker`, `.speech-bubble`, `.zigzag-border`, `.rainbow-text`, `.wiggle-hover`, `.comic-shadow`, `.pattern-dots`, `.float-animation`
- **Pages/Routes**: `/` (Home), `/connect` (Connect Wallet), `/connecting` (Wallet Connecting Animation), `/dashboard` (Investor Dashboard)
- **Connect Wallet Page**: Supports Phantom (recommended), MetaMask, Binance Wallet, Trust Wallet — each with branded icon, hover/focus states, loading spinner on click, then redirect to `/connecting`
- **Connecting Page**: Dark-themed full-screen overlay with 5-step animated progress (Connecting → Verifying → Securing → Loading → Welcome), spinning logo, rainbow progress bar, success checkmark, wallet address confirmation card, then auto-redirects to dashboard
- **Sections**: Hero (background image), Partners ticker, Presale + Referral (2-column), Why Buy (4 cards), How to Buy (5 steps), Tokenomics (image left + details right, no chart), Roadmap (4 phases with images), Social Feed (3 posts), Risk Warning, Footer
- **Dashboard**: Full-page route with 5 tabs (Overview, My Purchases, Claim, Referrals, Transactions), sidebar nav on desktop, horizontal scroll tabs on mobile
- **Images in public/**: `pepewife-bg.png` (hero bg), `logo.png` (navbar/footer), `tokenomics-girl.png` (female Pepe in private jet), `roadmap-phase1.png` to `roadmap-phase4.png` (unique per phase)
- **State variables**: `currency` (SOL/USDT), `copied`, `timeLeft` (countdown), `isConnected`, `isMenuOpen`
- **Presale state**: All data zeroed out for pre-launch (prices $0.0000, stages LOCKED, no purchases/transactions)
- **i18n System**: Full internationalization supporting English, Arabic (RTL), and French
  - Translation files: `src/i18n/en.ts`, `ar.ts`, `fr.ts` — structured as nested objects typed against `Translations`
  - Context: `src/i18n/context.tsx` — `LanguageProvider` wraps app, `useLanguage()` hook returns `{ t, lang, setLang, dir }`
  - Language switcher: `src/components/language-switcher.tsx` — globe icon dropdown in all navbars
  - RTL: Arabic sets `dir="rtl"` on `<html>`, CSS rules in `index.css` flip box-shadows, speech bubble tails, ticker direction
  - RTL layout fixes: hero background flips position, tokenomics grid swaps order (`md:order-first`/`md:order-last`), roadmap card images reorder, text shadows and box shadows flip x-offset via `isRTL` conditional
  - All pages use Tailwind logical properties (`start`/`end`, `ms`/`me`, `ps`/`pe`, `text-start`) for RTL-safe layout
  - Dashboard also uses `isRTL` for inline `boxShadow` flipping on stat cards and presale stage cards
  - Language persisted in `localStorage` key `pepewife-lang`
- **Pages**: Home (`/`), Connect (`/connect`), Connecting (`/connecting`), Dashboard (`/dashboard`), Whitepaper (`/whitepaper`), Risk Disclaimer (`/risk-disclaimer`), Terms of Use (`/terms`)
- **About link** in navbar navigates to Whitepaper page; footer on all pages links to Whitepaper, Risk Disclaimer, Terms of Use
- **SEO**: `SEOHead` component (`src/components/seo-head.tsx`) on all pages — sets title, meta description, canonical URL, OG/Twitter tags; `noindex` on connect/dashboard; `index.html` has base OG/Twitter/JSON-LD; `robots.txt` and `sitemap.xml` in public; whitepaper section images use `loading="lazy"`; all images have descriptive alt text; HTML `lang` and `dir` attributes set dynamically via i18n context
- **All data is static/mocked** — no backend integration
