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

## 2026-10-27 — meta-ai-votre-agent-publicitaire-fait-il-deja-des-choix-sans-votre-tracking (auto, gemini-2.5-flash/gemini-2.5-flash)
- Retenu : meta-ai-votre-agent-publicitaire-fait-il-deja-des-choix-sans-votre-tracking — "Meta AI : Votre agent publicitaire fait-il déjà des choix sans votre tracking ?", Meta a commencé à tester des actions "agentiques" dans son assistant IA pour les entreprises le 6 octobre 2026, permettant la création de campagnes, la mise à jour du ciblage et la modification des budgets à partir d'une simple invite de chat. Bien que ces fonctionnalités soient encore en phase de test précoce pour la plupart des comptes, l'ouverture de la "Customer Lifecycle Strategy" à tous les annonceurs le même jour signale une accélération de l'automatisation. Des mises à jour plus récentes (14 et 26 octobre) confirment l'expansion des outils d'IA pour la création de vidéos produits, la découverte d'audience et l'optimisation créative.
