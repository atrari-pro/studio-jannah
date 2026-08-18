# Data Layer Studio Jannah — v1.0.0

## Audit (avant refonte)
- `dataLayer = []` répété (Consent + Tracking + TAC) → risque de confusion
- Events non namespacés (`page_view`, `cta_click`…)
- Doubles `page_view` (boot + consent poll + event)
- File d’attente poussée dans le DL comme `sj_event_queued` (bruit GTM)
- Pas de `page_type` / `content_group` / `event_id`
- CTA IDs hétérogènes

## Principes v1
1. **Un seul tableau** `window.dataLayer` — jamais réassigné s’il existe (`/sj/datalayer.js` en premier)
2. **Events métier** = objets plain `sj_*` + schéma commun
3. **Consent Mode** = `Arguments` gtag (cohabitent ; GTM filtre)
4. **Queue interne** jusqu’à opt-in analytics — flush des vrais events (pas de faux event “queued”)
5. **Dédup** `sj_page_view` (path+surface) et `sj_scroll_depth` (path+%)
6. CTA : `zone_objet_action` (ex. `header_cta_contact`)

## Hit type

```js
{
  event: "sj_page_view",
  event_id: "uuid",
  event_ts: 1710000000000,
  schema_version: "1.0.0",
  brand: "studio_jannah",
  surface: "web", // | app
  page_path: "/mag",
  page_title: "...",
  page_type: "mag_hub",
  content_group: "mag",
  consent_analytics: true
}
```

## Events
| event | usage |
|-------|--------|
| `sj_cmp_ready` | CMP up |
| `sj_consent_update` | opt-in/out |
| `sj_page_view` | navigation réelle |
| `sj_virtual_page_view` | wizard / SPA step |
| `sj_cta_click` | data-track-cta |
| `sj_outbound_click` | liens externes |
| `sj_scroll_depth` | 25/50/75/90/100 |
| `sj_campaign_land` | /go/* + UTMs |
| `sj_funnel_step` | app wizard |
| `sj_lead_submit` | contact |

## Fichiers
- Runtime web : `apps/web/public/sj/datalayer.js`
- Contrat TS : `packages/shared/src/datalayer/`
- Boot : `ConsentBoot.astro`, `TrackingBoot.astro`
- GTM : triggers sur `event` matches `sj_.*` ; Consent Overview sur Consent Mode

## GTM — à configurer
1. Consent Mode déjà default denied
2. Custom Event triggers pour chaque `sj_*`
3. Variables DL : `page_type`, `content_group`, `cta_id`, `campaign_source`…
4. Ne pas créer de tags sur les pushes `Arguments` (consent)
