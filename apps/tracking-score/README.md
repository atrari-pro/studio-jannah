# Studio Jannah Tracking Score

**Statut** : v0.3 — **Audit professionnel niveau agence** ✅

## Objectif

**Outil d'audit tracking web complet** avec scoring transparent basé sur les standards métier 2026 (RGPD, CNIL, Google, IAB TCF v2.3).

Fournit un **rapport d'audit détaillé** avec scores par module, tests comportementaux, recommandations priorisées, et intégration PageSpeed Insights.

## Documentation de référence

### Méthodologie de scoring
→ **`docs/SCORING-METHODOLOGY.md`** — Grille complète avec références métier officielles

### Méthodes de détection
→ **`docs/DETECTION-METHODS.md`** — Detection techniques pour chaque outil (CMP, TMS, Analytics, etc.)

### Cahier des charges
→ **`docs/tracking-score/CAHIER-DES-CHARGES.md`** — Spécifications complètes

## Grille de scoring (120 points)

| Module | Points | Critères |
|--------|--------|----------|
| **CMP** | 30 | Conformité RGPD, blocage pré-consent, Consent Mode v2, audit trail |
| **TMS** | 20 | Gouvernance tags, container ID, respect consentement |
| **Analytics** | 25 | Qualité données GA4, events recommandés, paramètres complets |
| **DataLayer** | 25 | Nomenclature snake_case, structure e-commerce, préfixes custom |
| **Performance** | 20 | PageSpeed Insights (Performance, Accessibility, SEO, Best Practices) |
| **Bonus Consent Mode v2** | 10 | 4 paramètres v2 (ad_storage, analytics_storage, ad_user_data, ad_personalization) |

### Niveaux de qualité

| Score | Niveau | Description |
|-------|--------|-------------|
| 100-120 | 🏆 Excellence | Prêt pour audit externe |
| 80-99 | ✅ Production | Quelques optimisations mineures |
| 60-79 | ⚠️ Moyen | Corrections requises |
| 40-59 | ❌ Faible | Refonte partielle nécessaire |
| 0-39 | 🚨 Critique | Refonte complète + risque juridique |

## Architecture v0.3

```
apps/tracking-score/
├── electron/                    # Electron main process
│   ├── main.ts                 # Entry point + IPC handlers
│   ├── preload.ts              # IPC bridge (CommonJS)
│   ├── playwright-controller.ts # Scanner Playwright + détection
│   ├── scoring.ts              # ⭐ Modules de scoring professionnels
│   ├── pagespeed.ts            # ⭐ Intégration PageSpeed Insights API
│   └── types.ts                # Types backend
├── src/                        # React dashboard
│   ├── components/             
│   │   ├── DataLayerTable.tsx  # Tableau events dataLayer
│   │   ├── NetworkTable.tsx    # Tableau requêtes réseau
│   │   ├── ToolCard.tsx        # Card outil détecté
│   │   └── AuditReport.tsx     # ⭐ Rapport d'audit complet
│   ├── types/                  
│   │   ├── scan.ts             # ⭐ Types CompleteScanReport
│   │   └── electron.d.ts       # API Electron
│   ├── App.tsx                 # Dashboard principal
│   ├── App.css                 # Styles professionnels
│   └── main.tsx                # Entry point React
├── docs/                       
│   ├── SCORING-METHODOLOGY.md  # ⭐ Grille scoring + références métier
│   └── DETECTION-METHODS.md    # Techniques détection par outil
├── package.json
└── README.md                   # Ce fichier
```

## Stack technique

- **App desktop** : Electron 34
- **Scan** : Playwright (headed — navigateur visible)
- **Dashboard** : React 18 + Vite 6
- **Types** : TypeScript strict
- **Communication** : IPC (Electron)
- **Design** : CSS custom (grilles, animations, responsive)
- **APIs externes** : PageSpeed Insights (gratuite, 25k requêtes/jour)

## Fonctionnalités v0.3

### ✅ Détection automatique complète (18 outils)

- **CMP** (5) : Didomi, Axeptio, Cookiebot, Tarteaucitron, OneTrust
- **TMS** (2) : Google Tag Manager, Adobe Launch
- **Analytics** (2) : Google Analytics 4, Adobe Analytics
- **Attribution** (4) : Adjust, AppsFlyer, Branch, Kochava
- **A/B Testing** (5) : Optimizely, VWO, Google Optimize, AB Tasty, Kameleoon

Chaque outil détecté affiche un lien vers sa documentation officielle.

### ✅ Scoring professionnel transparent

**Module A — CMP (30 pts)**
- Détection CMP (5 pts auto)
- Blocage pré-consentement (10 pts — capture requêtes <3s)
- Choix granulaire Accepter/Refuser (5 pts manuel)
- Audit trail logs (5 pts manuel)
- Consent Mode v2 intégré (5 pts auto)

**Module B1 — TMS (20 pts)**
- Détection TMS (5 pts auto)
- Container ID identifié (5 pts auto — GTM-XXXXXX)
- Tags respectent consentement (5 pts auto)
- Pas de tags dupliqués (3 pts manuel — upload container.json)
- Naming conventions (2 pts manuel)

**Module B2 — Analytics (25 pts)**
- Détection Analytics (5 pts auto)
- Property/Measurement ID (5 pts auto — G-XXXXXXXX)
- Events GA4 recommandés présents (5 pts auto)
- Paramètres requis complets (5 pts auto — transaction_id, value, etc.)
- Pas de duplicate pageview (3 pts auto)
- Consent Mode v2 configuré GA4 Admin (2 pts manuel)

**Module C — DataLayer (25 pts)**
- DataLayer initialisé (5 pts auto)
- Nomenclature snake_case (5 pts auto — regex validation)
- Event names descriptifs (5 pts auto — détection génériques)
- Structure e-commerce GA4 (5 pts auto — ecommerce.items[])
- Reset ecommerce null avant push (3 pts manuel)
- Préfixe custom events (2 pts auto)

**Module D — Performance (20 pts)**
- Performance score > 90 (8 pts — PageSpeed Insights API)
- Accessibilité > 90 (4 pts)
- SEO > 90 (4 pts)
- Best Practices > 90 (4 pts)

**Bonus — Consent Mode v2 (10 pts)**
- 4 paramètres v2 détectés (3 pts auto)
- Default = denied avant banner (3 pts manuel)
- Update après consentement (2 pts manuel — paramètres gcs/gcd)
- GA4 Admin confirme signaux (2 pts manuel)

### ✅ Tests comportementaux

**Test 1 : Blocage pré-consentement**
- Capture toutes les requêtes tracking/analytics/ads dans les 3 premières secondes
- Status : PASS (0 requête) ou FAIL (≥1 requête) → **VIOLATION RGPD**
- Affiche domaines en violation

**Test 2 : Respect refus consentement** (manuel)
- Vérification que tags ne fire pas après "Refuser tout"

**Test 3-4 : Consent Mode v2** (manuel)
- Vérification paramètres `gcs`/`gcd` dans requêtes Google
- `gcs=G100` = denied, `gcs=G111` = granted

### ✅ Rapport d'audit complet

**1. Synthèse exécutive**
- Score global circulaire (0-120 pts)
- Niveau de qualité (Excellence → Critique)
- Durée du scan

**2. Scores détaillés par module**
- Progress bar + pourcentage
- Liste des critères (✅ pass, ❌ fail, ⚠️ partial, 🔧 manual)
- Raison détaillée pour chaque critère

**3. Tests comportementaux**
- Status pass/fail pour chaque test
- Domaines en violation affichés
- Instructions pour tests manuels

**4. Recommandations priorisées**
- **P0 (Critique)** : Violations RGPD, invalidité données — rouge vif
- **P1 (Haute)** : Impact métier direct (revenue, compliance) — orange
- **P2 (Moyenne)** : Maintenabilité, gouvernance — jaune
- **P3 (Basse)** : Optimisations mineures — gris

Chaque recommandation inclut :
- Description du problème
- Impact business
- Action corrective précise

**5. PageSpeed Insights**
- 4 scores Lighthouse (Performance, Accessibility, SEO, Best Practices)
- Couleur verte (>90), orange (50-90), rouge (<50)

**6. Export JSON**
- Rapport complet téléchargeable

## Installation et test

### Prérequis
- Node.js >= 22
- pnpm
- Chromium Playwright (installé automatiquement)

### Installation (première fois)

```bash
cd apps/tracking-score

# Sur Mac EY (Zscaler) :
NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm install --force
NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright install chromium

# Sur autre machine :
pnpm install
npx playwright install chromium
```

### Lancer en dev

```bash
cd apps/tracking-score
pnpm dev
```

Cela lance :
1. Vite (React dashboard) sur http://localhost:5174
2. Electron (fenêtre app desktop)

### Workflow complet

1. **Colle une URL** (ex: https://www.leboncoin.fr)
2. **Clique "🚀 Lancer l'analyse"**
   - Un navigateur Chromium s'ouvre
   - Dashboard affiche détections en temps réel
3. **Navigue sur le site** (accepte/refuse cookies, scroll, clics...)
4. **Marque l'état consentement** (boutons "J'ai accepté/refusé")
5. **Clique "🎯 Terminer l'analyse et générer le rapport"**
   - Appel PageSpeed Insights API (30-60s)
   - Calcul des scores
   - Génération recommandations
6. **Explore le rapport d'audit professionnel** 📊
7. **Exporte en JSON** si besoin
8. **Ferme manuellement le navigateur Chromium**
9. **Clique "🔄 Nouvelle analyse"**

### Sites de test recommandés

| Site | CMP | TMS | Analytics | Score estimé | Intérêt |
|------|-----|-----|-----------|--------------|---------|
| leboncoin.fr | Didomi | GTM | GA4 | 80-95 | Setup classique FR, bien configuré |
| leparisien.fr | Didomi | — | — | 60-75 | CMP + analytics complexe |
| liberation.fr | Axeptio | — | — | 55-70 | CMP FR alternatif |
| fnac.com | — | GTM | GA4 | 75-90 | E-commerce + dataLayer riche |
| localhost:4321 | Tarteaucitron | — | — | Variable | Ton propre site |

## Ce qui marche (v0.3)

- ✅ **Scoring professionnel complet** (120 pts avec formule transparente)
- ✅ **Détection automatique 18 outils** avec extraction IDs (GTM-XXX, G-XXX)
- ✅ **PageSpeed Insights API** (4 scores Lighthouse)
- ✅ **Tests comportementaux** (blocage pré-consent avec domaines violants)
- ✅ **Recommandations priorisées** P0/P1/P2/P3 avec actions correctives
- ✅ **Rapport d'audit complet** (UI professionnelle + export JSON)
- ✅ **Catégorisation automatique** events dataLayer (6 catégories)
- ✅ **Parsing params URL** requêtes réseau
- ✅ **Nomenclature snake_case** validation regex
- ✅ **Duplicate pageview** détection
- ✅ **Consent Mode v2** détection (4 paramètres)
- ✅ **Documentation méthodologie** avec références métier 2026

## Ce qui ne marche pas encore

- ❌ **Tests CMP automatiques** (clic Accepter/Refuser via Playwright)
- ❌ **Vérification Consent Mode v2 complète** (paramètres gcs/gcd dans network)
- ❌ **Détection media pixels** (Meta, TikTok, LinkedIn, Pinterest, Google Ads)
- ❌ **Mode assisté** (override manuel des détections + relance analyse)
- ❌ **Module E — GTM container upload** (analyse config JSON)
- ❌ **Rapport LLM** (résumé en français via Gemini/Claude)
- ❌ **Fichiers de règles externalisés** (detection-rules/*.json)
- ❌ **Build Electron** (packaging .app/.exe)
- ❌ **Fermeture auto navigateur** après analyse

## Problèmes connus

1. **Navigateur ne se ferme pas auto** : Fermer manuellement après chaque analyse
2. **Multiple analyses sans fermer navigateur** : Peut bugger, fermer entre chaque test
3. **Pas de validation URL** : Mettre une URL valide sinon crash
4. **Zscaler proxy sur Mac EY** : Utiliser `NODE_TLS_REJECT_UNAUTHORIZED=0`
5. **PageSpeed Insights peut timeout** : Si API surchargée, réessayer

## Prochaines étapes (v0.4)

1. **Tests CMP automatiques** (Consent Mode v2 vérification complète)
2. **Détection media pixels** (Meta, Google Ads, TikTok, LinkedIn, Pinterest)
3. **Mode assisté complet** (override + relance)
4. **Rapport LLM** (résumé en français)
5. **Module E — GTM container upload**
6. **Build packaging** (Electron Builder)

## Validation métier requise avant prod

Voir section 8 du cahier des charges — 13 points à valider avec Mohamed Atrari :
- Barèmes acceptables
- Pénalités justes
- Recommandations actionnables
- Clarté rapport pour clients
- Compliance juridique affichage

## Notes pour développeurs

- **Ne pas** deviner les règles — tout est dans `SCORING-METHODOLOGY.md`
- **Chaque point** doit être justifié par une référence métier officielle
- **Mode assisté obligatoire** pour chaque auto-détection (à implémenter)
- **Transparence absolue** : afficher formule calcul + références sources
- **Respecter les principes directeurs** (section 0 du cahier des charges)

## Debug

### App ne démarre pas
```bash
lsof -ti:5174 | xargs kill -9
pnpm install --force
npm run compile
pnpm dev
```

### Navigateur ne s'ouvre pas
```bash
npx playwright install --with-deps chromium
# Sur Mac EY
NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright install chromium
```

### PageSpeed Insights échoue
- Vérifier connexion internet
- L'API est gratuite mais limitée (25k/jour)
- En cas d'échec, le score Performance = 0 (module continue)

### Détections manquantes
- Consulter `docs/DETECTION-METHODS.md`
- Ouvrir console navigateur Chromium et tester manuellement
- Certains outils chargent après consentement

## License

Privé — Studio Jannah / Mohamed Atrari
