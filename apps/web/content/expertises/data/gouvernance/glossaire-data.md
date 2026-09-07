---
title: "Glossaire data : le vocabulaire commun"
description: "Un glossaire essentiel pour comprendre les termes clés de la data, du tracking et de la gouvernance."
publishedAt: 2026-09-07
status: published
categoryLabel: "Gouvernance data"
type: "glossaire"
level: "fondamentaux"
tags: ["glossaire", "data", "vocabulaire", "définitions", "fondamentaux", "tracking", "gouvernance"]
hook: "Apprenez le vocabulaire fondamental de la data pour mieux communiquer et collaborer sur vos projets."
sources:
  - label: "CNIL - Glossaire"
    url: "https://www.cnil.fr/fr/glossaire"
  - label: "Google Analytics - Glossaire"
    url: "https://support.google.com/analytics/?page=glossary.html"
  - label: "W3C - Data Catalog Vocabulary (DCAT)"
    url: "https://www.w3.org/TR/vocab-dcat-2/"
  - label: "Gartner - IT Glossary"
    url: "https://www.gartner.com/en/information-technology/glossary"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "data/gouvernance/rgpd-data-marketing"
  - "data/gouvernance/data-contracts"
  - "data/integration/cdp-quand-pourquoi"
  - "tracking/datalayer/plan-de-marquage"
---

Le monde de la data est riche en concepts et en terminologies spécifiques. Ce glossaire vise à fournir des définitions claires et concises des termes les plus couramment utilisés en data, tracking et gouvernance, afin de faciliter la compréhension et la communication au sein des équipes.

## Attribution
Processus d'identification et d'évaluation des points de contact marketing qui ont contribué à une conversion. Il aide à comprendre l'efficacité des différents canaux et campagnes. Des modèles variés existent, du "dernier clic" au "multi-touch".

## BigQuery
Entrepôt de données (data warehouse) sans serveur, hautement scalable et économique, proposé par Google Cloud. Il permet d'analyser de très grands volumes de données en utilisant des requêtes SQL. C'est un outil central pour l'export [BigQuery Export de GA4](/expertises/tracking/ga4/bigquery-export-ga4).

## CDP (Customer Data Platform)
Plateforme logicielle qui unifie les données clients provenant de diverses sources pour créer un profil client unique et persistant. Elle est utilisée pour l'analyse, la segmentation et l'activation marketing. Pour en savoir plus, consultez notre guide sur les [CDP](/expertises/data/integration/cdp-quand-pourquoi).

## Consent Mode
Fonctionnalité de Google qui ajuste le comportement des balises Google (Analytics, Ads) en fonction du statut de consentement de l'utilisateur. Il permet de collecter des données agrégées et modélisées même en cas de refus de consentement. Explorez notre expertise sur le [Consent Mode basique et avancé](/expertises/tracking/consentement/consent-mode-basique-avance).

## Data Contract
Accord formel entre équipes productrices et consommatrices de données, définissant la structure, la qualité, la livraison et la gouvernance des données échangées. Il assure la fiabilité et la cohérence des flux. Pour une approche détaillée, lisez notre article sur les [Data contracts entre équipes](/expertises/data/gouvernance/data-contracts).

## DataLayer
Objet JavaScript sur une page web qui contient les données que vous souhaitez transmettre à des outils de tracking ou d'analyse. Il sert d'interface standardisée entre le site et le Tag Management System (TMS). Le [plan de marquage](/expertises/tracking/datalayer/plan-de-marquage) en est la spécification.

## Data Governance
Ensemble des processus, politiques, rôles et responsabilités qui garantissent que les données sont gérées comme un actif stratégique, comme le définit le [glossaire IT de Gartner](https://www.gartner.com/en/information-technology/glossary). Elle vise à améliorer la qualité, la sécurité, la conformité et l'accessibilité des données.

## Data Lake
Un référentiel centralisé qui permet de stocker de grandes quantités de données brutes, structurées et non structurées, à l'échelle. Les données sont stockées dans leur format natif et peuvent être traitées ultérieurement ; leur inventaire suit souvent un vocabulaire de catalogue normalisé comme [DCAT du W3C](https://www.w3.org/TR/vocab-dcat-2/).

## Data Warehouse
Base de données optimisée pour l'analyse et le reporting, qui agrège et structure des données provenant de diverses sources opérationnelles. Il est conçu pour supporter des requêtes complexes et des analyses historiques.

## ETL / ELT
Processus de gestion de données :
*   **ETL (Extract, Transform, Load)** : Les données sont extraites d'une source, transformées (nettoyage, enrichissement) puis chargées dans une destination.
*   **ELT (Extract, Load, Transform)** : Les données sont extraites et chargées directement dans la destination (souvent un Data Lake ou Data Warehouse), puis transformées sur place. Pour plus de détails, voir [ETL et Reverse ETL](/expertises/data/integration/etl-reverse-etl).

## GA4 (Google Analytics 4)
La dernière génération de Google Analytics, axée sur les événements et l'utilisateur, dont [Google détaille les termes clés](https://support.google.com/analytics/?page=glossary.html) dans son propre glossaire. Elle offre une vision unifiée du parcours client sur les applications et le web, avec des capacités d'analyse prédictive. Un [audit GA4](/expertises/tracking/ga4/audit-ga4) est souvent nécessaire.

## GTM (Google Tag Manager)
Système de gestion de balises (Tag Management System) qui permet de déployer et de gérer facilement des balises marketing et analytiques sur un site web ou une application mobile, sans modifier le code source. L' [architecture de conteneur GTM](/expertises/tracking/gtm/architecture-conteneur) est un sujet clé.

## KPI (Key Performance Indicator)
Indicateur clé de performance. Mesure quantifiable utilisée pour évaluer le succès d'une organisation, d'un projet ou d'une activité spécifique par rapport à ses objectifs. Il est crucial de distinguer les [KPI des vanity metrics](/expertises/data/reporting/kpis-vs-vanity-metrics).

## RGPD (Règlement Général sur la Protection des Données)
Règlement européen qui encadre le traitement des données personnelles et renforce les droits des citoyens de l'UE en matière de protection de leurs données, dont la CNIL propose son propre [glossaire de référence](https://www.cnil.fr/fr/glossaire). Il impose des obligations strictes aux organisations. Notre guide sur le [RGPD et data marketing](/expertises/data/gouvernance/rgpd-data-marketing) approfondit ce sujet.

## Server-side Tagging (SGTM)
Méthode de déploiement des balises où une partie du traitement des données est déplacée du navigateur de l'utilisateur vers un serveur cloud. Cela améliore la performance, la sécurité et la conformité. Découvrez l' [architecture du Server-side Tagging](/expertises/tracking/server-side/architecture-dispatch-client-serveur).

## SLA (Service Level Agreement)
Accord de niveau de service. Contrat qui définit les niveaux de service attendus d'un fournisseur par un client, notamment en termes de disponibilité, de performance et de support. En data, il s'applique à la fraîcheur et la qualité des données.

## SQL (Structured Query Language)
Langage standardisé utilisé pour gérer et manipuler des bases de données relationnelles. Il permet d'interroger, d'insérer, de mettre à jour et de supprimer des données.

## Ce que Studio Jannah recommande
Studio Jannah insiste sur l'importance d'un vocabulaire commun pour une collaboration efficace. Une compréhension partagée de ces termes fondamentaux est la première étape vers une gouvernance data robuste et des projets de tracking réussis. Nous encourageons la formation continue et la mise à jour régulière de ces connaissances pour toutes les équipes impliquées dans la data.
