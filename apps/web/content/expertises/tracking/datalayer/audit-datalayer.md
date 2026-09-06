---
title: "Audit DataLayer : la checklist avant toute recette"
description: "28 critères de contrôle pass/fail pour auditer un dataLayer avant recette GTM — structure, naming, events, e-commerce, consentement, documentation."
publishedAt: 2026-09-06
status: published
categoryLabel: "DataLayer"
type: "audit"
level: "fondamentaux"
tags: ["dataLayer", "GTM", "audit", "QA", "recette"]
hook: "Une checklist à parcourir ligne par ligne avant toute mise en prod — chaque critère se coche pass ou fail dans les DevTools ou le GTM Preview mode, sans place pour l'à-peu-près."
sources:
  - label: "Google — Data Layer (Tag Manager Developer Guide)"
    url: "https://developers.google.com/tag-platform/tag-manager/datalayer"
  - label: "Simo Ahava — A Simple Guide to the Google Tag Manager Data Layer"
    url: "https://www.simoahava.com/analytics/data-layer/"
  - label: "Google — Tag Assistant"
    url: "https://tagassistant.google.com/"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/datalayer/plan-de-marquage"
  - "tracking/datalayer/conventions-de-nommage"
  - "tracking/datalayer/debug-datalayer"
  - "tracking/datalayer/datalayer-ecommerce"
---

## Comment utiliser cette checklist

Chaque ligne est un critère vérifiable en quelques minutes, dans la console DevTools ou le GTM Preview mode — pas une généralité de bonne pratique. Un critère non coché **fail** bloque la recette tant qu'il n'est pas corrigé ou explicitement accepté comme risque connu. La checklist suit l'ordre réel d'un audit : structure du tableau, schéma commun aux events, events métier, e-commerce (si applicable), consentement, puis documentation.

## 1. Structure du dataLayer

- [ ] **Un seul `window.dataLayer`, jamais réassigné.** `window.dataLayer = window.dataLayer || []` (ou équivalent) dans le premier script qui s'exécute — un second script qui fait `window.dataLayer = []` écrase tout ce qui a été poussé avant lui, contrairement au mécanisme d'initialisation décrit dans la [documentation officielle Data Layer de Google](https://developers.google.com/tag-platform/tag-manager/datalayer). Vérifier dans Sources (DevTools) qu'aucun script ne réassigne le tableau après le premier appel.
- [ ] **Le tableau est déclaré avant tout autre script de mesure.** Le loader dataLayer (ou son équivalent maison) doit s'exécuter en tout premier dans le `<head>`, avant GTM lui-même et avant tout script tiers qui pourrait pousser un event trop tôt.
- [ ] **Aucun objet non conforme au schéma commun n'est poussé** (ex. file d'attente interne exposée telle quelle dans le DL — un `sj_event_queued` ou équivalent est un signal de queue interne mal isolée, pas un event métier).
- [ ] **`dataLayer.push` n'est jamais surchargé de façon destructive** par un script tiers (tag manager concurrent, plugin CMS) — vérifier qu'un seul mécanisme pousse dans le tableau.

## 2. Schéma commun aux events

- [ ] **Chaque event métier porte `event`** avec un nom stable, documenté dans le plan de marquage.
- [ ] **`event_id` présent et unique par event** (UUID ou équivalent) — sert de clé de dédup si un event est repoussé par erreur (retry réseau, double binding sur un CTA), une pratique détaillée dans le [guide de Simo Ahava sur le dataLayer GTM](https://www.simoahava.com/analytics/data-layer/).
- [ ] **`event_ts` présent** (timestamp epoch ms) — permet de trier les events hors ordre d'arrivée réseau côté serveur si SGTM est en jeu.
- [ ] **`schema_version` présent et cohérent avec le plan de marquage documenté** — toute divergence entre la version annoncée dans la doc et celle réellement poussée en prod est un fail immédiat.
- [ ] **Les clés du DL sont strictement identiques (casse, orthographe) aux variables GTM qui les lisent.** `page_type` ≠ `pageType` ≠ `Page_Type` — une variable DL mal orientée dans GTM ne renvoie pas d'erreur, elle renvoie `undefined` silencieusement.

## 3. Events métier

- [ ] **`page_view` est le nom standard GA4**, jamais renommé en `sj_page_view` ou variante maison (le nom standard matche directement l'event recommandé Google, sans Custom Event trigger générique à recréer).
- [ ] **Le reste des events métier custom est namespacé** (préfixe cohérent type `sj_*`), pour ne jamais entrer en collision avec un event standard GA4 ou un event auto-collecté par Enhanced Measurement.
- [ ] **Dédup de `page_view` vérifiée** : naviguer deux fois sur la même URL (retour arrière, refresh) ne doit pas produire deux `page_view` pour la même vue si la logique de dédup l'exclut explicitement.
- [ ] **Aucun event auto-collecté GA4 (scroll, click, file_download, video…) n'est redupliqué manuellement dans le dataLayer** — si Enhanced Measurement le couvre déjà côté propriété GA4, un event maison équivalent est redondant, pas un plus.
- [ ] **Les CTA suivent une convention de nommage stable et documentée** (ex. `zone_objet_action`) — un id de CTA généré dynamiquement ou incohérent entre deux pages casse tout reporting par zone.
- [ ] **Chaque event déclaré dans le plan de marquage est effectivement observable en Preview/DevTools** — un event documenté mais jamais poussé en réalité est aussi grave qu'un event non documenté.

## 4. E-commerce (si applicable)

- [ ] **Le tableau `items[]` est poussé en entier à chaque event** (`view_item`, `add_to_cart`, `purchase`…), pas fusionné implicitement avec un push précédent — GTM ne fait pas de merge automatique entre deux objets `ecommerce` successifs.
- [ ] **`currency` est présent à la racine de l'objet `ecommerce`**, cohérent sur tous les events du même parcours (pas de bascule EUR/USD non justifiée dans un même funnel).
- [ ] **Chaque `item` porte au minimum `item_id` et `item_name`** — un item sans identifiant stable casse la jointure catalogue côté BigQuery export.
- [ ] **`transaction_id` est unique par commande et sert de clé de dédup sur `purchase`** — un rechargement de la page de confirmation ne doit pas repousser un second `purchase` avec le même `transaction_id` sans garde-fou.
- [ ] **`ecommerce: null` (ou équivalent) est poussé avant tout nouvel event ecommerce** pour éviter qu'un ancien objet `ecommerce` ne pollue le contexte du prochain push (pratique documentée par Google sur les guides Enhanced Ecommerce historiques, toujours valable en dataLayer v2/GA4).

## 5. Consentement & CMP

- [ ] **Aucun tag de mesure ne se déclenche avant l'initialisation de la CMP** — vérifier en navigation privée, sans cookie de consentement préalable, qu'aucun hit GA4 ne part avant le premier choix utilisateur.
- [ ] **L'event de mise à jour du consentement porte le statut de chaque catégorie CMP déclarée**, pas uniquement un flag `analytics` global — une catégorie ajoutée côté CMP doit apparaître automatiquement dans l'event sans redéploiement du contrat dataLayer.
- [ ] **La distinction entre premier choix, revisite et modification volontaire est portée par l'event** (ex. une clé `consent_trigger` avec valeurs distinctes) — nécessaire pour calculer un vrai taux d'acceptation au lieu d'un flag figé.
- [ ] **La queue interne pré-consentement flushe les vrais events une fois l'opt-in obtenu**, elle ne les remplace pas par un event de type "queued" qui polluerait le DL.

## 6. Documentation & environnements

- [ ] **Le plan de marquage documente `schema_version` et l'historique des changements** — un changement de schéma sans entrée de changelog est un fail, même si la mise en prod technique fonctionne.
- [ ] **Chaque environnement (dev, préprod, prod) pousse le même schéma** — une divergence de nommage entre préprod et prod invalide toute recette faite en préprod.
- [ ] **Les variables DL supprimées ou renommées sont documentées comme telles**, avec la date de bascule — une variable GTM qui pointe vers une clé retirée du contrat continue de vivre silencieusement dans le conteneur sans jamais remonter d'erreur.
- [ ] **Un outil d'audit externe ([Tag Assistant](https://tagassistant.google.com/), ou équivalent) confirme la même lecture que le GTM Preview mode** — croiser les deux évite qu'un biais de configuration locale (extension, cache) fausse la recette.

## Ce que Studio Jannah recommande

Cette checklist se rejoue à trois moments : avant une mise en prod (recette bloquante), après toute refonte front majeure (les scripts qui poussent dans le DL bougent souvent sans que personne ne pense au tracking), et en routine trimestrielle sur un site vivant. Le seul critère qui justifie de passer un "fail" en prod malgré tout est un risque documenté et accepté explicitement par l'équipe — jamais un oubli silencieux.
