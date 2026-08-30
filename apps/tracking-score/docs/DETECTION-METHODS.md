# Méthodes de détection des outils — Studio Jannah Tracking Score

Source : Recherche documentation officielle 2026

## CMP (Consent Management Platforms)

### Didomi
- **Objet global** : `window.Didomi`
- **Config** : `Didomi.getConfig()`
- **Statut utilisateur** : `Didomi.getCurrentUserStatus()`
- **Vendors** : `Didomi.getUserStatus().vendors.global`
- **Config distante** : `window.didomiRemoteConfig`
- **Documentation** : https://developers.didomi.io/cmp/web-sdk/reference/api

### Axeptio
- **Objet global** : `window.axeptioSettings`
- **Documentation** : https://developers.axeptio.eu/

### Cookiebot
- **Objet global** : `window.Cookiebot` ou `window.CookieConsent`
- **Documentation** : https://www.cookiebot.com/en/developer/

### Tarteaucitron
- **Objet global** : `window.tarteaucitron`
- **Services** : `tarteaucitron.services`
- **Documentation** : https://tarteaucitron.io/fr/doc/

### OneTrust
- **Objet global** : `window.OneTrust` ou `window.OptanonWrapper`
- **Documentation** : https://developer.onetrust.com/

---

## TMS (Tag Management Systems)

### Google Tag Manager (GTM)
- **Objet global** : `window.google_tag_manager`
- **Container ID** : Format `GTM-XXXXXXX`
- **Script** : `googletagmanager.com/gtm.js?id=GTM-`
- **dataLayer** : `window.dataLayer` (array)
- **Vérification** : `typeof window.google_tag_manager === 'object'`
- **Documentation** : https://developers.google.com/tag-platform/tag-manager

### Adobe Launch (Adobe Experience Platform Tags)
- **Objet global** : `window._satellite`
- **Script** : `assets.adobedtm.com`
- **Documentation** : https://experienceleague.adobe.com/docs/launch/

### CommandersAct (TagCommander)
- **Objet global** : `window.tc_vars`
- **Script** : `tagcommander.com`
- **Documentation** : https://doc.commandersact.com/

### Tealium iQ
- **Objet global** : `window.utag`
- **Script** : `tags.tiqcdn.com`
- **Documentation** : https://docs.tealium.com/

---

## Analytics Site-Centric

### Google Analytics 4 (GA4)
- **Objet global** : `window.gtag` (fonction)
- **Vérification** : `typeof gtag === 'function'`
- **Measurement ID** : Format `G-XXXXXXX`
- **Script** : `googletagmanager.com/gtag/js?id=G-`
- **Requêtes** : `google-analytics.com/g/collect`
- **dataLayer** : `window.dataLayer` (array)
- **Cookie** : `_ga`, `_ga_G-XXXXXXX`
- **Documentation** : https://developers.google.com/analytics/devguides/collection/ga4

### Adobe Analytics
- **Objet global** : `window.s`
- **Méthodes** : `s.t()` (page view), `s.tl()` (link tracking)
- **Requêtes** : `.sc.omtrdc.net`
- **Documentation** : https://experienceleague.adobe.com/docs/analytics/

### Piano Analytics (ex-AT Internet)
- **Objet global** : `window.pa` ou `window.ATInternet`
- **Requêtes** : `.xiti.com` ou `.at-o.net`
- **Documentation** : https://developers.atinternet-solutions.com/

### Matomo (ex-Piwik)
- **Objet global** : `window._paq` (array de commandes)
- **Requêtes** : `matomo.php` ou `piwik.php`
- **Documentation** : https://developer.matomo.org/

### Contentsquare
- **Objet global** : `window.cs`
- **Script** : `t.contentsquare.net`
- **Documentation** : https://docs.contentsquare.com/

---

## A/B Testing & Personnalisation

### Optimizely
- **Objet global** : `window.optimizely` ou `window.optly`
- **Experiments actifs** : `optimizely.get('state').getActiveExperimentIds()`
- **Variations** : `optimizely.get('state').getVariationMap()`
- **États campaigns** : `optimizely.get('state').getCampaignStates({isActive:true})`
- **Log** : Query param `optimizely_log=info` ou `window['optimizely'].push({ type: 'log', level: 'info' })`
- **Documentation** : https://docs.developers.optimizely.com/web-experimentation/

### VWO (Visual Website Optimizer)
- **Objet global** : `window._vwo_code`, `window.VWO`, `window._vwo_exp`
- **Experiments actifs** : `window._vwo_exp_ids` (array)
- **Callback** : `_vwo_code.finished = function() { ... }`
- **Requêtes** : `dev.visualwebsiteoptimizer.com`, `j.php`
- **Documentation** : https://developers.vwo.com/

### Google Optimize
- **Via GTM/GA4** : Event `optimize.activate` dans dataLayer
- **Vérification** : `window.dataLayer.some(item => item.event === 'optimize.activate')`
- **Documentation** : https://support.google.com/optimize

### AB Tasty
- **Objet global** : `window.ABTasty` ou `window.abtasty`
- **Documentation** : https://developers.abtasty.com/

### Kameleoon
- **Objet global** : `window.Kameleoon`
- **Documentation** : https://developers.kameleoon.com/

---

## Attribution Mobile-to-Web

### Adjust
- **Objet global** : `window.Adjust` ou `window.AdjustConfig`
- **Documentation** : https://help.adjust.com/en/article/web-sdk

### AppsFlyer
- **Objet global** : `window.AF` ou `window.appsflyerSDK`
- **Documentation** : https://dev.appsflyer.com/hc/docs/web-sdk-reference

### Branch
- **Objet global** : `window.branch`
- **Documentation** : https://help.branch.io/developers-hub/docs/web-sdk

### Kochava
- **Objet global** : `window.Kochava`
- **Documentation** : https://support.kochava.com/sdk-integration/web-sdk

---

## Media Pixels (détection basique)

### Meta Pixel (Facebook)
- **Objet global** : `window.fbq`
- **Script** : `connect.facebook.net/.../fbevents.js`
- **Requêtes** : `facebook.com/tr`
- **Documentation** : https://developers.facebook.com/docs/meta-pixel

### Google Ads Conversion Tracking
- **Tag** : `AW-` dans `gtag('config', 'AW-...')`
- **Requêtes** : `googleadservices.com`
- **Documentation** : https://support.google.com/google-ads/

### TikTok Pixel
- **Objet global** : `window.ttq`
- **Script** : `analytics.tiktok.com`
- **Documentation** : https://ads.tiktok.com/help/article/standard-mode-pixel

### LinkedIn Insight Tag
- **Objet global** : `window._linkedin_data_partner_ids`
- **Script** : `snap.licdn.com`
- **Documentation** : https://business.linkedin.com/marketing-solutions/insight-tag

### Pinterest Tag
- **Objet global** : `window.pintrk`
- **Script** : `ct.pinterest.com`
- **Documentation** : https://help.pinterest.com/en/business/article/pinterest-tag

---

## Détection dataLayer

### Structure EventDrivenDataLayer (EDDL)
```javascript
// Recherche automatique de l'objet dataLayer (si renommé)
for (let key in window) {
  if (typeof window[key] === 'object' && 
      Array.isArray(window[key]) && 
      window[key].length &&
      window[key].some(item => 'event' in item)) {
    console.log('DataLayer trouvé:', key);
  }
}
```

### Catégorisation des events
- **Navigation** : `page_view`, `virtual_pageview`
- **Engagement** : `click`, `scroll`, `video_*`
- **E-commerce** : `view_item`, `add_to_cart`, `purchase`
- **Formulaire** : `form_submit`, `generate_lead`
- **Consentement** : `consent_update`, `cookie_consent`
- **Custom** : Préfixe personnalisé (ex: `sj_*`)

---

## Notes d'implémentation

1. **Timing** : Toujours vérifier après chargement DOM complet
2. **Callbacks** : Utiliser `window.didomiOnReady`, `_vwo_code.finished`, etc. pour timing correct
3. **Iframes** : Certains outils (Didomi, GTM) communiquent via `postMessage`
4. **Rename** : Les objets peuvent être renommés (ex: `dataKoko` au lieu de `dataLayer`) — mode assisté requis
5. **Multiple instances** : Un site peut avoir plusieurs outils du même type (ex: GTM + GA4 natif)

---

**Dernière mise à jour** : 2026-08-27  
**Sources** : Documentation officielle de chaque éditeur
