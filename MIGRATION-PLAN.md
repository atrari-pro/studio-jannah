# Migration site_perso → github.dev

## ✅ Commit local sauvegardé
Commit: 69660ca - 42 fichiers

---

## 📋 Plan de migration (par groupe)

### Groupe 1 : Config centrale (3 fichiers) ⭐ COMMENCER ICI
**À copier en premier (impact sur tout le reste)**

1. `packages/shared/src/site.ts` 
   - Nav sans Use cases, rubriques Mag, tagline
   
2. `packages/shared/src/index.ts`
   - Exports magRubriques + types

3. `apps/web/src/content.config.ts`
   - Schéma Mag étendu (rubrique, format, video)

---

### Groupe 2 : Articles Mag (8 fichiers)
**Frontmatter avec rubrique + format**

Dans `apps/web/content/insights/` :
1. `attribution-zero-clic.md`
2. `consent-mode-green-red.md`
3. `ia-marketing-casse-tracking.md`
4. `metiers-digitaux-2027-mesure.md`
5. `moins-de-clics-plus-de-cro.md`
6. `serverside-musthave-produit.md`
7. `spa-cmp-funnel-gonfle.md`
8. `trafic-demain-mesure.md`

**Miroir** (même contenu) dans `content/insights/` : copie les 8 aussi

---

### Groupe 3 : Pages Mag (2 fichiers)
1. `apps/web/src/pages/mag/index.astro` → Catalogue dark + filtres
2. `apps/web/src/pages/mag/[slug].astro` → Lecteur vidéo

---

### Groupe 4 : Composants home (2 fichiers)
1. `apps/web/src/components/ContentBlocks.astro` → 3 cartes Mag sur home
2. `apps/web/src/components/CtaBand.astro` → CTA "Ouvrir le Mag"

---

### Groupe 5 : Navigation (2 fichiers)
1. `apps/web/src/components/SiteHeader.astro` → Nav 4 items
2. `apps/web/src/components/SiteFooter.astro` → Footer sans Use cases/App

---

### Groupe 6 : Pages use-cases/app (3 fichiers) - noindex
1. `apps/web/src/pages/use-cases/index.astro`
2. `apps/web/src/pages/use-cases/[slug].astro`
3. `apps/web/src/pages/app.astro`

---

### Groupe 7 : Autres pages (2 fichiers)
1. `apps/web/src/pages/index.astro` → Home
2. `apps/web/src/pages/a-propos.astro`

---

### Groupe 8 : Sitemap + Layout (2 fichiers)
1. `apps/web/src/pages/sitemap.xml.ts` → Sans /use-cases, /app
2. `apps/web/src/layouts/BaseLayout.astro` → Prop noindex

---

### Groupe 9 : Autres composants (6 fichiers)
1. `apps/web/src/components/Expertises.astro`
2. `apps/web/src/components/Missions.astro`
3. `apps/web/src/components/RefsStage.astro`
4. `apps/web/src/components/Signature.astro`
5. `apps/web/src/components/Method.astro`

---

### Groupe 10 : README + docs (3 fichiers)
1. `apps/web/content/README.md`
2. `content/placeholders.md`
3. `docs/TRACKING_DATALAYER.md`

---

### ❌ Fichier à SUPPRIMER sur GitHub
- `apps/web/src/components/Hero.astro` (n'existe plus)

---

## 🎯 Ordre recommandé

1. **Groupe 1** (config) → sinon les autres fichiers ne compileront pas
2. **Groupe 2** (articles) → contenu
3. **Groupe 3** (pages Mag) → catalogue
4. **Groupe 4-5** (home + nav) → façade
5. Reste

---

## 💡 Astuce github.dev

- Ouvre 2 fenêtres côte à côte : Cursor (local) + github.dev
- Copie-colle fichier par fichier
- Valide chaque groupe avant de passer au suivant
