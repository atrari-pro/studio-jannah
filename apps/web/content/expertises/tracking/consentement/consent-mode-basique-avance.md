---
title: "Consent Mode basique vs avancé : lequel choisir"
description: "Consent Mode basic vs advanced : blocage des tags, cookieless pings, modélisation, effort d'implémentation — la comparaison tranchée par Studio Jannah."
publishedAt: 2026-09-06
status: published
categoryLabel: "Consentement & CMP"
type: "comparatif"
level: "avance"
tags: ["Consent Mode", "CMP", "modélisation", "RGPD", "GTM"]
hook: "Un tableau de décision qui tranche, sur cinq critères concrets, entre bloquer tous les tags avant consentement (basic) et laisser Google modéliser les cookieless pings (advanced) — avec la recommandation par défaut de Studio Jannah selon le volume de trafic et d'investissement média."
sources:
  - label: "Google — Consent Mode overview"
    url: "https://developers.google.com/tag-platform/security/guides/consent"
  - label: "Google Analytics Help — About consent mode"
    url: "https://support.google.com/analytics/answer/9976101"
  - label: "Google Analytics Help — About modeling in Google Analytics"
    url: "https://support.google.com/analytics/answer/12017362"
  - label: "CNIL — Cookies et autres traceurs"
    url: "https://www.cnil.fr/fr/cookies-et-autres-traceurs"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/consentement/audit-cmp"
  - "tracking/consentement/impact-consentement-volume"
  - "tracking/consentement/qa-consentement"
  - "tracking/server-side/securite-conformite-sgtm"
---

## Ce que "basic" et "advanced" changent concrètement

Les deux modes documentés dans le [guide officiel Consent Mode de Google](https://developers.google.com/tag-platform/security/guides/consent) ne diffèrent pas sur la manière de recueillir le consentement (la CMP fait ce travail dans les deux cas), mais sur le **comportement des tags de mesure tant que le consentement n'est pas accordé**.

En mode **basic** (une distinction résumée côté mesure dans le [centre d'aide Google Analytics sur Consent Mode](https://support.google.com/analytics/answer/9976101)), un tag dont le type de consentement requis est refusé ne se déclenche tout simplement pas — aucune requête ne part vers Google tant que l'utilisateur n'a pas accordé le consentement correspondant. En mode **advanced**, les tags continuent de se charger et d'envoyer des requêtes même en l'absence de consentement, mais sans cookie ni identifiant persistant : des "cookieless pings", décrits par Google comme des signaux agrégés (page, catégorie d'appareil, référent) sans valeur d'identification individuelle. Ces pings alimentent ensuite un mécanisme de modélisation, détaillé dans la page [À propos de la modélisation dans Google Analytics](https://support.google.com/analytics/answer/12017362), qui estime le comportement et les conversions de la part de trafic non consentie à partir des schémas observés chez les visiteurs consentants comparables.

## Tableau comparatif

| Critère | Basic | Advanced |
|---|---|---|
| Comportement des tags avant consentement | Aucun tag ne se déclenche | Les tags se chargent, envoient des cookieless pings sans identifiant |
| Volume de données pré-consentement | Zéro donnée émise | Signaux agrégés captés, réinjectés par modélisation |
| Conversions/comportement modélisés | Non disponible — rien à modéliser | Disponible, comble une partie de l'écart lié au refus ou à l'absence de choix |
| Effort d'implémentation | Faible — bloquer/débloquer par catégorie suffit | Plus élevé — configuration des signaux Consent Mode et validation des cookieless pings |
| Dépendance au volume de trafic | Aucune | La fiabilité de la modélisation dépend d'un volume suffisant de trafic et de conversions consentis, documenté par Google comme une condition de son fonctionnement |
| Risque de mauvaise lecture | Faible — ce qui est affiché est ce qui a été mesuré | Réel si le reporting ne distingue pas donnée observée et donnée modélisée |

## Le piège le plus fréquent

Activer le mode advanced en pensant "récupérer" instantanément le volume perdu par les refus de consentement, sur un site à trafic ou volume de conversions trop faible pour que la modélisation soit statistiquement fiable. Le mode advanced ne restaure pas la donnée manquante — il l'estime, et une estimation construite sur un échantillon trop petit n'est pas plus fiable qu'une absence de donnée honnêtement affichée comme telle.

## Ce que Studio Jannah recommande

**Advanced par défaut** pour tout site avec un volume média significatif (Google Ads actif, budget d'acquisition substantiel) — la perte de conversions non modélisées y coûte directement en pilotage des enchères automatiques et en lecture de performance média, et le volume de trafic disponible rend la modélisation statistiquement exploitable.

**Basic par défaut** pour tout site sans volume média conséquent, ou dont le trafic ne permet manifestement pas d'atteindre un seuil de fiabilité de modélisation — mieux vaut un chiffre partiellement vide et honnête qu'un chiffre modélisé sur un échantillon trop faible, présenté avec la même confiance qu'une donnée observée. Le passage d'un mode à l'autre se décide en même temps que l'[Audit CMP](/expertises/tracking/consentement/audit-cmp), pas après une mise en production non recettée — voir [QA consentement](/expertises/tracking/consentement/qa-consentement) pour la vérification du blocage effectif dans les deux modes.

Quel que soit le mode retenu, les obligations de base rappelées par la [CNIL sur les cookies et autres traceurs](https://www.cnil.fr/fr/cookies-et-autres-traceurs) restent identiques : information, recueil du consentement avant tout traceur non strictement nécessaire. Le choix basic/advanced ne change que le comportement technique des tags, jamais le socle légal.
