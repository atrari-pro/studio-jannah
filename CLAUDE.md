# Studio Jannah
## Goal: Vitrine expert data/marketing/tracking/IA qui construit l’image Studio Jannah, lève Malt/LinkedIn, et peut démarrer en app démo (PWA → Capacitor).
## Stack: Monorepo pnpm — Astro (site) + Vite/React (funnels/app) + packages partagés (tokens, tracking). Host: GitHub Pages (+ Supabase pour leads). Capacitor/PWA pour démo mobile plus tard.
## Deploy: Git → GitHub Actions → Pages (`docs/DEPLOY_PAGES_SUPABASE.md`). Contact → table Supabase `leads`.
## Conventions:
- Contenu : `apps/web/content/insights/` (Le Mag → `/mag`), `apps/web/content/use-cases/` — orchestre `AGENTS.md`
- Tracking: dataLayer contrat v1 (`docs/TRACKING_DATALAYER.md`) — runtime `/sj/datalayer.js`, events `sj_*`
- Liens site : toujours `withBase()` (base `/studio-jannah` en CI Pages)
- Mobile-first, pattern « Preuve par le signal »
- Marque: Studio Jannah ; signature: Mohamed Atrari
- Code clean ; conventional commits
## Apps / context:
- `apps/web` — vitrine Astro
- `apps/app` — funnels / démo Capacitor-ready
- `packages/shared` — tokens, config, tracking
- `supabase/leads.sql` — schéma contact
- Agents: voir `AGENTS.md` + `docs/agents/`
