---
title: "Audit CMP : mapping Consent Mode v2"
description: "18 critères pass/fail pour auditer le mapping entre une CMP et Consent Mode v2 — catégories, defaults, timing, events dataLayer, documentation."
publishedAt: 2026-09-06
status: published
categoryLabel: "Consentement & CMP"
type: "audit"
level: "avance"
tags: ["Consent Mode", "CMP", "RGPD", "audit", "GTM"]
hook: "Une checklist à parcourir catégorie par catégorie pour vérifier que chaque case cochée dans la CMP retombe sur le bon signal Consent Mode — un mapping ligne à ligne entre consentement utilisateur et signal envoyé à Google, pas une vérification globale du bandeau."
sources:
  - label: "Google — Consent Mode overview"
    url: "https://developers.google.com/tag-platform/security/guides/consent"
  - label: "Google Analytics Help — About consent mode"
    url: "https://support.google.com/analytics/answer/9976101"
  - label: "Google Tag Manager Help — Set up Consent Mode"
    url: "https://support.google.com/tagmanager/answer/10718549"
  - label: "CNIL — Cookies et autres traceurs"
    url: "https://www.cnil.fr/fr/cookies-et-autres-traceurs"
relatedInsights:
  - "consent-mode-green-red"
relatedUseCases: []
relatedExpertises:
  - "tracking/consentement/consent-mode-basique-avance"
  - "tracking/consentement/impact-consentement-volume"
  - "tracking/consentement/qa-consentement"
  - "tracking/gtm/audit-gtm"
---

## Comment utiliser cette checklist

Cette checklist audite le **mapping** entre les catégories déclarées dans une CMP et les types Consent Mode v2 envoyés à Google — pas la configuration générale du conteneur GTM (voir l'[Audit GTM](/expertises/tracking/gtm/audit-gtm)) ni le blocage effectif des tags (voir [QA consentement](/expertises/tracking/consentement/qa-consentement)). Chaque ligne s'observe dans la Consent Overview du GTM Preview mode, le Network tab ou la configuration de la CMP, pass ou fail. L'ordre suit un audit réel : catégories, defaults, disponibilité, mise à jour, dédup, documentation.

## 1. Mapping des catégories CMP vers les types Consent Mode

- [ ] **Chaque catégorie déclarée dans la CMP est mappée explicitement** vers un ou plusieurs des types documentés par la [documentation Consent Mode de Google](https://developers.google.com/tag-platform/security/guides/consent) (`ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`, `personalization_storage`, `functionality_storage`, `security_storage`) — pas de mapping implicite laissé à l'interprétation.
- [ ] **La catégorie nécessaire reste toujours accordée** et ne pilote aucun type soumis à consentement — elle documente le socle fonctionnel du site (`consent_status_necessary` toujours `true` dans le contrat dataLayer Studio Jannah), une distinction que la [CNIL pose dans sa doctrine sur les cookies et autres traceurs](https://www.cnil.fr/fr/cookies-et-autres-traceurs) exemptés de consentement.
- [ ] **Les types "ads" et le type "analytics" ne partagent jamais la même catégorie CMP** si les deux existent dans l'implémentation — un consentement analytics accordé ne doit jamais entraîner un `ad_storage: granted` implicite.
- [ ] **Le mapping est documenté** (plan de marquage, README technique), pas seulement lisible en inspectant le code source de la CMP.

## 2. Defaults & timing

- [ ] **`gtag("consent", "default", {...})` place tous les types concernés sur `denied`** avant tout chargement de tag de mesure — vérifiable en navigation privée, sans cookie de consentement préalable, décrit dans le [guide officiel Consent Mode](https://developers.google.com/tag-platform/security/guides/consent).
- [ ] **Le default s'exécute avant GTM lui-même**, ou en tout tout début du conteneur — un default posé après le premier tag laisse une fenêtre où des hits peuvent partir sans consentement.
- [ ] **Le paramètre `region` du default est configuré explicitement** si le site cible plusieurs zones géographiques avec des règles différentes, plutôt qu'un default unique appliqué à tous les visiteurs sans distinction.
- [ ] **Si la CMP s'appuie sur le Consent Mode natif de GTM** (Consent Settings au niveau du tag plutôt qu'un `gtag` manuel posé en dur), la configuration correspond à celle décrite dans le [centre d'aide Tag Manager sur la mise en place de Consent Mode](https://support.google.com/tagmanager/answer/10718549) — les Additional Consent Checks référencent les mêmes types que le mapping documenté en section 1.

## 3. Signal de disponibilité & affichage

- [ ] **Un event dédié signale que la CMP est initialisée** (`sj_cmp_ready` dans le contrat Studio Jannah) — sert de garde-fou pour tout tag qui dépendrait de l'état CMP avant même un premier choix utilisateur.
- [ ] **L'affichage du bandeau ou du panneau de préférences est mesuré par un event distinct du choix lui-même** (`sj_cmp_modal_shown`, clé `modal_name` distinguant `"consent"` et `"preferences"`) — sans cet event, aucun taux "bandeau affiché → consentement accordé" n'est calculable.
- [ ] **Les points d'entrée du panneau de préférences portent un identifiant de CTA cohérent et distinct** (ex. `data-track-cta="cmp_reopen_icon"` pour l'icône de réouverture), pour isoler la source de réouverture dans le reporting.

## 4. Mise à jour du consentement

- [ ] **Chaque changement déclenche `gtag("consent", "update", {...})` immédiatement**, pas en différé au prochain chargement de page.
- [ ] **L'event dataLayer associé porte le statut de chaque catégorie CMP déclarée** (`consent_status_<categorie>` sur `sj_consent_update`), pas uniquement un flag `analytics` global — une catégorie ajoutée côté CMP doit apparaître automatiquement, sans nouveau déploiement du contrat.
- [ ] **La distinction entre premier choix, revisite et modification volontaire est portée explicitement** (`consent_trigger` avec les valeurs `first_choice` / `revisit` / `panel_update`), pas fusionnée dans un seul type d'event.
- [ ] **Le mécanisme émetteur (CMP vs fallback) est distingué de la raison du changement** — deux clés séparées, jamais confondues dans le même champ.

## 5. Dédup & fiabilité de l'event

- [ ] **La dédup se fait sur la signature complète des catégories acceptées (triée)**, pas sur un seul booléen — un changement sur une catégorie secondaire ajoutée plus tard doit être capté même si `analytics` ne bouge pas.
- [ ] **Un rafraîchissement avec un consentement déjà valide ne déclenche pas de faux "nouveau choix"** — c'est un `revisit`, jamais un `first_choice`.

## 6. Documentation

- [ ] **La liste des catégories CMP actives et leur mapping vers les types Consent Mode est versionnée et datée**, au même titre que le reste du plan de marquage.
- [ ] **Toute catégorie retirée ou renommée est documentée comme telle**, avec la date de bascule.

## Ce que Studio Jannah recommande

Rejouer ce mapping à chaque ajout ou retrait de catégorie CMP, pas seulement à l'implémentation initiale — un connecteur marketing ajouté plusieurs mois plus tard qui nécessite un nouveau type Consent Mode (`ad_user_data` typiquement) sans mapping explicite est le scénario le plus fréquent de dérive silencieuse : rien ne casse visiblement, le signal part simplement mal catégorisé. Ce mapping se vérifie en complément du blocage effectif des tags (voir [QA consentement](/expertises/tracking/consentement/qa-consentement)) et avant tout calcul de taux d'opt-in fiable — la mécanique de collecte différenciée par type de consentement est documentée côté mesure dans le [centre d'aide Google Analytics sur Consent Mode](https://support.google.com/analytics/answer/9976101), sujet détaillé dans l'insight [Consent Mode v2 : configuré ne veut pas dire fiable](/blog/consent-mode-green-red).
