---
title: "DataLayer e-commerce : le schéma GA4 items[]"
description: "Comment structurer l'objet ecommerce et items[] pour view_item, add_to_cart, purchase — et les pièges de dédup, currency et merge qui faussent le CA."
publishedAt: 2026-09-06
status: published
categoryLabel: "DataLayer"
type: "guide"
level: "avance"
tags: ["dataLayer", "e-commerce", "GA4", "items", "GTM"]
hook: "Le schéma exact de l'objet `ecommerce` et du tableau `items[]` attendu par GA4, avec les trois pièges qui faussent le plus souvent le chiffre d'affaires mesuré."
sources:
  - label: "Google — Measure ecommerce (Google Analytics 4)"
    url: "https://developers.google.com/analytics/devguides/collection/ga4/ecommerce"
  - label: "Google — Enhanced Ecommerce (migration & concepts dataLayer)"
    url: "https://developers.google.com/tag-platform/gtagjs/reference/events"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/datalayer/conventions-de-nommage"
  - "tracking/datalayer/plan-de-marquage"
  - "tracking/datalayer/audit-datalayer"
  - "tracking/datalayer/debug-datalayer"
---

## Le problème que ce schéma résout

L'e-commerce est la seule branche du dataLayer où une erreur de structure se traduit directement en chiffre d'affaires mal mesuré — pas en simple trou de reporting. Un `purchase` dupliqué gonfle le CA ; un `item_id` manquant casse la jointure catalogue en BigQuery export ; une `currency` incohérente entre deux events du même funnel fausse silencieusement la valeur agrégée. GA4 impose ici un schéma précis, documenté par [Google](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce), qui laisse peu de place à l'improvisation de nommage.

## La mécanique concrète : l'objet `ecommerce` et `items[]`

GA4 attend, pour chaque event e-commerce (`view_item`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `add_payment_info`, `purchase`…), un objet `ecommerce` poussé dans le dataLayer avec cette structure de base :

```js
dataLayer.push({
  event: "purchase",
  ecommerce: {
    transaction_id: "T12345",
    value: 89.90,
    tax: 8.90,
    shipping: 5.00,
    currency: "EUR",
    items: [
      {
        item_id: "SKU_001",
        item_name: "Produit démo — placeholder",
        item_category: "categorie-a",
        price: 84.90,
        quantity: 1
      }
    ]
  }
});
```

*(`item_name` ci-dessus est un exemple placeholder, pas un produit réel.)*

**Champs au niveau `ecommerce` (racine de l'événement) :**
- `currency` : obligatoire sur tout event portant de la valeur monétaire, cohérent sur l'ensemble d'un même funnel.
- `value` : la valeur totale de l'action (montant du panier, de la commande…), utilisée par GA4 pour le calcul de revenu.
- `transaction_id` : uniquement sur `purchase` (et `refund`) — c'est la clé de dédup métier.

**Champs par entrée du tableau `items[]` :**
- `item_id` et `item_name` : identifiants minimum, nécessaires à toute jointure catalogue ultérieure.
- `price`, `quantity` : nécessaires au calcul de valeur par ligne.
- `item_category` (et variantes `item_category2`…5`) : optionnels mais recommandés pour la segmentation catalogue en reporting.

**Point de mécanique important : `items[]` est repoussé en entier à chaque event.** GTM ne fusionne pas un nouvel objet `ecommerce` avec le précédent — si un event `add_to_cart` ne pousse qu'un item alors que le panier en contient trois, GA4 ne voit que l'item poussé à cet instant précis, pas l'état complet du panier. Chaque event e-commerce doit donc porter la donnée pertinente à l'action qu'il décrit, pas un cumul implicite.

## Pièges connus

- **`purchase` dupliqué au rechargement de la page de confirmation.** Sans garde-fou de dédup sur `transaction_id` (côté dataLayer ou côté tag GA4 dans GTM), un simple F5 sur la page de remerciement repousse un second `purchase` identique — le CA mesuré peut se retrouver gonflé de façon difficile à détecter sans audit ciblé.
- **`ecommerce` d'un event précédent qui pollue le suivant.** Sur certaines implémentations historiques (héritées de l'[Universal Analytics Enhanced Ecommerce](https://developers.google.com/tag-platform/gtagjs/reference/events)), il est recommandé de pousser `ecommerce: null` avant tout nouvel objet `ecommerce`, pour éviter qu'une lecture partielle du DL par un tag GTM ne mélange deux contextes successifs.
- **`currency` absent ou incohérent entre deux events du même funnel** — un `add_to_cart` en EUR suivi d'un `purchase` sans `currency` explicite (donc en devise par défaut de la propriété GA4) fausse silencieusement toute valeur agrégée multi-devises.
- **`item_id` manquant ou instable** (généré dynamiquement à chaque chargement au lieu de reprendre le SKU catalogue) — casse la jointure entre l'export BigQuery GA4 et le référentiel produit, rendant impossible tout calcul de marge par produit a posteriori.
- **Nom d'event non standard pour une action pourtant couverte par le schéma GA4** (`event: "achat"` au lieu de `event: "purchase"`) — désactive toute la reconnaissance automatique des rapports e-commerce GA4, qui se basent sur les noms d'events recommandés, pas sur une correspondance déclarée manuellement.

## Ce que Studio Jannah recommande

Spécifier le schéma `ecommerce`/`items[]` dans le plan de marquage avec un exemple concret par event (pas seulement la liste des clés), et recetter chaque event e-commerce en GA4 DebugView avant mise en prod — c'est le seul endroit où un `item_id` manquant ou une `currency` incohérente remonte visuellement, avant que l'écart n'atterrisse dans un export BigQuery. Sur un catalogue multi-devises ou multi-marques, documenter explicitement la règle de gestion de `currency` (devise unique par marché, jamais mélangée dans un même funnel) évite l'écart le plus difficile à détecter a posteriori.
