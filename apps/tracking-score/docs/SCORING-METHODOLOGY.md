# Méthodologie de scoring — Studio Jannah Tracking Score

**Version** : 2.0  
**Dernière mise à jour** : 27 août 2026  
**Objectif** : Grille d'évaluation transparente basée sur les standards métier 2026

---

## Principes fondateurs

### 1. **Transparence absolue**
Chaque point est justifié par :
- Une référence métier officielle
- Un critère RGPD ou best practice Google
- Un KPI mesurable objectivement

### 2. **Différenciation auto vs manuel**
- ✅ **Auto (vérifié)** : 100% des points si critère validé
- 🔧 **Manuel (déclaré)** : 50% des points max (guide la vérification, ne la remplace pas)
- ❓ **Non détecté** : 0 point

### 3. **Score pondéré par impact métier**
- **CMP** (30 pts) : Non-conformité RGPD = risque juridique + invalidité données
- **TMS** (20 pts) : Gouvernance tags = fiabilité + maintenabilité
- **Analytics** (25 pts) : Qualité données = ROI décisionnel
- **DataLayer** (25 pts) : Structure = évolutivité + debugabilité
- **Performance** (20 pts) : Vitesse = UX + SEO + taux conversion
- **Consent Mode v2** (bonus 10 pts) : Compliance Google Ads 2026

**Score total** : 120 points (100 base + 20 bonus)

---

## Module A — CMP (30 points)

### Référence métier
- RGPD Art. 7 (consentement valide)
- CNIL guidelines 2026
- IAB TCF v2.3 (obligatoire 28 fév 2026)
- Google Consent Mode v2 (obligatoire mars 2024 pour EEA)

Source : [GDPR Cookie Audit Checklist 2026](https://www.consentscope.pro/blog/gdpr-cookie-audit-checklist)

### Critères de scoring (30 pts)

| Critère | Points | Auto | Manuel | Vérification technique |
|---------|--------|------|--------|------------------------|
| **1. CMP détectée** | 5 | ✅ | 🔧 | `window.didomi`, `window.Cookiebot`, etc. |
| **2. Blocage pré-consentement** | 10 | ✅ | ❌ | Capture réseau : 0 requête analytics/ads avant clic banner |
| **3. Choix granulaire (Accepter/Refuser)** | 5 | ✅ | ❌ | Présence bouton "Refuser" visible (pas dark pattern) |
| **4. Audit trail (logs consentement)** | 5 | ❌ | 🔧 | Vérifie si CMP expose API `getConsents()` ou équivalent |
| **5. Consent Mode v2 intégré** | 5 | ✅ | ❌ | Paramètres `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization` présents |

### Déduction

| Problème | Pénalité | Raison |
|----------|----------|--------|
| Requêtes analytics/ads AVANT consentement | -10 pts | Violation RGPD Art. 7 (consentement pas obtenu) |
| Dark pattern (refus complexe vs acceptation) | -5 pts | Non-conformité CNIL |
| Pas de logs exportables | -5 pts | Pas de preuve audit RGPD |

### Interprétation score

| Score | Statut | Action requise |
|-------|--------|----------------|
| 25-30 | ✅ Conforme | Aucune |
| 15-24 | ⚠️ Risque modéré | Corriger blocage pré-consentement |
| 0-14 | ❌ Critique | Risque juridique — corriger immédiatement |

---

## Module B1 — TMS (20 points)

### Référence métier
- Google Tag Manager Best Practices 2026
- Agences : [GTM Container Audit Checklist](https://phloz.com/blog/gtm-container-audit-checklist)

Source : [GA Auditor GTM Checklist](https://www.gaauditor.com/blog/google-tag-manager-audit/)

### Critères de scoring (20 pts)

| Critère | Points | Auto | Manuel | Vérification technique |
|---------|--------|------|--------|------------------------|
| **1. TMS détecté** | 5 | ✅ | 🔧 | `window.google_tag_manager`, `window._satellite` |
| **2. Container ID identifié** | 5 | ✅ | 🔧 | `GTM-XXXXXX` extrait du DOM ou réseau |
| **3. Tags respectent consentement** | 5 | ✅ | ❌ | Aucun tag analytics/ads ne fire AVANT consent update |
| **4. Pas de tags dupliqués** | 3 | ❌ | 🔧 | Vérification upload container.json (Module E) |
| **5. Naming conventions** | 2 | ❌ | 🔧 | Vérification upload container.json (Module E) |

### Déduction

| Problème | Pénalité | Raison |
|----------|----------|--------|
| Tags analytics/ads fire AVANT consent | -5 pts | Invalidité données + violation RGPD |
| Pas de container ID (hardcodé) | -2 pts | Risque contamination cross-env |

### Interprétation score

| Score | Statut | Action requise |
|-------|--------|----------------|
| 17-20 | ✅ Optimal | Aucune |
| 10-16 | ⚠️ Maintenabilité moyenne | Audit container recommandé |
| 0-9 | ❌ Risque qualité données | Audit container obligatoire |

---

## Module B2 — Analytics (25 points)

### Référence métier
- GA4 Data Quality Scorecard (100 pts benchmark industrie)
- [GA4 Audit Checklist 2026](https://ga4-auditor.dev/en/blog/features-testkatalog)

Source : [GA4 Data Quality Scorecard](https://www.linkedin.com/pulse/ga4-data-quality-scorecard-ecommerce-saas-lead-gen-sites-margub-alam-j38oc)

### Critères de scoring (25 pts)

| Critère | Points | Auto | Manuel | Vérification technique |
|---------|--------|------|--------|------------------------|
| **1. Analytics détecté** | 5 | ✅ | 🔧 | `window.gtag`, `window._gaq`, `window.s` (Adobe) |
| **2. Property/Measurement ID identifié** | 5 | ✅ | 🔧 | `G-XXXXXXXXX` (GA4) ou `UA-XXXXX` (UA) |
| **3. Events GA4 recommandés présents** | 5 | ✅ | ❌ | `page_view`, `view_item`, `purchase`, etc. dans dataLayer |
| **4. Paramètres requis complets** | 5 | ✅ | ❌ | Ex: `purchase` contient `transaction_id`, `value`, `currency`, `items` |
| **5. Pas de duplicate pageview** | 3 | ✅ | ❌ | 1 seul `page_view` par chargement page |
| **6. Consent Mode v2 configuré** | 2 | ✅ | ❌ | GA4 Admin > Data collection > Consent settings = ✅ |

### Déduction

| Problème | Pénalité | Raison |
|----------|----------|--------|
| Duplicate `page_view` | -3 pts | Inflation sessions/users = ROI faussé |
| Events custom sans paramètres | -5 pts | Non-exploitable en analyse |
| `purchase` sans `transaction_id` | -5 pts | Risque duplicate transactions = revenue faussé |

### Interprétation score

| Score | Statut | Action requise |
|-------|--------|----------------|
| 22-25 | ✅ Revenue-ready | Aucune |
| 15-21 | ⚠️ Usable mais risqué | Corriger events e-commerce |
| 0-14 | ❌ Données non fiables | Refonte tracking |

---

## Module C — DataLayer (25 points)

### Référence métier
- [DataLayer Governance](https://dumbdata.co/post/datalayer-governance-practices-for-healthy-measurement/)
- [DataLayer Naming Conventions](https://taggingdocs.com/datalayer/specification/naming-conventions/)

Source : Google Tag Manager Best Practices 2026

### Critères de scoring (25 pts)

| Critère | Points | Auto | Manuel | Vérification technique |
|---------|--------|------|--------|------------------------|
| **1. DataLayer initialisé** | 5 | ✅ | ❌ | `window.dataLayer` existe et est array |
| **2. Nomenclature snake_case** | 5 | ✅ | ❌ | Events matchent `/^[a-z0-9_]+$/` |
| **3. Event names descriptifs** | 5 | ✅ | ❌ | Pas de noms génériques (`click`, `event1`, etc.) |
| **4. Structure e-commerce GA4** | 5 | ✅ | ❌ | `ecommerce.items[]` avec `item_id`, `item_name`, `price`, `quantity` |
| **5. Reset ecommerce (`null`) avant push** | 3 | ✅ | ❌ | `{ ecommerce: null }` push détecté avant events e-commerce |
| **6. Préfixe custom events** | 2 | ✅ | ❌ | Events custom commencent par préfixe (ex: `sj_`, `custom_`) |

### Déduction

| Problème | Pénalité | Raison |
|----------|----------|--------|
| camelCase ou PascalCase | -3 pts | Incohérence GA4 (tous les events GA4 sont snake_case) |
| Ecommerce sans reset `null` | -5 pts | Risque items array contaminé entre events |
| Events génériques (`click`, `event`) | -3 pts | Non-exploitable en analyse |

### Interprétation score

| Score | Statut | Action requise |
|-------|--------|----------------|
| 22-25 | ✅ Production-ready | Aucune |
| 15-21 | ⚠️ Maintenabilité moyenne | Normaliser nomenclature |
| 0-14 | ❌ Non-gouverné | Refonte dataLayer |

---

## Module D — Performance (20 points)

### Référence métier
- [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/rest)
- Core Web Vitals 2026 (LCP, INP, CLS)

Source : Google PageSpeed Insights + Lighthouse 12

### Critères de scoring (20 pts)

| Critère | Points | Auto | Manuel | Vérification technique |
|---------|--------|------|--------|------------------------|
| **1. Performance score > 90** | 8 | ✅ | ❌ | PageSpeed Insights API `lighthouseResult.categories.performance.score` |
| **2. Accessibilité score > 90** | 4 | ✅ | ❌ | PageSpeed Insights API `lighthouseResult.categories.accessibility.score` |
| **3. SEO score > 90** | 4 | ✅ | ❌ | PageSpeed Insights API `lighthouseResult.categories.seo.score` |
| **4. Best Practices score > 90** | 4 | ✅ | ❌ | PageSpeed Insights API `lighthouseResult.categories.best-practices.score` |

### Déduction

| Problème | Pénalité | Raison |
|----------|----------|--------|
| Performance < 50 | -5 pts | Impact UX critique + SEO |
| Accessibilité < 50 | -2 pts | Non-conformité WCAG |

### Interprétation score

| Score | Statut | Action requise |
|-------|--------|----------------|
| 18-20 | ✅ Excellent | Aucune |
| 12-17 | ⚠️ Correct | Optimisations recommandées |
| 0-11 | ❌ Critique | Audit performance urgent |

---

## Bonus — Consent Mode v2 (10 points)

### Référence métier
- [Google Consent Mode v2 Implementation](https://cookiechimp.com/blog/google-consent-mode-v2-implementation-guide)
- Obligatoire depuis mars 2024 pour EEA

Source : [GA4 Consent Mode v2 Audit Checklist](https://snifflytics.com/blog/ga4-consent-mode-v2-the-complete-audit-checklist-for-2026)

### Critères de scoring (10 pts bonus)

| Critère | Points | Auto | Manuel | Vérification technique |
|---------|--------|------|--------|------------------------|
| **1. Les 4 paramètres v2 détectés** | 3 | ✅ | ❌ | `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization` |
| **2. Default = denied avant banner** | 3 | ✅ | ❌ | Aucun cookie avant interaction banner |
| **3. Update après consentement** | 2 | ✅ | ❌ | Paramètres `gcs`/`gcd` changent après clic |
| **4. GA4 Admin confirme signaux v2** | 2 | ❌ | 🔧 | GA4 Admin > Data collection > Consent settings |

### Interprétation score

| Score | Statut | Impact |
|-------|--------|--------|
| 8-10 | ✅ Conforme v2 | Conversion modelling Google actif |
| 4-7 | ⚠️ Partiel | Perte données modélisées |
| 0-3 | ❌ Non-conforme | Perte audiences + remarketing |

---

## Tests comportementaux (validation finale)

### Test 1 — Blocage pré-consentement

**Objectif** : Vérifier qu'aucune donnée ne fuit avant consentement

**Procédure** :
1. Ouvrir site en mode navigation privée
2. Capturer Network tab SANS interagir avec banner
3. Filtrer requêtes : `google-analytics.com`, `facebook.com`, `doubleclick.net`, etc.

**Critère de réussite** :
- ✅ 0 requête tracking/analytics/ads
- ❌ Si ≥1 requête → **violation RGPD**

**Impact scoring** : -10 pts Module A

---

### Test 2 — Respect refus consentement

**Objectif** : Vérifier que "Refuser tout" bloque effectivement les tags

**Procédure** :
1. Ouvrir site en mode navigation privée
2. Cliquer "Refuser tout" sur banner
3. Naviguer sur 3-5 pages
4. Capturer Network tab

**Critère de réussite** :
- ✅ 0 requête Google Analytics / Meta Pixel / Google Ads
- ❌ Si requêtes présentes → **violation RGPD**

**Impact scoring** : -10 pts Module A + invalidité données

---

### Test 3 — Consent Mode v2 : gcs parameter

**Objectif** : Vérifier que les signaux consent sont transmis à Google

**Procédure** :
1. Ouvrir site en mode navigation privée
2. Network tab > filtrer `collect` (GA4)
3. Cliquer "Refuser tout"
4. Inspecter URL de la requête `google-analytics.com/g/collect`

**Critère de réussite** :
- ✅ Paramètre `gcs=G100` (denied)
- ❌ Si `gcs=G111` après refus → **non-conformité**

**Impact scoring** : -5 pts Bonus Consent Mode v2

---

### Test 4 — Consent Mode v2 : Acceptation

**Procédure** :
1. Ouvrir site en mode navigation privée
2. Cliquer "Accepter tout"
3. Network tab > filtrer `collect`
4. Inspecter paramètre `gcs`

**Critère de réussite** :
- ✅ `gcs=G111` (granted)
- ✅ Cookies `_ga`, `_gid` créés

**Impact scoring** : Aucun (validation conformité)

---

## Formule de calcul transparente

### Score final (sur 120)

```
Score Total = Score_CMP + Score_TMS + Score_Analytics + Score_DataLayer + Score_Performance + Bonus_ConsentMode
```

### Conversion en pourcentage

```
Pourcentage = (Score Total / 120) × 100
```

### Niveau de qualité

| Score | Niveau | Recommandation |
|-------|--------|----------------|
| 100-120 | 🏆 Excellence | Prêt pour audit externe |
| 80-99 | ✅ Production | Quelques optimisations mineures |
| 60-79 | ⚠️ Moyen | Corrections requises avant mise en prod |
| 40-59 | ❌ Faible | Refonte partielle nécessaire |
| 0-39 | 🚨 Critique | Refonte complète + risque juridique |

---

## Rapport d'audit — Sections obligatoires

### 1. Synthèse exécutive
- Score global + niveau
- Top 3 points forts
- Top 3 points critiques

### 2. Détail par module
- Score obtenu / score max
- Liste des critères validés (✅)
- Liste des critères échoués (❌) avec gravité

### 3. Tests comportementaux
- Résultat Test 1 (blocage pré-consent)
- Résultat Test 2 (respect refus)
- Résultat Test 3-4 (Consent Mode v2)

### 4. Recommandations priorisées
- **P0 (Critique)** : Violations RGPD, invalidité données
- **P1 (Haute)** : Impact métier direct (revenue, compliance)
- **P2 (Moyenne)** : Maintenabilité, gouvernance
- **P3 (Basse)** : Optimisations mineures

### 5. Comparaison industrie
- Benchmark score moyen secteur (si disponible)
- Positionnement relatif

### 6. DataLayer samples
- 5 premiers events capturés (JSON formaté)
- Analyse nomenclature

### 7. Requêtes réseau samples
- Top 10 requêtes tracking/analytics/media
- Analyse paramètres

---

## Transparence méthodologique

### Ce que l'outil vérifie automatiquement

1. Présence d'objets `window.*` (CMP, TMS, Analytics)
2. Structure dataLayer (nomenclature, types, schéma GA4)
3. Requêtes réseau (domaines, params, timing)
4. Paramètres Consent Mode v2 (`gcs`, `gcd`)
5. PageSpeed Insights scores (Performance, Accessibility, SEO)

### Ce que l'outil NE vérifie PAS automatiquement

1. Audit trail CMP (logs exportables) → 🔧 **Vérification manuelle requise**
2. Qualité du container GTM (tags dupliqués, naming) → 📦 **Upload container.json (Module E)**
3. Custom dimensions GA4 configurées → 📊 **Vérification Admin GA4**
4. Data retention policies → 🗂️ **Vérification Admin GA4**

### Pourquoi le mode assisté est obligatoire

L'auto-détection guide **où chercher**, mais ne remplace **jamais** la vérification technique. Exemple :

- L'outil détecte `window.didomi` → 5 pts "CMP détectée"
- L'outil capture 0 requête avant consent → +10 pts "Blocage pré-consent"
- **Mais** : l'outil ne peut pas vérifier si les logs sont exportables → 🔧 utilisateur doit tester API `didomi.getUserStatus()`

---

## Sources et références

1. **RGPD & CNIL**
   - [GDPR Cookie Audit Checklist 2026](https://www.consentscope.pro/blog/gdpr-cookie-audit-checklist)
   - [CookieChimp — How to Choose a CMP](https://cookiechimp.com/blog/how-to-choose-cookie-management-platform)

2. **Google Tag Manager**
   - [GA Auditor — GTM Audit Guide](https://www.gaauditor.com/blog/google-tag-manager-audit/)
   - [Phloz — GTM Container Audit Checklist](https://phloz.com/blog/gtm-container-audit-checklist)

3. **Google Analytics 4**
   - [GA4 Data Quality Scorecard](https://www.linkedin.com/pulse/ga4-data-quality-scorecard-ecommerce-saas-lead-gen-sites-margub-alam-j38oc)
   - [GA4 Auditor — 24 Checks 2026](https://ga4-auditor.dev/en/blog/features-testkatalog)

4. **DataLayer**
   - [TaggingDocs — DataLayer Naming Conventions](https://taggingdocs.com/datalayer/specification/naming-conventions/)
   - [DumbData — DataLayer Governance](https://dumbdata.co/post/datalayer-governance-practices-for-healthy-measurement/)

5. **Consent Mode v2**
   - [Snifflytics — Consent Mode v2 Audit Checklist](https://snifflytics.com/blog/ga4-consent-mode-v2-the-complete-audit-checklist-for-2026)
   - [CookieChimp — Consent Mode v2 Implementation Guide](https://cookiechimp.com/blog/google-consent-mode-v2-implementation-guide)

6. **PageSpeed Insights API**
   - [Google Developers — PageSpeed Insights API](https://developers.google.com/speed/docs/insights/rest)
   - [Unlighthouse — PageSpeed API Guide](https://unlighthouse.dev/learn-lighthouse/pagespeed-insights-api)

---

**Dernière révision** : 27 août 2026  
**Auteur** : Mohamed Atrari — Studio Jannah
