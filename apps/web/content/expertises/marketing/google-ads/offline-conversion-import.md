---
title: "Offline Conversion Import : importer les conversions offline"
description: "Guide pour importer les conversions offline dans Google Ads et optimiser la mesure de la performance."
publishedAt: 2026-09-07
status: published
categoryLabel: "Google Ads"
type: "guide"
level: "avance"
tags: ["Google Ads", "Conversions", "Offline", "CRM", "Data Integration", "Smart Bidding"]
hook: "Apprenez à importer efficacement vos conversions générées hors ligne dans Google Ads pour une vision complète de la performance et une optimisation accrue de vos campagnes."
sources:
  - label: "À propos de l'importation des conversions"
    url: "https://support.google.com/google-ads/answer/2998031"
  - label: "Configurer l'importation des conversions offline"
    url: "https://support.google.com/google-ads/answer/7018317"
  - label: "Préparer vos données pour l'importation des conversions offline"
    url: "https://support.google.com/google-ads/answer/7018317?hl=fr#prepare_your_data"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "marketing/google-ads/enhanced-conversions"
  - "marketing/google-ads/smart-bidding-data-quality"
  - "data/gouvernance/data-contracts"
---

[L'Offline Conversion Import (OCI)](https://support.google.com/google-ads/answer/2998031) permet d'intégrer des conversions qui se produisent en dehors du site web (appels téléphoniques, ventes en magasin, signatures de contrats CRM) directement dans Google Ads. Cette méthode enrichit les données de performance, offrant une vue 360° du parcours client et améliorant significativement l'efficacité des stratégies d'enchères automatiques (Smart Bidding).

## Contexte du problème
De nombreuses entreprises génèrent des leads ou des ventes qui ne se concrétisent pas directement sur leur site web. Ces conversions offline (appels qualifiés, rendez-vous en agence, ventes en magasin après un clic en ligne, signatures de contrats B2B) sont cruciales pour évaluer la performance réelle des campagnes Google Ads. Sans leur importation, les algorithmes de Smart Bidding manquent de signaux essentiels, ce qui conduit à des optimisations sous-optimales et à une vision incomplète du ROI marketing.

## Mécanique concrète (comment ça marche)
L'Offline Conversion Import repose sur la capacité à relier une conversion offline à un clic publicitaire Google Ads. Cela se fait généralement via le GCLID (Google Click Identifier), un paramètre unique ajouté à l'URL de destination après un clic sur une annonce Google Ads. Voici les étapes clés :

1.  **Capture du GCLID** : Lors du clic sur l'annonce, le GCLID est capturé et stocké dans le système de l'entreprise (CRM, base de données, etc.) en association avec les informations du lead ou du client. Cela peut se faire via un champ masqué dans un formulaire, un cookie first-party, ou un paramètre d'URL enregistré.
2.  **Enregistrement de la conversion offline** : Lorsqu'une conversion se produit hors ligne (ex: vente CRM), les détails de cette conversion sont enregistrés, incluant le GCLID associé, la valeur de la conversion, l'heure de la conversion, et le nom de l'action de conversion.
3.  **Préparation des données** : Les données de conversion offline sont formatées dans un fichier (CSV, feuille Google Sheets) ou via une API, en respectant les spécifications de Google Ads. La [documentation de Google Ads sur la préparation des données](https://support.google.com/google-ads/answer/7018317?hl=fr#prepare_your_data) est essentielle.
4.  **Importation dans Google Ads** : Le fichier est importé manuellement ou automatiquement dans l'interface Google Ads, ou via l'API Google Ads. Google Ads utilise le GCLID pour attribuer la conversion au clic publicitaire d'origine. La [configuration de l'importation](https://support.google.com/google-ads/answer/7018317) est détaillée par Google.

Cette approche permet à Google Ads d'intégrer ces conversions dans ses rapports et, surtout, de les utiliser pour alimenter les stratégies Smart Bidding, améliorant ainsi l'apprentissage des algorithmes.

## Pièges connus
*   **Manque de GCLID** : Si le GCLID n'est pas correctement capturé et stocké, la conversion offline ne peut pas être attribuée à un clic publicitaire.
*   **Délais d'importation** : Un délai trop long entre la conversion et son importation peut affecter la réactivité du Smart Bidding. Google recommande d'importer les conversions dans les 24 heures.
*   **Qualité des données** : Des données incohérentes, des GCLID mal formatés ou des valeurs de conversion erronées peuvent fausser les rapports et l'optimisation. Une [stratégie de réconciliation multi-source](/expertises/data/integration/reconciliation-multi-source) est souvent nécessaire.
*   **Duplication des conversions** : S'assurer que les conversions offline ne sont pas déjà comptabilisées comme des conversions en ligne, pour éviter la sur-estimation.
*   **Complexité de l'intégration** : L'intégration entre le site web, le CRM et Google Ads peut être complexe et nécessiter des compétences techniques (développement, API).

## Ce que Studio Jannah recommande
Studio Jannah conseille une démarche structurée pour une implémentation réussie de l'Offline Conversion Import :

1.  **Définir les conversions clés** : Identifiez précisément les actions offline qui représentent une valeur significative pour votre business et que vous souhaitez importer.
2.  **Mettre en place la capture du GCLID** : Assurez-vous que le GCLID est systématiquement capturé et stocké avec chaque lead ou interaction client. Cela peut impliquer des ajustements sur votre site web (via GTM) et dans votre CRM.
3.  **Développer un processus d'extraction et de formatage** : Créez un mécanisme fiable pour extraire les données de conversion offline de votre CRM ou base de données, les nettoyer et les formater selon les exigences de Google Ads. L'utilisation de [BigQuery pour les marketeurs](/expertises/data/warehouse/bigquery-marketeurs) peut faciliter ce processus.
4.  **Automatiser l'importation** : Privilégiez l'automatisation de l'importation via l'API Google Ads pour garantir la fraîcheur des données et la réactivité du Smart Bidding. Des outils ETL ou des scripts peuvent être utilisés.
5.  **Mettre en place un suivi de la qualité des données** : Surveillez régulièrement la qualité des données importées et le taux de correspondance des GCLID pour détecter et corriger rapidement les anomalies. Une bonne [gouvernance des données](/expertises/data/gouvernance/data-contracts) est essentielle.
6.  **Compléter avec les Enhanced Conversions** : Pour les conversions web qui peuvent être enrichies avec des données first-party hachées, combinez l'OCI avec les [Enhanced Conversions Google Ads](/expertises/marketing/google-ads/enhanced-conversions) pour une mesure encore plus robuste.
