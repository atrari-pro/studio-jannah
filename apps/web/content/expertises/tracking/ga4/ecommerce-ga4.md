---
title: "Ecommerce GA4 : le schéma Enhanced Ecommerce"
description: "Ce que GA4 fait du schéma ecommerce/items[] côté reporting — purchase, refund, funnels, key events — et les pièges d'interface qui faussent le CA affiché."
publishedAt: 2026-09-06
status: published
categoryLabel: "GA4 & mesure produit"
type: "guide"
level: "avance"
tags: ["GA4", "e-commerce", "Enhanced Ecommerce", "refund", "key events"]
hook: "Ce que GA4 fait réellement d'un event `purchase` ou `refund` bien formé une fois reçu — reporting standard, funnel exploration, key events — et pourquoi un schéma dataLayer techniquement correct peut quand même produire un chiffre d'affaires mal exploité côté interface."
sources:
  - label: "Google — Measure ecommerce (Google Analytics 4)"
    url: "https://developers.google.com/analytics/devguides/collection/ga4/ecommerce"
  - label: "Google Analytics Help — Recommended events (purchase, refund)"
    url: "https://support.google.com/analytics/answer/9267735"
  - label: "Google Analytics Help — About key events"
    url: "https://support.google.com/analytics/answer/12844695"
  - label: "Google Analytics Help — Funnel exploration technique"
    url: "https://support.google.com/analytics/answer/9327974"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/datalayer/datalayer-ecommerce"
  - "tracking/ga4/audit-ga4"
  - "tracking/ga4/custom-dimensions-metrics"
  - "tracking/gtm/migration-ua-ga4"
---

## Le problème que ce guide résout

Le schéma exact de l'objet `ecommerce` et du tableau `items[]` — `transaction_id`, `currency`, `item_id`, dédup du `purchase` — conforme au [guide officiel de mesure e-commerce GA4](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce), est déjà couvert en détail dans [DataLayer e-commerce : le schéma GA4 `items[]`](/expertises/tracking/datalayer/datalayer-ecommerce). Ce guide part du principe que ce schéma est correctement poussé, et couvre ce que GA4 en fait côté configuration et reporting : comment le `refund` corrige rétroactivement le chiffre d'affaires, comment les rapports e-commerce standards se peuplent, comment construire un funnel d'achat exploitable, et pourquoi un event techniquement valide peut quand même produire un reporting inexploité si personne ne l'a marqué key event.

## La mécanique concrète côté GA4

**Le `refund` ne supprime rien, il corrige.** Un event `refund` documenté par [Google parmi les événements recommandés](https://support.google.com/analytics/answer/9267735) doit porter le même `transaction_id` que le `purchase` d'origine, avec — pour un remboursement partiel — le sous-ensemble d'`items[]` réellement remboursés. GA4 rapproche les deux events par `transaction_id` et ajuste le chiffre d'affaires rapporté en conséquence ; un `refund` sans `transaction_id` correspondant à un `purchase` existant ne se rattache à rien et n'a aucun effet correctif visible dans les rapports.

**Le rapprochement par `transaction_id` dépend d'un timing cohérent.** Un `refund` poussé avant que le `purchase` correspondant n'ait été traité côté GA4 (délai de traitement, event envoyé en avance par erreur d'intégration côté back-office) échoue à se rapprocher correctement. Le processus opérationnel de remboursement doit donc pousser l'event au moment réel du remboursement métier, jamais en anticipation.

**Les rapports e-commerce standards se peuplent automatiquement à partir des noms d'events recommandés**, mais seulement si ces noms sont respectés exactement (voir les [conventions de nommage DataLayer](/expertises/tracking/datalayer/conventions-de-nommage)) — un `purchase` renommé casse cette reconnaissance automatique sans qu'aucune erreur ne remonte, le reporting apparaît simplement vide ou incomplet.

**Un funnel d'achat exploitable se construit avec l'outil d'exploration dédié.** La [technique d'exploration en funnel](https://support.google.com/analytics/answer/9327974) permet de chaîner les étapes du parcours (`view_item` → `add_to_cart` → `begin_checkout` → `purchase`) et de visualiser le taux de passage et l'abandon entre chaque étape — à condition que chaque event de cette chaîne soit effectivement poussé avec le bon nom standard à l'étape correspondante du parcours front. Un funnel qui affiche un abandon anormalement élevé à une étape donnée est aussi souvent le signal d'un event manquant côté implémentation que d'un vrai problème d'expérience utilisateur — les deux hypothèses doivent être vérifiées avant d'agir sur l'une ou l'autre.

**`purchase` n'apparaît dans les rapports de conversion que s'il est explicitement marqué key event.** Ce marquage se fait dans l'Admin GA4, conformément à la [définition des key events par Google](https://support.google.com/analytics/answer/12844695), indépendamment de la qualité du schéma poussé — voir le critère dédié dans l'[Audit GA4](/expertises/tracking/ga4/audit-ga4). Un `purchase` parfaitement formé, visible en GA4 DebugView, peut ne jamais apparaître comme "conversion" tant que ce marquage n'a pas été fait.

## Pièges connus

- **Refund sans `transaction_id` correspondant** — un remboursement traité côté back-office sans que l'event porte l'identifiant exact de la commande d'origine ne corrige rien côté GA4 ; le chiffre d'affaires reste gonflé du montant remboursé, sans qu'aucune alerte ne le signale.
- **`purchase` non marqué key event** — le reporting Ecommerce brut affiche la donnée, mais aucun rapport de conversion, aucun taux de conversion global de la propriété ne l'intègre.
- **Renommer `purchase` "pour être plus explicite"** (`sj_purchase`, `achat_valide`) désactive silencieusement toute la reconnaissance automatique des rapports e-commerce standards, obligeant à reconstruire à la main ce que GA4 offre nativement.
- **Diagnostiquer un abandon de funnel comme un problème UX sans vérifier d'abord que l'event de l'étape concernée part bien** — la première hypothèse à exclure devant un taux de passage anormalement bas entre deux étapes est toujours un event manquant ou mal timé, pas une conclusion produit hâtive.
- **Confondre item revenue et purchase revenue** dans une lecture de rapport — le premier est calculé à partir des lignes `items[]`, le second à partir de la valeur globale de la transaction ; un écart entre les deux signale une incohérence de schéma (somme des lignes ≠ valeur totale déclarée), pas un bug de rapport.

## Ce que Studio Jannah recommande

Traiter le marquage key event de `purchase` (et `refund` s'il est utilisé) comme une étape de recette au même titre que la validation du schéma dataLayer — un event correctement formé mais non marqué reste invisible dans tout comité qui lit les rapports de conversion standards. Construire le funnel d'achat en exploration dès la mise en prod, avant même la première campagne, pour disposer d'une baseline de taux de passage : c'est la seule façon de distinguer plus tard un vrai problème UX d'une régression d'implémentation. Intégrer le remboursement comme un event de premier ordre dans le processus opérationnel back-office, pas comme un correctif manuel a posteriori dans un tableur — sans quoi le chiffre d'affaires GA4 dérive durablement du chiffre d'affaires réel.
