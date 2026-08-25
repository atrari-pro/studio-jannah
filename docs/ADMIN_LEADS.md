# Admin leads — chantier futur

## Objectif

Pas un besoin opérationnel urgent : la table `leads` (Supabase Table Editor)
+ les notifications email/Telegram (`docs/LEAD_NOTIFICATIONS.md`) couvrent
déjà le suivi au quotidien. Cet admin est pensé comme **vitrine de
savoir-faire** — un cas de démo produit/mesure montrable sur Malt/LinkedIn,
plus qu'un outil interne indispensable.

## Scope V1

- **Où** : `apps/app` (déjà Vite/React, déjà pensé Capacitor, réutilise
  `packages/shared` — tokens, tracking). Pas une nouvelle app séparée. Pas
  dans `apps/web`, qui doit rester une vitrine statique publique.
- **Auth** : Supabase Auth, un seul compte (créé manuellement dans le
  Dashboard, pas d'inscription publique).
- **Schéma** : ajouter à `public.leads` — `status` (nouveau / contacté /
  qualifié / perdu / gagné), `notes` (text), `updated_at`. RLS :
  lecture/écriture réservées à `authenticated`, `anon` garde uniquement
  l'insert (déjà en place).
- **UI** : liste des leads (tri par date, filtre par statut) + vue détail
  (message complet, changement de statut, note libre). Look cohérent avec
  les tokens du site.

## Hors scope V1

- Pas de multi-utilisateur / rôles
- Pas de réponse email intégrée (réponse depuis la boîte perso via
  `reply_to`, déjà configuré côté `notify-lead`)
- Pas encore d'events tracking sur les actions admin — bon candidat v2 :
  mesurer l'usage de son propre outil est un argument de démo en soi.

## Décision (2026-08-25)

Scope validé avec l'utilisateur, mais démarrage différé — pas urgent tant
que le volume de leads reste faible. Reprendre ce brief tel quel le jour où
on attaque l'implémentation.
