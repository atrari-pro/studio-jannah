---
title: "QA consentement : blocage des tags avant consentement"
description: "16 critères pass/fail pour vérifier qu'aucun tag ne se déclenche avant consentement — refus total, acceptation partielle, retrait, environnements."
publishedAt: 2026-09-06
status: published
categoryLabel: "Consentement & CMP"
type: "audit"
level: "fondamentaux"
tags: ["Consent Mode", "CMP", "QA", "audit", "RGPD"]
hook: "Une checklist de recette à rejouer avant chaque mise en prod qui touche au tracking — navigation privée, refus total, retrait de consentement : chaque scénario se vérifie hit par hit dans les DevTools ou le GTM Preview mode, pas sur la seule confiance que la CMP bloque bien."
sources:
  - label: "Google — Consent Mode overview"
    url: "https://developers.google.com/tag-platform/security/guides/consent"
  - label: "Google Tag Manager Help — Preview and debug your changes"
    url: "https://support.google.com/tagmanager/answer/6107056"
  - label: "Google — Tag Assistant"
    url: "https://tagassistant.google.com/"
  - label: "CNIL — Cookies et autres traceurs"
    url: "https://www.cnil.fr/fr/cookies-et-autres-traceurs"
relatedInsights:
  - "consent-mode-green-red"
relatedUseCases: []
relatedExpertises:
  - "tracking/consentement/audit-cmp"
  - "tracking/consentement/consent-mode-basique-avance"
  - "tracking/consentement/impact-consentement-volume"
  - "tracking/gtm/qa-de-tags"
---

## Comment utiliser cette checklist

Cette checklist vérifie le **blocage effectif** des tags avant consentement — pas le mapping des catégories CMP vers Consent Mode (voir l'[Audit CMP](/expertises/tracking/consentement/audit-cmp)), mais le comportement réel observable dans le navigateur. Chaque ligne se rejoue dans le Network tab des DevTools, la Consent Overview du [GTM Preview mode](https://support.google.com/tagmanager/answer/6107056), ou le dataLayer lui-même. L'ordre suit un scénario de recette réel : état initial, refus total, acceptation partielle, retrait, points d'entrée du panneau, environnements.

## 1. État initial (avant tout choix)

- [ ] **En navigation privée, sans cookie `sj_cmp_consent` préexistant, aucune requête vers un domaine de mesure** (GA4, Ads, pixels tiers...) ne part avant l'affichage du bandeau.
- [ ] **Le default Consent Mode (`denied` sur tous les types soumis à consentement) est effectivement actif** dès le premier chargement, vérifiable via la Consent Overview du GTM Preview mode, conformément au comportement décrit dans le [guide officiel Consent Mode de Google](https://developers.google.com/tag-platform/security/guides/consent).
- [ ] **Aucun tag de mesure secondaire** (pixel tiers, script embarqué hors GTM) ne contourne le blocage géré par la CMP.

## 2. Refus total

- [ ] **Un refus explicite de toutes les catégories non nécessaires ne déclenche aucun hit de mesure**, vérifié en observant le Network tab pendant et après le clic sur "refuser".
- [ ] **Si Consent Mode advanced est actif, seuls les cookieless pings attendus partent** — aucun cookie de mesure classique n'est écrit après un refus total.
- [ ] **Le refus est persistant** : un rechargement de page après refus ne réaffiche pas le bandeau et ne déclenche toujours aucun tag.

## 3. Acceptation partielle

- [ ] **Accepter uniquement une partie des catégories** (ex. analytics sans ads) ne déclenche que les tags mappés à cette catégorie précise — pas d'effet de bord sur une catégorie non accordée.
- [ ] **`sj_consent_update` reflète le statut exact de chaque catégorie** acceptée ou refusée, vérifiable directement dans le dataLayer via les DevTools.

## 4. Retrait / modification du consentement

- [ ] **Retirer un consentement précédemment accordé stoppe les tags concernés dès l'action**, sans attendre un rechargement de page.
- [ ] **`consent_trigger` porte la valeur `panel_update` sur ce changement**, jamais `first_choice` ni `revisit`.
- [ ] **Un rechargement avec un consentement déjà valide ne redéclenche pas le bandeau** et porte `consent_trigger: "revisit"`.

## 5. Points d'entrée du panneau

- [ ] **Les points d'entrée du panneau (bandeau, footer, icône de réouverture) ouvrent le même panneau**, avec le même état affiché que le dernier choix enregistré.
- [ ] **`sj_cmp_modal_shown` se déclenche à chaque ouverture**, avec le bon `modal_name` (`"consent"` pour le bandeau initial, `"preferences"` pour le panneau rouvert).

## 6. Environnements & régressions

- [ ] **Le comportement de blocage est identique en préprod et en prod** — un conteneur GTM de test ne doit pas laisser passer un tag qui serait bloqué en prod.
- [ ] **Toute mise en prod qui touche au conteneur GTM (nouveau tag, nouveau trigger) rejoue cette checklist**, pas seulement à l'implémentation initiale de la CMP.
- [ ] **Un outil d'audit externe** ([Tag Assistant](https://tagassistant.google.com/) ou équivalent) confirme la même lecture que le Network tab et le GTM Preview mode.

## Ce que Studio Jannah recommande

Cette checklist se rejoue à trois moments : à l'implémentation initiale de la CMP, à chaque mise en prod qui ajoute ou modifie un tag GTM, et en routine trimestrielle. Le scénario le plus fréquemment oublié est le refus total testé une seule fois puis jamais revérifié — un tag ajouté plus tard par une autre personne, sur un trigger mal configuré, peut se déclencher sans consentement sans que personne ne le remarque avant un contrôle CNIL ou un audit externe, exactement le point que soulève la checklist "tags marketing vraiment gated" de l'insight [Consent Mode v2 : configuré ne veut pas dire fiable](/blog/consent-mode-green-red). Ce test technique ne remplace pas la conformité de fond rappelée par la [CNIL sur les cookies et autres traceurs](https://www.cnil.fr/fr/cookies-et-autres-traceurs) — il en vérifie l'application effective côté navigateur. Il se combine avec l'[Audit CMP](/expertises/tracking/consentement/audit-cmp) pour couvrir à la fois le mapping des catégories et le blocage effectif, et avec [QA de tags GTM](/expertises/tracking/gtm/qa-de-tags) pour la recette plus large du comportement des tags (ordre de déclenchement, priorité) au-delà du seul consentement.
