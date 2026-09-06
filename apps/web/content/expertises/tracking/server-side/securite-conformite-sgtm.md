---
title: "Sécurité et conformité sGTM : proxying, PII stripping"
description: "Pourquoi héberger le conteneur sGTM sur un domaine propre au site, comment masquer les données personnelles avant envoi, et ce que cela change côté RGPD."
publishedAt: 2026-09-06
status: published
categoryLabel: "Server-side (sGTM)"
type: "guide"
level: "expert"
tags: ["sGTM", "sécurité", "RGPD", "PII", "server-side tagging"]
hook: "Proxying via domaine propre, redaction des champs sensibles avant transmission, contrôle d'accès au conteneur : ce qui change réellement côté sécurité et RGPD quand le tracking passe côté serveur."
sources:
  - label: "Google — Server-side tagging avec Google Tag Manager"
    url: "https://developers.google.com/tag-platform/tag-manager/server-side"
  - label: "Google — Set up your own domain for the tagging server"
    url: "https://developers.google.com/tag-platform/tag-manager/server-side/domains"
  - label: "Google — Transformations for server-side tagging"
    url: "https://developers.google.com/tag-platform/tag-manager/server-side/transformations"
  - label: "CNIL — Cookies et autres traceurs"
    url: "https://www.cnil.fr/fr/cookies-et-autres-traceurs"
relatedInsights:
  - "gtm-dispatch-selectif-client-server"
relatedUseCases: []
relatedExpertises:
  - "tracking/server-side/identite-cookies-sgtm"
  - "tracking/server-side/monitoring-couts-sgtm"
  - "tracking/server-side/audit-sgtm"
  - "tracking/server-side/architecture-dispatch-client-serveur"
---

## Le problème que le server-side déplace, sans le résoudre automatiquement

Passer en [server-side tagging](https://developers.google.com/tag-platform/tag-manager/server-side) est souvent présenté comme un gain de sécurité et de conformité en soi — la donnée transite par un serveur qu'on contrôle, plutôt que directement depuis le navigateur du visiteur vers un tiers. C'est une partie vraie, mais incomplète : le serveur qu'on contrôle devient aussi une nouvelle surface à sécuriser, un nouveau point où de la donnée personnelle transite et doit être traitée conformément au RGPD, et un nouveau périmètre d'accès à restreindre. Le server-side ne résout rien automatiquement — il déplace la responsabilité, et l'explicite.

## Proxying : pourquoi le domaine propre au site n'est pas un détail

Le [guide officiel de configuration de domaine](https://developers.google.com/tag-platform/tag-manager/server-side/domains) recommande de faire répondre le conteneur serveur sur un sous-domaine du site lui-même, plutôt que sur l'URL brute fournie par l'hébergeur cloud. Ce choix a une double implication.

**Côté mesure**, un sous-domaine propre préserve le contexte first-party : les cookies posés par le conteneur serveur sont associés au domaine du site, pas à un domaine tiers reconnaissable par un bloqueur de trackers. **Côté sécurité et gouvernance**, faire transiter la donnée par un domaine explicitement propre au site oblige à traiter ce sous-domaine comme une partie de l'infrastructure du site — avec les mêmes exigences de suivi de certificat, de disponibilité, et de contrôle d'accès que n'importe quel autre service exposé publiquement. Un conteneur laissé sur son URL d'hébergement brute est plus facilement oublié dans les revues de sécurité périodiques du site, précisément parce qu'il ne "ressemble" pas à un composant du site.

## Redaction (PII stripping) : la mécanique concrète

Le server-side tagging introduit un point de passage obligé pour tout événement routé côté serveur — ce qui en fait aussi le point le plus pertinent pour intervenir sur la donnée avant qu'elle ne reparte vers une destination tierce (GA4, une plateforme ads, un outil analytics). Google documente ce mécanisme sous le nom de **Transformations** dans le [guide officiel dédié](https://developers.google.com/tag-platform/tag-manager/server-side/transformations) : une couche de traitement appliquée aux événements entrants, avant qu'ils n'atteignent les Clients et les Tags configurés dans le conteneur.

Concrètement, une Transformation permet de retirer ou masquer un champ identifié comme sensible — une adresse email capturée par erreur dans un paramètre libre, un numéro de téléphone, une adresse IP complète — avant que cet événement ne soit transmis à sa destination finale. C'est un contrôle qui s'applique **une fois, côté serveur**, plutôt que de dépendre de la discipline de chaque intégration côté client pour ne jamais pousser ce type de donnée dans le dataLayer en premier lieu.

Ce mécanisme ne remplace pas la discipline en amont : un dataLayer qui ne pousse jamais de PII par construction reste la première ligne de défense — c'est le cas du contrat documenté dans `docs/TRACKING_DATALAYER.md`, dont aucun des champs listés (`page_path`, `cta_id`, `link_url` restreint aux liens `http(s)` externes, `form_id`, `form_status`…) ne porte de donnée personnelle directement identifiante ; ce n'est pas un principe énoncé comme tel dans ce document, mais une propriété observable de la liste des events et de leurs clés. La Transformation côté serveur est un filet de sécurité pour les cas où une donnée sensible se glisse malgré tout — via un paramètre libre, une valeur saisie utilisateur remontée par erreur — pas une autorisation à être moins rigoureux en amont.

## Contrôle d'accès : un périmètre distinct du conteneur client

Le conteneur serveur constitue un périmètre d'accès à part entière, distinct des droits d'édition du conteneur GTM client. Deux raisons à cela : la personne qui peut publier une nouvelle configuration serveur peut potentiellement modifier ce qui est transmis à des destinations tierces (et donc la nature des données personnelles en circulation), et la personne qui peut redéployer l'infrastructure hébergeant le conteneur touche à un composant technique du site, pas seulement à un outil de mesure. Restreindre cet accès à un nombre limité de personnes identifiées, et le documenter, fait partie des critères de contrôle de l'[Audit sGTM](/expertises/tracking/server-side/audit-sgtm).

## Ce que cela change côté RGPD

Le server-side tagging ne change pas les obligations de base rappelées par la [CNIL sur les cookies et traceurs](https://www.cnil.fr/fr/cookies-et-autres-traceurs) : information, recueil du consentement avant tout traceur non strictement nécessaire, et finalité proportionnée du traitement. Ce qui change, c'est le lieu où la donnée transite et où une intervention (redaction, filtrage) peut s'appliquer de façon centralisée avant l'envoi à un tiers. Documenter explicitement ce que le conteneur serveur reçoit, ce qu'il retient (logs, éventuel stockage intermédiaire), et ce qu'il transmet fait partie de la cartographie des traitements attendue par le RGPD — un exercice à ne pas traiter comme secondaire au moment d'une migration server-side.

## Pièges connus

- **Considérer le server-side comme une garantie de conformité en soi.** Le serveur intermédiaire ne rend pas un traitement conforme par construction — il déplace le point de contrôle, il ne le supprime pas.
- **Laisser le conteneur serveur hors du périmètre des audits de sécurité du site**, parce qu'il est perçu comme un outil de mesure plutôt qu'un composant d'infrastructure exposé publiquement.
- **Ne configurer aucune Transformation de redaction en s'appuyant uniquement sur la discipline du dataLayer.** Le dataLayer bien construit reste la meilleure défense, mais une Transformation de filet de sécurité coûte peu à mettre en place face au risque d'un paramètre libre mal alimenté.
- **Confondre accès en lecture (consultation des logs) et accès en publication (modification de la configuration serveur)** — les deux niveaux se distinguent et se restreignent différemment.

## Ce que Studio Jannah recommande

Traiter le conteneur serveur comme un composant d'infrastructure du site, pas comme une simple extension du conteneur GTM client : même exigence de domaine propre, même rigueur de contrôle d'accès, même intégration dans les revues de sécurité périodiques. Poser au moins une Transformation de redaction sur les champs les plus à risque avant la mise en production, indépendamment de la confiance accordée au dataLayer en amont — et documenter, pour chaque destination tierce alimentée, ce qui y transite réellement.
