---
title: "Cross-domain SPA + CMP : pourquoi votre funnel affiche 11 étapes au lieu de 4"
description: "Virtual pageviews, consent delayed, history API — pastiche du blog sur les SPA qui gonflent les tunnels."
publishedAt: 2026-07-12
status: published
rubrique: mesure
format: text
hook: "Le produit voit 4 écrans. GA4 en voit 11. Les deux ont raison — et c’est exactement le problème."
tags: [spa, virtual-pages, cmp, fiction]
sources:
  - label: "Google — Measure single-page applications"
    url: "https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications"
  - label: "MDN — History API"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/History_API"
---

**Contenu fictif / illustratif.**

## Symptômes (marque placeholder *Glassfix*)

- Taux d’entrée step 2 > 100 % des step 1.
- Rebonds “étranges” après acceptation CMP.
- Double comptage à chaque `pushState`.

## Correctifs

1. Convention unique `virtual_page_view` (path + title).
2. Ne pas tracker le funnel avant consent analytics.
3. Dedup : un step = un event métier, pas un page_view par animation.

Studio Jannah instrumente les SPA comme des **produits**, avec contrat d’events versionné.
