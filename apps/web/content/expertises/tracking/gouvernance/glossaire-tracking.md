---
title: "Glossaire tracking : le vocabulaire commun"
description: "Découvrez le vocabulaire essentiel du tracking digital : dataLayer, GTM, GA4, Server-side Tagging, Consent Mode. Un guide pour harmoniser la communication."
publishedAt: 2026-09-06
status: published
categoryLabel: "Gouvernance & documentation"
type: "glossaire"
level: "fondamentaux"
tags: ["Tracking", "Gouvernance", "DataLayer", "GTM", "GA4", "Server-side", "Consentement", "Fondamentaux"]
hook: "Maîtrisez les termes clés du tracking pour aligner vos équipes techniques et marketing et optimiser vos stratégies de collecte de données."
sources:
  - label: "À propos des balises, déclencheurs et variables (GTM)"
    url: "https://support.google.com/tagmanager/answer/6103657"
  - label: "Événements GA4"
    url: "https://support.google.com/analytics/answer/9267735"
  - label: "Introduction au Server-side Tagging"
    url: "https://developers.google.com/tag-platform/tag-manager/server-side"
  - label: "Présentation du Consent Mode"
    url: "https://developers.google.com/tag-platform/security/guides/consent"
  - label: "Guide du développeur Google Tag Manager (dataLayer)"
    url: "https://developers.google.com/tag-platform/tag-manager/devguide"
relatedInsights: []
relatedUseCases: []
relatedExpertises: 
  - "tracking/datalayer/plan-de-marquage"
  - "tracking/datalayer/documentation-vivante"
  - "tracking/datalayer/conventions-de-nommage"
  - "tracking/gouvernance/onboarding-plan-marquage"
---

Un vocabulaire commun est la pierre angulaire d'une stratégie de tracking efficace. Ce glossaire vise à établir une compréhension partagée des termes fondamentaux du tracking digital, de la collecte de données à leur activation. Il est conçu pour aligner les équipes techniques, marketing et produit, garantissant une communication fluide et des implémentations précises.

## dataLayer
Le dataLayer est un objet JavaScript utilisé pour transmettre des informations de votre site web à Google Tag Manager (GTM). Il agit comme une couche de données structurée, permettant de centraliser et de standardiser les données à collecter, telles que les événements et les attributs utilisateurs. C'est la fondation d'une implémentation de tracking robuste et flexible, comme détaillé dans le [Guide du développeur Google Tag Manager](https://developers.google.com/tag-platform/tag-manager/devguide).

## Google Tag Manager (GTM)
GTM est un système de gestion de balises qui permet de déployer et de gérer des balises de suivi (tags) sur un site web ou une application mobile sans modifier le code source. Il simplifie l'ajout de codes de suivi pour l'analyse, le marketing et la personnalisation, en utilisant des [balises, déclencheurs et variables](https://support.google.com/tagmanager/answer/6103657).

## Google Analytics 4 (GA4)
GA4 est la dernière génération de Google Analytics, axée sur les événements et la mesure centrée sur l'utilisateur à travers les plateformes. Il offre une vision unifiée du parcours client et utilise un modèle de données flexible basé sur les [événements](https://support.google.com/analytics/answer/9267735) pour capturer toutes les interactions.

## Server-side Tagging (sGTM)
Le Server-side Tagging, ou sGTM, est une méthode de déploiement de balises où les requêtes de tracking sont d'abord envoyées à un conteneur GTM hébergé sur un serveur cloud, avant d'être distribuées aux fournisseurs tiers. Cette approche améliore la performance, la sécurité et le contrôle des données, comme expliqué dans l' [Introduction au Server-side Tagging](https://developers.google.com/tag-platform/tag-manager/server-side). Pour une compréhension approfondie de son architecture, consultez notre expertise sur [l'architecture client-serveur](/expertises/tracking/server-side/architecture-dispatch-client-serveur).

## Consent Mode
Le Consent Mode de Google est une fonctionnalité qui ajuste dynamiquement le comportement des balises Google (Analytics, Ads) en fonction du statut de consentement de l'utilisateur. Il permet de modéliser les conversions et le comportement des utilisateurs même en l'absence de consentement total, tout en respectant la vie privée, selon la [Présentation du Consent Mode](https://developers.google.com/tag-platform/security/guides/consent). Pour une implémentation optimale, explorez notre guide sur le [Consent Mode](/expertises/tracking/consentement/consent-mode-basique-avance).

## Événement (Event)
Un événement représente une interaction utilisateur ou une occurrence sur un site web ou une application. Dans GA4, tout est un événement, qu'il s'agisse d'un chargement de page, d'un clic ou d'une conversion. Chaque événement peut être accompagné de paramètres pour fournir un contexte supplémentaire.

## Paramètre (Parameter)
Un paramètre est une information descriptive associée à un événement, fournissant des détails contextuels. Par exemple, un événement `add_to_cart` pourrait avoir des paramètres comme `item_id`, `item_name` ou `value`. Ils enrichissent les données collectées et permettent des analyses plus granulaires.

## Variable (GTM)
Dans GTM, une variable est un espace réservé qui est résolu en une valeur lorsqu'une balise est déclenchée. Les variables peuvent extraire des informations du dataLayer, de l'URL, du DOM ou de cookies, et sont utilisées pour configurer les balises et les déclencheurs.

## Déclencheur (Trigger)
Un déclencheur est une condition qui détermine quand une balise doit se déclencher. Il écoute des événements spécifiques (chargement de page, clic, soumission de formulaire, événement dataLayer personnalisé) et exécute les balises associées lorsque ses conditions sont remplies.

## Balise (Tag)
Une balise est un extrait de code JavaScript ou HTML qui envoie des données à un système tiers (comme Google Analytics, Google Ads, ou un outil de marketing automation). Dans GTM, une balise est configurée pour se déclencher sous certaines conditions définies par les déclencheurs.

## Client (sGTM)
Dans le contexte du Server-side Tagging, un Client est un type de ressource GTM qui reçoit les requêtes HTTP entrantes du navigateur de l'utilisateur. Il est responsable de l'interprétation de ces requêtes et de la conversion des données brutes en un format utilisable par les balises server-side.

## Conteneur (GTM/sGTM)
Un conteneur est l'environnement principal dans Google Tag Manager (web ou server-side) où sont configurées et gérées les balises, déclencheurs et variables. Il encapsule toutes les configurations de tracking pour un site web ou un ensemble de propriétés.

## Dimension personnalisée (Custom Dimension)
Une Custom Dimension est un type de données personnalisées que vous pouvez envoyer à Google Analytics pour catégoriser vos données d'une manière qui n'est pas couverte par les dimensions standard. Elle permet d'analyser des attributs spécifiques à votre activité, comme le type d'utilisateur ou le statut d'abonnement. Pour optimiser leur utilisation, consultez notre guide sur les [dimensions et métriques personnalisées](/expertises/tracking/ga4/custom-dimensions-metrics).

## Métrique personnalisée (Custom Metric)
Une Custom Metric est un type de données numériques personnalisées envoyées à Google Analytics pour mesurer des quantités spécifiques à votre activité. Contrairement aux dimensions, les métriques sont des valeurs quantifiables, telles que le nombre de produits vus ou le temps passé sur un élément interactif. Pour une implémentation correcte, référez-vous à notre expertise sur les [dimensions et métriques personnalisées](/expertises/tracking/ga4/custom-dimensions-metrics).

## BigQuery
BigQuery est un entrepôt de données cloud entièrement géré et sans serveur de Google, conçu pour l'analyse de très grands ensembles de données. Il est souvent utilisé avec GA4 pour exporter les données brutes et effectuer des analyses avancées, des jointures avec d'autres sources ou des modélisations complexes. Apprenez-en plus sur [l'export BigQuery de GA4](/expertises/tracking/ga4/bigquery-export-ga4).

## Ce que Studio Jannah recommande
Studio Jannah insiste sur l'importance d'un vocabulaire de tracking unifié pour toute organisation. Pour cela, nous recommandons :
*   **L'établissement d'un plan de marquage** clair et détaillé, servant de référence pour tous les termes et conventions. Découvrez comment construire un [plan de marquage efficace](/expertises/tracking/datalayer/plan-de-marquage).
*   **La documentation vivante du dataLayer**, assurant que les définitions et les schémas de données sont toujours à jour et accessibles. Pour en savoir plus, consultez notre expertise sur la [documentation vivante](/expertises/tracking/datalayer/documentation-vivante).
*   **Des sessions de formation régulières** pour les équipes techniques et marketing afin de maintenir une compréhension commune et d'intégrer les évolutions du secteur.
*   **L'utilisation systématique de conventions de nommage** pour les événements et paramètres, garantissant cohérence et facilité d'analyse. Approfondissez le sujet avec notre article sur les [conventions de nommage](/expertises/tracking/datalayer/conventions-de-nommage).
