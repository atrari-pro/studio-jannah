# Design audit — Studio Jannah

Date : 2026-08-01 (ré-audit #2 — oublis + refs)  
Rôle : Brand & Design

## Oublis corrigés

| Oubli | Fix |
|-------|-----|
| Nav **mobile absente** (liens invisibles <860px) | Menu burger + overlay, Escape / fermeture au clic |
| Rail marques = **marquee générique** | Remplacé par `RefsStage` (spotlight + auto-rotate + picker) |
| Refs trop tôt / trop plates | Ordre home : Hero → Expertises → Missions → **Refs** → UC/Mag |
| Mag « à la une » trop étroit (bandeau vide) | Grid feature + feed côte à côte |
| Footer « CMP tarteaucitron · GTM-ready » | Retiré (trop technique pour le client) |
| Brands sans contexte | Champ `note` fictif par marque |
| `BrandRail.astro` mort | Supprimé |

## Refs dynamiques (différentes du rail)

- Une ref **mise en avant** (nom display, secteur, note)
- Progression + prev/next + pause
- Liste cliquable à droite (desktop)
- Auto-advance 4,5s, pause hover / reduced-motion
- Données depuis `brands[]` (remplaçables)

## Direction conservée

Éditorial atelier (listes Fabre), pas de cards SaaS, motion soft via `sj-motion`.

## Vérif

```bash
pnpm build:web
```
