---
title: "Architecture dispatch client/serveur : cadrer la décision"
description: "Tout-serveur, tout-client ou dispatch sélectif : le framework de décision par événement (criticité, coût, gouvernance) avant toute implémentation sGTM."
publishedAt: 2026-09-06
status: published
categoryLabel: "Server-side (sGTM)"
type: "guide"
level: "avance"
tags: ["sGTM", "server-side tagging", "architecture", "gouvernance", "GTM"]
hook: "Un framework en quatre critères pour trancher, événement par événement, entre tout-serveur, tout-client et dispatch sélectif — avant d'écrire la moindre ligne de configuration `server_container_url`."
sources:
  - label: "Google — Server-side tagging avec Google Tag Manager"
    url: "https://developers.google.com/tag-platform/tag-manager/server-side"
  - label: "Simo Ahava — Split GA Events Between Client-Side And Server-Side Dispatch"
    url: "https://www.simoahava.com/gtmtips/split-ga-events-between-client-side-server-side-dispatch/"
  - label: "Google Cloud — Cloud Run, tarification"
    url: "https://cloud.google.com/run/pricing"
relatedInsights:
  - "gtm-dispatch-selectif-client-server"
relatedUseCases: []
relatedExpertises:
  - "tracking/server-side/audit-sgtm"
  - "tracking/server-side/identite-cookies-sgtm"
  - "tracking/server-side/monitoring-couts-sgtm"
  - "tracking/gtm/architecture-conteneur"
---

## Le problème que ce framework résout

La question "faut-il passer en server-side" se pose trop souvent comme un choix binaire — tout le conteneur bascule, ou rien ne bouge. Ce n'est ni la question à poser, ni celle que documente réellement l'écosystème GTM : la [documentation server-side de Google](https://developers.google.com/tag-platform/tag-manager/server-side) et les guides techniques de référence comme celui de [Simo Ahava sur le dispatch sélectif](https://www.simoahava.com/gtmtips/split-ga-events-between-client-side-server-side-dispatch/) décrivent une architecture où le routage se décide **événement par événement**, pas conteneur par conteneur.

Ce guide ne réexplique pas le "comment" technique du dispatch sélectif (la mécanique du paramètre `server_container_url`, le piège d'identité GA4 sur un Client mal configuré) — c'est le sujet couvert en détail par l'insight [SGTM : router sélectivement pour sécuriser vos conversions](/blog/gtm-dispatch-selectif-client-server). Ce qui manque en amont, et que ce guide cadre, c'est **le framework de décision** : sur quels critères trancher, avant d'ouvrir GTM, entre tout-serveur, tout-client et dispatch sélectif.

## Les quatre critères de décision

**1. Criticité de l'événement.** Un événement de conversion (achat, lead, souscription) qui alimente directement le reporting business et le pilotage média n'a pas le même profil de risque qu'un événement de navigation secondaire (scroll, affichage d'un bandeau, clic sur un lien non stratégique). Plus un événement pèse dans une décision business ou un arbitrage média, plus il justifie d'être protégé d'un point de panne unique — qu'il s'agisse du serveur ou, à l'inverse, d'un ad-blocker côté client.

**2. Tolérance à la perte.** Deux questions distinctes à trancher séparément : que se passe-t-il si cet événement est bloqué côté client (ad-blocker, ITP, extension) ? Que se passe-t-il s'il est perdu côté serveur (panne, déploiement raté, pic de charge non absorbé) ? Un événement à faible tolérance sur les deux fronts est le candidat naturel à un dispatch qui ne dépend d'aucun des deux seuls, quand l'architecture le permet ; un événement tolérant à la perte des deux côtés ne justifie pas l'effort de configuration supplémentaire.

**3. Coût par requête.** Le server-side n'est pas gratuit : la majorité des hébergements de conteneur serveur facturent au volume de requêtes traitées, un modèle documenté pour Cloud Run par [Google Cloud](https://cloud.google.com/run/pricing). Router systématiquement l'intégralité du trafic — y compris les événements à faible valeur analytique — vers le serveur revient à payer pour un enrichissement dont une partie du volume n'a pas besoin. Le coût par requête n'est pas un critère technique secondaire : c'est un des quatre critères de la décision, au même titre que la criticité business.

**4. Complexité de gouvernance.** Un dispatch sélectif introduit une exception à la règle générale du conteneur — un ou plusieurs tags qui dérogent au routage par défaut. Chaque exception a un coût de maintenance : elle doit être documentée, comprise par quiconque reprend la configuration, et revue à chaque changement d'équipe. Un dispatch mixte mal documenté est le terrain le plus fertile pour le [piège d'identité GA4](/expertises/tracking/server-side/identite-cookies-sgtm) — pas parce que la technique est complexe, mais parce que personne ne se souvient pourquoi cette exception existe.

## Trois profils d'architecture, et quand choisir lequel

**Tout-client.** Pertinent quand aucun événement du site n'a une criticité business suffisante pour justifier l'effort d'hébergement et de gouvernance d'un conteneur serveur — sites vitrine, trafic sans enjeu de conversion mesuré finement, équipe sans capacité à opérer une infrastructure cloud supplémentaire. Le risque accepté : exposition pleine aux ad-blockers et à l'érosion des cookies côté navigateur.

**Tout-serveur.** Pertinent quand l'enjeu principal est la fiabilité de la donnée agrégée (reporting, dashboards) plus que la protection individuelle de chaque type d'événement, et que l'équipe a la capacité d'opérer et de monitorer l'infrastructure serveur (voir l'[Audit sGTM](/expertises/tracking/server-side/audit-sgtm)). Le risque accepté : le conteneur serveur devient un point de panne unique pour l'ensemble du volume, y compris les conversions.

**Dispatch sélectif.** Pertinent quand une minorité d'événements (typiquement les conversions) pèse l'essentiel de la valeur business, et que cette minorité justifie l'effort de configuration et de documentation d'une exception au routage par défaut. C'est le profil qui maximise la résilience sur les événements critiques tout en maîtrisant le coût sur le reste — au prix d'une gouvernance plus exigeante, à ne pas sous-estimer.

## Pièges connus au niveau du cadrage

- **Décider au niveau du conteneur plutôt qu'au niveau de l'événement.** La décision "on passe en server-side" prise une fois, globalement, sans revisiter événement par événement, produit soit un tout-serveur trop coûteux, soit un tout-client qui laisse les conversions exposées.
- **Ignorer le critère de gouvernance parce que la technique fonctionne.** Un dispatch sélectif qui marche en recette mais dont personne ne documente le "pourquoi" devient, un an plus tard, une exception que quelqu'un "corrige" par erreur en pensant réparer un oubli.
- **Traiter le coût comme un détail d'infrastructure hors du scope marketing/tracking.** Le coût par requête est un des quatre critères de la décision, pas un sujet à traiter après coup avec l'équipe infra — voir [Monitoring et coûts sGTM](/expertises/tracking/server-side/monitoring-couts-sgtm).
- **Confondre criticité business et volume de trafic.** Un événement à fort volume n'est pas nécessairement critique ; un événement rare (souscription premium) peut l'être davantage qu'un événement fréquent (vue de page produit).

## Ce que Studio Jannah recommande

Trancher ces quatre critères par écrit, événement par événement, avant toute implémentation — pas pendant la configuration GTM. Le résultat est une table de décision courte (nom de l'événement, criticité, tolérance à la perte, routage retenu, justification) qui sert de référence à l'équipe qui implémente comme à celle qui reprendra le tracking plus tard. Une fois cette table posée, la mécanique technique du dispatch (le paramètre `server_container_url`, la configuration du Client GA4) se règle en suivant l'insight [SGTM : router sélectivement pour sécuriser vos conversions](/blog/gtm-dispatch-selectif-client-server) et le guide [Identité et cookies en sGTM](/expertises/tracking/server-side/identite-cookies-sgtm).
