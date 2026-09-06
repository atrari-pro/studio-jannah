---
title: "Consentement et volume de données : la modélisation Google"
description: "Comment le refus de consentement réduit le volume observé, et comment Google Ads/GA4 le comblent par modélisation — mécanique et limites de fiabilité."
publishedAt: 2026-09-06
status: published
categoryLabel: "Consentement & CMP"
type: "guide"
level: "expert"
tags: ["Consent Mode", "modélisation", "GA4", "Google Ads", "RGPD"]
hook: "Comprendre le mécanisme réel derrière les conversions modélisées affichées dans Google Ads et GA4 — un calcul construit à partir de cookieless pings et de cohortes consentantes comparables, avec des conditions de fiabilité précises, pas une boîte noire."
sources:
  - label: "Google Analytics Help — About modeling in Google Analytics"
    url: "https://support.google.com/analytics/answer/12017362"
  - label: "Google Ads Help — About conversion modeling"
    url: "https://support.google.com/google-ads/answer/10548233"
  - label: "Google — Consent Mode overview"
    url: "https://developers.google.com/tag-platform/security/guides/consent"
  - label: "CNIL — Cookies et autres traceurs"
    url: "https://www.cnil.fr/fr/cookies-et-autres-traceurs"
relatedInsights:
  - "consent-mode-green-red"
relatedUseCases: []
relatedExpertises:
  - "tracking/consentement/audit-cmp"
  - "tracking/consentement/consent-mode-basique-avance"
  - "tracking/consentement/qa-consentement"
  - "tracking/gtm/audit-gtm"
---

## Le problème : refus de consentement ne veut pas dire zéro donnée

Avant Consent Mode, un refus de consentement produisait un résultat simple : le tag ne se déclenche pas, aucun signal ne part, le volume observé chute d'autant. C'est encore le comportement du mode **basic**, tel que décrit dans le [guide officiel Consent Mode de Google](https://developers.google.com/tag-platform/security/guides/consent). En mode **advanced**, les tags continuent d'envoyer des requêtes sans cookie ni identifiant — des "cookieless pings" — que Google utilise pour **modéliser** statistiquement une partie du comportement et des conversions non observées directement. Comprendre cette mécanique évite de lire un dashboard post-CMP comme une donnée entièrement observée.

## La mécanique concrète : ce que Google modélise, et à partir de quoi

Un cookieless ping porte des signaux agrégés — page visitée, catégorie d'appareil, référent, horodatage — sans aucune valeur d'identification individuelle persistante. D'après la documentation de [Google Analytics sur la modélisation](https://support.google.com/analytics/answer/12017362), ces signaux sont ensuite rapprochés du comportement observé chez des utilisateurs consentants aux caractéristiques comparables (même device, même source de trafic, même période) : le modèle statistique en déduit une estimation de conversions et de comportement pour la portion de trafic non consentie, plutôt que de la traiter comme un simple trou dans les données.

Côté Google Ads, le même principe s'applique aux conversions, documenté dans [À propos de la modélisation des conversions](https://support.google.com/google-ads/answer/10548233) : les conversions modélisées viennent compléter les conversions observées dans les colonnes de reporting, et surtout **alimentent directement les algorithmes d'enchères automatiques** (Smart Bidding) — que l'opérateur du compte distingue ou non la part modélisée de la part observée dans son suivi quotidien.

Le point qui conditionne toute la fiabilité de ce mécanisme : la modélisation nécessite un **volume suffisant** de trafic et de conversions consentis pour construire des cohortes de comparaison statistiquement solides. Un site à faible trafic, ou dont le taux de conversion est trop bas, ne fournit pas assez de données consenties pour que le modèle produise une estimation fiable de la part non consentie — un point que la documentation Google formule comme une condition de fonctionnement, pas comme un détail secondaire.

## Ce que ça change concrètement sur les dashboards

- **GA4** affiche un total de conversions qui mélange donnée observée et donnée modélisée sans toujours distinguer les deux dans les rapports standards — la composition du chiffre change avec le taux d'opt-in, sans que le chiffre lui-même le signale.
- **Google Ads** expose une distinction plus explicite (conversions "observées" vs "modélisées" dans certaines colonnes), mais le Smart Bidding consomme l'ensemble sans que cette distinction influence la lecture opérationnelle du quotidien.
- **La comparabilité dans le temps se dégrade silencieusement** : un taux d'opt-in qui varie (nouvelle CMP, wording du bandeau modifié, campagne de sensibilisation cookies) change le ratio observé/modélisé — deux mois affichant un volume de conversions similaire peuvent reposer sur une composition très différente entre donnée réelle et donnée estimée.

## Pièges connus

- **Confondre donnée observée et donnée modélisée dans un chiffre unique** présenté en comité, et prendre une décision business dessus sans savoir laquelle des deux parties a bougé.
- **Activer le mode advanced en attendant qu'il "retrouve" instantanément un volume perdu**, sur un site dont le trafic ou le volume de conversions ne suffit pas à produire une modélisation fiable — voir le [comparatif Consent Mode basic vs advanced](/expertises/tracking/consentement/consent-mode-basique-avance) avant d'activer le mode advanced par réflexe.
- **Ne jamais suivre le taux d'opt-in dans le temps** — une variation brutale (nouvelle CMP, changement de wording) modifie le ratio observé/modélisé sans qu'aucun signal n'alerte avant que l'écart de reporting ne devienne visible.
- **Comparer un mois pré-CMP et un mois post-CMP sans neutraliser cet effet** — un comité qui lit "le volume a chuté de 30 %" alors que c'est la composition observé/modélisé qui a changé, pas le trafic réel.

## Ce que Studio Jannah recommande

Suivre le taux d'opt-in par catégorie comme un KPI à part entière, documenté et surveillé dans le temps — c'est exactement le premier point de la checklist proposée dans l'insight [Consent Mode v2 : configuré ne veut pas dire fiable](/blog/consent-mode-green-red). Distinguer, dans tout reporting présenté en comité, la part observée de la part modélisée quand l'outil le permet explicitement. La modélisation ne dispense d'aucune des obligations RGPD rappelées par la [CNIL sur les cookies et autres traceurs](https://www.cnil.fr/fr/cookies-et-autres-traceurs) : elle porte sur le calcul post-consentement, pas sur le recueil du consentement lui-même. Ne jamais activer Consent Mode advanced sur un site à faible volume en attendant qu'il "corrige" un problème de volume — vérifier d'abord, via l'[Audit CMP](/expertises/tracking/consentement/audit-cmp), que le mapping des catégories est propre, via l'[Audit GTM](/expertises/tracking/gtm/audit-gtm), que la configuration des tags eux-mêmes est saine, et via [QA consentement](/expertises/tracking/consentement/qa-consentement), que le comportement observé correspond bien à ce que la documentation décrit.
