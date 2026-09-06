---
title: "GTM avancé : templates custom et variables JS"
description: "Custom JavaScript variable vs Custom Template GTM : sandbox, permissions déclarées, et le piège de recréer côté conteneur une logique du site."
publishedAt: 2026-09-06
status: published
categoryLabel: "GTM"
type: "guide"
level: "expert"
tags: ["GTM", "custom templates", "Custom JavaScript", "sandboxed JS", "avancé"]
hook: "La distinction concrète entre une Custom JavaScript variable et un Custom Template GTM — sandbox, permissions déclarées, gouvernance — pour savoir lequel utiliser, et surtout reconnaître quand aucun des deux ne devrait exister parce que la logique appartient au dataLayer du site, pas au conteneur."
sources:
  - label: "Google — Custom Templates (Tag Manager Developer Guide)"
    url: "https://developers.google.com/tag-platform/tag-manager/templates"
  - label: "Google — Centre d'aide Tag Manager : modèles personnalisés"
    url: "https://support.google.com/tagmanager/answer/9048113"
  - label: "Google — Tag Manager Developer Guide"
    url: "https://developers.google.com/tag-platform/tag-manager"
  - label: "Simo Ahava — Introduction to Custom Templates in Google Tag Manager"
    url: "https://www.simoahava.com/analytics/introduction-custom-templates-google-tag-manager/"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/gtm/architecture-conteneur"
  - "tracking/gtm/qa-de-tags"
  - "tracking/gtm/gouvernance-gtm"
  - "tracking/datalayer/conventions-de-nommage"
---

## Le problème que ce guide résout

Au-delà des tags, triggers et variables standards, GTM propose deux mécanismes pour écrire de la logique custom, documentés par la [Tag Manager Developer Guide](https://developers.google.com/tag-platform/tag-manager) : la variable **Custom JavaScript** et le **Custom Template** (y compris ceux de la Community Template Gallery). Confondus, ils produisent soit une dette de maintenance (logique dupliquée dans dix variables JS), soit un risque de sécurité mal évalué (permissions d'un template tiers jamais lues), soit — le cas le plus fréquent — une logique métier recréée côté conteneur qui devrait vivre côté site.

## La mécanique concrète

**La variable Custom JavaScript s'exécute avec accès au scope global (`window`).** C'est une fonction JS simple, qui retourne une valeur, exécutée dans le contexte de la page — elle peut lire n'importe quelle variable globale accessible côté client, sans déclaration de permission particulière. C'est ce qui la rend rapide à écrire, et tout aussi rapide à mal utiliser : rien n'empêche d'y mettre une transformation de données lourde ou une dépendance fragile à un élément du DOM.

**Le Custom Template s'exécute dans un environnement JavaScript sandboxé, avec un système de permissions explicite.** Contrairement à la variable Custom JS, un template créé via l'éditeur de modèles GTM n'a *pas* d'accès libre au scope global : il utilise un jeu d'API restreint (`copyFromDataLayer`, `injectScript`, `sendPixel`, `setCookie`…) documenté par la [Tag Manager Developer Guide sur les Custom Templates](https://developers.google.com/tag-platform/tag-manager/templates). Chaque capacité sensible (accéder aux variables globales, injecter un script, envoyer un pixel) doit être déclarée comme permission explicite dans le template, visible avant import — un modèle de sécurité que Simo Ahava détaille dans son [introduction aux Custom Templates](https://www.simoahava.com/analytics/introduction-custom-templates-google-tag-manager/).

**La Community Template Gallery ajoute une couche de revue Google, pas une garantie totale.** Un template communautaire publié dans la galerie a été revu par Google avant publication, mais cette revue ne dispense pas de lire soi-même les permissions déclarées avant import dans un conteneur — c'est documenté explicitement dans le [centre d'aide Tag Manager sur les modèles personnalisés](https://support.google.com/tagmanager/answer/9048113) : la responsabilité de l'usage reste côté conteneur qui l'importe.

**Le choix entre les deux dépend de la portée, pas de la préférence.** Une transformation ponctuelle, locale à un seul conteneur, sans logique sensible (accès global, injection) : variable Custom JS. Une logique réutilisée sur plusieurs tags ou plusieurs conteneurs, qui mérite d'être versionnée et dont les permissions doivent être auditables : Custom Template, quitte à accepter la courbe d'apprentissage plus élevée de l'API sandboxée.

## Pièges connus

- **Sur-utiliser les Custom JavaScript variables pour des transformations de données lourdes exécutées à chaque chargement de page** — un coût de performance front qui pourrait être évité en poussant la donnée déjà transformée côté dataLayer, plus fiable et plus simple à débugger qu'une fonction JS cachée dans une variable GTM.
- **Importer un template de la Community Gallery sans lire les permissions déclarées** — accepter par défaut l'accès global ou l'envoi de pixel sans vérifier que ces capacités correspondent réellement au besoin, c'est ouvrir une surface de risque au moment de l'import, pas au moment de l'usage.
- **Une Custom JS variable qui dépend d'un élément DOM pas encore chargé au moment de son exécution** — race condition classique, source de `undefined` silencieux, un piège de timing proche de ceux documentés pour le dataLayer lui-même.
- **Dupliquer la même logique JS dans plusieurs variables au lieu de la factoriser en un seul Custom Template réutilisable** — une correction de bug doit alors être répétée partout où la logique a été copiée-collée, avec le risque d'en oublier une.
- **Recréer côté conteneur une logique qui appartient au site** — reconstruire en Custom JS un calcul métier (segmentation, catégorisation) qui devrait être produit une fois côté dataLayer plutôt que recalculé à chaque lecture GTM, un renversement de responsabilité qui contredit la logique de conventions de nommage et de propriété de la donnée déjà posée côté site.

## Ce que Studio Jannah recommande

Réserver la Custom JavaScript variable au formatage ponctuel et léger (concaténation, fallback simple, parsing d'une valeur déjà présente), jamais à une transformation de donnée métier significative. Passer en Custom Template dès qu'une logique doit être réutilisée sur plusieurs tags ou conteneurs, en déclarant le minimum de permissions nécessaires — le même principe de moindre privilège que la [gouvernance des accès au conteneur](/expertises/tracking/gtm/gouvernance-gtm). Avant d'écrire la moindre ligne de JS côté GTM, se poser la question inverse : cette donnée ne devrait-elle pas déjà exister, prête à l'emploi, dans le dataLayer poussé par le site ? Si la réponse est oui, la corriger à la source coûte moins cher sur la durée qu'une variable GTM qui la recalcule à chaque page.
