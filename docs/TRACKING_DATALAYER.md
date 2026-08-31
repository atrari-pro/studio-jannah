# Data Layer Studio Jannah — v1.3.0

## Révision 1.3.0 (2026-08-31)
- **`brand`, `surface`, `content_group`, `consent_analytics` retirés du hit
  de base.** Champs jamais exploités côté GTM/GA4 (pas de variable, pas de
  segmentation active dessus — un seul site, une seule marque, `surface`
  dupliquait déjà `page_type: "app_demo"`) : signal mort, retiré plutôt que
  maintenu "au cas où". `consent_analytics` restait redondant avec le
  Consent Mode `Arguments` déjà en place (`gtag("consent", ...)`) — il n'est
  conservé qu'en tant que clé explicite du seul event qui en a l'usage,
  `sj_consent_update`.
- **Dédup `page_view`** simplifiée : par `page_path` seul (`surface` n'a
  plus de raison d'être — un seul runtime web, l'app `apps/app` ne pousse
  jamais de `page_view` réel, uniquement du `sj_virtual_page_view`).
- ⚠️ **Action GTM** : si des variables DL `brand` / `surface` /
  `content_group` existent côté conteneur (segmentation GA4, audiences...),
  elles cessent de recevoir des valeurs à partir de ce déploiement — à
  nettoyer ou requalifier côté GTM, ce fichier ne couvre que le contrat côté
  site.

## Révision 1.2.0 (2026-08-31)
- **Scroll depth retiré** (`sj_scroll_depth` supprimé du contrat, listener
  retiré de `TrackingBoot.astro`, `public/sj/datalayer.js` et
  `datalayer/runtime.ts`). Signal jamais exploité côté GTM/GA4, et redondant
  avec le scroll auto-collecté par GA4 Enhanced Measurement (event `scroll`,
  hors dataLayer sj_*, configuré côté propriété GA4). Si un besoin de scroll
  réapparaît, l'activer côté GA4 Enhanced Measurement plutôt que de
  redupliquer un event maison.
- **Audit naming** : tous les events métier custom sont déjà namespacés
  `sj_*` (`sj_cmp_ready`, `sj_consent_update`, `sj_cta_click`,
  `sj_outbound_click`, `sj_campaign_land`, `sj_funnel_step`,
  `sj_lead_submit`, `sj_virtual_page_view`). Les deux seules exceptions sont
  volontaires et documentées : `page_view` (nom standard GA4, cf. 1.1.0) et
  `gtm.js`/`gtm.start` (bootstrap interne du conteneur GTM, imposé par
  Google, jamais un event métier). Si un event non-`sj_*` est visible dans
  GTM Preview ou GA4 DebugView en dehors de ces deux cas, il vient d'un
  Enhanced Measurement GA4 (scroll, click, file_download…) — hors de ce
  contrat, à désactiver côté propriété GA4 si redondant plutôt qu'à
  renommer ici.

## Révision 1.1.0 (2026-08-31)
- **`page_view` remplace `sj_page_view`** — nom standard GA4/GTM plutôt qu'un
  namespace maison, pour matcher directement l'événement recommandé sans
  Custom Event trigger générique. ⚠️ **Le tag de configuration GA4 dans GTM
  doit avoir "Send a page view event when this configuration loads"
  DÉSACTIVÉ** — sinon double comptage (son `page_view` auto-collecté +
  celui poussé ici). Le reste du namespace `sj_*` (`sj_scroll_depth`,
  `sj_cta_click`, `sj_campaign_land`…) reste inchangé : ce sont des
  concepts propres à ce site, sans équivalent standard GA4, le custom
  naming garde tout son sens là.
- **Cookie CMP renommé** `sj_consent` → `sj_cmp_consent` — l'ancienne CMP
  (tarteaucitron, retirée) utilisait déjà `sj_consent` avec un format non-JSON
  (`!sjanalytics=true!...`). En réutilisant ce nom pour la nouvelle CMP
  (vanilla-cookieconsent, JSON), tout visiteur ayant connu l'ancienne CMP
  se retrouvait avec deux cookies `sj_consent` coexistants (paths
  différents) ; lequel des deux `document.cookie` renvoie en premier n'est
  pas garanti par la spec — dans les faits, le bandeau CMP se réaffichait à
  chaque chargement de page pour ces visiteurs (bug constaté sur le site
  déployé, corrigé par le renommage + nettoyage défensif de l'ancien nom
  dans `ConsentBoot.astro`).

## Audit (avant refonte v1.0.0)
- `dataLayer = []` répété (Consent + Tracking + TAC) → risque de confusion
- Events non namespacés (`page_view`, `cta_click`…)
- Doubles `page_view` (boot + consent poll + event)
- File d’attente poussée dans le DL comme `sj_event_queued` (bruit GTM)
- Pas de `page_type` / `content_group` / `event_id`
- CTA IDs hétérogènes

## Principes v1
1. **Un seul tableau** `window.dataLayer` — jamais réassigné s’il existe (`/sj/datalayer.js` en premier)
2. **Events métier** = objets plain, schéma commun. `page_view` en nom standard GA4 ; le reste namespacé `sj_*` (pas d'équivalent standard, ambiguïté à éviter)
3. **Consent Mode** = `Arguments` gtag (cohabitent ; GTM filtre)
4. **Queue interne** jusqu’à opt-in analytics — flush des vrais events (pas de faux event “queued”)
5. **Dédup** `page_view` (par `page_path`)
6. CTA : `zone_objet_action` (ex. `header_cta_contact`)

## Hit type

```js
{
  event: "page_view",
  event_id: "uuid",
  event_ts: 1710000000000,
  schema_version: "1.3.0",
  page_path: "/blog",
  page_title: "...",
  page_type: "blog_hub"
}
```

## Events
| event | usage |
|-------|--------|
| `sj_cmp_ready` | CMP up |
| `sj_consent_update` | opt-in/out |
| `page_view` | navigation réelle |
| `sj_virtual_page_view` | wizard / SPA step |
| `sj_cta_click` | data-track-cta |
| `sj_outbound_click` | liens externes |
| `sj_campaign_land` | /go/* + UTMs |
| `sj_funnel_step` | app wizard |
| `sj_lead_submit` | contact |

## Fichiers
- Runtime web : `apps/web/public/sj/datalayer.js`
- Contrat TS : `packages/shared/src/datalayer/`
- Boot : `ConsentBoot.astro`, `TrackingBoot.astro`
- GTM : trigger dédié sur `page_view` (Custom Event) + triggers sur `event` matches `sj_.*` ; Consent Overview sur Consent Mode

## GTM — à configurer
1. Consent Mode déjà default denied
2. **Tag de configuration GA4 : désactiver "Send a page view event when this configuration loads"** (sinon double `page_view`) ; Custom Event trigger sur `page_view` pour le tag GA4 Event correspondant
3. Custom Event triggers pour chaque `sj_*`
4. Variables DL : `page_type`, `cta_id`, `campaign_source`… (`brand` /
   `surface` / `content_group` retirés en v1.3.0, cf. révision ci-dessus)
5. Ne pas créer de tags sur les pushes `Arguments` (consent)
