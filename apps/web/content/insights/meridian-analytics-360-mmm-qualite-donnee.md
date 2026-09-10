---
title: 'Meridian débarque dans Analytics 360 : le MMM devient un service, la donnée reste votre problème'
description: 'Google glisse son moteur de marketing mix modeling open source dans Analytics 360. Circana y branche déjà ses data first-party. Le modèle ne vaut que ce qu''on lui donne à manger.'
publishedAt: 2026-09-10
status: published
rubrique: mesure
format: text
featured: false
hook: 'Un modèle Bayésien de marketing mix modeling annoncé à Google Marketing Live devient une fonctionnalité native d''Analytics 360. Quatre mois plus tard, Circana y branche des milliards de transactions retail via son propre partenariat. Le point commun : aucun des deux ne corrige une donnée d''entrée bruitée, mal cadrée ou incomplète.'
tags: ['Meridian', 'marketing mix modeling', 'Google Analytics 360', 'data marketing', 'IA marketing', 'mesure']
sources:
  - label: 'Google — Google Analytics 360 helps you turn data into decisions (annonce Meridian + Qualified Future Conversions, GML 2026)'
    url: 'https://blog.google/products/marketingplatform/analytics/meridian-google-analytics-360/'
  - label: 'Search Engine Land — Google brings Meridian marketing mix modeling into Analytics 360'
    url: 'https://searchengineland.com/google-brings-meridian-marketing-mix-modeling-into-analytics-360-478110'
  - label: 'Circana — Circana Advances AI-Powered Marketing Measurement: Introducing Liquid Mix with Google Meridian'
    url: 'https://www.circana.com/post/circana-advances-ai-powered-marketing-measurement-introducing-liquid-mix-with-google-meridian'
  - label: 'GlobeNewswire — Circana Advances AI-Powered Marketing Measurement: Introducing Liquid Mix with Google Meridian'
    url: 'https://www.globenewswire.com/news-release/2026/09/08/3357743/0/en/circana-advances-ai-powered-marketing-measurement-introducing-liquid-mix-with-google-meridian.html'
relatedExpertises:
  - 'marketing/attribution-media/mta-vs-mmm'
---

## Le marketing mix modeling n'est plus un projet data, c'est un bouton dans votre interface

**Le 20 mai 2026, à Google Marketing Live, Google a annoncé l'intégration de Meridian — son framework open source de marketing mix modeling (MMM) à inférence causale Bayésienne — directement dans Google Analytics 360, aux côtés d'une nouvelle métrique prédictive, Qualified Future Conversions.** Le 8 septembre 2026, Circana a annoncé brancher ce même Meridian sur ses propres données first-party (transactions retail, signaux de fidélité) via son offre Liquid Mix. En quatre mois, le MMM est passé d'un package Python que seules des équipes data avancées savaient déployer à une brique que des plateformes tierces packagent pour n'importe quel annonceur.

## Ce que Google a réellement changé dans Analytics 360

Meridian existe en open source depuis mars 2024 : un framework Bayésien qui estime l'impact incrémental de chaque canal média, en ligne et hors ligne, sans dépendre du cookie ni de l'identifiant utilisateur individuel — l'argument central de Google pour le positionner comme réponse "privacy-safe" à la disparition progressive du tracking déterministe. Jusqu'à GML 2026, l'installer restait un projet technique : cloner le repo GitHub, préparer les données média et business au format attendu, tourner le modèle en Python, interpréter la sortie.

L'intégration dans Analytics 360 déplace Meridian dans l'interface où vivent déjà le reporting de campagne et les données d'audience, sur trois axes annoncés par Google : unifier les signaux first-party et cross-canal dans un seul endroit, isoler la performance causale de chaque canal, et projeter des scénarios de budget. En février 2026, Google avait déjà livré Meridian Scenario Planner, une interface no-code pour tester des arbitrages de budget sans écrire de Python — l'intégration GA360 généralise cette logique : accéder à la sortie du modèle sans être l'équipe qui l'a construit.

En parallèle, Google a introduit Qualified Future Conversions (QFC), une métrique portée par Gemini qui projette la probabilité qu'un engagement publicitaire actuel se transforme en conversion future — jusqu'à 180 jours après le clic, selon les analyses parues depuis l'annonce. QFC reste en pilote restreint, avec un accès bêta plus large annoncé pour la suite de 2026.

## Circana branche des données retail réelles sur le même modèle

Le 8 septembre 2026, Circana a annoncé Liquid Mix avec Google Meridian : la fusion du framework open source de Google avec ses propres actifs first-party — milliards de transactions vérifiées, signaux d'achat issus de programmes de fidélité, données démographiques et mesures de résultats retail. L'argument commercial de Circana reprend celui de Google : une mesure transparente et privacy-safe, qui ne dépend plus du suivi individuel pour relier investissement média et résultat business.

Ce qui change concrètement pour un annonceur qui passe par Circana plutôt que par une implémentation Meridian maison : le modèle Bayésien ne change pas, mais les données qui l'alimentent viennent d'un tiers, avec sa propre définition de la conversion, sa propre fenêtre de rapprochement, sa propre méthode de dédoublonnage des transactions. Le résultat du modèle hérite de ces choix — invisibles dans l'interface finale.

## Pourquoi la qualité des données d'entrée reste l'unique variable qui compte

Un MMM Bayésien, packagé dans une interface Google ou branché sur des data retail Circana, produit une estimation aussi fiable que les séries temporelles qu'on lui fournit en amont : dépenses média par canal, ventes ou conversions associées, variables de contrôle (prix, promotions, saisonnalité). Depuis septembre 2025, Meridian accepte nativement des variables non-média (prix, promotions) et des priors de contribution par canal — ce qui améliore la modélisation, mais seulement si ces variables sont elles-mêmes correctement mesurées et remontées en amont.

Rendre le modèle accessible en un clic dans Analytics 360 ne change rien à ce prérequis : un dataLayer incomplet, des conversions dupliquées entre canaux, une fenêtre d'attribution mal cadrée entre le online et le offline produisent une entrée bruitée, que le modèle Bayésien absorbe sans le signaler comme une erreur — il la traite comme un signal parmi d'autres et en tire une estimation causale qui semble crédible parce qu'elle sort d'une interface propre.

## Ce qu'il faut vérifier avant de lire une sortie Meridian comme une vérité causale

- **Auditer les séries d'entrée**, pas seulement le résultat : les dépenses média par canal remontent-elles à la bonne granularité temporelle, sans trou ni doublon entre plateformes ?
- **Documenter la définition de conversion** utilisée par le modèle — une conversion GA4, une transaction Circana et un objectif business interne ne se recouvrent pas toujours exactement.
- **Vérifier la cohérence des variables de contrôle** (prix, promotions, saisonnalité) : leur absence ou leur approximation biaise directement l'estimation d'incrémentalité de chaque canal.
- **Garder une trace de la méthodologie du partenaire** (Circana ou autre) si les données first-party ne viennent pas en interne : la définition de "conversion" ou de "transaction vérifiée" du partenaire devient, de fait, la définition utilisée par le modèle.

## Et pour la mesure, le tracking, le CRO ?

C'est exactement le point que Studio Jannah défend sur le contrat dataLayer : rendre un modèle causal accessible dans une interface ne le rend pas plus fiable, seulement plus facile à consulter. Meridian dans Analytics 360, comme Liquid Mix chez Circana, ne compensent pas un tracking approximatif — ils en amplifient la sortie visible, avec l'autorité d'une estimation Bayésienne présentée comme neutre. Avant de piloter un budget média sur une sortie Meridian, la question n'est pas "le modèle a-t-il raison ?" mais "sur quelles données d'entrée, définies comment, ce modèle a-t-il tourné ?".

## FAQ

**Meridian remplace-t-il le tracking classique (GA4, dataLayer) ?**
Non. Meridian modélise l'impact incrémental des canaux à partir de séries agrégées (dépenses, conversions, variables de contrôle) — il ne remplace pas la collecte d'événements en dataLayer, il en dépend en amont pour ses données d'entrée.

**Faut-il un compte Analytics 360 pour utiliser Meridian ?**
Non, Meridian reste disponible en open source gratuitement sur GitHub et PyPI, indépendamment de l'intégration Analytics 360 annoncée par Google, réservée aux clients GA360.

**Qu'est-ce que Qualified Future Conversions (QFC) ?**
Une métrique prédictive propulsée par Gemini qui estime la probabilité qu'un engagement publicitaire actuel se traduise par une conversion future, jusqu'à 180 jours après le clic. QFC est en pilote restreint depuis son annonce à GML 2026.

**Les données Circana changent-elles la fiabilité du modèle Meridian ?**
Elles changent la source et la définition des données d'entrée (transactions vérifiées, signaux de fidélité), pas le framework de modélisation lui-même. La fiabilité du résultat dépend toujours de la qualité et de la cohérence de ces données amont.

---

*Sources : [Google](https://blog.google/products/marketingplatform/analytics/meridian-google-analytics-360/), [Search Engine Land](https://searchengineland.com/google-brings-meridian-marketing-mix-modeling-into-analytics-360-478110), [Circana](https://www.circana.com/post/circana-advances-ai-powered-marketing-measurement-introducing-liquid-mix-with-google-meridian), [GlobeNewswire](https://www.globenewswire.com/news-release/2026/09/08/3357743/0/en/circana-advances-ai-powered-marketing-measurement-introducing-liquid-mix-with-google-meridian.html) — traitement éditorial et angle mesure/tracking par Studio Jannah.*

*Studio Jannah — Mohamed Atrari.*
