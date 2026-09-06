---
title: "Audit GA4 : configuration, exclusions, filtres"
description: "24 critères pass/fail pour auditer une propriété GA4 — data streams, trafic interne, filtres, rétention, cross-domain, key events, accès."
publishedAt: 2026-09-06
status: published
categoryLabel: "GA4 & mesure produit"
type: "audit"
level: "avance"
tags: ["GA4", "audit", "data streams", "filtres", "key events"]
hook: "Une checklist à parcourir critère par critère dans l'Admin GA4 — pas le contenu du dataLayer ni la configuration du conteneur GTM, mais la façon dont la propriété GA4 elle-même traite ce qu'elle reçoit : streams, trafic interne, filtres, rétention, cross-domain, key events, accès."
sources:
  - label: "Google Analytics Help — About data streams"
    url: "https://support.google.com/analytics/answer/9304153"
  - label: "Google Analytics Help — Define internal traffic"
    url: "https://support.google.com/analytics/answer/9443595"
  - label: "Google Analytics Help — About data filters"
    url: "https://support.google.com/analytics/answer/10108813"
  - label: "Google Analytics Help — Referral exclusion list"
    url: "https://support.google.com/analytics/answer/10327750"
  - label: "Google Analytics Help — Data retention settings"
    url: "https://support.google.com/analytics/answer/7667196"
  - label: "Google Analytics Help — Set up cross-domain measurement"
    url: "https://support.google.com/analytics/answer/10071811"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/ga4/ecommerce-ga4"
  - "tracking/ga4/custom-dimensions-metrics"
  - "tracking/ga4/bigquery-export-ga4"
  - "tracking/gtm/audit-gtm"
---

## Comment utiliser cette checklist

Cette checklist audite la **propriété GA4 elle-même**, côté Admin — data streams, trafic interne, filtres, rétention, cross-domain, key events, accès — pas le contenu du dataLayer qui l'alimente (voir l'[Audit DataLayer](/expertises/tracking/datalayer/audit-datalayer)) ni la configuration du conteneur GTM qui l'envoie (voir l'[Audit GTM](/expertises/tracking/gtm/audit-gtm)). Un dataLayer propre et un conteneur GTM bien recetté peuvent quand même produire un reporting faussé si la propriété GA4 elle-même compte le trafic interne, applique une rétention trop courte ou laisse un référent de paiement polluer l'acquisition. Chaque critère se vérifie dans l'interface Admin de GA4, pass ou fail.

## 1. Data streams

- [ ] **Un seul data stream web actif par domaine réellement mesuré**, documenté dans le plan de marquage — un stream de test ou de migration laissé actif en parallèle du stream de production double silencieusement le comptage si le même dataLayer les alimente tous les deux.
- [ ] **Le measurement ID du stream correspond à celui réellement configuré côté GTM** (variable Constant, voir l'[Audit GTM](/expertises/tracking/gtm/audit-gtm)) — un stream recréé après une manipulation dans l'Admin change de measurement ID sans que rien ne le signale côté conteneur si personne ne met à jour la variable.
- [ ] **Les événements collectés automatiquement (Enhanced Measurement)** — `scroll`, `click`, `file_download`, `video_start`… documentés par [Google sur les data streams](https://support.google.com/analytics/answer/9304153) — sont activés en connaissance de cause, pas par défaut sans revue. Un événement Enhanced Measurement redondant avec un event `sj_*` maison produit un double signal pour le même comportement.

## 2. Trafic interne

- [ ] **Une règle de trafic interne (Internal Traffic) existe**, basée sur les IP réelles de l'équipe et des bureaux, conformément à la [définition du trafic interne par Google](https://support.google.com/analytics/answer/9443595) — sans cette règle, aucune distinction n'est possible entre visiteur réel et trafic de l'équipe.
- [ ] **Le filtre de données correspondant (Data Filter) est actif en mode `Active`**, pas laissé en `Testing` indéfiniment — un filtre en test continue de compter le trafic interne dans tous les rapports, seul son statut interne dans l'Admin change, documenté dans [À propos des filtres de données](https://support.google.com/analytics/answer/10108813).
- [ ] **La liste d'IP du filtre est revue à chaque changement d'infrastructure** (nouveau bureau, VPN d'équipe changé) — une IP interne obsolète laisse passer du trafic externe classé à tort comme interne, une IP jamais mise à jour après un déménagement laisse repasser du trafic interne comme externe.
- [ ] **`debug_mode` n'est jamais laissé actif en continu sur un environnement de production** — utile en recette, il doit rester une activation ponctuelle, pas une configuration permanente qui redirige silencieusement des events de test vers la vue DebugView en prod.

## 3. Référents non désirés

- [ ] **La liste d'exclusion de référents inclut les domaines de prestataires de paiement et de passerelles externes** (page de paiement hébergée par un tiers, redirection vers un système de réservation externe) — sans cette liste, un visiteur qui revient du paiement est compté comme une nouvelle session issue d'un référent externe, cassant l'attribution du parcours d'achat, un mécanisme documenté par la [liste d'exclusion de référents de Google](https://support.google.com/analytics/answer/10327750).
- [ ] **Aucun domaine du site lui-même (sous-domaine, environnement de préprod) ne figure par erreur dans les référents observés** sans être soit exclu, soit intégré au cross-domain measurement — un sous-domaine non traité casse une session en deux à chaque transition.

## 4. Rétention des données & Google Signals

- [ ] **La durée de rétention des données au niveau événement est un choix documenté**, pas la valeur par défaut jamais revisitée — conformément aux [paramètres de rétention des données de Google](https://support.google.com/analytics/answer/7667196), cette durée détermine jusqu'à quand une exploration ad hoc (segmentation rétroactive fine) reste possible ; au-delà, seuls les rapports standards déjà agrégés restent disponibles.
- [ ] **L'activation de Google Signals est une décision explicite**, avec sa conséquence connue sur le reporting cross-device et publicitaire, pas un défaut ignoré — son activation change aussi le comportement de certains seuils de confidentialité (données agrégées si l'audience est trop faible).

## 5. Cross-domain measurement

- [ ] **Si le parcours de conversion traverse plusieurs domaines** (site principal + plateforme de paiement, site principal + sous-domaine applicatif sur un domaine distinct), la liste de domaines du [cross-domain measurement](https://support.google.com/analytics/answer/10071811) est configurée et à jour — sans elle, chaque changement de domaine génère une nouvelle session, fragmentant artificiellement le funnel.
- [ ] **Aucun domaine cross-domain déclaré n'est un domaine qui ne devrait plus l'être** (ancien partenaire, ancien sous-domaine décommissionné) — une entrée obsolète n'entraîne pas d'erreur visible, elle reste simplement une configuration jamais nettoyée.

## 6. Key events (conversions)

- [ ] **Chaque key event marqué correspond à un événement business réel documenté dans le plan de marquage** — pas un événement technique marqué "par habitude" (ex. `page_view` d'une page sans valeur de conversion propre).
- [ ] **Aucun key event n'est marqué en double sous deux noms différents** pour le même comportement business (ex. `sj_lead_submit` et un événement Enhanced Measurement qui capte la même soumission de formulaire) — un doublon gonfle silencieusement le taux de conversion affiché.
- [ ] **Le event `purchase` (et `refund` s'il est utilisé) est marqué key event**, cohérent avec le schéma décrit dans l'[Ecommerce GA4](/expertises/tracking/ga4/ecommerce-ga4) — un `purchase` non marqué key event n'apparaît dans aucun rapport de conversion malgré une donnée par ailleurs correcte.

## 7. Accès & gouvernance

- [ ] **Les niveaux d'accès à la propriété (Viewer, Analyst, Editor, Administrator) sont attribués selon un principe de moindre privilège**, pas un accès Administrator distribué par défaut à toute personne qui demande l'accès.
- [ ] **L'historique des modifications de la propriété (change history, disponible dans l'Admin) est consulté périodiquement**, pas seulement au moment où une anomalie de reporting force à chercher une explication a posteriori.
- [ ] **Toute modification de configuration qui affecte le reporting** (changement de rétention, ajout d'un filtre, modification de la liste cross-domain) **est documentée avec une date**, au même titre qu'un changement de schéma dataLayer — pour qu'une rupture de tendance dans un dashboard puisse être expliquée par une date de changement de configuration plutôt qu'interprétée à tort comme une variation de performance réelle.

## Ce que Studio Jannah recommande

Cette checklist se rejoue à la création de toute nouvelle propriété GA4, et en revue trimestrielle sur une propriété déjà en production — la configuration de propriété se dégrade plus silencieusement que le conteneur GTM ou le dataLayer, parce qu'aucun mécanisme de recette (Preview mode, DevTools) n'existe nativement côté Admin GA4 pour la surveiller. Elle se combine avec l'[Audit GTM](/expertises/tracking/gtm/audit-gtm) (ce que le conteneur fait de la donnée) et l'[Audit DataLayer](/expertises/tracking/datalayer/audit-datalayer) (ce qui est poussé) pour couvrir les trois couches d'une recette tracking complète, jusqu'à la propriété de mesure elle-même.
