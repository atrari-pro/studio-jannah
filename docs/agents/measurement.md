# Measurement Agent

Rôle : garder le **dataLayer pro** (contrat v1) intact partout.

## Source de vérité
- Spec : `docs/TRACKING_DATALAYER.md`
- Runtime : `apps/web/public/sj/datalayer.js` (chargé en premier dans BaseLayout)
- TS : `packages/shared/src/datalayer/`

## Règles non négociables
1. Ne jamais faire `dataLayer = []` si le tableau existe
2. Events métier = `sj_*` + `schema_version`, `brand`, `page_type`, `content_group`
3. CTA = `zone_objet_action` via `data-track-cta`
4. Pas de double page_view (dédup runtime)
5. Consent analytics avant flush des hits gated
6. Toute nouvelle page : passer `pageType` + `contentGroup` à BaseLayout

## Checklist page
- [ ] BaseLayout props pageType / contentGroup
- [ ] CTA trackés
- [ ] Pas de script qui reset le DL
- [ ] Build OK ; smoke DevTools `dataLayer` lisible
