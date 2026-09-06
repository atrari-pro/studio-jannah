---
title: "BigQuery export GA4 : raw data et schéma de tables"
description: "Comment est structuré l'export BigQuery GA4 — tables sharded, champs répétés, typage par colonne — et les pièges qui coûtent cher ou faussent le résultat."
publishedAt: 2026-09-06
status: published
categoryLabel: "GA4 & mesure produit"
type: "guide"
level: "expert"
tags: ["GA4", "BigQuery", "export", "SQL", "raw data"]
hook: "Le schéma réel des tables `events_*` exportées par GA4 vers BigQuery — champs répétés, typage par colonne, absence de backfill rétroactif — pour écrire une requête juste du premier coup plutôt que de découvrir un champ vide ou un coût de scan excessif après coup."
sources:
  - label: "Google Analytics Help — BigQuery Export overview"
    url: "https://support.google.com/analytics/answer/9358801"
  - label: "Google Analytics Help — BigQuery Export schema"
    url: "https://support.google.com/analytics/answer/7029846"
  - label: "Google Cloud — Standard SQL, arrays (BigQuery)"
    url: "https://cloud.google.com/bigquery/docs/reference/standard-sql/arrays"
  - label: "Google Cloud — BigQuery pricing"
    url: "https://cloud.google.com/bigquery/pricing"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/ga4/audit-ga4"
  - "tracking/ga4/custom-dimensions-metrics"
  - "tracking/datalayer/datalayer-ecommerce"
  - "tracking/datalayer/audit-datalayer"
---

## Le problème que ce guide résout

Les rapports standards et les explorations GA4 agrègent, échantillonnent au-delà d'un certain volume, et limitent la profondeur d'analyse ad hoc aux dimensions et metrics explicitement enregistrées. Le BigQuery Export contourne les trois limites à la fois : chaque event est exporté brut, ligne par ligne, avec l'intégralité des paramètres réellement poussés — **y compris ceux jamais enregistrés comme custom dimension dans l'Admin GA4** (voir [Custom dimensions et metrics GA4](/expertises/tracking/ga4/custom-dimensions-metrics)). C'est la seule vue vraiment complète et non retravaillée de ce que le site a réellement envoyé à GA4. Cette complétude a un prix : le schéma est structurellement différent d'une table SQL plate classique, et une requête écrite sans en tenir compte produit soit un résultat faux, soit un coût de scan disproportionné.

## La mécanique concrète

**Une table par jour, nommée `events_YYYYMMDD`.** Chaque jour de collecte produit sa propre table dans le dataset BigQuery lié à la propriété, un mécanisme documenté par l'[aperçu du BigQuery Export de Google](https://support.google.com/analytics/answer/9358801). Sur une propriété GA4 standard (gratuite), seul l'export **daily** (par lot, une fois par jour) est disponible ; l'export **streaming** (`events_intraday_YYYYMMDD`, alimenté en quasi temps réel) est réservé aux propriétés GA4 360. Interroger une seule table nommée explicitement ne couvre qu'un jour ; une analyse sur une période nécessite une table joker (`events_*`) filtrée sur le pseudo-champ `_TABLE_SUFFIX`.

**Une ligne par event, avec des champs répétés (`RECORD`, mode `REPEATED`) pour les structures variables.** Le [schéma officiel de l'export BigQuery GA4](https://support.google.com/analytics/answer/7029846) place `event_params` (les paramètres de l'event), `user_properties` et — pour les events e-commerce — `items` dans des colonnes de type `RECORD` répété : chaque event peut porter un nombre variable de paramètres ou d'articles, impossible à représenter dans des colonnes plates classiques. Lire ces champs impose un `UNNEST()`, l'opérateur Standard SQL documenté par [Google Cloud pour les tableaux](https://cloud.google.com/bigquery/docs/reference/standard-sql/arrays) — une jointure implicite qui déplie chaque entrée du tableau en une ligne distincte pour la durée de la requête.

**`event_params` est typé par colonne, pas par valeur unique.** Chaque paramètre d'event est représenté par une clé (`key`) et une structure `value` qui porte plusieurs colonnes typées en parallèle (`string_value`, `int_value`, `float_value`, `double_value`) — une seule est renseignée selon le type réel de la donnée poussée, les autres restent `NULL` pour cette ligne. Une requête qui lit systématiquement `string_value` pour un paramètre en réalité poussé en `int_value` récupère silencieusement `NULL`, pas une erreur.

**`items` reprend directement la structure de l'objet `ecommerce`/`items[]` du dataLayer.** Le mapping entre le [schéma dataLayer e-commerce](/expertises/tracking/datalayer/datalayer-ecommerce) et les colonnes de la table exportée est direct — `item_id`, `item_name`, `price`, `quantity`, `item_revenue`… — ce qui rend cette table le point de contrôle le plus fiable pour vérifier a posteriori qu'un item était correctement formé au moment de sa collecte, indépendamment de ce que les rapports d'interface en ont fait.

**`user_pseudo_id` identifie l'appareil/instance, `user_id` l'identifiant explicite s'il est défini.** Les deux colonnes coexistent sur chaque ligne ; `user_id` reste `NULL` tant qu'aucun identifiant applicatif n'a été explicitement assigné côté mesure (voir la stratégie User-ID, hors périmètre de ce guide) — confondre les deux dans une requête de comptage d'utilisateurs uniques produit un résultat différent selon lequel des deux est utilisé.

## Pièges connus

- **Aucun backfill rétroactif à l'activation du lien BigQuery.** L'export ne démarre qu'à partir de la date de création du lien dans l'Admin GA4 — aucune donnée antérieure n'est récupérable après coup, contrairement à une simple activation de rapport dans l'interface. Lier l'export tôt, même sans besoin d'analyse immédiat, évite de perdre cette fenêtre.
- **Interroger `events_*` sans filtre sur `_TABLE_SUFFIX`** scanne l'intégralité de l'historique disponible, avec un coût de requête proportionnel au volume total scanné — documenté par la [tarification BigQuery de Google Cloud](https://cloud.google.com/bigquery/pricing). Une analyse censée porter sur une semaine peut, par oubli de ce filtre, scanner des mois de données.
- **Oublier le `UNNEST()` sur `items` ou `event_params`** produit soit une erreur de syntaxe, soit — pire — une requête qui s'exécute mais compte les events une seule fois sans jamais accéder au détail des lignes d'articles ou de paramètres attendus.
- **Lire la mauvaise colonne typée dans `event_params.value`** (`string_value` au lieu de `int_value`, typiquement) — le résultat est silencieusement `NULL`, facilement confondu avec "le paramètre n'a jamais été envoyé" alors qu'il l'a été, mais sous un autre type.
- **Considérer l'export brut comme automatiquement conforme RGPD** parce qu'il vient de GA4 — l'export reprend exactement ce qui a été poussé côté dataLayer, y compris une donnée personnelle qui s'y serait glissée par erreur (paramètre libre mal alimenté). L'audit de discipline dataLayer (voir l'[Audit DataLayer](/expertises/tracking/datalayer/audit-datalayer)) reste un prérequis avant de lier l'export, pas une garantie acquise du seul fait de passer par GA4.

## Ce que Studio Jannah recommande

Lier le BigQuery Export dès la mise en production d'une propriété GA4, même sans besoin d'analyse immédiat — l'absence de backfill rend ce choix coûteux à corriger a posteriori, contrairement à la plupart des autres réglages de propriété. Systématiser le filtre `_TABLE_SUFFIX` (ou une vue/table partitionnée équivalente) dans tout gabarit de requête réutilisé par l'équipe, pour que le coût de scan reste maîtrisé par défaut plutôt que découvert sur la première facture BigQuery inhabituelle. Traiter l'audit de discipline dataLayer comme un prérequis à la liaison de l'export, pas comme un sujet séparé : toute donnée sensible mal captée côté site se retrouve intégralement, et durablement, dans l'historique exporté.
