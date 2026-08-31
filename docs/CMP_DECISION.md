# CMP — arbitrage agents Tech × RGPD

## Décision actuelle (révision 2026-08-31)
**vanilla-cookieconsent** (Orest Bida, MIT — 5.6k★, actif) — remplace tarteaucitron.js

| Agent | Position |
|-------|----------|
| Tech | Design/perf plafonnés par le CSS `!important`-sur-`#id` de tarteaucitron (5 PR de correctifs successifs sur des bugs vendor : panneau ne se refermant plus, chevron hors panneau, description en tooltip flottant...). vanilla-cookieconsent thème par CSS custom properties (`--cc-*`), zéro override en force nécessaire. |
| RGPD | L'argument initial « GCM 100 % maison chez vanilla-cookieconsent » ne tenait déjà plus dans le code : l'intégration tarteaucitron désactivait aussi son module Consent Mode natif (`googleConsentMode: false`) au profit d'appels `gtag` écrits à la main, pour les mêmes raisons de contrôle. Opt-in strict, DenyAll au même niveau que AcceptAll, catégorie "necessary" readOnly : conservés à l'identique. |
| Director | **vanilla-cookieconsent** — reste un choix de positionnement (notoriété CNIL/FR de tarteaucitron) plutôt qu'un point technique bloquant ; tranché en faveur du résultat visuel/UX sur un site qui vend justement de l'expertise tracking. |

## Décision précédente (archivée)
tarteaucitron.js (MIT, self-hébergé, v1.34+) — cf. historique git pour le détail de cet arbitrage initial (notoriété marché FR, catalogue de services GTM prêt à l'emploi).

## Pourquoi pas les autres (toujours valable)
- **Klaro** : solide, moins ancré marché FR
- **Didomi / Axeptio / OneTrust** : payants, hors brief OSS

## Intégration Studio Jannah
- Dépendance : `vanilla-cookieconsent` (npm, bundlé via Vite — plus de vendor self-hébergé/copié à chaque build)
- Boot : `ConsentBoot.astro` (consent default denied → run() → GTM `GTM-KB54PFTP` si accepté)
- Style : `apps/web/src/styles/cmp-jannah.css` (CSS custom properties, pas de `!important`)
- Cookie : `sj_consent` (JSON, catégories `necessary`/`analytics`) — `apps/web/public/sj/datalayer.js` lit ce format pour la pré-hydratation du consentement au chargement
- Politique stub : `/politique-confidentialite`
- Réouverture : lien `data-open-cmp` (footer) + deep-link `#cookies`
- **Pas de snippet GTM brut** ni noscript : le container est déclaré via `PUBLIC_GTM_ID` + callback `onAccept` de la catégorie `analytics`

## Avant prod (checklist RGPD)
- [ ] Finaliser politique + mentions légales
- [ ] Renseigner `PUBLIC_GTM_ID` si GTM
- [ ] Vérifier blocage tags avant consent (DevTools)
- [ ] Inventaire cookies réel
- [ ] DPA hébergeur / Google si applicable
