# CMP — arbitrage agents Tech × RGPD

## Décision
**tarteaucitron.js** (MIT, self-hébergé) — v1.34+

| Agent | Préférence initiale | Accord final |
|-------|---------------------|--------------|
| Tech | vanilla-cookieconsent (perf/UX) | Accepte TAC : GCM natif, catalogue GTM, marché FR |
| RGPD | tarteaucitron.js | Confirmé : opt-in, DenyAll, notoriété CNIL/FR |
| Director | — | **TAC** (connu + fiable + GTM sans SaaS) |

## Pourquoi pas les autres
- **vanilla-cookieconsent** : excellent tech, moins « standard de place » FR ; GCM 100 % maison
- **Klaro** : solide, moins ancré marché FR que TAC
- **Didomi / Axeptio / OneTrust** : payants, hors brief OSS

## Intégration Studio Jannah
- Assets : `apps/web/public/tarteaucitron/` via `pnpm sync:cmp`
- Boot : `ConsentBoot.astro` (consent default denied → TAC → GTM `GTM-KB54PFTP`)
- Style : `public/styles/cmp-jannah.css`
- Politique stub : `/politique-confidentialite`
- Réouverture : lien `data-open-cmp` (footer)
- **Pas de snippet GTM brut** ni noscript : le container est déclaré via `PUBLIC_GTM_ID` + service TAC `googletagmanager`

## Avant prod (checklist RGPD)
- [ ] Finaliser politique + mentions légales
- [ ] Renseigner `PUBLIC_GTM_ID` si GTM
- [ ] Vérifier blocage tags avant consent (DevTools)
- [ ] Inventaire cookies réel
- [ ] DPA hébergeur / Google si applicable
