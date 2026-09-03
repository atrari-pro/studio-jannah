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
