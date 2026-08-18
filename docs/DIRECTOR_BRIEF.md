# Studio Jannah — Director brief (phase 1 livrée)

## Décisions figées
- Marque: **Studio Jannah**
- Pattern: atelier du signal / preuve par le signal
- Stack: monorepo pnpm — Astro (vitrine) + Vite/React (app démo) + `@studio-jannah/shared`
- Hero: marques **fictives**
- Acquisition: `/go/malt`, `/go/linkedin` + events
- Slots: `/insights`, `/ao`, `/app` + `llms.txt`
- Mobile app: base relative Vite + wizard ; PWA/Capacitor = phase suivante

## Orchestre agents
Director · Brand/UX · Web Perf · Product/Funnel · Measurement · Growth · Content/GEO · Innovation · QA

## CMP (livré)
- **tarteaucitron.js** — arbitrage Tech × RGPD (voir `docs/CMP_DECISION.md`)
- Consent Mode v2 default denied ; GTM si `PUBLIC_GTM_ID`
- Stub `/politique-confidentialite` + lien Cookies footer

## Tracking DL v1 (livré)
- Spec `docs/TRACKING_DATALAYER.md` — runtime `/sj/datalayer.js` en premier
- Events `sj_*`, queue interne post-consent, dédup page_view/scroll
- Pages : `pageType` + `contentGroup` sur BaseLayout

## Contenu (livré)
- Orchestre `AGENTS.md` + briefs `docs/agents/` + rule `.cursor/rules/content-orchestra.mdc`
- **Jannah Mag** (`/mag`) — magazine type Semrush, pas une liste insights
- Article : `/mag/trafic-demain-mesure`
- Use case : `/use-cases/paiement-hors-domaine`

## Design home (refonte)
- Inspiration structure Morgan Fabre — épure + expertises mises en valeur
- Home : Hero brand → marques → Expertises → Missions → Use cases → Mag → Signature → CTA
- Méthode déplacée sur `/a-propos` ; tokens pierre froide + Syne/Manrope

## Phase 2 (next)
1. Domaine réel + URLs Malt/LinkedIn
2. Manifest PWA + icônes ; scaffold Capacitor
3. Finaliser politique confidentialité + brancher vrai GTM ID
4. Remplacer placeholders marques
5. Deploy Cloudflare Pages
