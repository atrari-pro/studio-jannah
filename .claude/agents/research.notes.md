# Research — notes (mémoire append-only)

Journal des angles traités/écartés et de ce qui a été appris — **pas** le
contrat du rôle (voir `research.md` pour ça, jamais modifié depuis ce
fichier). Research n'ajoute qu'en fin de fichier ; il ne réécrit ni ne
compacte jamais ce qui existe déjà. Quand le fichier devient trop long à
lire d'un coup, la purge/condensation est manuelle (Director ou
l'utilisateur), pas automatique.

## Format d'une entrée

```
## AAAA-MM-JJ — <angle retenu ou "aucun">
- Retenu : <slug ou -> — pourquoi en une ligne
- Écartés : <angle> (hors scope | déjà couvert | source faible | ...)
- Sources à surveiller/éviter (optionnel)
```

## Journal

## 2026-09-03 — basic-consent-mode-guide
- Retenu : basic-consent-mode-guide — "Bandeau CMP → accordé : le funnel
  caché que (presque) personne ne mesure", ancré dans le dataLayer v1.3.0
  réel de Studio Jannah (`sj_cmp_modal_shown`, `sj_consent_update`) plutôt
  qu'un résumé théorique de l'article source (veille_rss : "Basic Consent
  Mode: The Guide", Simo Ahava,
  https://www.simoahava.com/analytics/basic-consent-mode-the-guide/).
- Écartés :
  - Basic Consent Mode, le mode par défaut qui fait perdre du trafic sans
    le dire (déjà beaucoup traité ailleurs — Simo Ahava, CookieYes,
    Analytics Mania)
  - Le seuil invisible du modeling GA4 (~1000 DAU / ~700 consentants,
    chiffres non officiels) — en réserve pour un angle plus "alerte/actu"
  - Basic ou Advanced Consent Mode, grille de décision PME/agence sans DPO
    — utile mais moins différenciant
  - Non, le modeling GA4 ne "récupère" pas vraiment vos données perdues
    (debunking conversions modélisées) — en réserve, angle critique
- Sources à surveiller/éviter : aucune pour l'instant.

## 2026-09-03 — click-id-conversion-linker-gap
- Retenu : click-id-conversion-linker-gap — "Google Ads demain, gclid
  absent aujourd'hui : l'audit du contrat dataLayer de Studio Jannah",
  vérification à froid du contrat v1.3.0 réel (`sj_campaign_land` capture
  les UTM via `trackCampaignLand()` mais aucune clé gclid/fbclid/msclkid,
  et aucun tag Conversion Linker documenté dans la section GTM à
  configurer) plutôt qu'un résumé de l'article source (veille_rss :
  "Common Mistakes When Working With Click Identifiers", guest post Jude
  Nwachukwu Onyejekwe sur le blog de Simo Ahava,
  https://www.simoahava.com/analytics/common-mistakes-click-identifiers/).
- Écartés :
  - UTM ≠ click ID, le malentendu qui fait croire à un tracking Ads solide
    (bon pédagogique de secours, moins différenciant que l'audit interne)
  - gclid a 90 jours, un cycle de vente conseil en a plus — persistance
    serveur du click ID rattachée à la table `leads` Supabase — en
    réserve, angle plus produit/data, à sortir si un cas client concret à
    cycle long se présente
  - Capturer un click ID avant le consentement (angle mort RGPD, ordre CMP
    vs Conversion Linker) — en réserve, volontairement écarté cette fois
    pour ne pas empiler sur le brief consentement du même jour
    (basic-consent-mode-guide) déjà en file
- Sources à surveiller/éviter : aucune pour l'instant.
