---
title: "Audit sGTM : setup, résilience, coût"
description: "26 critères pass/fail pour auditer un conteneur sGTM — déploiement, domaine, identité GA4, coût par requête, sécurité, monitoring."
publishedAt: 2026-09-06
status: published
categoryLabel: "Server-side (sGTM)"
type: "audit"
level: "avance"
tags: ["sGTM", "server-side tagging", "audit", "Cloud Run", "GA4"]
hook: "Une checklist à parcourir critère par critère avant une mise en prod sGTM ou en revue trimestrielle — déploiement, résilience du domaine, identité GA4, coût par requête, sécurité : chaque ligne se coche pass ou fail, sans place pour l'à-peu-près."
sources:
  - label: "Google — Server-side tagging avec Google Tag Manager"
    url: "https://developers.google.com/tag-platform/tag-manager/server-side"
  - label: "Google — Set up your own domain for the tagging server"
    url: "https://developers.google.com/tag-platform/tag-manager/server-side/domains"
  - label: "Simo Ahava — Split GA Events Between Client-Side And Server-Side Dispatch"
    url: "https://www.simoahava.com/gtmtips/split-ga-events-between-client-side-server-side-dispatch/"
  - label: "Google Cloud — Cloud Run, tarification"
    url: "https://cloud.google.com/run/pricing"
relatedInsights:
  - "gtm-dispatch-selectif-client-server"
relatedUseCases: []
relatedExpertises:
  - "tracking/server-side/architecture-dispatch-client-serveur"
  - "tracking/server-side/monitoring-couts-sgtm"
  - "tracking/server-side/securite-conformite-sgtm"
  - "tracking/gtm/audit-gtm"
---

## Comment utiliser cette checklist

Cette checklist audite un conteneur GTM **server-side** déjà en place — son déploiement, sa résilience, son coût, sa sécurité — pas le contenu du dataLayer qu'il reçoit ni la configuration du conteneur client (voir l'[Audit DataLayer](/expertises/tracking/datalayer/audit-datalayer) et l'[Audit GTM](/expertises/tracking/gtm/audit-gtm) dédiés). Chaque ligne est observable dans la console Google Cloud, l'interface GTM ou le mode Preview server-side, pass ou fail. L'ordre suit celui d'un audit réel : déploiement du conteneur, résilience du domaine, identité GA4, coût, sécurité, monitoring, puis documentation.

## 1. Déploiement & conteneur serveur

- [ ] **Le conteneur serveur est déployé selon l'une des méthodes officielles documentées par Google** (App Engine flexible ou déploiement manuel sur un hébergement compatible), pas un montage maison non documenté par la [documentation server-side de Google](https://developers.google.com/tag-platform/tag-manager/server-side).
- [ ] **La version du tagging server est maintenue à jour.** Les Clients et Transformations récents (identité GA4, redaction de champs) ne sont disponibles que sur des versions récentes du conteneur serveur.
- [ ] **Un environnement de test distinct de la production existe** pour recetter une nouvelle configuration serveur avant sa publication, au même titre que la discipline attendue côté conteneur client.
- [ ] **Le périmètre exact des événements routés côté serveur est documenté et daté** — pas de dérive silencieuse où de nouveaux events sont ajoutés au routage serveur sans trace.

## 2. Domaine & résilience

- [ ] **Le conteneur serveur répond sur un sous-domaine propre au site**, mappé selon le [guide officiel de configuration de domaine](https://developers.google.com/tag-platform/tag-manager/server-side/domains) — pas sur l'URL brute d'hébergement (`*.run.app`, `*.appspot.com`), qui casse le contexte first-party et expose la nature du montage à un ad-blocker.
- [ ] **Le certificat SSL du sous-domaine est géré et renouvelé automatiquement**, pas un certificat manuel dont l'expiration n'est surveillée par personne.
- [ ] **La dépendance des conversions business au conteneur serveur est évaluée explicitement** — si le serveur est indisponible, quels events se perdent réellement ? Ce point se documente avec le [framework de décision dispatch client/serveur](/expertises/tracking/server-side/architecture-dispatch-client-serveur), pas après incident.
- [ ] **Le scaling automatique (min instances, concurrency) est un choix documenté**, pas une valeur par défaut jamais revisitée — un pic de trafic non anticipé (campagne, soldes) ne doit pas produire de 5xx côté conteneur serveur.

## 3. Identité (GA4 Client)

- [ ] **Le mode d'identité du Client GA4 (Server Managed ou JavaScript Managed) est un choix explicite et documenté**, pas la valeur par défaut laissée sans revue — voir [Identité et cookies en sGTM](/expertises/tracking/server-side/identite-cookies-sgtm) pour l'arbitrage complet.
- [ ] **Si une partie des événements part en direct-to-Google en parallèle du transit serveur (dispatch mixte)**, le Client GA4 est bien configuré en JavaScript Managed — sinon les utilisateurs se scindent entre deux référentiels d'identité (`_ga` vs `FPID`), un piège documenté par [Simo Ahava](https://www.simoahava.com/gtmtips/split-ga-events-between-client-side-server-side-dispatch/).
- [ ] **La durée de vie du cookie d'identité côté serveur est alignée avec la configuration côté client**, pas divergente silencieusement entre les deux contextes.

## 4. Coût & scaling

- [ ] **Le volume de requêtes attendu par type d'événement a été estimé avant la mise en production**, pas découvert sur la première facture d'hébergement.
- [ ] **Les événements à faible valeur analytique ne sont pas systématiquement routés vers le serveur par défaut** — un arbitrage événement par événement, détaillé dans le [framework de décision dispatch](/expertises/tracking/server-side/architecture-dispatch-client-serveur), maîtrise le coût par requête documenté dans la [tarification Cloud Run](https://cloud.google.com/run/pricing).
- [ ] **Le réglage d'instances minimales (min instances) est un compromis assumé entre latence à froid et coût d'instances toujours actives**, pas un défaut technique jamais réexaminé.
- [ ] **Des alertes de facturation sont configurées sur le projet cloud qui héberge le conteneur** — voir [Monitoring et coûts sGTM](/expertises/tracking/server-side/monitoring-couts-sgtm) pour le détail des seuils à poser.

## 5. Sécurité & accès

- [ ] **L'accès au déploiement et à la configuration du conteneur serveur est restreint à un nombre limité de personnes identifiées**, distinct des droits d'édition du conteneur client GTM.
- [ ] **Les champs sensibles (PII) ne transitent pas tels quels au-delà de ce qui est strictement nécessaire** — voir [Sécurité et conformité sGTM](/expertises/tracking/server-side/securite-conformite-sgtm) pour la mécanique de redaction.
- [ ] **L'endpoint du conteneur serveur n'est pas une surface ouverte sans aucune couche de protection** (contrôle d'origine, filtrage) devant un trafic public à fort volume.

## 6. Monitoring & observabilité

- [ ] **La journalisation (logging) du conteneur serveur est activée et effectivement consultée**, pas seulement active par défaut sans jamais être lue.
- [ ] **Le mode debug / preview server-side est utilisé avant chaque publication de configuration**, avec la même discipline que le Preview mode du conteneur client.
- [ ] **Des alertes existent sur le taux d'erreur et la latence des requêtes**, pas uniquement sur le coût — un serveur qui répond lentement dégrade silencieusement le taux de complétion des tags qui en dépendent.

## 7. Documentation & versioning

- [ ] **L'historique de publication du conteneur serveur porte une description explicite de chaque changement**, au même titre que le conteneur client.
- [ ] **La décision de recourir au server-side (pourquoi, quels événements, quel mode d'identité) est écrite quelque part**, pas seulement connue de la personne qui a fait la migration.
- [ ] **Un runbook existe pour l'équipe qui reprend le tracking** : comment vérifier que le conteneur serveur tourne, où consulter les logs, qui a les droits de republier.

## Ce que Studio Jannah recommande

Cette checklist se rejoue avant toute mise en production qui modifie le routage d'événements côté serveur, et en revue trimestrielle sur un conteneur sGTM déjà en production — le coût et la résilience se dégradent souvent silencieusement (volume qui grossit, dépendances qui s'accumulent) sans qu'aucun signal d'alerte ne se déclenche de lui-même. Elle se combine avec l'[Audit GTM](/expertises/tracking/gtm/audit-gtm) côté conteneur client et précède tout arbitrage détaillé dans le [framework de décision dispatch client/serveur](/expertises/tracking/server-side/architecture-dispatch-client-serveur).
